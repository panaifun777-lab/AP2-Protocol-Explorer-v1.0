import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  serializeForJson,
  toTokenUnits,
  type BudgetFence,
  type ConsciousnessRecord,
  type CognitiveAsset,
  type PhysicsIntent,
  type CDSToken,
  type Amount,
} from "@/lib/types";
import {
  TEST_VECTOR_MAP,
  detectMoneyLaunderingPure,
  type TestVectorRunResult,
  type ScenarioResult,
} from "@/lib/test-vectors";
import { checkAndConsume, verifyAndSettle } from "@/lib/contracts/escrow";
import {
  lockContrarianCognition,
  claimRetroactiveReward,
} from "@/lib/contracts/tdpo";
import {
  registerConsciousness,
  migrateConsciousness,
  asRegistryView,
} from "@/lib/contracts/cip";
import { soulTransfer, transferFrom, mint as cdsMint } from "@/lib/contracts/cds";
import {
  calculateEdgeWeight,
} from "@/lib/contracts/cognitive-dag";
import {
  bridgeIntent,
  submitPhysicsProof,
  PCMGError,
} from "@/lib/contracts/pcmg";

// ============================================================
// POST /api/tests/run
// Body: { vectorId: "TV1" | "TV2" | ... | "TV10" }
//
// Runs a single RFC test vector by calling the matching pure
// contract logic directly (NO HTTP fetches, NO DB writes during
// the test itself — fully deterministic). Persists a TestRun row
// for history. Returns a TestVectorRunResult.
// ============================================================

interface RunScenarioOutcome {
  passed: boolean;
  actual: Record<string, unknown>;
  errorMessage?: string;
}

// ---------- TV1: BudgetFence Scope Lock Violation ----------
function runTV1(): RunScenarioOutcome {
  const fence: BudgetFence = {
    id: "fence_tv1",
    avatarId: "avatar_lawyer",
    dailyCap: 1_000_000_000n, // 1000 USDC
    dailySpent: 0n,
    allowedScopes: ["legal", "compliance"],
    decayingThreshold: 10_000_000n, // 10 USDC
    authDecayFactor: 1.0,
    lastResetAt: new Date(),
  };
  const amount: Amount = toTokenUnits(50); // 50 USDC
  const scope = "medical_diagnosis";

  const result = checkAndConsume(fence, amount, scope);

  const passed =
    result.status === "REJECT_SCOPE" && result.triggeredDecayingAuth === true;

  return {
    passed,
    actual: {
      status: result.status,
      approved: result.approved,
      triggeredDecayingAuth: result.triggeredDecayingAuth,
      reason: result.reason,
    },
    errorMessage: passed
      ? undefined
      : `Expected REJECT_SCOPE + triggeredDecayingAuth=true, got status=${result.status} triggeredDecayingAuth=${result.triggeredDecayingAuth}`,
  };
}

// ---------- TV2: Escrow overpayment clawback ----------
function runTV2(): RunScenarioOutcome {
  // totalAmount=1000 USDC, releasedAmount=900 USDC, completionPct=80
  // finalPayout = 1000*80/100 = 800; diff = 900-800 = 100 → Disputed
  const escrow = {
    taskId: "0xTask_HiveMind_Alpha",
    totalAmount: toTokenUnits(1000),
    releasedAmount: toTokenUnits(900),
  };
  const result = verifyAndSettle(escrow, 80, 0);

  const expectedClawback = toTokenUnits(100);
  const passed =
    result.status === "Disputed" && result.clawbackRequired === expectedClawback;

  return {
    passed,
    actual: {
      status: result.status,
      success: result.success,
      finalPayout: result.finalPayout.toString(),
      alreadyReleased: result.alreadyReleased.toString(),
      clawbackRequired: result.clawbackRequired.toString(),
    },
    errorMessage: passed
      ? undefined
      : `Expected Disputed + clawbackRequired=${expectedClawback.toString()}, got status=${result.status} clawbackRequired=${result.clawbackRequired.toString()}`,
  };
}

