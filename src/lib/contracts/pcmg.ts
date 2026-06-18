// ============================================================
// PCMG (Phygital Cross-Membrane Gateway) — Pure TS mirror
// Mirrors RFC v1.0 §5.3 / PhygitalGateway.sol
//
// Flow: bridgeIntent -> submitPhysicsProof -> verifyPhysicsProof
//       -> verifyEmotionalResonance -> (release | slash)
//
// Two-threshold validation (CRITICAL):
//   - fidelity > PCMG_FIDELITY_THRESHOLD (8000) -> physical proof valid
//   - resonance > PCMG_RESONANCE_THRESHOLD (7500) -> emotional resonance
// A low-fidelity proof 400-rejects BEFORE the resonance check.
// ============================================================

import {
  RFC_CONSTANTS,
  toTokenUnits,
  type Amount,
  type PhysicsIntent,
  type PhysicsIntentStatus,
  type PCMGVerifyResult,
} from "@/lib/types";

// ----- Threshold constants re-exported for UI -----
export const PCMG_THRESHOLDS = {
  fidelity: RFC_CONSTANTS.PCMG_FIDELITY_THRESHOLD,
  resonance: RFC_CONSTANTS.PCMG_RESONANCE_THRESHOLD,
  bpsMax: RFC_CONSTANTS.BPS_MAX,
} as const;

// ----- Errors -----
// Mirrors Solidity `require(..., "...")` reverts. `statusCode` is the HTTP
// status the API layer maps this to (400 for client-input reverts).
export class PCMGError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PCMGError";
    this.statusCode = statusCode;
  }
}

// ----- Hash helpers (deterministic, browser + Node compatible) -----
// 32-bit FNV-1a, padded to a bytes32-like 0x + 64 hex chars.
function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const u = (h >>> 0).toString(16).padStart(8, "0");
  return `0x${u}${u}${u}${u}${u}${u}${u}${u}`; // 64 hex chars
}

// Compute a deterministic intentHash from creator + description.
// Mirrors Solidity keccak256(abi.encode(creatorAvatar, description)).
export function hashIntent(
  creatorAvatarId: string,
  description: string,
): string {
  return fnv1aHex(`intent::${creatorAvatarId}::${description}`);
}

// Hash of the multimodal proof, used for multiModalProofHash persistence.
export function hashProof(proof: MultiModalProof): string {
  return fnv1aHex(
    `proof::fidelity=${Math.round(proof.fidelity)};resonance=${Math.round(
      proof.resonance,
    )}`,
  );
}

// ----- Types -----
export interface BridgeIntentInput {
  intentHash: string;
  creatorAvatarId: string;
  amountUsdc: number;
  physicsConstraints: string; // JSON string of constraints
  executorId: string;
  deadlineSeconds: number;
}

export interface MultiModalProof {
  fidelity: number; // 0-10000 (basis points)
  resonance: number; // 0-10000 (basis points) — also serves as stateVector input
}

export interface PhysicsVerifyResult {
  isValid: boolean;
  fidelityScore: number;
}

export interface EmotionalStateVector {
  resonance: number; // 0-10000
}

export interface EmotionalResonanceResult {
  isResonant: boolean;
  resonanceScore: number;
}

// ============================================================
// 1. bridgeIntent — mirror of PhygitalGateway.bridgeIntent
//    (RFC lines 1155-1172)
// ============================================================
// Locks $AFC, creates PhysicsIntent { status: Executing }.
// Returns the in-memory intent (caller is responsible for persistence).
export function bridgeIntent(input: BridgeIntentInput): PhysicsIntent {
  if (!input.intentHash || !input.creatorAvatarId || !input.executorId) {
    throw new PCMGError("PCMG: bridgeIntent missing required fields", 400);
  }
  if (typeof input.amountUsdc !== "number" || input.amountUsdc <= 0) {
    throw new PCMGError("PCMG: amountUsdc must be > 0", 400);
  }
  if (typeof input.deadlineSeconds !== "number" || input.deadlineSeconds <= 0) {
    throw new PCMGError("PCMG: deadlineSeconds must be > 0", 400);
  }

  const now = Date.now();
  return {
    id: "", // assigned by DB on persistence
    intentHash: input.intentHash,
    creatorAvatarId: input.creatorAvatarId,
    afcEscrowAmount: toTokenUnits(input.amountUsdc),
    physicsConstraints: input.physicsConstraints,
    executorId: input.executorId,
    executionDeadline: new Date(now + input.deadlineSeconds * 1000),
    status: "Executing",
    fidelityScore: 0,
    resonanceScore: 0,
    multiModalProofHash: null,
  };
}

