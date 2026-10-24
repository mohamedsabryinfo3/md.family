"use client";

import {
  Plus,
  Trash2,
  Smartphone,
  Clock,
  Globe,
  MapPin,
  AlertTriangle,
  Phone,
  MessageCircle,
  Eye,
  Mic,
  QrCode,
} from "lucide-react";
import { useStore, useSelectedChild } from "@/lib/store";
import { apiActions } from "@/lib/api-actions";
import { t } from "@/lib/i18n";
import { Header, Card } from "@/components/mdfamily/Header";
import { Avatar, BatteryIndicator, DeviceCard, DeviceStatusBadge, ProtectionStatus } from "@/components/mdfamily/DeviceStatus";
import { EmptyState } from "@/components/mdfamily/States";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChildProfileScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const child = useSelectedChild();
  const confirmDialog = useStore((s) => s.confirmDialog);
  const startPairing = (childId: string) => {
    apiActions.startPairing(childId).then(() => go("pairing"));
  };

  if (!child) {
    return (
      <div className="min-h-screen pb-24">
        <Header title="" onBack={() => go("children")} />
        <EmptyState title={t("empty", lang)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Header
        title={child.name}
        subtitle={child.devices[0]?.label}
        onBack={() => go("children")}
        right={
          <button
            onClick={() =>
              confirmDialog({
                title: t("confirmDeleteTitle", lang),
                body: t("confirmDeleteChild", lang).replace("{name}", child.name),
                confirmLabel: t("delete", lang),
                cancelLabel: t("cancel", lang),
                destructive: true,
                onConfirm: () => {
                  apiActions.deleteChild(child.id).then(() => go("children"));
                },
              })
            }
            className="w-9 h-9 rounded-full flex items-center justify-center text-coral hover:bg-coral/10 transition-colors"
            aria-label={t("delete", lang)}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Hero card */}
        <Card>
          <div className="flex items-center gap-4">
            <Avatar initials={child.avatarInitials} color={child.avatarColor} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="text-xl font-bold text-foreground">{child.name}</div>
              {child.devices[0] && (
                <div className="flex items-center gap-2 mt-1">
                  <DeviceStatusBadge status={child.devices[0].status} />
                  <ProtectionStatus active={child.devices.some((d) => d.status === "online")} />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Devices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              {lang === "ar" ? "الأجهزة المرتبطة" : "Linked devices"}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                startPairing(child.id);
                go("pairing");
              }}
              className="h-8 text-xs gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              {t("pairDevice", lang)}
            </Button>
          </div>

          {child.devices.length === 0 ? (
            <Card className="border-dashed">
              <EmptyState
                icon={<Smartphone className="w-7 h-7" />}
                title={lang === "ar" ? "لا توجد أجهزة مرتبطة" : "No linked devices"}
                description={lang === "ar" ? "اربط أول جهاز برمز QR أحادي الاستخدام." : "Pair the first device with a one-time QR code."}
                actionLabel={t("pairDevice", lang)}
                onAction={() => {
                  startPairing(child.id);
                  go("pairing");
                }}
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {child.devices.map((d) => (
                <DeviceCard key={d.id} device={d} />
              ))}
            </div>
          )}
        </div>

        {/* Quick actions grid */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {lang === "ar" ? "إجراءات سريعة" : "Quick actions"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={<Clock className="w-5 h-5" />}
              label={t("screenTime", lang)}
              tone="trust"
              onClick={() => go("screenTime")}
            />
            <QuickAction
              icon={<Globe className="w-5 h-5" />}
              label={t("webFiltering", lang)}
              tone="emerald"
              onClick={() => go("webFiltering")}
            />
            <QuickAction
              icon={<MapPin className="w-5 h-5" />}
              label={t("location", lang)}
              tone="amber"
              onClick={() => go("location")}
            />
            <QuickAction
              icon={<AlertTriangle className="w-5 h-5" />}
              label={t("safetyAlerts", lang)}
              tone="coral"
              onClick={() => go("safetyAlerts")}
            />
            <QuickAction
              icon={<Phone className="w-5 h-5" />}
              label={t("contacts", lang)}
              tone="trust"
              onClick={() => go("contacts")}
            />
            <QuickAction
              icon={<Eye className="w-5 h-5" />}
              label={t("liveScreenView", lang)}
              tone="slate"
              onClick={() => go("liveSession")}
            />
          </div>
        </div>

        {/* Sensitive feature flags */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            {lang === "ar" ? "ميزات حساسة" : "Sensitive features"}
          </h2>
          <Card className="!p-0 overflow-hidden">
            <SensitiveRow
              icon={<Eye className="w-4 h-4" />}
              label={t("liveScreenView", lang)}
              supported={child.devices[0]?.capabilities.mediaProjection ?? false}
            />
            <SensitiveRow
              icon={<Phone className="w-4 h-4" />}
              label={t("voiceCall", lang)}
              supported={child.devices[0]?.capabilities.microphone ?? false}
            />
            <SensitiveRow
              icon={<Mic className="w-4 h-4" />}
              label={t("ambientAudio", lang)}
              supported={child.devices[0]?.capabilities.microphone ?? false}
              last
            />
          </Card>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            {t("sensitiveFeatureNote", lang)}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "trust" | "emerald" | "amber" | "coral" | "slate";
  onClick: () => void;
}) {
  const toneCls = {
    trust: "bg-trust/10 text-trust",
    emerald: "bg-emerald/10 text-emerald",
    amber: "bg-amber/10 text-amber",
    coral: "bg-coral/10 text-coral",
    slate: "bg-slate/10 text-slate",
  }[tone];
  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-4 flex flex-col items-start gap-3 hover:border-trust/40 transition-colors active:scale-[0.98] text-start"
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", toneCls)}>
        {icon}
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </button>
  );
}

function SensitiveRow({
  icon,
  label,
  supported,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  supported: boolean;
  last?: boolean;
}) {
  const lang = useStore((s) => s.lang);
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", !last && "border-b border-border")}>
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <span
        className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium",
          supported ? "bg-emerald/15 text-emerald" : "bg-slate/15 text-slate",
        )}
      >
        {supported ? t("enable", lang) : t("notSupportedOnDevice", lang)}
      </span>
    </div>
  );
}
