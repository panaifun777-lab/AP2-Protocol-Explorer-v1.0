import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeForJson,
  type Escrow,
  type StreamReleaseResult,
} from "@/lib/types";
import { buildStreamReleaseResult, computeReleasable } from "@/lib/contracts/escrow";

// POST /api/escrow/stream-release
// Body: { taskId }
// Mirrors RFC AP2Escrow.sol streamRelease (lines 91-112).
//   1. Load escrow. If status !== "Streaming" → 400.
//   2. Compute releasable via computeReleasable. If 0 → 400 "Nothing to release".
//   3. releasedAmount += releasable; status = newStatus (maybe Completed).
//   4. Return StreamReleaseResult serialized.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { taskId?: string };
    const taskId = (body.taskId ?? "").trim();
    if (!taskId) {
      return NextResponse.json(
        { ok: false, error: "taskId is required" },
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

    const escrow: Escrow = {
      id: row.id,
      taskId: row.taskId,
      payerId: row.payerId,
      payeeId: row.payeeId,
      totalAmount: row.totalAmount,
      releasedAmount: row.releasedAmount,
      scope: row.scope,
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status as Escrow["status"],
      qualityScore: row.qualityScore,
      completionPct: row.completionPct,
      mcpProofHash: row.mcpProofHash,
    };

    if (escrow.status !== "Streaming") {
      return NextResponse.json(
        {
          ok: false,
          error: `AA2P: Invalid status — escrow is ${escrow.status}, expected Streaming`,
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const result = computeReleasable(escrow, now);

    if (result.releasableAmount <= 0n) {
      return NextResponse.json(
        {
          ok: false,
          error: `AA2P: Nothing to release (elapsed=${result.elapsedSeconds}s / total=${result.totalDurationSeconds}s)`,
        },
        { status: 400 },
      );
    }

    // Apply: releasedAmount += releasable; status = newStatus.
    const updated = await db.escrow.update({
      where: { id: escrow.id },
      data: {
        releasedAmount: escrow.releasedAmount + result.releasableAmount,
        status: result.newStatus,
      },
    });

    const streamResult: StreamReleaseResult = buildStreamReleaseResult(
      { taskId: escrow.taskId, releasedAmount: escrow.releasedAmount },
      result.releasableAmount,
      result.newStatus,
    );

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        result: streamResult,
        escrow: {
          ...escrow,
          releasedAmount: updated.releasedAmount,
          status: updated.status as Escrow["status"],
        },
        math: {
          elapsedSeconds: result.elapsedSeconds,
          totalDurationSeconds: result.totalDurationSeconds,
          timeProgressPct: result.timeProgressPct,
        },
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
