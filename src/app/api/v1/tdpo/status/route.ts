import { NextResponse } from "next/server";
import { baseSepoliaContracts, baseSepoliaDefaults, bytes32FromTextOrHex } from "@/lib/ap2/v1-adapter";
import { baseSepoliaClient, tdpoReadAbi } from "@/lib/ap2/chain-read";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cognitiveHash = bytes32FromTextOrHex(
      searchParams.get("cognitiveHash") || searchParams.get("target") || "",
      baseSepoliaDefaults.target,
    );

    const [deposit, vetoed, challengeEnd, lock] = await Promise.all([
      baseSepoliaClient.readContract({
        address: baseSepoliaContracts.TDPO_Pool,
        abi: tdpoReadAbi,
        functionName: "hashDeposits",
        args: [cognitiveHash],
      }),
      baseSepoliaClient.readContract({
        address: baseSepoliaContracts.TDPO_Pool,
        abi: tdpoReadAbi,
        functionName: "isVetoed",
        args: [cognitiveHash],
      }),
      baseSepoliaClient.readContract({
        address: baseSepoliaContracts.TDPO_Pool,
        abi: tdpoReadAbi,
        functionName: "challengeEndTimes",
        args: [cognitiveHash],
      }),
      baseSepoliaClient.readContract({
        address: baseSepoliaContracts.TDPO_Pool,
        abi: tdpoReadAbi,
        functionName: "locks",
        args: [cognitiveHash],
      }),
    ]);
    const [creator, lockTime, unlockTime, evolutionFactor, claimed] = lock;

    return NextResponse.json({
      ok: true,
      data: {
        cognitiveHash,
        deposit: deposit.toString(),
        isVetoed: vetoed,
        challengeEnd: challengeEnd.toString(),
        lock: {
          creator,
          lockTime: lockTime.toString(),
          unlockTime: unlockTime.toString(),
          evolutionFactor: evolutionFactor.toString(),
          claimed,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
