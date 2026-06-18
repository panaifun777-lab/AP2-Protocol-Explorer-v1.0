"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Play,
  PlayCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  BrainCircuit,
  Network,
  Fingerprint,
  Activity,
  HeartPulse,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Gauge,
  Vote,
  Blocks,
  Coins,
  Rocket,
  Crown,
  Globe,
  ChevronRight,
  AlertTriangle,
  Calculator,
  Zap,
  Hash,
  Clock,
  Database,
  Layers,
} from "lucide-react";
import { PanelHeader, PanelCard, Stat } from "@/components/modules/panel-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { parseFromJson } from "@/lib/types";
import { Label } from "@/components/ui/label";
import {
  TEST_VECTORS,
  MODULE_ACCENTS,
  type TestVectorModule,
} from "@/lib/test-vectors";
import {
  PoUE_STEPS,
  PoRC_STEPS,
  AFC_CHAIN_SPECS,
  COGNITIVE_COPROCESSOR,
  ROADMAP_PHASES,
  COMPUTE_CPDF_WEIGHT,
  type ConsensusStep,
  type CoprocessorLayer,
  type RoadmapPhase,
} from "@/lib/consensus";

// ============================================================
// Types — API response shapes (BigInt-safe after parseFromJson)
// ============================================================

interface VectorMetadata {
  id: string;
  vectorId: string;
  module: TestVectorModule;
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

interface ListResponse {
  vectors: VectorMetadata[];
  history: HistoryRow[];
  stats: {
    totalRuns: number;
    passedRuns: number;
    failedRuns: number;
    uniqueVectors: number;
    totalVectors: number;
  };
  lastResultByVector: Record<
    string,
    { passed: boolean; executedAt: string }
  >;
}

interface ScenarioResultApi {
  scenarioId: string;
  label: string;
  passed: boolean;
  actual: Record<string, unknown>;
  errorMessage?: string;
}

interface RunResultApi {
  vectorId: string;
  rfcCase: string;
  module: TestVectorModule;
  passed: boolean;
  actual: Record<string, unknown>;
  expected: Record<string, unknown>;
  errorMessage?: string;
  scenarioResults?: ScenarioResultApi[];
  executedAt: string;
}

// ============================================================
// Lucide icon resolver — maps string icon names to components
// ============================================================
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Fingerprint,
  Activity,
  HeartPulse,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Gauge,
  Vote,
  Blocks,
  Coins,
  Cpu,
  BrainCircuit,
  Network,
  Rocket,
  Crown,
  Globe,
};

// ============================================================
// Module accent classes (mirror panel-shell accent system)
// ============================================================
const ACCENT_CLASSES: Record<
  "emerald" | "amber" | "violet" | "cyan" | "rose",
  { text: string; bg: string; border: string; dot: string }
> = {
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
  },
  violet: {
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
  },
  cyan: {
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    dot: "bg-cyan-500",
  },
  rose: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
  },
};

function getAccent(mod: TestVectorModule) {
  return ACCENT_CLASSES[MODULE_ACCENTS[mod]];
}