// ============================================================
// 2. verifyPhysicsProof — mirror of IMultimodalPhysicsOracle.verifyPhysicsProof
//    Simulates ZK verification of multimodal proof (spatial audio
//    + temp sensor + HRV). The proof carries a `fidelity` basis-point
//    score (0-10000). isValid iff fidelity > PCMG_FIDELITY_THRESHOLD.
// ============================================================
export function verifyPhysicsProof(
  proofData: MultiModalProof,
): PhysicsVerifyResult {
  const fidelityScore = clampBps(proofData.fidelity);
  const isValid = fidelityScore > RFC_CONSTANTS.PCMG_FIDELITY_THRESHOLD;
  return { isValid, fidelityScore };
}

// ============================================================
// 3. verifyEmotionalResonance — mirror of IECEngine.verifyEmotionalResonance
//    stateVector carries `resonance` (0-10000). isResonant iff
//    resonance > PCMG_RESONANCE_THRESHOLD.
// ============================================================
export function verifyEmotionalResonance(
  intentHash: string,
  stateVector: EmotionalStateVector,
): EmotionalResonanceResult {
  // intentHash is part of the interface for parity; not used in scoring.
  void intentHash;
  const resonanceScore = clampBps(stateVector.resonance);
  const isResonant = resonanceScore > RFC_CONSTANTS.PCMG_RESONANCE_THRESHOLD;
  return { isResonant, resonanceScore };
}

// extractStateVector — mirror of PhygitalGateway.extractStateVector.
// In the simplified model, the proof's `resonance` field is the state vector.
export function extractStateVector(
  proof: MultiModalProof,
): EmotionalStateVector {
  return { resonance: clampBps(proof.resonance) };
}

// ============================================================
// 4. submitPhysicsProof — mirror of PhygitalGateway.submitPhysicsProof
//    (RFC lines 1175-1208). Mutates `intent.status/scores` in-place and
//    returns the verify result. Throws PCMGError(400) on require-reverts.
// ============================================================
export function submitPhysicsProof(
  intent: PhysicsIntent,
  multiModalProof: MultiModalProof,
): PCMGVerifyResult {
  // require(msg.sender == executor)  — caller-side (API enforces; demo skips)
  // require(intent.status == Status.Executing)
  if (intent.status !== "Executing") {
    throw new PCMGError(
      `PCMG: Invalid status (${intent.status})`,
      400,
    );
  }

  // intent.status = Status.Verifying
  intent.status = "Verifying";

  // (isPhysicalValid, fidelityScore) = physicsOracle.verifyPhysicsProof(...)
  const { isValid: isPhysicalValid, fidelityScore } =
    verifyPhysicsProof(multiModalProof);

  // require(isPhysicalValid && fidelityScore > 8000,
  //         "PCMG: Physical proof invalid or low fidelity")
  if (!isPhysicalValid || fidelityScore <= RFC_CONSTANTS.PCMG_FIDELITY_THRESHOLD) {
    // Solidity `require` reverts the whole tx, rolling back state changes.
    // We mirror that by rolling back to the pre-call status.
    intent.status = "Executing";
    throw new PCMGError(
      "PCMG: Physical proof invalid or low fidelity",
      400,
    );
  }

  // stateVector = extractStateVector(multiModalProof)
  const stateVector = extractStateVector(multiModalProof);

  // (isResonant, resonanceScore) = ece.verifyEmotionalResonance(intentHash, stateVector)
  const { isResonant, resonanceScore } = verifyEmotionalResonance(
    intent.intentHash,
    stateVector,
  );

  let rewardReleased: Amount = 0n;
  let slashed = false;
  let slashReason: string | null = null;

  if (isResonant && resonanceScore > RFC_CONSTANTS.PCMG_RESONANCE_THRESHOLD) {
    // status = Completed; _releaseFundsAndReward(intent, resonanceScore)
    intent.status = "Completed";
    intent.fidelityScore = fidelityScore;
    intent.resonanceScore = resonanceScore;
    // Release the full escrow to executor; reputation +1 for creator.
    rewardReleased = intent.afcEscrowAmount;
    // (executor reputation update handled by API)
  } else {
    // status = Slashed; _slashExecutor(intent, "Emotional dissonance or physical violation")
    intent.status = "Slashed";
    intent.fidelityScore = fidelityScore;
    intent.resonanceScore = resonanceScore;
    slashed = true;
    slashReason = "Emotional dissonance or physical violation";
    // Slash amount = afcEscrowAmount (refund to creator) — recorded by API.
  }

  return {
    intentHash: intent.intentHash,
    physicalValid: isPhysicalValid,
    fidelityScore,
    emotionalResonant: isResonant,
    resonanceScore,
    status: intent.status,
    rewardReleased,
    slashed,
    slashReason,
  };
}

// ----- Helpers -----
function clampBps(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const v = Math.round(n);
  if (v < 0) return 0;
  if (v > RFC_CONSTANTS.BPS_MAX) return RFC_CONSTANTS.BPS_MAX;
  return v;
}

// Re-export status type for API consumers
export type { PhysicsIntentStatus, PCMGVerifyResult, PhysicsIntent };
