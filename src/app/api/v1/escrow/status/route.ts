import { NextResponse } from "next/server";
import { baseSepoliaContracts } from "@/lib/ap2/v1-adapter";
import { baseSepoliaClient, escrowReadAbi } from "@/lib/ap2/chain-read";

const TASK_STATUS = ["Active", "Completed", "Cancelled"] as const;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawTaskId = searchParams.get("taskId");
    const nextTaskId = await baseSepoliaClient.readContract({
      address: baseSepoliaContracts.AP2Escrow,
      abi: escrowReadAbi,
      functionName: "nextTaskId",
    });

    if (rawTaskId === null || rawTaskId === "") {
      return NextResponse.json({
        ok: true,
        data: {
          nextTaskId: nextTaskId.toString(),
        },
      });
    }

    if (!/^[0-9]+$/.test(rawTaskId)) {
      return NextResponse.json(
        { ok: false, error: "taskId must be an unsigned integer" },
        { status: 400 },
      );
    }

    const task = await baseSepoliaClient.readContract({
      address: baseSepoliaContracts.AP2Escrow,
      abi: escrowReadAbi,
      functionName: "tasks",
      args: [BigInt(rawTaskId)],
    });
    const [
      payer,
      payee,
      baseAmount,
      optionAmount,
      startTime,
      duration,
      withdrawn,
      targetHash,
      scopeHash,
      status,
    ] = task;

    return NextResponse.json({
      ok: true,
      data: {
        taskId: rawTaskId,
        payer,
        payee,
        baseAmount: baseAmount.toString(),
        optionAmount: optionAmount.toString(),
        startTime: startTime.toString(),
        duration: duration.toString(),
        withdrawn: withdrawn.toString(),
        targetHash,
        scopeHash,
        status: TASK_STATUS[status] ?? `Unknown(${status})`,
        nextTaskId: nextTaskId.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
