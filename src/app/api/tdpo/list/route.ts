import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson } from "@/lib/types";

// GET /api/tdpo/list
// Returns all cognitive assets (with creator avatar name) plus the current
// mediocrity pool balance. BigInt values are serialized as `__bigint__N`
// strings via serializeForJson.
export async function GET() {
  try {
    const assets = await db.cognitiveAsset.findMany({
      include: {
        creatorAvatar: {
          select: { id: true, name: true, kind: true, address: true },
        },
      },
      orderBy: { lockTimestamp: "desc" },
    });

    let pool = await db.mediocrityPool.findFirst();
    if (!pool) {
      pool = await db.mediocrityPool.create({
        data: { totalCollected: 0n, totalDistributed: 0n },
      });
    }

    const avatars = await db.avatar.findMany({
      select: {
        id: true,
        name: true,
        kind: true,
        address: true,
        reputation: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        assets,
        pool: {
          totalCollected: pool.totalCollected,
          totalDistributed: pool.totalDistributed,
        },
        avatars,
        stats: {
          totalLocked: assets.length,
          triggered: assets.filter((a) => a.isRetroactiveTriggered).length,
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
