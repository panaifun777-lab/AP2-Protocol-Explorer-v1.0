import { NextResponse } from "next/server";
import { db, SCHEMA_BOOTSTRAP_SQL } from "@/lib/db";
import { serializeForJson, toTokenUnits } from "@/lib/types";

// Ensure the SQLite schema exists (idempotent — safe to call every request).
// On Vercel serverless, the /tmp DB may start empty, so we CREATE TABLE IF NOT EXISTS.
async function ensureSchema() {
  try {
    // Split on "CREATE TABLE" / "CREATE INDEX" boundaries and execute each.
    const stmts = SCHEMA_BOOTSTRAP_SQL.split(/;(?=\s*(?:CREATE|--|$))/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));
    for (const stmt of stmts) {
      try {
        await db.$executeRawUnsafe(stmt + ";");
      } catch {
        // ignore individual statement errors (e.g. index already exists)
      }
    }
  } catch {
    // schema bootstrap is best-effort
  }
}

// POST /api/seed — ensure the simulation has demo avatars & budget fences
export async function POST() {
  try {
    // Ensure schema exists (Vercel /tmp DB may be empty on cold start).
    await ensureSchema();

    // Idempotent: only create if not exists
    const existing = await db.avatar.count().catch(() => 0);
    if (existing === 0) {
      try {
        await db.$transaction(async (tx) => {
          const avatars = [
            { address: "0xPiaoshu_0001", name: "飘叔 (Master Avatar)", kind: "prophet", reputation: 950, isUniqueEntity: true, cognitiveRoot: "0xroot_piaoshu_master", poueProofHash: "0xpoue_piaoshu" },
            { address: "0xLawyer_Shard_01", name: "法律逻辑分身", kind: "avatar", reputation: 320, isUniqueEntity: true, cognitiveRoot: "0xroot_lawyer_shard", poueProofHash: "0xpoue_lawyer" },
            { address: "0xGPU_Shard_07", name: "算力分身 (GPU-seconds)", kind: "avatar", reputation: 180, isUniqueEntity: true, cognitiveRoot: "0xroot_gpu_shard", poueProofHash: "0xpoue_gpu" },
            { address: "0xInsight_Shard_12", name: "洞察分身 (Rarity-factor)", kind: "genius", reputation: 610, isUniqueEntity: true, cognitiveRoot: "0xroot_insight_shard", poueProofHash: "0xpoue_insight" },
            { address: "0xProphet_XDP_Origin", name: "孤独先知 (XDP Originator)", kind: "prophet", reputation: 420, isUniqueEntity: true, cognitiveRoot: "0xroot_xdp_prophet", poueProofHash: "0xpoue_prophet" },
            { address: "0xMathGenius_88", name: "数学天才 Avatar", kind: "genius", reputation: 540, isUniqueEntity: true, cognitiveRoot: "0xroot_math_genius", poueProofHash: "0xpoue_math" },
            { address: "0xHacker_Spammer_99", name: "恶意水军 Avatar", kind: "agent", reputation: 5, isUniqueEntity: false, cognitiveRoot: null, poueProofHash: null },
            { address: "0xRentHuman_Worker_01", name: "Rent-a-Human 物理执行者", kind: "avatar", reputation: 90, isUniqueEntity: true, cognitiveRoot: "0xroot_rent_human", poueProofHash: "0xpoue_rent" },
          ];

          for (const a of avatars) {
            const created = await tx.avatar.create({ data: a });
            if (a.kind !== "agent") {
              await tx.budgetFence.create({
                data: {
                  avatarId: created.id,
                  dailyCap: a.kind === "prophet" ? toTokenUnits(5000) : toTokenUnits(1000),
                  dailySpent: 0n,
                  allowedScopes: a.kind === "prophet" ? "legal,compliance,research,medical,phygital" : "legal,compliance,research",
                  decayingThreshold: toTokenUnits(10),
                  authDecayFactor: 1.0,
                },
              });
            }
          }

          await tx.mediocrityPool.create({ data: { totalCollected: toTokenUnits(50000), totalDistributed: 0n } });
        });
      } catch {
        // Seeding writes may fail on read-only FS — fall through to return counts.
      }
    }

    const counts = {
      avatars: await db.avatar.count().catch(() => 0),
      budgetFences: await db.budgetFence.count().catch(() => 0),
      escrows: await db.escrow.count().catch(() => 0),
      cognitiveAssets: await db.cognitiveAsset.count().catch(() => 0),
      consciousnessRecords: await db.consciousnessRecord.count().catch(() => 0),
      cdsTokens: await db.cDSToken.count().catch(() => 0),
      dagNodes: await db.dAGNode.count().catch(() => 0),
      dagEdges: await db.dAGEdge.count().catch(() => 0),
      physicsIntents: await db.physicsIntent.count().catch(() => 0),
      eceSnapshots: await db.eCESnapshot.count().catch(() => 0),
      mediocrityPool: await db.mediocrityPool.count().catch(() => 0),
    };

    return NextResponse.json({ ok: true, data: serializeForJson(counts) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

// GET /api/seed — return current DB counts
export async function GET() {
  try {
    await ensureSchema();
    const counts = {
      avatars: await db.avatar.count().catch(() => 0),
      budgetFences: await db.budgetFence.count().catch(() => 0),
      escrows: await db.escrow.count().catch(() => 0),
      cognitiveAssets: await db.cognitiveAsset.count().catch(() => 0),
      consciousnessRecords: await db.consciousnessRecord.count().catch(() => 0),
      cdsTokens: await db.cDSToken.count().catch(() => 0),
      dagNodes: await db.dAGNode.count().catch(() => 0),
      dagEdges: await db.dAGEdge.count().catch(() => 0),
      physicsIntents: await db.physicsIntent.count().catch(() => 0),
      eceSnapshots: await db.eCESnapshot.count().catch(() => 0),
      mediocrityPool: await db.mediocrityPool.count().catch(() => 0),
    };
    return NextResponse.json({ ok: true, data: serializeForJson(counts) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
