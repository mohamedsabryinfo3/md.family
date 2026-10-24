"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Battery,
  Clock,
  ShieldAlert,
  Activity,
  Pause,
  Play,
  PlusCircle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useSelectedChild } from "@/lib/store";
import { apiActions } from "@/lib/api-actions";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar, BatteryIndicator, DeviceStatusBadge, ProtectionStatus } from "@/components/mdfamily/DeviceStatus";
import { ProgressRing, SeverityPill } from "@/components/mdfamily/Badges";
import { Card, Header, SectionTitle } from "@/components/mdfamily/Header";
import { EmptyState } from "@/components/mdfamily/States";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export function DashboardScreen() {
  const lang = useStore((s) => s.lang);
  const family = useStore((s) => s.family);
  const parent = useStore((s) => s.parent);
  const selectedChildId = useStore((s) => s.selectedChildId);
  const selectChild = useStore((s) => s.selectChild);
  const go = useStore((s) => s.go);
  const togglePause = () => apiActions.toggleFamilyPause();
  const child = useSelectedChild();

  if (family.children.length === 0) {
    return (
      <div className="min-h-screen pb-24">
        <Header title={t("familyDashboard", lang)} />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <EmptyState
            icon={<PlusCircle className="w-8 h-8" />}
            title={t("noChildrenYet", lang)}
            description={t("noChildrenHint", lang)}
            actionLabel={t("addChild", lang)}
            onAction={() => go("addChild")}
          />
        </div>
      </div>
    );
  }

  const childAlerts = family.alerts.filter((a) => !child || a.childId === child.id).slice(0, 3);
  const recentActivity = family.activity.filter((a) => !child || a.childId === child.id).slice(0, 4);
  const locale = lang === "ar" ? ar : enUS;

  return (
    <div className="min-h-screen pb-24">
      <Header
        title={t("familyDashboard", lang)}
        subtitle={`${t("goodMorning", lang)}، ${parent.name}`}
        right={
          family.familyPauseActive ? (
            <span className="text-xs font-medium text-coral bg-coral/10 px-2 py-1 rounded-md">
              {t("pauseInternet", lang)}
            </span>
          ) : null
        }
      />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Child selector */}
        <div className="flex items-center gap-2 overflow-x-auto mdf-scroll -mx-1 px-1 pb-1">
          {family.children.map((c) => {
            const active = c.id === selectedChildId;
            return (
              <button
                key={c.id}
                onClick={() => selectChild(c.id)}
                className={cn(
                  "shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                  active
                    ? "border-trust bg-trust/10"
                    : "border-border bg-card hover:border-trust/30",
                )}
              >
                <Avatar initials={c.avatarInitials} color={c.avatarColor} size="sm" />
                <span className={cn("text-sm font-medium", active ? "text-trust" : "text-foreground")}>
                  {c.name}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => go("addChild")}
            className="shrink-0 w-9 h-9 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-trust hover:border-trust transition-colors"
            aria-label={t("addChild", lang)}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {child && (
          <>
            {/* Live status card */}
            <Card onClick={() => go("location")}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={child.avatarInitials} color={child.avatarColor} size="lg" />
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-foreground">{child.name}</div>
                    {child.devices[0] && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {child.devices[0].label} · {child.devices[0].brand}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {child.devices[0] && <DeviceStatusBadge status={child.devices[0].status} />}
                  <ProtectionStatus active={child.devices.some((d) => d.status === "online")} />
                </div>
              </div>

              {/* Quick stats — responsive grid: 3 cols on >=360px, stack on smaller */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-2">
                <Stat
                  icon={<MapPin className="w-3.5 h-3.5" />}
                  label={t("liveLocation", lang)}
                  value={
                    child.devices[0]?.status === "online"
                      ? lang === "ar" ? "المنزل" : "Home"
                      : t("deviceOffline", lang)
                  }
                  tone={child.devices[0]?.status === "online" ? "emerald" : "slate"}
                />
                <Stat
                  icon={<Battery className="w-3.5 h-3.5" />}
                  label={t("battery", lang)}
                  value={child.devices[0]?.batteryPct != null ? `${child.devices[0].batteryPct}%` : "—"}
                  tone={
                    (child.devices[0]?.batteryPct ?? 0) < 20 ? "coral" : "emerald"
                  }
                />
                <Stat
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label={t("lastSync", lang)}
                  value={
                    child.devices[0]?.lastSync
                      ? formatDistanceToNow(new Date(child.devices[0].lastSync), { addSuffix: true, locale })
                      : "—"
                  }
                  tone="trust"
                />
              </div>
            </Card>

            {/* Screen time donut */}
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">{t("screenTimeToday", lang)}</div>
                  <div className="text-2xl font-bold text-foreground mt-1 ltr-nums">
                    {Math.floor(child.screenTimeTodayMin / 60)}{" "}
                    <span className="text-sm font-medium text-muted-foreground">
                      {lang === "ar" ? "س" : "h"}
                    </span>{" "}
                    {child.screenTimeTodayMin % 60}{" "}
                    <span className="text-sm font-medium text-muted-foreground">
                      {lang === "ar" ? "د" : "m"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {child.todayUsagePct}% {t("ofDailyLimit", lang)}
                  </div>
                  <button
                    onClick={() => go("screenTime")}
                    className="mt-2 text-xs font-semibold text-trust hover:underline"
                  >
                    {lang === "ar" ? "تعديل الحدود" : "Edit limits"}
                  </button>
                </div>
                <ProgressRing
                  pct={child.todayUsagePct}
                  size={72}
                  color={
                    child.todayUsagePct >= 90 ? "var(--coral)" : child.todayUsagePct >= 70 ? "var(--amber)" : "var(--trust)"
                  }
                  label={
                    <div className="text-center">
                      <div className="text-xs font-bold text-foreground ltr-nums">{child.todayUsagePct}%</div>
                    </div>
                  }
                />
              </div>
            </Card>

            {/* Family Pause action */}
            <button
              onClick={togglePause}
              className={cn(
                "w-full rounded-xl p-4 flex items-center gap-3 text-white shadow-sm active:scale-[0.98] transition-transform",
                family.familyPauseActive ? "bg-coral" : "bg-trust",
              )}
            >
              {family.familyPauseActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <div className="flex-1 text-start">
                <div className="text-sm font-bold">
                  {family.familyPauseActive ? t("resumeInternet", lang) : t("pauseInternet", lang)}
                </div>
                <div className="text-xs text-white/80">
                  {family.familyPauseActive
                    ? lang === "ar" ? "إنترنت الأسرة متوقف حالياً" : "Family internet is paused"
                    : lang === "ar" ? "إيقاف سريع لإنترنت أجهزة الأسرة" : "Quickly pause all family devices"}
                </div>
              </div>
            </button>

            {/* Safety alerts */}
            <div>
              <SectionTitle
                title={t("safetyAlerts", lang)}
                action={
                  <button
                    onClick={() => go("safetyAlerts")}
                    className="text-xs font-semibold text-trust hover:underline"
                  >
                    {t("viewAll", lang)}
                  </button>
                }
              />
              {childAlerts.length === 0 ? (
                <Card>
                  <div className="flex items-center gap-3 text-emerald">
                    <ShieldAlert className="w-5 h-5" />
                    <span className="text-sm">{lang === "ar" ? "لا توجد تنبيهات حالياً" : "No alerts"}</span>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {childAlerts.map((a) => (
                    <Card key={a.id} onClick={() => go("safetyAlerts")}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-coral/10 flex items-center justify-center text-coral shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <SeverityPill severity={a.severity} />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(a.capturedAt), "HH:mm", { locale })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1 line-clamp-2">{a.reasonAr}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.source}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div>
              <SectionTitle title={t("recentActivity", lang)} />
              <Card className="!p-0 overflow-hidden">
                {recentActivity.map((ev, i) => (
                  <div
                    key={ev.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i !== recentActivity.length - 1 && "border-b border-border",
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        ev.severity === "info" ? "bg-trust" : ev.severity === "warning" ? "bg-amber" : "bg-coral",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">{ev.labelAr}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 ltr-nums">
                        {format(new Date(ev.timestamp), "HH:mm · d MMM", { locale })}
                      </div>
                    </div>
                    <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "trust" | "emerald" | "amber" | "coral" | "slate";
}) {
  const toneCls = {
    trust: "text-trust",
    emerald: "text-emerald",
    amber: "text-amber",
    coral: "text-coral",
    slate: "text-slate",
  }[tone];
  return (
    <div className="bg-muted/50 rounded-lg p-2.5">
      <div className={cn("flex items-center gap-1", toneCls)}>
        {icon}
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-xs font-bold text-foreground mt-1 ltr-nums truncate">{value}</div>
    </div>
  );
}
