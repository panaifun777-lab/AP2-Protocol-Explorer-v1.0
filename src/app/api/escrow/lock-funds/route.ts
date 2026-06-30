import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeForJson,
  toTokenUnits,
  type BudgetFence,
  type BudgetFenceCheckResult,
  type Escrow,
} from "@/lib/types";
import { checkAndConsume } from "@/lib/contracts/escrow";

// POST /api/escrow/lock-funds
// Body: { taskId, payerAddress, payeeAddress, amountUsdc, scope, durationSeconds }
// Steps (mirror RFC AP2Escrow.sol lockFunds, lines 65-89):
//   1. Load payer Avatar + BudgetFence.
//   2. checkAndConsume — if not approved → 400 with the rejection reason.
//   3. TransferFrom (simulated) — funds locked in escrow contract.
//   4. Create Escrow record: status=Streaming, startTime=now, endTime=now+duration.
//   5. Persist fence.dailySpent update + escrow create in a transaction.
//   6. Return serialized escrow + fence check result.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      taskId?: string;
      payerAddress?: string;
      payeeAddress?: string;
      amountUsdc?: number;
      scope?: string;
      durationSeconds?: number;
    };

    const taskId = (body.taskId ?? "").trim();
    const payerAddress = (body.payerAddress ?? "").trim();
    const payeeAddress = (body.payeeAddress ?? "").trim();
    const amountUsdc = Number(body.amountUsdc ?? 0);
    const scope = (body.scope ?? "").trim();
    const durationSeconds = Number(body.durationSeconds ?? 0);

    if (!taskId || !payerAddress || !payeeAddress || !scope) {
      return NextResponse.json(
        {
          ok: false,
          error: "taskId, payerAddress, payeeAddress, scope are required",
        },
        { status: 400 },
      );
    }
    if (
      !Number.isFinite(amountUsdc) ||
      amountUsdc <= 0 ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "amountUsdc (positive) and durationSeconds (positive) are required",
        },
        { status: 400 },
      );
    }

    // Load payer + fence
    const payer = await db.avatar.findUnique({
      where: { address: payerAddress },
      include: { budgetFences: true },
    });
    if (!payer) {
      return NextResponse.json(
        { ok: false, error: `Payer avatar not found: ${payerAddress}` },
        { status: 404 },
      );
    }
    if (payer.budgetFences.length === 0) {
      return NextResponse.json(
        { ok: false, error: `Payer has no BudgetFence configured` },
        { status: 400 },
      );
    }
    const payee = await db.avatar.findUnique({
      where: { address: payeeAddress },
    });
    if (!payee) {
      return NextResponse.json(
        { ok: false, error: `Payee avatar not found: ${payeeAddress}` },
        { status: 404 },
      );
    }
    if (payer.id === payee.id) {
      return NextResponse.json(
        { ok: false, error: `Payer and payee must be different avatars` },
        { status: 400 },
      );
    }

    // Task id must be unique (RFC: mapping(bytes32 => Escrow))
    const existingTask = await db.escrow.findUnique({ where: { taskId } });
    if (existingTask) {
      return NextResponse.json(
        { ok: false, error: `taskId already in use: ${taskId}` },
        { status: 409 },
      );
    }

    const prismaFence = payer.budgetFences[0];
    const fence: BudgetFence = {
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
    };

    const amount = toTokenUnits(amountUsdc);
    const check: BudgetFenceCheckResult = checkAndConsume(fence, amount, scope);

    if (!check.approved) {
      // Mirror Solidity revert. Persist nothing.
      return NextResponse.json(
        {
          ok: false,
          error: `AA2P: Budget/Scope limit exceeded or Human Auth Required — ${check.reason}`,
          data: serializeForJson({
            check,
            fence,
          }),
        },
        { status: 400 },
      );
    }

    // Approved — atomically consume daily budget and create the escrow.
    const now = new Date();
    const endTime = new Date(now.getTime() + durationSeconds * 1000);

    const created = await db.$transaction(async (tx) => {
      // Consume daily budget (mirror Solidity dailySpent += amount).
      await tx.budgetFence.update({
        where: { id: fence.id },
        data: { dailySpent: fence.dailySpent + amount },
      });

      // Create the escrow with status=Streaming (RFC line 85).
      const e = await tx.escrow.create({
        data: {
          taskId,
          payerId: payer.id,
          payeeId: payee.id,
          totalAmount: amount,
          releasedAmount: 0n,
          scope,
          startTime: now,
          endTime,
          status: "Streaming",
          qualityScore: 0,
          completionPct: 0,
          mcpProofHash: null,
        },
      });

      const escrow: Escrow = {
        id: e.id,
        taskId: e.taskId,
        payerId: e.payerId,
        payeeId: e.payeeId,
        totalAmount: e.totalAmount,
        releasedAmount: e.releasedAmount,
        scope: e.scope,
        startTime: e.startTime,
        endTime: e.endTime,
        status: e.status as Escrow["status"],
        qualityScore: e.qualityScore,
        completionPct: e.completionPct,
        mcpProofHash: e.mcpProofHash,
      };

      return escrow;
    });

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        escrow: created,
        check,
        fenceAfter: {
          ...fence,
          dailySpent: fence.dailySpent + amount,
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
