"use client";

import * as React from "react";
import { Languages, Check } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs gap-1.5 h-8 px-2"
          title="Toggle language"
        >
          <Languages className="h-3.5 w-3.5" />
          {compact ? (
            <span className="uppercase">{lang}</span>
          ) : (
            <span className="uppercase">{lang === "zh" ? "中" : "EN"}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem
          onClick={() => setLang("zh")}
          className={cn(
            "font-mono text-xs cursor-pointer justify-between",
            lang === "zh" && "bg-primary/10 text-primary",
          )}
        >
          中文
          {lang === "zh" && <Check className="h-3 w-3" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLang("en")}
          className={cn(
            "font-mono text-xs cursor-pointer justify-between",
            lang === "en" && "bg-primary/10 text-primary",
          )}
        >
          English
          {lang === "en" && <Check className="h-3 w-3" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
