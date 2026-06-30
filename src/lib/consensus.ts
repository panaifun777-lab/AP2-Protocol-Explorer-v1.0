// ============================================================
// AA2P Protocol v1.0 — PoUE + PoRC Consensus Visualization Data
// RFC §4.2 (AFC Chain), §5.1 (CPDF), §6 (Roadmap)
//
// Pure data + a tiny helper used by the Tests panel's "PoUE/PoRC
// Consensus" tab. No DB access, no React imports — safe for both
// server + client.
// ============================================================

// ----- PoUE (Proof of Unique Entity) flow steps -----
// RFC §4.2 / §5.1: PoUE is the *admission* gate. An avatar MUST
// prove it is a unique living digital entity (not a Sybil script)
// before it can participate in the AFC consensus.
export interface ConsensusStep {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name (resolved in the panel)
}

export const PoUE_STEPS: ConsensusStep[] = [
  {
    id: "poue-1",
    name: "M-Pata Bio-Metric Mapping",
    description:
      "Reversible biometric mapping (M-Pata) binds the avatar to a unique living entity without storing raw biometrics on-chain.",
    icon: "Fingerprint",
  },
  {
    id: "poue-2",
    name: "Behavioral Time-Series",
    description:
      "Long-horizon behavioral telemetry (interaction cadence, decision entropy) is sampled as a Sybil-resistant fingerprint.",
    icon: "Activity",
  },
  {
    id: "poue-3",
    name: "Emotion Baseline Extraction",
    description:
      "ECE (Emotion Consensus Engine) derives a private emotional baseline vector that anchors the avatar's cognitive fingerprint.",
    icon: "HeartPulse",
  },
  {
    id: "poue-4",
    name: "ZK-Proof Generation",
    description:
      "A ZK-SNARK/STARK proof is generated off-chain attesting 'unique living entity' without revealing the underlying biometric data.",
    icon: "ShieldCheck",
  },
  {
    id: "poue-5",
    name: "On-Chain Verification",
    description:
      "The AFC chain verifies the ZK proof on-chain. Verified avatars are admitted to the consensus pool — the gate to PoRC.",
    icon: "KeyRound",
  },
];

// ----- PoRC (Proof of Resonant Cognition) flow steps -----
// RFC §4.2: PoRC is the *block-production* consensus. Block
// packing rights go to the avatar whose cognitive shard contributed
// the most entropy reduction (highest resonance) in the round.
export const PoRC_STEPS: ConsensusStep[] = [
  {
    id: "porc-1",
    name: "Cognitive Shard Submission",
    description:
      "Avatars submit cognitive shards (problems solved, consensus votes cast, fusion contributions) into the round pool.",
    icon: "Sparkles",
  },
  {
    id: "porc-2",
    name: "Entropy Reduction Measurement",
    description:
      "The ECE engine scores each shard by its entropy-reduction contribution ΔH — the higher the cognitive value, the higher the score.",
    icon: "Gauge",
  },
  {
    id: "porc-3",
    name: "Consensus Voting",
    description:
      "Validators vote on the highest-ΔH shard. A supermajority confirms the leader for the next block (BFT-style finality).",
    icon: "Vote",
  },
  {
    id: "porc-4",
    name: "Block Packaging",
    description:
      "The elected leader packages the round's confirmed shards + transactions into the next AFC block (0.4s target block time).",
    icon: "Blocks",
  },
  {
    id: "porc-5",
    name: "$AFC Token Reward",
    description:
      "Block reward + cognitive shard rewards are minted in $AFC to the leader and contributing avatars, proportional to ΔH weights.",
    icon: "Coins",
  },
];

// ----- AFC Chain specifications -----
// RFC §4.2: AFC is a "cognition-driven, entity-unique" Web4.0 native
// chain — NOT a traditional PoW/PoS chain.
export interface AFCChainSpecs {
  consensus: string;
  tps: string;
  blockTime: string;
  coprocessor: string;
  storage: string;
  nativeToken: string;
  finality: string;
  sybilResistance: string;
}

export const AFC_CHAIN_SPECS: AFCChainSpecs = {
  consensus: "PoUE + PoRC",
  tps: "10,000+",
  blockTime: "0.4s",
  coprocessor: "TEE + ZK-ML",
  storage: "Native Graph Storage",
  nativeToken: "$AFC",
  finality: "BFT Supermajority (2f+1)",
  sybilResistance: "PoUE ZK-Proof Admission",
};

