import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson, type ConsciousnessRecord, type CDSToken } from "@/lib/types";
import { migrateConsciousness } from "@/lib/contracts/cip";
import { soulTransfer } from "@/lib/contracts/cds";

// POST /api/cip/migrate
// Body: { entityId, newActiveAddressId, matchScore }
//
// Three-zone routing (RFC §5.2 CIP_Lineage.sol):
//   matchScore >= 8500 -> PURE_INHERITANCE  (SBT soul-transfer fires)
//   6000 <= s < 8500    -> FUSION_EMERGENCE  (requiresLineageSplit=true; DAG
//                                              module handles the actual split)
//   s < 6000            -> HIJACK_REJECTED   (400 with reason; no state change)
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      entityId?: string;
      newActiveAddressId?: string;
      matchScore?: number;
    };

    const entityId = body.entityId?.trim();
    const newActiveAddressId = body.newActiveAddressId?.trim();
    const matchScore = body.matchScore;

    if (!entityId || !newActiveAddressId) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: entityId, newActiveAddressId" },
        { status: 400 },
      );
    }
    if (typeof matchScore !== "number" || !Number.isFinite(matchScore)) {
      return NextResponse.json(
        { ok: false, error: "matchScore must be a number" },
        { status: 400 },
      );
    }
    // Quantize to integer basis points (caller may send 92.5 etc.)
    const matchScoreBps = Math.round(matchScore);
    if (matchScoreBps < 0 || matchScoreBps > 10000) {
      return NextResponse.json(
        { ok: false, error: "matchScore must be in [0, 10000]" },
        { status: 400 },
      );
    }

    // Load the record
    const record = await db.consciousnessRecord.findUnique({
      where: { entityId },
    });
    if (!record) {
      return NextResponse.json(
        { ok: false, error: "CIP: Entity not found" },
        { status: 404 },
      );
    }

    // Verify the new active avatar exists
    const newAvatar = await db.avatar.findUnique({
      where: { id: newActiveAddressId },
    });
    if (!newAvatar) {
      return NextResponse.json(
        { ok: false, error: "New active avatar not found" },
        { status: 400 },
      );
    }

    // Build a mutable record view for the contract function
    const mutableRecord: ConsciousnessRecord = {
      id: record.id,
      entityId: record.entityId,
      cognitiveRoot: record.cognitiveRoot,
      creationTimestamp: record.creationTimestamp,
      isDeceasedOrMigrated: record.isDeceasedOrMigrated,
      currentActiveAddressId: record.currentActiveAddressId,
      migrationCount: record.migrationCount,
      lastMatchScore: record.lastMatchScore,
    };

    // Run the pure contract function — mutates mutableRecord on success
    const result = migrateConsciousness(
      mutableRecord,
      newActiveAddressId,
      matchScoreBps,
    );

    // HIJACK_REJECTED: 400 with reason. NO state mutation.
    if (result.outcome === "HIJACK_REJECTED") {
      return NextResponse.json(
        { ok: false, error: result.reason, data: serializeForJson(result) },
        { status: 400 },
      );
    }

    // Persist the record updates (PURE_INHERITANCE + FUSION_EMERGENCE both
    // rotate the active address & mark the old carrier as deceased/migrated)
    await db.consciousnessRecord.update({
      where: { entityId },
      data: {
        currentActiveAddressId: mutableRecord.currentActiveAddressId,
        isDeceasedOrMigrated: mutableRecord.isDeceasedOrMigrated,
        migrationCount: mutableRecord.migrationCount,
        lastMatchScore: mutableRecord.lastMatchScore,
      },
    });

    const transferredTokens: CDSToken[] = [];

    if (result.outcome === "PURE_INHERITANCE") {
      // Find all CDS tokens bound to this entityId and soul-transfer each
      const tokens = await db.cDSToken.findMany({ where: { entityId } });
      for (const t of tokens) {
        // Skip if already at new active address
        if (t.ownerAvatarId === newActiveAddressId) continue;
        const tokenView: CDSToken = {
          id: t.id,
          tokenId: t.tokenId,
          entityId: t.entityId,
          ownerAvatarId: t.ownerAvatarId,
          metadataHash: t.metadataHash,
          isSoulbound: t.isSoulbound,
          mintTimestamp: t.mintTimestamp,
        };
        const updated = soulTransfer(tokenView, newActiveAddressId);
        await db.cDSToken.update({
          where: { id: t.id },
          data: { ownerAvatarId: updated.ownerAvatarId },
        });
        transferredTokens.push(updated);
      }
    }
    // FUSION_EMERGENCE: the actual lineage split is performed by the DAG
    // module — we only record `requiresLineageSplit=true` on the result.
    // The CDS tokens still follow the new active address in this simulation
    // (the on-chain CIP_Lineage splits the *reward*, not the SBT ownership),
    // but to keep behaviour tight and mirror the RFC sequence we leave SBT
    // ownership alone when in the fusion band — only PURE_INHERITANCE fires
    // the unconditional soulTransfer.

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        ...result,
        transferredTokens,
        previousRecordSnapshot: serializeForJson({
          currentActiveAddressId: record.currentActiveAddressId,
          migrationCount: record.migrationCount,
          lastMatchScore: record.lastMatchScore,
          isDeceasedOrMigrated: record.isDeceasedOrMigrated,
        }),
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
