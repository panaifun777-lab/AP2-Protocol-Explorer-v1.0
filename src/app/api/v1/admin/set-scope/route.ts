import { NextResponse } from "next/server";
import {
  asAddress,
  baseSepoliaContracts,
  baseSepoliaDefaults,
  baseTx,
  bytes32FromTextOrHex,
  encodeSetScope,
  envelope,
  readMode,
} from "@/lib/ap2/v1-adapter";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = readMode(body.mode);
    const payer = asAddress(body.payer, "payer");
    const scopeHash = bytes32FromTextOrHex(
      String(body.scopeHash ?? body.scope ?? ""),
      baseSepoliaDefaults.scope,
    );

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "admin.setScope",
        { payer, scopeHash, allowed: true },
        () => baseTx(baseSepoliaContracts.BudgetFence, encodeSetScope(payer, scopeHash)),
        "/api/seed",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
