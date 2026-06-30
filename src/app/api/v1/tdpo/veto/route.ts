import { NextResponse } from "next/server";
import {
  baseSepoliaContracts,
  baseSepoliaDefaults,
  baseTx,
  bytes32FromTextOrHex,
  encodeVeto,
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

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "tdpo.veto",
        { cognitiveHash },
        () => baseTx(baseSepoliaContracts.TDPO_Pool, encodeVeto(cognitiveHash)),
        "/api/tdpo/list",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
