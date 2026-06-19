// ============================================================
// CIP — Consciousness Inheritance Protocol
// Pure TypeScript mirror of:
//   - CIPRegistry.sol (RFC §5.2, lines 549-608)
//   - CIP_Lineage.sol (RFC §5.2, lines 823-894)
//
// Core idea: identity is anchored to a *cognitive fingerprint*
// (entityId), not to a wallet address. When the physical carrier
// dies / migrates, a new avatar that can prove >= 60% cognitive
// match inherits the consciousness; the active address pointer is
// rotated and all bound CDS SBTs follow the soul automatically.
// ============================================================

import type {
  ConsciousnessRecord,
  CIPMigrationResult,
  CIPMigrationOutcome,
} from "@/lib/types";
import { RFC_CONSTANTS } from "@/lib/types";

// Three-zone threshold model (RFC §5.2 lineage tracking).
//   matchScore is expressed in basis points (0..10000).
//
//   >= PURE_THRESHOLD (8500 / 85%)  -> PURE_INHERITANCE
//   >= MIN_THRESHOLD  (6000 / 60%)  -> FUSION_EMERGENCE (requiresLineageSplit=true)
//   <  MIN_THRESHOLD  (6000 / 60%)  -> HIJACK_REJECTED
//
// The PURE / MIN constants are also exposed in `RFC_CONSTANTS`
// (CIP_PURE_THRESHOLD / CIP_MIN_THRESHOLD) — we re-export them here
// under the exact Solidity names for contract-mirror readability.
export const PURE_THRESHOLD = RFC_CONSTANTS.CIP_PURE_THRESHOLD; // 8500
export const MIN_THRESHOLD = RFC_CONSTANTS.CIP_MIN_THRESHOLD; // 6000

// Error strings (mirror Solidity revert reasons verbatim where possible)
export const CIP_ERRORS = {
  ALREADY_EXISTS: "CIP: Already exists",
  ENTITY_NOT_FOUND: "CIP: Entity not found",
  COGNITION_COMPROMISED: "CIP: Cognition completely compromised (<60%)",
  INVALID_MATCH_SCORE: "CIP: matchScore must be in [0, 10000]",
} as const;

/**
 * Port used by CDS to query the active address for an entity.
 * The runtime implementation wraps a single ConsciousnessRecord
 * (the route has already loaded it by entityId).
 */
export interface CIPRegistryPort {
  getActiveAddress(entityId: string): string | null;
}

/**
 * Wrap a loaded ConsciousnessRecord as a CIPRegistryPort so that
 * the CDS contract can call `cipRegistry.getActiveAddress(entityId)`.
 */
export function asRegistryView(
  record: ConsciousnessRecord,
): CIPRegistryPort {
  return {
    getActiveAddress(entityId: string): string | null {
      if (entityId !== record.entityId) return null;
      return record.currentActiveAddressId;
    },
  };
}

/**
 * CIPRegistry.registerConsciousness (RFC lines 567-575).
 *
 * Pre: `entityId` MUST NOT already exist in the registry — the
 * caller (route) is responsible for enforcing that precondition
 * (mirrors `require(consciousnessMap[entityId].creationTimestamp == 0)`).
 *
 * Pure: does not touch the DB. Returns a fresh ConsciousnessRecord
 * with the creator avatar set as the initial active address.
 */
export function registerConsciousness(
  entityId: string,
  cognitiveRoot: string,
  creatorAvatarId: string,
): ConsciousnessRecord {
  if (!entityId || !entityId.trim()) {
    throw new Error("CIP: entityId is required");
  }
  if (!cognitiveRoot || !cognitiveRoot.trim()) {
    throw new Error("CIP: cognitiveRoot is required");
  }
  if (!creatorAvatarId) {
    throw new Error("CIP: creatorAvatarId is required");
  }
  const now = new Date();
  return {
    id: `cip_${entityId}`,
    entityId,
    cognitiveRoot,
    creationTimestamp: now,
    isDeceasedOrMigrated: false,
    currentActiveAddressId: creatorAvatarId,
    migrationCount: 0,
    lastMatchScore: 0,
  };
}

