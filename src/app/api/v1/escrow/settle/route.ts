import { NextResponse } from "next/server";
import {
  asUintString,
  baseSepoliaContracts,
  baseSepoliaDefaults,
  baseTx,
  encodeSettle,
  envelope,
  readMode,
} from "@/lib/ap2/v1-adapter";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = readMode(body.mode);
    const taskId = asUintString(body.taskId, "0", "taskId");
    const qualityScore = asUintString(
      body.qualityScore,
      baseSepoliaDefaults.qualityScore,
      "qualityScore",
    );

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "escrow.settle",
        { taskId, qualityScore },
        () => baseTx(baseSepoliaContracts.AP2Escrow, encodeSettle(taskId, qualityScore)),
        "/api/escrow/verify-settle",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
