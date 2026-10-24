"use client";

import { Plus, ChevronRight, ChevronLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar, DeviceStatusBadge, ProtectionStatus } from "@/components/mdfamily/DeviceStatus";
import { Card, Header } from "@/components/mdfamily/Header";
import { EmptyState } from "@/components/mdfamily/States";
import { ProgressRing } from "@/components/mdfamily/Badges";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export function ChildrenScreen() {
  const lang = useStore((s) => s.lang);
  const children = useStore((s) => s.family.children);
  const go = useStore((s) => s.go);
  const selectChild = useStore((s) => s.selectChild);
  const locale = lang === "ar" ? ar : enUS;
  const Chev = lang === "ar" ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-screen pb-24">
      <Header
        title={t("children", lang)}
        right={
          <button
            onClick={() => go("addChild")}
            className="w-9 h-9 rounded-full bg-trust text-white flex items-center justify-center hover:bg-trust/90"
            aria-label={t("addChild", lang)}
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 mdf-fade-in">
        {children.length === 0 ? (
          <EmptyState
            icon={<Plus className="w-8 h-8" />}
            title={t("noChildrenYet", lang)}
            description={t("noChildrenHint", lang)}
            actionLabel={t("addChild", lang)}
            onAction={() => go("addChild")}
          />
        ) : (
          <div className="space-y-3">
            {children.map((c) => {
              const online = c.devices.some((d) => d.status === "online");
              return (
                <Card
                  key={c.id}
                  onClick={() => {
                    selectChild(c.id);
                    go("childProfile");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar initials={c.avatarInitials} color={c.avatarColor} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold text-foreground">{c.name}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {c.devices[0] && <DeviceStatusBadge status={c.devices[0].status} />}
                        <span className="text-xs text-muted-foreground">
                          {c.devices[0]?.lastSeen &&
                            formatDistanceToNow(new Date(c.devices[0].lastSeen), { addSuffix: true, locale })}
                        </span>
                      </div>
                    </div>
                    <ProgressRing
                      pct={c.todayUsagePct}
                      size={48}
                      stroke={4}
                      color={c.todayUsagePct >= 90 ? "var(--coral)" : "var(--trust)"}
                      label={<span className="text-[10px] font-bold ltr-nums">{c.todayUsagePct}%</span>}
                    />
                    <Chev className="w-5 h-5 text-muted-foreground shrink-0" />
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
