import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson, toTokenUnits } from "@/lib/types";
import { injectMediocrityTax } from "@/lib/contracts/tdpo";

// POST /api/tdpo/inject-tax
// Body: { amountUsdc }
// Adds to MediocrityPool.totalCollected (the RFC's contrarianRewardPool).
// Returns the new pool balance (totalCollected, totalDistributed).
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { amountUsdc?: number };
    const amountUsdc = Number(body.amountUsdc ?? 0);

    if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
      return NextResponse.json(
        { ok: false, error: "amountUsdc must be a positive number" },
        { status: 400 },
      );
    }

    let pool = await db.mediocrityPool.findFirst();
    if (!pool) {
      pool = await db.mediocrityPool.create({
        data: { totalCollected: 0n, totalDistributed: 0n },
      });
    }

    const taxAmount = toTokenUnits(amountUsdc);
    const newBalance = injectMediocrityTax(pool.totalCollected, taxAmount);

    const updated = await db.mediocrityPool.update({
      where: { id: pool.id },
      data: { totalCollected: newBalance },
    });

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        totalCollected: updated.totalCollected,
        totalDistributed: updated.totalDistributed,
        taxInjected: taxAmount,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
