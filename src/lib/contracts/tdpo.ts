// ============================================================
// TDPO (Time-Delayed Pricing Oracle) — CognitiveTimeLock.sol mirror
// RFC v1.0 §5.1, lines 358-451
//
// Pure TypeScript simulation of the Solidity contract. All token
// arithmetic uses bigint to mirror uint256 semantics. No DB access.
// ============================================================

import {
  RFC_CONSTANTS,
  type Amount,
  type CognitiveAsset,
  type TDPOLockResult,
  type TDPORetroactiveResult,
} from "@/lib/types";

// ----- 1. isContrarianCognition -----
// RFC line 402: require(variance > 500 && mean < 30, "AP2: Not a contrarian cognition")
export function isContrarianCognition(
  mean: number,
  variance: number,
): boolean {
  return (
    variance > RFC_CONSTANTS.TDPO_VARIANCE_THRESHOLD &&
    mean < RFC_CONSTANTS.TDPO_MEAN_THRESHOLD
  );
}

// ----- 2. lockContrarianCognition -----
// Mirrors RFC lockContrarianCognition (lines 395-415).
// Returns a TDPOLockResult describing whether the cognition qualified
// for locking and, if so, the computed unlock timestamp.
export function lockContrarianCognition(
  cognitiveHash: string,
  creatorAvatarId: string,
  mean: number,
  variance: number,
  delaySeconds: number,
  nowMs: number = Date.now(),
): TDPOLockResult {
  if (!isContrarianCognition(mean, variance)) {
    return {
      cognitiveHash,
      locked: false,
      reason: "Not a contrarian cognition",
      unlockTimestamp: new Date(0),
    };
  }

  const lockTs = new Date(nowMs);
  const unlockTs = new Date(nowMs + delaySeconds * 1000);

  void creatorAvatarId; // creator is recorded by the API route, not here
  void lockTs;

  return {
    cognitiveHash,
    locked: true,
    reason: "Contrarian cognition locked — time-delay window opened",
    unlockTimestamp: unlockTs,
  };
}

// ----- 3. computeEvolutionFactor -----
// RFC line 430: evolutionFactor = futureMean / (initialMean + 1)
// Integer division (Solidity semantics). Future-proof: returns 0 if
// futureMean is non-positive (no evolution).
export function computeEvolutionFactor(
  initialMean: number,
  futureMean: number,
): number {
  if (futureMean <= 0) return 0;
  // Solidity uint256 division floors toward zero.
  return Math.floor(futureMean / (initialMean + 1));
}

// ----- 4. claimRetroactiveReward -----
// Mirrors RFC claimRetroactiveReward (lines 418-443).
//
// Pre-conditions (RFC lines 420-421):
//   require(now >= asset.unlockTimestamp, "AP2: Time-lock not expired")
//   require(!asset.isRetroactiveTriggered, "AP2: Already claimed")
//
// Then:
//   evolutionFactor = futureMean / (initialMean + 1)
//   if (evolutionFactor > 5 && citations > 100):
//     reward = (contrarianRewardPool * evolutionFactor) / 1000
//     reward = reward > contrarianRewardPool ? contrarianRewardPool : reward  // anti-over-issue
//     avatarReputation[creator] += evolutionFactor * 10
//     isRetroactiveTriggered = true
//
// NOTE: We allow the caller to pre-validate the time-lock & "already
// triggered" conditions; if they're violated we return a triggered=false
// result with a reason, so the UI can show what went wrong.
export function claimRetroactiveReward(
  asset: Pick<
    CognitiveAsset,
    | "cognitiveHash"
    | "initialMean"
    | "unlockTimestamp"
    | "isRetroactiveTriggered"
  >,
  futureMean: number,
  futureCitations: number,
  poolBalance: Amount,
  nowMs: number = Date.now(),
): TDPORetroactiveResult {
  // Pre-condition: time-lock expired
  if (nowMs < asset.unlockTimestamp.getTime()) {
    return {
      cognitiveHash: asset.cognitiveHash,
      triggered: false,
      evolutionFactor: 0,
      rewardAmount: 0n,
      reputationDelta: 0,
      reason: "AP2: Time-lock not expired",
    };
  }
  // Pre-condition: not already claimed
  if (asset.isRetroactiveTriggered) {
    return {
      cognitiveHash: asset.cognitiveHash,
      triggered: false,
      evolutionFactor: 0,
      rewardAmount: 0n,
      reputationDelta: 0,
      reason: "AP2: Already claimed",
    };
  }

  const evolutionFactor = computeEvolutionFactor(
    asset.initialMean,
    futureMean,
  );

  // RFC line 432: if (evolutionFactor > 5 && citations > 100)
  const triggered =
    evolutionFactor > RFC_CONSTANTS.TDPO_EVOLUTION_FACTOR_TRIGGER &&
    futureCitations > RFC_CONSTANTS.TDPO_CITATIONS_TRIGGER;

  if (!triggered) {
    return {
      cognitiveHash: asset.cognitiveHash,
      triggered: false,
      evolutionFactor,
      rewardAmount: 0n,
      reputationDelta: 0,
      reason: "Evolution factor or citations insufficient",
    };
  }

  // RFC line 434: reward = (contrarianRewardPool * evolutionFactor) / 1000
  // Bigint arithmetic to mirror Solidity uint256.
  let reward: bigint =
    (poolBalance * BigInt(evolutionFactor)) /
    BigInt(RFC_CONSTANTS.TDPO_REWARD_POOL_BPS);

  // RFC line 435: anti-over-issue guard
  // reward = reward > contrarianRewardPool ? contrarianRewardPool : reward
  if (reward > poolBalance) {
    reward = poolBalance;
  }

  // RFC line 438: avatarReputation[creator] += evolutionFactor * 10
  const reputationDelta = evolutionFactor * 10;

  return {
    cognitiveHash: asset.cognitiveHash,
    triggered: true,
    evolutionFactor,
    rewardAmount: reward,
    reputationDelta,
    reason: "Retroactive compensation triggered",
  };
}

// ----- 5. injectMediocrityTax -----
// RFC lines 446-449: contrarianRewardPool += amount
// (In the RFC the tax is 0.1% of high-freq low-cognition micro-payments;
// here we accept an explicit tax amount and add it to the pool.)
export function injectMediocrityTax(
  poolBalance: Amount,
  taxAmount: Amount,
): Amount {
  if (taxAmount < 0n) {
    throw new Error("AP2: tax amount cannot be negative");
  }
  return poolBalance + taxAmount;
}
