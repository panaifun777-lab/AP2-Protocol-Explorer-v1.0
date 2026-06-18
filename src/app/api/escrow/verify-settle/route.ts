import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeForJson,
  type Escrow,
  type VerifyAndSettleResult,
} from "@/lib/types";
import { verifyAndSettle as settleFn } from "@/lib/contracts/escrow";

// POST /api/escrow/verify-settle
// Body: { taskId, mcpCompletionPct, qualityScore }
// Mirrors RFC AP2Escrow.sol verifyAndSettle (lines 114-142).
//   1. Load escrow. Verify payer (skipped — only one client in sim).
//   2. MCP oracle verifyProof -> (success, completionPct). We accept the
//      caller-provided completionPct as the oracle verdict (simulated).
//   3. finalPayout = totalAmount * completionPct / 100
//      diff = releasedAmount - finalPayout
//      if diff > 0: status=Disputed, clawbackRequired=diff (NO transfer).
//      else: remainingPayout, refundAmount, status=Completed, rep += qualityScore.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      taskId?: string;
      mcpCompletionPct?: number;
      qualityScore?: number;
    };
    const taskId = (body.taskId ?? "").trim();
    const mcpCompletionPct = Number(body.mcpCompletionPct ?? 0);
    const qualityScore = Number(body.qualityScore ?? 0);

    if (!taskId) {
      return NextResponse.json(
        { ok: false, error: "taskId is required" },
        { status: 400 },
      );
    }
    if (
      !Number.isFinite(mcpCompletionPct) ||
      mcpCompletionPct < 0 ||
      mcpCompletionPct > 100
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "mcpCompletionPct must be a number in [0,100]",
        },
        { status: 400 },
      );
    }
    if (
      !Number.isFinite(qualityScore) ||
      qualityScore < 0 ||
      qualityScore > 100
    ) {
      return NextResponse.json(
        { ok: false, error: "qualityScore must be a number in [0,100]" },
        { status: 400 },
      );
    }

    const row = await db.escrow.findUnique({ where: { taskId } });
    if (!row) {
      return NextResponse.json(
        { ok: false, error: `Escrow not found: ${taskId}` },
        { status: 404 },
      );
    }

    // Per RFC: only payer can settle. The simulation panel is a single
    // privileged client; we accept the request but record the payer.
    const escrow: Pick<
      Escrow,
      "taskId" | "totalAmount" | "releasedAmount"
    > = {
      taskId: row.taskId,
      totalAmount: row.totalAmount,
      releasedAmount: row.releasedAmount,
    };

    const result: VerifyAndSettleResult = settleFn(
      escrow,
      mcpCompletionPct,
      qualityScore,
    );

    if (result.status === "Disputed") {
      // CLAWBACK PATH — DO NOT TRANSFER.
      // Mirror Solidity: escrow.status = Disputed; emit DisputeTriggered; return.
      const updated = await db.escrow.update({
        where: { id: row.id },
        data: {
          status: "Disputed",
          completionPct: Math.floor(mcpCompletionPct),
          qualityScore: Math.floor(qualityScore),
          mcpProofHash: `0xmcp_proof_${taskId}_${Date.now().toString(16)}`,
        },
      });

      return NextResponse.json({
        ok: true,
        data: serializeForJson({
          result,
          escrow: {
            ...row,
            ...updated,
            status: "Disputed" as Escrow["status"],
            totalAmount: row.totalAmount,
            releasedAmount: row.releasedAmount,
          },
        }),
      });
    }

    // SUCCESS PATH — pay remaining + refund + reputation += qualityScore.
    // Update escrow + payer-avatar reputation in a transaction.
    const updated = await db.$transaction(async (tx) => {
      const e = await tx.escrow.update({
        where: { id: row.id },
        data: {
          status: "Completed",
          completionPct: Math.floor(mcpCompletionPct),
          qualityScore: Math.floor(qualityScore),
          mcpProofHash: `0xmcp_proof_${taskId}_${Date.now().toString(16)}`,
        },
      });

      // cognitiveReputation[payee] += qualityScore  (RFC line 138).
      // The payee is the recipient of the work; the reputation delta
      // credits the payee's cognitive reputation, not the payer's.
      const payeeBefore = await tx.avatar.findUnique({
        where: { id: row.payeeId },
      });
      const beforeRep = payeeBefore?.reputation ?? 0;
      await tx.avatar.update({
        where: { id: row.payeeId },
        data: { reputation: beforeRep + result.reputationDelta },
      });

      return { escrow: e, payeeRepBefore: beforeRep };
    });

    const finalEscrow: Escrow = {
      id: updated.escrow.id,
      taskId: updated.escrow.taskId,
      payerId: updated.escrow.payerId,
      payeeId: updated.escrow.payeeId,
      totalAmount: updated.escrow.totalAmount,
      releasedAmount: updated.escrow.releasedAmount,
      scope: updated.escrow.scope,
      startTime: updated.escrow.startTime,
      endTime: updated.escrow.endTime,
      status: updated.escrow.status as Escrow["status"],
      qualityScore: updated.escrow.qualityScore,
      completionPct: updated.escrow.completionPct,
      mcpProofHash: updated.escrow.mcpProofHash,
    };

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        result,
        escrow: finalEscrow,
        payeeRepBefore: updated.payeeRepBefore,
        payeeRepAfter: updated.payeeRepBefore + result.reputationDelta,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
