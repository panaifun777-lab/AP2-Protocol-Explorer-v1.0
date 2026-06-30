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
import { useT, useLang } from "@/lib/i18n";

// ============================================================
// Bilingual content maps — Chinese translations for data-driven
// content (test vectors, consensus steps, coprocessor layers,
// roadmap phases, scenarios). The source data lives in pure
// data files (test-vectors.ts / consensus.ts) which we don't
// modify; here we provide zh overrides keyed by id. When
// lang === "en" the original English string is used.
// ============================================================

const VECTOR_TITLES_ZH: Record<string, string> = {
  TV1: "BudgetFence 作用域锁违规",
  TV2: "托管流式超付回拨",
  TV3: "CIP 迁移阈值方差 (3 场景)",
  TV4: "CDS SBT 灵魂绑定强制 (2 场景)",
  TV5: "TDPO 非超前认知拒绝",
  TV6: "TDPO 追溯奖励触发",
  TV7: "PCMG 伪造/低保真证明拒绝",
  TV8: "PCMG 情绪失调罚没",
  TV9: "CPDF 黑洞 (低相似度 → 权重归零)",
  TV10: "认知洗钱检测",
};

const VECTOR_DESCS_ZH: Record<string, string> = {
  TV1:
    "子代理 'lawyer' 尝试在作用域 'medical_diagnosis' 上花费 50 USDC,该作用域不在围栏的 allowedScopes [legal, compliance] 中。合约必须以 REJECT_SCOPE 拒绝,并触发衰减授权回退 (需人类主签名)。",
  TV2:
    "网络延迟导致流式释放了 90% 的资金,但 MCP 最终验证仅记 80% 完成度。合约必须进入 Disputed 状态,并要求 100 USDC 的超付回拨。",
  TV3:
    "意识迁移阈值边界情况。RFC 测试向量预期 9250→SUCCESS、8499→REVERT、10500→SUCCESS_WITH_FLAG。实际实现采用精炼的三区间 CIP_Lineage.sol 模型 (85% 纯粹 / 60% 最低 / <60% 拒绝),因此 8499 落入 FUSION_EMERGENCE 区间,10500 被拒绝 (超出 BPS 范围 [0,10000])。运行器按精炼模型断言。",
  TV4:
    "跨维度灵魂绑定代币无法手动转移 — transferFrom 必须回退。仅允许 CIP 触发的 soulTransfer,它轮换 owner 指针同时保留 tokenId + metadataHash。",
  TV5:
    "mean=50 (不 < 30) 且 variance=200 (不 > 500) 的认知未通过超前认知检查。合约必须拒绝锁定并返回 'Not a contrarian cognition'。",
  TV6:
    "时间锁到期后,一个 '随时间被证实为真理' 的超前认知 (futureMean=950 vs initialMean=15,citations=5000) 触发追溯补偿。evolutionFactor = floor(950/(15+1)) = 59 (Solidity 整数除法)。",
  TV7:
    "保真度=6500 (低于 8000 阈值) 的多模态物理证明必须在情绪共振检查之前 400 回退。镜像 Solidity require 顺序:先验证物理证明。",
  TV8:
    "物理证明高保真 (9200>8000) 但情绪共振低于阈值 (3000<=7500)。合约必须罚没执行者:status=Slashed,slashAmount=escrowAmount 退还给创建者。",
  TV9:
    "与核心锚点相似度=0.15 (低于 0.30 下限) 的融合分片被判定为认知垃圾。CPDF 必须将其边权重压至 0 并标记为黑洞节点,排除在谱系奖励之外。",
  TV10:
    "一个实体融合 12+ 个分片,平均 ECE 质量=500 (<2000) 且平均相似度=0.15 (<0.3)。CPDF 将全部黑洞化,启发式检测将该实体标记为认知洗钱模式。",
};

