"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crosshair,
  ArrowRight,
  ArrowDown,
  Coffee,
  HeartPulse,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  FlaskConical,
  AlertTriangle,
  RotateCcw,
  Cpu,
  Radio,
  Banknote,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { PanelHeader, PanelCard, Stat } from "./panel-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useT, useLang } from "@/lib/i18n";
import {
  type PhysicsIntentStatus,
  type PCMGVerifyResult,
  formatToken,
  parseFromJson,
  RFC_CONSTANTS,
} from "@/lib/types";
import {
  hashIntent,
  PCMG_THRESHOLDS,
} from "@/lib/contracts/pcmg";

// ============================================================
// Local view-model types (after parseFromJson, BigInts restored)
// ============================================================
type AvatarOption = {
  id: string;
  name: string;
  address: string;
  kind: string;
  reputation?: number;
  isUniqueEntity?: boolean;
};

type IntentRow = {
  id: string;
  intentHash: string;
  creatorAvatarId: string;
  afcEscrowAmount: bigint;
  physicsConstraints: string;
  executorId: string | null;
  executionDeadline: string;
  status: PhysicsIntentStatus;
  fidelityScore: number;
  resonanceScore: number;
  multiModalProofHash: string | null;
  createdAt?: string;
  creatorAvatar?: AvatarOption;
  executor?: AvatarOption | null;
};

// ============================================================
// Status helpers
// ============================================================
const STATUS_STYLE: Record<
  PhysicsIntentStatus,
  { labelKey: string; cls: string; dot: string }