// ---------- TV3: CIP migration threshold variance (3 scenarios) ----------
function runTV3Scenarios(): ScenarioResult[] {
  const baseRecord: ConsciousnessRecord = registerConsciousness(
    "0xEntity_Prophet_XDP",
    "0xRoot_Original",
    "avatar_prophet_old",
  );

  const scenarios: {
    id: string;
    label: string;
    matchScore: number;
    expectedOutcome: string;
    expectThrow?: boolean;
    expectedErrorSubstr?: string;
    expectedFields?: Record<string, unknown>;
  }[] = [
    {
      id: "TV3-a",
      label: "matchScore=9250 (92.5% — pure inheritance)",
      matchScore: 9250,
      expectedOutcome: "PURE_INHERITANCE",
      expectedFields: { requiresLineageSplit: false },
    },
    {
      id: "TV3-b",
      label: "matchScore=8499 (84.99% — fusion band, lineage split)",
      matchScore: 8499,
      expectedOutcome: "FUSION_EMERGENCE",
      expectedFields: { requiresLineageSplit: true },
    },
    {
      id: "TV3-c",
      label: "matchScore=10500 (>BPS_MAX — invalid, reverts)",
      matchScore: 10500,
      expectedOutcome: "THROW",
      expectThrow: true,
      expectedErrorSubstr: "CIP: matchScore must be in [0, 10000]",
    },
  ];

  return scenarios.map((s) => {
    // Clone base record so mutations don't leak between scenarios.
    const record: ConsciousnessRecord = {
      ...baseRecord,
      currentActiveAddressId: baseRecord.currentActiveAddressId,
      creationTimestamp: baseRecord.creationTimestamp,
    };

    try {
      const result = migrateConsciousness(
        record,
        "avatar_prophet_new",
        s.matchScore,
      );

      if (s.expectThrow) {
        return {
          scenarioId: s.id,
          label: s.label,
          passed: false,
          actual: { outcome: result.outcome, didThrow: false },
          errorMessage: `Expected throw with "${s.expectedErrorSubstr}", but no throw occurred. Got outcome=${result.outcome}.`,
        };
      }

      let passed = result.outcome === s.expectedOutcome;
      if (passed && s.expectedFields) {
        if (
          s.expectedFields.requiresLineageSplit !== undefined &&
          result.requiresLineageSplit !==
            s.expectedFields.requiresLineageSplit
        ) {
          passed = false;
        }
      }

      return {
        scenarioId: s.id,
        label: s.label,
        passed,
        actual: {
          outcome: result.outcome,
          requiresLineageSplit: result.requiresLineageSplit,
          matchScore: result.matchScore,
          reason: result.reason,
          recordMutated: record.isDeceasedOrMigrated,
        },
        errorMessage: passed
          ? undefined
          : `Expected outcome=${s.expectedOutcome}, got ${result.outcome} (requiresLineageSplit=${result.requiresLineageSplit}).`,
      };
    } catch (e) {
      const msg = (e as Error).message;
      const threwMatch =
        s.expectThrow && msg.includes(s.expectedErrorSubstr ?? "");
      return {
        scenarioId: s.id,
        label: s.label,
        passed: threwMatch,
        actual: { didThrow: true, errorMessage: msg },
        errorMessage: threwMatch
          ? undefined
          : `Unexpected throw: "${msg}" (expected "${s.expectedErrorSubstr}").`,
      };
    }
  });
}

