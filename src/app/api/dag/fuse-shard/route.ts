import { NextResponse } from "next/server";
import { fuseShard } from "@/lib/contracts/cognitive-dag";
import { serializeForJson } from "@/lib/types";

// POST /api/dag/fuse-shard
// Body: { entityId, ownerAvatarId, shardHash, qEceScore, similarityToAnchor }
// Computes CPDF, creates the DAGNode + DAGEdge from core anchor → new node.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      entityId?: string;
      ownerAvatarId?: string;
      shardHash?: string;
      qEceScore?: number;
      similarityToAnchor?: number;
    };

    if (
      !body.entityId ||
      !body.ownerAvatarId ||
      !body.shardHash ||
      typeof body.qEceScore !== "number" ||
      typeof body.similarityToAnchor !== "number"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing required fields: entityId, ownerAvatarId, shardHash, qEceScore, similarityToAnchor",
        },
        { status: 400 },
      );
    }

    // Clamp inputs to valid ranges (mirror Solidity uint256 / bounded inputs).
    const qEce = Math.max(0, Math.min(10000, Math.round(body.qEceScore)));
    const sim = Math.max(
      0,
      Math.min(1, body.similarityToAnchor),
    );

    const result = await fuseShard(
      body.entityId,
      body.ownerAvatarId,
      body.shardHash,
      qEce,
      sim,
    );

    return NextResponse.json({ ok: true, data: serializeForJson(result) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
