import {
  Lock,
  Clock,
  Heart,
  Link2,
  Crosshair,
  Network,
  FileText,
  FlaskConical,
  Layers,
  type LucideIcon,
} from "lucide-react";

export type ModuleId =
  | "overview"
  | "escrow"
  | "tdpo"
  | "cip"
  | "pcmg"
  | "dag"
  | "rfc"
  | "tests";

export interface ModuleConfig {
  id: ModuleId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  rfcSection: string;
  accent: string; // tailwind color name token
}

export const MODULES: ModuleConfig[] = [
  {
    id: "overview",
    label: "Protocol Overview",
    shortLabel: "Overview",
    description: "AP2 v1.0 architecture, 4-layer stack, RFC summary",
    icon: Layers,
    rfcSection: "RFC §4",
    accent: "emerald",
  },
  {
    id: "escrow",
    label: "AP2Escrow + BudgetFence",
    shortLabel: "Escrow",
    description:
      "Streaming payment, Scope Lock, Decaying Auth, MCP verify-and-settle",
    icon: Lock,
    rfcSection: "RFC §1 / §5.1",
    accent: "emerald",
  },
  {
    id: "tdpo",
    label: "TDPO Time-Delayed Pricing",
    shortLabel: "TDPO",
    description:
      "CognitiveTimeLock, retroactive compensation, mediocrity tax pool",
    icon: Clock,
    rfcSection: "RFC §5.1 (TDPO)",
    accent: "amber",
  },
  {
    id: "cip",
    label: "CIP + CDS Soulbound",
    shortLabel: "CIP/CDS",
    description:
      "Consciousness inheritance, cross-dimensional SBT, lineage split",
    icon: Heart,
    rfcSection: "RFC §5.2",
    accent: "violet",
  },
  {
    id: "dag",
    label: "CognitiveDAG + CPDF",
    shortLabel: "DAG/CPDF",
    description:
      "Cognitive lineage tracking, purity decay, anti money-laundering",
    icon: Network,
    rfcSection: "RFC §5.1 (CPDF)",
    accent: "cyan",
  },
  {
    id: "pcmg",
    label: "PCMG Phygital Gateway",
    shortLabel: "PCMG",
    description:
      "Cross-membrane gateway, multimodal physics proof, ECE validation, slashing",
    icon: Crosshair,
    rfcSection: "RFC §5.3",
    accent: "rose",
  },
  {
    id: "rfc",
    label: "RFC Document & Diagrams",
    shortLabel: "RFC",
    description: "Full RFC v1.0 text, Mermaid sequence diagrams, contracts",
    icon: FileText,
    rfcSection: "RFC Full",
    accent: "emerald",
  },
  {
    id: "tests",
    label: "Test Vectors & PoUE/PoRC",
    shortLabel: "Tests",
    description: "RFC test vectors runner, consensus layer visualization",
    icon: FlaskConical,
    rfcSection: "RFC §三 / §4.2",
    accent: "cyan",
  },
];

export const MODULE_MAP: Record<ModuleId, ModuleConfig> = MODULES.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<ModuleId, ModuleConfig>,
);