// ============================================================
// Main panel component
// ============================================================
export function TestsPanel() {
  const { toast } = useToast();
  const [data, setData] = React.useState<ListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [runningAll, setRunningAll] = React.useState(false);
  const [runningIds, setRunningIds] = React.useState<Set<string>>(new Set());
  const [results, setResults] = React.useState<
    Record<string, RunResultApi>
  >({});

  // ----- Load vector list + history -----
  const loadList = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tests/list");
      const json = (await res.json()) as { ok: boolean; data?: ListResponse; error?: string };
      if (json.ok && json.data) {
        setData(parseFromJson(json.data));
      } else {
        toast({
          title: "Failed to load test vectors",
          description: json.error ?? "Unknown error",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Network error",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  // ----- Run a single vector -----
  const runVector = React.useCallback(
    async (vectorId: string) => {
      setRunningIds((prev) => new Set(prev).add(vectorId));
      try {
        const res = await fetch("/api/tests/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vectorId }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          data?: RunResultApi;
          error?: string;
        };
        if (json.ok && json.data) {
          const result = parseFromJson(json.data) as RunResultApi;
          setResults((prev) => ({ ...prev, [vectorId]: result }));
          if (result.passed) {
            toast({
              title: `${vectorId} PASSED`,
              description: result.rfcCase,
            });
          } else {
            toast({
              title: `${vectorId} FAILED`,
              description: result.errorMessage ?? "Assertion failed",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: `${vectorId} run failed`,
            description: json.error ?? "Unknown error",
            variant: "destructive",
          });
        }
      } catch (e) {
        toast({
          title: `${vectorId} network error`,
          description: (e as Error).message,
          variant: "destructive",
        });
      } finally {
        setRunningIds((prev) => {
          const next = new Set(prev);
          next.delete(vectorId);
          return next;
        });
        // Refresh history in the background.
        loadList();
      }
    },
    [toast, loadList],
  );

  // ----- Run all 10 vectors sequentially -----
  const runAll = React.useCallback(async () => {
    setRunningAll(true);
    try {
      for (const v of TEST_VECTORS) {
        // Sequential runs so progress is observable.
        await runVector(v.id);
      }
      toast({
        title: "All vectors executed",
        description: "10 RFC test vectors run complete — see results below.",
      });
    } finally {
      setRunningAll(false);
    }
  }, [runVector, toast]);

  return (
    <div>
      <PanelHeader
        icon={FlaskConical}
        title="Test Vectors & PoUE/PoRC Consensus"
        rfcSection="RFC §三 / §4.2"
        description="RFC test vector runner (10 vectors across all 6 modules) + AFC chain consensus visualization (PoUE admission + PoRC block production)."
        accent="cyan"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadList}
            disabled={loading}
            className="font-mono text-xs"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />

      <Tabs defaultValue="vectors" className="w-full">
        <TabsList className="font-mono text-xs">
          <TabsTrigger value="vectors" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Test Vectors
          </TabsTrigger>
          <TabsTrigger value="consensus" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            PoUE / PoRC Consensus
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* TAB 1: Test Vectors                                          */}
        {/* ============================================================ */}
        <TabsContent value="vectors" className="space-y-6">
          {/* Stats row + Run All button */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Total Vectors"
              value={data?.stats.totalVectors ?? 10}
              hint="RFC §三 + §5.2 §四"
              accent="cyan"
            />
            <Stat
              label="Passed"
              value={
                data ? countRecentPassed(data, results) : "—"
              }
              hint="Latest run per vector"
              accent="emerald"
            />
            <Stat
              label="Failed"
              value={data ? countRecentFailed(data, results) : "—"}
              hint="Latest run per vector"
              accent="rose"
            />
            <Stat
              label="History Rows"
              value={data?.stats.totalRuns ?? 0}
              hint="Persisted test runs"
              accent="violet"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={runAll}
              disabled={runningAll}
              className="bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 font-mono text-sm"
            >
              {runningAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {runningAll ? "Running All…" : "Run All Vectors"}
            </Button>
            <span className="font-mono text-[11px] text-muted-foreground">
              Each vector runs the live contract logic deterministically — no DB writes during the test.
            </span>
          </div>

          {runningAll && (
            <Progress value={getRunAllProgress(runningIds, results)} className="h-1" />
          )}

          {/* Vector cards grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {TEST_VECTORS.map((v) => (
              <TestVectorCard
                key={v.id}
                vector={v}
                metadata={data?.vectors.find((m) => m.id === v.id)}
                lastResult={
                  results[v.id] ?? null
                }
                lastFromHistory={
                  data?.lastResultByVector[v.id] ?? null
                }
                running={runningIds.has(v.id)}
                onRun={() => runVector(v.id)}
              />
            ))}
          </div>

          {/* History table */}
          <PanelCard
            title="Run History (latest 50)"
            icon={Clock}
            action={
              <Badge variant="outline" className="font-mono text-[10px]">
                {data?.history.length ?? 0} rows
              </Badge>
            }
          >
            <ScrollArea className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-[10px] uppercase">
                      Vector
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">
                      Module
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">
                      Result
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">
                      Error
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">
                      Executed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data && data.history.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-xs text-muted-foreground py-8 font-mono"
                      >
                        No test runs yet — click “Run All Vectors” above to execute the RFC suite.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.history.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">
                        {row.vectorId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono text-[10px]",
                            getAccent(
                              row.module as TestVectorModule,
                            ).text,
                            getAccent(row.module as TestVectorModule)
                              .border,
                          )}
                        >
                          {row.module}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.passed ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-rose-600 dark:text-rose-400">
                            <XCircle className="h-3.5 w-3.5" /> FAILED
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate font-mono text-[11px] text-muted-foreground">
                        {row.errorMessage ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {row.executedAt
                          ? new Date(row.executedAt).toLocaleString()
                          : new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </PanelCard>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 2: PoUE / PoRC Consensus                                 */}
        {/* ============================================================ */}
        <TabsContent value="consensus" className="space-y-6">
          {/* AFC Chain specs */}
          <PanelCard
            title="AFC Chain Specifications"
            icon={Zap}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <SpecTile label="Consensus" value={AFC_CHAIN_SPECS.consensus} icon={ShieldCheck} accent="emerald" />
              <SpecTile label="TPS" value={AFC_CHAIN_SPECS.tps} icon={Zap} accent="cyan" />
              <SpecTile label="Block Time" value={AFC_CHAIN_SPECS.blockTime} icon={Clock} accent="amber" />
              <SpecTile label="Native Token" value={AFC_CHAIN_SPECS.nativeToken} icon={Coins} accent="violet" />
              <SpecTile label="Coprocessor" value={AFC_CHAIN_SPECS.coprocessor} icon={Cpu} accent="cyan" />
              <SpecTile label="Storage" value={AFC_CHAIN_SPECS.storage} icon={Database} accent="emerald" />
              <SpecTile label="Finality" value={AFC_CHAIN_SPECS.finality} icon={CheckCircle2} accent="amber" />
              <SpecTile label="Sybil Resistance" value={AFC_CHAIN_SPECS.sybilResistance} icon={Fingerprint} accent="rose" />
            </div>
          </PanelCard>

          {/* PoUE + PoRC two-column flow */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ConsensusFlowCard
              title="PoUE — Proof of Unique Entity"
              subtitle="Admission Gate (RFC §4.2)"
              steps={PoUE_STEPS}
              accent="emerald"
              tag="准入共识"
            />
            <ConsensusFlowCard
              title="PoRC — Proof of Resonant Cognition"
              subtitle="Block Production (RFC §4.2)"
              steps={PoRC_STEPS}
              accent="cyan"
              tag="出块共识"
            />
          </div>

          {/* Cognitive Coprocessor */}
          <PanelCard
            title="Cognitive Coprocessor Stack"
            icon={BrainCircuit}
          >
            <p className="mb-4 text-xs text-muted-foreground">
              The AFC chain doesn’t verify raw biometric or cognitive data on-chain.
              Instead, a <span className="font-mono text-cyan-600 dark:text-cyan-400">Cognitive Coprocessor</span> stack
              runs the heavy ML / privacy primitives off-chain, producing succinct ZK proofs
              that the chain verifies in O(1).
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {COGNITIVE_COPROCESSOR.map((layer) => (
                <CoprocessorCard key={layer.id} layer={layer} />
              ))}
            </div>
          </PanelCard>

          {/* CPDF Calculator */}
          <CPDFCalculator />

          {/* Phase Roadmap */}
          <PhaseRoadmap />

          <Alert className="border-cyan-500/30 bg-cyan-500/5">
            <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <AlertTitle className="font-mono text-xs text-cyan-600 dark:text-cyan-400">
              RFC §4.2 — A cognition-driven, entity-unique chain
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              PoUE ensures every participating avatar is a unique living digital entity (Sybil resistance).
              PoRC replaces hash-power / stake with cognitive-value contribution: the avatar whose shard
              delivers the most entropy reduction in a round earns the next block. Combined with the
              Cognitive Coprocessor (TEE + ZK-ML + native graph storage), AFC chain achieves 10,000+ TPS
              while keeping biometric and cognitive data private.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Helpers — compute latest pass/fail counts
// ============================================================
function countRecentPassed(data: ListResponse, results: Record<string, RunResultApi>): number {
  let count = 0;
  for (const v of TEST_VECTORS) {
    const r = results[v.id];
    if (r) {
      if (r.passed) count++;
    } else if (data.lastResultByVector[v.id]?.passed) {
      count++;
    }
  }
  return count;
}

function countRecentFailed(data: ListResponse, results: Record<string, RunResultApi>): number {
  let count = 0;
  for (const v of TEST_VECTORS) {
    const r = results[v.id];
    if (r) {
      if (!r.passed) count++;
    } else if (data.lastResultByVector[v.id] && !data.lastResultByVector[v.id].passed) {
      count++;
    }
  }
  return count;
}

function getRunAllProgress(
  runningIds: Set<string>,
  results: Record<string, RunResultApi>,
): number {
  const done = TEST_VECTORS.filter(
    (v) => !runningIds.has(v.id) && results[v.id],
  ).length;
  return (done / TEST_VECTORS.length) * 100;
}

// ============================================================
// Sub-component: TestVectorCard
// ============================================================
function TestVectorCard({
  vector,
  metadata,
  lastResult,
  lastFromHistory,
  running,
  onRun,
}: {
  vector: (typeof TEST_VECTORS)[number];
  metadata?: VectorMetadata;
  lastResult: RunResultApi | null;
  lastFromHistory: { passed: boolean; executedAt: string } | null;
  running: boolean;
  onRun: () => void;
}) {
  const accent = getAccent(vector.module);
  const hasScenario = (metadata?.scenarioCount ?? vector.scenarios?.length ?? 0) > 0;

  // The "current" result is the live one (results[v.id]) if present,
  // otherwise we synthesize a stub from history for display.
  const liveResult: RunResultApi | null = lastResult;
  const lastHistoricalPassed = lastFromHistory?.passed;

  const passed = liveResult?.passed ?? lastHistoricalPassed ?? null;

  return (
    <Card
      className={cn(
        "border-border/60 transition-colors",
        passed === true && "border-emerald-500/40",
        passed === false && "border-rose-500/40",
      )}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={cn(
                "font-mono text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
              )}
            >
              {vector.id}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-[10px] uppercase",
                accent.text,
                accent.border,
              )}
            >
              {vector.module}
            </Badge>
            {hasScenario && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30"
              >
                {vector.scenarios?.length ?? 0} scenarios
              </Badge>
            )}
          </div>
          <PassFailIndicator passed={passed} running={running} />
        </div>

        {/* Title + RFC ref */}
        <h3 className="mt-3 font-mono text-sm font-bold leading-tight">
          {vector.title}
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {vector.rfcRef}
        </p>

        {/* Description */}
        <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
          {vector.description}
        </p>

        {/* Expected outcome */}
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            Expected:
          </span>
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px]",
              "border-cyan-500/30 text-cyan-600 dark:text-cyan-400",
            )}
          >
            {vector.expected.outcome}
          </Badge>
        </div>

        {/* Run button */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRun}
            disabled={running}
            className={cn(
              "font-mono text-xs h-7",
              "border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10",
            )}
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {running ? "Running…" : "Run"}
          </Button>
          {vector.apiEndpoint && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {vector.apiMethod} {vector.apiEndpoint}
            </span>
          )}
        </div>

        {/* Live result (AnimatePresence) */}
        <AnimatePresence>
          {liveResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Separator className="my-3" />
              {/* Scenarios (TV3 / TV4) */}
              {liveResult.scenarioResults &&
                liveResult.scenarioResults.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {liveResult.scenarioResults.map((s) => (
                      <div
                        key={s.scenarioId}
                        className={cn(
                          "rounded-md border p-2",
                          s.passed
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-rose-500/30 bg-rose-500/5",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-foreground">
                            {s.scenarioId}
                          </span>
                          {s.passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {s.label}
                        </p>
                        {!s.passed && s.errorMessage && (
                          <p className="mt-1 font-mono text-[10px] text-rose-600 dark:text-rose-400">
                            {s.errorMessage}
                          </p>
                        )}
                        <pre className="mt-1 max-h-24 overflow-y-auto rounded bg-muted/50 p-1.5 font-mono text-[10px] text-muted-foreground">
                          {JSON.stringify(s.actual, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              {/* Single-scenario actual result */}
              {(!liveResult.scenarioResults ||
                liveResult.scenarioResults.length === 0) && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      Actual:
                    </span>
                    <Badge
                      className={cn(
                        "font-mono text-[10px]",
                        liveResult.passed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
                      )}
                    >
                      {liveResult.passed ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                  {liveResult.errorMessage && (
                    <p className="mt-1.5 font-mono text-[10px] text-rose-600 dark:text-rose-400">
                      {liveResult.errorMessage}
                    </p>
                  )}
                  <pre className="mt-1.5 max-h-32 overflow-y-auto rounded bg-muted/50 p-1.5 font-mono text-[10px] text-muted-foreground">
                    {JSON.stringify(liveResult.actual, null, 2)}
                  </pre>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Sub-component: PassFailIndicator
// ============================================================
function PassFailIndicator({
  passed,
  running,
}: {
  passed: boolean | null;
  running: boolean;
}) {
  if (running) {
    return <Loader2 className="h-4 w-4 animate-spin text-cyan-600 dark:text-cyan-400" />;
  }
  if (passed === true) {
    return (
      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
    );
  }
  if (passed === false) {
    return <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
  }
  return (
    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
  );
}

// ============================================================
// Sub-component: SpecTile
// ============================================================
function SpecTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "emerald" | "amber" | "violet" | "cyan" | "rose";
}) {
  const a = ACCENT_CLASSES[accent];
  return (
    <div className={cn("rounded-lg border p-3", a.border, a.bg)}>
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("h-3 w-3", a.text)} />
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-sm font-bold", a.text)}>
        {value}
      </div>
    </div>
  );
}

// ============================================================
// Sub-component: ConsensusFlowCard (vertical stepper)
// ============================================================
function ConsensusFlowCard({
  title,
  subtitle,
  steps,
  accent,
  tag,
}: {
  title: string;
  subtitle: string;
  steps: ConsensusStep[];
  accent: "emerald" | "cyan";
  tag: string;
}) {
  const a = ACCENT_CLASSES[accent];
  return (
    <Card className={cn("border-border/60", a.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn("font-mono text-sm", a.text)}>
              {title}
            </CardTitle>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("font-mono text-[10px]", a.text, a.border)}
          >
            {tag}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className={cn(
              "absolute left-[19px] top-3 bottom-3 w-0.5 rounded-full",
              a.bg,
            )}
          />
          <ol className="space-y-3">
            {steps.map((step, idx) => {
              const Icon = ICON_MAP[step.icon] ?? Sparkles;
              return (
                <motion.li
                  key={step.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.3 }}
                  className="relative flex items-start gap-3"
                >
                  <div
                    className={cn(
                      "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background",
                      a.border,
                      a.text,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          a.text,
                        )}
                      >
                        STEP {idx + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {step.name}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Sub-component: CoprocessorCard
// ============================================================
function CoprocessorCard({ layer }: { layer: CoprocessorLayer }) {
  const Icon = ICON_MAP[layer.icon] ?? Cpu;
  return (
    <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/30">
          <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
        </div>
        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
          {layer.name}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        {layer.description}
      </p>
    </div>
  );
}

// ============================================================
// Sub-component: CPDF Calculator
// ============================================================
function CPDFCalculator() {
  const [qEce, setQEce] = React.useState(8000);
  const [similarity, setSimilarity] = React.useState(0.65);

  const result = COMPUTE_CPDF_WEIGHT(qEce, similarity);
  const isBlackHole = result.isBlackHole;
  const qNorm = qEce / 10000;

  return (
    <PanelCard
      title="CPDF Calculator — Cognitive Purity Decay Function"
      icon={Calculator}
      action={
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[10px]",
            isBlackHole
              ? "border-rose-500/40 text-rose-600 dark:text-rose-400"
              : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
          )}
        >
          {isBlackHole ? "BLACK HOLE" : "VALID"}
        </Badge>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Sliders */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-mono text-xs">
                <Hash className="h-3 w-3 inline mr-1" />
                Q_ece Score
              </Label>
              <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
                {qEce} / 10000
              </span>
            </div>
            <Slider
              value={[qEce]}
              min={0}
              max={10000}
              step={100}
              onValueChange={(v) => setQEce(v[0] ?? 0)}
            />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Normalized Q = {qNorm.toFixed(4)}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-mono text-xs">
                <Network className="h-3 w-3 inline mr-1" />
                Similarity to Anchor
              </Label>
              <span
                className={cn(
                  "font-mono text-sm font-bold",
                  similarity < 0.3
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-cyan-600 dark:text-cyan-400",
                )}
              >
                {similarity.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[similarity]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(v) => setSimilarity(v[0] ?? 0)}
            />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Floor = 0.30 (below = black hole)
            </p>
          </div>

          <Alert
            className={cn(
              "border",
              isBlackHole
                ? "border-rose-500/40 bg-rose-500/5"
                : "border-emerald-500/40 bg-emerald-500/5",
            )}
          >
            <AlertTriangle
              className={cn(
                "h-4 w-4",
                isBlackHole
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            />
            <AlertDescription className="font-mono text-[11px]">
              {isBlackHole
                ? `BLACK HOLE: similarity ${similarity.toFixed(2)} < 0.30 floor → weight crushed to 0. Shard excluded from lineage.`
                : `Valid shard: weight = 1.0 × ${similarity.toFixed(2)} × e^(-2 × (1 - ${qNorm.toFixed(4)})) = ${result.finalWeight.toFixed(6)}`}
            </AlertDescription>
          </Alert>
        </div>

        {/* Live formula + result */}
        <div className="rounded-lg border border-border/60 bg-card/50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            CPDF Formula
          </div>
          <pre className="mt-2 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
{`W = W_base × similarity × e^(-λ(1 - Q_ece))

where:
  W_base     = 1.0
  similarity = ${similarity.toFixed(4)}
  Q_ece      = ${qEce}/10000 = ${qNorm.toFixed(4)}
  λ          = 2

decayFactor = e^(-2 × (1 - ${qNorm.toFixed(4)}))
            = e^${(-2 * (1 - qNorm)).toFixed(4)}
            = ${result.decayFactor.toFixed(6)}

W = 1.0 × ${similarity.toFixed(4)} × ${result.decayFactor.toFixed(6)}
  = ${result.finalWeight.toFixed(6)}`}
          </pre>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              Final Weight
            </span>
            <motion.span
              key={result.finalWeight.toFixed(4)}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "font-mono text-2xl font-bold",
                isBlackHole
                  ? "text-rose-600 dark:text-rose-400"
                  : result.finalWeight > 0.5
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400",
              )}
            >
              {result.finalWeight.toFixed(6)}
            </motion.span>
          </div>
        </div>
      </div>
    </PanelCard>
  );
}

// ============================================================
// Sub-component: PhaseRoadmap
// ============================================================
function PhaseRoadmap() {
  return (
    <PanelCard
      title="Phase Roadmap — RFC §6"
      icon={Rocket}
    >
      <p className="mb-4 text-xs text-muted-foreground">
        Three-phase AP2 evolution: Base-chain MVP → AFC mainnet with PoUE+PoRC
        consensus → full Phygital symbiosis with global IoT integration.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ROADMAP_PHASES.map((phase, idx) => (
          <PhaseCard key={phase.id} phase={phase} index={idx} />
        ))}
      </div>
    </PanelCard>
  );
}

function PhaseCard({
  phase,
  index,
}: {
  phase: RoadmapPhase;
  index: number;
}) {
  const a = ACCENT_CLASSES[phase.accent];
  const Icon = ICON_MAP[phase.icon] ?? Rocket;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4 }}
      className={cn(
        "relative rounded-lg border p-4",
        a.border,
        a.bg,
      )}
    >
      {/* Phase number ribbon */}
      <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2">
        <span className={cn("font-mono text-[10px] font-bold", a.text)}>
          {index + 1}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border",
            a.border,
            a.bg,
          )}
        >
          <Icon className={cn("h-5 w-5", a.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-mono text-[10px] uppercase", a.text)}>
              {phase.phase}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-[9px] uppercase",
                phase.status === "active"
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : "border-muted-foreground/40 text-muted-foreground",
              )}
            >
              {phase.status === "active" ? "● Active" : "Planned"}
            </Badge>
          </div>
          <h4 className="font-mono text-xs font-bold text-foreground mt-0.5">
            {phase.title}
          </h4>
          <p className="font-mono text-[10px] text-muted-foreground">
            {phase.duration}
          </p>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground mb-3">
        {phase.description}
      </p>

      <ul className="space-y-1">
        {phase.milestones.map((m) => (
          <li
            key={m}
            className="flex items-start gap-1.5 font-mono text-[10px] text-muted-foreground"
          >
            <ChevronRight className={cn("h-3 w-3 mt-0.5 shrink-0", a.text)} />
            <span>{m}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ============================================================
// Local helpers
// ============================================================
