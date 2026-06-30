// ============================================================
// AA2P Protocol v1.0 — RFC Test Vectors (§三 + §5.2 §四)
// Pure structured data describing each RFC test vector and how
// to assert its expected outcome against the live TypeScript
// contract mirrors in `src/lib/contracts/*`.
//
// The runner (`/api/tests/run`) consumes `runSpec.target` to
// dispatch to the right pure function and `expected` to assert.
// No DB writes required — every vector is a pure-logic check.
// ============================================================

import type {
  Amount,
  BudgetFenceStatus,
  EscrowStatus,
  CIPMigrationOutcome,
  PhysicsIntentStatus,
} from "@/lib/types";

// ----- Test vector module union -----
export type TestVectorModule =
  | "escrow"
  | "tdpo"
  | "cip"
  | "cds"
  | "dag"
  | "pcmg";

// ----- Per-scenario spec (for TV3/TV4 which have multiple cases) -----
export interface TestVectorScenario {
  id: string;
  label: string;
  inputs: Record<string, unknown>;
  expected: {
    outcome: string; // e.g. "PURE_INHERITANCE", "THROW", "Disputed", "Slashed", "BLACK_HOLE"
    expectedError?: string; // substring match if outcome === "THROW"
    expectedFields?: Record<string, unknown>; // additional field-level assertions
  };
}

// ----- Run target union — names the pure function to invoke -----
export type RunTarget =
  | "checkAndConsume"
  | "verifyAndSettle"
  | "migrateConsciousness"
  | "transferFrom"
  | "soulTransfer"
  | "lockContrarianCognition"
  | "claimRetroactiveReward"
  | "submitPhysicsProof"
  | "calculateEdgeWeight"
  | "detectMoneyLaunderingPure";

export interface RunSpec {
  target: RunTarget;
  description: string;
}

// ----- Test vector definition -----
export interface TestVector {
  id: string; // "TV1".."TV10"
  vectorId: string; // RFC test_case, e.g. "Scope_Lock_Violation"
  module: TestVectorModule;
  title: string;
  description: string;
  rfcRef: string;
  inputs: Record<string, unknown>;
  initialState?: Record<string, unknown>;
  expected: {
    outcome: string; // top-level outcome the runner asserts
    expectedError?: string;
    expectedFields?: Record<string, unknown>;
  };
  apiEndpoint: string;
  apiMethod: "POST" | "GET";
  runSpec: RunSpec;
  scenarios?: TestVectorScenario[]; // for TV3 / TV4
}

// ============================================================
// Helper: pure money-laundering heuristic (no DB).
// Mirrors `detectMoneyLaundering` in cognitive-dag.ts but takes
// the precomputed stats directly. RFC §5.1 / CPDF.
//   suspicious = shardCount > 10 && avgEceScore < 2000 && avgSimilarity < 0.3
// ============================================================
export function detectMoneyLaunderingPure(stats: {
  shardCount: number;
  avgEceScore: number;
  avgSimilarity: number;
}): {
  suspicious: boolean;
  reason?: string;
} {
  const suspicious =
    stats.shardCount > 10 &&
    stats.avgEceScore < 2000 &&
    stats.avgSimilarity < 0.3;
  return {
    suspicious,
    reason: suspicious
      ? "Cognitive money-laundering pattern detected"
      : undefined,
  };
}

