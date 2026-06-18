import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson } from "@/lib/types";
import { claimRetroactiveReward, computeEvolutionFactor } from "@/lib/contracts/tdpo";

// POST /api/tdpo/advance-time
// Body: { cognitiveHash, futureMean, futureCitations }
// Simulates "T+N elapses, reality shifts, the prophet is vindicated".
//   1. Load asset (with creator avatar).
//   2. Load the global mediocrity pool.
//   3. Call claimRetroactiveReward(asset, futureMean, futureCitations, pool).
//   4. If triggered:
//        - deduct rewardAmount from MediocrityPool.totalCollected
//        - add rewardAmount to MediocrityPool.totalDistributed
//        - mark asset.isRetroactiveTriggered = true
//        - store futureMean, futureCitations, evolutionFactor, rewardAmount
//        - add reputationDelta to creator avatar
//      If not triggered:
//        - record futureMean/futureCitations on the asset (so user can retry)
//        - do NOT mark triggered
//   5. Return serialized TDPORetroactiveResult.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      cognitiveHash?: string;
      futureMean?: number;
      futureCitations?: number;
    };

    const cognitiveHash = (body.cognitiveHash ?? "").trim();
    const futureMean = Number(body.futureMean ?? 0);
    const futureCitations = Number(body.futureCitations ?? 0);

    if (!cognitiveHash) {
      return NextResponse.json(
        { ok: false, error: "cognitiveHash is required" },
        { status: 400 },
      );
    }
    if (
      !Number.isFinite(futureMean) ||
      !Number.isFinite(futureCitations) ||
      futureMean < 0 ||
      futureCitations < 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "futureMean and futureCitations must be non-negative numbers",
        },
        { status: 400 },
      );
    }

    const asset = await db.cognitiveAsset.findUnique({
      where: { cognitiveHash },
      include: { creatorAvatar: true },
    });
    if (!asset) {
      return NextResponse.json(
        { ok: false, error: "Cognitive asset not found" },
        { status: 404 },
      );
    }

    // Mediocrity pool — single logical row; use first() or create empty
    let pool = await db.mediocrityPool.findFirst();
    if (!pool) {
      pool = await db.mediocrityPool.create({
        data: { totalCollected: 0n, totalDistributed: 0n },
      });
    }

    const result = claimRetroactiveReward(
      {
        cognitiveHash: asset.cognitiveHash,
        initialMean: asset.initialMean,
        unlockTimestamp: asset.unlockTimestamp,
        isRetroactiveTriggered: asset.isRetroactiveTriggered,
      },
      futureMean,
      futureCitations,
      pool.totalCollected,
    );

    if (result.triggered) {
      const rewardAmount = result.rewardAmount;
      const newTotalCollected = pool.totalCollected - rewardAmount;
      const newTotalDistributed = pool.totalDistributed + rewardAmount;
      const newReputation =
        asset.creatorAvatar.reputation + result.reputationDelta;

      // Compute evolution factor for storage (mirrors the contract's value).
      const evolutionFactor = computeEvolutionFactor(
        asset.initialMean,
        futureMean,
      );

      await db.$transaction([
        db.mediocrityPool.update({
          where: { id: pool.id },
          data: {
            totalCollected: newTotalCollected,
            totalDistributed: newTotalDistributed,
          },
        }),
        db.cognitiveAsset.update({
          where: { id: asset.id },
          data: {
            isRetroactiveTriggered: true,
            rewardAmount,
            futureMean,
            futureCitations,
            evolutionFactor,
          },
        }),
        db.avatar.update({
          where: { id: asset.creatorAvatarId },
          data: { reputation: newReputation },
        }),
      ]);
    } else {
      // Not triggered — record the future metrics so the user can retry
      // after correcting inputs. Do NOT mark triggered.
      await db.cognitiveAsset.update({
        where: { id: asset.id },
        data: {
          futureMean,
          futureCitations,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: serializeForJson(result),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
