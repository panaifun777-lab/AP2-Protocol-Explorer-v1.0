"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Plus,
  AlertTriangle,
  Sparkles,
  Calculator,
  ShieldAlert,
  Ban,
  RefreshCw,
  Circle,
  GitBranch,
  Gauge,
  Atom,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react";
import { PanelHeader, PanelCard, Stat } from "./panel-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  formatToken,
  parseFromJson,
  RFC_CONSTANTS,
  type DAGNode,
  type DAGEdge,
} from "@/lib/types";

// ============================================================
// Local types — mirror API responses (BigInt-safe after parseFromJson)
// ============================================================

interface AvatarLite {
  id: string;
  address: string;
  name: string;
  kind: string;
  reputation: number;
}

interface EntityGraph {
  nodes: DAGNode[];
  edges: DAGEdge[];
}

interface LineageSplitShareBig {
  avatarId: string;
  weight: number; // bps (0-10000)
  share: bigint; // 6-decimals $AFC
}

interface MoneyLaunderingResult {
  suspicious: boolean;
  reason?: string;
  blackHoledNodes: DAGNode[];
  stats: {
    shardCount: number;
    avgEceScore: number;
    avgSimilarity: number;
  };
}

// ============================================================
// Pure helpers — mirror contract math for client-side previews
// ============================================================

interface CpdfBreakdown {
  baseWeight: number;
  similarity: number;
  eceScore: number;
  decayFactor: number;
  finalWeight: number;
  isBlackHole: boolean;
}

function cpdfPreview(qEceScore: number, similarity: number): CpdfBreakdown {
  if (similarity < 0.3) {
    return {
      baseWeight: 1.0,
      similarity,
      eceScore: qEceScore,
      decayFactor: 0,
      finalWeight: 0,
      isBlackHole: true,
    };
  }
  const qEce = qEceScore / 10000;
  const decayFactor = Math.exp(-2 * (1 - qEce));
  const finalWeight = 1.0 * similarity * decayFactor;
  return {
    baseWeight: 1.0,
    similarity,
    eceScore: qEceScore,
    decayFactor,
    finalWeight,
    isBlackHole: false,
  };
}

function randomShardHash(): string {
  return (
    "0x" +
    Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("")
  );
}

