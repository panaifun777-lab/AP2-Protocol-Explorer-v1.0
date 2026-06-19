"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Sparkles, Terminal, Zap, Activity } from "lucide-react";
import { MODULES, type ModuleId } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useT, useLang } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

// Module panels (lazy)
import { OverviewPanel } from "@/components/modules/overview-panel";
import { EscrowPanel } from "@/components/modules/escrow-panel";
import { TdpoPanel } from "@/components/modules/tdpo-panel";
import { CipPanel } from "@/components/modules/cip-panel";
import { DagPanel } from "@/components/modules/dag-panel";
import { PcmgPanel } from "@/components/modules/pcmg-panel";
import { RfcPanel } from "@/components/modules/rfc-panel";
import { TestsPanel } from "@/components/modules/tests-panel";

const PANELS: Record<ModuleId, React.ComponentType> = {
  overview: OverviewPanel,
  escrow: EscrowPanel,
  tdpo: TdpoPanel,
  cip: CipPanel,
  dag: DagPanel,
  pcmg: PcmgPanel,
  rfc: RfcPanel,
  tests: TestsPanel,
};

export default function Home() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const [active, setActive] = React.useState<ModuleId>("overview");
  const [bootstrapped, setBootstrapped] = React.useState(false);
  const [counts, setCounts] = React.useState<Record<string, number> | null>(
    null,
  );
  const { toast } = useToast();

  // Bootstrap demo data once
  const bootstrap = React.useCallback(async () => {
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setCounts(json.data);
        setBootstrapped(true);
      } else {
        toast({
          title: lang === "zh" ? "种子数据失败" : "Seed failed",
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
    }
  }, [toast, lang]);

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const refreshCounts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/seed", { method: "GET" });
      const json = await res.json();
      if (json.ok) setCounts(json.data);
    } catch {
      /* ignore */
    }
  }, []);

  const ActivePanel = PANELS[active];

  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      {/* Grid background layer — faded so it doesn't dominate, but does NOT mask content */}
      <div
        className="pointer-events-none fixed inset-0 bg-grid bg-grid-fade -z-10"
        aria-hidden="true"
      />
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 glow-primary">
                <Zap className="h-5 w-5 text-white" fill="white" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-mono text-sm font-bold tracking-tight leading-none">
                  {t("header.title")}
                </h1>
                <span className="text-[10px] text-muted-foreground font-mono leading-none mt-1">
                  {t("header.subtitle")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                >
                  <Activity className="h-3 w-3" />
                  {bootstrapped ? t("header.simActive") : t("header.booting")}
                </Badge>
                {counts && (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    {counts.avatars} {t("header.avatars")} · {counts.escrows}{" "}
                    {t("header.escrows")}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs gap-1"
                  onClick={refreshCounts}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  {t("header.refresh")}
                </Button>
              </div>
              {/* Language toggle — top right */}
              <LanguageToggle />
            </div>
          </div>
        </div>
      </header>

      {/* ============ TAB NAV ============ */}
      <nav className="sticky top-16 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-cyber py-2">
            {MODULES.map((m) => {
              const Icon = m.icon;
              const isActive = active === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActive(m.id)}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-mono transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                  title={m.description}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t(m.navKey as never)}</span>
                  {isActive && (
                    <motion.span
                      layoutId="active-tab"
                      className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ============ MAIN ============ */}
      <main className="flex-1 mx-auto max-w-[1400px] w-full px-4 md:px-6 py-6 md:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={active + lang}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <ActivePanel />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ============ STICKY FOOTER ============ */}
      <footer className="mt-auto border-t border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">●</span>
              <span>{t("footer.status")}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden md:inline">{t("footer.chain")}</span>
              <a
                href="#"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                <Github className="h-3 w-3" />
                {t("footer.github")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
