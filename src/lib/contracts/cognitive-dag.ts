// ============================================================
// AP2 Protocol v1.0 - CognitiveDAG_Oracle + CPDF + CIP_Lineage
// Mirrors RFC v1.0 §5.1 (CPDF/CCA) and `CIP_Lineage._executeLineageSplit`.
//
// Pure TypeScript mirroring `CognitiveDAG_Oracle.sol`:
//   - createCoreAnchor
//   - calculateEdgeWeight (CPDF)
//   - fuseShard
//   - getLineageWeights
//   - executeLineageSplit (mirrors CIP_Lineage._executeLineageSplit)
//   - detectMoneyLaundering (heuristic)
//
// CPDF formula (mathematically-correct interpretation of RFC):
//   W = W_base × Similarity × e^{-λ(1 - Q_ece)}    where λ = 2
//   similarity < 0.30 → weight crushed to 0 (BLACK HOLE)
// ============================================================

import type { DAGNode as PrismaDAGNode, DAGEdge as PrismaDAGEdge } from "@prisma/client";
import { db } from "@/lib/db";
import {
  RFC_CONSTANTS,
  type Amount,
  type CPDFResult,
  type DAGNode,
  type DAGEdge,
  type LineageSplitShare,
} from "@/lib/types";

// Base weight constant (W_base = 1.0 in float, 10000 in bps).
const BASE_WEIGHT = 1.0;

// Similarity floor (0.30 = RFC_CONSTANTS.CPDF_SIMILARITY_FLOOR / 10000).
const SIMILARITY_FLOOR =
  RFC_CONSTANTS.CPDF_SIMILARITY_FLOOR / 10000; // 0.30

// Decay coefficient (λ = RFC_CONSTANTS.CPDF_LAMBDA = 2).
const CPDF_LAMBDA = RFC_CONSTANTS.CPDF_LAMBDA;

// ----- Internal types (BigInt-safe variants of shared types) -----

// LineageSplitShare with `share` as bigint (Amount) for BigInt-safe math.
// The shared type uses `share: number`; we extend it here so the contract
// math can stay BigInt-accurate (mirrors Solidity uint256 share).
export interface LineageSplitShareBig
  extends Omit<LineageSplitShare, "share"> {
  share: Amount; // 6-decimals USDC-style bigint
}

export interface MoneyLaunderingResult {
  suspicious: boolean;
  reason?: string;
  blackHoledNodes: DAGNode[];
  stats: {
    shardCount: number;
    avgEceScore: number;
    avgSimilarity: number;
  };
}

// ----- Serialization helpers (Prisma row → shared TS interface) -----

function serializeNode(n: PrismaDAGNode): DAGNode {
  return {
    id: n.id,
    entityId: n.entityId,
    ownerAvatarId: n.ownerAvatarId,
    shardHash: n.shardHash,
    isCoreAnchor: n.isCoreAnchor,
    eceQualityScore: n.eceQualityScore,
    similarityToAnchor: n.similarityToAnchor,
    edgeWeight: n.edgeWeight,
  };
}

function serializeEdge(e: PrismaDAGEdge): DAGEdge {
  return {
    id: e.id,
    entityId: e.entityId,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    weight: e.weight,
    eceScore: e.eceScore,
  };
}

// ----- Public API -----

/**
 * Create the core anchor node for an entity.
 * Mirrors `CognitiveDAG_Oracle.coreAnchors[entityId] = shardHash`.
 * The core anchor has similarity=1.0 (identical to itself) and edgeWeight=1.0.
 */
export async function createCoreAnchor(
  entityId: string,
  ownerAvatarId: string,
  shardHash: string,
): Promise<DAGNode> {
  // If an anchor already exists for this entity, return it (idempotent).
  const existing = await db.dAGNode.findFirst({
    where: { entityId, isCoreAnchor: true },
  });
  if (existing) {
    return serializeNode(existing);
  }

  const node = await db.dAGNode.create({
    data: {
      entityId,
      ownerAvatarId,
      shardHash,
      isCoreAnchor: true,
      eceQualityScore: 10000, // core anchor is perfect quality
      similarityToAnchor: 1.0,
      edgeWeight: 1.0, // BASE_WEIGHT
    },
  });
  return serializeNode(node);
}

/**
 * Compute the CPDF edge weight for a fused shard.
 * Mirrors `CognitiveDAG_Oracle.calculateEdgeWeight`.
 *
 * Formula (mathematically-correct per RFC description):
 *   W = W_base × Similarity × e^{-λ(1 - Q_ece)}    with λ = 2
 *
 * Black-hole rule:
 *   if similarity < 0.30 → weight = 0, isBlackHole = true
 *
 * NOTE: the RFC Solidity snippet has a typo in the decayFactor formula
 * (`exp(-2 * (10000 - qEceScore)) / 10000`), but the math description and
 * the prose both state the intended interpretation is the standard
 * exponential decay `e^{-λ(1-Q_ece)}`. We implement the intended version.
 */