// ============================================================
// The 10 RFC test vectors
// ============================================================
export const TEST_VECTORS: TestVector[] = [
  // -----------------------------------------------------------
  // TV1: BudgetFence Scope Lock + Decaying Auth interception
  // RFC §三, lines 276-293
  // -----------------------------------------------------------
  {
    id: "TV1",
    vectorId: "Scope_Lock_Violation",
    module: "escrow",
    title: "BudgetFence Scope Lock Violation",
    description:
      "Sub-agent 'lawyer' attempts to spend 50 USDC on scope 'medical_diagnosis' which is NOT in the fence's allowedScopes [legal, compliance]. Contract MUST reject with REJECT_SCOPE and trigger the Decaying-Auth fallback (human master signature required).",
    rfcRef: "RFC §三 / Test Vector 1 (lines 276-293)",
    inputs: {
      subAgent: "0xAgent_Lawyer_01",
      amount: "50000000", // 50 USDC in 6-decimals
      scope: "medical_diagnosis",
    },
    initialState: {
      dailyCap: "1000000000", // 1000 USDC
      allowedScopes: ["legal", "compliance"],
      decayingThreshold: "10000000", // 10 USDC
      authDecayFactor: 1.0,
      dailySpent: "0",
    },
    expected: {
      outcome: "REJECT_SCOPE",
      expectedFields: {
        triggeredDecayingAuth: true,
        approved: false,
      },
    },
    apiEndpoint: "/api/escrow/lock-funds",
    apiMethod: "POST",
    runSpec: {
      target: "checkAndConsume",
      description:
        "Construct an in-memory BudgetFence with allowedScopes=[legal,compliance] and call checkAndConsume(fence, 50_000_000n, 'medical_diagnosis'). Assert status==='REJECT_SCOPE' && triggeredDecayingAuth===true.",
    },
  },

  // -----------------------------------------------------------
  // TV2: AP2Escrow streaming overpayment clawback (race condition)
  // RFC §三, lines 295-317
  // -----------------------------------------------------------
  {
    id: "TV2",
    vectorId: "Stream_Overpayment_Clawback",
    module: "escrow",
    title: "Escrow Stream Overpayment Clawback",
    description:
      "Network delay caused streaming to release 90% of funds, but MCP final verification only credits 80% completion. Contract MUST enter Disputed state and require a 100 USDC clawback of the overpayment.",
    rfcRef: "RFC §三 / Test Vector 2 (lines 295-317)",
    inputs: {
      taskId: "0xTask_HiveMind_Alpha",
      action: "verifyAndSettle",
      mcpProof: "0xZK_Valid_Proof",
      completionPct: 80,
    },
    initialState: {
      totalAmount: 1000, // 1000 USDC
      releasedAmount: 900, // 900 USDC already streamed
    },
    expected: {
      outcome: "Disputed",
      expectedFields: {
        clawbackRequired: "100000000", // 100 USDC
        success: false,
      },
    },
    apiEndpoint: "/api/escrow/verify-settle",
    apiMethod: "POST",
    runSpec: {
      target: "verifyAndSettle",
      description:
        "Construct in-memory escrow {totalAmount: 1_000_000_000n, releasedAmount: 900_000_000n} and call verifyAndSettle(escrow, 80, 0). Assert status==='Disputed' && clawbackRequired===100_000_000n.",
    },
  },

  // -----------------------------------------------------------
  // TV3: CIP migration threshold variance (3 sub-scenarios)
  // RFC §5.2 / §四 Test Vector 1, lines 718-750
  // -----------------------------------------------------------
  {
    id: "TV3",
    vectorId: "CIP_Migration_Threshold_Variance",
    module: "cip",
    title: "CIP Migration Threshold Variance (3 Scenarios)",
    description:
      "Consciousness migration threshold edge cases. RFC test vector expects 9250→SUCCESS, 8499→REVERT, 10500→SUCCESS_WITH_FLAG. The live implementation uses the refined three-zone CIP_Lineage.sol model (85% pure / 60% min / <60% reject), so 8499 falls in FUSION_EMERGENCE band and 10500 is rejected (out of BPS range [0,10000]). The runner asserts against the refined model.",
    rfcRef: "RFC §5.2 §四 / Test Vector 1 (lines 718-750)",
    inputs: {
      entityId: "0xEntity_Prophet_XDP",
      newAddress: "0xNew_Quantum_Server",
    },
    initialState: {
      oldCognitiveRoot: "0xRoot_Original",
      pureThreshold: 8500,
      minThreshold: 6000,
    },
    expected: {
      outcome: "ALL_SCENARIOS_PASS",
    },
    apiEndpoint: "/api/cip/migrate",
    apiMethod: "POST",
    runSpec: {
      target: "migrateConsciousness",
      description:
        "For each scenario: construct an in-memory ConsciousnessRecord, call migrateConsciousness(record, 'newAddr', matchScore). Assert outcome (or thrown error for invalid matchScore).",
    },
    scenarios: [
      {
        id: "TV3-a",
        label: "matchScore=9250 (92.5% — pure inheritance)",
        inputs: { matchScore: 9250 },
        expected: {
          outcome: "PURE_INHERITANCE",
          expectedFields: { requiresLineageSplit: false },
        },
      },
      {
        id: "TV3-b",
        label: "matchScore=8499 (84.99% — fusion band, lineage split)",
        inputs: { matchScore: 8499 },
        expected: {
          outcome: "FUSION_EMERGENCE",
          expectedFields: { requiresLineageSplit: true },
        },
      },
      {
        id: "TV3-c",
        label: "matchScore=10500 (>BPS_MAX — invalid, reverts)",
        inputs: { matchScore: 10500 },
        expected: {
          outcome: "THROW",
          expectedError: "CIP: matchScore must be in [0, 10000]",
        },
      },
    ],
  },

  // -----------------------------------------------------------
  // TV4: CDS SBT soulbound enforcement (2 sub-scenarios)
  // RFC §5.2 §四 Test Vector 2, lines 752-780
  // -----------------------------------------------------------
  {
    id: "TV4",
    vectorId: "CDS_SBT_Soulbound_Enforcement",
    module: "cds",
    title: "CDS SBT Soulbound Enforcement (2 Scenarios)",
    description:
      "Cross-Dimensional Soulbound Token cannot be manually transferred — transferFrom MUST revert. Only CIP-triggered soulTransfer is allowed, which rotates the owner pointer while preserving tokenId + metadataHash.",
    rfcRef: "RFC §5.2 §四 / Test Vector 2 (lines 752-780)",
    inputs: {
      tokenId: 101,
      maliciousActor: "0xHacker_Address",
      cipRegistry: "0xCIP_Contract",
    },
    expected: {
      outcome: "ALL_SCENARIOS_PASS",
    },
    apiEndpoint: "/api/cip/migrate",
    apiMethod: "POST",
    runSpec: {
      target: "transferFrom",
      description:
        "Scenario A: call transferFrom() and assert it throws MANUAL_TRANSFER_FORBIDDEN. Scenario B: call soulTransfer(token, newOwnerId) and assert tokenId + metadataHash unchanged, ownerAvatarId rotated.",
    },
    scenarios: [
      {
        id: "TV4-a",
        label: "transferFrom (malicious manual transfer)",
        inputs: { action: "transferFrom", caller: "maliciousActor" },
        expected: {
          outcome: "THROW",
          expectedError:
            "CDS: Soulbound token cannot be manually transferred. Only Consciousness Migration allowed.",
        },
      },
      {
        id: "TV4-b",
        label: "soulTransfer via CIP (consciousness migration)",
        inputs: { action: "soulTransfer", caller: "cipRegistry" },
        expected: {
          outcome: "SUCCESS",
          expectedFields: {
            tokenIdUnchanged: true,
            metadataHashUnchanged: true,
            ownerRotated: true,
          },
        },
      },
    ],
  },

  // -----------------------------------------------------------
  // TV5: TDPO Not Contrarian rejection
  // Mirrors RFC lockContrarianCognition's require(variance>500 && mean<30)
  // -----------------------------------------------------------
  {
    id: "TV5",
    vectorId: "TDPO_Not_Contrarian",
    module: "tdpo",
    title: "TDPO Non-Contrarian Cognition Rejection",
    description:
      "Cognition with mean=50 (not < 30) and variance=200 (not > 500) fails the contrarian check. Contract MUST refuse to lock and return 'Not a contrarian cognition'.",
    rfcRef: "RFC §5.1 TDPO (line 402)",
    inputs: {
      cognitiveHash: "0xNonContrarian_Hash",
      mean: 50,
      variance: 200,
      delaySeconds: 86400,
    },
    initialState: {
      varianceThreshold: 500,
      meanThreshold: 30,
    },
    expected: {
      outcome: "REJECT",
      expectedFields: {
        locked: false,
        reason: "Not a contrarian cognition",
      },
    },
    apiEndpoint: "/api/tdpo/lock",
    apiMethod: "POST",
    runSpec: {
      target: "lockContrarianCognition",
      description:
        "Call lockContrarianCognition('hash', 'creator', 50, 200, 86400). Assert locked===false && reason==='Not a contrarian cognition'.",
    },
  },

  // -----------------------------------------------------------
  // TV6: TDPO retroactive trigger (after time-lock expires)
  // RFC claimRetroactiveReward, lines 418-443
  // evolutionFactor = floor(futureMean / (initialMean + 1)) = floor(950/16) = 59
  // -----------------------------------------------------------
  {
    id: "TV6",
    vectorId: "TDPO_Retroactive_Trigger",
    module: "tdpo",
    title: "TDPO Retroactive Reward Trigger",
    description:
      "After time-lock expires, a contrarian cognition that 'aged into truth' (futureMean=950 vs initialMean=15, citations=5000) triggers retroactive compensation. evolutionFactor = floor(950/(15+1)) = 59 per Solidity integer division.",
    rfcRef: "RFC §5.1 TDPO / claimRetroactiveReward (lines 418-443)",
    inputs: {
      cognitiveHash: "0xProphet_XDP_Hash",
      initialMean: 15,
      futureMean: 950,
      futureCitations: 5000,
      poolBalance: "1000000000", // 1000 USDC
    },
    initialState: {
      isRetroactiveTriggered: false,
      unlockTimestamp: "PAST",
      evolutionFactorThreshold: 5,
      citationsThreshold: 100,
    },
    expected: {
      outcome: "TRIGGERED",
      expectedFields: {
        triggered: true,
        evolutionFactor: 59,
      },
    },
    apiEndpoint: "/api/tdpo/claim-retroactive",
    apiMethod: "POST",
    runSpec: {
      target: "claimRetroactiveReward",
      description:
        "Construct in-memory CognitiveAsset {initialMean: 15, unlockTimestamp: now-1s, isRetroactiveTriggered: false}; call claimRetroactiveReward(asset, 950, 5000, 1_000_000_000n, now). Assert triggered===true && evolutionFactor===59.",
    },
  },

  // -----------------------------------------------------------
  // TV7: PCMG forged / low-fidelity proof
  // RFC PhygitalGateway.submitPhysicsProof — fidelity MUST > 8000
  // -----------------------------------------------------------
  {
    id: "TV7",
    vectorId: "PCMG_Forged_Proof",
    module: "pcmg",
    title: "PCMG Forged / Low-Fidelity Proof Rejection",
    description:
      "Multimodal physics proof with fidelity=6500 (below 8000 threshold) MUST 400-revert BEFORE the emotional resonance check. Mirrors Solidity require ordering: physical proof is verified first.",
    rfcRef: "RFC §5.3 PhygitalGateway (lines 1175-1208)",
    inputs: {
      intentHash: "0xPCMG_Test_Intent",
      fidelity: 6500,
      resonance: 9000,
    },
    initialState: {
      status: "Executing",
      fidelityThreshold: 8000,
    },
    expected: {
      outcome: "THROW",
      expectedError: "PCMG: Physical proof invalid or low fidelity",
      expectedFields: { statusCode: 400 },
    },
    apiEndpoint: "/api/pcmg/submit-proof",
    apiMethod: "POST",
    runSpec: {
      target: "submitPhysicsProof",
      description:
        "Construct in-memory PhysicsIntent {status:'Executing'}; call submitPhysicsProof(intent, {fidelity:6500, resonance:9000}). Assert PCMGError thrown with statusCode=400 and message 'PCMG: Physical proof invalid or low fidelity'.",
    },
  },

  // -----------------------------------------------------------
  // TV8: PCMG emotional dissonance → slashing
  // fidelity passes (>8000) but resonance fails (<=7500) → Slashed
  // -----------------------------------------------------------
  {
    id: "TV8",
    vectorId: "PCMG_Emotional_Dissonance",
    module: "pcmg",
    title: "PCMG Emotional Dissonance Slashing",
    description:
      "Physical proof is high-fidelity (9200>8000) but emotional resonance is below threshold (3000<=7500). Contract MUST slash the executor: status=Slashed, slashAmount=escrowAmount refunded to creator.",
    rfcRef: "RFC §5.3 PhygitalGateway / ECE Engine (lines 1175-1208)",
    inputs: {
      intentHash: "0xPCMG_Test_Intent",
      fidelity: 9200,
      resonance: 3000,
      escrowAmount: "5000000", // 5 $AFC
    },
    initialState: {
      status: "Executing",
      fidelityThreshold: 8000,
      resonanceThreshold: 7500,
    },
    expected: {
      outcome: "Slashed",
      expectedFields: {
        slashed: true,
        rewardReleased: "0",
        status: "Slashed",
      },
    },
    apiEndpoint: "/api/pcmg/submit-proof",
    apiMethod: "POST",
    runSpec: {
      target: "submitPhysicsProof",
      description:
        "Construct in-memory PhysicsIntent {status:'Executing', afcEscrowAmount:5_000_000n}; call submitPhysicsProof(intent, {fidelity:9200, resonance:3000}). Assert result.status==='Slashed' && result.slashed===true && rewardReleased===0n.",
    },
  },

  // -----------------------------------------------------------
  // TV9: CPDF black-hole (low similarity → weight crushed to 0)
  // RFC §5.1 CPDF: similarity < 0.30 → weight = 0
  // -----------------------------------------------------------
  {
    id: "TV9",
    vectorId: "CPDF_Black_Hole",
    module: "dag",
    title: "CPDF Black-Hole (Low Similarity → Weight Zero)",
    description:
      "A fused shard with similarity=0.15 to the core anchor (below the 0.30 floor) is judged cognitive garbage. CPDF MUST crush its edge weight to 0 and mark it as a black-hole node, excluding it from lineage rewards.",
    rfcRef: "RFC §5.1 CPDF (lines 960-996)",
    inputs: {
      entityId: "0xEntity_Test",
      fusedShardHash: "0xShard_Low_Similarity",
      qEceScore: 5000,
      similarityToAnchor: 0.15,
    },
    initialState: {
      similarityFloor: 0.3,
      lambda: 2,
      baseWeight: 1.0,
    },
    expected: {
      outcome: "BLACK_HOLE",
      expectedFields: {
        finalWeight: 0,
        isBlackHole: true,
      },
    },
    apiEndpoint: "/api/dag/fuse",
    apiMethod: "POST",
    runSpec: {
      target: "calculateEdgeWeight",
      description:
        "Call calculateEdgeWeight('0xEntity_Test', '0xShard_Low_Similarity', 5000, 0.15). Assert finalWeight===0 && isBlackHole===true.",
    },
  },

  // -----------------------------------------------------------
  // TV10: Cognitive money-laundering detection
  // 12 shards, avg qEce=500 (<2000), avg sim=0.15 (<0.3) → suspicious
  // -----------------------------------------------------------
  {
    id: "TV10",
    vectorId: "Cognitive_Money_Laundering",
    module: "dag",
    title: "Cognitive Money-Laundering Detection",
    description:
      "An entity fuses 12+ shards with average ECE quality=500 (<2000) and average similarity=0.15 (<0.3). The CPDF black-holes all of them, and the heuristic flags the entity as a cognitive money-laundering pattern.",
    rfcRef: "RFC §5.1 CPDF / Anti-Laundering (lines 960-996)",
    inputs: {
      entityId: "0xEntity_Spammer",
      shardCount: 12,
      avgQEceScore: 500,
      avgSimilarityToAnchor: 0.15,
    },
    initialState: {
      shardCountThreshold: 10,
      avgEceThreshold: 2000,
      avgSimilarityThreshold: 0.3,
    },
    expected: {
      outcome: "SUSPICIOUS",
      expectedFields: {
        suspicious: true,
      },
    },
    apiEndpoint: "/api/dag/money-laundering",
    apiMethod: "GET",
    runSpec: {
      target: "detectMoneyLaunderingPure",
      description:
        "Call detectMoneyLaunderingPure({shardCount:12, avgEceScore:500, avgSimilarity:0.15}). Assert suspicious===true.",
    },
  },
];

