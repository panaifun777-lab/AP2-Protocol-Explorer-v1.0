import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson } from "@/lib/types";
import {
  registerConsciousness,
  CIP_ERRORS,
} from "@/lib/contracts/cip";

// POST /api/cip/register
// Body: { entityId, cognitiveRoot, creatorAvatarId }
// Creates a ConsciousnessRecord. Returns the serialized record.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      entityId?: string;
      cognitiveRoot?: string;
      creatorAvatarId?: string;
    };

    const entityId = body.entityId?.trim();
    const cognitiveRoot = body.cognitiveRoot?.trim();
    const creatorAvatarId = body.creatorAvatarId?.trim();

    if (!entityId || !cognitiveRoot || !creatorAvatarId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required fields: entityId, cognitiveRoot, creatorAvatarId",
        },
        { status: 400 },
      );
    }

    // require(consciousnessMap[entityId].creationTimestamp == 0, "CIP: Already exists")
    const existing = await db.consciousnessRecord.findUnique({
      where: { entityId },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: CIP_ERRORS.ALREADY_EXISTS },
        { status: 400 },
      );
    }

    // Verify the creator avatar exists
    const creator = await db.avatar.findUnique({
      where: { id: creatorAvatarId },
    });
    if (!creator) {
      return NextResponse.json(
        { ok: false, error: "Creator avatar not found" },
        { status: 400 },
      );
    }

    // Run the pure contract function to build the record shape
    const draft = registerConsciousness(
      entityId,
      cognitiveRoot,
      creatorAvatarId,
    );

    const created = await db.consciousnessRecord.create({
      data: {
        entityId: draft.entityId,
        cognitiveRoot: draft.cognitiveRoot,
        isDeceasedOrMigrated: draft.isDeceasedOrMigrated,
        currentActiveAddressId: draft.currentActiveAddressId!,
        migrationCount: draft.migrationCount,
        lastMatchScore: draft.lastMatchScore,
      },
      include: { currentActiveAddress: true },
    });

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        ...created,
        activeAvatar: created.currentActiveAddress,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
