import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
  ],
  authors: [{ name: "AA2P Protocol Explorer" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
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
        <ThemeProvider>
          {children}
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