function randomEntityId(prefix = "entity"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function shortHash(h: string, head = 8, tail = 6): string {
  if (!h) return "—";
  if (h.length <= head + tail) return h;
  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

// Hex color palette (no blue/indigo per style guide)
const COLORS = {
  emerald: "#10b981",
  emeraldDim: "#059669",
  amber: "#f59e0b",
  rose: "#f43f5e",
  roseDim: "#be123c",
  white: "#ffffff",
  edgeOk: "rgba(16, 185, 129, 0.45)",
  edgeBad: "rgba(244, 63, 94, 0.35)",
};

function shardColor(weight: number): string {
  if (weight === 0) return COLORS.rose;
  if (weight > 0.4) return COLORS.emerald;
  if (weight > 0.1) return COLORS.amber;
  return COLORS.roseDim;
}

function weightTier(weight: number): "healthy" | "mid" | "blackhole" {
  if (weight === 0) return "blackhole";
  if (weight > 0.4) return "healthy";
  return "mid";
}

// ============================================================
// SVG DAG Visualizer
// ============================================================

interface DagGraphProps {
  nodes: DAGNode[];
  edges: DAGEdge[];
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
}

function DagGraph({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}: DagGraphProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center text-center text-muted-foreground font-mono text-xs">
        <div>
          <Network className="h-10 w-10 mx-auto mb-2 opacity-40" />
          No DAG nodes — create a core anchor to begin
        </div>
      </div>
    );
  }

  const anchor = nodes.find((n) => n.isCoreAnchor);
  const shards = nodes.filter((n) => !n.isCoreAnchor);

  const W = 560;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) / 2 - 55;

  const positions = new Map<string, { x: number; y: number }>();
  if (anchor) positions.set(anchor.id, { x: cx, y: cy });
  shards.forEach((s, i) => {
    if (shards.length === 1) {
      positions.set(s.id, { x: cx + radius, y: cy });
      return;
    }
    const angle = (i / shards.length) * 2 * Math.PI - Math.PI / 2;
    positions.set(s.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        style={{ maxHeight: 360 }}
      >
        {/* Edges */}
        {edges.map((e) => {
          const from = positions.get(e.fromNodeId);
          const to = positions.get(e.toNodeId);
          if (!from || !to) return null;
          const isBH = e.weight === 0;
          const sw = Math.max(0.6, Math.min(6, e.weight * 5 + 0.6));
          return (
            <line
              key={e.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={isBH ? COLORS.edgeBad : COLORS.edgeOk}
              strokeWidth={sw}
              strokeDasharray={isBH ? "4 4" : "none"}
            />
          );
        })}

        {/* Core anchor */}
        {anchor && (
          <motion.g
            key={anchor.id}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            onClick={() => onSelectNode(anchor.id)}
            className="cursor-pointer"
          >
            {/* Pulse halo */}
            <circle
              cx={cx}
              cy={cy}
              r={36}
              fill={COLORS.emerald}
              opacity={0.12}
            />
            <circle
              cx={cx}
              cy={cy}
              r={26}
              fill={COLORS.emerald}
              stroke={selectedNodeId === anchor.id ? COLORS.white : COLORS.emeraldDim}
              strokeWidth={selectedNodeId === anchor.id ? 3 : 1.5}
            />
            <text
              x={cx}
              y={cy + 3}
              textAnchor="middle"
              className="fill-white font-mono"
              style={{ fontSize: 9, fontWeight: 700 }}
            >
              ANCHOR
            </text>
          </motion.g>
        )}

        {/* Fused shards */}
        {shards.map((s, i) => {
          const pos = positions.get(s.id);
          if (!pos) return null;
          const r = 12 + Math.min(s.edgeWeight, 1) * 12;
          const color = shardColor(s.edgeWeight);
          const isSelected = selectedNodeId === s.id;
          return (
            <motion.g
              key={s.id}
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.05 + i * 0.025 }}
              style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
              onClick={() => onSelectNode(s.id)}
              className="cursor-pointer"
            >
              {s.edgeWeight === 0 && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 4}
                  fill="none"
                  stroke={COLORS.rose}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
              )}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r}
                fill={color}
                stroke={isSelected ? COLORS.white : color}
                strokeWidth={isSelected ? 3 : 1}
              />
              {s.edgeWeight === 0 ? (
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  className="fill-white font-mono"
                  style={{ fontSize: 12, fontWeight: 700 }}
                >
                  ✕
                </text>
              ) : (
                <text
                  x={pos.x}
                  y={pos.y + 3}
                  textAnchor="middle"
                  className="fill-white font-mono"
                  style={{ fontSize: 9, fontWeight: 700 }}
                >
                  {s.edgeWeight.toFixed(2)}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: COLORS.emerald }}
          />
          Healthy
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: COLORS.amber }}
          />
          Diluted
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: COLORS.rose }}
          />
          Black-Hole ✕
        </span>
        <span className="flex items-center gap-1">
          <Circle className="h-2.5 w-2.5" style={{ color: COLORS.emerald }} />
          Core Anchor
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Selected node CPDF breakdown card
// ============================================================

function NodeBreakdown({
  node,
  avatar,
}: {
  node: DAGNode | null;
  avatar: AvatarLite | undefined;
}) {
  if (!node) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-4 text-center text-muted-foreground font-mono text-xs">
        Click a node to inspect its CPDF breakdown
      </div>
    );
  }

  const breakdown = cpdfPreview(
    node.eceQualityScore,
    node.similarityToAnchor,
  );
  const tier = weightTier(node.edgeWeight);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-md border border-border/60 bg-card/40 p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              node.isCoreAnchor
                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]"
                : "border-cyan-500/40 text-cyan-600 dark:text-cyan-400 font-mono text-[10px]"
            }
          >
            {node.isCoreAnchor ? "CORE ANCHOR" : "FUSED SHARD"}
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">
            {shortHash(node.id, 6, 4)}
          </span>
        </div>
        <Badge
          variant="outline"
          className={
            tier === "blackhole"
              ? "border-rose-500/40 text-rose-600 dark:text-rose-400 font-mono text-[10px]"
              : tier === "healthy"
                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]"
                : "border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono text-[10px]"
          }
        >
          {tier === "blackhole"
            ? "BLACK HOLE"
            : tier === "healthy"
              ? "HEALTHY"
              : "DILUTED"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px]">
        <Row label="Owner" value={avatar?.name ?? "—"} />
        <Row label="shardHash" value={shortHash(node.shardHash)} />
        <Row label="Q_ece" value={`${node.eceQualityScore} / 10000`} />
        <Row label="Similarity" value={node.similarityToAnchor.toFixed(3)} />
        <Row label="Decay e^(-λ(1-Q))" value={breakdown.decayFactor.toFixed(4)} />
        <Row
          label="Edge Weight"
          value={
            <span
              className={
                node.edgeWeight === 0
                  ? "text-rose-500"
                  : "text-emerald-500"
              }
            >
              {node.edgeWeight.toFixed(4)}
            </span>
          }
        />
      </div>
    </motion.div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-foreground/90 truncate">{value}</span>
    </div>
  );
}

