"use client";

import * as React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import oneDark from "react-syntax-highlighter/dist/esm/styles/prism/one-dark";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// CodeBlock — syntax-highlighted code with copy button
// Used by RFC panel for Solidity / Rust / JSON test vectors.
// ============================================================

export interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language = "text",
  showLineNumbers = true,
  maxHeight,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {
        // ignore clipboard errors silently
      });
  }, [code]);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-md border border-border/60 bg-[#0a0e14]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/40 bg-[#0a0e14]/80 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors",
            copied
              ? "text-emerald-400"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
          )}
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div
        className="overflow-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            background: "transparent",
            padding: "0.875rem 1rem",
            fontSize: "12px",
            lineHeight: 1.55,
          }}
          lineNumberStyle={{
            color: "#475569",
            fontSize: "10px",
            paddingRight: "1rem",
            userSelect: "none",
            minWidth: "2.25rem",
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
            },
          }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