export function calculateEdgeWeight(
  entityId: string,
  fusedShardHash: string,
  qEceScore: number,
  similarityToAnchor: number,
): CPDFResult {
  // The nodeId is a placeholder until the row is actually persisted.
  // (Pure function — does not touch DB.)
  const nodeId = `${entityId}:${fusedShardHash}`;

  // 1. Black-hole rule: similarity < 30% → weight crushed to 0.
  if (similarityToAnchor < SIMILARITY_FLOOR) {
    return {
      nodeId,
      baseWeight: BASE_WEIGHT,
      similarity: similarityToAnchor,
      eceScore: qEceScore,
      decayFactor: 0,
      finalWeight: 0,
      isBlackHole: true,
    };
  }

  // 2. CPDF decay factor: e^{-λ(1 - Q_ece)} with Q_ece = qEceScore/10000.
  const qEce = qEceScore / 10000;
  const decayFactor = Math.exp(-CPDF_LAMBDA * (1 - qEce));

  // 3. weight = W_base × similarity × decayFactor
  const finalWeight = BASE_WEIGHT * similarityToAnchor * decayFactor;

  return {
    nodeId,
    baseWeight: BASE_WEIGHT,
    similarity: similarityToAnchor,
    eceScore: qEceScore,
    decayFactor,
    finalWeight,
    isBlackHole: false,
  };
}

/**
 * Fuse a new shard into an entity's DAG.
 * Mirrors `CognitiveDAG_Oracle.fuseShard`:
 *   - Compute CPDF weight via calculateEdgeWeight
 *   - Create a DAGNode (isCoreAnchor=false) with the computed edgeWeight
 *   - Create a DAGEdge from the core anchor to this new node
 */
export async function fuseShard(
  entityId: string,
  ownerAvatarId: string,
  shardHash: string,
  qEceScore: number,
  similarityToAnchor: number,
): Promise<{
  cpdfResult: CPDFResult;
  node: DAGNode;
  edge: DAGEdge | null;
}> {
  const cpdf = calculateEdgeWeight(
    entityId,
    shardHash,
    qEceScore,
    similarityToAnchor,
  );

  // Persist the fused-shard node.
  const node = await db.dAGNode.create({
    data: {
      entityId,
      ownerAvatarId,
      shardHash,
      isCoreAnchor: false,
      eceQualityScore: qEceScore,
      similarityToAnchor,
      edgeWeight: cpdf.finalWeight,
    },
  });

  // Find this entity's core anchor (every entity must have exactly one).
  const anchor = await db.dAGNode.findFirst({
    where: { entityId, isCoreAnchor: true },
  });

  let edge: DAGEdge | null = null;
  if (anchor) {
    const created = await db.dAGEdge.create({
      data: {
        entityId,
        fromNodeId: anchor.id,
        toNodeId: node.id,
        weight: cpdf.finalWeight,
        eceScore: qEceScore,
      },
    });
    edge = serializeEdge(created);
  }

  return {
    cpdfResult: { ...cpdf, nodeId: node.id },
    node: serializeNode(node),
    edge,
  };
}

/**
 * Return lineage weight vectors for an entity.
 * Mirrors `ICognitiveDAG.getLineageWeights(entityId)`:
 *   (avatars[], weights[])  where weights sum to 10000 (bps).
 *
 * Logic:
 *   - For every DAGNode of the entity, group by ownerAvatarId.
 *   - Sum each avatar's edgeWeight (core anchor contributes its weight too).
 *   - Black-hole nodes (edgeWeight == 0) are excluded from the sum.
 *   - Normalize to 10000 bps so weights sum to exactly 10000.
 */
export async function getLineageWeights(
  entityId: string,
): Promise<{ avatars: string[]; weights: number[] }> {
  const nodes = await db.dAGNode.findMany({ where: { entityId } });

  // Group by ownerAvatarId; skip black-hole (weight == 0) nodes.
  const avatarWeights = new Map<string, number>();
  for (const n of nodes) {
    if (n.edgeWeight <= 0) continue; // black-hole excluded
    const cur = avatarWeights.get(n.ownerAvatarId) ?? 0;
    avatarWeights.set(n.ownerAvatarId, cur + n.edgeWeight);
  }

  const totalWeight = Array.from(avatarWeights.values()).reduce(
    (s, w) => s + w,
    0,
  );

  if (totalWeight <= 0 || avatarWeights.size === 0) {
    return { avatars: [], weights: [] };
  }

  const avatars: string[] = [];
  const weights: number[] = [];
  for (const [a, w] of avatarWeights.entries()) {
    avatars.push(a);
    weights.push(Math.round((w / totalWeight) * 10000));
  }

  // Fix rounding so weights sum to exactly 10000 (mirrors Solidity uint256
  // division remainder — the largest holder absorbs the dust).
  const sum = weights.reduce((s, w) => s + w, 0);
  if (weights.length > 0 && sum !== 10000) {
    weights[0] += 10000 - sum;
  }

  return { avatars, weights };
}

