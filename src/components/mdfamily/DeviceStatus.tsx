"use client";

import {
  Battery,
  BatteryLow,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import type { DeviceInfo, DeviceStatus } from "@/lib/types";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function timeAgo(iso: string, lang: "ar" | "en"): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.round(diff / 60000));
  if (min < 60) return lang === "ar" ? `منذ ${min} د` : `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return lang === "ar" ? `منذ ${hr} س` : `${hr}h ago`;
  const d = Math.round(hr / 24);
  return lang === "ar" ? `منذ ${d} يوم` : `${d}d ago`;
}

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const lang = useStore((s) => s.lang);
  const cfg: Record<DeviceStatus, { ar: string; en: string; cls: string; Icon: typeof Wifi }> = {
    online: { ar: t("deviceOnline", lang), en: t("deviceOnline", lang), cls: "bg-emerald/15 text-emerald", Icon: Wifi },
    offline: { ar: t("deviceOffline", lang), en: t("deviceOffline", lang), cls: "bg-slate/15 text-slate", Icon: WifiOff },
    syncing: { ar: t("deviceSyncing", lang), en: t("deviceSyncing", lang), cls: "bg-trust/15 text-trust", Icon: RefreshCw },
    unknown: { ar: t("deviceUnknown", lang), en: t("deviceUnknown", lang), cls: "bg-slate/15 text-slate", Icon: ShieldAlert },
  };
  const c = cfg[status];
  const Icon = c.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", c.cls)}>
      <Icon className={cn("w-3 h-3", status === "syncing" && "animate-spin")} />
      {c.ar}
    </span>
  );
}

export function BatteryIndicator({ pct }: { pct?: number }) {
  if (pct == null) return null;
  const low = pct < 20;
  const Icon = low ? BatteryLow : Battery;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", low ? "text-coral" : "text-emerald")}>
      <Icon className="w-3.5 h-3.5" />
      <span className="ltr-nums font-medium">{pct}%</span>
    </span>
  );
}

export function ProtectionStatus({ active }: { active: boolean }) {
  const lang = useStore((s) => s.lang);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
        active
          ? "bg-emerald/10 text-emerald"
          : "bg-coral/10 text-coral",
      )}
    >
      {active ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
      {active ? t("protectionActive", lang) : t("protectionInactive", lang)}
    </span>
  );
}

export function DeviceCard({
  device,
  onClick,
}: {
  device: DeviceInfo;
  onClick?: () => void;
}) {
  const lang = useStore((s) => s.lang);
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-xl p-4 shadow-sm",
        onClick && "cursor-pointer hover:border-trust/40 transition-colors",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">{device.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {device.brand} · {device.osVersion}
          </div>
        </div>
        <DeviceStatusBadge status={device.status} />
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <BatteryIndicator pct={device.batteryPct} />
        <span aria-hidden>·</span>
        <span>
          {lang === "ar" ? "آخر ظهور" : "Last seen"}: {timeAgo(device.lastSeen, lang)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-1.5">
        {lang === "ar" ? "آخر مزامنة" : "Last sync"}:{" "}
        {device.lastSync ? timeAgo(device.lastSync, lang) : "—"}
      </div>
    </div>
  );
}

export function Avatar({
  initials,
  color,
  size = "md",
}: {
  initials: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "sm" ? "w-8 h-8 text-sm" : size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-base";
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white shrink-0",
        sz,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
