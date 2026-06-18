import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson, type Escrow } from "@/lib/types";

// GET /api/escrow/list — return all escrows with payer/payee avatar
// names joined. BigInt fields are serialized via serializeForJson.
export async function GET() {
  try {
    const rows = await db.escrow.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        payer: { select: { id: true, address: true, name: true, kind: true } },
        payee: { select: { id: true, address: true, name: true, kind: true } },
      },
    });

    const result = rows.map((r) => {
      const escrow: Escrow = {
        id: r.id,
        taskId: r.taskId,
        payerId: r.payerId,
        payeeId: r.payeeId,
        totalAmount: r.totalAmount,
        releasedAmount: r.releasedAmount,
        scope: r.scope,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status as Escrow["status"],
        qualityScore: r.qualityScore,
        completionPct: r.completionPct,
        mcpProofHash: r.mcpProofHash,
      };
      return {
        ...escrow,
        payerName: r.payer.name,
        payerAddress: r.payer.address,
        payerKind: r.payer.kind,
        payeeName: r.payee.name,
        payeeAddress: r.payee.address,
        payeeKind: r.payee.kind,
      };
    });

    return NextResponse.json({ ok: true, data: serializeForJson(result) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