const SCENARIO_LABELS_ZH: Record<string, string> = {
  "TV3-a": "matchScore=9250 (92.5% — 纯粹继承)",
  "TV3-b": "matchScore=8499 (84.99% — 融合区间,谱系分账)",
  "TV3-c": "matchScore=10500 (>BPS_MAX — 无效,回退)",
  "TV4-a": "transferFrom (恶意手动转移)",
  "TV4-b": "经 CIP 的 soulTransfer (意识迁移)",
};

const STEP_NAMES_ZH: Record<string, string> = {
  "poue-1": "M-Pata 生物特征映射",
  "poue-2": "行为时间序列",
  "poue-3": "情绪基线提取",
  "poue-4": "ZK 证明生成",
  "poue-5": "链上验证",
  "porc-1": "认知分片提交",
  "porc-2": "熵减度量",
  "porc-3": "共识投票",
  "porc-4": "区块打包",
  "porc-5": "$AFC 代币奖励",
};

const STEP_DESCS_ZH: Record<string, string> = {
  "poue-1":
    "可逆生物特征映射 (M-Pata) 将分身绑定到唯一活体实体,不在链上存储原始生物特征。",
  "poue-2":
    "长时域行为遥测 (交互节奏、决策熵) 被采样为抗女巫的指纹。",
  "poue-3":
    "ECE (情绪共识引擎) 提取私密的情绪基线向量,锚定分身的认知指纹。",
  "poue-4":
    "在链下生成 ZK-SNARK/STARK 证明,证明 '唯一活体实体' 而不泄露底层生物特征数据。",
  "poue-5":
    "AFC 链在链上验证 ZK 证明。通过验证的分身被准入共识池 — 即通往 PoRC 的门。",
  "porc-1":
    "分身将认知分片 (已解问题、共识投票、融合贡献) 提交到本轮池中。",
  "porc-2":
    "ECE 引擎按每个分片的熵减贡献 ΔH 评分 — 认知价值越高,分数越高。",
  "porc-3":
    "验证者对最高 ΔH 分片投票。绝对多数确认下一区块的领导者 (BFT 式最终性)。",
  "porc-4":
    "当选领导者将本轮确认分片 + 交易打包进下一个 AFC 区块 (目标出块 0.4s)。",
  "porc-5":
    "区块奖励 + 认知分片奖励以 $AFC 铸造给领导者及贡献分身,按 ΔH 权重分配。",
};

const COPROCESSOR_NAMES_ZH: Record<string, string> = {
  tee: "TEE (可信执行环境)",
  "zk-ml": "ZK-ML 证明生成",
  graph: "原生图存储",
};

const COPROCESSOR_DESCS_ZH: Record<string, string> = {
  tee: "在硬件 enclave (Intel SGX / ARM TrustZone) 内保密计算生物特征 + 行为特征。",
  "zk-ml":
    "对 ML 推理 (ECE 评分、相似度) 生成零知识证明 — 链验证证明,从不接触原始认知数据。",
  graph:
    "认知分片、谱系边和 CIP 灵魂绑定代币的 DAG 原生存储层 — 无外键阻抗。",
};

const PHASE_LABELS_ZH: Record<string, string> = {
  "phase-1": "阶段一",
  "phase-2": "阶段二",
  "phase-3": "阶段三",
};

const PHASE_TITLES_ZH: Record<string, string> = {
  "phase-1": "影子分身 (Base MVP)",
  "phase-2": "主权降临 (AFC 主网)",
  "phase-3": "虚实共生 (PCMG 全面开放)",
};

const PHASE_DESCS_ZH: Record<string, string> = {
  "phase-1":
    "在 Base 链上部署 AA2P 核心合约 (Escrow、BudgetFence、TDPO)。发行 ERC-20 $AFC。链下 M-Pata 为白名单签署 PoUE VC。运行分身租赁 + 追溯锁定演示。",
  "phase-2":
    "启动 PoUE + PoRC 共识的 AFC 主网。开放认知状态迁移桥 — Base 链分身、TDPO 锁仓和 CDS SBT 无损映射到 AFC 主网。",
  "phase-3":
    "接入全球 IoT 设备 + Rent-a-Human 网络。数字意志通过虚实跨膜网关对物理世界实现绝对、安全的干预。",
};

