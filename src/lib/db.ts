import { PrismaClient } from '@prisma/client'
import { mkdirSync, existsSync, copyFileSync, renameSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'

// Resolve a writable database path.
// - Local dev: use the DATABASE_URL as-is (file:./db/custom.db relative to cwd).
// - Vercel serverless: the filesystem is read-only EXCEPT /tmp. We copy the
//   build-time-seeded DB into /tmp on first access so reads work, and writes
//   are accepted (though ephemeral per invocation).
function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL
  if (!envUrl) return 'file:./db/custom.db'

  // If it's not a file URL, use as-is (e.g. PostgreSQL).
  if (!envUrl.startsWith('file:')) return envUrl

  // On Vercel (VERCEL env var set), redirect to /tmp which is writable.
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    const tmpDir = '/tmp'
    const tmpDbPath = join(tmpDir, 'ap2-custom.db')

    // If we already have a usable DB in /tmp, use it.
    let needInit = true
    if (existsSync(tmpDbPath)) {
      try {
        const sz = statSync(tmpDbPath).size
        if (sz > 10240) needInit = false // has content
      } catch { /* ignore */ }
    }

    if (needInit) {
      // Try to copy the build-time DB from the bundled location into /tmp.
      const candidates = [
        envUrl.replace('file:', '').replace(/^\.\//, ''),
        join(process.cwd(), 'db', 'custom.db'),
        join('/var/task', 'db', 'custom.db'),
        join('/var/task', 'custom.db'),
        join('/var/event', 'db', 'custom.db'),
      ]
      let copied = false
      for (const src of candidates) {
        try {
          if (existsSync(src)) {
            const sz = statSync(src).size
            if (sz > 10240) {
              mkdirSync(tmpDir, { recursive: true })
              const staging = tmpDbPath + '.staging'
              copyFileSync(src, staging)
              renameSync(staging, tmpDbPath)
              copied = true
              break
            }
          }
        } catch {
          // ignore — try next candidate
        }
      }

      // If no seeded DB was found bundled, create an empty file. The seed
      // API route will detect missing tables and run schema creation via
      // $executeRawUnsafe (see /api/seed route).
      if (!copied) {
        try {
          mkdirSync(tmpDir, { recursive: true })
          if (!existsSync(tmpDbPath)) writeFileSync(tmpDbPath, Buffer.alloc(0))
        } catch { /* ignore */ }
      }
    }
    return `file:${tmpDbPath}`
  }

  return envUrl
}

const databaseUrl = resolveDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
    datasources: { db: { url: databaseUrl } },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Schema bootstrap SQL — creates all tables IF NOT EXISTS. Used by /api/seed
// when running on Vercel serverless where the bundled DB may be empty.
// Mirrors prisma/schema.prisma structure (SQLite types, BigInt stored as TEXT).
export const SCHEMA_BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS "Avatar" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "address" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'avatar',
  "cognitiveRoot" TEXT,
  "reputation" INTEGER NOT NULL DEFAULT 0,
  "isUniqueEntity" BOOLEAN NOT NULL DEFAULT false,
  "poueProofHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Avatar_address_key" UNIQUE ("address")
);
CREATE TABLE IF NOT EXISTS "BudgetFence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "avatarId" TEXT NOT NULL,
  "dailyCap" BIGINT NOT NULL DEFAULT 1000000000,
  "dailySpent" BIGINT NOT NULL DEFAULT 0,
  "allowedScopes" TEXT NOT NULL DEFAULT 'legal,compliance,research',
  "decayingThreshold" BIGINT NOT NULL DEFAULT 10000000,
  "authDecayFactor" REAL NOT NULL DEFAULT 1.0,
  "lastResetAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "BudgetFence_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "BudgetFence_avatarId_idx" ON "BudgetFence"("avatarId");
CREATE TABLE IF NOT EXISTS "Escrow" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "payerId" TEXT NOT NULL,
  "payeeId" TEXT NOT NULL,
  "totalAmount" BIGINT NOT NULL,
  "releasedAmount" BIGINT NOT NULL DEFAULT 0,
  "scope" TEXT NOT NULL,
  "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endTime" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Streaming',
  "qualityScore" INTEGER NOT NULL DEFAULT 0,
  "completionPct" INTEGER NOT NULL DEFAULT 0,
  "mcpProofHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Escrow_taskId_key" UNIQUE ("taskId"),
  CONSTRAINT "Escrow_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Escrow_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Escrow_payerId_idx" ON "Escrow"("payerId");