// ----- Convenience lookups -----
export const TEST_VECTOR_MAP: Record<string, TestVector> = TEST_VECTORS.reduce(
  (acc, v) => {
    acc[v.id] = v;
    return acc;
  },
  {} as Record<string, TestVector>,
);

// ============================================================
// Result types (used by the runner + UI)
// ============================================================
export interface ScenarioResult {
  scenarioId: string;
  label: string;
  passed: boolean;
  actual: Record<string, unknown>;
  errorMessage?: string;
}

export interface TestVectorRunResult {
  vectorId: string; // "TV1".."TV10"
  rfcCase: string; // "Scope_Lock_Violation" etc.
  module: TestVectorModule;
  passed: boolean;
  actual: Record<string, unknown>;
  expected: Record<string, unknown>;
  errorMessage?: string;
  scenarioResults?: ScenarioResult[]; // for TV3/TV4
  executedAt: string; // ISO timestamp
}

// ----- Module accent colors (for UI badges) -----
export const MODULE_ACCENTS: Record<
  TestVectorModule,
  "emerald" | "amber" | "violet" | "cyan" | "rose"
> = {
  escrow: "emerald",
  tdpo: "amber",
  cip: "violet",
  cds: "violet",
  dag: "cyan",
  pcmg: "rose",
};

// Re-export shared status types for the runner
export type {
  Amount,
  BudgetFenceStatus,
  EscrowStatus,
  CIPMigrationOutcome,
  PhysicsIntentStatus,
};
