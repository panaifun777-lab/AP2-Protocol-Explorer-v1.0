"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Sparkles,
  Skull,
  Zap,
  ShieldCheck,
  ShieldAlert,
  ShieldBan,
  Ghost,
  ArrowRight,
  Loader2,
  RefreshCw,
  Fingerprint,
  KeyRound,
  HeartPulse,
  Flame,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Lock,
  Coins,
} from "lucide-react";
import { PanelHeader, PanelCard, Stat } from "./panel-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { parseFromJson, type Avatar } from "@/lib/types";
import {
  PURE_THRESHOLD,
  MIN_THRESHOLD,
  classifyMatchScore,
} from "@/lib/contracts/cip";
import { useT, useLang } from "@/lib/i18n";

// ============================================================
// Local view types (decoded from the API; matches shared types
// but we keep them as plain structs here for ergonomic state use)
// ============================================================
interface CIPRecordView {
  id: string;
  entityId: string;
  cognitiveRoot: string;
  creationTimestamp: string;
  isDeceasedOrMigrated: boolean;
  currentActiveAddressId: string | null;
  migrationCount: number;
  lastMatchScore: number;
  activeAvatar: Avatar | null;
}

interface CDSTokenView {
  id: string;
  tokenId: number;
  entityId: string;
  ownerAvatarId: string;
  metadataHash: string;
  isSoulbound: boolean;
  mintTimestamp: string;
  ownerAvatar: Avatar | null;
}

interface ListResponse {
  records: CIPRecordView[];
  tokens: CDSTokenView[];
  avatars: Avatar[];
  stats: {
    totalEntities: number;
    totalMigrations: number;
    migratedEntities: number;
    cdsTokensMinted: number;
    avgMatchScore: number;
  };
}

// ============================================================
// Helpers
// ============================================================
function randHex(prefix: string, len = 8): string {
  const chars = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
  return `${prefix}_${s}`;
}

