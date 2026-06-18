"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

export interface PanelHeaderProps {
  icon: LucideIcon;
  title: string;
  rfcSection: string;
  description: string;
  accent?: "emerald" | "amber" | "violet" | "cyan" | "rose";
  actions?: React.ReactNode;
}

const ACCENT_STYLES: Record<
  NonNullable<PanelHeaderProps["accent"]>,
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

export function PanelHeader({
  icon: Icon,
  title,
  rfcSection,
  description,
  accent = "emerald",
  actions,
}: PanelHeaderProps) {
  const s = ACCENT_STYLES[accent];
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
            s.bg,
            s.border,
            s.text,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-mono text-lg font-bold tracking-tight">
              {title}
            </h2>
            <Badge
              variant="outline"
              className={cn("font-mono text-[10px]", s.text, s.border)}
            >
              {rfcSection}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            {description}
          </p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PanelCard({
  title,
  children,
  className,
  icon: Icon,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <Card className={cn("border-border/60", className)}>
      {title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              {title}
            </CardTitle>
            {action}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(!title && "pt-6")}>{children}</CardContent>
    </Card>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent = "emerald",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: PanelHeaderProps["accent"];
}) {
  const s = ACCENT_STYLES[accent];
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-lg font-bold", s.text)}>
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>
      )}
    </div>
  );
}
