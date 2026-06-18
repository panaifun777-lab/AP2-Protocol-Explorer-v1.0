import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson, toTokenUnits } from "@/lib/types";
import { lockContrarianCognition } from "@/lib/contracts/tdpo";

// POST /api/tdpo/lock
// Body: { cognitiveHash, creatorAvatarId, mean, variance, delaySeconds }
// Steps:
//   1. Load creator avatar.
//   2. Call isContrarianCognition via lockContrarianCognition.
//   3. If not contrarian -> 400 with reason.
//   4. Check cognitiveHash uniqueness; create CognitiveAsset + ECE snapshot.
//   5. Return serialized TDPOLockResult + asset.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      cognitiveHash?: string;
      creatorAvatarId?: string;
      mean?: number;
      variance?: number;
      delaySeconds?: number;
    };

    const cognitiveHash = (body.cognitiveHash ?? "").trim();
    const creatorAvatarId = (body.creatorAvatarId ?? "").trim();
    const mean = Number(body.mean ?? 0);
    const variance = Number(body.variance ?? 0);
    const delaySeconds = Number(body.delaySeconds ?? 0);

    if (!cognitiveHash || !creatorAvatarId) {
      return NextResponse.json(
        {
          ok: false,
          error: "cognitiveHash and creatorAvatarId are required",
        },
        { status: 400 },
      );
    }
    if (
      !Number.isFinite(mean) ||
      !Number.isFinite(variance) ||
      !Number.isFinite(delaySeconds) ||
      delaySeconds <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "mean, variance, and a positive delaySeconds are required",
        },
        { status: 400 },
      );
    }

    const creator = await db.avatar.findUnique({
      where: { id: creatorAvatarId },
    });
    if (!creator) {
      return NextResponse.json(
        { ok: false, error: "Creator avatar not found" },
        { status: 404 },
      );
    }

    // Check uniqueness
    const existing = await db.cognitiveAsset.findUnique({
      where: { cognitiveHash },
    });
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: `Cognitive hash already locked: ${cognitiveHash}`,
        },
        { status: 409 },
      );
    }

    const nowMs = Date.now();
    const lockResult = lockContrarianCognition(
      cognitiveHash,
      creatorAvatarId,
      mean,
      variance,
      delaySeconds,
      nowMs,
    );

    if (!lockResult.locked) {
      return NextResponse.json(
        {
          ok: false,
          error: lockResult.reason,
          data: serializeForJson(lockResult),
        },
        { status: 400 },
      );
    }

    const lockTimestamp = new Date(nowMs);
    const unlockTimestamp = new Date(nowMs + delaySeconds * 1000);

    const asset = await db.cognitiveAsset.create({
      data: {
        cognitiveHash,
        creatorAvatarId,
        initialVariance: variance,
        initialMean: mean,
        lockTimestamp,
        unlockTimestamp,
        isRetroactiveTriggered: false,
        rewardAmount: 0n,
        futureMean: 0,
        futureCitations: 0,
        evolutionFactor: 0,
      },
    });

    // ECE snapshot at lock time (the RFC's getConsensusMetrics snapshot)
    await db.eCESnapshot.create({
      data: {
        avatarId: creatorAvatarId,
        cognitiveHash,
        meanScore: mean,
        varianceScore: variance,
        citations: 0,
      },
    });

    return NextResponse.json({
      ok: true,
      data: serializeForJson({ lockResult, asset }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

// Helper for unit-tests / preview environments that need to mint a fresh hash.
// (Not strictly required by RFC but useful for the demo panel.)
export function _demoHash(): string {
  return (
    "0x" +
    Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("")
  );
}

// Suppress unused-import warning for toTokenUnits — kept for parity with
// other TDPO API routes that may compute token amounts.
void toTokenUnits;
