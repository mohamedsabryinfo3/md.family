"use client";

import { useState } from "react";
import { Search, Plus, Settings, Store, Palette, Globe, Shield } from "lucide-react";
import { useStore, useSelectedChildApps } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AppPolicyMode, InstalledApp } from "@/lib/types";

const CATEGORY_LABEL: Record<InstalledApp["category"], { ar: string; en: string }> = {
  communication: { ar: "تواصل", en: "Comm" },
  social: { ar: "اجتماعي", en: "Social" },
  games: { ar: "ألعاب", en: "Games" },
  education: { ar: "تعليم", en: "Edu" },
  entertainment: { ar: "ترفيه", en: "Ent" },
  tools: { ar: "أدوات", en: "Tools" },
  browser: { ar: "متصفح", en: "Browser" },
  shopping: { ar: "تسوق", en: "Shop" },
  system: { ar: "نظام", en: "System" },
};

const SYSTEM_TOOLS = [
  { key: "settings", ar: "الإعدادات", en: "Settings", icon: Settings, status: "allowed" as const },
  { key: "themes", ar: "الثيمات والخلفيات", en: "Themes & wallpapers", icon: Palette, status: "restricted" as const },
  { key: "stores", ar: "متاجر التطبيقات", en: "App stores", icon: Store, status: "blocked" as const },
  { key: "browsers", ar: "المتصفحات", en: "Browsers", icon: Globe, status: "restricted" as const },
];

export function AppPoliciesScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const apps = useSelectedChildApps();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | AppPolicyMode>("all");

  const filtered = apps.filter((a) => {
    if (filter !== "all" && a.policy !== filter) return false;
    if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen pb-24">
      <Header
        title={t("appPolicies", lang)}
        onBack={() => go("childProfile")}
      />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "ar" ? "ابحث عن تطبيق..." : "Search apps..."}
            className="ps-9 h-11"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto mdf-scroll -mx-1 px-1 pb-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            {lang === "ar" ? "الكل" : "All"}
          </FilterChip>
          <FilterChip active={filter === "always_allowed"} onClick={() => setFilter("always_allowed")}>
            {t("alwaysAllowed", lang)}
          </FilterChip>
          <FilterChip active={filter === "daily_limit"} onClick={() => setFilter("daily_limit")}>
            {t("dailyTimeLimit", lang)}
          </FilterChip>
          <FilterChip active={filter === "blocked"} onClick={() => setFilter("blocked")}>
            {t("blocked", lang)}
          </FilterChip>
        </div>

        {/* Apps list */}
        <div>
          <SectionTitle title={`${t("installedApps", lang)} (${filtered.length})`} />
          <div className="space-y-2">
            {filtered.map((app) => (
              <AppPolicyRow key={app.id} app={app} lang={lang} />
            ))}
          </div>
        </div>

        {/* System tools */}
        <div>
          <SectionTitle title={t("systemTools", lang)} />
          <Card className="!p-0 overflow-hidden">
            {SYSTEM_TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              const status = tool.status;
              const cfg = {
                allowed: { cls: "bg-emerald/15 text-emerald", label: t("allowed", lang) },
                restricted: { cls: "bg-amber/15 text-amber", label: t("restricted", lang) },
                blocked: { cls: "bg-coral/15 text-coral", label: t("blocked", lang) },
                not_supported: { cls: "bg-slate/15 text-slate", label: t("notSupported", lang) },
              }[status];
              return (
                <div key={tool.key} className={cn("flex items-center gap-3 px-4 py-3", i !== SYSTEM_TOOLS.length - 1 && "border-b border-border")}>
                  <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{lang === "ar" ? tool.ar : tool.en}</div>
                  </div>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", cfg.cls)}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </Card>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            {lang === "ar"
              ? "تنبيه: منع فتح الإعدادات أو إلغاء تثبيت التطبيق يتطلب وضع Device Admin/Owner على Android أو قيود خاصة على iOS."
              : "Note: Blocking Settings or preventing uninstall requires Device Admin/Owner mode on Android, or special restrictions on iOS."}
          </p>
        </div>
      </div>
    </div>
  );
}

function AppPolicyRow({ app, lang }: { app: InstalledApp; lang: "ar" | "en" }) {
  const [policy, setPolicy] = useState<AppPolicyMode>(app.policy);

  const cfg: Record<AppPolicyMode, { ar: string; cls: string }> = {
    always_allowed: { ar: t("alwaysAllowed", lang), cls: "bg-emerald/15 text-emerald" },
    daily_limit: { ar: t("dailyTimeLimit", lang), cls: "bg-trust/15 text-trust" },
    blocked: { ar: t("blocked", lang), cls: "bg-coral/15 text-coral" },
  };

  const usageLabel = (() => {
    if (app.todayUsageMin === 0) return lang === "ar" ? "غير مستخدم اليوم" : "Not used today";
    const h = Math.floor(app.todayUsageMin / 60);
    const m = app.todayUsageMin % 60;
    return lang === "ar" ? `${h ? `${h}س ` : ""}${m}د` : `${h ? `${h}h ` : ""}${m}m`;
  })();

  const cycle = () => {
    const next: AppPolicyMode = policy === "always_allowed" ? "daily_limit" : policy === "daily_limit" ? "blocked" : "always_allowed";
    setPolicy(next);
  };

  return (
    <Card className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
        style={{ backgroundColor: app.iconColor }}
      >
        {app.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{app.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{CATEGORY_LABEL[app.category][lang]}</span>
          <span className="ltr-nums">{usageLabel}</span>
          {policy === "daily_limit" && app.dailyLimitMin && (
            <>
              <span aria-hidden>·</span>
              <span className="ltr-nums">{lang === "ar" ? `حد: ${Math.floor(app.dailyLimitMin / 60)}س ${app.dailyLimitMin % 60}د` : `Limit: ${Math.floor(app.dailyLimitMin / 60)}h ${app.dailyLimitMin % 60}m`}</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={cycle}
        className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors", cfg[policy].cls)}
        aria-label="cycle policy"
      >
        {cfg[policy].ar}
      </button>
    </Card>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        active ? "bg-trust text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
