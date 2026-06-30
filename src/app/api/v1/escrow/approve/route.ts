import { NextResponse } from "next/server";
import {
  asUintString,
  baseSepoliaContracts,
  baseTx,
  encodeApprove,
  envelope,
  readMode,
} from "@/lib/ap2/v1-adapter";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = readMode(body.mode);
    const amount = asUintString(body.amount, "110000000000000000000", "amount");

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "escrow.approve",
        { amount },
        () => baseTx(baseSepoliaContracts.ShadowAFC, encodeApprove(amount)),
        "/api/escrow/lock-funds",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
