// ============================================================
// AP2 Protocol v1.0 - Shared Types
// Mirrors RFC v1.0 Solidity contract types as TypeScript
// All amounts are in 6-decimals (USDC-style) unless noted
// ============================================================

// Amount type — token amounts use bigint (6-decimals USDC-style).
// API responses serialize bigint as string for JSON safety.
export type Amount = bigint;

// ----- Avatar / PoUE -----
export type AvatarKind = "avatar" | "agent" | "prophet" | "genius";

export interface Avatar {
  id: string;
  address: string;
  name: string;
  kind: AvatarKind;
  cognitiveRoot: string | null;
  reputation: number;
  isUniqueEntity: boolean;
  poueProofHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ----- BudgetFence -----
export type BudgetFenceStatus =
  | "APPROVED"
  | "REJECT_SCOPE"
  | "REJECT_DAILY_CAP"
  | "REQUIRE_HUMAN_AUTH";

export interface BudgetFence {
  id: string;
  avatarId: string;
  dailyCap: Amount;
  dailySpent: Amount;
  allowedScopes: string[];
  decayingThreshold: Amount;
  authDecayFactor: number;
  lastResetAt: Date;
}

export interface BudgetFenceCheckResult {
  status: BudgetFenceStatus;
  approved: boolean;
  reason: string;
  remainingDaily: Amount;
  triggeredDecayingAuth: boolean;
}

// ----- AP2Escrow -----
export type EscrowStatus =
  | "Created"
  | "Streaming"
  | "Completed"
  | "Disputed"
  | "Refunded";

export interface Escrow {
  id: string;
  taskId: string;
  payerId: string;
  payeeId: string;
  totalAmount: Amount;
  releasedAmount: Amount;
  scope: string;
  startTime: Date;
  endTime: Date;
  status: EscrowStatus;
  qualityScore: number;
  completionPct: number;
  mcpProofHash: string | null;
}

export interface StreamReleaseResult {
  taskId: string;
  releasedAmount: Amount;
  totalReleased: Amount;
  status: EscrowStatus;
}

export interface VerifyAndSettleResult {
  taskId: string;
  success: boolean;
  finalPayout: Amount;
  alreadyReleased: Amount;
  clawbackRequired: Amount;
  refundAmount: Amount;
  status: EscrowStatus;
  reputationDelta: number;
}

// ----- TDPO (CognitiveTimeLock) -----
export interface CognitiveAsset {
  id: string;
  cognitiveHash: string;
  creatorAvatarId: string;
  initialVariance: number;
  initialMean: number;
  lockTimestamp: Date;
  unlockTimestamp: Date;
  isRetroactiveTriggered: boolean;
  rewardAmount: Amount;
  futureMean: number;
  futureCitations: number;
  evolutionFactor: number;
}

export interface TDPOLockResult {
  cognitiveHash: string;
  locked: boolean;
  reason: string;
  unlockTimestamp: Date;
}

export interface TDPORetroactiveResult {
  cognitiveHash: string;
  triggered: boolean;
  evolutionFactor: number;
  rewardAmount: Amount;
  reputationDelta: number;
  reason: string;
}

// ----- CIP (Consciousness Inheritance Protocol) -----
export interface ConsciousnessRecord {
  id: string;
  entityId: string;
  cognitiveRoot: string;
  creationTimestamp: Date;
  isDeceasedOrMigrated: boolean;
  currentActiveAddressId: string | null;
  migrationCount: number;
  lastMatchScore: number;
}

export type CIPMigrationOutcome =
  | "PURE_INHERITANCE"
  | "FUSION_EMERGENCE"
  | "HIJACK_REJECTED";

export interface CIPMigrationResult {
  entityId: string;
  oldAddressId: string | null;
  newAddressId: string;
  matchScore: number; // 0-10000 basis points
  outcome: CIPMigrationOutcome;
  reason: string;
  requiresLineageSplit: boolean;
}

// ----- CDS (Cross-Dimensional Soulbound Token) -----
export interface CDSToken {
  id: string;
  tokenId: number;
  entityId: string;
  ownerAvatarId: string;
  metadataHash: string;
  isSoulbound: boolean;
  mintTimestamp: Date;
}

// ----- Cognitive DAG + CPDF -----
export interface DAGNode {
  id: string;
  entityId: string;
  ownerAvatarId: string;
  shardHash: string;
  isCoreAnchor: boolean;
  eceQualityScore: number; // 0-10000
  similarityToAnchor: number; // 0.0-1.0
  edgeWeight: number; // computed
}

export interface DAGEdge {
  id: string;
  entityId: string;
  fromNodeId: string;
  toNodeId: string;
  weight: number;
  eceScore: number;
}

export interface CPDFResult {
  nodeId: string;
  baseWeight: number;
  similarity: number;
  eceScore: number;
  decayFactor: number;
  finalWeight: number;
  isBlackHole: boolean; // true if weight crushed to ~0
}

export interface LineageSplitShare {
  avatarId: string;
  weight: number; // 0-10000 basis points
  share: number; // computed amount
}

// ----- PCMG (Phygital Cross-Membrane Gateway) -----
export type PhysicsIntentStatus =
  | "Pending"
  | "Executing"
  | "Verifying"
  | "Completed"
  | "Slashed";

export interface PhysicsIntent {
  id: string;
  intentHash: string;
  creatorAvatarId: string;
  afcEscrowAmount: Amount;
  physicsConstraints: string; // JSON
  executorId: string | null;
  executionDeadline: Date;
  status: PhysicsIntentStatus;
  fidelityScore: number; // 0-10000
  resonanceScore: number; // 0-10000
  multiModalProofHash: string | null;
}

export interface PCMGVerifyResult {
  intentHash: string;
  physicalValid: boolean;
  fidelityScore: number;
  emotionalResonant: boolean;
  resonanceScore: number;
  status: PhysicsIntentStatus;
  rewardReleased: Amount;
  slashed: boolean;
  slashReason: string | null;
}

// ----- ECE -----
export interface ECESnapshot {
  id: string;
  avatarId: string;
  cognitiveHash: string | null;
  meanScore: number; // 0-1000
  varianceScore: number; // 0-1000
  citations: number;
  recordedAt: Date;
}

// ----- Test Vectors -----
export interface TestVector {
  vectorId: string;
  module: string;
  title: string;
  description: string;
  input: Record<string, unknown>;
  initialState?: Record<string, unknown>;
  expected: Record<string, unknown>;
}

export interface TestRunResult {
  vectorId: string;
  passed: boolean;
  actual: Record<string, unknown>;
  errorMessage?: string;
  executedAt: Date;
}

// ----- API envelope -----
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ----- Constants from RFC -----
export const RFC_CONSTANTS = {
  // Basis points (10000 = 100%)
  BPS_MAX: 10000,
  // CIP purity thresholds (RFC 5.2)
  CIP_PURE_THRESHOLD: 8500, // 85%
  CIP_MIN_THRESHOLD: 6000, // 60%
  // PCMG validation thresholds (RFC 5.3)
  PCMG_FIDELITY_THRESHOLD: 8000, // 80%
  PCMG_RESONANCE_THRESHOLD: 7500, // 75%
  // CPDF / DAG (RFC 5.1)
  CPDF_SIMILARITY_FLOOR: 3000, // 30% -> weight crushed to 0
  CPDF_LAMBDA: 2, // decay coefficient
  // TDPO (RFC 5.1 TDPO)
  TDPO_VARIANCE_THRESHOLD: 500,
  TDPO_MEAN_THRESHOLD: 30,
  TDPO_EVOLUTION_FACTOR_TRIGGER: 5,
  TDPO_CITATIONS_TRIGGER: 100,
  TDPO_REWARD_POOL_BPS: 1000, // 10% of mediocrity pool
  // Mediocrity tax (RFC CognitiveTimeLock.injectMediocrityTax)
  MEDIOCRITY_TAX_BPS: 10, // 0.1%
  // BudgetFence decaying auth threshold default
  DECAYING_THRESHOLD_DEFAULT: 10_000_000, // 10 USDC
} as const;

// ----- Token unit helpers (6-decimals, bigint-safe) -----
export const TOKEN_DECIMALS = 6;
export function toTokenUnits(usdc: number): bigint {
  return BigInt(Math.round(usdc * 1e6));
}
export function fromTokenUnits(units: bigint | number): number {
  const u = typeof units === "bigint" ? Number(units) : units;
  return u / 1e6;
}
export function formatToken(units: bigint | number | null | undefined): string {
  if (units === null || units === undefined) return "0 $AFC";
  return `${fromTokenUnits(units).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })} $AFC`;
}

// ----- BigInt JSON serialization -----
// BigInt isn't JSON-serializable by default. This helper converts any
// BigInt values in a payload to strings (with a leading marker so we can
// round-trip if needed). Use in API routes before NextResponse.json().
export function serializeForJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? `__bigint__${v.toString()}` : v,
    ),
  ) as T;
}

// Parse a JSON payload that may contain BigInt strings back to BigInt.
export function parseFromJson<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  const reviver = (_k: string, v: unknown): unknown => {
    if (typeof v === "string" && v.startsWith("__bigint__")) {
      return BigInt(v.slice("__bigint__".length));
    }
    return v;
  };
  return JSON.parse(JSON.stringify(value), reviver) as T;
}
