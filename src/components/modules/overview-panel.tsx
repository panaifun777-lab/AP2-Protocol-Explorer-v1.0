"use client";

import { Layers, Zap, Shield, Heart, Network, Crosshair } from "lucide-react";
import { PanelHeader, PanelCard, Stat } from "./panel-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODULES } from "@/lib/modules";

export function OverviewPanel() {
  const pillars = [
    {
      icon: Zap,
      title: "认知主权 (Cognitive Sovereignty)",
      desc: "PoUE 唯一实体证明 + CIP 意识继承 + CDS 跨维度灵魂绑定。打破私钥诅咒，数字生命跨越生死与载体实现永生。",
      accent: "emerald" as const,
      rfc: "§1 / §5.2",
    },
    {
      icon: Shield,
      title: "反平庸暴政 (Anti-Mediocrity)",
      desc: "TDPO 时间延迟定价 + CPDF 认知纯度衰减。用时间维度与认知方差，保护并奖励少数派的超前认知，杜绝认知洗钱。",
      accent: "amber" as const,
      rfc: "§5.1",
    },
    {
      icon: Heart,
      title: "虚实同构 (Phygital Isomorphism)",
      desc: "PCMG 虚实跨膜网关。多模态物理证明 + ECE 情绪共识双重校验。数字意志就是物理世界的绝对法则。",
      accent: "rose" as const,
      rfc: "§5.3",
    },
  ];

  const stack = [
    {
      name: "规范层 AP2 Core Spec",
      items: [
        "Cognitive-Resonance (报价)",
        "Time-Lock-Escrow (托管)",
        "Retroactive-Settle (结算)",
        "Soul-Bound-Auth (权限)",
      ],
      accent: "emerald",
    },
    {
      name: "共识与计算层 AFC Chain",
      items: ["PoUE + PoRC 共识", "Cognitive Coprocessor", "TEE + ZK-ML", "Graph Storage"],
      accent: "cyan",
    },
    {
      name: "灵魂与跨膜层",
      items: ["CIP Registry", "CDS SBT", "PCMG Gateway", "Slashing"],
      accent: "violet",
    },
    {
      name: "生态与 SDK 层",
      items: ["TS/Python/Rust SDK", "A2A Discovery", "MCP Tools", "M-Pata VC"],
      accent: "amber",
    },
  ];

  return (
    <div>
      <PanelHeader
        icon={Layers}
        title="AP2 Protocol Overview"
        rfcSection="RFC §4"
        description="Web4.0 Avatar Payments Protocol v1.0 — 数字生命宪法·四层架构·三大宪法原则"
        accent="emerald"
      />

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Protocol" value="AP2 v1.0" hint="RFC 001 PROPOSED" accent="emerald" />
        <Stat label="Modules" value="7" hint="core contracts" accent="cyan" />
        <Stat label="Consensus" value="PoUE+PoRC" hint="AFC Chain" accent="violet" />
        <Stat label="Status" value="PROPOSED" hint="2026.06.18" accent="amber" />
      </div>

      {/* Three constitutional pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title} className="border-glow border-border/60 overflow-hidden">
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
      <PanelCard title="协议栈架构 · 4-Layer Stack" icon={Network}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
      <div className="mt-6">
        <PanelCard title="Module Map · 协议模块导航" icon={Crosshair}>
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
                        {m.label}
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
