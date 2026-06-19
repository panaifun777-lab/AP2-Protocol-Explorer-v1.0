"use client";

import { Layers, Zap, Shield, Heart, Network, Crosshair } from "lucide-react";
import { PanelHeader, PanelCard, Stat } from "./panel-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODULES } from "@/lib/modules";
import { useT, useLang } from "@/lib/i18n";

export function OverviewPanel() {
  const t = useT();
  const lang = useLang((s) => s.lang);

  const pillars = [
    {
      icon: Zap,
      title: t("overview.pillar1Title"),
      desc: t("overview.pillar1Desc"),
      accent: "emerald" as const,
      rfc: "§1 / §5.2",
    },
    {
      icon: Shield,
      title: t("overview.pillar2Title"),
      desc: t("overview.pillar2Desc"),
      accent: "amber" as const,
      rfc: "§5.1",
    },
    {
      icon: Heart,
      title: t("overview.pillar3Title"),
      desc: t("overview.pillar3Desc"),
      accent: "rose" as const,
      rfc: "§5.3",
    },
  ];

  const stackItems1 =
    lang === "zh"
      ? [
          "Cognitive-Resonance (报价)",
          "Time-Lock-Escrow (托管)",
          "Retroactive-Settle (结算)",
          "Soul-Bound-Auth (权限)",
        ]
      : [
          "Cognitive-Resonance (Quote)",
          "Time-Lock-Escrow (Escrow)",
          "Retroactive-Settle (Settle)",
          "Soul-Bound-Auth (Auth)",
        ];
  const stackItems2 =
    lang === "zh"
      ? ["PoUE + PoRC 共识", "认知协处理器", "TEE + ZK-ML", "图存储"]
      : ["PoUE + PoRC Consensus", "Cognitive Coprocessor", "TEE + ZK-ML", "Graph Storage"];
  const stackItems3 =
    lang === "zh"
      ? ["CIP 注册表", "CDS SBT", "PCMG 网关", "罚没"]
      : ["CIP Registry", "CDS SBT", "PCMG Gateway", "Slashing"];
  const stackItems4 =
    lang === "zh"
      ? ["TS/Python/Rust SDK", "A2A 发现", "MCP 工具", "M-Pata VC"]
      : ["TS/Python/Rust SDK", "A2A Discovery", "MCP Tools", "M-Pata VC"];

  const stack = [
    { name: t("overview.layer1"), items: stackItems1, accent: "emerald" },
    { name: t("overview.layer2"), items: stackItems2, accent: "cyan" },
    { name: t("overview.layer3"), items: stackItems3, accent: "violet" },
    { name: t("overview.layer4"), items: stackItems4, accent: "amber" },
  ];

  return (
    <div>
      <PanelHeader
        icon={Layers}
        title={t("overview.title")}
        rfcSection="RFC §4"
        description={t("overview.description")}
        accent="emerald"
      />

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("overview.protocol")} value="AP2 v1.0" hint="RFC 001 PROPOSED" accent="emerald" />
        <Stat label={t("overview.modules")} value="7" hint={lang === "zh" ? "核心合约" : "core contracts"} accent="cyan" />
        <Stat label={t("overview.consensus")} value="PoUE+PoRC" hint="AFC Chain" accent="violet" />
        <Stat label={t("overview.statusLabel")} value="PROPOSED" hint="2026.06.18" accent="amber" />
      </div>

      {/* Three constitutional pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title} className="glow-border border-border/60 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${p.accent}-500/10 text-${p.accent}-600 dark:text-${p.accent}-400 border border-${p.accent}-500/30`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {p.rfc}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-mono mt-2">
                  {p.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p.desc}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 4-layer architecture */}
      <PanelCard title={t("overview.stackTitle")} icon={Network}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stack.map((s, i) => (
            <div
              key={s.name}
              className="rounded-lg border border-border/60 bg-card/30 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded bg-${s.accent}-500/15 text-${s.accent}-600 dark:text-${s.accent}-400 font-mono text-xs font-bold`}
                >
                  {i + 1}
                </span>
                <span className="font-mono text-xs font-semibold">{s.name}</span>
              </div>
              <ul className="space-y-1">
                {s.items.map((it) => (
                  <li
                    key={it}
                    className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5"
                  >
                    <span
                      className={`h-1 w-1 rounded-full bg-${s.accent}-500`}
                    />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </PanelCard>

      {/* Module map */}
      <div className="mt-4">
        <PanelCard title={t("overview.moduleMap")} icon={Crosshair}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {MODULES.filter((m) => m.id !== "overview").map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  className="flex items-start gap-2 rounded-md border border-border/40 bg-card/30 p-2.5"
                >
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold">
                        {t(m.navKey as never)}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[9px]"
                      >
                        {m.rfcSection}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      {m.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
