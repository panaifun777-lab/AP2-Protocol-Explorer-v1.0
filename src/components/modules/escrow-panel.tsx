"use client";

import * as React from "react";
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Droplet,
  FlaskConical,
  Bug,
  ArrowRightCircle,
  Activity,
} from "lucide-react";
import { PanelHeader, PanelCard, Stat } from "./panel-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  formatToken,
  fromTokenUnits,
  type Amount,
  type Avatar,
  type BudgetFence,
  type Escrow,
  type EscrowStatus,
} from "@/lib/types";

// ============================================================
// Types & helpers
// ============================================================

interface AvatarWithFence {
  avatar: Avatar;
  fence: BudgetFence | null;
}

interface EscrowRow extends Escrow {
  payerName: string;
  payerAddress: string;
  payerKind: string;
  payeeName: string;
  payeeAddress: string;
  payeeKind: string;
}

// Parse a value that may be a serialized bigint ("__bigint__123") or
// already a bigint/number into a bigint. Returns 0n for falsy inputs.
function parseAmount(v: unknown): bigint {
  if (v === null || v === undefined) return 0n;
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.trunc(v));
  if (typeof v === "string") {
    if (v.startsWith("__bigint__")) return BigInt(v.slice("__bigint__".length));
    try {
      return BigInt(v);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

// Walk an unknown payload and revive __bigint__ strings to real bigints.
function reviveBigints<T>(v: T): T {
  if (v === null || typeof v !== "object") return v;
  const reviver = (_k: string, val: unknown): unknown => {
    if (typeof val === "string" && val.startsWith("__bigint__")) {
      return BigInt(val.slice("__bigint__".length));
    }
    return val;
  };
  return JSON.parse(JSON.stringify(v), reviver) as T;
}

const SCOPE_OPTIONS = [
  "legal",
  "compliance",
  "research",
  "medical",
  "phygital",
  "medical_diagnosis",
];

const STATUS_VARIANT: Record<
  EscrowStatus,
  "emerald" | "amber" | "violet" | "cyan" | "rose"
> = {
  Created: "violet",
  Streaming: "emerald",
  Completed: "cyan",
  Disputed: "rose",
  Refunded: "amber",
};

function StatusBadge({ status }: { status: EscrowStatus }) {
  const accent = STATUS_VARIANT[status];
  const cls = {
    emerald:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet:
      "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  }[accent];
  return (
    <Badge variant="outline" className={`font-mono text-[10px] ${cls}`}>
      {status}
    </Badge>
  );
}

function pct(a: bigint, b: bigint): number {
  if (b <= 0n) return 0;
  // Use floating division for display progress (0-100).
  const av = Number(a);
  const bv = Number(b);
  if (bv === 0) return 0;
  return Math.min(100, Math.max(0, (av / bv) * 100));
}

function shortHash(s: string, len = 10): string {
  if (s.length <= len * 2) return s;
  return `${s.slice(0, len)}…${s.slice(-6)}`;
}

// ============================================================
// Main panel
// ============================================================

export function EscrowPanel() {
  const { toast } = useToast();
  const [avatars, setAvatars] = React.useState<AvatarWithFence[]>([]);
  const [escrows, setEscrows] = React.useState<EscrowRow[]>([]);
  const [loadingAvatars, setLoadingAvatars] = React.useState(false);
  const [loadingEscrows, setLoadingEscrows] = React.useState(false);

  // Create escrow form state
  const [payerAddress, setPayerAddress] = React.useState("");
  const [payeeAddress, setPayeeAddress] = React.useState("");
  const [amountUsdc, setAmountUsdc] = React.useState("50");
  const [scope, setScope] = React.useState("legal");
  const [durationSeconds, setDurationSeconds] = React.useState("60");
  const [creating, setCreating] = React.useState(false);

  // Active escrow inspector state
  const [selectedEscrowId, setSelectedEscrowId] = React.useState<string | null>(
    null,
  );
  const [verifyPct, setVerifyPct] = React.useState(80);
  const [qualityScore, setQualityScore] = React.useState(70);
  const [streaming, setStreaming] = React.useState(false);
  const [settling, setSettling] = React.useState(false);

  // BudgetFence inspector state
  const [selectedFenceAvatarId, setSelectedFenceAvatarId] = React.useState<
    string | null
  >(null);

  // ---------------- Data fetching ----------------
  const fetchAvatars = React.useCallback(async () => {
    setLoadingAvatars(true);
    try {
      const res = await fetch("/api/escrow/avatars");
      const json = await res.json();
      if (json.ok) {
        const revived = reviveBigints<AvatarWithFence[]>(json.data ?? []);
        setAvatars(revived);
        // Auto-select first non-null fence avatar for inspector
        if (!selectedFenceAvatarId) {
          const firstWithFence = revived.find((x) => x.fence);
          if (firstWithFence) setSelectedFenceAvatarId(firstWithFence.avatar.id);
        }
        if (!payerAddress) {
          const firstPayer = revived.find((x) => x.fence);
          if (firstPayer) setPayerAddress(firstPayer.avatar.address);
        }
        if (!payeeAddress) {
          const firstPayee = revived.find(
            (x) => x.avatar.id !== (revived.find((y) => y.fence)?.avatar.id ?? ""),
          );
          if (firstPayee) setPayeeAddress(firstPayee.avatar.address);
        }
      } else {
        toast({
          title: "Failed to load avatars",
          description: json.error,
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
      setLoadingAvatars(false);
    }
  }, [selectedFenceAvatarId, payerAddress, payeeAddress, toast]);

  const fetchEscrows = React.useCallback(async () => {
    setLoadingEscrows(true);
    try {
      const res = await fetch("/api/escrow/list");
      const json = await res.json();
      if (json.ok) {
        const revived = reviveBigints<EscrowRow[]>(json.data ?? []);
        setEscrows(revived);
        // Auto-select most recent escrow if none selected
        if (revived.length > 0 && !selectedEscrowId) {
          setSelectedEscrowId(revived[0].taskId);
        }
      } else {
        toast({
          title: "Failed to load escrows",
          description: json.error,
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
      setLoadingEscrows(false);
    }
  }, [selectedEscrowId, toast]);

  React.useEffect(() => {
    void fetchAvatars();
    void fetchEscrows();
    // run-once on mount; deps intentionally empty (fetch fns are stable per-render)
  }, []);

  // ---------------- Stats ----------------
  const stats = React.useMemo(() => {
    const total = escrows.length;
    const streaming = escrows.filter((e) => e.status === "Streaming").length;
    const completed = escrows.filter((e) => e.status === "Completed").length;
    const disputed = escrows.filter((e) => e.status === "Disputed").length;
    return { total, streaming, completed, disputed };
  }, [escrows]);

  // ---------------- Create escrow ----------------
  const createEscrow = React.useCallback(async () => {
    if (!payerAddress || !payeeAddress) {
      toast({
        title: "Missing fields",
        description: "Payer and payee are required.",
        variant: "destructive",
      });
      return;
    }
    if (payerAddress === payeeAddress) {
      toast({
        title: "Invalid escrow",
        description: "Payer and payee must differ.",
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    try {
      const taskId = `0xtask_${Date.now().toString(16)}_${Math.floor(
        Math.random() * 1e6,
      ).toString(16)}`;
      const res = await fetch("/api/escrow/lock-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          payerAddress,
          payeeAddress,
          amountUsdc: Number(amountUsdc),
          scope,
          durationSeconds: Number(durationSeconds),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({
          title: "Funds locked",
          description: `Escrow ${taskId.slice(0, 18)}… created with status Streaming`,
        });
        await Promise.all([fetchAvatars(), fetchEscrows()]);
        setSelectedEscrowId(taskId);
      } else {
        const checkStatus =
          json.data?.check?.status ?? (json.ok === false ? "REJECT" : "ERROR");
        toast({
          title: `Lock rejected · ${checkStatus}`,
          description: json.error,
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
      setCreating(false);
    }
  }, [
    payerAddress,
    payeeAddress,
    amountUsdc,
    scope,
    durationSeconds,
    toast,
    fetchAvatars,
    fetchEscrows,
  ]);

  // ---------------- Stream release ----------------
  const streamRelease = React.useCallback(
    async (taskId: string) => {
      setStreaming(true);
      try {
        const res = await fetch("/api/escrow/stream-release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        const json = await res.json();
        if (json.ok) {
          const r = reviveBigints<{
            result: {
              releasedAmount: Amount;
              totalReleased: Amount;
              status: EscrowStatus;
            };
            math: {
              elapsedSeconds: number;
              totalDurationSeconds: number;
              timeProgressPct: number;
            };
          }>(json.data);
          toast({
            title: "Stream released",
            description: `+${formatToken(
              r.result.releasedAmount,
            )} → total ${formatToken(r.result.totalReleased)} · ${r.result.status}`,
          });
          await fetchEscrows();
        } else {
          toast({
            title: "Stream release rejected",
            description: json.error,
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
        setStreaming(false);
      }
    },
    [toast, fetchEscrows],
  );

  // ---------------- Verify & settle ----------------
  const verifyAndSettle = React.useCallback(
    async (taskId: string) => {
      setSettling(true);
      try {
        const res = await fetch("/api/escrow/verify-settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            mcpCompletionPct: verifyPct,
            qualityScore,
          }),
        });
        const json = await res.json();
        if (json.ok) {
          const r = reviveBigints<{
            result: {
              success: boolean;
              finalPayout: Amount;
              alreadyReleased: Amount;
              clawbackRequired: Amount;
              refundAmount: Amount;
              status: EscrowStatus;
              reputationDelta: number;
            };
            payeeRepBefore: number;
            payeeRepAfter: number;
          }>(json.data);
          if (r.result.status === "Disputed") {
            toast({
              title: `Dispute triggered · clawback ${formatToken(
                r.result.clawbackRequired,
              )}`,
              description: `Streaming over-paid vs MCP ${verifyPct}% completion. NO transfer (RFC §1 verifyAndSettle).`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Settled · Completed",
              description: `finalPayout ${formatToken(
                r.result.finalPayout,
              )} · refund ${formatToken(
                r.result.refundAmount,
              )} · payee rep ${r.payeeRepBefore} → ${r.payeeRepAfter} (+${r.result.reputationDelta})`,
            });
          }
          await Promise.all([fetchEscrows(), fetchAvatars()]);
        } else {
          toast({
            title: "Settle rejected",
            description: json.error,
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
        setSettling(false);
      }
    },
    [verifyPct, qualityScore, toast, fetchEscrows, fetchAvatars],
  );

  // ---------------- Test: Scope_Lock_Violation ----------------
  // RFC Test Vector 1: lawyer avatar (allowedScopes=legal,compliance,research)
  // attempts lockFunds with scope="medical_diagnosis" → expects REJECT_SCOPE.
  const runScopeLockViolationTest = React.useCallback(async () => {
    const lawyer =
      avatars.find(
        (a) =>
          a.avatar.address.toLowerCase().includes("lawyer") ||
          a.avatar.name.includes("法律"),
      ) ?? avatars.find((a) => a.fence);

    if (!lawyer) {
      toast({
        title: "Test setup failed",
        description: "No suitable avatar found for the scope-violation test.",
        variant: "destructive",
      });
      return;
    }

    const taskId = `0xtv1_scope_${Date.now().toString(16)}`;
    try {
      const res = await fetch("/api/escrow/lock-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          payerAddress: lawyer.avatar.address,
          payeeAddress:
            avatars.find((a) => a.avatar.id !== lawyer.avatar.id)?.avatar
              .address ?? "",
          amountUsdc: 50,
          scope: "medical_diagnosis",
          durationSeconds: 60,
        }),
      });
      const json = await res.json();
      const status = json.data?.check?.status ?? "UNKNOWN";
      const triggeredDecayingAuth = Boolean(
        json.data?.check?.triggeredDecayingAuth,
      );
      const expectedReject = status === "REJECT_SCOPE";
      const passed = expectedReject && !json.ok;

      toast({
        title: passed
          ? `✓ Test Vector 1 PASS · REJECT_SCOPE`
          : `✗ Test Vector 1 FAIL · ${status}`,
        description: `target=${lawyer.avatar.name} scope=medical_diagnosis · triggeredDecayingAuth=${triggeredDecayingAuth} · ${json.error ?? "approved unexpectedly"}`,
        variant: passed ? "default" : "destructive",
      });
      // Refresh fence (dailySpent unchanged since rejected).
      await fetchAvatars();
    } catch (e) {
      toast({
        title: "Test runner error",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  }, [avatars, toast, fetchAvatars]);

  // ---------------- Test: Scope Violation (demo button) ----------------
  // Quick demo: try scope="medical" on the currently-selected fence avatar
  // if that avatar's fence does not include "medical".
  const testScopeViolation = React.useCallback(async () => {
    const target = avatars.find((a) => a.avatar.id === selectedFenceAvatarId);
    if (!target || !target.fence) {
      toast({
        title: "No avatar selected",
        description: "Pick an avatar in the BudgetFence Inspector first.",
        variant: "destructive",
      });
      return;
    }
    const testScope = "medical";
    const violates = !target.fence.allowedScopes.includes(testScope);
    if (!violates) {
      toast({
        title: "Avatar allows 'medical'",
        description: `${target.avatar.name} already permits scope=medical; pick a non-medical avatar to demo the violation.`,
        variant: "destructive",
      });
      return;
    }
    const taskId = `0xtest_scope_${Date.now().toString(16)}`;
    const payee =
      avatars.find((a) => a.avatar.id !== target.avatar.id)?.avatar.address ??
      "";
    try {
      const res = await fetch("/api/escrow/lock-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          payerAddress: target.avatar.address,
          payeeAddress: payee,
          amountUsdc: 5,
          scope: testScope,
          durationSeconds: 60,
        }),
      });
      const json = await res.json();
      const status = json.data?.check?.status ?? "UNKNOWN";
      toast({
        title: status === "REJECT_SCOPE" ? "✓ REJECT_SCOPE" : `Unexpected: ${status}`,
        description: json.error ?? "approved",
        variant: status === "REJECT_SCOPE" ? "default" : "destructive",
      });
    } catch (e) {
      toast({
        title: "Network error",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  }, [avatars, selectedFenceAvatarId, toast]);

  // ---------------- Derived ----------------
  const selectedEscrow = React.useMemo(
    () => escrows.find((e) => e.taskId === selectedEscrowId) ?? null,
    [escrows, selectedEscrowId],
  );
  const selectedFence = React.useMemo(
    () => avatars.find((a) => a.avatar.id === selectedFenceAvatarId) ?? null,
    [avatars, selectedFenceAvatarId],
  );

  // Live "elapsed / total" for the selected escrow — re-rendered every 1s.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const liveElapsedPct = React.useMemo(() => {
    if (!selectedEscrow) return 0;
    const now = Date.now();
    // startTime/endTime may arrive as ISO strings from the API; coerce to Date.
    const start = new Date(selectedEscrow.startTime as unknown as string).getTime();
    const end = new Date(selectedEscrow.endTime as unknown as string).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 100;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  }, [selectedEscrow]);

  return (
    <div>
      <PanelHeader
        icon={Lock}
        title="AP2Escrow + BudgetFence"
        rfcSection="RFC §1 / §5.1"
        description="Streaming payment · Scope Lock · Decaying Auth · MCP verify-and-settle (with clawback path)"
        accent="emerald"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs gap-1"
            onClick={() => {
              void fetchAvatars();
              void fetchEscrows();
            }}
          >
            <Activity className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {/* ===================== STATS ===================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Total Escrows"
          value={stats.total}
          hint="all escrow records"
          accent="emerald"
        />
        <Stat
          label="Streaming"
          value={stats.streaming}
          hint="active streaming-release"
          accent="cyan"
        />
        <Stat
          label="Completed"
          value={stats.completed}
          hint="verifyAndSettle success"
          accent="violet"
        />
        <Stat
          label="Disputed"
          value={stats.disputed}
          hint="clawback triggered"
          accent="rose"
        />
      </div>

      {/* ===================== TWO COLUMN LAYOUT ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ----------- LEFT 60% ----------- */}
        <div className="lg:col-span-3 space-y-4">
          {/* Create Escrow form */}
          <PanelCard title="Create Escrow · lockFunds()" icon={Lock}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Payer (avatar with BudgetFence)
                </label>
                <Select value={payerAddress} onValueChange={setPayerAddress}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payer" />
                  </SelectTrigger>
                  <SelectContent>
                    {avatars
                      .filter((a) => a.fence)
                      .map((a) => (
                        <SelectItem
                          key={a.avatar.id}
                          value={a.avatar.address}
                        >
                          {a.avatar.name} · {a.avatar.address}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Payee
                </label>
                <Select value={payeeAddress} onValueChange={setPayeeAddress}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payee" />
                  </SelectTrigger>
                  <SelectContent>
                    {avatars.map((a) => (
                      <SelectItem
                        key={a.avatar.id}
                        value={a.avatar.address}
                      >
                        {a.avatar.name} · {a.avatar.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Amount (USDC)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountUsdc}
                  onChange={(e) => setAmountUsdc(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Scope
                </label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="scope" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Duration (seconds)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                onClick={createEscrow}
                disabled={creating}
                className="font-mono text-xs gap-1"
              >
                <Lock className="h-3.5 w-3.5" />
                {creating ? "Locking…" : "Lock Funds"}
              </Button>
              <Button
                variant="outline"
                onClick={runScopeLockViolationTest}
                className="font-mono text-xs gap-1 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Run Scope_Lock_Violation Test
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground font-mono leading-relaxed">
              Test Vector 1 (RFC §三): attempts lockFunds with scope=
              <span className="text-rose-500">medical_diagnosis</span> on the
              lawyer avatar (allowedScopes=legal,compliance,research) → expects{" "}
              <span className="text-rose-500">REJECT_SCOPE</span>.
            </p>
          </PanelCard>

          {/* Active Escrows table */}
          <PanelCard
            title="Active Escrows · streamRelease / verifyAndSettle"
            icon={Droplet}
          >
            <div className="max-h-96 overflow-y-auto scrollbar-cyber rounded-md border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-[10px]">
                      Task / Pair
                    </TableHead>
                    <TableHead className="font-mono text-[10px]">
                      Amount
                    </TableHead>
                    <TableHead className="font-mono text-[10px]">
                      Released
                    </TableHead>
                    <TableHead className="font-mono text-[10px]">
                      Scope
                    </TableHead>
                    <TableHead className="font-mono text-[10px]">
                      Status
                    </TableHead>
                    <TableHead className="font-mono text-[10px] text-right">
                      Select
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escrows.length === 0 && !loadingEscrows && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-[11px] text-muted-foreground font-mono py-8"
                      >
                        No escrows yet — create one above.
                      </TableCell>
                    </TableRow>
                  )}
                  {escrows.map((e) => (
                    <TableRow
                      key={e.id}
                      className={
                        e.taskId === selectedEscrowId
                          ? "bg-emerald-500/5"
                          : ""
                      }
                    >
                      <TableCell>
                        <div className="font-mono text-[11px] leading-tight">
                          <div className="text-foreground">
                            {shortHash(e.taskId, 8)}
                          </div>
                          <div className="text-muted-foreground text-[10px]">
                            {e.payerName} → {e.payeeName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">
                        {formatToken(e.totalAmount)}
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">
                        <div>{formatToken(e.releasedAmount)}</div>
                        <div className="mt-1 w-16">
                          <Progress
                            value={pct(e.releasedAmount, e.totalAmount)}
                            className="h-1"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {e.scope}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={
                            e.taskId === selectedEscrowId
                              ? "default"
                              : "ghost"
                          }
                          size="sm"
                          className="font-mono text-[10px] h-7"
                          onClick={() => setSelectedEscrowId(e.taskId)}
                        >
                          {e.taskId === selectedEscrowId ? "Selected" : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </PanelCard>

          {/* Selected Escrow Inspector + Actions */}
          {selectedEscrow && (
            <PanelCard
              title={`Inspector · ${shortHash(selectedEscrow.taskId, 10)}`}
              icon={ArrowRightCircle}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: meta + progress visualizations */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        Payer
                      </div>
                      <div>{selectedEscrow.payerName}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        Payee
                      </div>
                      <div>{selectedEscrow.payeeName}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        Total Amount
                      </div>
                      <div className="text-emerald-600 dark:text-emerald-400">
                        {formatToken(selectedEscrow.totalAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        Released
                      </div>
                      <div className="text-cyan-600 dark:text-cyan-400">
                        {formatToken(selectedEscrow.releasedAmount)} (
                        {pct(
                          selectedEscrow.releasedAmount,
                          selectedEscrow.totalAmount,
                        ).toFixed(1)}
                        %)
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        Start
                      </div>
                      <div className="text-[10px]">
                        {new Date(selectedEscrow.startTime as unknown as string).toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        End
                      </div>
                      <div className="text-[10px]">
                        {new Date(selectedEscrow.endTime as unknown as string).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Time progress visualization */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">
                        Time elapsed / total
                      </span>
                      <span className="text-cyan-600 dark:text-cyan-400">
                        {liveElapsedPct.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={liveElapsedPct}
                      className="h-1.5 bg-cyan-500/10"
                    />
                  </div>

                  {/* Amount-released visualization */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">
                        Released / total
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {(
                          pct(
                            selectedEscrow.releasedAmount,
                            selectedEscrow.totalAmount,
                          ) ?? 0
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={pct(
                        selectedEscrow.releasedAmount,
                        selectedEscrow.totalAmount,
                      )}
                      className="h-1.5 bg-emerald-500/10"
                    />
                  </div>

                  {/* Formula reference */}
                  <div className="rounded-md border border-border/40 bg-card/30 p-2 text-[10px] font-mono text-muted-foreground leading-relaxed">
                    <div>
                      <span className="text-foreground">streamRelease:</span>{" "}
                      releasable = (total × elapsed / duration) − released
                    </div>
                    <div className="mt-1">
                      <span className="text-foreground">verifyAndSettle:</span>{" "}
                      diff = released − (total × pct / 100)
                    </div>
                    <div className="mt-1 text-rose-500">
                      if diff &gt; 0 → Disputed, NO transfer (clawback)
                    </div>
                  </div>
                </div>

                {/* Right: action controls */}
                <div className="space-y-3">
                  {/* Stream Release */}
                  <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Droplet className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-mono text-[11px] font-semibold">
                        streamRelease(taskId)
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                      Calls the streaming-release math. Mirrors Solidity
                      streamRelease — releases accrued amount or remainder on
                      end-time.
                    </p>
                    <Button
                      size="sm"
                      className="w-full font-mono text-xs gap-1"
                      disabled={
                        streaming || selectedEscrow.status !== "Streaming"
                      }
                      onClick={() => void streamRelease(selectedEscrow.taskId)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {streaming ? "Releasing…" : "Stream Release"}
                    </Button>
                  </div>

                  {/* Verify & Settle */}
                  <div className="rounded-md border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />
                      <span className="font-mono text-[11px] font-semibold">
                        verifyAndSettle(taskId, proof, quality)
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">
                          MCP completion %
                        </span>
                        <span className="text-violet-600 dark:text-violet-400">
                          {verifyPct}%
                        </span>
                      </div>
                      <Slider
                        value={[verifyPct]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => setVerifyPct(v[0] ?? 0)}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">
                          Quality score
                        </span>
                        <span className="text-violet-600 dark:text-violet-400">
                          {qualityScore}
                        </span>
                      </div>
                      <Slider
                        value={[qualityScore]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) => setQualityScore(v[0] ?? 0)}
                      />
                    </div>

                    <div className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                      finalPayout = total × {verifyPct}% ={" "}
                      <span className="text-foreground">
                        {formatToken(
                          (selectedEscrow.totalAmount * BigInt(verifyPct)) /
                            100n,
                        )}
                      </span>
                      <br />
                      already released ={" "}
                      <span className="text-foreground">
                        {formatToken(selectedEscrow.releasedAmount)}
                      </span>
                      <br />
                      {selectedEscrow.releasedAmount >
                      (selectedEscrow.totalAmount * BigInt(verifyPct)) /
                        100n ? (
                        <span className="text-rose-500">
                          ⚠ diff &gt; 0 → Disputed, clawback required
                        </span>
                      ) : (
                        <span className="text-emerald-500">
                          ✓ diff ≤ 0 → Completed, refund remaining
                        </span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="default"
                      className="w-full font-mono text-xs gap-1 bg-violet-600 hover:bg-violet-700"
                      disabled={
                        settling ||
                        selectedEscrow.status === "Completed" ||
                        selectedEscrow.status === "Disputed" ||
                        selectedEscrow.status === "Refunded"
                      }
                      onClick={() =>
                        void verifyAndSettle(selectedEscrow.taskId)
                      }
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {settling ? "Settling…" : "Verify & Settle"}
                    </Button>
                  </div>
                </div>
              </div>
            </PanelCard>
          )}
        </div>

        {/* ----------- RIGHT 40% ----------- */}
        <div className="lg:col-span-2 space-y-4">
          <PanelCard
            title="BudgetFence Inspector"
            icon={ShieldAlert}
            action={
              <Select
                value={selectedFenceAvatarId ?? ""}
                onValueChange={setSelectedFenceAvatarId}
              >
                <SelectTrigger className="h-7 w-44 text-[11px] font-mono">
                  <SelectValue placeholder="Pick avatar" />
                </SelectTrigger>
                <SelectContent>
                  {avatars
                    .filter((a) => a.fence)
                    .map((a) => (
                      <SelectItem
                        key={a.avatar.id}
                        value={a.avatar.id}
                        className="text-[11px] font-mono"
                      >
                        {a.avatar.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            }
          >
            {selectedFence && selectedFence.fence ? (
              <div className="space-y-3">
                <div className="rounded-md border border-border/40 bg-card/30 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold">
                      {selectedFence.avatar.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px]"
                    >
                      {selectedFence.avatar.kind}
                    </Badge>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {selectedFence.avatar.address}
                  </div>
                  <div className="font-mono text-[10px]">
                    reputation:{" "}
                    <span className="text-emerald-500">
                      {selectedFence.avatar.reputation}
                    </span>
                  </div>
                </div>

                {/* Daily cap progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">
                      Daily spent / cap
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatToken(selectedFence.fence.dailySpent)} /{" "}
                      {formatToken(selectedFence.fence.dailyCap)}
                    </span>
                  </div>
                  <Progress
                    value={pct(
                      selectedFence.fence.dailySpent,
                      selectedFence.fence.dailyCap,
                    )}
                    className="h-1.5 bg-emerald-500/10"
                  />
                  <div className="text-[10px] font-mono text-muted-foreground">
                    remaining:{" "}
                    <span className="text-foreground">
                      {formatToken(
                        selectedFence.fence.dailyCap -
                          selectedFence.fence.dailySpent,
                      )}
                    </span>
                  </div>
                </div>

                {/* Allowed scopes */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Allowed Scopes (Scope Lock)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedFence.fence.allowedScopes.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="font-mono text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Decaying threshold */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Decaying Threshold
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span>
                      threshold:{" "}
                      <span className="text-amber-500">
                        {formatToken(selectedFence.fence.decayingThreshold)}
                      </span>
                    </span>
                    <span>
                      authFactor:{" "}
                      <span
                        className={
                          selectedFence.fence.authDecayFactor < 0.5
                            ? "text-rose-500"
                            : "text-emerald-500"
                        }
                      >
                        {selectedFence.fence.authDecayFactor.toFixed(3)}
                      </span>
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                    Amounts above threshold + decayed authFactor (&lt; 0.5) →
                    REQUIRE_HUMAN_AUTH.
                  </p>
                </div>

                {/* Test Scope Violation */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full font-mono text-xs gap-1 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                  onClick={testScopeViolation}
                >
                  <Bug className="h-3.5 w-3.5" />
                  Test Scope Violation (scope=medical)
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-[11px] text-muted-foreground font-mono">
                Select an avatar with a BudgetFence to inspect.
              </div>
            )}
          </PanelCard>

          {/* Quick reference: rejection reasons */}
          <PanelCard title="BudgetFence Status Map" icon={AlertTriangle}>
            <div className="space-y-2 text-[11px] font-mono">
              {[
                {
                  s: "APPROVED",
                  c: "text-emerald-500",
                  d: "scope matches + within daily cap + auth ok",
                },
                {
                  s: "REJECT_SCOPE",
                  c: "text-rose-500",
                  d: "scope not in allowedScopes (triggers Decaying Auth)",
                },
                {
                  s: "REJECT_DAILY_CAP",
                  c: "text-amber-500",
                  d: "dailySpent + amount > dailyCap",
                },
                {
                  s: "REQUIRE_HUMAN_AUTH",
                  c: "text-violet-500",
                  d: "amount > decayingThreshold AND authDecayFactor < 0.5",
                },
              ].map((r) => (
                <div
                  key={r.s}
                  className="rounded-md border border-border/40 bg-card/30 p-2"
                >
                  <div className={`font-semibold ${r.c}`}>{r.s}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {r.d}
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>

          {/* Quick ref: test vectors */}
          <PanelCard title="RFC Test Vectors" icon={FlaskConical}>
            <Tabs defaultValue="tv1">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="tv1" className="text-[10px] font-mono">
                  TV1 · Scope Lock
                </TabsTrigger>
                <TabsTrigger value="tv2" className="text-[10px] font-mono">
                  TV2 · Clawback
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tv1" className="mt-2">
                <div className="rounded-md border border-border/40 bg-card/30 p-3 text-[10px] font-mono leading-relaxed space-y-1.5">
                  <div>
                    <span className="text-muted-foreground">case:</span>{" "}
                    Scope_Lock_Violation
                  </div>
                  <div>
                    <span className="text-muted-foreground">scope:</span>{" "}
                    <span className="text-rose-500">medical_diagnosis</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">expected:</span>{" "}
                    REVERT / REJECT_SCOPE
                  </div>
                  <div>
                    <span className="text-muted-foreground">fallback:</span>{" "}
                    Trigger Decaying Auth → Human Master Signature
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full font-mono text-[10px] gap-1"
                    onClick={runScopeLockViolationTest}
                  >
                    <FlaskConical className="h-3 w-3" />
                    Run Vector 1
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="tv2" className="mt-2">
                <div className="rounded-md border border-border/40 bg-card/30 p-3 text-[10px] font-mono leading-relaxed space-y-1.5">
                  <div>
                    <span className="text-muted-foreground">case:</span>{" "}
                    Stream_Overpayment_Clawback
                  </div>
                  <div>
                    <span className="text-muted-foreground">setup:</span>{" "}
                    total=1000, released=900
                  </div>
                  <div>
                    <span className="text-muted-foreground">mcp pct:</span> 80 →
                    finalPayout=800
                  </div>
                  <div>
                    <span className="text-muted-foreground">expected:</span>{" "}
                    <span className="text-rose-500">
                      Disputed, clawback=100
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[9px] mt-1">
                    Reproduce: create escrow (60s), call streamRelease until
                    ≥80% released, then call verifyAndSettle with pct=80.
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
