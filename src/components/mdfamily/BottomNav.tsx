"use client";

import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LayoutGrid, Clock, Map, MoreHorizontal, Pause, Play } from "lucide-react";
import type { TabKey } from "@/lib/types";

const TABS: { key: TabKey; icon: typeof LayoutGrid; labelKey: "tabOverview" | "tabRules" | "tabMap" | "tabMore" }[] = [
  { key: "overview", icon: LayoutGrid, labelKey: "tabOverview" },
  { key: "rules", icon: Clock, labelKey: "tabRules" },
  { key: "map", icon: Map, labelKey: "tabMap" },
  { key: "more", icon: MoreHorizontal, labelKey: "tabMore" },
];

export function BottomNav() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const lang = useStore((s) => s.lang);
  const pauseActive = useStore((s) => s.family.familyPauseActive);
  const togglePause = useStore((s) => s.toggleFamilyPause);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border safe-nav">
      <div className="max-w-2xl mx-auto px-2 py-2 flex items-center justify-around relative">
        {TABS.slice(0, 2).map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 sm:px-4 py-1.5 rounded-lg min-w-[52px] sm:min-w-[64px] transition-colors",
                active ? "text-trust" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t(tb.labelKey, lang)}</span>
            </button>
          );
        })}

        {/* Center Family Pause action */}
        <button
          onClick={togglePause}
          aria-label={pauseActive ? t("resumeInternet", lang) : t("pauseInternet", lang)}
          className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-lg -mt-5 sm:-mt-6 transition-all active:scale-95",
            pauseActive ? "bg-coral" : "bg-trust",
          )}
        >
          {pauseActive ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>

        {TABS.slice(2).map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 sm:px-4 py-1.5 rounded-lg min-w-[52px] sm:min-w-[64px] transition-colors",
                active ? "text-trust" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t(tb.labelKey, lang)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
