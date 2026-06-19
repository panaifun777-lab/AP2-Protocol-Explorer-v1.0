import { NextResponse } from "next/server";
import { detectMoneyLaundering } from "@/lib/contracts/cognitive-dag";
import { serializeForJson } from "@/lib/types";

// POST /api/dag/detect-laundering
// Body: { entityId }
// Returns:
//   {
//     suspicious: boolean,
//     reason?: string,
//     blackHoledNodes: DAGNode[],
//     stats: { shardCount, avgEceScore, avgSimilarity }
//   }
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { entityId?: string };

    if (!body.entityId) {
      return NextResponse.json(
        { ok: false, error: "Missing required field: entityId" },
        { status: 400 },
      );
    }

    const result = await detectMoneyLaundering(body.entityId);

    return NextResponse.json({ ok: true, data: serializeForJson(result) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
