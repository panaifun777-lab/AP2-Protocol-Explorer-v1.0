import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeForJson } from "@/lib/types";
import { TEST_VECTORS } from "@/lib/test-vectors";

// ============================================================
// GET /api/tests/list
// Returns:
//   - vectors: metadata for all 10 RFC test vectors (no runSpec
//     internals — just enough for the UI to render cards).
//   - history: recent TestRun rows (latest 50, newest first).
//   - stats: aggregate pass/fail counts.
// ============================================================

interface VectorMetadata {
  id: string;
  vectorId: string;
  module: string;
  title: string;
  description: string;
  rfcRef: string;
  expectedOutcome: string;
  apiEndpoint: string;
  apiMethod: string;
  scenarioCount: number;
}

interface HistoryRow {
  id: string;
  vectorId: string;
  module: string;
  passed: boolean;
  errorMessage: string | null;
  executedAt: string | null;
  createdAt: string;
}

export async function GET() {
  try {
    const vectors: VectorMetadata[] = TEST_VECTORS.map((v) => ({
      id: v.id,
      vectorId: v.vectorId,
      module: v.module,
      title: v.title,
      description: v.description,
      rfcRef: v.rfcRef,
      expectedOutcome: v.expected.outcome,
      apiEndpoint: v.apiEndpoint,
      apiMethod: v.apiMethod,
      scenarioCount: v.scenarios?.length ?? 0,
    }));

    // Load recent history (latest 50 rows).
    const rows = await db.testRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const history: HistoryRow[] = rows.map((r) => ({
      id: r.id,
      vectorId: r.vectorId,
      module: r.module,
      passed: r.passed,
      errorMessage: r.errorMessage,
      executedAt: r.executedAt ? r.executedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));

    // Aggregate stats.
    const totalRuns = rows.length;
    const passedRuns = rows.filter((r) => r.passed).length;
    const failedRuns = totalRuns - passedRuns;
    const uniqueVectors = new Set(rows.map((r) => r.vectorId)).size;

    // Last result per vector (for the card grid's quick status).
    const lastResultByVector: Record<
      string,
      { passed: boolean; executedAt: string }
    > = {};
    for (const r of rows) {
      if (!lastResultByVector[r.vectorId]) {
        lastResultByVector[r.vectorId] = {
          passed: r.passed,
          executedAt: r.executedAt
            ? r.executedAt.toISOString()
            : r.createdAt.toISOString(),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      data: serializeForJson({
        vectors,
        history,
        stats: {
          totalRuns,
          passedRuns,
          failedRuns,
          uniqueVectors,
          totalVectors: TEST_VECTORS.length,
        },
        lastResultByVector,
      }),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
