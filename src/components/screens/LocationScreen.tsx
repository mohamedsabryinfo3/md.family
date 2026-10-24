"use client";

import { useState } from "react";
import {
  Plus,
  MapPin,
  Home,
  School,
  Navigation,
  Battery,
  Radio,
  AlertTriangle,
  Siren,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { apiActions } from "@/lib/api-actions";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { EmptyState } from "@/components/mdfamily/States";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export function LocationScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const zones = useStore((s) => s.family.safeZones);
  const activity = useStore((s) => s.family.activity);
  const toastMsg = useStore((s) => s.toast);
  const confirmDialog = useStore((s) => s.confirmDialog);
  const locale = lang === "ar" ? ar : enUS;

  const childId = useStore((s) => s.selectedChildId);
  const online = useStore((s) =>
    s.family.children.find((c) => c.id === childId)?.devices[0]?.status === "online",
  );
  const battery = useStore((s) =>
    s.family.children.find((c) => c.id === childId)?.devices[0]?.batteryPct,
  );
  const lastSync = useStore((s) =>
    s.family.children.find((c) => c.id === childId)?.devices[0]?.lastSync,
  );

  const zoneEvents = activity.filter((a) => a.type === "zone_enter" || a.type === "zone_exit").slice(0, 4);

  const triggerSOS = () => {
    confirmDialog({
      title: "SOS",
      body: lang === "ar"
        ? "سيتم إرسال تنبيه استغاثة فوري إلى الوالد وجهات الاتصال المصرّح لها مع الموقع الحالي."
        : "An immediate SOS alert will be sent to the parent and authorized contacts with current location.",
      confirmLabel: "SOS",
      destructive: true,
      onConfirm: () => {
        if (!online) {
          toastMsg({ title: t("sosFailed", lang), variant: "error" });
        } else {
          if (childId) apiActions.triggerSos(childId);
          else toastMsg({ title: t("sosSent", lang), description: lang === "ar" ? "تم إرسال الموقع الحالي" : "Current location sent", variant: "success" });
        }
      },
    });
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title={t("location", lang)} onBack={() => go("childProfile")} />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Map placeholder */}
        <Card className="!p-0 overflow-hidden">
          <div className="relative h-56 bg-gradient-to-br from-trust/10 to-emerald/10 flex items-center justify-center">
            {/* Mock grid pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-20" aria-hidden>
              <defs>
                <pattern id="mapgrid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--trust)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mapgrid)" />
            </svg>

            {/* Safe zones */}
            {zones.map((z, i) => {
              const positions = [
                { left: "30%", top: "40%" },
                { left: "65%", top: "55%" },
                { left: "50%", top: "75%" },
              ];
              const pos = positions[i % positions.length];
              return (
                <div
                  key={z.id}
                  className="absolute rounded-full border-2 border-emerald/60 bg-emerald/10 flex items-center justify-center"
                  style={{ left: pos.left, top: pos.top, width: 64, height: 64, transform: "translate(-50%, -50%)" }}
                >
                  <Home className="w-4 h-4 text-emerald" />
                </div>
              );
            })}

            {/* Current location pin */}
            {online ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute w-12 h-12 rounded-full bg-trust/30 animate-ping" />
                <div className="relative w-6 h-6 rounded-full bg-trust border-2 border-white shadow-lg flex items-center justify-center">
                  <MapPin className="w-3 h-3 text-white" />
                </div>
              </div>
            ) : (
              <div className="bg-card border border-coral/30 rounded-lg px-3 py-2 text-xs text-coral flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t("offline", lang)}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Radio className={cn("w-3.5 h-3.5", online ? "text-emerald" : "text-slate")} />
                <span className="font-semibold text-foreground">
                  {online ? "LIVE LOCATION" : t("deviceOffline", lang)}
                </span>
              </div>
              {lastSync && (
                <span className="text-muted-foreground">
                  {t("updatedMinAgo", lang, { n: Math.max(1, Math.round((Date.now() - new Date(lastSync).getTime()) / 60000)) })}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              <StatusItem label={t("battery", lang)} value={battery != null ? `${battery}%` : "—"} icon={<Battery className="w-3 h-3" />} />
              <StatusItem label={t("accuracy", lang)} value={online ? "±18 م" : "—"} icon={<Navigation className="w-3 h-3" />} />
              <StatusItem label={t("lastSync", lang)} value={lastSync ? formatDistanceToNow(new Date(lastSync), { addSuffix: false, locale }) : "—"} icon={<Radio className="w-3 h-3" />} />
            </div>
          </div>
        </Card>

        {/* SOS */}
        <button
          onClick={triggerSOS}
          className={cn(
            "w-full rounded-xl p-4 flex items-center gap-3 text-white shadow-md active:scale-[0.98] transition-transform bg-coral mdf-sos-pulse",
          )}
        >
          <Siren className="w-6 h-6" />
          <div className="flex-1 text-start">
            <div className="text-base font-bold">{t("sos", lang)}</div>
            <div className="text-xs text-white/80">
              {lang === "ar" ? "إرسال استغاثة فورية مع الموقع" : "Send immediate SOS with location"}
            </div>
          </div>
        </button>

        {/* Safe zones */}
        <div>
          <SectionTitle
            title={t("safeZones", lang)}
            action={
              <button
                onClick={() => toastMsg({ title: lang === "ar" ? "قريباً" : "Coming soon", variant: "default" })}
                className="text-trust text-xs font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("addZone", lang)}
              </button>
            }
          />
          {zones.length === 0 ? (
            <Card>
              <EmptyState title={t("empty", lang)} />
            </Card>
          ) : (
            <div className="space-y-2">
              {zones.map((z) => {
                const Icon = z.kind === "home" ? Home : z.kind === "school" ? School : MapPin;
                return (
                  <Card key={z.id} className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", z.enabled ? "bg-emerald/10 text-emerald" : "bg-muted text-muted-foreground")}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{z.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {z.address ?? `${z.lat.toFixed(4)}, ${z.lng.toFixed(4)}`} · {lang === "ar" ? "نصف القطر" : "radius"} {z.radiusMeters} {lang === "ar" ? "م" : "m"}
                      </div>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", z.enabled ? "bg-emerald/15 text-emerald" : "bg-slate/15 text-slate")}>
                      {z.enabled ? (lang === "ar" ? "مفعّلة" : "Enabled") : (lang === "ar" ? "متوقفة" : "Disabled")}
                    </span>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Movement history */}
        <div>
          <SectionTitle title={t("movementHistory", lang)} />
          <Card className="!p-0 overflow-hidden">
            {zoneEvents.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t("empty", lang)}</div>
            ) : (
              zoneEvents.map((ev, i) => (
                <div key={ev.id} className={cn("flex items-center gap-3 px-4 py-3", i !== zoneEvents.length - 1 && "border-b border-border")}>
                  <div className={cn("w-2 h-2 rounded-full", ev.type === "zone_enter" ? "bg-emerald" : "bg-amber")} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{ev.labelAr}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 ltr-nums">
                      {format(new Date(ev.timestamp), "d MMM · HH:mm", { locale })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* Driving report — gated by data availability */}
        <Card className="border-dashed">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber/10 text-amber flex items-center justify-center">
              <Navigation className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{t("drivingReport", lang)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {lang === "ar" ? "يتطلب بيانات حركة كافية وموافقة." : "Requires sufficient movement data and consent."}
              </div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate/15 text-slate">
              {lang === "ar" ? "غير متاح" : "N/A"}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg p-2 text-center">
      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mb-0.5">{icon}{label}</div>
      <div className="text-xs font-bold text-foreground ltr-nums">{value}</div>
    </div>
  );
}