// ---------- TV4: CDS SBT soulbound enforcement (2 scenarios) ----------
function runTV4Scenarios(): ScenarioResult[] {
  const results: ScenarioResult[] = [];

  // ---- Scenario A: transferFrom (malicious) → throws ----
  try {
    transferFrom("avatar_owner", "0xHacker_Address", 101);
    results.push({
      scenarioId: "TV4-a",
      label: "transferFrom (malicious manual transfer)",
      passed: false,
      actual: { didThrow: false },
      errorMessage:
        "Expected throw 'CDS: Soulbound token cannot be manually transferred...', but no throw occurred.",
    });
  } catch (e) {
    const msg = (e as Error).message;
    const expected =
      "CDS: Soulbound token cannot be manually transferred. Only Consciousness Migration allowed.";
    const passed = msg === expected;
    results.push({
      scenarioId: "TV4-a",
      label: "transferFrom (malicious manual transfer)",
      passed,
      actual: { didThrow: true, errorMessage: msg },
      errorMessage: passed
        ? undefined
        : `Throw message mismatch. Expected "${expected}", got "${msg}".`,
    });
  }

  // ---- Scenario B: soulTransfer via CIP → success ----
  // Build a CDS token bound to a CIP record, then soulTransfer it.
  const record: ConsciousnessRecord = registerConsciousness(
    "0xEntity_Test_CDS",
    "0xRoot_Test",
    "avatar_old_carrier",
  );
  const registry = asRegistryView(record);
  const originalToken: CDSToken = cdsMint(
    registry,
    "0xEntity_Test_CDS",
    101,
    "0xMetadataHash_Original",
  );
  const newOwnerId = "avatar_new_carrier";
  const transferred = soulTransfer(originalToken, newOwnerId);

  const tokenIdUnchanged = transferred.tokenId === originalToken.tokenId;
  const metadataHashUnchanged =
    transferred.metadataHash === originalToken.metadataHash;
  const entityIdUnchanged = transferred.entityId === originalToken.entityId;
  const ownerRotated =
    transferred.ownerAvatarId === newOwnerId &&
    transferred.ownerAvatarId !== originalToken.ownerAvatarId;
  const isStillSoulbound = transferred.isSoulbound === true;

  const passed =
    tokenIdUnchanged &&
    metadataHashUnchanged &&
    entityIdUnchanged &&
    ownerRotated &&
    isStillSoulbound;

  results.push({
    scenarioId: "TV4-b",
    label: "soulTransfer via CIP (consciousness migration)",
    passed,
    actual: {
      tokenId: transferred.tokenId,
      tokenIdUnchanged,
      metadataHashUnchanged,
      entityIdUnchanged,
      ownerRotated,
      isStillSoulbound,
      oldOwner: originalToken.ownerAvatarId,
      newOwner: transferred.ownerAvatarId,
    },
    errorMessage: passed
      ? undefined
      : `soulTransfer invariants not preserved. tokenIdUnchanged=${tokenIdUnchanged} metadataHashUnchanged=${metadataHashUnchanged} ownerRotated=${ownerRotated} isStillSoulbound=${isStillSoulbound}.`,
  });

  return results;
}

// ---------- TV5: TDPO non-contrarian rejection ----------
function runTV5(): RunScenarioOutcome {
  const result = lockContrarianCognition(
    "0xNonContrarian_Hash",
    "avatar_tester",
    50,
    200,
    86400,
  );

  const passed =
    result.locked === false &&
    result.reason === "Not a contrarian cognition";

  return {
    passed,
    actual: {
      locked: result.locked,
      reason: result.reason,
      unlockTimestamp: result.unlockTimestamp.toISOString(),
    },
    errorMessage: passed
      ? undefined
      : `Expected locked=false + reason='Not a contrarian cognition', got locked=${result.locked} reason='${result.reason}'.`,
  };
}

// ---------- TV6: TDPO retroactive trigger ----------
function runTV6(): RunScenarioOutcome {
  const nowMs = Date.now();
  const pastUnlock = new Date(nowMs - 60_000); // 1 min ago — time-lock expired
  const asset: CognitiveAsset = {
    id: "asset_tv6",
    cognitiveHash: "0xProphet_XDP_Hash",
    creatorAvatarId: "avatar_prophet",
    initialVariance: 850,
    initialMean: 15,
    lockTimestamp: new Date(nowMs - 120_000),
    unlockTimestamp: pastUnlock,
    isRetroactiveTriggered: false,
    rewardAmount: 0n,
    futureMean: 0,
    futureCitations: 0,
    evolutionFactor: 0,
  };

  const poolBalance = toTokenUnits(1000); // 1000 USDC
  const result = claimRetroactiveReward(
    asset,
    950, // futureMean
    5000, // futureCitations
    poolBalance,
    nowMs,
  );

  const expectedEvolution = Math.floor(950 / (15 + 1)); // = 59
  const passed =
    result.triggered === true && result.evolutionFactor === expectedEvolution;

  return {
    passed,
    actual: {
      triggered: result.triggered,
      evolutionFactor: result.evolutionFactor,
      rewardAmount: result.rewardAmount.toString(),
      reputationDelta: result.reputationDelta,
      reason: result.reason,
    },
    errorMessage: passed
      ? undefined
      : `Expected triggered=true + evolutionFactor=${expectedEvolution}, got triggered=${result.triggered} evolutionFactor=${result.evolutionFactor} reason='${result.reason}'.`,
  };
}

