import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllEntityGraphs } from "@/lib/contracts/cognitive-dag";
import { serializeForJson } from "@/lib/types";

// GET /api/dag/list
// Returns all DAG nodes + edges grouped by entityId, plus the avatar registry
// (so the frontend can resolve ownerAvatarId → name/kind without another
// endpoint). All BigInt fields are serialized via serializeForJson.
export async function GET() {
  try {
    const [entities, avatars] = await Promise.all([
      getAllEntityGraphs(),
      db.avatar.findMany({
        select: {
          id: true,
          address: true,
          name: true,
          kind: true,
          reputation: true,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: serializeForJson({ entities, avatars }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
