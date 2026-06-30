import { NextResponse } from "next/server";
import {
  asUintString,
  baseSepoliaContracts,
  baseSepoliaDefaults,
  baseTx,
  bytes32FromTextOrHex,
  encodeLock,
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
    const durationSeconds = asUintString(
      body.durationSeconds,
      baseSepoliaDefaults.tdpoDurationSeconds,
      "durationSeconds",
    );

    return NextResponse.json({
      ok: true,
      data: envelope(
        mode,
        "tdpo.lockContrarian",
        { cognitiveHash, durationSeconds },
        () => baseTx(baseSepoliaContracts.TDPO_Pool, encodeLock(cognitiveHash, durationSeconds)),
        "/api/tdpo/lock",
      ),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
