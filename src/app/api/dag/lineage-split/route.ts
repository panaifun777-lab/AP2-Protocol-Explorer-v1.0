import { NextResponse } from "next/server";
import { executeLineageSplit } from "@/lib/contracts/cognitive-dag";
import { serializeForJson, toTokenUnits } from "@/lib/types";

// POST /api/dag/lineage-split
// Body: { entityId, totalRewardAmountUsdc }
// Computes the lineage-aware reward split. Does NOT actually transfer funds
// (this is the simulation view of `CIP_Lineage._executeLineageSplit`).
//
// Returns: LineageSplitShareBig[] with bigint `share` (serialized as
// `__bigint__<digits>` string via serializeForJson).
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      entityId?: string;
      totalRewardAmountUsdc?: number;
    };

    if (
      !body.entityId ||
      typeof body.totalRewardAmountUsdc !== "number" ||
      body.totalRewardAmountUsdc < 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing required fields: entityId, totalRewardAmountUsdc (non-negative number)",
        },
        { status: 400 },
      );
    }

    // Convert USDC float → 6-decimals bigint (mirror Solidity uint256).
    const totalRewardAmount = toTokenUnits(body.totalRewardAmountUsdc);

    const shares = await executeLineageSplit(body.entityId, totalRewardAmount);

    return NextResponse.json({ ok: true, data: serializeForJson(shares) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
