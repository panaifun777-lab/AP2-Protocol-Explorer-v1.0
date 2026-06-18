import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson } from "@/lib/types";

// GET /api/pcmg/list
// Returns all physics intents with creator + executor names, plus the
// avatar roster (so the panel can populate <select>s without a second call).
export async function GET() {
  try {
    const intents = await db.physicsIntent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creatorAvatar: {
          select: { id: true, name: true, address: true, kind: true },
        },
        executor: {
          select: { id: true, name: true, address: true, kind: true },
        },
      },
    });

    const avatars = await db.avatar.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        address: true,
        kind: true,
        reputation: true,
        isUniqueEntity: true,
      },
    });

    return NextResponse.json(
      serializeForJson({ ok: true, data: { intents, avatars } }),
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
