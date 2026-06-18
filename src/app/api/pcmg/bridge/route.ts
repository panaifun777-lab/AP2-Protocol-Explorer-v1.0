import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson } from "@/lib/types";
import {
  bridgeIntent,
  hashIntent,
  PCMGError,
  type BridgeIntentInput,
} from "@/lib/contracts/pcmg";

// POST /api/pcmg/bridge
// Body: { creatorAvatarId, description?, intentHash?, amountUsdc,
//         physicsConstraints, executorId, deadlineSeconds }
// Creates a PhysicsIntent with status="Executing".
// Returns the serialized intent.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<BridgeIntentInput> & {
      description?: string;
    };

    const creatorAvatarId = body.creatorAvatarId;
    const executorId = body.executorId;
    const physicsConstraints =
      typeof body.physicsConstraints === "string"
        ? body.physicsConstraints
        : '{"location":"","item":"","time":""}';
    const amountUsdc = Number(body.amountUsdc);
    const deadlineSeconds = Number(body.deadlineSeconds);

    if (!creatorAvatarId || !executorId) {
      return NextResponse.json(
        { ok: false, error: "creatorAvatarId and executorId are required" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
      return NextResponse.json(
        { ok: false, error: "amountUsdc must be a positive number" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(deadlineSeconds) || deadlineSeconds <= 0) {
      return NextResponse.json(
        { ok: false, error: "deadlineSeconds must be a positive number" },
        { status: 400 },
      );
    }

    // Resolve creator + executor
    const creator = await db.avatar.findUnique({
      where: { id: creatorAvatarId },
    });
    if (!creator) {
      return NextResponse.json(
        { ok: false, error: "Creator avatar not found" },
        { status: 404 },
      );
    }
    const executor = await db.avatar.findUnique({
      where: { id: executorId },
    });
    if (!executor) {
      return NextResponse.json(
        { ok: false, error: "Executor avatar not found" },
        { status: 404 },
      );
    }

    // Compute intentHash if not provided (caller may pass `description` only).
    const intentHash =
      body.intentHash && body.intentHash.length > 0
        ? body.intentHash
        : hashIntent(creatorAvatarId, body.description ?? "");

    // Uniqueness
    const existing = await db.physicsIntent.findUnique({
      where: { intentHash },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Intent hash already exists" },
        { status: 409 },
      );
    }

    // Build the in-memory intent via the contract mirror.
    const intentData = bridgeIntent({
      intentHash,
      creatorAvatarId,
      amountUsdc,
      physicsConstraints,
      executorId,
      deadlineSeconds,
    });

    // Persist
    const persisted = await db.physicsIntent.create({
      data: {
        intentHash: intentData.intentHash,
        creatorAvatarId: intentData.creatorAvatarId,
        afcEscrowAmount: intentData.afcEscrowAmount,
        physicsConstraints: intentData.physicsConstraints,
        executorId: intentData.executorId,
        executionDeadline: intentData.executionDeadline,
        status: intentData.status,
        fidelityScore: 0,
        resonanceScore: 0,
        multiModalProofHash: null,
      },
      include: {
        creatorAvatar: { select: { id: true, name: true, address: true, kind: true } },
        executor: { select: { id: true, name: true, address: true, kind: true } },
      },
    });

    return NextResponse.json({ ok: true, data: serializeForJson(persisted) });
  } catch (e) {
    if (e instanceof PCMGError) {
      return NextResponse.json(
        { ok: false, error: e.message },
        { status: e.statusCode },
      );
    }
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
