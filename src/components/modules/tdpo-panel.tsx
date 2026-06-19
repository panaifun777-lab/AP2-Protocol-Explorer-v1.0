"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Lock,
  Sparkles,
  Trophy,
  Coins,
  Ban,
  CheckCircle2,
  XCircle,
  Hourglass,
  Zap,
  RefreshCw,
  Wand2,
} from "lucide-react";
import {
  PanelHeader,
  PanelCard,
  Stat,
} from "@/components/modules/panel-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useT, useLang } from "@/lib/i18n";
import {
  RFC_CONSTANTS,
  formatToken,
  parseFromJson,
  serializeForJson,
  type Amount,
  type CognitiveAsset,
  type TDPOLockResult,
  type TDPORetroactiveResult,
} from "@/lib/types";
import { isContrarianCognition } from "@/lib/contracts/tdpo";

// ----- Types for the list API response (after BigInt parse) -----
interface CreatorSummary {
  id: string;
  name: string;
  kind: string;
  address: string;
}

interface AssetWithCreator extends Omit<CognitiveAsset, "rewardAmount"> {
  rewardAmount: Amount;
  creatorAvatar: CreatorSummary;
}

interface PoolSummary {
  totalCollected: Amount;
  totalDistributed: Amount;
}

interface ListResponse {
  assets: AssetWithCreator[];
  pool: PoolSummary;
  avatars: CreatorSummary[];
  stats: { totalLocked: number; triggered: number };
}

// ----- Delay presets (RFC §5.1: T+30 / T+90 / T+180 / T+365) -----
const DELAY_PRESETS: { days: number; seconds: number }[] = [
  { days: 30, seconds: 30 * 86400 },
  { days: 90, seconds: 90 * 86400 },
  { days: 180, seconds: 180 * 86400 },
  { days: 365, seconds: 365 * 86400 },
];

function delayLabel(days: number, lang: "zh" | "en"): string {
  return lang === "zh" ? `T+${days} 天` : `T+${days} days`;
}

const PROPHET_NAME = "孤独先知 (XDP Originator)";

