"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  BookOpen,
  GitBranch,
  Code2,
  FlaskConical,
  ChevronRight,
  Maximize2,
  Eye,
  EyeOff,
  ExternalLink,
  Calendar,
  User,
  Layers,
  Hash,
} from "lucide-react";

import { PanelHeader } from "./panel-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Mermaid } from "@/components/mermaid";
import { CodeBlock } from "@/components/code-block";
import {
  RFC_META,
  RFC_SECTIONS,
  RFC_MERMAID_DIAGRAMS,
  RFC_CONTRACTS,
  RFC_TEST_VECTORS,
  buildRfcPlainText,
  type RfcMermaidDiagram,
} from "@/lib/rfc-data";
import { useT, useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ---------- Markdown-ish content renderer (handles RFC section content) ----------
function MarkdownIsh({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let inCode = false;

  const flushList = (key: string) => {
    if (listBuffer.length > 0) {
      blocks.push(
        <ul key={key} className="my-2 ml-5 list-disc space-y-1">
          {listBuffer.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      listBuffer = [];
    }
  };

  const flushCode = (key: string) => {
    if (codeBuffer.length > 0) {
      blocks.push(
        <pre
          key={key}
          className="my-2 overflow-x-auto rounded-md border border-emerald-500/20 bg-[#0a0e14]/60 p-3 font-mono text-xs text-emerald-200"
        >
          <code>{codeBuffer.join("\n")}</code>
        </pre>,
      );
      codeBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        flushCode(`code-${i}`);
        inCode = false;
      } else {
        flushList(`list-${i}`);
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushList(`list-${i}`);
      blocks.push(
        <h4
          key={`h4-${i}`}
          className="mt-5 mb-1.5 font-mono text-sm font-semibold text-cyan-400"
        >
          {trimmed.slice(4)}
        </h4>,
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(`list-${i}`);
      blocks.push(
        <h3
          key={`h3-${i}`}
          className="mt-5 mb-1.5 font-mono text-base font-semibold text-emerald-400"
        >
          {trimmed.slice(3)}
        </h3>,
      );
    } else if (trimmed.startsWith("> ")) {
      flushList(`list-${i}`);
      // group consecutive blockquote lines
      const quoteLines: string[] = [trimmed.slice(2)];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("> ")) {
        i++;
        quoteLines.push(lines[i].trim().slice(2));
      }
      blocks.push(
        <blockquote
          key={`bq-${i}`}
          className="my-3 border-l-2 border-emerald-500/40 bg-emerald-500/5 px-4 py-2 text-sm italic leading-relaxed text-emerald-100/90"
        >
          {quoteLines.map((q, qi) => (
            <p key={qi} className={qi > 0 ? "mt-2" : ""}>
              {renderInline(q)}
            </p>
          ))}
        </blockquote>,
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listBuffer.push(trimmed.slice(2));
    } else if (trimmed === "") {
      flushList(`list-${i}`);
    } else {
      flushList(`list-${i}`);
      blocks.push(
        <p
          key={`p-${i}`}
          className="my-2 text-sm leading-relaxed text-foreground/90"
        >
          {renderInline(trimmed)}
        </p>,
      );
    }
  }
  flushList("list-end");
  flushCode("code-end");

  return <div className="space-y-0">{blocks}</div>;
}

// Render inline markdown: **bold**, `code`, _italic_
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Combined regex: **bold**, `code`, _italic_
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g;
  const parts = text.split(regex);
  parts.forEach((p, idx) => {
    if (!p) return;
    if (p.startsWith("**") && p.endsWith("**")) {
      nodes.push(
        <strong key={idx} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>,
      );
    } else if (p.startsWith("`") && p.endsWith("`")) {
      nodes.push(
        <code
          key={idx}
          className="mx-0.5 rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-300"
        >
          {p.slice(1, -1)}
        </code>,
      );
    } else if (p.startsWith("_") && p.endsWith("_")) {
      nodes.push(
        <em key={idx} className="italic">
          {p.slice(1, -1)}
        </em>,
      );
    } else {
      nodes.push(<span key={idx}>{p}</span>);
    }
  });
  return nodes;
}

// ---------- Sequence Diagram Card ----------
function DiagramCard({ diagram, index }: { diagram: RfcMermaidDiagram; index: number }) {
  const t = useT();
  const [showSource, setShowSource] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
      >
        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 font-mono text-sm">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400"
                  >
                    #{index + 1}
                  </Badge>
                  <span className="text-foreground">{diagram.title}</span>
                </CardTitle>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {diagram.description}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSource((v) => !v)}
                  className="h-7 border-border/60 px-2 text-[10px] font-mono"
                >
                  {showSource ? (
                    <>
                      <EyeOff className="mr-1 h-3 w-3" />
                      {t("rfc.hide")}
                    </>
                  ) : (
                    <>
                      <Eye className="mr-1 h-3 w-3" />
                      {t("rfc.source")}
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFullscreen(true)}
                  className="h-7 border-border/60 px-2 text-[10px] font-mono"
                >
                  <Maximize2 className="mr-1 h-3 w-3" />
                  {t("rfc.full")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto rounded-md border border-emerald-500/15 bg-[#0a0e14]/40 p-3">
              <Mermaid code={diagram.code} id={diagram.id} />
            </div>
            {showSource && (
              <div className="mt-3">
                <CodeBlock
                  code={diagram.code}
                  language="mermaid"
                  showLineNumbers={false}
                  maxHeight="320px"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-6xl overflow-hidden bg-background/95 p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-sm">
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400"
              >
                #{index + 1}
              </Badge>
              {diagram.title}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {diagram.description}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto rounded-md border border-emerald-500/15 bg-[#0a0e14]/40 p-4">
            <Mermaid code={diagram.code} id={`${diagram.id}-fs`} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- Document tab (sidebar TOC + main content) ----------
function DocumentTab() {
  const t = useT();
  const [activeId, setActiveId] = React.useState(RFC_SECTIONS[0].id);

  const handleNav = (anchor: string) => {
    setActiveId(anchor);
    const el = document.getElementById(`rfc-sec-${anchor}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
      {/* Sidebar TOC */}
      <aside className="lg:sticky lg:top-2 lg:self-start">
        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              {t("rfc.sections")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <nav className="space-y-0.5">
              {RFC_SECTIONS.map((s, idx) => {
                const isActive = activeId === s.anchor;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleNav(s.anchor)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left font-mono text-[11px] transition-colors",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    <span className="text-[9px] opacity-50">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1 truncate">{s.title}</span>
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 shrink-0 transition-transform",
                        isActive ? "translate-x-0 text-emerald-400" : "-translate-x-1 opacity-0",
                      )}
                    />
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>
      </aside>

      {/* Main content */}
      <div className="min-w-0 space-y-4">
        <Card className="border-border/60 bg-card/50">
          <CardContent className="pt-6">
            <article className="space-y-1">
              {RFC_SECTIONS.map((s) => (
                <section
                  key={s.id}
                  id={`rfc-sec-${s.anchor}`}
                  className="scroll-mt-4"
                >
                  <h2 className="mb-3 border-l-2 border-emerald-500/40 pl-3 font-mono text-base font-bold text-foreground">
                    {s.title}
                  </h2>
                  <MarkdownIsh text={s.content} />
                  <Separator className="my-5 bg-border/40" />
                </section>
              ))}
            </article>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- Diagrams tab ----------
function DiagramsTab() {
  const t = useT();
  // Hint contains [[Source]] and [[Full]] markers around the words to highlight.
  const hint = t("rfc.diagramsHint").replace("{n}", String(RFC_MERMAID_DIAGRAMS.length));
  const parts = React.useMemo(() => {
    const segments = hint.split(/\[\[|\]\]/g);
    // segments alternate: text, highlight, text, highlight, text...
    return segments.map((seg, i) =>
      i % 2 === 1 ? (
        <span key={i} className="font-mono text-emerald-300">
          {seg}
        </span>
      ) : (
        <React.Fragment key={i}>{seg}</React.Fragment>
      ),
    );
  }, [hint]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/40">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
            <span>{parts}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {RFC_MERMAID_DIAGRAMS.map((d, i) => (
          <DiagramCard key={d.id} diagram={d} index={i} />
        ))}
      </div>
    </div>
  );
}

// ---------- Contracts & Test Vectors tab ----------
function ContractsTab() {
  const t = useT();
  const contractsHint = t("rfc.contractsHint")
    .replace("{n}", String(RFC_CONTRACTS.length))
    .replace("{m}", String(RFC_TEST_VECTORS.length));

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/40">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Code2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>{contractsHint}</span>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={[RFC_CONTRACTS[0].id]} className="space-y-2">
        {RFC_CONTRACTS.map((c) => (
          <AccordionItem
            key={c.id}
            value={c.id}
            className="overflow-hidden rounded-md border border-border/60 bg-card/40 px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full items-center gap-2 pr-2">
                <Badge
                  variant="outline"
                  className="border-cyan-500/30 bg-cyan-500/10 text-[9px] uppercase text-cyan-300"
                >
                  {c.language}
                </Badge>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {c.name}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                {c.description}
              </p>
              <CodeBlock
                code={c.code}
                language={c.language === "solidity" ? "solidity" : c.language}
                maxHeight="560px"
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <FlaskConical className="h-4 w-4 text-amber-400" />
            {t("rfc.testVectorsTitle")}
            <Badge
              variant="outline"
              className="ml-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-300"
            >
              {t("rfc.vectorsCount").replace("{n}", String(RFC_TEST_VECTORS.length))}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {RFC_TEST_VECTORS.map((tv) => (
            <div key={tv.id} className="rounded-md border border-amber-500/20 bg-amber-500/[0.03] p-3">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <h4 className="font-mono text-xs font-semibold text-amber-300">
                  {tv.title}
                </h4>
              </div>
              <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                {tv.description}
              </p>
              <CodeBlock
                code={tv.json}
                language="json"
                showLineNumbers={false}
                maxHeight="420px"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Main panel ----------
export function RfcPanel() {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const handleDownload = React.useCallback(() => {
    const text = buildRfcPlainText();
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "RFC-001-AA2P-v1.0.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div>
      <PanelHeader
        icon={FileText}
        title={t("rfc.title")}
        rfcSection="RFC Full"
        description={t("rfc.description")}
        accent="emerald"
        actions={
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {t("rfc.downloadRfc")}
          </Button>
        }
      />

      {/* RFC Meta card */}
      <Card className="mb-4 border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] to-cyan-500/[0.04]">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="border-emerald-500/40 bg-emerald-500/15 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                  {RFC_META.status}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-cyan-500/30 bg-cyan-500/10 text-[10px] font-mono text-cyan-300"
                >
                  RFC 001
                </Badge>
              </div>
              <h3 className="font-mono text-lg font-bold tracking-tight text-foreground">
                {RFC_META.title}
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-mono">{RFC_META.author}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-mono">{RFC_META.date}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-mono">
                    {t("rfc.depsLabel")}: {RFC_META.dependencies.join(" · ")}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <a
                href="/api/seed"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded border border-border/60 px-2 py-1 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
              >
                <ExternalLink className="h-3 w-3" />
                {t("rfc.seedDb")}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="document" className="w-full">
        <TabsList className="h-auto flex-wrap gap-0.5">
          <TabsTrigger value="document" className="gap-1.5 py-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="text-xs">{t("rfc.tabDocument")}</span>
            <Badge
              variant="outline"
              className="ml-1 border-border/60 px-1 py-0 text-[9px] text-muted-foreground"
            >
              {RFC_SECTIONS.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="diagrams" className="gap-1.5 py-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            <span className="text-xs">{t("rfc.tabDiagrams")}</span>
            <Badge
              variant="outline"
              className="ml-1 border-border/60 px-1 py-0 text-[9px] text-muted-foreground"
            >
              {RFC_MERMAID_DIAGRAMS.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5 py-1.5">
            <Code2 className="h-3.5 w-3.5" />
            <span className="text-xs">{t("rfc.tabContracts")}</span>
            <Badge
              variant="outline"
              className="ml-1 border-border/60 px-1 py-0 text-[9px] text-muted-foreground"
            >
              {RFC_CONTRACTS.length + RFC_TEST_VECTORS.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="document" className="mt-4">
          <DocumentTab />
        </TabsContent>
        <TabsContent value="diagrams" className="mt-4">
          <DiagramsTab />
        </TabsContent>
        <TabsContent value="contracts" className="mt-4">
          <ContractsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