/**
 * CIP_Lineage._evaluateCognition + CIPRegistry.migrateConsciousness
 * (RFC lines 578-606, 823-894).
 *
 * Mutates `record` in-place on success (mirrors Solidity storage writes).
 * Returns a CIPMigrationResult describing the outcome.
 *
 * Three-zone routing:
 *   matchScore >= 8500  -> PURE_INHERITANCE, no lineage split
 *   6000 <= score < 8500 -> FUSION_EMERGENCE, requiresLineageSplit=true
 *   score < 6000        -> HIJACK_REJECTED, NO state mutation
 */
export function migrateConsciousness(
  record: ConsciousnessRecord,
  newActiveAddressId: string,
  matchScore: number,
): CIPMigrationResult {
  // require(record.creationTimestamp > 0, "CIP: Entity not found")
  if (!record || !record.creationTimestamp) {
    throw new Error(CIP_ERRORS.ENTITY_NOT_FOUND);
  }
  if (!newActiveAddressId) {
    throw new Error("CIP: newActiveAddressId is required");
  }
  if (
    !Number.isInteger(matchScore) ||
    matchScore < 0 ||
    matchScore > RFC_CONSTANTS.BPS_MAX
  ) {
    throw new Error(CIP_ERRORS.INVALID_MATCH_SCORE);
  }

  const oldAddressId = record.currentActiveAddressId;
  const { entityId } = record;

  let outcome: CIPMigrationOutcome;
  let reason: string;
  let requiresLineageSplit: boolean;

  if (matchScore >= PURE_THRESHOLD) {
    outcome = "PURE_INHERITANCE";
    requiresLineageSplit = false;
    reason = `Cognitive match ${(matchScore / 100).toFixed(2)}% >= 85% — pure inheritance, soul follows`;
  } else if (matchScore >= MIN_THRESHOLD) {
    outcome = "FUSION_EMERGENCE";
    requiresLineageSplit = true;
    reason = `Cognitive match ${(matchScore / 100).toFixed(2)}% in fusion band [60%, 85%) — lineage split required`;
  } else {
    outcome = "HIJACK_REJECTED";
    requiresLineageSplit = false;
    reason = CIP_ERRORS.COGNITION_COMPROMISED;
    // IMPORTANT: no state mutation on rejection (RFC: "Cognition completely compromised (<60%)")
    return {
      entityId,
      oldAddressId,
      newAddressId: newActiveAddressId,
      matchScore,
      outcome,
      reason,
      requiresLineageSplit,
    };
  }

  // Success path — mutate the record in-place (mirrors Solidity storage writes)
  record.currentActiveAddressId = newActiveAddressId;
  record.isDeceasedOrMigrated = true; // old carrier is now considered deceased/migrated
  record.migrationCount += 1;
  record.lastMatchScore = matchScore;

  return {
    entityId,
    oldAddressId,
    newAddressId: newActiveAddressId,
    matchScore,
    outcome,
    reason,
    requiresLineageSplit,
  };
}

/**
 * CIPRegistry.getActiveAddress (RFC lines 604-606).
 * Returns the current active avatar id for the consciousness record.
 */
export function getActiveAddress(
  record: ConsciousnessRecord,
): string | null {
  if (!record) return null;
  return record.currentActiveAddressId;
}

/**
 * Helper: classify a matchScore into an outcome without mutating
 * anything. Used by the UI for live preview before the user clicks
 * "Execute Migration".
 */
export function classifyMatchScore(matchScore: number): {
  outcome: CIPMigrationOutcome;
  requiresLineageSplit: boolean;
  band: "pure" | "fusion" | "hijack";
} {
  if (matchScore >= PURE_THRESHOLD) {
    return {
      outcome: "PURE_INHERITANCE",
      requiresLineageSplit: false,
      band: "pure",
    };
  }
  if (matchScore >= MIN_THRESHOLD) {
    return {
      outcome: "FUSION_EMERGENCE",
      requiresLineageSplit: true,
      band: "fusion",
    };
  }
  return {
    outcome: "HIJACK_REJECTED",
    requiresLineageSplit: false,
    band: "hijack",
  };
}
