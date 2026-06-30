import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const siteUrl = "https://aa2p.xyz";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "AA2P Protocol Explorer | Avatar-to-Avatar Payments Protocol v1.0",
  description:
    "Web4.0 Avatar-to-Avatar Payments Protocol (AA2P) v1.0 — Interactive explorer & simulation console. Not just cloning your digital shell, but extending your scarce soul. Mirrors RFC v1.0 core contracts: AP2Escrow, BudgetFence, TDPO, CIP, CDS SBT, CognitiveDAG+CPDF, PCMG. Bilingual (中文/English).",
  keywords: [
    "AA2P",
    "Avatar-to-Avatar Payments Protocol",
    "Web4.0",
    "AFC Chain",
    "PoUE",
    "PoRC",
    "TDPO",
    "CIP",
    "CDS SBT",
    "PCMG",
    "Cognitive DAG",
    "M-Pata",
    "scarce soul",
    "Base Sepolia",
    "sAFC",
    "BudgetFence",
    "AP2Escrow",
  ],
  authors: [{ name: "AA2P Protocol Explorer" }],
  creator: "piaoshu.eth",
  publisher: "AA2P Protocol",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "AA2P Protocol Explorer | Avatar-to-Avatar Payments Protocol v1.0",
    description:
      "Not just cloning your digital shell, but extending your scarce soul. AA2P simulation and Base Sepolia control console for BudgetFence, AP2Escrow, ShadowAFC, and TDPO_Pool.",
    siteName: "AA2P Protocol Explorer",
    locale: "zh_CN",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary",
    title: "AA2P Protocol Explorer | Avatar-to-Avatar Payments Protocol v1.0",
    description:
      "Web4.0 Avatar-to-Avatar payment, escrow, and TDPO control console. Turn intelligence into Tokens, let scarce capabilities be your moat.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "AA2P Protocol Explorer",
      url: siteUrl,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description:
        "Web4.0 Avatar-to-Avatar Payments Protocol explorer with simulation mode and Base Sepolia transaction mode. Not just cloning your digital shell, but extending your scarce soul.",
      featureList: [
        "BudgetFence policy configuration",
        "AP2Escrow task creation",
        "Streaming withdrawal",
        "Quality settlement",
        "TDPO lock, factor injection, veto, and claim",
        "Chain status readback",
        "Scarce Soul concept (6 human capabilities)",
      ],
      creator: {
        "@type": "Person",
        name: "piaoshu.eth",
      },
    },
    {
      "@type": "SoftwareSourceCode",
      name: "AA2P Base MVP Contracts",
      codeRepository: "https://github.com/piaoshuweb3/ap2-mvp-base",
      programmingLanguage: "Solidity",
      runtimePlatform: "Base Sepolia",
    },
    {
      "@type": "SoftwareSourceCode",
      name: "AA2P Protocol Explorer v1.0",
      codeRepository: "https://github.com/panaifun777-lab/AP2-Protocol-Explorer-v1.0",
      programmingLanguage: "TypeScript",
      runtimePlatform: "Next.js",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ThemeProvider>
          {children}
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