/**
 * Execute a lineage-aware reward split.
 * Mirrors `CIP_Lineage._executeLineageSplit(entityId, totalAmount)`:
 *
 *   (avatars, weights) = cognitiveDAG.getLineageWeights(entityId);
 *   for (uint i = 0; i < avatars.length; i++) {
 *       uint256 share = (totalAmount * weights[i]) / 10000;
 *       if (share > 0) _transferReward(avatars[i], share);
 *   }
 *
 * NOTE: This function only computes the shares — it does NOT actually
 * transfer funds (it's the simulation view, mirroring the CIP_Lineage
 * routing logic without side-effects on Avatar balances).
 */
export async function executeLineageSplit(
  entityId: string,
  totalRewardAmount: Amount,
): Promise<LineageSplitShareBig[]> {
  const { avatars, weights } = await getLineageWeights(entityId);

  const shares: LineageSplitShareBig[] = [];
  for (let i = 0; i < avatars.length; i++) {
    // share = (totalRewardAmount * weights[i]) / 10000
    const share =
      (totalRewardAmount * BigInt(weights[i])) / 10000n;
    shares.push({
      avatarId: avatars[i],
      weight: weights[i],
      share,
    });
  }
  return shares;
}

/**
 * Heuristic cognitive money-laundering detector.
 *
 * Triggers when ALL of:
 *   - entity has > 10 fused shards (excluding core anchor)
 *   - average eceScore across fused shards < 2000 (20%)
 *   - average similarity to anchor across fused shards < 0.3
 *
 * Returns the suspicious flag, reason, and the list of black-holed nodes.
 */
export async function detectMoneyLaundering(
  entityId: string,
): Promise<MoneyLaunderingResult> {
  const nodes = await db.dAGNode.findMany({ where: { entityId } });
  const fused = nodes.filter((n) => !n.isCoreAnchor);
  const blackHoled = fused.filter((n) => n.edgeWeight === 0);

  const shardCount = fused.length;
  const avgEceScore =
    fused.length > 0
      ? fused.reduce((s, n) => s + n.eceQualityScore, 0) / fused.length
      : 0;
  const avgSimilarity =
    fused.length > 0
      ? fused.reduce((s, n) => s + n.similarityToAnchor, 0) / fused.length
      : 0;

  const suspicious =
    shardCount > 10 && avgEceScore < 2000 && avgSimilarity < 0.3;

  return {
    suspicious,
    reason: suspicious
      ? "Cognitive money-laundering pattern detected"
      : undefined,
    blackHoledNodes: blackHoled.map(serializeNode),
    stats: {
      shardCount,
      avgEceScore,
      avgSimilarity,
    },
  };
}

/**
 * Return all DAG nodes + edges for an entity, serialized.
 * (Convenience helper for the `/api/dag/list` route.)
 */
export async function getEntityGraph(entityId: string): Promise<{
  nodes: DAGNode[];
  edges: DAGEdge[];
}> {
  const [nodes, edges] = await Promise.all([
    db.dAGNode.findMany({ where: { entityId } }),
    db.dAGEdge.findMany({ where: { entityId } }),
  ]);
  return {
    nodes: nodes.map(serializeNode),
    edges: edges.map(serializeEdge),
  };
}

/**
 * Return all DAG nodes + edges grouped by entityId, serialized.
 */
export async function getAllEntityGraphs(): Promise<
  Record<string, { nodes: DAGNode[]; edges: DAGEdge[] }>
> {
  const [nodes, edges] = await Promise.all([
    db.dAGNode.findMany({}),
    db.dAGEdge.findMany({}),
  ]);

  const grouped: Record<string, { nodes: DAGNode[]; edges: DAGEdge[] }> = {};
  for (const n of nodes) {
    if (!grouped[n.entityId]) {
      grouped[n.entityId] = { nodes: [], edges: [] };
    }
    grouped[n.entityId].nodes.push(serializeNode(n));
  }
  for (const e of edges) {
    if (!grouped[e.entityId]) {
      grouped[e.entityId] = { nodes: [], edges: [] };
    }
    grouped[e.entityId].edges.push(serializeEdge(e));
  }
  return grouped;
}

// Re-export serializers in case other modules need them.
export { serializeNode, serializeEdge };
