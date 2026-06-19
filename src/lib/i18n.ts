"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lang = "zh" | "en";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

export const useLang = create<LangState>()(
  persist(
    (set) => ({
      lang: "zh",
      setLang: (lang) => set({ lang }),
      toggle: () => set((s) => ({ lang: s.lang === "zh" ? "en" : "zh" })),
    }),
    { name: "ap2-lang" },
  ),
);

// Helper hook for getting a translation function bound to current language.
// Usage:  const t = useT();  t("nav.overview")
import * as React from "react";
import { dict, type DictPath } from "./translations";

export function useT() {
  const lang = useLang((s) => s.lang);
  return React.useCallback(
    (path: DictPath): string => {
      const parts = path.split(".");
      let cur: unknown = dict[lang];
      for (const p of parts) {
        if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[p];
        } else {
          // Fallback to English, then to the path itself.
          cur = path;
          break;
        }
      }
      return typeof cur === "string" ? cur : path;
    },
    [lang],
  );
}