// ----- Cognitive Coprocessor card content -----
export interface CoprocessorLayer {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const COGNITIVE_COPROCESSOR: CoprocessorLayer[] = [
  {
    id: "tee",
    name: "TEE (Trusted Execution Environment)",
    description:
      "Confidential computation of biometric + behavioral features inside hardware enclaves (Intel SGX / ARM TrustZone).",
    icon: "Cpu",
  },
  {
    id: "zk-ml",
    name: "ZK-ML Proof Generation",
    description:
      "Zero-knowledge proofs over ML inference (ECE scoring, similarity) — chain verifies the proof, never the raw cognitive data.",
    icon: "BrainCircuit",
  },
  {
    id: "graph",
    name: "Native Graph Storage",
    description:
      "DAG-native storage layer for cognitive shards, lineage edges and CIP soulbound tokens — no foreign-key impedance.",
    icon: "Network",
  },
];

// ----- Phase Roadmap (RFC §6) -----
export interface RoadmapPhase {
  id: string;
  phase: string;
  title: string;
  description: string;
  duration: string;
  status: "done" | "active" | "planned";
  icon: string;
  accent: "emerald" | "cyan" | "violet";
  milestones: string[];
}

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    id: "phase-1",
    phase: "Phase 1",
    title: "Shadow Avatar (Base MVP)",
    description:
      "Deploy AA2P core contracts (Escrow, BudgetFence, TDPO) on Base chain. Issue ERC-20 $AFC. Off-chain M-Pata signs PoUE VCs for whitelist. Run avatar rental + retroactive lock demos.",
    duration: "Month 1-3",
    status: "active",
    icon: "Rocket",
    accent: "emerald",
    milestones: [
      "AP2Escrow + BudgetFence on Base",
      "ERC-20 $AFC issuance",
      "Off-chain PoUE VC whitelist",
      "Avatar rental + TDPO lock demo",
    ],
  },
  {
    id: "phase-2",
    phase: "Phase 2",
    title: "Sovereign Descent (AFC Mainnet)",
    description:
      "Launch AFC mainnet with PoUE + PoRC consensus. Open the Cognitive State Migration Bridge — Base chain avatars, TDPO locks, and CDS SBTs map losslessly onto AFC mainnet.",
    duration: "Month 4-6",
    status: "planned",
    icon: "Crown",
    accent: "cyan",
    milestones: [
      "AFC mainnet (PoUE + PoRC)",
      "Cognitive State Migration Bridge",
      "Lossless CDS SBT migration",
      "10,000 TPS stress test",
    ],
  },
  {
    id: "phase-3",
    phase: "Phase 3",
    title: "Phygital Symbiosis (PCMG Full Open)",
    description:
      "Connect global IoT devices + Rent-a-Human network. Digital will achieves absolute, safe intervention in the physical world via the Phygital Cross-Membrane Gateway.",
    duration: "Month 7+",
    status: "planned",
    icon: "Globe",
    accent: "violet",
    milestones: [
      "Global IoT device onboarding",
      "Rent-a-Human physical executor network",
      "Cross-membrane $AFC ↔ fiat rail",
      "Ricardian arbitration for slashing",
    ],
  },
];

// ============================================================
// CPDF weight calculator (pure helper)
// Mirrors the formula in `src/lib/contracts/cognitive-dag.ts`:
//   W = W_base × Similarity × e^{-λ(1 - Q_ece)}
//   similarity < 0.30 → weight = 0 (BLACK HOLE)
// ============================================================
export function COMPUTE_CPDF_WEIGHT(
  qEceScore: number,
  similarityToAnchor: number,
): {
  baseWeight: number;
  similarity: number;
  eceScore: number;
  decayFactor: number;
  finalWeight: number;
  isBlackHole: boolean;
} {
  const BASE_WEIGHT = 1.0;
  const SIMILARITY_FLOOR = 0.3;
  const LAMBDA = 2;

  // Black-hole rule
  if (similarityToAnchor < SIMILARITY_FLOOR) {
    return {
      baseWeight: BASE_WEIGHT,
      similarity: similarityToAnchor,
      eceScore: qEceScore,
      decayFactor: 0,
      finalWeight: 0,
      isBlackHole: true,
    };
  }

  const qEce = qEceScore / 10000;
  const decayFactor = Math.exp(-LAMBDA * (1 - qEce));
  const finalWeight = BASE_WEIGHT * similarityToAnchor * decayFactor;

  return {
    baseWeight: BASE_WEIGHT,
    similarity: similarityToAnchor,
    eceScore: qEceScore,
    decayFactor,
    finalWeight,
    isBlackHole: false,
  };
}