// ----- Helper: mint a fresh bytes32-like hex hash on the client -----
function mintHash(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return (
    "0x" +
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

// ----- Helper: parse BigInt strings from API JSON safely -----
function parseApiResponse<T>(raw: unknown): T {
  return parseFromJson<T>(raw as T);
}

// ============================================================
// TdpoPanel — full interactive TDPO simulation console
// ============================================================
export function TdpoPanel() {
  const { toast } = useToast();
  const t = useT();
  const lang = useLang((s) => s.lang);

  // ---- Server state ----
  const [data, setData] = React.useState<ListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  // ---- Form state ----
  const [creatorId, setCreatorId] = React.useState<string>("");
  const [cognitiveHash, setCognitiveHash] = React.useState<string>("");
  const [mean, setMean] = React.useState<number>(15);
  const [variance, setVariance] = React.useState<number>(850);
  const [delayIdx, setDelayIdx] = React.useState<number>(2); // T+180 default

  const [submitting, setSubmitting] = React.useState(false);
  const [injectingTax, setInjectingTax] = React.useState(false);

  // ---- Refresh list ----
  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/tdpo/list", { method: "GET" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "list failed");
      const parsed = parseApiResponse<ListResponse>(json.data);
      setData(parsed);
      // Pre-pick the XDP prophet if available and no creator selected yet
      if (!creatorId && parsed.avatars.length > 0) {
        const prophet = parsed.avatars.find((a) => a.name === PROPHET_NAME);
        setCreatorId(prophet?.id ?? parsed.avatars[0].id);
      }
    } catch (e) {
      toast({
        title: lang === "zh" ? "加载 TDPO 状态失败" : "Failed to load TDPO state",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [creatorId, toast, lang]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  // ---- Live validation ----
  const contrarian = isContrarianCognition(mean, variance);

  // ---- Lock cognition ----
  const onLock = React.useCallback(async () => {
    if (!creatorId) {
      toast({
        title: lang === "zh" ? "需要创建者" : "Creator required",
        description:
          lang === "zh"
            ? "请选择一个分身来锁定认知。"
            : "Pick an avatar to lock a cognition for.",
        variant: "destructive",
      });
      return;
    }
    if (!cognitiveHash) {
      toast({
        title: lang === "zh" ? "需要哈希" : "Hash required",
        description:
          lang === "zh"
            ? "请先生成或粘贴一个认知哈希。"
            : "Generate or paste a cognitive hash first.",
        variant: "destructive",
      });
      return;
    }
    if (!contrarian) {
      toast({
        title: lang === "zh" ? "不符合超前认知条件" : "Not a contrarian cognition",
        description:
          lang === "zh"
            ? `需要方差 > ${RFC_CONSTANTS.TDPO_VARIANCE_THRESHOLD} 且 均值 < ${RFC_CONSTANTS.TDPO_MEAN_THRESHOLD}。`
            : `Need variance > ${RFC_CONSTANTS.TDPO_VARIANCE_THRESHOLD} AND mean < ${RFC_CONSTANTS.TDPO_MEAN_THRESHOLD}.`,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tdpo/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cognitiveHash,
          creatorAvatarId: creatorId,
          mean,
          variance,
          delaySeconds: DELAY_PRESETS[delayIdx].seconds,
        }),
      });
      const json = await res.json();
      if (!json.ok || res.status >= 400) {
        throw new Error(json.error ?? "lock failed");
      }
      const parsed = parseApiResponse<{ lockResult: TDPOLockResult; asset: AssetWithCreator }>(
        json.data,
      );
      toast({
        title: lang === "zh" ? "超前认知已锁定" : "Contrarian cognition locked",
        description:
          lang === "zh"
            ? `哈希 ${parsed.lockResult.cognitiveHash.slice(0, 10)}… · ${delayLabel(DELAY_PRESETS[delayIdx].days, lang)} 后解锁`
            : `Hash ${parsed.lockResult.cognitiveHash.slice(0, 10)}… · unlocks in ${delayLabel(DELAY_PRESETS[delayIdx].days, lang)}`,
      });
      // Reset hash for next lock; keep creator + metrics for re-locking variants
      setCognitiveHash("");
      await refresh();
    } catch (e) {
      toast({
        title: lang === "zh" ? "锁定失败" : "Lock failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [contrarian, cognitiveHash, creatorId, delayIdx, mean, variance, toast, refresh, lang]);

  // ---- Advance time & claim ----
  const onAdvanceTime = React.useCallback(
    async (
      hash: string,
      futureMean: number,
      futureCitations: number,
    ): Promise<TDPORetroactiveResult | null> => {
      try {
        const res = await fetch("/api/tdpo/advance-time", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cognitiveHash: hash,
            futureMean,
            futureCitations,
          }),
        });
        const json = await res.json();
        if (!json.ok || res.status >= 400) {
          throw new Error(json.error ?? "advance-time failed");
        }
        const parsed = parseApiResponse<TDPORetroactiveResult>(json.data);
        if (parsed.triggered) {
          toast({
            title: lang === "zh" ? "先知已平反!" : "Prophet vindicated!",
            description:
              lang === "zh"
                ? `奖励 ${formatToken(parsed.rewardAmount)} · 认知权重 +${parsed.reputationDelta} · 因子 ×${parsed.evolutionFactor}`
                : `Reward ${formatToken(parsed.rewardAmount)} · rep +${parsed.reputationDelta} · factor ×${parsed.evolutionFactor}`,
          });
        } else {
          toast({
            title: lang === "zh" ? "触发条件未满足" : "Trigger conditions not met",
            description: parsed.reason,
            variant: "destructive",
          });
        }
        await refresh();
        return parsed;
      } catch (e) {
        toast({
          title: lang === "zh" ? "推进时间失败" : "Advance-time failed",
          description: (e as Error).message,
          variant: "destructive",
        });
        return null;
      }
    },
    [toast, refresh, lang],
  );

  // ---- Inject mediocrity tax ----
  const onInjectTax = React.useCallback(
    async (amountUsdc: number) => {
      setInjectingTax(true);
      try {
        const res = await fetch("/api/tdpo/inject-tax", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountUsdc }),
        });
        const json = await res.json();
        if (!json.ok || res.status >= 400) {
          throw new Error(json.error ?? "inject-tax failed");
        }
        toast({
          title: lang === "zh" ? "平庸税已注入" : "Mediocrity tax injected",
          description:
            lang === "zh"
              ? `+${amountUsdc.toLocaleString()} $AFC 已注入超前认知奖励池。`
              : `+${amountUsdc.toLocaleString()} $AFC into the contrarian reward pool.`,
        });
        await refresh();
      } catch (e) {
        toast({
          title: lang === "zh" ? "税款注入失败" : "Tax injection failed",
          description: (e as Error).message,
          variant: "destructive",
        });
      } finally {
        setInjectingTax(false);
      }
    },
    [toast, refresh, lang],
  );

  // ---- Preset: XDP Prophet scenario ----
  const onRunProphetPreset = React.useCallback(() => {
    const prophet = data?.avatars.find((a) => a.name === PROPHET_NAME);
    if (prophet) setCreatorId(prophet.id);
    setMean(15);
    setVariance(850);
    setDelayIdx(2); // T+180
    if (!cognitiveHash) setCognitiveHash(mintHash());
    toast({
      title: lang === "zh" ? "XDP 先知场景已加载" : "XDP Prophet scenario loaded",
      description:
        lang === "zh"
          ? "均值=15 · 方差=850 · T+180天。立即锁定,然后推进时使用 futureMean=950, citations=5000 → 因子 ×63。"
          : "mean=15 · variance=850 · T+180d. Lock now, then on advance use futureMean=950, citations=5000 → factor ×63.",
    });
  }, [data, cognitiveHash, toast, lang]);

  // ---- Derived stats ----
  const totalLocked = data?.stats.totalLocked ?? 0;
  const triggered = data?.stats.triggered ?? 0;
  const poolCollected = data?.pool.totalCollected ?? 0n;
  const poolDistributed = data?.pool.totalDistributed ?? 0n;

  return (
    <div>
      <PanelHeader
        icon={Clock}
        title={t("tdpo.title")}
        rfcSection="RFC §5.1 (TDPO)"
        description={t("tdpo.description")}
        accent="amber"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs gap-1.5"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            {t("header.refresh")}
          </Button>
        }
      />

      {/* ===== Top stats ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label={t("tdpo.lockedCognitions")}
          value={totalLocked}
          hint={t("tdpo.hintContrarianAssets")}
          accent="amber"
        />
        <Stat
          label={t("tdpo.vindicatedProphets")}
          value={triggered}
          hint={t("tdpo.hintRetroactiveTriggers")}
          accent="emerald"
        />
        <Stat
          label={t("tdpo.poolBalance")}
          value={formatToken(poolCollected)}
          hint="contrarianRewardPool"
          accent="violet"
        />
        <Stat
          label={t("tdpo.totalDistributed")}
          value={formatToken(poolDistributed)}
          hint={t("tdpo.hintPaidToProphets")}
          accent="cyan"
        />
      </div>

      {/* ===== Two-column layout ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-4 mb-4">
        {/* ----- LEFT: Lock Contrarian Cognition form ----- */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <PanelCard
            title={t("tdpo.lockContrarian")}
            icon={Lock}
            action={
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-[11px] gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400"
                onClick={onRunProphetPreset}
              >
                <Wand2 className="h-3.5 w-3.5" />
                {t("tdpo.runXdpScenario")}
              </Button>
            }
          >
            <div className="space-y-4">
              {/* Creator select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">
                  {t("tdpo.creatorAvatar")}
                </Label>
                <Select value={creatorId} onValueChange={setCreatorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("tdpo.selectCreatorAvatar")} />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.avatars.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="font-mono text-xs">{a.name}</span>
                        <Badge variant="outline" className="ml-2 text-[9px]">
                          {a.kind}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cognitive hash + auto-gen */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">
                  {t("tdpo.cognitiveHash")} (bytes32)
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={cognitiveHash}
                    onChange={(e) => setCognitiveHash(e.target.value)}
                    placeholder="0x…"
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs gap-1.5 shrink-0"
                    onClick={() => setCognitiveHash(mintHash())}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("tdpo.generate")}
                  </Button>
                </div>
              </div>

              {/* Mean slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">
                    {t("tdpo.initialMean")}
                  </Label>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[10px] ${
                      mean < RFC_CONSTANTS.TDPO_MEAN_THRESHOLD
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "border-rose-500/40 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {mean} / {RFC_CONSTANTS.TDPO_MEAN_THRESHOLD}
                  </Badge>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[mean]}
                  onValueChange={(v) => setMean(v[0] ?? 0)}
                />
              </div>

              {/* Variance slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground">
                    {t("tdpo.initialVariance")}
                  </Label>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[10px] ${
                      variance > RFC_CONSTANTS.TDPO_VARIANCE_THRESHOLD
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "border-rose-500/40 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {variance} / {RFC_CONSTANTS.TDPO_VARIANCE_THRESHOLD}
                  </Badge>
                </div>
                <Slider
                  min={0}
                  max={1000}
                  step={10}
                  value={[variance]}
                  onValueChange={(v) => setVariance(v[0] ?? 0)}
                />
              </div>

              {/* Delay select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">
                  {t("tdpo.delayWindow")}
                </Label>
                <Select
                  value={String(delayIdx)}
                  onValueChange={(v) => setDelayIdx(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAY_PRESETS.map((p, i) => (
                      <SelectItem key={p.days} value={String(i)}>
                        <span className="font-mono text-xs">{delayLabel(p.days, lang)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Live validation */}
              <div
                className={`flex items-start gap-2 rounded-md border p-3 ${
                  contrarian
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-rose-500/40 bg-rose-500/5"
                }`}
              >
                {contrarian ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs font-mono leading-snug">
                  {contrarian ? (
                    <span className="text-emerald-700 dark:text-emerald-300">
                      {t("tdpo.eligibleForLock")}
                      <br />
                      <span className="text-muted-foreground">
                        {lang === "zh"
                          ? `方差 (${variance}) > ${RFC_CONSTANTS.TDPO_VARIANCE_THRESHOLD} 且 均值 (${mean}) < ${RFC_CONSTANTS.TDPO_MEAN_THRESHOLD}`
                          : `variance (${variance}) > ${RFC_CONSTANTS.TDPO_VARIANCE_THRESHOLD} AND mean (${mean}) < ${RFC_CONSTANTS.TDPO_MEAN_THRESHOLD}`}
                      </span>
                    </span>
                  ) : (
                    <span className="text-rose-700 dark:text-rose-300">
                      {t("tdpo.notContrarianDetail")}
                      <br />
                      <span className="text-muted-foreground">
                        {lang === "zh"
                          ? `方差 > ${RFC_CONSTANTS.TDPO_VARIANCE_THRESHOLD} (当前 ${variance}) 且 均值 < ${RFC_CONSTANTS.TDPO_MEAN_THRESHOLD} (当前 ${mean})`
                          : `variance > ${RFC_CONSTANTS.TDPO_VARIANCE_THRESHOLD} (current ${variance}) AND mean < ${RFC_CONSTANTS.TDPO_MEAN_THRESHOLD} (current ${mean})`}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Lock button */}
              <Button
                className="w-full font-mono text-sm gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={!contrarian || !creatorId || !cognitiveHash || submitting}
                onClick={() => void onLock()}
              >
                <Lock className="h-4 w-4" />
                {submitting ? t("tdpo.locking") : t("tdpo.lockBtn")}
              </Button>
            </div>
          </PanelCard>
        </motion.div>

        {/* ----- RIGHT: Active Cognitive Assets ----- */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <PanelCard
            title={t("tdpo.activeAssets")}
            icon={Hourglass}
            action={
              <Badge variant="outline" className="font-mono text-[10px]">
                {lang === "zh"
                  ? `${data?.assets.length ?? 0} 个资产`
                  : `${data?.assets.length ?? 0} asset(s)`}
              </Badge>
            }
          >
            <div className="max-h-[640px] overflow-y-auto scrollbar-cyber pr-1 space-y-3">
              {!data || data.assets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-muted-foreground font-mono text-xs">
                  {t("tdpo.noAssets")}
                </div>
              ) : (
                data.assets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    onAdvance={onAdvanceTime}
                  />
                ))
              )}
            </div>
          </PanelCard>
        </motion.div>
      </div>

      {/* ===== Bottom: Mediocrity Pool ===== */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        <PanelCard title={t("tdpo.mediocrityPool")} icon={Coins}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {t("tdpo.poolBalanceLabel")} (contrarianRewardPool)
              </div>
              <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatToken(poolCollected)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                RFC line 446-449 · {t("tdpo.taxHint")}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {t("tdpo.totalDistributed")}
              </div>
              <div className="font-mono text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {formatToken(poolDistributed)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {t("tdpo.distributedHint")}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs gap-1.5 border-violet-500/40 text-violet-600 dark:text-violet-400"
                disabled={injectingTax}
                onClick={() => void onInjectTax(100)}
              >
                <Zap className="h-3.5 w-3.5" />
                {t("tdpo.injectTaxBtn")} (+100 $AFC)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs gap-1.5"
                disabled={injectingTax}
                onClick={() => void onInjectTax(1000)}
              >
                <Zap className="h-3.5 w-3.5" />
                {t("tdpo.injectTaxBtn")} (+1,000 $AFC)
              </Button>
            </div>
          </div>
        </PanelCard>
      </motion.div>
    </div>
  );
}

// ============================================================
// AssetCard — single cognitive asset with timeline + advance form
// ============================================================
interface AssetCardProps {
  asset: AssetWithCreator;
  onAdvance: (
    hash: string,
    futureMean: number,
    futureCitations: number,
  ) => Promise<TDPORetroactiveResult | null>;
}

function AssetCard({ asset, onAdvance }: AssetCardProps) {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const now = Date.now();
  const lockMs = new Date(asset.lockTimestamp).getTime();
  const unlockMs = new Date(asset.unlockTimestamp).getTime();
  const totalMs = Math.max(unlockMs - lockMs, 1);
  const elapsedMs = Math.min(Math.max(now - lockMs, 0), totalMs);
  const progressPct = Math.round((elapsedMs / totalMs) * 100);

  const isUnlocked = now >= unlockMs;
  const isTriggered = asset.isRetroactiveTriggered;
  const isPending = isUnlocked && !isTriggered;

  // Status badge
  const status = isTriggered
    ? { label: "Vindicated", cls: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400", Icon: Trophy }
    : isUnlocked
      ? { label: "Pending", cls: "border-amber-500/40 text-amber-600 dark:text-amber-400", Icon: Hourglass }
      : { label: "Locked", cls: "border-rose-500/40 text-rose-600 dark:text-rose-400", Icon: Lock };
  const StatusIcon = status.Icon;

  // Advance-time form (only for pending assets)
  const [futureMean, setFutureMean] = React.useState<number>(950);
  const [futureCitations, setFutureCitations] = React.useState<number>(5000);
  const [advancing, setAdvancing] = React.useState<boolean>(false);

  const onAdvanceLocal = async () => {
    setAdvancing(true);
    try {
      await onAdvance(asset.cognitiveHash, futureMean, futureCitations);
    } finally {
      setAdvancing(false);
    }
  };

  // Projected evolution factor (for hint)
  const projectedFactor =
    futureMean > 0 ? Math.floor(futureMean / (asset.initialMean + 1)) : 0;
  const willTrigger =
    projectedFactor > RFC_CONSTANTS.TDPO_EVOLUTION_FACTOR_TRIGGER &&
    futureCitations > RFC_CONSTANTS.TDPO_CITATIONS_TRIGGER;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <Card className="border-border/60">
        <CardContent className="pt-4 space-y-3">
          {/* Row 1: hash + status */}
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-[11px] text-muted-foreground truncate">
              {asset.cognitiveHash.slice(0, 10)}…{asset.cognitiveHash.slice(-6)}
            </div>
            <Badge variant="outline" className={`font-mono text-[10px] gap-1 ${status.cls}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          {/* Row 2: creator + initial metrics */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-mono">
              {asset.creatorAvatar.name}
            </span>
            <Badge variant="secondary" className="font-mono text-[9px]">
              {lang === "zh" ? "均值" : "mean"}={asset.initialMean}
            </Badge>
            <Badge variant="secondary" className="font-mono text-[9px]">
              {lang === "zh" ? "方差" : "var"}={asset.initialVariance}
            </Badge>
          </div>

          {/* Row 3: timeline progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>{t("tdpo.lockShort")}: {new Date(asset.lockTimestamp).toLocaleDateString()}</span>
              <span>{t("tdpo.unlockShort")}: {new Date(asset.unlockTimestamp).toLocaleDateString()}</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>{progressPct}% {t("common.elapsed")}</span>
              <span>
                {isUnlocked
                  ? t("tdpo.windowOpen")
                  : lang === "zh"
                    ? `${Math.ceil((unlockMs - now) / 86400000)}天剩余`
                    : `${Math.ceil((unlockMs - now) / 86400000)}d left`}
              </span>
            </div>
          </div>

          {/* Row 4: if triggered, show reward */}
          {isTriggered && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <Trophy className="h-3.5 w-3.5" />
                Vindicated — factor ×{asset.evolutionFactor}
              </div>
              <div className="mt-1 text-muted-foreground">
                {t("tdpo.reward")}: <span className="text-foreground">{formatToken(asset.rewardAmount)}</span>
                <br />
                {lang === "zh"
                  ? `未来均值=${asset.futureMean} · 引用数=${asset.futureCitations}`
                  : `Future mean=${asset.futureMean} · citations=${asset.futureCitations}`}
              </div>
            </div>
          )}

          {/* Row 5: advance-time form (pending assets only) */}
          {isPending && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-700 dark:text-amber-300">
                <Hourglass className="h-3.5 w-3.5" />
                {t("tdpo.timeLockExpired")}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] font-mono text-muted-foreground">
                    {t("tdpo.futureMean")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={futureMean}
                    onChange={(e) => setFutureMean(Number(e.target.value))}
                    className="h-8 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-mono text-muted-foreground">
                    {t("tdpo.futureCitations")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={futureCitations}
                    onChange={(e) => setFutureCitations(Number(e.target.value))}
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {t("tdpo.projectedFactor")} ×{projectedFactor} ·{" "}
                  {willTrigger ? (
                    <span className="text-emerald-600 dark:text-emerald-400">{t("tdpo.willTrigger")}</span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400">{t("tdpo.wontTrigger")}</span>
                  )}
                </span>
                <Button
                  size="sm"
                  className="font-mono text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={advancing}
                  onClick={() => void onAdvanceLocal()}
                >
                  {advancing ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trophy className="h-3.5 w-3.5" />
                  )}
                  {advancing ? t("tdpo.claiming") : t("tdpo.advanceClaimBtn")}
                </Button>
              </div>
            </div>
          )}

          {/* Row 6: not-yet-unlocked hint */}
          {!isUnlocked && !isTriggered && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <Ban className="h-3 w-3" />
              {lang === "zh"
                ? `时间锁激活中 — 推进时间表单将在 T+${Math.ceil((unlockMs - lockMs) / 86400000)}天 解锁`
                : `Time-lock active — advance-time form unlocks at T+${Math.ceil((unlockMs - lockMs) / 86400000)}d`}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Re-export serializeForJson so callers can mirror the BigInt round-trip
// (not used inside the panel directly, but exported for test parity).
export const _serializeForJson = serializeForJson;