> = {
  Pending: {
    labelKey: "common.pending",
    cls: "border-muted-foreground/30 text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  Executing: {
    labelKey: "common.executing",
    cls: "border-amber-500/40 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Verifying: {
    labelKey: "common.verifying",
    cls: "border-cyan-500/40 text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  Completed: {
    labelKey: "common.completed",
    cls: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Slashed: {
    labelKey: "common.slashed",
    cls: "border-rose-500/40 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

function StatusBadge({ status }: { status: PhysicsIntentStatus }) {
  const t = useT();
  const s = STATUS_STYLE[status];
  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-[10px] gap-1", s.cls)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {t(s.labelKey as never)}
    </Badge>
  );
}

// ============================================================
// Scenario presets
// ============================================================
type PresetId = "perfect" | "dissonance" | "forged";

interface PresetDef {
  id: PresetId;
  hint: string;
  constraints: string;
  amountUsdc: number;
  fidelity: number;
  resonance: number;
  expected: "Completed" | "Slashed" | "Rejected";
  accent: "emerald" | "rose" | "amber";
}

const PRESETS: PresetDef[] = [
  {
    id: "perfect",
    hint: "fidelity 9500 · resonance 8800",
    constraints: JSON.stringify(
      { location: "BlueBottle Cafe", item: "oat-milk latte", time: "30min" },
      null,
      0,
    ),
    amountUsdc: 5,
    fidelity: 9500,
    resonance: 8800,
    expected: "Completed",
    accent: "emerald",
  },
  {
    id: "dissonance",
    hint: "fidelity 9200 · resonance 3000",
    constraints: JSON.stringify(
      { location: "vending-machine", item: "cold black coffee", time: "5min" },
      null,
      0,
    ),
    amountUsdc: 5,
    fidelity: 9200,
    resonance: 3000,
    expected: "Slashed",
    accent: "rose",
  },
  {
    id: "forged",
    hint: "fidelity 6500 · resonance 9000",
    constraints: JSON.stringify(
      { location: "unknown", item: "stock photo", time: "0min" },
      null,
      0,
    ),
    amountUsdc: 5,
    fidelity: 6500,
    resonance: 9000,
    expected: "Rejected",
    accent: "amber",
  },
];

// Translation key map for preset display strings (title / description / expected label)
const PRESET_LABELS: Record<
  PresetId,
  { title: string; desc: string; expected: string }
> = {
  perfect: {
    title: "pcmg.runPerfectLatte",
    desc: "pcmg.presetPerfectDesc",
    expected: "pcmg.presetPerfectExpected",
  },
  dissonance: {
    title: "pcmg.runColdCoffee",
    desc: "pcmg.presetDissonanceDesc",
    expected: "pcmg.presetDissonanceExpected",
  },
  forged: {
    title: "pcmg.runForgedProof",
    desc: "pcmg.presetForgedDesc",
    expected: "pcmg.presetForgedExpected",
  },
};

// ============================================================
// Main panel
// ============================================================
export function PcmgPanel() {
  const { toast } = useToast();
  const t = useT();
  const lang = useLang((s) => s.lang);

  // server state
  const [avatars, setAvatars] = React.useState<AvatarOption[]>([]);
  const [intents, setIntents] = React.useState<IntentRow[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);

  // form state (phase 1)
  const defaultCreator = React.useMemo(
    () => avatars.find((a) => a.kind === "prophet") ?? avatars[0],
    [avatars],
  );
  const defaultExecutor = React.useMemo(
    () =>
      avatars.find((a) => a.address === "0xRentHuman_Worker_01") ??
      avatars.find((a) => a.kind === "avatar") ??
      avatars[0],
    [avatars],
  );

  const [creatorAvatarId, setCreatorAvatarId] = React.useState<string>("");
  const [description, setDescription] = React.useState(
    "Buy me a relaxing latte",
  );
  const [amountUsdc, setAmountUsdc] = React.useState<number>(5);
  const [physicsConstraints, setPhysicsConstraints] = React.useState<string>(
    JSON.stringify(
      { location: "cafe", item: "latte", time: "30min" },
      null,
      2,
    ),
  );
  const [executorId, setExecutorId] = React.useState<string>("");
  const [deadlineMinutes, setDeadlineMinutes] = React.useState<number>(60);

  // phase 2 — proof sliders
  const [fidelity, setFidelity] = React.useState<number>(9500);
  const [resonance, setResonance] = React.useState<number>(8800);

  // active intent (phase 2/3/4)
  const [currentIntent, setCurrentIntent] = React.useState<IntentRow | null>(
    null,
  );

  // phase 4 — verify result
  const [verifyResult, setVerifyResult] = React.useState<PCMGVerifyResult | null>(null);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);
  const [bridging, setBridging] = React.useState(false);

  // Resolve defaults once avatars load
  React.useEffect(() => {
    if (creatorAvatarId === "" && defaultCreator) {
      setCreatorAvatarId(defaultCreator.id);
    }
    if (executorId === "" && defaultExecutor) {
      setExecutorId(defaultExecutor.id);
    }
  }, [defaultCreator, defaultExecutor, creatorAvatarId, executorId]);

  // ----- data fetch -----
  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/pcmg/list");
      const json = await res.json();
      const parsed = parseFromJson<{
        ok: boolean;
        data?: { intents: IntentRow[]; avatars: AvatarOption[] };
        error?: string;
      }>(json);
      if (parsed.ok && parsed.data) {
        setIntents(parsed.data.intents);
        setAvatars(parsed.data.avatars);
      } else {
        toast({
          title: lang === "zh" ? "加载 PCMG 数据失败" : "Failed to load PCMG data",
          description: parsed.error,
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
      setLoadingList(false);
    }
  }, [toast, lang]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // ----- derived stats -----
  const stats = React.useMemo(() => {
    const total = intents.length;
    const executing = intents.filter((i) => i.status === "Executing").length;
    const completed = intents.filter((i) => i.status === "Completed").length;
    const slashed = intents.filter((i) => i.status === "Slashed").length;
    return { total, executing, completed, slashed };
  }, [intents]);

  // ----- bridging -----
  const bridge = React.useCallback(
    async (opts?: {
      description?: string;
      constraints?: string;
      amount?: number;
      creatorId?: string;
      executorAvatarId?: string;
      silent?: boolean;
    }) => {
      const desc = opts?.description ?? description;
      const cons = opts?.constraints ?? physicsConstraints;
      const amt = opts?.amount ?? amountUsdc;
      const cId = opts?.creatorId ?? creatorAvatarId;
      const eId = opts?.executorAvatarId ?? executorId;
      if (!cId || !eId) {
        toast({
          title: lang === "zh" ? "缺少输入" : "Missing input",
          description:
            lang === "zh"
              ? "请选择创建者分身和执行者。"
              : "Select both a creator avatar and an executor.",
          variant: "destructive",
        });
        return null;
      }
      setBridging(true);
      try {
        const intentHash = hashIntent(cId, desc);
        const res = await fetch("/api/pcmg/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intentHash,
            creatorAvatarId: cId,
            description: desc,
            amountUsdc: amt,
            physicsConstraints: cons,
            executorId: eId,
            deadlineSeconds: Math.max(1, deadlineMinutes * 60),
          }),
        });
        const json = await res.json();
        const parsed = parseFromJson<{
          ok: boolean;
          data?: IntentRow;
          error?: string;
        }>(json);
        if (!parsed.ok || !parsed.data) {
          toast({
            title: lang === "zh" ? "桥接失败" : "Bridge failed",
            description:
              parsed.error ?? (lang === "zh" ? "未知错误" : "Unknown error"),
            variant: "destructive",
          });
          return null;
        }
        if (!opts?.silent) {
          toast({
            title:
              lang === "zh"
                ? "意图已桥接至物理膜"
                : "Intent bridged to physical membrane",
            description: `${desc.slice(0, 40)} → status: Executing`,
          });
        }
        await refresh();
        // Locate the freshly-bridged intent in the refreshed list
        const fresh = parsed.data;
        // The API returns creatorAvatar/executor includes; merge them in.
        setCurrentIntent({
          ...fresh,
          creatorAvatar: avatars.find((a) => a.id === fresh.creatorAvatarId),
          executor: avatars.find((a) => a.id === fresh.executorId),
        });
        return fresh;
      } catch (e) {
        toast({
          title: lang === "zh" ? "网络错误" : "Network error",
          description: (e as Error).message,
          variant: "destructive",
        });
        return null;
      } finally {
        setBridging(false);
      }
    },
    [
      description,
      physicsConstraints,
      amountUsdc,
      creatorAvatarId,
      executorId,
      deadlineMinutes,
      avatars,
      refresh,
      toast,
      lang,
    ],
  );

  // ----- verify (submit proof) -----
  const submitProof = React.useCallback(
    async (opts?: {
      intentHash?: string;
      fidelity?: number;
      resonance?: number;
    }) => {
      const target = currentIntent;
      if (!target && !opts?.intentHash) {
        toast({
          title: lang === "zh" ? "无活跃意图" : "No active intent",
          description:
            lang === "zh"
              ? "请先桥接意图(阶段 1)。"
              : "Bridge an intent first (Phase 1).",
          variant: "destructive",
        });
        return null;
      }
      const intentHash = opts?.intentHash ?? target?.intentHash ?? "";
      const f = opts?.fidelity ?? fidelity;
      const r = opts?.resonance ?? resonance;

      setVerifying(true);
      setVerifyResult(null);
      setVerifyError(null);
      try {
        const res = await fetch("/api/pcmg/submit-proof", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intentHash, fidelity: f, resonance: r }),
        });
        const json = await res.json();
        const parsed = parseFromJson<{
          ok: boolean;
          data?: PCMGVerifyResult;
          error?: string;
        }>(json);
        if (!parsed.ok || !parsed.data) {
          setVerifyError(parsed.error ?? "Verify failed");
          toast({
            title:
              lang === "zh"
                ? "证明被拒绝(require 回滚)"
                : "Proof rejected (require reverted)",
            description: parsed.error,
            variant: "destructive",
          });
          await refresh();
          return null;
        }
        setVerifyResult(parsed.data);
        if (parsed.data.status === "Completed") {
          toast({
            title: lang === "zh" ? "物理执行已验证" : "Physics execution verified",
            description:
              lang === "zh"
                ? `共振度 ${parsed.data.resonanceScore} · 资金已释放 + 创建者声誉 +1`
                : `Resonance ${parsed.data.resonanceScore} · funds released + creator reputation +1`,
          });
        } else if (parsed.data.status === "Slashed") {
          toast({
            title: lang === "zh" ? "执行者已罚没" : "Executor slashed",
            description:
              lang === "zh"
                ? `共振度 ${parsed.data.resonanceScore} · 押金退还给创建者`
                : `Resonance ${parsed.data.resonanceScore} · stake refunded to creator`,
            variant: "destructive",
          });
        }
        await refresh();
        return parsed.data;
      } catch (e) {
        setVerifyError((e as Error).message);
        toast({
          title: lang === "zh" ? "网络错误" : "Network error",
          description: (e as Error).message,
          variant: "destructive",
        });
        return null;
      } finally {
        setVerifying(false);
      }
    },
    [currentIntent, fidelity, resonance, refresh, toast, lang],
  );

  // ----- preset runner -----
  const runPreset = React.useCallback(
    async (preset: PresetDef) => {
      // 1) bridge a fresh intent with scenario-specific config
      const fresh = await bridge({
        description: t(PRESET_LABELS[preset.id].desc as never),
        constraints: preset.constraints,
        amount: preset.amountUsdc,
        silent: true,
      });
      if (!fresh) return;
      // 2) set sliders to preset values for visual continuity
      setFidelity(preset.fidelity);
      setResonance(preset.resonance);
      // 3) auto-submit proof against the fresh intent
      await submitProof({
        intentHash: fresh.intentHash,
        fidelity: preset.fidelity,
        resonance: preset.resonance,
      });
    },
    [bridge, submitProof, t],
  );

  // ----- phase 1 form submit -----
  const onBridgeClick = React.useCallback(() => {
    void bridge();
  }, [bridge]);

  // ----- phase 3 verify click -----
  const onVerifyClick = React.useCallback(() => {
    void submitProof();
  }, [submitProof]);

  // ----- phase 4 reset -----
  const onReset = React.useCallback(() => {
    setCurrentIntent(null);
    setVerifyResult(null);
    setVerifyError(null);
  }, []);

  // ----- threshold live preview (phase 2) -----
  const fidelityPass = fidelity > PCMG_THRESHOLDS.fidelity;
  const resonancePass = resonance > PCMG_THRESHOLDS.resonance;
  const bothPass = fidelityPass && resonancePass;

  return (
    <div className="space-y-6">
      <PanelHeader
        icon={Crosshair}
        title={t("pcmg.title")}
        rfcSection="RFC §5.3"
        description={t("pcmg.description")}
        accent="rose"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs gap-1"
            onClick={() => void refresh()}
            disabled={loadingList}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("pcmg.refresh")}
          </Button>
        }
      />

      {/* ============ STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label={t("pcmg.totalIntents")}
          value={stats.total}
          hint={t("pcmg.statHintTotal")}
          accent="rose"
        />
        <Stat
          label={t("pcmg.executingCount")}
          value={stats.executing}
          hint={t("pcmg.statHintExecuting")}
          accent="amber"
        />
        <Stat
          label={t("pcmg.completedCount")}
          value={stats.completed}
          hint={t("pcmg.statHintCompleted")}
          accent="emerald"
        />
        <Stat
          label={t("pcmg.slashedCount")}
          value={stats.slashed}
          hint={t("pcmg.statHintSlashed")}
          accent="rose"
        />
      </div>

      {/* ============ PRESETS ============ */}
      <PanelCard title={t("pcmg.quickScenarios")} icon={FlaskConical}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESETS.map((p) => (
            <PresetButton
              key={p.id}
              preset={p}
              disabled={bridging || verifying || avatars.length === 0}
              onClick={() => void runPreset(p)}
            />
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground font-mono">
          {t("pcmg.quickScenariosDesc")}
        </p>
      </PanelCard>

      {/* ============ 4-PHASE FLOW ============ */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
        <PhaseShell
          phase={1}
          title={t("pcmg.phase1")}
          subtitle={t("pcmg.phase1Subtitle")}
          icon={Zap}
          accent="rose"
          className="flex-1 min-w-0"
        >
          <Phase1Form
            avatars={avatars}
            creatorAvatarId={creatorAvatarId}
            setCreatorAvatarId={setCreatorAvatarId}
            description={description}
            setDescription={setDescription}
            amountUsdc={amountUsdc}
            setAmountUsdc={setAmountUsdc}
            physicsConstraints={physicsConstraints}
            setPhysicsConstraints={setPhysicsConstraints}
            executorId={executorId}
            setExecutorId={setExecutorId}
            deadlineMinutes={deadlineMinutes}
            setDeadlineMinutes={setDeadlineMinutes}
            bridging={bridging}
            onBridge={onBridgeClick}
            intentHashPreview={
              creatorAvatarId
                ? hashIntent(creatorAvatarId, description)
                : "0x—"
            }
          />
        </PhaseShell>

        <PhaseArrow />

        <PhaseShell
          phase={2}
          title={t("pcmg.phase2")}
          subtitle={t("pcmg.phase2Subtitle")}
          icon={Cpu}
          accent="amber"
          className="flex-1 min-w-0"
          active={!!currentIntent}
        >
          <Phase2Execution
            currentIntent={currentIntent}
            fidelity={fidelity}
            setFidelity={setFidelity}
            resonance={resonance}
            setResonance={setResonance}
            fidelityPass={fidelityPass}
            resonancePass={resonancePass}
            bothPass={bothPass}
          />
        </PhaseShell>

        <PhaseArrow />

        <PhaseShell
          phase={3}
          title={t("pcmg.phase3")}
          subtitle={t("pcmg.phase3Subtitle")}
          icon={Radio}
          accent="cyan"
          className="flex-1 min-w-0"
          active={!!currentIntent && currentIntent.status === "Executing"}
        >
          <Phase3Verify
            currentIntent={currentIntent}
            fidelity={fidelity}
            resonance={resonance}
            verifying={verifying}
            onVerify={onVerifyClick}
            verifyResult={verifyResult}
          />
        </PhaseShell>

        <PhaseArrow />

        <PhaseShell
          phase={4}
          title={t("pcmg.phase4")}
          subtitle={t("pcmg.phase4Subtitle")}
          icon={Banknote}
          accent="emerald"
          className="flex-1 min-w-0"
          active={!!verifyResult || !!verifyError}
        >
          <Phase4Settle
            verifyResult={verifyResult}
            verifyError={verifyError}
            currentIntent={currentIntent}
            onReset={onReset}
          />
        </PhaseShell>
      </div>

      {/* ============ ACTIVE INTENTS TABLE ============ */}
      <PanelCard
        title={t("pcmg.activeIntents")}
        icon={Activity}
        action={
          <Badge variant="outline" className="font-mono text-[10px]">
            {intents.length} {t("pcmg.recordsCount")}
          </Badge>
        }
      >
        <div className="max-h-96 overflow-y-auto scrollbar-cyber rounded-md border border-border/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[10px] uppercase">
                  {t("pcmg.intentCol")}
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  {t("pcmg.creator")}
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  {t("pcmg.executor")}
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  $AFC
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  {t("pcmg.fidelity")}
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  {t("pcmg.resonance")}
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  {t("common.status")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intents.length === 0 && !loadingList && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground font-mono text-xs py-8"
                  >
                    {t("pcmg.noIntents")}
                  </TableCell>
                </TableRow>
              )}
              {loadingList && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center">
                    <Loader2 className="h-4 w-4 animate-spin inline-block text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {intents.map((it) => (
                <TableRow key={it.id} className="font-mono text-xs">
                  <TableCell className="max-w-[200px]">
                    <div className="truncate" title={it.intentHash}>
                      {it.intentHash.slice(0, 18)}…
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {it.physicsConstraints}
                    </div>
                  </TableCell>
                  <TableCell>{it.creatorAvatar?.name ?? "—"}</TableCell>
                  <TableCell>{it.executor?.name ?? "—"}</TableCell>
                  <TableCell className="text-rose-600 dark:text-rose-400">
                    {formatToken(it.afcEscrowAmount)}
                  </TableCell>
                  <TableCell>
                    {it.fidelityScore > 0 ? (
                      <span
                        className={cn(
                          it.fidelityScore > PCMG_THRESHOLDS.fidelity
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {it.fidelityScore}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {it.resonanceScore > 0 ? (
                      <span
                        className={cn(
                          it.resonanceScore > PCMG_THRESHOLDS.resonance
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {it.resonanceScore}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={it.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PanelCard>

      {/* ============ RFC THRESHOLD REFERENCE ============ */}
      <Alert className="border-rose-500/30 bg-rose-500/5">
        <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        <AlertTitle className="font-mono text-xs text-rose-600 dark:text-rose-400">
          {t("pcmg.rfcValidationTitle")}
        </AlertTitle>
        <AlertDescription className="font-mono text-[11px] text-muted-foreground">
          <code>
            require(isPhysicalValid && fidelityScore &gt;{" "}
            {RFC_CONSTANTS.PCMG_FIDELITY_THRESHOLD})
          </code>
          {" — "}
          <code>
            if (isResonant && resonanceScore &gt;{" "}
            {RFC_CONSTANTS.PCMG_RESONANCE_THRESHOLD})
          </code>
          . {t("pcmg.rfcValidationDesc")}
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ============================================================
// Preset button
// ============================================================
function PresetButton({
  preset,
  disabled,
  onClick,
}: {
  preset: PresetDef;
  disabled?: boolean;
  onClick: () => void;
}) {
  const t = useT();
  const labels = PRESET_LABELS[preset.id];
  const accentCls: Record<PresetDef["accent"], string> = {
    emerald:
      "border-emerald-500/40 hover:border-emerald-500/70 hover:bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    rose: "border-rose-500/40 hover:border-rose-500/70 hover:bg-rose-500/5 text-rose-700 dark:text-rose-300",
    amber:
      "border-amber-500/40 hover:border-amber-500/70 hover:bg-amber-500/5 text-amber-700 dark:text-amber-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex flex-col items-start gap-1 rounded-lg border bg-card/50 p-3 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        accentCls[preset.accent],
      )}
    >
      <div className="flex items-center gap-2">
        <Coffee className="h-4 w-4" />
        <span className="font-mono text-xs font-bold">
          {t(labels.title as never)}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">
        {preset.hint}
      </span>
      <span className="text-[10px] font-mono opacity-80">
        {t(labels.expected as never)}
      </span>
    </button>
  );
}

// ============================================================
// Phase shell (card wrapper with phase number + title)
// ============================================================
const PHASE_ACCENT: Record<
  "rose" | "amber" | "cyan" | "emerald",
  { text: string; border: string; bg: string; num: string }
> = {
  rose: {
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/40",
    bg: "bg-rose-500/10",
    num: "text-rose-600 dark:text-rose-400",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    num: "text-amber-600 dark:text-amber-400",
  },
  cyan: {
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/40",
    bg: "bg-cyan-500/10",
    num: "text-cyan-600 dark:text-cyan-400",
  },
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    num: "text-emerald-600 dark:text-emerald-400",
  },
};

function PhaseShell({
  phase,
  title,
  subtitle,
  icon: Icon,
  accent,
  active,
  className,
  children,
}: {
  phase: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: "rose" | "amber" | "cyan" | "emerald";
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const s = PHASE_ACCENT[accent];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("min-w-0", className)}
    >
      <Card
        className={cn(
          "h-full border bg-card/60 transition-colors",
          active ? s.border : "border-border/60",
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-bold",
                s.bg,
                s.border,
                s.num,
              )}
            >
              {phase}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xs font-mono flex items-center gap-1.5 truncate">
                <Icon className={cn("h-3.5 w-3.5", s.text)} />
                <span className="truncate">{title}</span>
              </CardTitle>
              <p className="text-[10px] text-muted-foreground font-mono truncate">
                {subtitle}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function PhaseArrow() {
  return (
    <div className="flex items-center justify-center py-1 lg:py-0">
      <ArrowDown className="h-4 w-4 text-muted-foreground lg:hidden" />
      <ArrowRight className="h-4 w-4 text-muted-foreground hidden lg:block" />
    </div>
  );
}

// ============================================================
// Phase 1: Intent Bridge form
// ============================================================
function Phase1Form(props: {
  avatars: AvatarOption[];
  creatorAvatarId: string;
  setCreatorAvatarId: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  amountUsdc: number;
  setAmountUsdc: (v: number) => void;
  physicsConstraints: string;
  setPhysicsConstraints: (v: string) => void;
  executorId: string;
  setExecutorId: (v: string) => void;
  deadlineMinutes: number;
  setDeadlineMinutes: (v: number) => void;
  bridging: boolean;
  onBridge: () => void;
  intentHashPreview: string;
}) {
  const t = useT();
  const constraintsValid = React.useMemo(() => {
    try {
      JSON.parse(props.physicsConstraints);
      return true;
    } catch {
      return false;
    }
  }, [props.physicsConstraints]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[11px] font-mono">{t("pcmg.creatorAvatar")}</Label>
        <Select
          value={props.creatorAvatarId}
          onValueChange={props.setCreatorAvatarId}
        >
          <SelectTrigger className="h-8 text-xs font-mono w-full">
            <SelectValue placeholder={t("pcmg.selectCreator")} />
          </SelectTrigger>
          <SelectContent>
            {props.avatars.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs font-mono">
                {a.name} · {a.kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-mono">{t("pcmg.intentDesc")}</Label>
        <Input
          value={props.description}
          onChange={(e) => props.setDescription(e.target.value)}
          className="h-8 text-xs font-mono"
          placeholder={t("pcmg.intentDescPlaceholder")}
        />
        <p className="text-[10px] text-muted-foreground font-mono truncate">
          {t("pcmg.hashLabel")} {props.intentHashPreview.slice(0, 30)}…
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-mono">{t("pcmg.amountAfc")}</Label>
          <Input
            type="number"
            min={0.01}
            step={0.5}
            value={props.amountUsdc}
            onChange={(e) =>
              props.setAmountUsdc(Number(e.target.value) || 0)
            }
            className="h-8 text-xs font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-mono">{t("pcmg.deadlineMin")}</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={props.deadlineMinutes}
            onChange={(e) =>
              props.setDeadlineMinutes(Number(e.target.value) || 1)
            }
            className="h-8 text-xs font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-mono flex items-center justify-between">
          <span>{t("pcmg.physicsConstraints")}</span>
          <span
            className={cn(
              "text-[10px]",
              constraintsValid
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {constraintsValid
              ? t("pcmg.jsonValid")
              : t("pcmg.jsonInvalid")}
          </span>
        </Label>
        <Textarea
          value={props.physicsConstraints}
          onChange={(e) => props.setPhysicsConstraints(e.target.value)}
          className="text-[11px] font-mono min-h-[60px] resize-y"
          spellCheck={false}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-mono">{t("pcmg.physicalExecutor")}</Label>
        <Select value={props.executorId} onValueChange={props.setExecutorId}>
          <SelectTrigger className="h-8 text-xs font-mono w-full">
            <SelectValue placeholder={t("pcmg.selectExecutor")} />
          </SelectTrigger>
          <SelectContent>
            {props.avatars.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs font-mono">
                {a.name} · {a.kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator className="my-1" />

      <Button
        onClick={props.onBridge}
        disabled={
          props.bridging ||
          !props.creatorAvatarId ||
          !props.executorId ||
          !constraintsValid ||
          props.avatars.length === 0
        }
        className="w-full font-mono text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
      >
        {props.bridging ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Zap className="h-3.5 w-3.5" />
        )}
        {t("pcmg.bridgeBtn")}
      </Button>
      {props.avatars.length === 0 && (
        <p className="text-[10px] text-muted-foreground font-mono">
          {t("pcmg.noAvatars")}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Phase 2: Physical Execution (proof sliders + live preview)
// ============================================================
function Phase2Execution(props: {
  currentIntent: IntentRow | null;
  fidelity: number;
  setFidelity: (v: number) => void;
  resonance: number;
  setResonance: (v: number) => void;
  fidelityPass: boolean;
  resonancePass: boolean;
  bothPass: boolean;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      {props.currentIntent ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground uppercase">
              {t("pcmg.bridgedIntent")}
            </span>
            <StatusBadge status={props.currentIntent.status} />
          </div>
          <div className="font-mono text-[10px] text-muted-foreground truncate">
            {props.currentIntent.intentHash.slice(0, 30)}…
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-rose-600 dark:text-rose-400">
              {formatToken(props.currentIntent.afcEscrowAmount)}
            </span>
            <span className="text-muted-foreground">
              {t("pcmg.escrowLocked")}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border/60 p-3 text-center">
          <Cpu className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground font-mono">
            {t("pcmg.noActiveIntentBridge")}
          </p>
        </div>
      )}

      <Separator className="my-1" />

      <div className="space-y-1.5">
        <Label className="text-[11px] font-mono flex items-center justify-between">
          <span>{t("pcmg.fidelityLabel")}</span>
          <span
            className={cn(
              "font-bold",
              props.fidelityPass
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {props.fidelity} / {PCMG_THRESHOLDS.fidelity}►
          </span>
        </Label>
        <Slider
          value={[props.fidelity]}
          min={0}
          max={10000}
          step={50}
          onValueChange={(v) => props.setFidelity(v[0] ?? 0)}
          className={cn(
            props.fidelityPass
              ? "[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
              : "[&_[data-slot=slider-range]]:bg-rose-500 [&_[data-slot=slider-thumb]]:border-rose-500",
          )}
        />
        <p className="text-[10px] text-muted-foreground font-mono">
          {t("pcmg.fidelityHint")}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-mono flex items-center justify-between">
          <span>{t("pcmg.resonanceLabel")}</span>
          <span
            className={cn(
              "font-bold",
              props.resonancePass
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {props.resonance} / {PCMG_THRESHOLDS.resonance}►
          </span>
        </Label>
        <Slider
          value={[props.resonance]}
          min={0}
          max={10000}
          step={50}
          onValueChange={(v) => props.setResonance(v[0] ?? 0)}
          className={cn(
            props.resonancePass
              ? "[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
              : "[&_[data-slot=slider-range]]:bg-rose-500 [&_[data-slot=slider-thumb]]:border-rose-500",
          )}
        />
        <p className="text-[10px] text-muted-foreground font-mono">
          {t("pcmg.resonanceHint")}
        </p>
      </div>

      <Separator className="my-1" />

      <div
        className={cn(
          "rounded-md border p-2.5 flex items-center gap-2",
          props.bothPass
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-rose-500/40 bg-rose-500/5",
        )}
      >
        {props.bothPass ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        )}
        <div className="min-w-0">
          <p
            className={cn(
              "font-mono text-[11px] font-bold",
              props.bothPass
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {props.bothPass
              ? t("pcmg.bothSatisfied")
              : props.fidelityPass
                ? t("pcmg.resonanceBelow")
                : props.resonancePass
                  ? t("pcmg.fidelityBelow")
                  : t("pcmg.bothFailed")}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {props.fidelityPass ? "✓" : "✗"} fidelity &gt;{" "}
            {PCMG_THRESHOLDS.fidelity} ·{" "}
            {props.resonancePass ? "✓" : "✗"} resonance &gt;{" "}
            {PCMG_THRESHOLDS.resonance}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Phase 3: Reverse Mapping Verify
// ============================================================
function Phase3Verify(props: {
  currentIntent: IntentRow | null;
  fidelity: number;
  resonance: number;
  verifying: boolean;
  onVerify: () => void;
  verifyResult: PCMGVerifyResult | null;
}) {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const ready =
    !!props.currentIntent && props.currentIntent.status === "Executing";

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground uppercase">
            {t("pcmg.step1PhysicsOracle")}
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[10px] border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
          >
            ZK-SNARK
          </Badge>
        </div>
        <FidelityMeter value={props.fidelity} />
      </div>

      <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground uppercase">
            {t("pcmg.step2EceResonance")}
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[10px] border-violet-500/40 text-violet-600 dark:text-violet-400"
          >
            {t("pcmg.emotionalBaseline")}
          </Badge>
        </div>
        <ResonanceMeter value={props.resonance} />
      </div>

      <Separator className="my-1" />

      <Button
        onClick={props.onVerify}
        disabled={props.verifying || !ready}
        className="w-full font-mono text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
      >
        {props.verifying ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Radio className="h-3.5 w-3.5" />
        )}
        {t("pcmg.submitProof")}
      </Button>
      {!ready && (
        <p className="text-[10px] text-muted-foreground font-mono">
          {props.currentIntent
            ? lang === "zh"
              ? `意图状态为 ${props.currentIntent.status}(需为 Executing)。`
              : `Intent is ${props.currentIntent.status} (must be Executing).`
            : t("pcmg.bridgeFirstPhase1")}
        </p>
      )}
    </div>
  );
}

function FidelityMeter({ value }: { value: number }) {
  const t = useT();
  const pass = value > PCMG_THRESHOLDS.fidelity;
  const pct = (value / 10000) * 100;
  return (
    <div className="space-y-1">
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
        <motion.div
          className={cn(
            "h-full rounded-full",
            pass ? "bg-emerald-500" : "bg-rose-500",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {/* threshold marker at 80% */}
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/40"
          style={{ left: `${(PCMG_THRESHOLDS.fidelity / 10000) * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[10px]">
        <span className="text-muted-foreground">0</span>
        <span
          className={cn(
            "font-bold",
            pass
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        >
          {value}
        </span>
        <span className="text-muted-foreground">10000</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-mono">
        {pass ? (
          <>
            <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-600 dark:text-emerald-400">
              {t("pcmg.physicalProofValid")}
            </span>
          </>
        ) : (
          <>
            <ShieldAlert className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            <span className="text-rose-600 dark:text-rose-400">
              {t("pcmg.lowFidelityRevert")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function ResonanceMeter({ value }: { value: number }) {
  const t = useT();
  const pass = value > PCMG_THRESHOLDS.resonance;
  const pct = (value / 10000) * 100;
  return (
    <div className="space-y-1">
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
        <motion.div
          className={cn(
            "h-full rounded-full",
            pass ? "bg-emerald-500" : "bg-rose-500",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/40"
          style={{ left: `${(PCMG_THRESHOLDS.resonance / 10000) * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[10px]">
        <span className="text-muted-foreground">0</span>
        <span
          className={cn(
            "font-bold",
            pass
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        >
          {value}
        </span>
        <span className="text-muted-foreground">10000</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-mono">
        <HeartPulse
          className={cn(
            "h-3 w-3",
            pass
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        />
        <span
          className={cn(
            pass
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        >
          {pass
            ? t("pcmg.emotionalResonanceAligned")
            : t("pcmg.emotionalDissonanceDetected")}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Phase 4: Cross-Membrane Settle (result)
// ============================================================
function Phase4Settle(props: {
  verifyResult: PCMGVerifyResult | null;
  verifyError: string | null;
  currentIntent: IntentRow | null;
  onReset: () => void;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {props.verifyError && !props.verifyResult && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Alert variant="destructive" className="border-rose-500/40">
              <XCircle className="h-4 w-4" />
              <AlertTitle className="font-mono text-xs">
                {t("pcmg.proofRejected400")}
              </AlertTitle>
              <AlertDescription className="font-mono text-[11px]">
                {props.verifyError}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("pcmg.revertedBeforeEce")}
                </p>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {props.verifyResult?.status === "Completed" && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <Alert className="border-emerald-500/40 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle className="font-mono text-xs text-emerald-700 dark:text-emerald-300">
                {t("pcmg.physicsExecutionVerified")}
              </AlertTitle>
              <AlertDescription className="font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("common.status")}</span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                    {t("common.completed")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pcmg.fidelity")}</span>
                  <span>{props.verifyResult.fidelityScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pcmg.resonance")}</span>
                  <span>{props.verifyResult.resonanceScore}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pcmg.fundsReleased")}</span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                    {formatToken(props.verifyResult.rewardReleased)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("pcmg.creatorReputation")}
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                    +1
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {props.verifyResult?.status === "Slashed" && (
          <motion.div
            key="slashed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <Alert variant="destructive" className="border-rose-500/40">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle className="font-mono text-xs">
                {t("pcmg.executorSlashed")}
              </AlertTitle>
              <AlertDescription className="font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("common.status")}</span>
                  <span className="text-rose-700 dark:text-rose-300 font-bold">
                    {t("common.slashed")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pcmg.fidelity")}</span>
                  <span>{props.verifyResult.fidelityScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pcmg.resonance")}</span>
                  <span className="text-rose-700 dark:text-rose-300">
                    {props.verifyResult.resonanceScore}
                  </span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pcmg.slashAmount")}</span>
                  <span className="text-rose-700 dark:text-rose-300 font-bold">
                    {props.currentIntent
                      ? formatToken(props.currentIntent.afcEscrowAmount)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pcmg.refundedTo")}</span>
                  <span>{t("pcmg.creatorAvatarRefund")}</span>
                </div>
                <div className="pt-1 text-[10px] text-rose-700 dark:text-rose-300">
                  {t("pcmg.reasonLabel")} {props.verifyResult.slashReason}
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {!props.verifyResult && !props.verifyError && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-md border border-dashed border-border/60 p-4 text-center"
          >
            <Banknote className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-[11px] text-muted-foreground font-mono">
              {t("pcmg.awaitingVerify")}
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
              {t("pcmg.completedFundsSlashedRefund")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {(props.verifyResult || props.verifyError) && (
        <Button
          variant="outline"
          size="sm"
          onClick={props.onReset}
          className="w-full font-mono text-xs gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("pcmg.resetActiveIntent")}
        </Button>
      )}
    </div>
  );
}
