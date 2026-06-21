import { NextResponse } from "next/server";
import {
  asAddress,
  asUintString,
  baseSepoliaContracts,
  baseSepoliaDefaults,
  baseTx,
  encodeBridgeMint,
  envelope,
  readMode,
} from "@/lib/ap2/v1-adapter";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = readMode(body.mode);
    const to = asAddress(body.to ?? body.payer, "to");
    const amount = asUintString(
      body.amount,
      "1000000000000000000000",
      "amount",
    );

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "admin.mintSAFC",
        { to, amount },
        () => baseTx(baseSepoliaContracts.ShadowAFC, encodeBridgeMint(to, amount)),
        "/api/seed",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