const PHASE_DURATIONS_ZH: Record<string, string> = {
  "phase-1": "第 1-3 月",
  "phase-2": "第 4-6 月",
  "phase-3": "第 7 月+",
};

const PHASE_MILESTONES_ZH: Record<string, string[]> = {
  "phase-1": [
    "AP2Escrow + BudgetFence 部署于 Base",
    "ERC-20 $AFC 发行",
    "链下 PoUE VC 白名单",
    "分身租赁 + TDPO 锁定演示",
  ],
  "phase-2": [
    "AFC 主网 (PoUE + PoRC)",
    "认知状态迁移桥",
    "无损 CDS SBT 迁移",
    "10,000 TPS 压力测试",
  ],
  "phase-3": [
    "全球 IoT 设备接入",
    "Rent-a-Human 物理执行者网络",
    "跨膜 $AFC ↔ 法币通道",
    "罚没的 Ricardian 仲裁",
  ],
};

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
  const t = useT();
  const lang = useLang((s) => s.lang);
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
          title: lang === "zh" ? "加载测试向量失败" : "Failed to load test vectors",
          description: json.error ?? (lang === "zh" ? "未知错误" : "Unknown error"),
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
  }, [toast, lang]);

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
              title: `${vectorId} ${lang === "zh" ? "通过" : "PASSED"}`,
              description: result.rfcCase,
            });
          } else {
            toast({
              title: `${vectorId} ${lang === "zh" ? "失败" : "FAILED"}`,
              description: result.errorMessage ?? (lang === "zh" ? "断言失败" : "Assertion failed"),
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: lang === "zh" ? `${vectorId} 运行失败` : `${vectorId} run failed`,
            description: json.error ?? (lang === "zh" ? "未知错误" : "Unknown error"),
            variant: "destructive",
          });
        }
      } catch (e) {
        toast({
          title: lang === "zh" ? `${vectorId} 网络错误` : `${vectorId} network error`,
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
    [toast, loadList, lang],
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
        title: lang === "zh" ? "全部向量已执行" : "All vectors executed",
        description:
          lang === "zh"
            ? "10 个 RFC 测试向量运行完成 — 查看下方结果。"
            : "10 RFC test vectors run complete — see results below.",
      });
    } finally {
      setRunningAll(false);
    }
  }, [runVector, toast, lang]);

  return (
    <div>
      <PanelHeader
        icon={FlaskConical}
        title={t("tests.title")}
        rfcSection="RFC §三 / §4.2"
        description={t("tests.description")}
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
            {t("header.refresh")}
          </Button>
        }
      />

      <Tabs defaultValue="vectors" className="w-full">
        <TabsList className="font-mono text-xs">
          <TabsTrigger value="vectors" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            {t("tests.tabVectors")}
          </TabsTrigger>
          <TabsTrigger value="consensus" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            {t("tests.tabConsensus")}
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* TAB 1: Test Vectors                                          */}
        {/* ============================================================ */}
        <TabsContent value="vectors" className="space-y-6">
          {/* Stats row + Run All button */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label={t("tests.totalVectors")}
              value={data?.stats.totalVectors ?? 10}
              hint="RFC §三 + §5.2 §四"
              accent="cyan"
            />
            <Stat
              label={t("tests.passed")}
              value={
                data ? countRecentPassed(data, results) : "—"
              }
              hint={t("tests.latestRunPerVector")}
              accent="emerald"
            />
            <Stat
              label={t("tests.failed")}
              value={data ? countRecentFailed(data, results) : "—"}
              hint={t("tests.latestRunPerVector")}
              accent="rose"
            />
            <Stat
              label={t("tests.historyRows")}
              value={data?.stats.totalRuns ?? 0}
              hint={t("tests.persistedRuns")}
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
              {runningAll ? t("tests.runningAll") : t("tests.runAllVectors")}
            </Button>
            <span className="font-mono text-[11px] text-muted-foreground">
              {t("tests.vectorRunHint")}
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
            title={t("tests.runHistoryLatest")}
            icon={Clock}
            action={
              <Badge variant="outline" className="font-mono text-[10px]">
                {data?.history.length ?? 0} {t("tests.rows")}
              </Badge>
            }
          >
            <ScrollArea className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-[10px] uppercase">
                      {t("tests.colVector")}
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">
                      {t("tests.colModule")}
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">
                      {t("tests.colResult")}
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">
                      {t("tests.colError")}
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase">
                      {t("tests.colExecuted")}
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
                        {t("tests.noRuns")}
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
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("tests.passed")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-rose-600 dark:text-rose-400">
                            <XCircle className="h-3.5 w-3.5" /> {t("tests.failed")}
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
            title={t("tests.chainSpecs")}
            icon={Zap}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <SpecTile label={t("tests.consensusLabel")} value={AFC_CHAIN_SPECS.consensus} icon={ShieldCheck} accent="emerald" />
              <SpecTile label={t("tests.tps")} value={AFC_CHAIN_SPECS.tps} icon={Zap} accent="cyan" />
              <SpecTile label={t("tests.blockTime")} value={AFC_CHAIN_SPECS.blockTime} icon={Clock} accent="amber" />
              <SpecTile label={t("tests.nativeToken")} value={AFC_CHAIN_SPECS.nativeToken} icon={Coins} accent="violet" />
              <SpecTile label={t("tests.coprocessorLabel")} value={AFC_CHAIN_SPECS.coprocessor} icon={Cpu} accent="cyan" />
              <SpecTile label={t("tests.storage")} value={AFC_CHAIN_SPECS.storage} icon={Database} accent="emerald" />
              <SpecTile label={t("tests.finality")} value={AFC_CHAIN_SPECS.finality} icon={CheckCircle2} accent="amber" />
              <SpecTile label={t("tests.sybilResistance")} value={AFC_CHAIN_SPECS.sybilResistance} icon={Fingerprint} accent="rose" />
            </div>
          </PanelCard>

          {/* PoUE + PoRC two-column flow */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ConsensusFlowCard
              title={t("tests.poueFullTitle")}
              subtitle={t("tests.admissionGate")}
              steps={PoUE_STEPS}
              accent="emerald"
              tag={t("tests.admission")}
            />
            <ConsensusFlowCard
              title={t("tests.porcFullTitle")}
              subtitle={t("tests.blockProductionGate")}
              steps={PoRC_STEPS}
              accent="cyan"
              tag={t("tests.blockProduction")}
            />
          </div>

          {/* Cognitive Coprocessor */}
          <PanelCard
            title={t("tests.coprocessorStack")}
            icon={BrainCircuit}
          >
            <p className="mb-4 text-xs text-muted-foreground">
              {t("tests.coprocessorDesc")}
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
              {t("tests.rfcAlertTitle")}
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              {t("tests.rfcAlertDesc")}
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
  const t = useT();
  const lang = useLang((s) => s.lang);
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
                {vector.scenarios?.length ?? 0} {t("tests.scenarios")}
              </Badge>
            )}
          </div>
          <PassFailIndicator passed={passed} running={running} />
        </div>

        {/* Title + RFC ref */}
        <h3 className="mt-3 font-mono text-sm font-bold leading-tight">
          {lang === "zh" ? (VECTOR_TITLES_ZH[vector.id] ?? vector.title) : vector.title}
        </h3>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {vector.rfcRef}
        </p>

        {/* Description */}
        <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
          {lang === "zh" ? (VECTOR_DESCS_ZH[vector.id] ?? vector.description) : vector.description}
        </p>

        {/* Expected outcome */}
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            {t("tests.expectedLabel")}:
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
            {running ? (lang === "zh" ? "运行中…" : "Running…") : t("common.run")}
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
                          {lang === "zh" ? (SCENARIO_LABELS_ZH[s.scenarioId] ?? s.label) : s.label}
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
                      {t("tests.actualLabel")}:
                    </span>
                    <Badge
                      className={cn(
                        "font-mono text-[10px]",
                        liveResult.passed
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
                      )}
                    >
                      {liveResult.passed ? t("tests.pass") : t("tests.fail")}
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
  const t = useT();
  const lang = useLang((s) => s.lang);
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
                        {t("tests.step")} {idx + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {lang === "zh" ? (STEP_NAMES_ZH[step.id] ?? step.name) : step.name}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {lang === "zh" ? (STEP_DESCS_ZH[step.id] ?? step.description) : step.description}
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
  const lang = useLang((s) => s.lang);
  return (
    <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/30">
          <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
        </div>
        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
          {lang === "zh" ? (COPROCESSOR_NAMES_ZH[layer.id] ?? layer.name) : layer.name}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
        {lang === "zh" ? (COPROCESSOR_DESCS_ZH[layer.id] ?? layer.description) : layer.description}
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
  const t = useT();
  const lang = useLang((s) => s.lang);

  const result = COMPUTE_CPDF_WEIGHT(qEce, similarity);
  const isBlackHole = result.isBlackHole;
  const qNorm = qEce / 10000;
  const whereWord = t("tests.where");

  return (
    <PanelCard
      title={t("tests.cpdfFullTitle")}
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
          {isBlackHole ? t("tests.blackHole") : t("tests.valid")}
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
                {t("tests.qeceScore")}
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
              {t("tests.normalizedQ")} = {qNorm.toFixed(4)}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-mono text-xs">
                <Network className="h-3 w-3 inline mr-1" />
                {t("tests.similarity")}
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
              {t("tests.similarityFloor")}
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
                ? (lang === "zh"
                    ? `黑洞: 相似度 ${similarity.toFixed(2)} < 0.30 下限 → 权重压至 0。分片排除在谱系之外。`
                    : `BLACK HOLE: similarity ${similarity.toFixed(2)} < 0.30 floor → weight crushed to 0. Shard excluded from lineage.`)
                : (lang === "zh"
                    ? `有效分片: 权重 = 1.0 × ${similarity.toFixed(2)} × e^(-2 × (1 - ${qNorm.toFixed(4)})) = ${result.finalWeight.toFixed(6)}`
                    : `Valid shard: weight = 1.0 × ${similarity.toFixed(2)} × e^(-2 × (1 - ${qNorm.toFixed(4)})) = ${result.finalWeight.toFixed(6)}`)}
            </AlertDescription>
          </Alert>
        </div>

        {/* Live formula + result */}
        <div className="rounded-lg border border-border/60 bg-card/50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("tests.cpdfFormula")}
          </div>
          <pre className="mt-2 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
{`W = W_base × similarity × e^(-λ(1 - Q_ece))

${whereWord}:
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
              {t("tests.finalWeight")}
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
  const t = useT();
  return (
    <PanelCard
      title={t("tests.phaseRoadmapRfc")}
      icon={Rocket}
    >
      <p className="mb-4 text-xs text-muted-foreground">
        {t("tests.phaseRoadmapDesc")}
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
  const t = useT();
  const lang = useLang((s) => s.lang);
  const milestones = lang === "zh" ? (PHASE_MILESTONES_ZH[phase.id] ?? phase.milestones) : phase.milestones;
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
              {lang === "zh" ? (PHASE_LABELS_ZH[phase.id] ?? phase.phase) : phase.phase}
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
              {phase.status === "active" ? t("tests.active") : t("tests.planned")}
            </Badge>
          </div>
          <h4 className="font-mono text-xs font-bold text-foreground mt-0.5">
            {lang === "zh" ? (PHASE_TITLES_ZH[phase.id] ?? phase.title) : phase.title}
          </h4>
          <p className="font-mono text-[10px] text-muted-foreground">
            {lang === "zh" ? (PHASE_DURATIONS_ZH[phase.id] ?? phase.duration) : phase.duration}
          </p>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground mb-3">
        {lang === "zh" ? (PHASE_DESCS_ZH[phase.id] ?? phase.description) : phase.description}
      </p>

      <ul className="space-y-1">
        {milestones.map((m) => (
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
