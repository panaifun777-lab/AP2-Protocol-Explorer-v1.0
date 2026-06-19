// ============================================================
// CDS — Cross-Dimensional Soulbound Token
// Pure TypeScript mirror of CDSSBT.sol (RFC §5.2, lines 625-670).
//
// The CDS SBT is *polymorphic-soulbound*: it is bound to a
// `entityId` (a cognitive entity), NOT to a wallet address.
// When CIP triggers a consciousness migration, the SBT's owner
// pointer is rotated to the new active address — tokenId and
// metadataHash are UNCHANGED. Manual transferFrom ALWAYS reverts.
// ============================================================

import type { CDSToken } from "@/lib/types";
import type { CIPRegistryPort } from "./cip";

export const CDS_ERRORS = {
  ENTITY_NOT_ACTIVE: "CDS: Entity not active",
  ONLY_CIP: "CDS: Only CIP Registry can trigger soul transfer",
  ALREADY_AT_ACTIVE: "CDS: Already at active address",
  MANUAL_TRANSFER_FORBIDDEN:
    "CDS: Soulbound token cannot be manually transferred. Only Consciousness Migration allowed.",
  TOKEN_NOT_FOUND: "CDS: token not found",
  NOT_SOULBOUND: "CDS: token is not soulbound",
} as const;

/**
 * CDSSBT.mint (RFC lines 640-647).
 *
 * Mints a new SBT bound to `entityId`. The owner is resolved via
 * `cipRegistry.getActiveAddress(entityId)` — the token follows the
 * active consciousness, not the minter's address.
 *
 * Pure: does not touch the DB. Returns a fresh CDSToken with
 * `isSoulbound = true`.
 */
export function mint(
  cipRegistry: CIPRegistryPort,
  entityId: string,
  tokenId: number,
  metadataHash: string,
): CDSToken {
  if (!entityId) {
    throw new Error("CDS: entityId is required");
  }
  if (!Number.isInteger(tokenId) || tokenId <= 0) {
    throw new Error("CDS: tokenId must be a positive integer");
  }
  if (!metadataHash || !metadataHash.trim()) {
    throw new Error("CDS: metadataHash is required");
  }
  const ownerAvatarId = cipRegistry.getActiveAddress(entityId);
  // require(activeAddr != address(0), "CDS: Entity not active")
  if (!ownerAvatarId) {
    throw new Error(CDS_ERRORS.ENTITY_NOT_ACTIVE);
  }
  return {
    id: `cds_${tokenId}`,
    tokenId,
    entityId,
    ownerAvatarId,
    metadataHash,
    isSoulbound: true,
    mintTimestamp: new Date(),
  };
}

/**
 * CDSSBT.soulTransfer (RFC lines 651-663).
 *
 * ONLY callable by CIP (the caller is responsible for enforcing this
 * — the route does so by virtue of being reached only via the CIP
 * migration path). Burns the SBT from the old owner and re-mints to
 * the new active address. TokenId + metadataHash + entityId + isSoulbound
 * are ALL preserved — only the ownerAvatarId pointer changes.
 *
 * Pure: returns a NEW CDSToken object; the route persists the change.
 */
export function soulTransfer(
  token: CDSToken,
  newActiveAddressId: string,
): CDSToken {
  if (!token) {
    throw new Error(CDS_ERRORS.TOKEN_NOT_FOUND);
  }
  if (!token.isSoulbound) {
    throw new Error(CDS_ERRORS.NOT_SOULBOUND);
  }
  if (!newActiveAddressId) {
    throw new Error("CDS: newActiveAddressId is required");
  }
  // require(currentOwner != newActiveAddr, "CDS: Already at active address")
  if (token.ownerAvatarId === newActiveAddressId) {
    throw new Error(CDS_ERRORS.ALREADY_AT_ACTIVE);
  }
  // _burn(currentOwner, tokenId); _safeMint(newActiveAddr, tokenId);
  // tokenId + metadataHash UNCHANGED — only owner pointer rotates.
  return {
    ...token,
    ownerAvatarId: newActiveAddressId,
  };
}

/**
 * CDSSBT.transferFrom (RFC lines 667-669).
 *
 * Override that ALWAYS reverts. Manual transfers (whether by the
 * owner, an operator, or a malicious actor) are forbidden — the SBT
 * can only move via soulTransfer triggered by CIP migration.
 *
 * This function always throws — callers should catch and surface the
 * error message as a toast / 400 response.
 */
export function attemptManualTransfer(): never {
  throw new Error(CDS_ERRORS.MANUAL_TRANSFER_FORBIDDEN);
}

/**
 * Convenience wrapper that lets the UI / route call manual transfer
 * with explicit (ignored) arguments, mirroring the ERC-721 signature
 * `transferFrom(from, to, tokenId)`. Always rejects.
 */
export function transferFrom(
  _from: string,
  _to: string,
  _tokenId: number,
): never {
  void _from;
  void _to;
  void _tokenId;
  throw new Error(CDS_ERRORS.MANUAL_TRANSFER_FORBIDDEN);
}