// ---------- TV7: PCMG forged proof → 400 ----------
function runTV7(): RunScenarioOutcome {
  const intent: PhysicsIntent = bridgeIntent({
    intentHash: "0xPCMG_TV7_Intent",
    creatorAvatarId: "avatar_creator",
    amountUsdc: 5,
    physicsConstraints: '{"metric":"test"}',
    executorId: "avatar_executor",
    deadlineSeconds: 600,
  });

  try {
    submitPhysicsProof(intent, { fidelity: 6500, resonance: 9000 });
    return {
      passed: false,
      actual: { didThrow: false },
      errorMessage:
        "Expected PCMGError (400, 'Physical proof invalid or low fidelity'), but no throw occurred.",
    };
  } catch (e) {
    if (!(e instanceof PCMGError)) {
      return {
        passed: false,
        actual: {
          didThrow: true,
          errorType: (e as Error).constructor.name,
        },
        errorMessage: `Expected PCMGError, got ${(e as Error).constructor.name}: ${(e as Error).message}`,
      };
    }
    const expectedMsg = "PCMG: Physical proof invalid or low fidelity";
    const passed = e.message === expectedMsg && e.statusCode === 400;
    return {
      passed,
      actual: {
        didThrow: true,
        errorType: "PCMGError",
        statusCode: e.statusCode,
        message: e.message,
        statusAfterRevert: intent.status, // should be "Executing" (rolled back)
      },
      errorMessage: passed
        ? undefined
        : `Expected PCMGError 400 '${expectedMsg}', got ${e.statusCode} '${e.message}'.`,
    };
  }
}

// ---------- TV8: PCMG emotional dissonance → Slashed ----------
function runTV8(): RunScenarioOutcome {
  const intent: PhysicsIntent = bridgeIntent({
    intentHash: "0xPCMG_TV8_Intent",
    creatorAvatarId: "avatar_creator",
    amountUsdc: 5,
    physicsConstraints: '{"metric":"test"}',
    executorId: "avatar_executor",
    deadlineSeconds: 600,
  });

  const result = submitPhysicsProof(intent, {
    fidelity: 9200,
    resonance: 3000,
  });

  const passed =
    result.status === "Slashed" &&
    result.slashed === true &&
    result.rewardReleased === 0n;

  return {
    passed,
    actual: {
      status: result.status,
      slashed: result.slashed,
      slashReason: result.slashReason,
      fidelityScore: result.fidelityScore,
      resonanceScore: result.resonanceScore,
      rewardReleased: result.rewardReleased.toString(),
      physicalValid: result.physicalValid,
      emotionalResonant: result.emotionalResonant,
    },
    errorMessage: passed
      ? undefined
      : `Expected status=Slashed + slashed=true + rewardReleased=0, got status=${result.status} slashed=${result.slashed} rewardReleased=${result.rewardReleased.toString()}.`,
  };
}

// ---------- TV9: CPDF black-hole ----------
function runTV9(): RunScenarioOutcome {
  const result = calculateEdgeWeight(
    "0xEntity_Test",
    "0xShard_Low_Similarity",
    5000, // qEceScore
    0.15, // similarity
  );

  const passed =
    result.finalWeight === 0 && result.isBlackHole === true;

  return {
    passed,
    actual: {
      nodeId: result.nodeId,
      similarity: result.similarity,
      eceScore: result.eceScore,
      decayFactor: result.decayFactor,
      finalWeight: result.finalWeight,
      isBlackHole: result.isBlackHole,
    },
    errorMessage: passed
      ? undefined
      : `Expected finalWeight=0 + isBlackHole=true, got finalWeight=${result.finalWeight} isBlackHole=${result.isBlackHole}.`,
  };
}

// ---------- TV10: Cognitive money-laundering ----------
function runTV10(): RunScenarioOutcome {
  const result = detectMoneyLaunderingPure({
    shardCount: 12,
    avgEceScore: 500,
    avgSimilarity: 0.15,
  });

  const passed = result.suspicious === true;

  return {
    passed,
    actual: {
      suspicious: result.suspicious,
      reason: result.reason,
      inputs: { shardCount: 12, avgEceScore: 500, avgSimilarity: 0.15 },
    },
    errorMessage: passed
      ? undefined
      : `Expected suspicious=true, got suspicious=${result.suspicious}.`,
  };
}

