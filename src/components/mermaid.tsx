"use client";

import { useEffect, useId, useState } from "react";

// ============================================================
// Mermaid renderer (client-only, dynamic import)
// Renders RFC sequence diagrams. Falls back to <pre> on error.
// ============================================================

// Module-level monotonic counter guarantees a globally unique id
// for every render call — even across unmount/remount cycles —
// which prevents Mermaid's internal DOM-id cache from clashing.
let GLOBAL_MERMAID_COUNTER = 0;

export interface MermaidProps {
  /** The raw mermaid code (e.g. "sequenceDiagram\n  ...") */
  code: string;
  /** Optional explicit id (otherwise derived from React's useId) */
  id?: string;
  className?: string;
}

// Cyberpunk dark theme variables (emerald / cyan / violet / amber / rose — NO blue/indigo)
const MERMAID_THEME_VARS: Record<string, string> = {
  background: "#0a0e14",
  primaryColor: "#064e3b",
  primaryTextColor: "#d1fae5",
  primaryBorderColor: "#10b981",
  lineColor: "#22d3ee",
  secondaryColor: "#1e293b",
  tertiaryColor: "#0f172a",
  fontSize: "14px",
  // sequence-diagram specifics
  actorBkg: "#064e3b",
  actorBorder: "#10b981",
  actorTextColor: "#d1fae5",
  actorLineColor: "#22d3ee",
  signalColor: "#22d3ee",
  signalTextColor: "#ecfeff",
  labelBoxBkgColor: "#1e293b",
  labelBoxBorderColor: "#10b981",
  labelTextColor: "#d1fae5",
  loopTextColor: "#d1fae5",
  noteBorderColor: "#a855f7",
  noteBkgColor: "#3b0764",
  noteTextColor: "#f3e8ff",
  activationBorderColor: "#a855f7",
  activationBkgColor: "#3b0764",
  // sequence numbers
  sequenceNumberColor: "#0a0e14",
};

interface MermaidModule {
  initialize: (config: unknown) => void;
  render: (
    id: string,
    text: string,
  ) => Promise<{ svg: string }>;
}

export function Mermaid({ code, id, className }: MermaidProps) {
  const reactId = useId();
  const baseId = (id ?? reactId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    GLOBAL_MERMAID_COUNTER += 1;
    const renderId = `mmd-${baseId}-${GLOBAL_MERMAID_COUNTER}`;

    (async () => {
      try {
        const mermaidMod = (await import("mermaid")) as unknown as {
          default: MermaidModule;
        };
        const mermaid = mermaidMod.default ?? (mermaidMod as unknown as MermaidModule);
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: MERMAID_THEME_VARS,
          securityLevel: "loose",
          sequence: {
            diagramMarginX: 24,
            diagramMarginY: 24,
            actorMargin: 80,
            boxMargin: 12,
            messageMargin: 40,
            mirrorActors: true,
            useMaxWidth: false,
          },
          flowchart: { useMaxWidth: false, htmlLabels: true },
        });
        const result = await mermaid.render(renderId, code);
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          setSvg(null);
          setLoading(false);
        }
      } finally {
        // Mermaid sometimes leaves an orphan <div id="d{renderId}"> in body
        // when the render throws; sweep it up so the next render doesn't clash.
        try {
          const orphan = document.getElementById(`d${renderId}`);
          if (orphan && orphan.parentNode) {
            orphan.parentNode.removeChild(orphan);
          }
          const orphanAlt = document.getElementById(renderId);
          if (orphanAlt && orphanAlt.parentNode) {
            orphanAlt.parentNode.removeChild(orphanAlt);
          }
        } catch {
          // ignore DOM cleanup errors
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, baseId]);

  if (loading && svg === null && error === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-xs font-mono text-muted-foreground">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
        <span>Rendering Mermaid diagram…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-rose-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
          Render failed — showing raw source
        </div>
        <pre className="overflow-x-auto rounded-md border border-rose-500/30 bg-rose-950/10 p-3 font-mono text-xs leading-relaxed text-rose-200 whitespace-pre">
          {code}
        </pre>
        <details className="mt-2 text-[10px] text-muted-foreground">
          <summary className="cursor-pointer font-mono">error details</summary>
          <pre className="mt-1 whitespace-pre-wrap font-mono">{error}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      className={
        className ??
        "mermaid-render w-full overflow-x-auto rounded-md border border-emerald-500/15 bg-[#0a0e14]/40 p-2"
      }
      dangerouslySetInnerHTML={{ __html: svg ?? "" }}
    />
  );
}
