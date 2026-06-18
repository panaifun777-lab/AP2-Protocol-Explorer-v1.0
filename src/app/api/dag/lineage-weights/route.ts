import { NextResponse } from "next/server";
import { getLineageWeights, getEntityGraph } from "@/lib/contracts/cognitive-dag";
import { serializeForJson } from "@/lib/types";

// GET /api/dag/lineage-weights?entityId=...
// Returns:
//   {
//     avatars: string[],
//     weights: number[],         // bps, sum = 10000
//     graph: { nodes: DAGNode[], edges: DAGEdge[] }
//   }
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const entityId = url.searchParams.get("entityId");

    if (!entityId) {
      return NextResponse.json(
        { ok: false, error: "Missing required query param: entityId" },
        { status: 400 },
      );
    }

    const [weights, graph] = await Promise.all([
      getLineageWeights(entityId),
      getEntityGraph(entityId),
    ]);

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        avatars: weights.avatars,
        weights: weights.weights,
        graph,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
