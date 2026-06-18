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
  { label: string; cls: string; dot: string }
> = {
  Pending: {
    label: "Pending",
    cls: "border-muted-foreground/30 text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  Executing: {
    label: "Executing",
    cls: "border-amber-500/40 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Verifying: {
    label: "Verifying",
    cls: "border-cyan-500/40 text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  Completed: {
    label: "Completed",
    cls: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Slashed: {
    label: "Slashed",
    cls: "border-rose-500/40 text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

function StatusBadge({ status }: { status: PhysicsIntentStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-[10px] gap-1", s.cls)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </Badge>
  );
}

// ============================================================
// Scenario presets
// ============================================================
type PresetId = "perfect" | "dissonance" | "forged";

interface PresetDef {
  id: PresetId;
  title: string;
  hint: string;
  description: string;
  constraints: string;
  amountUsdc: number;
  fidelity: number;
  resonance: number;
  expected: "Completed" | "Slashed" | "Rejected";
  expectedLabel: string;
  accent: "emerald" | "rose" | "amber";
}

const PRESETS: PresetDef[] = [
  {
    id: "perfect",
    title: "Perfect Latte",
    hint: "fidelity 9500 · resonance 8800",
    description: "Buy me a relaxing latte (cafe, 30min)",
    constraints: JSON.stringify(
      { location: "BlueBottle Cafe", item: "oat-milk latte", time: "30min" },
      null,
      0,
    ),
    amountUsdc: 5,
    fidelity: 9500,
    resonance: 8800,
    expected: "Completed",
    expectedLabel: "→ Completed · funds released",
    accent: "emerald",
  },
  {
    id: "dissonance",
    title: "Cold Coffee Dissonance",
    hint: "fidelity 9200 · resonance 3000",
    description: "Buy me a relaxing latte (got cold bitter coffee)",
    constraints: JSON.stringify(
      { location: "vending-machine", item: "cold black coffee", time: "5min" },
      null,
      0,
    ),
    amountUsdc: 5,
    fidelity: 9200,
    resonance: 3000,
    expected: "Slashed",
    expectedLabel: "→ Slashed · ECE resonance failed",
    accent: "rose",
  },
  {
    id: "forged",
    title: "Forged Proof",
    hint: "fidelity 6500 · resonance 9000",
    description: "Buy me a relaxing latte (AI-faked photo proof)",
    constraints: JSON.stringify(
      { location: "unknown", item: "stock photo", time: "0min" },
      null,
      0,
    ),
    amountUsdc: 5,
    fidelity: 6500,
    resonance: 9000,
    expected: "Rejected",
    expectedLabel: "→ 400 · Physical proof invalid",
    accent: "amber",
  },
];

// ============================================================
// Main panel
// ============================================================
export function PcmgPanel() {
  const { toast } = useToast();

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
          title: "Failed to load PCMG data",
          description: parsed.error,
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
      setLoadingList(false);
    }
  }, [toast]);

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
          title: "Missing input",
          description: "Select both a creator avatar and an executor.",
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
            title: "Bridge failed",
            description: parsed.error ?? "Unknown error",
            variant: "destructive",
          });
          return null;
        }
        if (!opts?.silent) {
          toast({
            title: "Intent bridged to physical membrane",
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
          title: "Network error",
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
          title: "No active intent",
          description: "Bridge an intent first (Phase 1).",
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
            title: "Proof rejected (require reverted)",
            description: parsed.error,
            variant: "destructive",
          });
          await refresh();
          return null;
        }
        setVerifyResult(parsed.data);
        if (parsed.data.status === "Completed") {
          toast({
            title: "Physics execution verified",
            description: `Resonance ${parsed.data.resonanceScore} · funds released + creator reputation +1`,
          });
        } else if (parsed.data.status === "Slashed") {
          toast({
            title: "Executor slashed",
            description: `Resonance ${parsed.data.resonanceScore} · stake refunded to creator`,
            variant: "destructive",
          });
        }
        await refresh();
        return parsed.data;
      } catch (e) {
        setVerifyError((e as Error).message);
        toast({
          title: "Network error",
          description: (e as Error).message,
          variant: "destructive",
        });
        return null;
      } finally {
        setVerifying(false);
      }
    },
    [currentIntent, fidelity, resonance, refresh, toast],
  );

  // ----- preset runner -----
  const runPreset = React.useCallback(
    async (preset: PresetDef) => {
      // 1) bridge a fresh intent with scenario-specific config
      const fresh = await bridge({
        description: preset.description,
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
    [bridge, submitProof],
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
        title="PCMG Phygital Cross-Membrane Gateway"
        rfcSection="RFC §5.3"
        description="Digital intent → physical execution → multimodal proof → ECE resonance validation → slashing. Mirrors PhygitalGateway.sol (fidelity > 8000 AND resonance > 7500)."
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
            Refresh
          </Button>
        }
      />

      {/* ============ STATS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Total Intents"
          value={stats.total}
          hint="all physics intents"
          accent="rose"
        />
        <Stat
          label="Executing"
          value={stats.executing}
          hint="awaiting proof"
          accent="amber"
        />
        <Stat
          label="Completed"
          value={stats.completed}
          hint="funds released"
          accent="emerald"
        />
        <Stat
          label="Slashed"
          value={stats.slashed}
          hint="stake refunded"
          accent="rose"
        />
      </div>

      {/* ============ PRESETS ============ */}
      <PanelCard title="Quick Scenarios" icon={FlaskConical}>
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
          Each preset auto-bridges a fresh intent, sets the fidelity/resonance
          sliders, and submits the proof — end-to-end through all 4 phases.
        </p>
      </PanelCard>

      {/* ============ 4-PHASE FLOW ============ */}
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
        <PhaseShell
          phase={1}
          title="意图降维 Intent Bridge"
          subtitle="Digital → Physical membrane"
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
          title="物理执行 Physical Execution"
          subtitle="Multimodal proof capture"
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
          title="逆映射校验 Reverse Mapping"
          subtitle="ZK verify + ECE resonance"
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
          title="跨膜结算 Cross-Membrane Settle"
          subtitle="Release funds or slash"
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
        title="Active Physics Intents"
        icon={Activity}
        action={
          <Badge variant="outline" className="font-mono text-[10px]">
            {intents.length} records
          </Badge>
        }
      >
        <div className="max-h-96 overflow-y-auto scrollbar-cyber rounded-md border border-border/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono text-[10px] uppercase">
                  Intent
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  Creator
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  Executor
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  $AFC
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  Fidelity
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  Resonance
                </TableHead>
                <TableHead className="font-mono text-[10px] uppercase">
                  Status
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
                    No physics intents yet. Bridge one above or run a preset.
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
          RFC §5.3 — Two-Threshold Validation
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
          . A low-fidelity proof 400-rejects BEFORE the resonance check
          (mirrors Solidity require-revert ordering). Slashing refunds the full{" "}
          <code>afcEscrowAmount</code> to the creator.
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
        <span className="font-mono text-xs font-bold">{preset.title}</span>
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">
        {preset.hint}
      </span>
      <span className="text-[10px] font-mono opacity-80">
        {preset.expectedLabel}
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
        <Label className="text-[11px] font-mono">Creator Avatar</Label>
        <Select
          value={props.creatorAvatarId}
          onValueChange={props.setCreatorAvatarId}
        >
          <SelectTrigger className="h-8 text-xs font-mono w-full">
            <SelectValue placeholder="Select creator…" />
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
        <Label className="text-[11px] font-mono">Intent Description</Label>
        <Input
          value={props.description}
          onChange={(e) => props.setDescription(e.target.value)}
          className="h-8 text-xs font-mono"
          placeholder="e.g. Buy me a relaxing latte"
        />
        <p className="text-[10px] text-muted-foreground font-mono truncate">
          hash: {props.intentHashPreview.slice(0, 30)}…
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-mono">$AFC Amount</Label>
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
          <Label className="text-[11px] font-mono">Deadline (min)</Label>
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
          <span>Physics Constraints (JSON)</span>
          <span
            className={cn(
              "text-[10px]",
              constraintsValid
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {constraintsValid ? "valid" : "invalid JSON"}
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
        <Label className="text-[11px] font-mono">Physical Executor</Label>
        <Select value={props.executorId} onValueChange={props.setExecutorId}>
          <SelectTrigger className="h-8 text-xs font-mono w-full">
            <SelectValue placeholder="Select executor…" />
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
        Bridge to Physical
      </Button>
      {props.avatars.length === 0 && (
        <p className="text-[10px] text-muted-foreground font-mono">
          No avatars found. Run /api/seed first.
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
  return (
    <div className="space-y-3">
      {props.currentIntent ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground uppercase">
              Bridged Intent
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
              escrow locked
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border/60 p-3 text-center">
          <Cpu className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground font-mono">
            No active intent. Bridge one in Phase 1.
          </p>
        </div>
      )}

      <Separator className="my-1" />

      <div className="space-y-1.5">
        <Label className="text-[11px] font-mono flex items-center justify-between">
          <span>Fidelity (M-Pata ZK)</span>
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
          spatial audio + temp sensor + HRV
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-mono flex items-center justify-between">
          <span>Resonance (ECE state vector)</span>
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
          emotional baseline match
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
              ? "Both thresholds satisfied"
              : props.fidelityPass
                ? "Resonance below threshold"
                : props.resonancePass
                  ? "Fidelity below threshold"
                  : "Both thresholds failed"}
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
  const ready =
    !!props.currentIntent && props.currentIntent.status === "Executing";

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground uppercase">
            Step 1 · Physics Oracle
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
            Step 2 · ECE Resonance
          </span>
          <Badge
            variant="outline"
            className="font-mono text-[10px] border-violet-500/40 text-violet-600 dark:text-violet-400"
          >
            Emotional baseline
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
        Submit Proof &amp; Verify
      </Button>
      {!ready && (
        <p className="text-[10px] text-muted-foreground font-mono">
          {props.currentIntent
            ? `Intent is ${props.currentIntent.status} (must be Executing).`
            : "Bridge an intent in Phase 1 first."}
        </p>
      )}
    </div>
  );
}

function FidelityMeter({ value }: { value: number }) {
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
              Physical proof valid
            </span>
          </>
        ) : (
          <>
            <ShieldAlert className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            <span className="text-rose-600 dark:text-rose-400">
              Low fidelity — require will revert
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function ResonanceMeter({ value }: { value: number }) {
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
            ? "Emotional resonance aligned"
            : "Emotional dissonance detected"}
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
                Proof Rejected (400)
              </AlertTitle>
              <AlertDescription className="font-mono text-[11px]">
                {props.verifyError}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Transaction reverted before ECE check — physical fidelity
                  below {PCMG_THRESHOLDS.fidelity} threshold. No state change
                  persisted (intent stays Executing).
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
                Physics Execution Verified
              </AlertTitle>
              <AlertDescription className="font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                    Completed
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fidelity</span>
                  <span>{props.verifyResult.fidelityScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resonance</span>
                  <span>{props.verifyResult.resonanceScore}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Funds released</span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                    {formatToken(props.verifyResult.rewardReleased)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Creator reputation
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
                Executor Slashed
              </AlertTitle>
              <AlertDescription className="font-mono text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-rose-700 dark:text-rose-300 font-bold">
                    Slashed
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fidelity</span>
                  <span>{props.verifyResult.fidelityScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resonance</span>
                  <span className="text-rose-700 dark:text-rose-300">
                    {props.verifyResult.resonanceScore}
                  </span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slash amount</span>
                  <span className="text-rose-700 dark:text-rose-300 font-bold">
                    {props.currentIntent
                      ? formatToken(props.currentIntent.afcEscrowAmount)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refunded to</span>
                  <span>creator avatar</span>
                </div>
                <div className="pt-1 text-[10px] text-rose-700 dark:text-rose-300">
                  reason: {props.verifyResult.slashReason}
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
              Awaiting verify in Phase 3.
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
              Completed → funds released · Slashed → refund
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
          Reset Active Intent
        </Button>
      )}
    </div>
  );
}
