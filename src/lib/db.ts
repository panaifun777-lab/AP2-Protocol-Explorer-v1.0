import { PrismaClient } from '@prisma/client'
import { mkdirSync, existsSync, copyFileSync } from 'fs'
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

    // Try to copy the build-time DB from the bundled location into /tmp.
    // The bundled DB sits relative to the serverless function's cwd.
    const candidates = [
      envUrl.replace('file:', '').replace(/^\.\//, ''),
      join(process.cwd(), 'db', 'custom.db'),
      join('/var/task', 'db', 'custom.db'),
    ]
    if (!existsSync(tmpDbPath)) {
      for (const src of candidates) {
        try {
          if (existsSync(src)) {
            mkdirSync(tmpDir, { recursive: true })
            copyFileSync(src, tmpDbPath)
            break
          }
        } catch {
          // ignore — try next candidate
        }
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