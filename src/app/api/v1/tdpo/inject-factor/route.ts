import { NextResponse } from "next/server";
import {
  asUintString,
  baseSepoliaContracts,
  baseSepoliaDefaults,
  baseTx,
  bytes32FromTextOrHex,
  encodeInject,
  envelope,
  readMode,
} from "@/lib/ap2/v1-adapter";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const mode = readMode(body.mode);
    const cognitiveHash = bytes32FromTextOrHex(
      String(body.cognitiveHash ?? body.targetHash ?? body.target ?? ""),
      baseSepoliaDefaults.target,
    );
    const factor = asUintString(body.factor ?? body.evolutionFactor, baseSepoliaDefaults.evolutionFactor, "factor");

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "tdpo.injectFactor",
        { cognitiveHash, factor },
        () => baseTx(baseSepoliaContracts.TDPO_Pool, encodeInject(cognitiveHash, factor)),
        "/api/tdpo/inject-tax",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
