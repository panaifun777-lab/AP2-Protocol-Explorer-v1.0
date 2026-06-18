import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson, type ConsciousnessRecord } from "@/lib/types";
import { asRegistryView } from "@/lib/contracts/cip";
import { mint } from "@/lib/contracts/cds";

// POST /api/cip/mint-sbt
// Body: { entityId, metadataHash }
// Loads the CIP record, resolves the active address, and mints a new
// CDS SBT bound to `entityId`. tokenId = next sequential integer.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      entityId?: string;
      metadataHash?: string;
    };

    const entityId = body.entityId?.trim();
    const metadataHash = body.metadataHash?.trim();

    if (!entityId || !metadataHash) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: entityId, metadataHash" },
        { status: 400 },
      );
    }

    // Load the CIP record
    const record = await db.consciousnessRecord.findUnique({
      where: { entityId },
    });
    if (!record) {
      return NextResponse.json(
        { ok: false, error: "CIP: Entity not found" },
        { status: 404 },
      );
    }
    if (!record.currentActiveAddressId) {
      return NextResponse.json(
        { ok: false, error: "CDS: Entity not active" },
        { status: 400 },
      );
    }

    // Allocate the next sequential tokenId
    const lastToken = await db.cDSToken.findFirst({
      orderBy: { tokenId: "desc" },
    });
    const nextTokenId = lastToken ? lastToken.tokenId + 1 : 1;

    // Build a CIPRegistryPort view from the record
    const recordView: ConsciousnessRecord = {
      id: record.id,
      entityId: record.entityId,
      cognitiveRoot: record.cognitiveRoot,
      creationTimestamp: record.creationTimestamp,
      isDeceasedOrMigrated: record.isDeceasedOrMigrated,
      currentActiveAddressId: record.currentActiveAddressId,
      migrationCount: record.migrationCount,
      lastMatchScore: record.lastMatchScore,
    };
    const cipRegistry = asRegistryView(recordView);

    // Run the pure contract function
    const draft = mint(cipRegistry, entityId, nextTokenId, metadataHash);

    // Persist
    const created = await db.cDSToken.create({
      data: {
        tokenId: draft.tokenId,
        entityId: draft.entityId,
        ownerAvatarId: draft.ownerAvatarId,
        metadataHash: draft.metadataHash,
        isSoulbound: draft.isSoulbound,
      },
      include: { ownerAvatar: true },
    });

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        ...created,
        ownerAvatar: created.ownerAvatar,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