CREATE INDEX IF NOT EXISTS "Escrow_payeeId_idx" ON "Escrow"("payeeId");
CREATE INDEX IF NOT EXISTS "Escrow_status_idx" ON "Escrow"("status");
CREATE TABLE IF NOT EXISTS "CognitiveAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cognitiveHash" TEXT NOT NULL,
  "creatorAvatarId" TEXT NOT NULL,
  "initialVariance" INTEGER NOT NULL,
  "initialMean" INTEGER NOT NULL,
  "lockTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unlockTimestamp" DATETIME NOT NULL,
  "isRetroactiveTriggered" BOOLEAN NOT NULL DEFAULT false,
  "rewardAmount" BIGINT NOT NULL DEFAULT 0,
  "futureMean" INTEGER NOT NULL DEFAULT 0,
  "futureCitations" INTEGER NOT NULL DEFAULT 0,
  "evolutionFactor" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CognitiveAsset_cognitiveHash_key" UNIQUE ("cognitiveHash"),
  CONSTRAINT "CognitiveAsset_creatorAvatarId_fkey" FOREIGN KEY ("creatorAvatarId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CognitiveAsset_creatorAvatarId_idx" ON "CognitiveAsset"("creatorAvatarId");
CREATE TABLE IF NOT EXISTS "MediocrityPool" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "totalCollected" BIGINT NOT NULL DEFAULT 0,
  "totalDistributed" BIGINT NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "ConsciousnessRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityId" TEXT NOT NULL,
  "cognitiveRoot" TEXT NOT NULL,
  "creationTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isDeceasedOrMigrated" BOOLEAN NOT NULL DEFAULT false,
  "currentActiveAddressId" TEXT,
  "migrationCount" INTEGER NOT NULL DEFAULT 0,
  "lastMatchScore" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ConsciousnessRecord_entityId_key" UNIQUE ("entityId"),
  CONSTRAINT "ConsciousnessRecord_currentActiveAddressId_fkey" FOREIGN KEY ("currentActiveAddressId") REFERENCES "Avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ConsciousnessRecord_entityId_idx" ON "ConsciousnessRecord"("entityId");
CREATE TABLE IF NOT EXISTS "CDSToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenId" INTEGER NOT NULL,
  "entityId" TEXT NOT NULL,
  "ownerAvatarId" TEXT NOT NULL,
  "metadataHash" TEXT NOT NULL,
  "isSoulbound" BOOLEAN NOT NULL DEFAULT true,
  "mintTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CDSToken_tokenId_key" UNIQUE ("tokenId"),
  CONSTRAINT "CDSToken_ownerAvatarId_fkey" FOREIGN KEY ("ownerAvatarId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CDSToken_ownerAvatarId_idx" ON "CDSToken"("ownerAvatarId");
CREATE INDEX IF NOT EXISTS "CDSToken_entityId_idx" ON "CDSToken"("entityId");
CREATE TABLE IF NOT EXISTS "DAGNode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityId" TEXT NOT NULL,
  "ownerAvatarId" TEXT NOT NULL,
  "shardHash" TEXT NOT NULL,
  "isCoreAnchor" BOOLEAN NOT NULL DEFAULT false,
  "eceQualityScore" INTEGER NOT NULL DEFAULT 0,
  "similarityToAnchor" REAL NOT NULL DEFAULT 0,
  "edgeWeight" REAL NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "DAGNode_ownerAvatarId_fkey" FOREIGN KEY ("ownerAvatarId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DAGNode_entityId_idx" ON "DAGNode"("entityId");
CREATE INDEX IF NOT EXISTS "DAGNode_ownerAvatarId_idx" ON "DAGNode"("ownerAvatarId");
CREATE TABLE IF NOT EXISTS "DAGEdge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityId" TEXT NOT NULL,
  "fromNodeId" TEXT NOT NULL,
  "toNodeId" TEXT NOT NULL,
  "weight" REAL NOT NULL DEFAULT 0,
  "eceScore" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DAGEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "DAGNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DAGEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "DAGNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DAGEdge_entityId_idx" ON "DAGEdge"("entityId");
CREATE INDEX IF NOT EXISTS "DAGEdge_fromNodeId_idx" ON "DAGEdge"("fromNodeId");
CREATE INDEX IF NOT EXISTS "DAGEdge_toNodeId_idx" ON "DAGEdge"("toNodeId");
CREATE TABLE IF NOT EXISTS "PhysicsIntent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "intentHash" TEXT NOT NULL,
  "creatorAvatarId" TEXT NOT NULL,
  "afcEscrowAmount" BIGINT NOT NULL,
  "physicsConstraints" TEXT NOT NULL,
  "executorId" TEXT,
  "executionDeadline" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "fidelityScore" INTEGER NOT NULL DEFAULT 0,
  "resonanceScore" INTEGER NOT NULL DEFAULT 0,
  "multiModalProofHash" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PhysicsIntent_intentHash_key" UNIQUE ("intentHash"),
  CONSTRAINT "PhysicsIntent_creatorAvatarId_fkey" FOREIGN KEY ("creatorAvatarId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PhysicsIntent_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "Avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PhysicsIntent_creatorAvatarId_idx" ON "PhysicsIntent"("creatorAvatarId");
CREATE INDEX IF NOT EXISTS "PhysicsIntent_status_idx" ON "PhysicsIntent"("status");
CREATE TABLE IF NOT EXISTS "ECESnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "avatarId" TEXT NOT NULL,
  "cognitiveHash" TEXT,
  "meanScore" INTEGER NOT NULL DEFAULT 0,
  "varianceScore" INTEGER NOT NULL DEFAULT 0,
  "citations" INTEGER NOT NULL DEFAULT 0,
  "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ECESnapshot_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ECESnapshot_avatarId_idx" ON "ECESnapshot"("avatarId");
CREATE INDEX IF NOT EXISTS "ECESnapshot_cognitiveHash_idx" ON "ECESnapshot"("cognitiveHash");
CREATE TABLE IF NOT EXISTS "TestRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "vectorId" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "input" TEXT NOT NULL,
  "expectedResult" TEXT NOT NULL,
  "actualResult" TEXT,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  "errorMessage" TEXT,
  "executedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "_prismerm" ( BLOB );
`