// ============================================================
// CPDF Formula Explainer
// ============================================================

function CpdfExplainer() {
  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3 font-mono text-center">
        <div className="text-[10px] text-muted-foreground mb-1">
          Cognitive Purity Decay Function
        </div>
        <div className="text-cyan-600 dark:text-cyan-400 text-sm font-bold">
          W = W
          <sub className="text-[9px]">base</sub> × Similarity × e
          <sup className="text-[9px]">−λ(1 − Q<sub className="text-[7px]">ece</sub>)</sup>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          λ = {RFC_CONSTANTS.CPDF_LAMBDA} · floor ={" "}
          {(RFC_CONSTANTS.CPDF_SIMILARITY_FLOOR / 100).toFixed(0)}%
        </div>
      </div>
      <div className="space-y-2">
        <Case
          color="emerald"
          title="High-Quality Fusion"
          desc="sim ≥ 0.30 + high Q_ece → weight ≈ similarity. e.g. 先知融合数学天才."
        />
        <Case
          color="amber"
          title="Low-Quality Dilution"
          desc="sim ≥ 0.30 but low Q_ece → exponential decay crushes weight toward 0."
        />
        <Case
          color="rose"
          title="Black Hole (Crushed)"
          desc="sim &lt; 0.30 → weight = 0. The shard contributes nothing to lineage."
        />
      </div>
    </div>
  );
}

function Case({
  color,
  title,
  desc,
}: {
  color: "emerald" | "amber" | "rose";
  title: string;
  desc: string;
}) {
  const colorClass = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    rose: "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400",
  }[color];
  return (
    <div className={`rounded-md border p-2 ${colorClass}`}>
      <div className="font-mono text-[11px] font-bold mb-0.5">{title}</div>
      <div className="text-[10px] text-muted-foreground leading-snug">
        {desc}
      </div>
    </div>
  );
}

// ============================================================
// Main Panel
// ============================================================

