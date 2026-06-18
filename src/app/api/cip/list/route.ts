import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson } from "@/lib/types";

// GET /api/cip/list
// Returns all CIP records (with their active avatar) + all CDS tokens,
// serialized for JSON (bigint-safe).
export async function GET() {
  try {
    const [records, tokens, avatars] = await Promise.all([
      db.consciousnessRecord.findMany({
        include: { currentActiveAddress: true },
        orderBy: { creationTimestamp: "asc" },
      }),
      db.cDSToken.findMany({
        include: { ownerAvatar: true },
        orderBy: { tokenId: "asc" },
      }),
      db.avatar.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    // Compute aggregate stats for the panel header
    const totalMigrations = records.reduce(
      (sum, r) => sum + r.migrationCount,
      0,
    );
    const migratedEntities = records.filter(
      (r) => r.migrationCount > 0,
    ).length;
    const migratedScores = records
      .filter((r) => r.migrationCount > 0)
      .map((r) => r.lastMatchScore);
    const avgMatchScore =
      migratedScores.length > 0
        ? Math.round(
            migratedScores.reduce((a, b) => a + b, 0) / migratedScores.length,
          )
        : 0;

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        records: records.map((r) => ({
          ...r,
          activeAvatar: r.currentActiveAddress,
        })),
        tokens: tokens.map((t) => ({
          ...t,
          ownerAvatar: t.ownerAvatar,
        })),
        avatars,
        stats: {
          totalEntities: records.length,
          totalMigrations,
          migratedEntities,
          cdsTokensMinted: tokens.length,
          avgMatchScore,
        },
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