function shortAddr(a?: string | null): string {
  if (!a) return "—";
  return a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ============================================================
// Outcome badge — shared visual for the three CIP outcomes
// ============================================================
function OutcomeBadge({
  outcome,
  matchScore,
}: {
  outcome: "PURE_INHERITANCE" | "FUSION_EMERGENCE" | "HIJACK_REJECTED";
  matchScore?: number;
}) {
  const cfg = {
    PURE_INHERITANCE: {
      label: "PURE_INHERITANCE",
      cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      Icon: ShieldCheck,
    },
    FUSION_EMERGENCE: {
      label: "FUSION_EMERGENCE",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      Icon: Flame,
    },
    HIJACK_REJECTED: {
      label: "HIJACK_REJECTED",
      cls: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      Icon: ShieldBan,
    },
  }[outcome];
  const Icon = cfg.Icon;
  return (
    <Badge
      variant="outline"
      className={`font-mono text-[10px] gap-1 ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
      {typeof matchScore === "number" && (
        <span className="opacity-70">· {(matchScore / 100).toFixed(2)}%</span>
      )}
    </Badge>
  );
}

// ============================================================
// Slider with three-zone marks (HIJACK | FUSION | PURE)
// ============================================================
function MatchScoreSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const t = useT();
  const { band } = classifyMatchScore(value);
  const zoneColor =
    band === "pure"
      ? "text-emerald-500"
      : band === "fusion"
        ? "text-amber-500"
        : "text-rose-500";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-mono text-xs">{t("cip.cognitiveMatchScoreLabel")}</Label>
        <span
          className={`font-mono text-sm font-bold ${zoneColor}`}
        >
          {value} · {(value / 100).toFixed(2)}%
        </span>
      </div>
      <Slider
        min={0}
        max={10000}
        step={10}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        className="py-1"
      />
      {/* Zone marks */}
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-2 h-px bg-border" />
        {/* pure zone */}
        <div
          className="absolute top-2 h-2 bg-emerald-500/30"
          style={{
            left: `${(PURE_THRESHOLD / 10000) * 100}%`,
            right: 0,
            transform: "translateY(-50%)",
          }}
        />
        {/* fusion zone */}
        <div
          className="absolute top-2 h-2 bg-amber-500/30"
          style={{
            left: `${(MIN_THRESHOLD / 10000) * 100}%`,
            width: `${((PURE_THRESHOLD - MIN_THRESHOLD) / 10000) * 100}%`,
            transform: "translateY(-50%)",
          }}
        />
        {/* hijack zone */}
        <div
          className="absolute top-2 h-2 bg-rose-500/30"
          style={{
            left: 0,
            width: `${(MIN_THRESHOLD / 10000) * 100}%`,
            transform: "translateY(-50%)",
          }}
        />
        {/* Markers */}
        {[
          { v: 0, label: "0", sub: "HIJACK" },
          { v: MIN_THRESHOLD, label: "6000", sub: "MIN" },
          { v: PURE_THRESHOLD, label: "8500", sub: "PURE" },
          { v: 10000, label: "10000", sub: "" },
        ].map((m) => (
          <div
            key={m.label}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${(m.v / 10000) * 100}%` }}
          >
            <div className="h-2 w-0.5 bg-foreground/40" />
            <div className="mt-1 font-mono text-[9px] text-muted-foreground">
              {m.label}
            </div>
            {m.sub && (
              <div className="font-mono text-[8px] text-muted-foreground/70">
                {m.sub}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Avatar pill — small visual used in token cards / migration view
// ============================================================
function AvatarPill({
  avatar,
  label,
  accent = "violet",
}: {
  avatar: Avatar | null;
  label?: string;
  accent?: "violet" | "emerald" | "rose" | "amber" | "cyan";
}) {
  const lang = useLang((s) => s.lang);
  const accentMap: Record<string, string> = {
    violet: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rose: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  };
  return (
    <div
      className={`rounded-md border px-2.5 py-1.5 ${accentMap[accent]}`}
    >
      <div className="font-mono text-[9px] uppercase tracking-wider opacity-70">
        {label ?? (lang === "zh" ? "分身" : "Avatar")}
      </div>
      <div className="font-mono text-xs font-semibold leading-tight">
        {avatar?.name ?? "—"}
      </div>
      <div className="font-mono text-[10px] opacity-70 leading-tight">
        {shortAddr(avatar?.address)}
      </div>
    </div>
  );
}

// ============================================================
// CDS Token card
// ============================================================
function CDSTokenCard({
  token,
  owner,
  compact = false,
}: {
  token: CDSTokenView;
  owner: Avatar | null;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold">
              CDS #{token.tokenId}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {shortAddr(token.metadataHash)}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="font-mono text-[9px] gap-1 border-violet-500/40 text-violet-600 dark:text-violet-400"
        >
          <Lock className="h-2.5 w-2.5" />
          {t("cip.soulbound")}
        </Badge>
      </div>
      {!compact && (
        <>
          <Separator className="my-2.5 bg-violet-500/20" />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                entityId
              </span>
              <span className="font-mono text-[10px] truncate max-w-[180px]">
                {shortAddr(token.entityId)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {t("cip.owner")}
              </span>
              <span className="font-mono text-[10px] truncate max-w-[180px]">
                {owner?.name ?? shortAddr(token.ownerAvatarId)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {t("cip.mintedLabel")}
              </span>
              <span className="font-mono text-[10px]">
                {formatDate(token.mintTimestamp)}
              </span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ============================================================
// Main panel
// ============================================================
export function CipPanel() {
  const { toast } = useToast();
  const t = useT();
  const lang = useLang((s) => s.lang);
  const [data, setData] = React.useState<ListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("register");

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/cip/list");
      const json = await res.json();
      if (json.ok) {
        setData(parseFromJson<ListResponse>(json.data));
      } else {
        toast({
          title: lang === "zh" ? "加载 CIP 注册表失败" : "Failed to load CIP registry",
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
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const stats = data?.stats ?? {
    totalEntities: 0,
    totalMigrations: 0,
    migratedEntities: 0,
    cdsTokensMinted: 0,
    avgMatchScore: 0,
  };

  // -------- Prophet Rebirth Scenario (one-click preset) --------
  const [runningScenario, setRunningScenario] = React.useState(false);
  const runProphetRebirth = async () => {
    if (!data?.avatars.length) {
      toast({
        title: lang === "zh" ? "未加载分身" : "No avatars loaded",
        description: lang === "zh" ? "请等待种子数据完成。" : "Wait for the seed to finish first.",
        variant: "destructive",
      });
      return;
    }
    setRunningScenario(true);
    try {
      // 1. Pick the XDP prophet avatar + a backup carrier
      const prophet = data.avatars.find((a) =>
        a.address.includes("Prophet_XDP"),
      ) ?? data.avatars.find((a) => a.kind === "prophet") ?? data.avatars[0];
      const backup =
        data.avatars.find((a) => a.id !== prophet.id && a.kind !== "agent") ??
        data.avatars.find((a) => a.id !== prophet.id) ??
        data.avatars[0];

      const entityId = "0xEntity_Prophet_XDP_Rebirth";
      const cognitiveRoot = "0xRoot_Original_Prophet";

      // 1a. Register (idempotent — skip if exists)
      const existing = data.records.find(
        (r) => r.entityId === entityId,
      );
      if (!existing) {
        const regRes = await fetch("/api/cip/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityId,
            cognitiveRoot,
            creatorAvatarId: prophet.id,
          }),
        });
        const regJson = await regRes.json();
        if (!regJson.ok) {
          throw new Error(regJson.error ?? "register failed");
        }
        toast({
          title: lang === "zh" ? "先知意识已注册" : "Prophet consciousness registered",
          description: lang === "zh"
            ? `entityId=${shortAddr(entityId)} · 载体=${prophet.name}`
            : `entityId=${shortAddr(entityId)} · carrier=${prophet.name}`,
        });
      }

      // 1b. Mint CDS SBT (always mint a new one to demonstrate soulTransfer)
      const mintRes = await fetch("/api/cip/mint-sbt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          metadataHash: "0xXDP_Cognition_Hash",
        }),
      });
      const mintJson = await mintRes.json();
      if (!mintJson.ok) {
        throw new Error(mintJson.error ?? "mint failed");
      }
      toast({
        title: lang === "zh" ? "CDS SBT 已铸造给先知" : "CDS SBT minted to prophet",
        description: lang === "zh"
          ? `tokenId #${mintJson.data.tokenId} · 灵魂绑定到 ${shortAddr(entityId)}`
          : `tokenId #${mintJson.data.tokenId} · soulbound to ${shortAddr(entityId)}`,
      });

      // 2. Simulate "physical death" + consciousness migration with matchScore=9250
      //    → PURE_INHERITANCE, SBT follows soul.
      await new Promise((r) => setTimeout(r, 600));
      const migRes = await fetch("/api/cip/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          newActiveAddressId: backup.id,
          matchScore: 9250,
        }),
      });
      const migJson = await migRes.json();
      if (!migJson.ok) {
        throw new Error(migJson.error ?? "migrate failed");
      }
      const r = parseFromJson<{
        outcome: string;
        matchScore: number;
        transferredTokens: CDSTokenView[];
        oldAddressId: string | null;
        newAddressId: string;
      }>(migJson.data);
      toast({
        title: lang === "zh" ? "✓ 意识已迁移 — 纯粹继承" : "✓ Consciousness migrated — PURE_INHERITANCE",
        description: lang === "zh"
          ? `matchScore=${(r.matchScore / 100).toFixed(2)}% · ${r.transferredTokens.length} 个 SBT 已跟随灵魂至 ${backup.name}`
          : `matchScore=${(r.matchScore / 100).toFixed(2)}% · ${r.transferredTokens.length} SBT(s) followed the soul to ${backup.name}`,
      });

      await refresh();
      setTab("migrate");
    } catch (e) {
      toast({
        title: lang === "zh" ? "先知重生失败" : "Prophet rebirth failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setRunningScenario(false);
    }
  };

  return (
    <div>
      <PanelHeader
        icon={Heart}
        title={t("cip.title")}
        rfcSection="RFC §5.2"
        description={t("cip.description")}
        accent="violet"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs gap-1.5"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              {t("header.refresh")}
            </Button>
            <Button
              size="sm"
              className="font-mono text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={runProphetRebirth}
              disabled={runningScenario || loading}
            >
              {runningScenario ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              {t("cip.prophetRebirthBtn")}
            </Button>
          </>
        }
      />

      {/* ===== Stats row ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label={t("cip.totalEntities")}
          value={stats.totalEntities}
          hint={t("cip.hintConsciousnessRecords")}
          accent="violet"
        />
        <Stat
          label={t("cip.totalMigrations")}
          value={stats.totalMigrations}
          hint={`${stats.migratedEntities} ${t("cip.entitiesMigratedSuffix")}`}
          accent="cyan"
        />
        <Stat
          label={t("cip.cdsMinted")}
          value={stats.cdsTokensMinted}
          hint={t("cip.hintSoulboundTokens")}
          accent="emerald"
        />
        <Stat
          label={t("cip.avgMatchScore")}
          value={`${(stats.avgMatchScore / 100).toFixed(1)}%`}
          hint={`${t("cip.lastMatchAvgLabel")} (BPS ${stats.avgMatchScore})`}
          accent="amber"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="register" className="font-mono text-xs">
            <Fingerprint className="h-3.5 w-3.5" />
            {t("cip.tabRegister")}
          </TabsTrigger>
          <TabsTrigger value="migrate" className="font-mono text-xs">
            <Skull className="h-3.5 w-3.5" />
            {t("cip.tabMigrate")}
          </TabsTrigger>
          <TabsTrigger value="soulbound" className="font-mono text-xs">
            <ShieldBan className="h-3.5 w-3.5" />
            {t("cip.tabSoulbound")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-4">
          <RegisterMintTab
            data={data}
            loading={loading}
            onChanged={() => void refresh()}
          />
        </TabsContent>

        <TabsContent value="migrate" className="mt-4">
          <MigrationTab
            data={data}
            loading={loading}
            onChanged={() => void refresh()}
          />
        </TabsContent>

        <TabsContent value="soulbound" className="mt-4">
          <SoulboundTestTab
            data={data}
            loading={loading}
            onChanged={() => void refresh()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Tab 1: Register & Mint
// ============================================================
function RegisterMintTab({
  data,
  loading,
  onChanged,
}: {
  data: ListResponse | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const t = useT();
  const lang = useLang((s) => s.lang);
  const avatars = data?.avatars ?? [];

  const [entityId, setEntityId] = React.useState(() =>
    randHex("0xEntity", 8),
  );
  const [cognitiveRoot, setCognitiveRoot] = React.useState(() =>
    randHex("0xRoot", 12),
  );
  const [creatorId, setCreatorId] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [registered, setRegistered] = React.useState<CIPRecordView | null>(
    null,
  );

  // Mint sub-form
  const [metadataHash, setMetadataHash] = React.useState(() =>
    randHex("0xMetaHash", 12),
  );
  const [minting, setMinting] = React.useState(false);
  const [mintedToken, setMintedToken] = React.useState<CDSTokenView | null>(
    null,
  );

  React.useEffect(() => {
    if (!creatorId && avatars.length > 0) {
      const prophet =
        avatars.find((a) => a.kind === "prophet") ?? avatars[0];
      setCreatorId(prophet.id);
    }
  }, [avatars, creatorId]);

  const onRegister = async () => {
    if (!entityId.trim() || !cognitiveRoot.trim() || !creatorId) {
      toast({
        title: lang === "zh" ? "缺少字段" : "Missing fields",
        description: lang === "zh"
          ? "需要 entityId、认知指纹根和创建者分身。"
          : "entityId, cognitiveRoot and creator avatar are required.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    setMintedToken(null);
    try {
      const res = await fetch("/api/cip/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: entityId.trim(),
          cognitiveRoot: cognitiveRoot.trim(),
          creatorAvatarId: creatorId,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? "register failed");
      }
      const rec = parseFromJson<CIPRecordView>(json.data);
      setRegistered(rec);
      toast({
        title: lang === "zh" ? "意识已注册" : "Consciousness registered",
        description: lang === "zh"
          ? `entityId=${shortAddr(rec.entityId)} · 活跃=${rec.activeAvatar?.name ?? "—"}`
          : `entityId=${shortAddr(rec.entityId)} · active=${rec.activeAvatar?.name ?? "—"}`,
      });
      onChanged();
    } catch (e) {
      toast({
        title: lang === "zh" ? "注册失败" : "Registration failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onMint = async () => {
    if (!registered) return;
    if (!metadataHash.trim()) {
      toast({
        title: lang === "zh" ? "缺少 metadataHash" : "Missing metadataHash",
        variant: "destructive",
      });
      return;
    }
    setMinting(true);
    try {
      const res = await fetch("/api/cip/mint-sbt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: registered.entityId,
          metadataHash: metadataHash.trim(),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? "mint failed");
      }
      const tok = parseFromJson<CDSTokenView>(json.data);
      setMintedToken(tok);
      toast({
        title: lang === "zh" ? "CDS SBT 已铸造" : "CDS SBT minted",
        description: lang === "zh"
          ? `tokenId #${tok.tokenId} · 灵魂绑定到 ${shortAddr(tok.entityId)}`
          : `tokenId #${tok.tokenId} · soulbound to ${shortAddr(tok.entityId)}`,
      });
      onChanged();
    } catch (e) {
      toast({
        title: lang === "zh" ? "铸造失败" : "Mint failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setMinting(false);
    }
  };

  const creator = avatars.find((a) => a.id === creatorId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ===== Left: Register form ===== */}
      <PanelCard
        title="registerConsciousness(entityId, cognitiveRoot, creatorAvatarId)"
        icon={Fingerprint}
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-mono text-xs">entityId (bytes32)</Label>
            <div className="flex gap-2">
              <Input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="font-mono text-xs"
                placeholder="0xEntity_..."
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setEntityId(randHex("0xEntity", 8))}
                title={t("cip.regenerateTitle")}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-xs">
              cognitiveRoot (Merkle root)
            </Label>
            <div className="flex gap-2">
              <Input
                value={cognitiveRoot}
                onChange={(e) => setCognitiveRoot(e.target.value)}
                className="font-mono text-xs"
                placeholder="0xRoot_..."
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setCognitiveRoot(randHex("0xRoot", 12))}
                title={t("cip.regenerateTitle")}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-xs">{t("cip.creatorAvatarLabel")}</Label>
            <Select value={creatorId} onValueChange={setCreatorId}>
              <SelectTrigger className="font-mono text-xs w-full">
                <SelectValue placeholder={t("cip.selectCreatorAvatarPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {avatars.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="font-mono text-xs">
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-[9px]"
                      >
                        {a.kind}
                      </Badge>
                      {a.name}
                      <span className="text-muted-foreground">
                        {shortAddr(a.address)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert className="border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300">
            <HeartPulse className="h-4 w-4" />
            <AlertTitle className="font-mono text-xs">
              RFC §5.2 · CIPRegistry.registerConsciousness
            </AlertTitle>
            <AlertDescription className="font-mono text-[11px]">
              require(consciousnessMap[entityId].creationTimestamp == 0,
              "CIP: Already exists"); currentActiveAddress = msg.sender
              (creator). The cognitive fingerprint — not the private key — is
              the anchor of identity.
            </AlertDescription>
          </Alert>

          <Button
            onClick={onRegister}
            disabled={submitting || loading}
            className="w-full font-mono text-xs bg-violet-600 hover:bg-violet-700 text-white"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Fingerprint className="h-3.5 w-3.5" />
            )}
            {t("cip.registerConsciousnessBtn")}
          </Button>

          {registered && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-mono text-xs font-semibold">
                  {t("cip.consciousnessLiveLabel")}
                </span>
                <Badge
                  variant="outline"
                  className="ml-auto font-mono text-[9px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                >
                  {t("cip.activeBadge")}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                <div>
                  <div className="text-muted-foreground">entityId</div>
                  <div className="truncate">{shortAddr(registered.entityId)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">cognitiveRoot</div>
                  <div className="truncate">
                    {shortAddr(registered.cognitiveRoot)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("cip.createdAtLabel")}</div>
                  <div>{formatDate(registered.creationTimestamp)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("cip.activeCarrierLabel")}</div>
                  <div className="truncate">
                    {registered.activeAvatar?.name ?? "—"}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </PanelCard>

      {/* ===== Right: Mint SBT sub-form ===== */}
      <PanelCard
        title={`CDSSBT.mint(entityId, tokenId, metadataHash) — ${lang === "zh" ? "绑定到 entityId,而非 address" : "bound to entityId, not address"}`}
        icon={KeyRound}
      >
        {!registered ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Fingerprint className="h-8 w-8 mb-2 opacity-40" />
            <p className="font-mono text-xs">
              {t("cip.registerFirst")}
            </p>
            <p className="font-mono text-[10px] mt-1 opacity-70">
              {t("cip.mintSubFormUnlock")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-2.5">
              <div className="font-mono text-[10px] text-muted-foreground">
                {t("cip.mintAgainstEntity")}
              </div>
              <div className="font-mono text-xs font-semibold truncate">
                {shortAddr(registered.entityId)}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground mt-1">
                {t("cip.activeAddressLabel")} → {creator?.name ?? "—"}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-mono text-xs">{t("cip.metadataHashCognitiveLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  value={metadataHash}
                  onChange={(e) => setMetadataHash(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="0xMetaHash_..."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setMetadataHash(randHex("0xMetaHash", 12))}
                  title={t("cip.regenerateTitle")}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Alert className="border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300">
              <KeyRound className="h-4 w-4" />
              <AlertTitle className="font-mono text-xs">
                RFC §5.2 · CDSSBT.mint
              </AlertTitle>
              <AlertDescription className="font-mono text-[11px]">
                address activeAddr = cipRegistry.getActiveAddress(entityId);
                require(activeAddr != address(0), "CDS: Entity not active");
                _safeMint(activeAddr, tokenId); tokenToEntity[tokenId] = entityId;
              </AlertDescription>
            </Alert>

            <Button
              onClick={onMint}
              disabled={minting}
              className="w-full font-mono text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              {minting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Coins className="h-3.5 w-3.5" />
              )}
              {t("cip.mintSbt")}
            </Button>

            <AnimatePresence mode="wait">
              {mintedToken && (
                <motion.div
                  key={mintedToken.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <CDSTokenCard token={mintedToken} owner={mintedToken.ownerAvatar} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </PanelCard>

      {/* ===== Existing entities (full width) ===== */}
      <PanelCard
        title={t("cip.registeredEntitiesTitle")}
        icon={Heart}
        className="lg:col-span-2"
        action={
          <Badge variant="outline" className="font-mono text-[10px]">
            {data?.records.length ?? 0} {t("cip.recordsCountSuffix")}
          </Badge>
        }
      >
        <div className="max-h-96 overflow-y-auto scrollbar-cyber space-y-2 pr-1">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground font-mono text-xs">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              {t("cip.loadingRegistry")}
            </div>
          ) : !data?.records.length ? (
            <div className="text-center py-8 text-muted-foreground font-mono text-xs">
              {t("cip.noRecordsHint")}
            </div>
          ) : (
            data.records.map((r) => (
              <div
                key={r.id}
                className="rounded-md border border-border/60 bg-card/30 p-2.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Fingerprint className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    <span className="font-mono text-xs font-semibold truncate">
                      {shortAddr(r.entityId)}
                    </span>
                    {r.isDeceasedOrMigrated && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[9px] border-amber-500/40 text-amber-600 dark:text-amber-400"
                      >
                        <Skull className="h-2.5 w-2.5" />
                        {t("cip.migratedBadge")} × {r.migrationCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.migrationCount > 0 && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[9px] gap-1"
                      >
                        <Zap className="h-2.5 w-2.5" />
                        {t("cip.lastMatchBadge")} {(r.lastMatchScore / 100).toFixed(1)}%
                      </Badge>
                    )}
                    <AvatarPill
                      avatar={r.activeAvatar}
                      label={t("cip.activePillLabel")}
                      accent="violet"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PanelCard>
    </div>
  );
}

// ============================================================
// Tab 2: Consciousness Migration
// ============================================================
function MigrationTab({
  data,
  loading,
  onChanged,
}: {
  data: ListResponse | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const t = useT();
  const lang = useLang((s) => s.lang);
  const records = data?.records ?? [];
  const avatars = data?.avatars ?? [];

  const [entityId, setEntityId] = React.useState<string>("");
  const [newAvatarId, setNewAvatarId] = React.useState<string>("");
  const [matchScore, setMatchScore] = React.useState<number>(9250);
  const [submitting, setSubmitting] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<{
    outcome: "PURE_INHERITANCE" | "FUSION_EMERGENCE" | "HIJACK_REJECTED";
    matchScore: number;
    oldAddressId: string | null;
    newAddressId: string;
    transferredTokens: CDSTokenView[];
    reason: string;
  } | null>(null);

  React.useEffect(() => {
    if (!entityId && records.length > 0) setEntityId(records[0].entityId);
  }, [records, entityId]);
  React.useEffect(() => {
    if (!newAvatarId && avatars.length > 0) {
      const rec = records.find((r) => r.entityId === entityId);
      const fallback =
        avatars.find((a) => a.id !== rec?.currentActiveAddressId) ??
        avatars[0];
      setNewAvatarId(fallback.id);
    }
  }, [avatars, newAvatarId, entityId, records]);

  const selectedRecord = records.find((r) => r.entityId === entityId) ?? null;
  const oldAvatar = selectedRecord?.activeAvatar ?? null;
  const newAvatar = avatars.find((a) => a.id === newAvatarId) ?? null;
  const preview = classifyMatchScore(matchScore);

  const entityTokens = React.useMemo(
    () => (data?.tokens ?? []).filter((t) => t.entityId === entityId),
    [data?.tokens, entityId],
  );

  const onMigrate = async () => {
    if (!entityId || !newAvatarId) {
      toast({
        title: lang === "zh" ? "缺少字段" : "Missing fields",
        description: lang === "zh"
          ? "请选择实体和新活跃分身。"
          : "Select an entity and a new active avatar.",
        variant: "destructive",
      });
      return;
    }
    if (selectedRecord && newAvatarId === selectedRecord.currentActiveAddressId) {
      toast({
        title: lang === "zh" ? "相同载体" : "Same carrier",
        description: lang === "zh"
          ? "新活跃分身必须与当前分身不同。"
          : "New active avatar must differ from the current one.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/cip/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          newActiveAddressId: newAvatarId,
          matchScore,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        // Hijack rejection lands here with 400
        const fail = parseFromJson<{
          outcome: "PURE_INHERITANCE" | "FUSION_EMERGENCE" | "HIJACK_REJECTED";
          matchScore: number;
          oldAddressId: string | null;
          newAddressId: string;
          reason: string;
          transferredTokens: CDSTokenView[];
        }>(json.data ?? {});
        if (fail?.outcome === "HIJACK_REJECTED") {
          setLastResult({
            outcome: "HIJACK_REJECTED",
            matchScore: fail.matchScore ?? matchScore,
            oldAddressId: fail.oldAddressId ?? null,
            newAddressId: fail.newAddressId ?? newAvatarId,
            transferredTokens: [],
            reason: fail.reason ?? json.error,
          });
        }
        toast({
          title: lang === "zh" ? "迁移被拒绝" : "Migration REJECTED",
          description: json.error,
          variant: "destructive",
        });
        return;
      }
      const r = parseFromJson<{
        outcome: "PURE_INHERITANCE" | "FUSION_EMERGENCE" | "HIJACK_REJECTED";
        matchScore: number;
        oldAddressId: string | null;
        newAddressId: string;
        reason: string;
        transferredTokens: CDSTokenView[];
      }>(json.data);
      setLastResult({
        outcome: r.outcome,
        matchScore: r.matchScore,
        oldAddressId: r.oldAddressId,
        newAddressId: r.newAddressId,
        transferredTokens: r.transferredTokens ?? [],
        reason: r.reason,
      });
      toast({
        title:
          r.outcome === "PURE_INHERITANCE"
            ? (lang === "zh" ? "✓ 纯粹继承 — SBT 已跟随灵魂" : "✓ Pure inheritance — SBT followed the soul")
            : (lang === "zh" ? "✓ 融合涌现 — 已标记谱系分账" : "✓ Fusion emergence — lineage split flagged"),
        description: r.reason,
      });
      onChanged();
    } catch (e) {
      toast({
        title: lang === "zh" ? "迁移失败" : "Migration failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PanelCard
        title="migrateConsciousness(record, newActiveAddressId, matchScore)"
        icon={Skull}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-mono text-xs">{t("cip.consciousnessEntityLabel")}</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger className="font-mono text-xs w-full">
                <SelectValue placeholder={t("cip.selectEntityIdPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {records.map((r) => (
                  <SelectItem
                    key={r.id}
                    value={r.entityId}
                    className="font-mono text-xs"
                  >
                    <span className="flex items-center gap-2">
                      {r.isDeceasedOrMigrated && (
                        <Skull className="h-3 w-3 text-amber-500" />
                      )}
                      {shortAddr(r.entityId)}
                      <span className="text-muted-foreground">
                        · {r.activeAvatar?.name ?? "—"}
                      </span>
                    </span>
                  </SelectItem>
                ))}
                {records.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-mono">
                    {t("cip.noEntitiesHint")}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-xs">{t("cip.newActiveAvatarLabel")}</Label>
            <Select value={newAvatarId} onValueChange={setNewAvatarId}>
              <SelectTrigger className="font-mono text-xs w-full">
                <SelectValue placeholder={t("cip.selectNewActiveAvatarPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {avatars.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="font-mono text-xs">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[9px]">
                        {a.kind}
                      </Badge>
                      {a.name}
                      <span className="text-muted-foreground">
                        {shortAddr(a.address)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MatchScoreSlider value={matchScore} onChange={setMatchScore} />

          {/* Live outcome preview */}
          <div
            className={`rounded-lg border p-3 ${
              preview.band === "pure"
                ? "border-emerald-500/40 bg-emerald-500/5"
                : preview.band === "fusion"
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-rose-500/40 bg-rose-500/5"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("cip.previewLabel")}
              </span>
              <OutcomeBadge
                outcome={preview.outcome}
                matchScore={matchScore}
              />
            </div>
            <p className="font-mono text-[11px] mt-2 text-muted-foreground leading-relaxed">
              {preview.band === "pure" && t("cip.previewPureDesc")}
              {preview.band === "fusion" && t("cip.previewFusionDesc")}
              {preview.band === "hijack" && t("cip.previewHijackDesc")}
            </p>
          </div>

          <Button
            onClick={onMigrate}
            disabled={
              submitting ||
              loading ||
              !entityId ||
              !newAvatarId ||
              !selectedRecord ||
              newAvatarId === selectedRecord?.currentActiveAddressId
            }
            className="w-full font-mono text-xs bg-violet-600 hover:bg-violet-700 text-white"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Ghost className="h-3.5 w-3.5" />
            )}
            {t("cip.executeMigration")}
          </Button>
        </div>
      </PanelCard>

      <PanelCard
        title={t("cip.soulTransferVizTitle")}
        icon={HeartPulse}
      >
        <div className="space-y-4">
          {/* Old → New avatar layout */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center">
                {t("cip.oldCarrierLabel")}
              </div>
              <AvatarPill avatar={oldAvatar} label={t("cip.deceasedPillLabel")} accent="rose" />
              {selectedRecord && (
                <div className="text-center font-mono text-[10px] text-muted-foreground">
                  {t("cip.migrationsCountLabel")}: {selectedRecord.migrationCount}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center justify-center px-2">
              <ArrowRight className="h-5 w-5 text-violet-500" />
              <span className="font-mono text-[9px] text-muted-foreground mt-1">
                CIP
              </span>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center">
                {t("cip.newCarrierLabel")}
              </div>
              <AvatarPill avatar={newAvatar} label={t("cip.rebornPillLabel")} accent="emerald" />
              <div className="text-center font-mono text-[10px] text-muted-foreground">
                {t("cip.matchScorePercentLabel")} {(matchScore / 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <Separator />

          {/* SBTs bound to this entity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("cip.cdsSbtsBoundLabel")}
              </span>
              <Badge variant="outline" className="font-mono text-[9px]">
                {entityTokens.length} {t("cip.tokenCountSuffix")}
              </Badge>
            </div>
            <div className="max-h-56 overflow-y-auto scrollbar-cyber space-y-2 pr-1">
              {entityTokens.length === 0 ? (
                <div className="text-center py-4 font-mono text-[11px] text-muted-foreground">
                  {t("cip.noSbtsBoundHint")}
                </div>
              ) : (
                entityTokens.map((t) => {
                  const isTransferred =
                    lastResult?.outcome === "PURE_INHERITANCE" &&
                    lastResult.transferredTokens.some(
                      (tt) => tt.tokenId === t.tokenId,
                    );
                  return (
                    <motion.div
                      key={t.id}
                      layout
                      animate={
                        isTransferred
                          ? {
                              x: [0, 12, 0],
                              backgroundColor: [
                                "rgba(244,63,94,0.08)",
                                "rgba(16,185,129,0.08)",
                                "rgba(16,185,129,0.08)",
                              ],
                            }
                          : {}
                      }
                      transition={{ duration: 1.2 }}
                    >
                      <CDSTokenCard
                        token={t}
                        owner={
                          isTransferred && newAvatar
                            ? newAvatar
                            : (t.ownerAvatar ?? null)
                        }
                        compact
                      />
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Last result */}
          <AnimatePresence mode="wait">
            {lastResult && (
              <motion.div
                key={`${lastResult.outcome}-${lastResult.matchScore}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`rounded-lg border p-3 ${
                  lastResult.outcome === "PURE_INHERITANCE"
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : lastResult.outcome === "FUSION_EMERGENCE"
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-rose-500/40 bg-rose-500/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("cip.lastResultLabel")}
                  </span>
                  <OutcomeBadge
                    outcome={lastResult.outcome}
                    matchScore={lastResult.matchScore}
                  />
                </div>
                <p className="font-mono text-[11px] mt-2 text-muted-foreground">
                  {lastResult.reason}
                </p>
                {lastResult.outcome === "PURE_INHERITANCE" && (
                  <p className="font-mono text-[11px] mt-1 text-emerald-600 dark:text-emerald-400">
                    {lang === "zh"
                      ? `✓ ${lastResult.transferredTokens.length} 个 SBT 已灵魂转移 — tokenId 与 metadataHash 不变,仅 ownerAvatarId 轮转。`
                      : `✓ ${lastResult.transferredTokens.length} SBT(s) soulTransfer'd — tokenId & metadataHash unchanged, only ownerAvatarId rotated.`}
                  </p>
                )}
                {lastResult.outcome === "FUSION_EMERGENCE" && (
                  <p className="font-mono text-[11px] mt-1 text-amber-600 dark:text-amber-400">
                    {t("cip.fusionResultDesc")}
                  </p>
                )}
                {lastResult.outcome === "HIJACK_REJECTED" && (
                  <p className="font-mono text-[11px] mt-1 text-rose-600 dark:text-rose-400">
                    {t("cip.hijackResultDesc")}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PanelCard>
    </div>
  );
}

// ============================================================
// Tab 3: SBT Soulbound Test
// ============================================================
function SoulboundTestTab({
  data,
  loading,
  onChanged,
}: {
  data: ListResponse | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const t = useT();
  const lang = useLang((s) => s.lang);
  const tokens = data?.tokens ?? [];
  const avatars = data?.avatars ?? [];

  const [tokenId, setTokenId] = React.useState<string>("");
  const [maliciousAvatarId, setMaliciousAvatarId] = React.useState<string>("");
  const [manualAttempt, setManualAttempt] = React.useState<{
    success: boolean;
    message: string;
    at: number;
  } | null>(null);

  const [cipMigrationSuccess, setCipMigrationSuccess] = React.useState<{
    success: boolean;
    message: string;
    at: number;
  } | null>(null);

  React.useEffect(() => {
    if (!tokenId && tokens.length > 0) setTokenId(tokens[0].id);
  }, [tokens, tokenId]);
  React.useEffect(() => {
    if (!maliciousAvatarId && avatars.length > 0) {
      const spammer = avatars.find((a) => a.kind === "agent") ?? avatars[0];
      setMaliciousAvatarId(spammer.id);
    }
  }, [avatars, maliciousAvatarId]);

  const selectedToken = tokens.find((t) => t.id === tokenId) ?? null;
  const maliciousAvatar = avatars.find((a) => a.id === maliciousAvatarId) ?? null;

  // Manual transferFrom attempt — ALWAYS rejects (RFC lines 667-669)
  const onAttemptManualTransfer = async () => {
    if (!selectedToken) return;
    setManualAttempt(null);
    // Simulate the on-chain revert (the contract function always throws)
    await new Promise((r) => setTimeout(r, 350));
    setManualAttempt({
      success: false,
      message: lang === "zh"
        ? "CDS: 灵魂绑定代币无法手动转移。仅允许意识迁移。"
        : "CDS: Soulbound token cannot be manually transferred. Only Consciousness Migration allowed.",
      at: Date.now(),
    });
    toast({
      title: lang === "zh" ? "transferFrom 已回滚" : "transferFrom reverted",
      description: lang === "zh"
        ? "CDS: 灵魂绑定代币无法手动转移。仅允许意识迁移。"
        : "CDS: Soulbound token cannot be manually transferred. Only Consciousness Migration allowed.",
      variant: "destructive",
    });
  };

  // CIP-triggered soulTransfer — succeeds (only callable by CIP)
  const [cipRunning, setCipRunning] = React.useState(false);
  const onTriggerCIPMigration = async () => {
    if (!selectedToken) return;
    setCipRunning(true);
    setCipMigrationSuccess(null);
    try {
      // Find a new active avatar (different from current owner)
      const currentOwner = selectedToken.ownerAvatarId;
      const backup =
        avatars.find((a) => a.id !== currentOwner && a.kind !== "agent") ??
        avatars.find((a) => a.id !== currentOwner) ??
        avatars[0];
      const migRes = await fetch("/api/cip/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: selectedToken.entityId,
          newActiveAddressId: backup.id,
          matchScore: 9250,
        }),
      });
      const migJson = await migRes.json();
      if (!migJson.ok) {
        throw new Error(migJson.error ?? "CIP migration failed");
      }
      const r = parseFromJson<{
        outcome: string;
        transferredTokens: CDSTokenView[];
        matchScore: number;
      }>(migJson.data);
      setCipMigrationSuccess({
        success: true,
        message: lang === "zh"
          ? `CIP 已为 ${r.transferredTokens.length} 个 SBT 触发灵魂转移 · tokenId #${selectedToken.tokenId} 已保留 · 所有者轮转 → ${backup.name}`
          : `CIP triggered soulTransfer for ${r.transferredTokens.length} SBT(s) · tokenId #${selectedToken.tokenId} preserved · owner rotated → ${backup.name}`,
        at: Date.now(),
      });
      toast({
        title: lang === "zh" ? "✓ 灵魂转移成功" : "✓ soulTransfer succeeded",
        description: lang === "zh"
          ? `CIP 已将 SBT #${selectedToken.tokenId} 路由至 ${backup.name} · tokenId + metadataHash 不变`
          : `CIP routed SBT #${selectedToken.tokenId} to ${backup.name} · tokenId + metadataHash unchanged`,
      });
      onChanged();
    } catch (e) {
      setCipMigrationSuccess({
        success: false,
        message: (e as Error).message,
        at: Date.now(),
      });
      toast({
        title: lang === "zh" ? "CIP 迁移失败" : "CIP migration failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setCipRunning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <PanelCard
        title={`CDSSBT.transferFrom — ${lang === "zh" ? "始终回滚" : "always reverts"}`}
        icon={ShieldBan}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-mono text-xs">{t("cip.targetCdsTokenLabel")}</Label>
            <Select value={tokenId} onValueChange={setTokenId}>
              <SelectTrigger className="font-mono text-xs w-full">
                <SelectValue placeholder={t("cip.selectCdsSbtPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {tokens.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    className="font-mono text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-3 w-3" />
                      CDS #{t.tokenId}
                      <span className="text-muted-foreground">
                        · {shortAddr(t.entityId)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
                {tokens.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-mono">
                    {t("cip.noSbtsHint")}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-xs">
              {t("cip.maliciousActorLabel")}
            </Label>
            <Select
              value={maliciousAvatarId}
              onValueChange={setMaliciousAvatarId}
            >
              <SelectTrigger className="font-mono text-xs w-full">
                <SelectValue placeholder={t("cip.selectMaliciousActorPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {avatars.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="font-mono text-xs">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[9px]">
                        {a.kind}
                      </Badge>
                      {a.name}
                      <span className="text-muted-foreground">
                        {shortAddr(a.address)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedToken && (
            <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-2.5">
              <div className="font-mono text-[10px] text-muted-foreground">
                call: transferFrom(
                {shortAddr(selectedToken.ownerAvatarId)},{" "}
                {shortAddr(maliciousAvatar?.address)}, {selectedToken.tokenId})
              </div>
            </div>
          )}

          <Alert className="border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="font-mono text-xs">
              RFC §5.2 · CDSSBT.transferFrom override
            </AlertTitle>
            <AlertDescription className="font-mono text-[11px]">
              function transferFrom(address from, address to, uint256 tokenId)
              public pure override {"{"} revert("CDS: Soulbound token cannot be
              manually transferred. Only Consciousness Migration allowed."); {"}"}
            </AlertDescription>
          </Alert>

          <Button
            onClick={onAttemptManualTransfer}
            disabled={!selectedToken}
            variant="destructive"
            className="w-full font-mono text-xs"
          >
            <ShieldBan className="h-3.5 w-3.5" />
            {t("cip.attemptManualTransfer")}
          </Button>

          <AnimatePresence>
            {manualAttempt && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`rounded-lg border p-3 ${
                  manualAttempt.success
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-rose-500/40 bg-rose-500/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {manualAttempt.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500" />
                  )}
                  <span className="font-mono text-xs font-semibold">
                    {manualAttempt.success ? t("cip.successBadge") : t("cip.revertedLabel")}
                  </span>
                  <Badge
                    variant="outline"
                    className="ml-auto font-mono text-[9px] border-rose-500/40 text-rose-600 dark:text-rose-400"
                  >
                    {t("cip.revertBadge")}
                  </Badge>
                </div>
                <p className="font-mono text-[11px] mt-2 text-muted-foreground">
                  {manualAttempt.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PanelCard>

      <PanelCard
        title={`CDSSBT.soulTransfer — ${lang === "zh" ? "仅可由 CIP 调用" : "only callable by CIP"}`}
        icon={ShieldCheck}
      >
        <div className="space-y-4">
          {selectedToken ? (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center">
                  {t("cip.currentOwnerLabel")}
                </div>
                <AvatarPill
                  avatar={selectedToken.ownerAvatar}
                  label={t("cip.currentPillLabel")}
                  accent="violet"
                />
              </div>
              <div className="flex flex-col items-center justify-center px-2">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 2,
                    repeat: cipRunning ? Infinity : 0,
                    ease: "linear",
                  }}
                >
                  <RefreshCw className="h-5 w-5 text-violet-500" />
                </motion.div>
                <span className="font-mono text-[9px] text-muted-foreground mt-1">
                  CIP
                </span>
              </div>
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center">
                  {t("cip.newActiveAddr")}
                </div>
                <AvatarPill
                  avatar={
                    avatars.find(
                      (a) => a.id !== selectedToken.ownerAvatarId && a.kind !== "agent",
                    ) ?? null
                  }
                  label={t("cip.rebornPillLabel")}
                  accent="emerald"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground font-mono text-xs">
              {t("cip.selectCdsTokenHint")}
            </div>
          )}

          <Alert className="border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle className="font-mono text-xs">
              RFC §5.2 · CDSSBT.soulTransfer
            </AlertTitle>
            <AlertDescription className="font-mono text-[11px]">
              require(msg.sender == address(cipRegistry), "CDS: Only CIP
              Registry can trigger soul transfer"); _burn(currentOwner,
              tokenId); _safeMint(newActiveAddr, tokenId); — tokenId &amp;
              metadataHash UNCHANGED.
            </AlertDescription>
          </Alert>

          <Button
            onClick={onTriggerCIPMigration}
            disabled={!selectedToken || cipRunning || loading}
            className="w-full font-mono text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {cipRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <HeartPulse className="h-3.5 w-3.5" />
            )}
            {t("cip.triggerCipMigrationBtn")}
          </Button>

          <AnimatePresence>
            {cipMigrationSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`rounded-lg border p-3 ${
                  cipMigrationSuccess.success
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-rose-500/40 bg-rose-500/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {cipMigrationSuccess.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500" />
                  )}
                  <span className="font-mono text-xs font-semibold">
                    {cipMigrationSuccess.success ? "SOUL_TRANSFER_OK" : t("cip.failedBadge")}
                  </span>
                  <Badge
                    variant="outline"
                    className={`ml-auto font-mono text-[9px] ${
                      cipMigrationSuccess.success
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : "border-rose-500/40 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {cipMigrationSuccess.success ? t("cip.successBadge") : t("cip.errorBadge")}
                  </Badge>
                </div>
                <p className="font-mono text-[11px] mt-2 text-muted-foreground">
                  {cipMigrationSuccess.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-md border border-border/60 bg-card/30 p-2.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {t("cip.contractInvariantLabel")}
            </div>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              {t("cip.contractInvariantDesc")}
            </p>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}
