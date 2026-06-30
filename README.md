# AA2P Protocol Explorer v1.0

> **Web4.0 Avatar-to-Avatar Payments Protocol (AA2P) v1.0** — Interactive explorer & simulation console
> 
> Mirrors RFC 001 core contracts as TypeScript, with a cyberpunk-themed dashboard for exploring the protocol's 7 core modules.

[![Protocol](https://img.shields.io/badge/Protocol-AP2%20v1.0-emerald)]()
[![Status](https://img.shields.io/badge/RFC-PROPOSED%20STANDARD-amber)]()
[![Framework](https://img.shields.io/badge/Next.js-16-black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)]()
[![Tests](https://img.shields.io/badge/Test%20Vectors-10%2F10%20PASS-emerald)]()

---

## 🌌 Overview

AA2P (Avatar-to-Avatar Payments Protocol) is the **Web4.0 native payment & cognitive settlement standard** for multi-dimensional Avatar economies. Unlike Web3's HTTP payment patches (x402) built for stateless Agents, AP2 is built for **Avatars — digital lifeforms with cognitive ownership, emotion baselines, and memory shards**.

This explorer is an interactive implementation of [RFC 001: AP2 v1.0](./upload/RFC%20v1.0%20%26AP2%20%E5%8D%8F%E8%AE%AE.md), letting you:

- 🔬 **Simulate** all 7 core contracts (AP2Escrow, BudgetFence, TDPO, CIP, CDS SBT, CognitiveDAG+CPDF, PCMG)
- 🧪 **Run** 10 RFC test vectors (all passing)
- 📊 **Visualize** the 4-layer protocol stack & PoUE/PoRC consensus
- 📜 **Read** the full RFC with 7 rendered Mermaid sequence diagrams
- ⚡ **Interact** with live demos (streaming payments, consciousness migration, phygital gateway, etc.)

## 🏛️ Three Constitutional Pillars

| Pillar | Mechanism | RFC |
|--------|-----------|-----|
| **认知主权 Cognitive Sovereignty** | PoUE + CIP + CDS SBT — break the private-key curse, consciousness inherits across death/migration | §1, §5.2 |
| **反平庸暴政 Anti-Mediocrity** | TDPO + CPDF — time-delayed pricing protects & rewards minority超前认知, prevents cognitive money-laundering | §5.1 |
| **虚实同构 Phygital Isomorphism** | PCMG — digital will becomes physical absolute law via multimodal proof + ECE resonance | §5.3 |

## 🧩 Modules

| Module | RFC | Description |
|--------|-----|-------------|
| **AP2Escrow + BudgetFence** | §1, §5.1 | Streaming payment, Scope Lock, Decaying Auth, MCP verify-and-settle with clawback |
| **TDPO** | §5.1 | CognitiveTimeLock, retroactive compensation, mediocrity tax pool |
| **CIP + CDS** | §5.2 | Consciousness inheritance, cross-dimensional soulbound tokens, lineage split |
| **CognitiveDAG + CPDF** | §5.1 | Cognitive lineage tracking, purity decay, anti money-laundering |
| **PCMG** | §5.3 | Phygital cross-membrane gateway, multimodal physics proof, ECE validation, slashing |

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM + SQLite (local) / PostgreSQL (production)
- **State**: Zustand + TanStack Query
- **Diagrams**: Mermaid 11
- **Animation**: Framer Motion
- **Theme**: Cyberpunk dark (emerald/cyan/violet/amber/rose — NO blue/indigo)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ / Bun
- A SQLite or PostgreSQL database

### Installation

```bash
# Clone
git clone https://github.com/panaifun777-lab/AP2-Protocol-Explorer-v1.0.git
cd AP2-Protocol-Explorer-v1.0

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env to set your DATABASE_URL

# Setup database
bun run db:push

# Seed demo data (8 avatars, budget fences, mediocrity pool)
curl -X POST http://localhost:3000/api/seed

# Start dev server
bun run dev
```

Visit `http://localhost:3000` — the app auto-seeds on first load.

### Production Build

```bash
bun run build
bun run start
```

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main page (8-tab nav + sticky footer)
│   ├── layout.tsx            # Theme + Toaster
│   └── api/                  # 25+ API routes across 6 modules
│       ├── seed/             # Demo data seeding
│       ├── escrow/           # AP2Escrow + BudgetFence (5 endpoints)
│       ├── tdpo/             # Time-Delayed Pricing Oracle (4 endpoints)
│       ├── cip/              # Consciousness Inheritance + CDS SBT (4 endpoints)
│       ├── dag/              # CognitiveDAG + CPDF (6 endpoints)
│       ├── pcmg/             # Phygital Gateway (3 endpoints)
│       └── tests/            # Test vector runner (2 endpoints)
├── lib/
│   ├── types.ts              # Shared types + BigInt serialization + RFC constants
│   ├── modules.ts            # Module config
│   └── contracts/            # 7 contract logic mirrors (pure TS)
│       ├── escrow.ts         # AP2Escrow.sol + BudgetFence
│       ├── tdpo.ts           # CognitiveTimeLock.sol
│       ├── cip.ts            # CIPRegistry.sol + CIP_Lineage.sol
│       ├── cds.ts            # CDSSBT.sol
│       ├── cognitive-dag.ts  # CognitiveDAG_Oracle.sol + CPDF
│       └── pcmg.ts           # PhygitalGateway.sol
└── components/
    ├── mermaid.tsx           # Mermaid SVG renderer
    ├── code-block.tsx        # Syntax highlighter
    └── modules/              # 8 interactive panels
```

## 🧪 Test Vectors

All 10 RFC test vectors pass deterministically (pure contract logic, no DB state):

| ID | Test | Module | Result |
|----|------|--------|--------|
| TV1 | Scope_Lock_Violation | escrow | ✅ REJECT_SCOPE |
| TV2 | Stream_Overpayment_Clawback | escrow | ✅ Disputed + clawback |
| TV3 | CIP_Migration_Threshold (3 scenarios) | cip | ✅ PURE/FUSION/REJECT |
| TV4 | CDS_SBT_Soulbound_Enforcement (2 scenarios) | cds | ✅ revert/soulTransfer |
| TV5 | TDPO_Not_Contrarian | tdpo | ✅ lock rejected |
| TV6 | TDPO_Retroactive_Trigger | tdpo | ✅ triggered, factor=59 |
| TV7 | PCMG_Forged_Proof | pcmg | ✅ 400 fidelity<8000 |
| TV8 | PCMG_Emotional_Dissonance | pcmg | ✅ Slashed |
| TV9 | CPDF_Black_Hole | dag | ✅ weight=0 |
| TV10 | Cognitive_Money_Laundering | dag | ✅ suspicious=true |

Run them in the **Tests** tab → "Run All Vectors".

## 🔢 Key Constants (RFC)

```typescript
RFC_CONSTANTS = {
  CIP_PURE_THRESHOLD: 8500,      // 85% — pure inheritance
  CIP_MIN_THRESHOLD: 6000,       // 60% — fusion emergence / hijack reject
  PCMG_FIDELITY_THRESHOLD: 8000, // 80% — physical proof validity
  PCMG_RESONANCE_THRESHOLD: 7500,// 75% — emotional resonance
  CPDF_SIMILARITY_FLOOR: 3000,   // 30% — below = weight black hole
  CPDF_LAMBDA: 2,                // decay coefficient
  TDPO_VARIANCE_THRESHOLD: 500,
  TDPO_MEAN_THRESHOLD: 30,
  TDPO_EVOLUTION_FACTOR_TRIGGER: 5,
  TDPO_CITATIONS_TRIGGER: 100,
}
```

## 📜 License

MIT — Built for the Web4.0 revolution.

## 🙏 Acknowledgments

- **RFC Author**: 飘叔 (Piaoshu) — Web4.0革命理论奠基人, AFC公链创始人
- **RFC Date**: 2026.06.18
- **Protocol Status**: PROPOSED STANDARD

---

> *"Agent 是工具,是手脚;Avatar 是灵魂,是意识分片,是拥有认知所有权和情绪波动的数字实体。"*
> 
> *"没有 AP2,再多分身也是孤魂野鬼。现在,我们要给它们注入灵魂,并赋予它们改变物理世界的力量。"*
> 
> —— 飘叔, 2026.06.18