// ============================================================
// Dispatcher: maps vectorId → runner
// ============================================================
function runVector(vectorId: string): TestVectorRunResult {
  const vector = TEST_VECTOR_MAP[vectorId];
  if (!vector) {
    return {
      vectorId,
      rfcCase: "UNKNOWN",
      module: "escrow",
      passed: false,
      actual: {},
      expected: {},
      errorMessage: `Unknown vectorId: ${vectorId}`,
      executedAt: new Date().toISOString(),
    };
  }

  const executedAt = new Date().toISOString();
  const module_ = vector.module;

  // Multi-scenario vectors (TV3 / TV4)
  if (vector.scenarios && vector.scenarios.length > 0) {
    let scenarioResults: ScenarioResult[];
    if (vectorId === "TV3") {
      scenarioResults = runTV3Scenarios();
    } else if (vectorId === "TV4") {
      scenarioResults = runTV4Scenarios();
    } else {
      scenarioResults = [];
    }
    const allPassed = scenarioResults.every((s) => s.passed);
    return {
      vectorId,
      rfcCase: vector.vectorId,
      module: module_,
      passed: allPassed,
      actual: {
        scenarioResults: scenarioResults.map((s) => ({
          scenarioId: s.scenarioId,
          label: s.label,
          passed: s.passed,
          actual: s.actual,
          errorMessage: s.errorMessage,
        })),
      },
      expected: vector.expected,
      errorMessage: allPassed
        ? undefined
        : `${scenarioResults.filter((s) => !s.passed).length}/${scenarioResults.length} scenario(s) failed`,
      scenarioResults,
      executedAt,
    };
  }

  // Single-scenario vectors
  let outcome: RunScenarioOutcome;
  switch (vectorId) {
    case "TV1":
      outcome = runTV1();
      break;
    case "TV2":
      outcome = runTV2();
      break;
    case "TV5":
      outcome = runTV5();
      break;
    case "TV6":
      outcome = runTV6();
      break;
    case "TV7":
      outcome = runTV7();
      break;
    case "TV8":
      outcome = runTV8();
      break;
    case "TV9":
      outcome = runTV9();
      break;
    case "TV10":
      outcome = runTV10();
      break;
    default:
      outcome = {
        passed: false,
        actual: {},
        errorMessage: `No runner implemented for ${vectorId}`,
      };
  }

  return {
    vectorId,
    rfcCase: vector.vectorId,
    module: module_,
    passed: outcome.passed,
    actual: outcome.actual,
    expected: vector.expected,
    errorMessage: outcome.errorMessage,
    executedAt,
  };
}

// ============================================================
// POST handler
// ============================================================
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { vectorId?: string };
    const vectorId = (body.vectorId ?? "").trim().toUpperCase();

    if (!vectorId) {
      return NextResponse.json(
        { ok: false, error: "vectorId is required (e.g. 'TV1')" },
        { status: 400 },
      );
    }
    if (!TEST_VECTOR_MAP[vectorId]) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unknown vectorId: ${vectorId}. Valid: ${Object.keys(TEST_VECTOR_MAP).join(", ")}`,
        },
        { status: 404 },
      );
    }

    const result = runVector(vectorId);
    const vector = TEST_VECTOR_MAP[vectorId];

    // Persist TestRun row for history (non-blocking on the test outcome).
    try {
      await db.testRun.create({
        data: {
          vectorId: result.vectorId,
          module: result.module,
          input: JSON.stringify(vector.inputs),
          expectedResult: JSON.stringify(vector.expected),
          actualResult: JSON.stringify(serializeForJson(result.actual)),
          passed: result.passed,
          errorMessage: result.errorMessage ?? null,
          executedAt: new Date(result.executedAt),
        },
      });
    } catch (dbErr) {
      // DB failure must NOT affect the test result; just log.
      console.error("[/api/tests/run] TestRun persistence failed:", dbErr);
    }

    return NextResponse.json({
      ok: true,
      data: serializeForJson(result),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
