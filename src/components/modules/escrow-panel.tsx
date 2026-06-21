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
  WalletCards,
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
import { useT, useLang } from "@/lib/i18n";
import {
  formatToken,
  fromTokenUnits,
  type Amount,
  type Avatar,
  type BudgetFence,
  type Escrow,
  type EscrowStatus,
} from "@/lib/types";
import {
  ensureBaseSepolia,
  getInjectedProvider,
  readStoredMode,
  shortAddress,
} from "@/lib/ap2/wallet";

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
  const t = useT();
  const lang = useLang((s) => s.lang);
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
  const [baseTesting, setBaseTesting] = React.useState(false);

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
          title: lang === "zh" ? "加载分身失败" : "Failed to load avatars",
          description: json.error,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: lang === "zh" ? "网络错误" : "Network error",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoadingAvatars(false);
    }
  }, [selectedFenceAvatarId, payerAddress, payeeAddress, toast, lang]);

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
          title: lang === "zh" ? "加载托管失败" : "Failed to load escrows",
          description: json.error,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: lang === "zh" ? "网络错误" : "Network error",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoadingEscrows(false);
    }
  }, [selectedEscrowId, toast, lang]);

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
        title: lang === "zh" ? "字段缺失" : "Missing fields",
        description:
          lang === "zh"
            ? "付款方和收款方为必填项。"
            : "Payer and payee are required.",
        variant: "destructive",
      });
      return;
    }
    if (payerAddress === payeeAddress) {
      toast({
        title: lang === "zh" ? "无效托管" : "Invalid escrow",
        description:
          lang === "zh"
            ? "付款方和收款方不能相同。"
            : "Payer and payee must differ.",
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
          title: lang === "zh" ? "资金已锁定" : "Funds locked",
          description:
            lang === "zh"
              ? `托管 ${taskId.slice(0, 18)}… 已创建,状态为 Streaming`
              : `Escrow ${taskId.slice(0, 18)}… created with status Streaming`,
        });
        await Promise.all([fetchAvatars(), fetchEscrows()]);
        setSelectedEscrowId(taskId);
      } else {
        const checkStatus =
          json.data?.check?.status ?? (json.ok === false ? "REJECT" : "ERROR");
        toast({
          title:
            lang === "zh"
              ? `锁定被拒绝 · ${checkStatus}`
              : `Lock rejected · ${checkStatus}`,
          description: json.error,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: lang === "zh" ? "网络错误" : "Network error",
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
    lang,
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
            title: lang === "zh" ? "流式释放成功" : "Stream released",
            description:
              lang === "zh"
                ? `+${formatToken(
                    r.result.releasedAmount,
                  )} → 总计 ${formatToken(r.result.totalReleased)} · ${r.result.status}`
                : `+${formatToken(
                    r.result.releasedAmount,
                  )} → total ${formatToken(r.result.totalReleased)} · ${r.result.status}`,
          });
          await fetchEscrows();
        } else {
          toast({
            title: lang === "zh" ? "流式释放被拒绝" : "Stream release rejected",
            description: json.error,
            variant: "destructive",
          });
        }
      } catch (e) {
        toast({
          title: lang === "zh" ? "网络错误" : "Network error",
          description: (e as Error).message,
          variant: "destructive",
        });
      } finally {
        setStreaming(false);
      }
    },
    [toast, fetchEscrows, lang],
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
              title:
                lang === "zh"
                  ? `争议已触发 · 回拨 ${formatToken(
                      r.result.clawbackRequired,
                    )}`
                  : `Dispute triggered · clawback ${formatToken(
                      r.result.clawbackRequired,
                    )}`,
              description:
                lang === "zh"
                  ? `流式超额支付 vs MCP ${verifyPct}% 完成度。不转账 (RFC §1 verifyAndSettle)。`
                  : `Streaming over-paid vs MCP ${verifyPct}% completion. NO transfer (RFC §1 verifyAndSettle).`,
              variant: "destructive",
            });
          } else {
            toast({
              title: lang === "zh" ? "已结算 · Completed" : "Settled · Completed",
              description:
                lang === "zh"
                  ? `finalPayout ${formatToken(
                      r.result.finalPayout,
                    )} · 退款 ${formatToken(
                      r.result.refundAmount,
                    )} · 收款方声誉 ${r.payeeRepBefore} → ${r.payeeRepAfter} (+${r.result.reputationDelta})`
                  : `finalPayout ${formatToken(
                      r.result.finalPayout,
                    )} · refund ${formatToken(
                      r.result.refundAmount,
                    )} · payee rep ${r.payeeRepBefore} → ${r.payeeRepAfter} (+${r.result.reputationDelta})`,
            });
          }
          await Promise.all([fetchEscrows(), fetchAvatars()]);
        } else {
          toast({
            title: lang === "zh" ? "结算被拒绝" : "Settle rejected",
            description: json.error,
            variant: "destructive",
          });
        }
      } catch (e) {
        toast({
          title: lang === "zh" ? "网络错误" : "Network error",
          description: (e as Error).message,
          variant: "destructive",
        });
      } finally {
        setSettling(false);
      }
    },
    [verifyPct, qualityScore, toast, fetchEscrows, fetchAvatars, lang],
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
        title: lang === "zh" ? "测试初始化失败" : "Test setup failed",
        description:
          lang === "zh"
            ? "未找到适合作用域违规测试的分身。"
            : "No suitable avatar found for the scope-violation test.",
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
          ? lang === "zh"
            ? `✓ 测试向量 1 通过 · REJECT_SCOPE`
            : `✓ Test Vector 1 PASS · REJECT_SCOPE`
          : lang === "zh"
            ? `✗ 测试向量 1 失败 · ${status}`
            : `✗ Test Vector 1 FAIL · ${status}`,
        description:
          lang === "zh"
            ? `目标=${lawyer.avatar.name} scope=medical_diagnosis · triggeredDecayingAuth=${triggeredDecayingAuth} · ${json.error ?? "意外通过"}`
            : `target=${lawyer.avatar.name} scope=medical_diagnosis · triggeredDecayingAuth=${triggeredDecayingAuth} · ${json.error ?? "approved unexpectedly"}`,
        variant: passed ? "default" : "destructive",
      });
      // Refresh fence (dailySpent unchanged since rejected).
      await fetchAvatars();
    } catch (e) {
      toast({
        title: lang === "zh" ? "测试运行器错误" : "Test runner error",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  }, [avatars, toast, fetchAvatars, lang]);

  // ---------------- Test: Scope Violation (demo button) ----------------
  // Quick demo: try scope="medical" on the currently-selected fence avatar
  // if that avatar's fence does not include "medical".
  const testScopeViolation = React.useCallback(async () => {
    const target = avatars.find((a) => a.avatar.id === selectedFenceAvatarId);
    if (!target || !target.fence) {
      toast({
        title: lang === "zh" ? "未选择分身" : "No avatar selected",
        description:
          lang === "zh"
            ? "请先在 BudgetFence 检查器中选择一个分身。"
            : "Pick an avatar in the BudgetFence Inspector first.",
        variant: "destructive",
      });
      return;
    }
    const testScope = "medical";
    const violates = !target.fence.allowedScopes.includes(testScope);
    if (!violates) {
      toast({
        title: lang === "zh" ? "分身已允许 'medical'" : "Avatar allows 'medical'",
        description:
          lang === "zh"
            ? `${target.avatar.name} 已允许 scope=medical;请选择非医疗分身以演示违规。`
            : `${target.avatar.name} already permits scope=medical; pick a non-medical avatar to demo the violation.`,
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
        title:
          status === "REJECT_SCOPE"
            ? "✓ REJECT_SCOPE"
            : lang === "zh"
              ? `意外: ${status}`
              : `Unexpected: ${status}`,
        description: json.error ?? (lang === "zh" ? "已通过" : "approved"),
        variant: status === "REJECT_SCOPE" ? "default" : "destructive",
      });
    } catch (e) {
      toast({
        title: lang === "zh" ? "网络错误" : "Network error",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  }, [avatars, selectedFenceAvatarId, toast, lang]);

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

  const runBaseSepoliaTxTest = React.useCallback(async () => {
    const provider = getInjectedProvider();
    if (!provider) {
      toast({
        title: "Wallet required",
        description: "Connect an injected wallet from the top-right control first.",
        variant: "destructive",
      });
      return;
    }

    if (readStoredMode() !== "base-sepolia") {
      toast({
        title: "Switch mode",
        description: "Select Base Sepolia in the top-right mode control before sending a transaction.",
        variant: "destructive",
      });
      return;
    }

    setBaseTesting(true);
    try {
      await ensureBaseSepolia(provider);
      const accounts = await provider.request<string[]>({
        method: "eth_requestAccounts",
      });
      const from = accounts[0];
      if (!from) throw new Error("Wallet returned no account");

      const approveRes = await fetch("/api/v1/escrow/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "base-sepolia",
          amount: "110000000000000000000",
        }),
      });
      const approveJson = await approveRes.json();
      if (!approveJson.ok) throw new Error(approveJson.error);

      const approveHash = await provider.request<string>({
        method: "eth_sendTransaction",
        params: [{ from, ...approveJson.data.txRequest }],
      });

      const createRes = await fetch("/api/v1/escrow/create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "base-sepolia",
          payee: from,
          baseAmount: "100000000000000000000",
          optionAmount: "10000000000000000000",
          durationSeconds: "1",
          target: `XDP_Protocol_Genesis_Clean_${Date.now()}`,
          scope: "legal",
        }),
      });
      const createJson = await createRes.json();
      if (!createJson.ok) throw new Error(createJson.error);

      const createHash = await provider.request<string>({
        method: "eth_sendTransaction",
        params: [{ from, ...createJson.data.txRequest }],
      });

      toast({
        title: "Base Sepolia tx sent",
        description: `${shortAddress(from)} approve ${shortHash(approveHash)} / create ${shortHash(createHash)}`,
      });
    } catch (error) {
      toast({
        title: "Base Sepolia tx failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setBaseTesting(false);
    }
  }, [toast]);

  return (
    <div>
      <PanelHeader
        icon={Lock}
        title={t("escrow.title")}
        rfcSection="RFC §1 / §5.1"
        description={t("escrow.description")}
        accent="emerald"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs gap-1"
              onClick={() => void runBaseSepoliaTxTest()}
              disabled={baseTesting}
            >
              <WalletCards className="h-3.5 w-3.5" />
              {baseTesting ? "Sending" : "Base Tx Test"}
            </Button>
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
              {t("header.refresh")}
            </Button>
          </>
        }
      />

      {/* ===================== STATS ===================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label={t("escrow.totalEscrows")}
          value={stats.total}
          hint={t("escrow.hintTotal")}
          accent="emerald"
        />
        <Stat
          label={t("escrow.streamingCount")}
          value={stats.streaming}
          hint={t("escrow.hintStreaming")}
          accent="cyan"
        />
        <Stat
          label={t("escrow.completedCount")}
          value={stats.completed}
          hint={t("escrow.hintCompleted")}
          accent="violet"
        />
        <Stat
          label={t("escrow.disputedCount")}
          value={stats.disputed}
          hint={t("escrow.hintDisputed")}
          accent="rose"
        />
      </div>

      {/* ===================== TWO COLUMN LAYOUT ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ----------- LEFT 60% ----------- */}
        <div className="lg:col-span-3 space-y-4">
          {/* Create Escrow form */}
          <PanelCard title={`${t("escrow.createEscrow")} · lockFunds()`} icon={Lock}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {t("escrow.payerWithFence")}
                </label>
                <Select value={payerAddress} onValueChange={setPayerAddress}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("escrow.selectPayer")} />
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
                  {t("escrow.payee")}
                </label>
                <Select value={payeeAddress} onValueChange={setPayeeAddress}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("escrow.selectPayee")} />
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
                  {t("escrow.amountUsdc")}
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
                  {t("escrow.scopeLabel")}
                </label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("escrow.scopePlaceholder")} />
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
                  {t("escrow.durationSeconds")}
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
                {creating ? t("escrow.locking") : t("escrow.lockFunds")}
              </Button>
              <Button
                variant="outline"
                onClick={runScopeLockViolationTest}
                className="font-mono text-xs gap-1 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                {t("escrow.runScopeLockViolation")}
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground font-mono leading-relaxed">
              {t("escrow.tv1DescPre")}
              <span className="text-rose-500">medical_diagnosis</span>{" "}
              {t("escrow.tv1DescMid")}{" "}
              <span className="text-rose-500">REJECT_SCOPE</span>.
            </p>
          </PanelCard>

          {/* Active Escrows table */}
          <PanelCard
            title={`${t("escrow.activeEscrows")} · streamRelease / verifyAndSettle`}
            icon={Droplet}
          >
            <div className="max-h-96 overflow-y-auto scrollbar-cyber rounded-md border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-[10px]">
                      {t("escrow.taskPair")}
                    </TableHead>
                    <TableHead className="font-mono text-[10px]">
                      {t("common.amount")}
                    </TableHead>
                    <TableHead className="font-mono text-[10px]">
                      {t("common.released")}
                    </TableHead>
                    <TableHead className="font-mono text-[10px]">
                      {t("escrow.scopeLabel")}
                    </TableHead>
                    <TableHead className="font-mono text-[10px]">
                      {t("common.status")}
                    </TableHead>
                    <TableHead className="font-mono text-[10px] text-right">
                      {t("common.select")}
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
                        {t("escrow.noEscrowsYet")}
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
                          {e.taskId === selectedEscrowId
                            ? t("escrow.selected")
                            : t("common.select")}
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
              title={`${t("escrow.inspector")} · ${shortHash(selectedEscrow.taskId, 10)}`}
              icon={ArrowRightCircle}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: meta + progress visualizations */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {t("escrow.payer")}
                      </div>
                      <div>{selectedEscrow.payerName}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {t("escrow.payee")}
                      </div>
                      <div>{selectedEscrow.payeeName}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {t("escrow.totalAmount")}
                      </div>
                      <div className="text-emerald-600 dark:text-emerald-400">
                        {formatToken(selectedEscrow.totalAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {t("common.released")}
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
                        {t("escrow.startTime")}
                      </div>
                      <div className="text-[10px]">
                        {new Date(selectedEscrow.startTime as unknown as string).toLocaleTimeString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase">
                        {t("escrow.endTime")}
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
                        {t("escrow.timeElapsedTotal")}
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
                        {t("escrow.releasedTotal")}
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
                      {t("escrow.formulaDisputed")}
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
                      {t("escrow.streamReleaseDesc")}
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
                      {streaming ? t("escrow.releasing") : t("escrow.streamRelease")}
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
                          {t("escrow.mcpCompletion")}
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
                          {t("escrow.qualityScore")}
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
                      {t("escrow.finalPayoutLabel")} = total × {verifyPct}% ={" "}
                      <span className="text-foreground">
                        {formatToken(
                          (selectedEscrow.totalAmount * BigInt(verifyPct)) /
                            100n,
                        )}
                      </span>
                      <br />
                      {t("escrow.alreadyReleasedLabel")}{" "}
                      <span className="text-foreground">
                        {formatToken(selectedEscrow.releasedAmount)}
                      </span>
                      <br />
                      {selectedEscrow.releasedAmount >
                      (selectedEscrow.totalAmount * BigInt(verifyPct)) /
                        100n ? (
                        <span className="text-rose-500">
                          {t("escrow.diffPositive")}
                        </span>
                      ) : (
                        <span className="text-emerald-500">
                          {t("escrow.diffNegative")}
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
                      {settling ? t("escrow.settling") : t("escrow.verifySettle")}
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
            title={t("escrow.budgetFence")}
            icon={ShieldAlert}
            action={
              <Select
                value={selectedFenceAvatarId ?? ""}
                onValueChange={setSelectedFenceAvatarId}
              >
                <SelectTrigger className="h-7 w-44 text-[11px] font-mono">
                  <SelectValue placeholder={t("escrow.pickAvatar")} />
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
                    {t("escrow.reputationLabel")}{" "}
                    <span className="text-emerald-500">
                      {selectedFence.avatar.reputation}
                    </span>
                  </div>
                </div>

                {/* Daily cap progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">
                      {t("escrow.dailySpentCap")}
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
                    {t("escrow.remainingLabel")}{" "}
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
                    {t("escrow.allowedScopesLock")}
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
                    {t("escrow.decayingThreshold")}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span>
                      {t("escrow.thresholdLabel")}{" "}
                      <span className="text-amber-500">
                        {formatToken(selectedFence.fence.decayingThreshold)}
                      </span>
                    </span>
                    <span>
                      {t("escrow.authFactorLabel")}{" "}
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
                    {t("escrow.amountAboveThreshold")}
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
                  {t("escrow.testScopeViolation")}
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-[11px] text-muted-foreground font-mono">
                {t("escrow.selectAvatarWithFence")}
              </div>
            )}
          </PanelCard>

          {/* Quick reference: rejection reasons */}
          <PanelCard title={t("escrow.budgetFenceStatusMap")} icon={AlertTriangle}>
            <div className="space-y-2 text-[11px] font-mono">
              {[
                {
                  s: "APPROVED",
                  c: "text-emerald-500",
                  d: t("escrow.statusApprovedDesc"),
                },
                {
                  s: "REJECT_SCOPE",
                  c: "text-rose-500",
                  d: t("escrow.statusRejectScopeDesc"),
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
          <PanelCard title={t("escrow.rfcTestVectors")} icon={FlaskConical}>
            <Tabs defaultValue="tv1">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="tv1" className="text-[10px] font-mono">
                  {t("escrow.tv1ScopeLock")}
                </TabsTrigger>
                <TabsTrigger value="tv2" className="text-[10px] font-mono">
                  {t("escrow.tv2Clawback")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tv1" className="mt-2">
                <div className="rounded-md border border-border/40 bg-card/30 p-3 text-[10px] font-mono leading-relaxed space-y-1.5">
                  <div>
                    <span className="text-muted-foreground">{t("escrow.caseLabel")}</span>{" "}
                    Scope_Lock_Violation
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("escrow.scopeLabel")}:</span>{" "}
                    <span className="text-rose-500">medical_diagnosis</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("escrow.expectedLabel")}</span>{" "}
                    REVERT / REJECT_SCOPE
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("escrow.fallbackLabel")}</span>{" "}
                    {t("escrow.triggerDecayingAuth")}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full font-mono text-[10px] gap-1"
                    onClick={runScopeLockViolationTest}
                  >
                    <FlaskConical className="h-3 w-3" />
                    {t("escrow.runVector1")}
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="tv2" className="mt-2">
                <div className="rounded-md border border-border/40 bg-card/30 p-3 text-[10px] font-mono leading-relaxed space-y-1.5">
                  <div>
                    <span className="text-muted-foreground">{t("escrow.caseLabel")}</span>{" "}
                    Stream_Overpayment_Clawback
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("escrow.setupLabel")}</span>{" "}
                    total=1000, released=900
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("escrow.mcpPctLabel")}</span> 80 →
                    finalPayout=800
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("escrow.expectedLabel")}</span>{" "}
                    <span className="text-rose-500">
                      Disputed, clawback=100
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[9px] mt-1">
                    {t("escrow.reproduceTv2")}
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
