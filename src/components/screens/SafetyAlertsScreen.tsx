"use client";

import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, Info, ShieldAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { ConfidencePill, SeverityPill } from "@/components/mdfamily/Badges";
import { EmptyState } from "@/components/mdfamily/States";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const CATEGORY_LABEL = {
  cyberbullying: { ar: "تنمر إلكتروني", en: "Cyberbullying" },
  predator: { ar: "استدراج", en: "Predator" },
  hate: { ar: "خطاب كراهية", en: "Hate speech" },
  inappropriate_content: { ar: "محتوى غير مناسب", en: "Inappropriate content" },
  privacy_risk: { ar: "خطر خصوصية", en: "Privacy risk" },
  screen_time: { ar: "وقت الشاشة", en: "Screen time" },
};

export function SafetyAlertsScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const alerts = useStore((s) => s.family.alerts);
  const reviewAlert = useStore((s) => s.reviewAlert);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");

  const locale = lang === "ar" ? ar : enUS;
  const filtered = alerts.filter((a) =>
    filter === "all" ? true : filter === "pending" ? a.status === "pending" : a.status !== "pending",
  );

  return (
    <div className="min-h-screen pb-24">
      <Header title={t("safetyAlerts", lang)} onBack={() => go("childProfile")} />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* AI advisory */}
        <Card className="bg-accent border-trust/30">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-trust shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              {t("aiAdvisoryNote", lang)}
            </p>
          </div>
        </Card>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {(["all", "pending", "reviewed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 h-9 rounded-lg text-xs font-medium transition-all",
                filter === f ? "bg-trust text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? (lang === "ar" ? "الكل" : "All") : f === "pending" ? (lang === "ar" ? "قيد المراجعة" : "Pending") : (lang === "ar" ? "تمت المراجعة" : "Reviewed")}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert className="w-8 h-8" />}
            title={lang === "ar" ? "لا توجد تنبيهات" : "No alerts"}
            description={lang === "ar" ? "ستظهر هنا تنبيهات السلامة عند اكتشافها." : "Safety alerts will appear here when detected."}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const childName = useStore.getState().family.children.find((c) => c.id === a.childId)?.name ?? "";
              return (
                <Card key={a.id}>
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      a.severity === "high" || a.severity === "critical"
                        ? "bg-coral/15 text-coral"
                        : a.severity === "medium"
                        ? "bg-amber/15 text-amber"
                        : "bg-emerald/15 text-emerald")}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityPill severity={a.severity} />
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABEL[a.category][lang]} · {childName}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-2 leading-relaxed">{lang === "ar" ? a.reasonAr : a.reasonEn}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{t("source", lang)}: {a.source}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{format(new Date(a.capturedAt), "d MMM · HH:mm", { locale })}</span>
                        <span aria-hidden>·</span>
                        <span className="flex items-center gap-1">{t("confidence", lang)}: <ConfidencePill confidence={a.confidence} /></span>
                      </div>

                      {a.status === "pending" ? (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reviewAlert(a.id, "ignore")}
                            className="h-9 text-coral border-coral/40 hover:bg-coral/10"
                          >
                            <EyeOff className="w-3.5 h-3.5 me-1.5" />
                            {t("ignore", lang)}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => reviewAlert(a.id, "resolved")}
                            className="h-9 bg-trust text-white hover:bg-trust/90"
                          >
                            <Eye className="w-3.5 h-3.5 me-1.5" />
                            {t("review", lang)}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-3 text-xs font-medium text-emerald flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {a.status === "ignored" ? (lang === "ar" ? "تم التجاهل" : "Ignored") : (lang === "ar" ? "تمت المراجعة" : "Reviewed")}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