export function DagPanel() {
  const { toast } = useToast();

  // List state
  const [entities, setEntities] = React.useState<Record<string, EntityGraph>>(
    {},
  );
  const [avatars, setAvatars] = React.useState<AvatarLite[]>([]);
  const [selectedEntityId, setSelectedEntityId] = React.useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  // Fuse form
  const [fuseEntityId, setFuseEntityId] = React.useState<string>("");
  const [fuseOwnerAvatarId, setFuseOwnerAvatarId] = React.useState<string>("");
  const [fuseShardHash, setFuseShardHash] = React.useState<string>("");
  const [fuseQEce, setFuseQEce] = React.useState<number>(8500);
  const [fuseSim, setFuseSim] = React.useState<number>(0.85);

  // Split simulator
  const [splitEntityId, setSplitEntityId] = React.useState<string>("");
  const [splitAmount, setSplitAmount] = React.useState<number>(10000);
  const [splitShares, setSplitShares] = React.useState<
    LineageSplitShareBig[] | null
  >(null);
  const [splitting, setSplitting] = React.useState(false);

  // Anti-laundering scanner
  const [scanEntityId, setScanEntityId] = React.useState<string>("");
  const [scanResult, setScanResult] = React.useState<MoneyLaunderingResult | null>(
    null,
  );
  const [scanning, setScanning] = React.useState(false);

  // ----- Fetch all -----
  const fetchAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dag/list");
      const json = await res.json();
      if (json.ok) {
        const data = parseFromJson<{
          entities: Record<string, EntityGraph>;
          avatars: AvatarLite[];
        }>(json.data);
        setEntities(data.entities);
        setAvatars(data.avatars);
      } else {
        toast({
          title: "Fetch failed",
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
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Auto-select first entity when entities load and none is selected
  React.useEffect(() => {
    if (!selectedEntityId && Object.keys(entities).length > 0) {
      const firstId = Object.keys(entities)[0];
      setSelectedEntityId(firstId);
    }
  }, [entities, selectedEntityId]);

  // Sync fuse entity select with selected DAG entity
  React.useEffect(() => {
    if (!fuseEntityId && selectedEntityId) {
      setFuseEntityId(selectedEntityId);
    }
  }, [selectedEntityId, fuseEntityId]);

  React.useEffect(() => {
    if (!splitEntityId && selectedEntityId) {
      setSplitEntityId(selectedEntityId);
    }
    if (!scanEntityId && selectedEntityId) {
      setScanEntityId(selectedEntityId);
    }
  }, [selectedEntityId, splitEntityId, scanEntityId]);

  // ----- Derived stats -----
  const entityIds = Object.keys(entities);
  const totalNodes = entityIds.reduce(
    (s, id) => s + entities[id].nodes.length,
    0,
  );
  const allNodes = entityIds.flatMap((id) => entities[id].nodes);
  const fusedShards = allNodes.filter((n) => !n.isCoreAnchor);
  const blackHoledCount = fusedShards.filter((n) => n.edgeWeight === 0).length;
  const avgPurity =
    fusedShards.length > 0
      ? (fusedShards.reduce((s, n) => s + n.eceQualityScore, 0) /
          fusedShards.length /
          100)
      : 0;

  const selectedGraph = selectedEntityId
    ? entities[selectedEntityId]
    : null;
  const selectedNode = selectedGraph?.nodes.find(
    (n) => n.id === selectedNodeId,
  );
  const selectedNodeAvatar = selectedNode
    ? avatars.find((a) => a.id === selectedNode.ownerAvatarId)
    : undefined;

  // ----- Avatar helpers -----
  const findProphet = () =>
    avatars.find((a) => a.kind === "prophet");
  const findGenius = () =>
    avatars.find(
      (a) =>
        a.kind === "genius" &&
        a.name.includes("数学"),
    ) ||
    avatars.find((a) => a.kind === "genius");
  const findWaterArmy = () =>
    avatars.find(
      (a) => a.kind === "agent" || a.name.includes("水军"),
    );

  // ----- Actions -----
  async function createAnchorAndSelect(
    entityId: string,
    ownerAvatarId: string,
  ): Promise<boolean> {
    try {
      const res = await fetch("/api/dag/create-anchor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          ownerAvatarId,
          shardHash: randomShardHash(),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast({
          title: "Create anchor failed",
          description: json.error,
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch (e) {
      toast({
        title: "Network error",
        description: (e as Error).message,
        variant: "destructive",
      });
      return false;
    }
  }

  async function fuseOne(
    entityId: string,
    ownerAvatarId: string,
    qEce: number,
    sim: number,
  ): Promise<boolean> {
    try {
      const res = await fetch("/api/dag/fuse-shard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          ownerAvatarId,
          shardHash: randomShardHash(),
          qEceScore: qEce,
          similarityToAnchor: sim,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast({
          title: "Fuse shard failed",
          description: json.error,
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch (e) {
      toast({
        title: "Network error",
        description: (e as Error).message,
        variant: "destructive",
      });
      return false;
    }
  }

  async function handleFuseSubmit() {
    if (!fuseEntityId || !fuseOwnerAvatarId) {
      toast({
        title: "Missing fields",
        description: "Entity and owner avatar are required",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    // Ensure a core anchor exists for this entity (idempotent)
    const prophet = findProphet();
    const anchorOwner =
      avatars.find((a) => a.id === fuseOwnerAvatarId)?.id ??
      prophet?.id ??
      fuseOwnerAvatarId;
    await createAnchorAndSelect(fuseEntityId, anchorOwner);

    const ok = await fuseOne(
      fuseEntityId,
      fuseOwnerAvatarId,
      fuseQEce,
      fuseSim,
    );
    if (ok) {
      toast({
        title: "Shard fused",
        description: `CPDF weight computed · Q_ece=${fuseQEce} · sim=${fuseSim.toFixed(2)}`,
      });
      setFuseShardHash("");
      await fetchAll();
      setSelectedEntityId(fuseEntityId);
    }
    setLoading(false);
  }

  async function handleComputeSplit() {
    if (!splitEntityId) {
      toast({
        title: "Select an entity first",
        variant: "destructive",
      });
      return;
    }
    setSplitting(true);
    try {
      const res = await fetch("/api/dag/lineage-split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: splitEntityId,
          totalRewardAmountUsdc: splitAmount,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        const shares = parseFromJson<LineageSplitShareBig[]>(json.data);
        setSplitShares(shares);
        toast({
          title: "Split computed",
          description: `${shares.length} avatars · total ${splitAmount} $AFC`,
        });
      } else {
        toast({
          title: "Split failed",
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
      setSplitting(false);
    }
  }

  async function handleScan() {
    if (!scanEntityId) {
      toast({
        title: "Select an entity first",
        variant: "destructive",
      });
      return;
    }
    setScanning(true);
    try {
      const res = await fetch("/api/dag/detect-laundering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: scanEntityId }),
      });
      const json = await res.json();
      if (json.ok) {
        const result = parseFromJson<MoneyLaunderingResult>(json.data);
        setScanResult(result);
        toast({
          title: result.suspicious ? "Suspicious!" : "Clean",
          description: result.suspicious
            ? result.reason
            : "No laundering pattern detected",
          variant: result.suspicious ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Scan failed",
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
      setScanning(false);
    }
  }

  // ----- Preset scenarios -----
  async function presetHealthy() {
    setLoading(true);
    const prophet = findProphet();
    const genius = findGenius();
    if (!prophet || !genius) {
      toast({
        title: "Avatars missing",
        description: "Need a prophet and a genius avatar (run /api/seed first)",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    const entityId = randomEntityId("healthy");
    const okAnchor = await createAnchorAndSelect(entityId, prophet.id);
    if (!okAnchor) {
      setLoading(false);
      return;
    }
    // Healthy fusion: high quality + high similarity
    const okFuse = await fuseOne(entityId, genius.id, 8500, 0.85);
    if (okFuse) {
      await fetchAll();
      setSelectedEntityId(entityId);
      setSplitEntityId(entityId);
      setScanEntityId(entityId);
      toast({
        title: "Healthy fusion preset loaded",
        description: "Prophet + Math Genius · Q=8500 sim=0.85",
      });
    }
    setLoading(false);
  }

  async function presetLaundering() {
    setLoading(true);
    const prophet = findProphet();
    const army = findWaterArmy();
    if (!prophet || !army) {
      toast({
        title: "Avatars missing",
        description: "Need a prophet and a water-army avatar",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    const entityId = randomEntityId("launder");
    const okAnchor = await createAnchorAndSelect(entityId, prophet.id);
    if (!okAnchor) {
      setLoading(false);
      return;
    }
    // Fuse 12 low-quality, low-similarity shards — all should be black-holed.
    let allOk = true;
    for (let i = 0; i < 12; i++) {
      const ok = await fuseOne(entityId, army.id, 500, 0.15);
      if (!ok) {
        allOk = false;
        break;
      }
    }
    if (allOk) {
      await fetchAll();
      setSelectedEntityId(entityId);
      setSplitEntityId(entityId);
      setScanEntityId(entityId);
      toast({
        title: "Laundering preset loaded",
        description: "12 black-holed shards · scan to detect",
        variant: "destructive",
      });
    }
    setLoading(false);
  }

  async function presetSplit() {
    setLoading(true);
    const prophet = findProphet();
    const genius = findGenius();
    if (!prophet || !genius) {
      toast({
        title: "Avatars missing",
        description: "Need a prophet and a genius avatar",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    const entityId = randomEntityId("split");
    const okAnchor = await createAnchorAndSelect(entityId, prophet.id);
    if (!okAnchor) {
      setLoading(false);
      return;
    }
    // Genius shard with weight ≈ 1/3 → roughly 75% prophet / 25% genius
    const okFuse = await fuseOne(entityId, genius.id, 8000, 0.5);
    if (okFuse) {
      await fetchAll();
      setSelectedEntityId(entityId);
      setSplitEntityId(entityId);
      setScanEntityId(entityId);
      setSplitAmount(10000);
      // Auto-compute split
      setSplitShares(null);
      toast({
        title: "Lineage split demo loaded",
        description: "Click 'Compute Split' with 10000 $AFC",
      });
    }
    setLoading(false);
  }

  // ----- Live CPDF preview for the fuse form -----
  const livePreview = cpdfPreview(fuseQEce, fuseSim);

  // ----- Render -----
  return (
    <div>
      <PanelHeader
        icon={Network}
        title="CognitiveDAG + CPDF"
        rfcSection="RFC §5.1 (CPDF)"
        description="Cognitive lineage tracking · purity decay function · anti money-laundering · lineage-aware reward split"
        accent="cyan"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs gap-1"
            onClick={() => void fetchAll()}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Total Entities"
          value={entityIds.length}
          hint="cognitive DAGs"
          accent="cyan"
        />
        <Stat
          label="Total Shards"
          value={totalNodes}
          hint={`${fusedShards.length} fused`}
          accent="emerald"
        />
        <Stat
          label="Black-Holed"
          value={blackHoledCount}
          hint="weight crushed to 0"
          accent="rose"
        />
        <Stat
          label="Avg Purity"
          value={`${avgPurity.toFixed(1)}%`}
          hint="mean Q_ece of fused"
          accent="amber"
        />
      </div>

      {/* Preset scenario buttons */}
      <PanelCard
        title="Preset Scenarios — One-Click Demos"
        icon={Sparkles}
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto justify-start p-3 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5"
            onClick={() => void presetHealthy()}
            disabled={loading}
          >
            <div className="flex items-start gap-2 text-left">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold">
                  Prophet + Math Genius
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Q=8500 · sim=0.85 → healthy weight
                </span>
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start p-3 border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/5"
            onClick={() => void presetLaundering()}
            disabled={loading}
          >
            <div className="flex items-start gap-2 text-left">
              <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold">
                  Prophet + Water Army
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  12× Q=500 · sim=0.15 → laundering
                </span>
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto justify-start p-3 border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5"
            onClick={() => void presetSplit()}
            disabled={loading}
          >
            <div className="flex items-start gap-2 text-left">
              <GitBranch className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold">
                  Lineage Split Demo
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  prophet 75% + genius 25% · 10000 $AFC
                </span>
              </div>
            </div>
          </Button>
        </div>
      </PanelCard>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-4">
        {/* ===== LEFT COLUMN (55%) ===== */}
        <div className="space-y-4">
          {/* DAG Visualizer */}
          <PanelCard
            title="Cognitive DAG Visualizer"
            icon={Network}
            action={
              <Select
                value={selectedEntityId}
                onValueChange={(v) => {
                  setSelectedEntityId(v);
                  setSelectedNodeId("");
                }}
              >
                <SelectTrigger size="sm" className="font-mono text-[11px] w-[200px]">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entityIds.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No entities yet
                    </SelectItem>
                  ) : (
                    entityIds.map((id) => (
                      <SelectItem key={id} value={id} className="font-mono text-[11px]">
                        {id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            }
          >
            <div className="rounded-md border border-border/40 bg-background/40 p-2">
              {selectedGraph ? (
                <DagGraph
                  nodes={selectedGraph.nodes}
                  edges={selectedGraph.edges}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                />
              ) : (
                <div className="h-[360px] flex items-center justify-center text-muted-foreground font-mono text-xs">
                  No entity selected — run a preset or create an anchor
                </div>
              )}
            </div>

            {/* Selected node breakdown */}
            <div className="mt-3">
              <NodeBreakdown node={selectedNode ?? null} avatar={selectedNodeAvatar} />
            </div>
          </PanelCard>

          {/* Fuse New Shard form */}
          <PanelCard title="Fuse New Shard" icon={Plus}>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px]">Entity</Label>
                  <Select
                    value={fuseEntityId}
                    onValueChange={setFuseEntityId}
                  >
                    <SelectTrigger className="font-mono text-[11px] w-full">
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entityIds.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No entities yet
                        </SelectItem>
                      ) : (
                        entityIds.map((id) => (
                          <SelectItem
                            key={id}
                            value={id}
                            className="font-mono text-[11px]"
                          >
                            {id}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px]">Owner Avatar</Label>
                  <Select
                    value={fuseOwnerAvatarId}
                    onValueChange={setFuseOwnerAvatarId}
                  >
                    <SelectTrigger className="font-mono text-[11px] w-full">
                      <SelectValue placeholder="Select avatar" />
                    </SelectTrigger>
                    <SelectContent>
                      {avatars.map((a) => (
                        <SelectItem
                          key={a.id}
                          value={a.id}
                          className="font-mono text-[11px]"
                        >
                          {a.name} ({a.kind})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-[11px]">
                  shardHash (auto-generated, editable)
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={fuseShardHash}
                    onChange={(e) => setFuseShardHash(e.target.value)}
                    placeholder={randomShardHash()}
                    className="font-mono text-[11px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => setFuseShardHash(randomShardHash())}
                  >
                    Gen
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="font-mono text-[11px]">
                    Q_ece (ECE Quality Score)
                  </Label>
                  <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
                    {fuseQEce} ({((fuseQEce / 10000) * 100).toFixed(0)}%)
                  </span>
                </div>
                <Slider
                  value={[fuseQEce]}
                  min={0}
                  max={10000}
                  step={100}
                  onValueChange={(v) => setFuseQEce(v[0] ?? 0)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="font-mono text-[11px]">
                    Similarity to Anchor
                  </Label>
                  <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
                    {fuseSim.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[fuseSim]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(v) => setFuseSim(v[0] ?? 0)}
                />
              </div>

              {/* Live CPDF preview */}
              <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                    Live CPDF Preview
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      livePreview.isBlackHole
                        ? "border-rose-500/40 text-rose-600 dark:text-rose-400 font-mono text-[10px]"
                        : livePreview.finalWeight > 0.4
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]"
                          : "border-amber-500/40 text-amber-600 dark:text-amber-400 font-mono text-[10px]"
                    }
                  >
                    {livePreview.isBlackHole
                      ? "BLACK HOLE ✕"
                      : livePreview.finalWeight > 0.4
                        ? "HEALTHY"
                        : "DILUTED"}
                  </Badge>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  W = {livePreview.baseWeight.toFixed(1)} ×{" "}
                  {livePreview.similarity.toFixed(2)} × e
                  <sup>−{RFC_CONSTANTS.CPDF_LAMBDA}(1−{((livePreview.eceScore / 10000)).toFixed(2)})</sup>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <div>
                    <div className="text-muted-foreground">Decay</div>
                    <div className="text-foreground/80">
                      {livePreview.decayFactor.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Weight</div>
                    <div
                      className={
                        livePreview.isBlackHole
                          ? "text-rose-500"
                          : "text-emerald-500"
                      }
                    >
                      {livePreview.finalWeight.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="text-foreground/80">
                      {livePreview.isBlackHole
                        ? "crushed"
                        : livePreview.finalWeight > 0.4
                          ? "active"
                          : "weak"}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full font-mono text-xs gap-1.5"
                onClick={() => void handleFuseSubmit()}
                disabled={loading || !fuseEntityId || !fuseOwnerAvatarId}
              >
                <Plus className="h-3.5 w-3.5" />
                Fuse Shard into DAG
              </Button>
            </div>
          </PanelCard>
        </div>

        {/* ===== RIGHT COLUMN (45%) ===== */}
        <div className="space-y-4">
          {/* CPDF Formula Explainer */}
          <PanelCard title="CPDF Formula Explainer" icon={Calculator}>
            <CpdfExplainer />
          </PanelCard>

          {/* Lineage Split Simulator */}
          <PanelCard title="Lineage Split Simulator" icon={GitBranch}>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px]">Entity</Label>
                  <Select
                    value={splitEntityId}
                    onValueChange={setSplitEntityId}
                  >
                    <SelectTrigger className="font-mono text-[11px] w-full">
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entityIds.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No entities yet
                        </SelectItem>
                      ) : (
                        entityIds.map((id) => (
                          <SelectItem
                            key={id}
                            value={id}
                            className="font-mono text-[11px]"
                          >
                            {id}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px]">
                    Total Reward ($AFC)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={splitAmount}
                    onChange={(e) =>
                      setSplitAmount(Number(e.target.value) || 0)
                    }
                    className="font-mono text-[11px]"
                  />
                </div>
              </div>
              <Button
                className="w-full font-mono text-xs gap-1.5"
                onClick={() => void handleComputeSplit()}
                disabled={splitting || !splitEntityId}
              >
                <GitBranch className="h-3.5 w-3.5" />
                {splitting ? "Computing…" : "Compute Split"}
              </Button>

              <AnimatePresence>
                {splitShares && splitShares.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {/* Stacked bar */}
                    <div className="flex h-3 w-full overflow-hidden rounded-full">
                      {splitShares.map((s, i) => {
                        const colors = [
                          COLORS.emerald,
                          COLORS.amber,
                          COLORS.rose,
                          "#8b5cf6",
                          "#06b6d4",
                        ];
                        return (
                          <div
                            key={s.avatarId}
                            style={{
                              width: `${(s.weight / 10000) * 100}%`,
                              background: colors[i % colors.length],
                            }}
                            title={`${s.avatarId}: ${s.weight} bps`}
                          />
                        );
                      })}
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-mono text-[10px]">
                            Avatar
                          </TableHead>
                          <TableHead className="font-mono text-[10px] text-right">
                            Weight
                          </TableHead>
                          <TableHead className="font-mono text-[10px] text-right">
                            Share
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {splitShares.map((s) => {
                          const av = avatars.find(
                            (a) => a.id === s.avatarId,
                          );
                          return (
                            <TableRow key={s.avatarId}>
                              <TableCell className="font-mono text-[11px] py-1.5">
                                {av?.name ?? shortHash(s.avatarId, 6, 4)}
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-right py-1.5">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px]"
                                >
                                  {s.weight} bps
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-[11px] text-right py-1.5 text-emerald-600 dark:text-emerald-400">
                                {formatToken(s.share)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <Separator />
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-foreground">
                        {formatToken(
                          splitShares.reduce(
                            (s, sh) => s + sh.share,
                            0n,
                          ),
                        )}
                      </span>
                    </div>
                  </motion.div>
                )}
                {splitShares && splitShares.length === 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No weights</AlertTitle>
                    <AlertDescription>
                      Entity has no non-black-hole lineage — all shards were
                      crushed. Cannot split reward.
                    </AlertDescription>
                  </Alert>
                )}
              </AnimatePresence>
            </div>
          </PanelCard>

          {/* Anti Money-Laundering Scanner */}
          <PanelCard
            title="Anti Money-Laundering Scanner"
            icon={ShieldAlert}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-mono text-[11px]">Entity</Label>
                  <Select
                    value={scanEntityId}
                    onValueChange={setScanEntityId}
                  >
                    <SelectTrigger className="font-mono text-[11px] w-full">
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entityIds.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No entities yet
                        </SelectItem>
                      ) : (
                        entityIds.map((id) => (
                          <SelectItem
                            key={id}
                            value={id}
                            className="font-mono text-[11px]"
                          >
                            {id}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full font-mono text-xs gap-1.5"
                onClick={() => void handleScan()}
                disabled={scanning || !scanEntityId}
                variant="outline"
              >
                <Activity className="h-3.5 w-3.5" />
                {scanning ? "Scanning…" : "Scan for Laundering"}
              </Button>

              <AnimatePresence>
                {scanResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {scanResult.suspicious ? (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Suspicious Pattern Detected</AlertTitle>
                        <AlertDescription>
                          {scanResult.reason}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <AlertTitle>Entity is Clean</AlertTitle>
                        <AlertDescription>
                          No money-laundering pattern detected.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Heuristic stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <HeuristicStat
                        icon={Atom}
                        label="Shards"
                        value={scanResult.stats.shardCount}
                        threshold="> 10"
                        bad={scanResult.stats.shardCount > 10}
                      />
                      <HeuristicStat
                        icon={Gauge}
                        label="Avg Q_ece"
                        value={`${(scanResult.stats.avgEceScore / 100).toFixed(0)}%`}
                        threshold="< 20%"
                        bad={scanResult.stats.avgEceScore < 2000}
                      />
                      <HeuristicStat
                        icon={TrendingDown}
                        label="Avg Sim"
                        value={scanResult.stats.avgSimilarity.toFixed(2)}
                        threshold="< 0.30"
                        bad={scanResult.stats.avgSimilarity < 0.3}
                      />
                    </div>

                    {/* Black-holed nodes */}
                    {scanResult.blackHoledNodes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Ban className="h-3.5 w-3.5 text-rose-500" />
                          <span className="font-mono text-[11px] font-bold">
                            Black-Holed Nodes ({scanResult.blackHoledNodes.length})
                          </span>
                        </div>
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border/60 bg-card/30">
                          {scanResult.blackHoledNodes.map((n) => (
                            <div
                              key={n.id}
                              className="flex items-center justify-between px-2 py-1 border-b border-border/40 last:border-0 font-mono text-[10px]"
                            >
                              <span className="text-muted-foreground truncate">
                                {shortHash(n.shardHash, 10, 6)}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-rose-500">weight=0</span>
                                <XCircle className="h-3 w-3 text-rose-500" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

function HeuristicStat({
  icon: Icon,
  label,
  value,
  threshold,
  bad,
}: {
  icon: typeof Atom;
  label: string;
  value: React.ReactNode;
  threshold: string;
  bad: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-2 ${
        bad
          ? "border-rose-500/40 bg-rose-500/5"
          : "border-emerald-500/40 bg-emerald-500/5"
      }`}
    >
      <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-sm font-bold ${
          bad ? "text-rose-500" : "text-emerald-500"
        }`}
      >
        {value}
      </div>
      <div className="text-[9px] font-mono text-muted-foreground">
        trigger {threshold}
      </div>
    </div>
  );
}
