# Task 3-a: RFC Document Viewer + Mermaid Sequence Diagrams

## Files Created / Replaced

1. **`src/lib/rfc-data.ts`** (NEW) — Structured RFC data layer:
   - `RFC_META` — title, status (PROPOSED STANDARD), author (飘叔), date (2026.06.18), dependencies (A2A, MCP, M-Pata)
   - `RFC_SECTIONS` — 8 sections covering §1 Abstract, §2 Design Philosophy, §3 Terminology, §4 Protocol Stack Architecture (4.1-4.4), §5 Core Mechanisms (5.1 CPDF, 5.2 CIP Lineage, 5.3 PCMG), §6 Implementation Roadmap, §7 Security Considerations, Author's Note
   - `RFC_MERMAID_DIAGRAMS` — 7 sequence diagrams with exact code copied verbatim from RFC (Avatar Leasing, Hive-Mind Crowdfunding, TDPO Cross-period Salvation, Consciousness Migration, Lineage Split, State Migration Bridge, Phygital Cross-Membrane)
   - `RFC_CONTRACTS` — 7 Solidity contracts: AP2Escrow.sol, CognitiveTimeLock.sol, CIPRegistry.sol, CDSSBT.sol, CIP_Lineage.sol, CognitiveDAG_Oracle.sol (logic), PhygitalGateway.sol
   - `RFC_TEST_VECTORS` — 4 JSON test vectors (Scope_Lock_Violation, Stream_Overpayment_Clawback, CIP_Migration_Threshold_Variance, CDS_SBT_Soulbound_Enforcement)
   - `buildRfcPlainText()` helper for Download RFC button

2. **`src/components/mermaid.tsx`** (NEW) — Client-only Mermaid renderer:
   - `"use client"` + `import { useEffect, useId, useState } from "react"` (named imports — NOT `React.useEffect` which fails at runtime)
   - Dynamic `await import("mermaid")` inside `useEffect` (avoids SSR)
   - Cyberpunk dark theme variables (emerald/cyan/violet, NO blue/indigo)
   - Module-level monotonic counter for globally unique render IDs
   - `dangerouslySetInnerHTML` with the rendered SVG
   - Graceful error fallback: shows raw code in `<pre>` + collapsible error details
   - DOM cleanup pass to remove orphan `<div id="d{renderId}">` Mermaid sometimes leaves behind on render errors

3. **`src/components/code-block.tsx`** (NEW) — Syntax-highlighted code with copy button:
   - Uses `react-syntax-highlighter` `Prism` with `oneDark` theme (already installed)
   - Languages: solidity, rust, json, mermaid (text fallback)
   - Copy-to-clipboard button with checkmark feedback
   - Max-height with overflow scroll
   - `@types/react-syntax-highlighter` installed as devDependency

4. **`src/components/modules/rfc-panel.tsx`** (REPLACED stub) — Full panel:
   - `PanelHeader` icon=FileText, accent=emerald, rfcSection="RFC Full"
   - RFC meta card at top (gradient emerald/cyan, PROPOSED badge, RFC 001 badge, author/date/deps with icons, "Seed DB" link)
   - 3 Tabs:
     - **Document** — sticky sidebar (220px) with section anchors + main content area rendering 8 sections with custom markdown-ish renderer (handles ##, ###, lists, blockquotes, `code`, **bold**); scroll-mt anchor IDs
     - **Sequence Diagrams** — grid of 7 DiagramCard components, each with title, description, Mermaid render in overflow-x-auto container, "Source" toggle (shows raw code via CodeBlock), "Full" button (opens Dialog with full-size render)
     - **Contracts & Test Vectors** — Accordion of 7 Solidity contracts (defaultExpanded: AP2Escrow.sol) + Test Vectors card with 4 JSON test vectors in amber-themed cards
   - "Download RFC" button — generates plain-text RFC via `buildRfcPlainText()` + client-side Blob download as `RFC-001-AP2-v1.0.md`
   - Framer-motion entrance animations on diagram cards
   - Only existing shadcn/ui components (Card, Button, Badge, Tabs, ScrollArea, Accordion, Separator, Dialog)

## Critical Bug Found & Fixed During Testing

**Bug**: Initial Mermaid component used `useEffect(...)` with only `import * as React from "react"`. At runtime this threw `ReferenceError: useEffect is not defined` (because the named export wasn't in scope — `React.useEffect` would have worked, but bare `useEffect` does NOT without a named import).

**Fix**: Changed to `import { useEffect, useId, useState } from "react"` and used the bare names directly. Verified via `agent-browser` that all 7 diagrams now render with 0 SVGs → 7 SVGs after the fix.

## Testing Summary (via agent-browser CLI)

- Lint: clean (`bun run lint` → EXIT 0)
- Page loads: HTTP 200, no console errors on RFC tab
- Document tab: 8 sections rendered with anchors (rfc-sec-abstract, rfc-sec-philosophy, ..., rfc-sec-author-note)
- Sequence Diagrams tab: 7/7 mermaid SVGs rendered successfully (verified `.mermaid-render svg` count = 7)
  - Diagram 1 Avatar Leasing: 1750 × 1053
  - Diagram 2 Hive-Mind: 1629 × 689
  - Diagram 3 TDPO Salvation: 1906 × 1115
  - Diagram 4 Consciousness Migration: 2029 × 1348
  - Diagram 5 Lineage Split: 1701 × 1072
  - Diagram 6 State Migration Bridge: 1500 × 712
  - Diagram 7 Phygital Cross-Membrane: 2246 × 1280
- Source toggle: works (shows raw mermaid code in CodeBlock)
- Full dialog: works (shows full-screen Mermaid render, Escape closes)
- Contracts tab: 7 accordion items + 4 JSON test vector cards all render with syntax highlighting (verified inline styles applied)
- Download RFC button: present and wired to Blob+anchor click

## Issues / Notes

- **tests-panel.tsx has a broken import** (`parseFromJson` imported from `@/lib/utils` but actually lives in `@/lib/types`). This is NOT my file per task constraints — it belongs to another agent (Task 3-b, tests module). It produces a Next.js compile error that briefly surfaces in the dev console during Fast Refresh cycles but does NOT block the page from rendering. Recommend Task 3-b fix the import path.
- The agent-browser CLI's `errors` log appears to persist across page reloads (showed the historical useEffect error even after the fix was verified working); the live page itself has 0 errors per direct `document.body.innerText` checks.
- All 7 mermaid diagrams are wide (1500-2246 px). The DiagramCard wraps them in `overflow-x-auto` so they scroll horizontally on narrow viewports; the Full dialog uses `max-h-[70vh] overflow-auto` for both axes.
- Used `@types/react-syntax-highlighter` (devDependency) since the package ships no types.
