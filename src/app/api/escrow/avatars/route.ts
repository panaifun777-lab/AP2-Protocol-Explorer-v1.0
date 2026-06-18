import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson, type Avatar, type BudgetFence } from "@/lib/types";

// GET /api/escrow/avatars — return all avatars + their budget fences.
// BigInt fields are serialized via serializeForJson (string with __bigint__ prefix).
export async function GET() {
  try {
    const avatars = await db.avatar.findMany({
      orderBy: { createdAt: "asc" },
      include: { budgetFences: true },
    });

    const result: Array<{
      avatar: Avatar;
      fence: BudgetFence | null;
    }> = avatars.map((a) => {
      const prismaFence = a.budgetFences[0] ?? null;
      const fence: BudgetFence | null = prismaFence
        ? {
            id: prismaFence.id,
            avatarId: prismaFence.avatarId,
            dailyCap: prismaFence.dailyCap,
            dailySpent: prismaFence.dailySpent,
            allowedScopes: prismaFence.allowedScopes
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            decayingThreshold: prismaFence.decayingThreshold,
            authDecayFactor: prismaFence.authDecayFactor,
            lastResetAt: prismaFence.lastResetAt,
          }
        : null;

      const avatar: Avatar = {
        id: a.id,
        address: a.address,
        name: a.name,
        kind: a.kind as Avatar["kind"],
        cognitiveRoot: a.cognitiveRoot,
        reputation: a.reputation,
        isUniqueEntity: a.isUniqueEntity,
        poueProofHash: a.poueProofHash,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };

      return { avatar, fence };
    });

    return NextResponse.json({ ok: true, data: serializeForJson(result) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
