// ============================================================
// AP2Escrow + BudgetFence — pure TypeScript contract mirror
// RFC v1.0 §1 (AP2Escrow.sol) + §5.1 (Scope Lock, Decaying Auth)
//
// All token math uses bigint (6-decimals USDC-style) to mirror
// uint256 semantics. No DB access here — pure functions only.
// ============================================================

import {
  RFC_CONSTANTS,
  type Amount,
  type BudgetFence,
  type BudgetFenceCheckResult,
  type BudgetFenceStatus,
  type Escrow,
  type EscrowStatus,
  type StreamReleaseResult,
  type VerifyAndSettleResult,
} from "@/lib/types";

// ------------------------------------------------------------
// Tunable: when the avatar's authDecayFactor falls below this,
// amounts above the decayingThreshold require human master
// signature (RFC §5.1 Decaying Auth).
// 1.0 = full autonomy. 0.5 = autonomy decayed past halfway.
// ------------------------------------------------------------
export const DECAYING_AUTH_FACTOR_THRESHOLD = 0.5;

// ============================================================
// 1. BudgetFence.checkAndConsume
// Mirrors RFC §5.1 Scope Lock + Daily Cap + Decaying Auth.
// Pure: returns a BudgetFenceCheckResult; does NOT mutate the
// input fence. Caller is responsible for committing dailySpent
// only when status === "APPROVED".
// ============================================================
export function checkAndConsume(
  fence: BudgetFence,
  amount: Amount,
  scope: string,
): BudgetFenceCheckResult {
  const remainingDaily = fence.dailyCap - fence.dailySpent;

  // ---- Rule 1: Scope Lock (RFC Test Vector 1) ----
  // Scope must be in the allowed list. Violating this triggers
  // the Decaying-Auth fallback action (require human signature).
  if (!fence.allowedScopes.includes(scope)) {
    return {
      status: "REJECT_SCOPE",
      approved: false,
      reason: `ScopeLockViolation: scope "${scope}" not in allowedScopes [${fence.allowedScopes.join(", ")}]`,
      remainingDaily,
      triggeredDecayingAuth: true,
    };
  }

  // ---- Rule 2: Daily Cap (hard budget constraint) ----
  if (fence.dailySpent + amount > fence.dailyCap) {
    return {
      status: "REJECT_DAILY_CAP",
      approved: false,
      reason: `DailyCapExceeded: dailySpent ${fence.dailySpent.toString()} + amount ${amount.toString()} > dailyCap ${fence.dailyCap.toString()}`,
      remainingDaily,
      triggeredDecayingAuth: false,
    };
  }

  // ---- Rule 3: Decaying Auth (large spend + decayed autonomy) ----
  // When the requested amount exceeds the decayingThreshold AND the
  // avatar's authDecayFactor has decayed below the safety threshold,
  // the contract refuses to auto-approve and demands a human master
  // signature (the "Decaying Auth" gate).
  if (
    amount > fence.decayingThreshold &&
    fence.authDecayFactor < DECAYING_AUTH_FACTOR_THRESHOLD
  ) {
    return {
      status: "REQUIRE_HUMAN_AUTH",
      approved: false,
      reason: `DecayingAuthRequired: amount ${amount.toString()} > threshold ${fence.decayingThreshold.toString()} and authDecayFactor ${fence.authDecayFactor.toFixed(3)} < ${DECAYING_AUTH_FACTOR_THRESHOLD}`,
      remainingDaily,
      triggeredDecayingAuth: true,
    };
  }

  // ---- Rule 4: Approved — would consume daily budget ----
  return {
    status: "APPROVED",
    approved: true,
    reason: "Approved: scope matches and within daily cap",
    remainingDaily: remainingDaily - amount,
    triggeredDecayingAuth: false,
  };
}

// ============================================================
// 2. Escrow.streamRelease math
// Mirrors RFC AP2Escrow.sol streamRelease (lines 91-112).
// Pure: returns the releasable amount and the new status.
// Caller is responsible for persisting releasedAmount += releasable
// and status = newStatus when releasable > 0n.
// ============================================================
export interface ComputeReleasableResult {
  releasableAmount: Amount;
  newStatus: EscrowStatus;
  elapsedSeconds: number;
  totalDurationSeconds: number;
  timeProgressPct: number; // 0-100
}

