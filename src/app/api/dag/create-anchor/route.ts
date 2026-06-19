import { NextResponse } from "next/server";
import { createCoreAnchor } from "@/lib/contracts/cognitive-dag";
import { serializeForJson } from "@/lib/types";

// POST /api/dag/create-anchor
// Body: { entityId, ownerAvatarId, shardHash }
// Creates the core anchor DAGNode for an entity (idempotent).
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      entityId?: string;
      ownerAvatarId?: string;
      shardHash?: string;
    };

    if (!body.entityId || !body.ownerAvatarId || !body.shardHash) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing required fields: entityId, ownerAvatarId, shardHash",
        },
        { status: 400 },
      );
    }

    const node = await createCoreAnchor(
      body.entityId,
      body.ownerAvatarId,
      body.shardHash,
    );

    return NextResponse.json({ ok: true, data: serializeForJson(node) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
