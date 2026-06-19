import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson, type PhysicsIntent } from "@/lib/types";
import {
  submitPhysicsProof,
  hashProof,
  PCMGError,
  type MultiModalProof,
} from "@/lib/contracts/pcmg";

// POST /api/pcmg/submit-proof
// Body: { intentHash, fidelity (0-10000), resonance (0-10000) }
// "multiModalProof" is simplified to { fidelity, resonance }.
// Runs the submitPhysicsProof flow and persists results.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      intentHash?: string;
      fidelity?: number;
      resonance?: number;
    };

    const intentHash = body.intentHash;
    const fidelity = Number(body.fidelity);
    const resonance = Number(body.resonance);

    if (!intentHash) {
      return NextResponse.json(
        { ok: false, error: "intentHash is required" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(fidelity) || fidelity < 0 || fidelity > 10000) {
      return NextResponse.json(
        { ok: false, error: "fidelity must be a number in [0, 10000]" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(resonance) || resonance < 0 || resonance > 10000) {
      return NextResponse.json(
        { ok: false, error: "resonance must be a number in [0, 10000]" },
        { status: 400 },
      );
    }

    // Load intent
    const persisted = await db.physicsIntent.findUnique({
      where: { intentHash },
    });
    if (!persisted) {
      return NextResponse.json(
        { ok: false, error: "Intent not found" },
        { status: 404 },
      );
    }

    // require(msg.sender == executor) — for demo, accept any caller.
    // (Executor verification would compare request wallet address; skipped here.)

    // Build the in-memory intent object the contract mirror expects.
    // The mirror mutates status/scores in-place.
    const intentObj: PhysicsIntent = {
      id: persisted.id,
      intentHash: persisted.intentHash,
      creatorAvatarId: persisted.creatorAvatarId,
      afcEscrowAmount: persisted.afcEscrowAmount,
      physicsConstraints: persisted.physicsConstraints,
      executorId: persisted.executorId,
      executionDeadline: persisted.executionDeadline,
      status: persisted.status as PhysicsIntent["status"],
      fidelityScore: persisted.fidelityScore,
      resonanceScore: persisted.resonanceScore,
      multiModalProofHash: persisted.multiModalProofHash,
    };

    const proof: MultiModalProof = { fidelity, resonance };
    const proofHash = hashProof(proof);

    // Run the contract flow. Throws PCMGError on require-reverts.
    let result;
    try {
      result = submitPhysicsProof(intentObj, proof);
    } catch (e) {
      if (e instanceof PCMGError) {
        return NextResponse.json(
          { ok: false, error: e.message },
          { status: e.statusCode },
        );
      }
      throw e;
    }

    // Persist the mutated fields.
    await db.physicsIntent.update({
      where: { intentHash },
      data: {
        status: intentObj.status,
        fidelityScore: intentObj.fidelityScore,
        resonanceScore: intentObj.resonanceScore,
        multiModalProofHash: proofHash,
      },
    });

    // On Completed: release funds to executor (recorded as rewardReleased),
    // and bump creator's cognitive reputation by +1 (RFC line ~1204).
    if (intentObj.status === "Completed") {
      await db.avatar.update({
        where: { id: persisted.creatorAvatarId },
        data: { reputation: { increment: 1 } },
      });
    }
    // On Slashed: slashAmount = afcEscrowAmount refunded to creator.
    // In this simulation the escrow was never actually debited from the
    // creator's wallet (no $AFC wallet model in this module), so we just
    // record slashReason in the result payload. A real implementation
    // would mint/refund the $AFC here.

    return NextResponse.json({ ok: true, data: serializeForJson(result) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
