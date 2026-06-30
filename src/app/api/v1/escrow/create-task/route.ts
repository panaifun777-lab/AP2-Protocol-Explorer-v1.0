import { NextResponse } from "next/server";
import {
  asAddress,
  asUintString,
  baseSepoliaContracts,
  baseSepoliaDefaults,
  baseTx,
  bytes32FromTextOrHex,
  encodeCreateTask,
  envelope,
  readMode,
} from "@/lib/ap2/v1-adapter";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = readMode(body.mode);
    const payee = asAddress(body.payee ?? body.payeeAddress, "payee");
    const baseAmount = asUintString(body.baseAmount, baseSepoliaDefaults.baseAmount, "baseAmount");
    const optionAmount = asUintString(body.optionAmount, baseSepoliaDefaults.optionAmount, "optionAmount");
    const durationSeconds = asUintString(
      body.durationSeconds,
      baseSepoliaDefaults.durationSeconds,
      "durationSeconds",
    );
    const targetHash = bytes32FromTextOrHex(
      String(body.targetHash ?? body.target ?? ""),
      baseSepoliaDefaults.target,
    );
    const scopeHash = bytes32FromTextOrHex(
      String(body.scopeHash ?? body.scope ?? ""),
      baseSepoliaDefaults.scope,
    );

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "escrow.createTask",
        { payee, baseAmount, optionAmount, durationSeconds, targetHash, scopeHash },
        () =>
          baseTx(
            baseSepoliaContracts.AP2Escrow,
            encodeCreateTask({
              payee,
              baseAmount,
              optionAmount,
              durationSeconds,
              targetHash,
              scopeHash,
            }),
          ),
        "/api/escrow/lock-funds",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