export function computeReleasable(
  escrow: Pick<
    Escrow,
    "totalAmount" | "releasedAmount" | "startTime" | "endTime" | "status"
  >,
  now: Date,
): ComputeReleasableResult {
  const nowMs = now.getTime();
  const startMs = escrow.startTime.getTime();
  const endMs = escrow.endTime.getTime();
  const totalDurationMs = Math.max(1, endMs - startMs);
  const elapsedMs = Math.max(0, nowMs - startMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const totalDurationSeconds = Math.floor(totalDurationMs / 1000);
  const timeProgressPct = Math.min(
    100,
    Math.max(0, (elapsedMs / totalDurationMs) * 100),
  );

  // If escrow is already Completed/Disputed/Refunded, nothing to stream.
  if (escrow.status !== "Streaming") {
    return {
      releasableAmount: 0n,
      newStatus: escrow.status,
      elapsedSeconds,
      totalDurationSeconds,
      timeProgressPct,
    };
  }

  let releasable: Amount;
  let newStatus: EscrowStatus = "Streaming";

  if (nowMs >= endMs) {
    // RFC: if (block.timestamp >= escrow.endTime) {
    //          releasableAmount = totalAmount - releasedAmount;
    //          escrow.status = Status.Completed;
    //      }
    releasable = escrow.totalAmount - escrow.releasedAmount;
    newStatus = "Completed";
  } else {
    // RFC: uint256 totalStreamable = (totalAmount * elapsed) / totalDuration;
    //      releasableAmount = totalStreamable - releasedAmount;
    // Use BigInt for whole-amount math. Elapsed/total are integer seconds.
    const totalStreamable =
      (escrow.totalAmount * BigInt(elapsedSeconds)) /
      BigInt(totalDurationSeconds);
    releasable = totalStreamable - escrow.releasedAmount;
    // Guard against underflow (shouldn't happen if releasedAmount tracks calls).
    if (releasable < 0n) releasable = 0n;
  }

  return {
    releasableAmount: releasable,
    newStatus,
    elapsedSeconds,
    totalDurationSeconds,
    timeProgressPct,
  };
}

// ============================================================
// 3. Escrow.verifyAndSettle
// Mirrors RFC AP2Escrow.sol verifyAndSettle (lines 114-142).
// Pure: returns a VerifyAndSettleResult describing what the
// contract WOULD do. The caller (API route) is responsible for
// persisting status changes, updating reputation, and emitting
// any "transfer" effects — but it MUST NOT transfer when the
// result.status === "Disputed" (clawback path).
// ============================================================
export function verifyAndSettle(
  escrow: Pick<
    Escrow,
    | "taskId"
    | "totalAmount"
    | "releasedAmount"
  >,
  mcpCompletionPct: number,
  qualityScore: number,
): VerifyAndSettleResult {
  // Clamp completionPct to [0, 100].
  const completionPct = Math.max(0, Math.min(100, Math.floor(mcpCompletionPct)));

  // finalPayout = (totalAmount * completionPct) / 100
  const finalPayout: Amount =
    (escrow.totalAmount * BigInt(completionPct)) / 100n;

  // diff = int256(releasedAmount) - int256(finalPayout)
  // Use signed bigint comparison via subtraction guard.
  const alreadyReleased = escrow.releasedAmount;

  let diffPositive: boolean;
  let diffAbs: Amount;
  if (alreadyReleased >= finalPayout) {
    diffPositive = true;
    diffAbs = alreadyReleased - finalPayout;
  } else {
    diffPositive = false;
    diffAbs = finalPayout - alreadyReleased;
  }

  // Clawback path — streaming over-paid vs MCP completion.
  if (diffPositive && diffAbs > 0n) {
    // RFC: escrow.status = Disputed; emit DisputeTriggered(taskId, diff); return;
    // NO transfer is performed on the dispute path.
    return {
      taskId: escrow.taskId,
      success: false,
      finalPayout,
      alreadyReleased,
      clawbackRequired: diffAbs,
      refundAmount: 0n,
      status: "Disputed",
      reputationDelta: 0,
    };
  }

  // Success path: pay remaining to payee, refund remainder to payer,
  // credit reputation. Caller applies these effects.
  const remainingPayout: Amount = finalPayout - alreadyReleased;
  const refundAmount: Amount = escrow.totalAmount - finalPayout;

  return {
    taskId: escrow.taskId,
    success: true,
    finalPayout,
    alreadyReleased,
    clawbackRequired: 0n,
    refundAmount,
    status: "Completed",
    reputationDelta: Math.max(0, Math.min(100, Math.floor(qualityScore))),
  };
}

// ============================================================
// 4. Helpers for the API/UI layers
// ============================================================

// Build a StreamReleaseResult from a partial escrow + releasable info.
export function buildStreamReleaseResult(
  escrow: Pick<Escrow, "taskId" | "releasedAmount">,
  justReleased: Amount,
  newStatus: EscrowStatus,
): StreamReleaseResult {
  return {
    taskId: escrow.taskId,
    releasedAmount: justReleased,
    totalReleased: escrow.releasedAmount + justReleased,
    status: newStatus,
  };
}

// Status helpers — used by the panel to color-code badges.
export const ESCROW_STATUS_ACCENTS: Record<
  EscrowStatus,
  "emerald" | "amber" | "violet" | "cyan" | "rose"
> = {
  Created: "violet",
  Streaming: "emerald",
  Completed: "cyan",
  Disputed: "rose",
  Refunded: "amber",
};

export const FENCE_STATUS_ACCENTS: Record<
  BudgetFenceStatus,
  "emerald" | "amber" | "violet" | "cyan" | "rose"
> = {
  APPROVED: "emerald",
  REJECT_SCOPE: "rose",
  REJECT_DAILY_CAP: "amber",
  REQUIRE_HUMAN_AUTH: "violet",
};

// Re-export RFC constants for convenience.
export const ESCROW_RFC_CONSTANTS = RFC_CONSTANTS;
