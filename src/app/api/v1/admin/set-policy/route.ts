import { NextResponse } from "next/server";
import {
  asAddress,
  asUintString,
  baseSepoliaContracts,
  baseSepoliaDefaults,
  baseTx,
  encodeSetPolicy,
  envelope,
  readMode,
} from "@/lib/ap2/v1-adapter";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = readMode(body.mode);
    const payer = asAddress(body.payer, "payer");
    const dailyCap = asUintString(body.dailyCap, "1000000000000000000000", "dailyCap");

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "admin.setPolicy",
        { payer, dailyCap, enabled: true },
        () => baseTx(baseSepoliaContracts.BudgetFence, encodeSetPolicy(payer, dailyCap)),
        "/api/seed",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
