import { NextResponse } from "next/server";
import {
  asUintString,
  baseSepoliaContracts,
  baseTx,
  encodeWithdraw,
  envelope,
  readMode,
} from "@/lib/ap2/v1-adapter";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = readMode(body.mode);
    const taskId = asUintString(body.taskId, "0", "taskId");

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "escrow.withdraw",
        { taskId },
        () => baseTx(baseSepoliaContracts.AP2Escrow, encodeWithdraw(taskId)),
        "/api/escrow/stream-release",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
