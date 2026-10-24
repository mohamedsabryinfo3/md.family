"use client";

import { useState } from "react";
import { Lock, Crown, ShieldCheck, ShieldOff, ShieldAlert, Save, Eye, Mic, Phone } from "lucide-react";
import { useStore } from "@/lib/store";
import { apiActions } from "@/lib/api-actions";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { Avatar } from "@/components/mdfamily/DeviceStatus";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { MotherAccessLevel, PermissionGrant } from "@/lib/types";

export function MotherPermissionsScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const mother = useStore((s) => s.family.members.find((m) => m.role === "mother"));
  const level = useStore((s) => s.family.motherPermissions);
  const grants = useStore((s) => s.family.motherGrants);
  const setAccess = useStore((s) => s.setMotherAccess);
  const toggleGrant = useStore((s) => s.toggleMotherGrant);
  const savePermissions = () => apiActions.saveMotherPermissions();
  const revokeAccess = useStore((s) => s.revokeMotherAccess);
  const confirmDialog = useStore((s) => s.confirmDialog);
  const auditLog = useStore((s) => s.auditLog);

  const LEVELS: { key: MotherAccessLevel; icon: typeof Crown; tone: "emerald" | "trust" | "slate" }[] = [
    { key: "full_access", icon: Crown, tone: "emerald" },
    { key: "custom_access", icon: ShieldCheck, tone: "trust" },
    { key: "no_access", icon: ShieldOff, tone: "slate" },
  ];

  return (
    <div className="min-h-screen pb-24">
      <Header title={t("motherPermissions", lang)} onBack={() => go("settings")} />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Mother identity */}
        {mother && (
          <Card className="flex items-center gap-3">
            <Avatar initials={mother.avatarInitials} color={mother.avatarColor} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-foreground">{mother.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">{mother.email}</div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
              {lang === "ar" ? "الأم" : "Mother"}
            </span>
          </Card>
        )}

        {/* Access level picker */}
        <div>
          <SectionTitle title={lang === "ar" ? "مستوى الوصول" : "Access level"} />
          <div className="space-y-2">
            {LEVELS.map((l) => {
              const Icon = l.icon;
              const desc = l.key === "full_access" ? t("fullAccessDesc", lang) : l.key === "custom_access" ? t("customAccessDesc", lang) : t("noAccessDesc", lang);
              const toneCls = {
                emerald: "bg-emerald/15 text-emerald",
                trust: "bg-trust/15 text-trust",
                slate: "bg-slate/15 text-slate",
              }[l.tone];
              return (
                <button
                  key={l.key}
                  onClick={() => setAccess(l.key)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-start transition-all flex items-center gap-3",
                    level === l.key ? "border-trust bg-trust/5" : "border-border hover:border-trust/30",
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", toneCls)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-semibold", level === l.key ? "text-trust" : "text-foreground")}>
                      {l.key === "full_access" ? t("fullAccess", lang) : l.key === "custom_access" ? t("customAccess", lang) : t("noAccess", lang)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                  <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", level === l.key ? "border-trust" : "border-border")}>
                    {level === l.key && <div className="w-2.5 h-2.5 rounded-full bg-trust" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cannot self-escalate notice */}
        <Card className="bg-amber/5 border-amber/30">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">{t("cannotSelfEscalate", lang)}</p>
          </div>
        </Card>

        {/* Custom grants */}
        {level === "custom_access" && (
          <div>
            <SectionTitle title={lang === "ar" ? "صلاحيات مفصّلة" : "Granular permissions"} />
            <Card className="!p-0 overflow-hidden">
              {grants.map((g, i) => (
                <GrantRow
                  key={g.key}
                  grant={g}
                  onToggle={() => toggleGrant(g.key)}
                  last={i === grants.length - 1}
                />
              ))}
            </Card>
          </div>
        )}

        {/* Sensitive grants always visible */}
        {level !== "custom_access" && (
          <div>
            <SectionTitle title={lang === "ar" ? "ميزات حساسة مستقلة" : "Independent sensitive features"} />
            <Card className="!p-0 overflow-hidden">
              {grants.filter((g) => g.sensitive).map((g, i, arr) => (
                <GrantRow
                  key={g.key}
                  grant={g}
                  onToggle={() => toggleGrant(g.key)}
                  last={i === arr.length - 1}
                />
              ))}
            </Card>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              {lang === "ar"
                ? "Full Access تمنح صلاحيات الإدارة العادية، لكن ميزات الشاشة/الميكروفون تحتاج موافقة مستقلة وحالة ظاهرة على الجهاز."
                : "Full Access grants ordinary management, but screen/microphone features need independent consent and visible on-device status."}
            </p>
          </div>
        )}

        {/* Save / Revoke */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={savePermissions}
            className="bg-trust text-white hover:bg-trust/90 h-11"
          >
            <Save className="w-4 h-4 me-2" />
            {t("savePermissions", lang)}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              confirmDialog({
                title: t("revokeAccess", lang),
                body: lang === "ar"
                  ? "سيتم سحب جميع صلاحيات الأم. يبقى الحساب الشخصي دون حذف."
                  : "All mother permissions will be revoked. The personal account remains without deletion.",
                confirmLabel: t("revokeAccess", lang),
                destructive: true,
                onConfirm: revokeAccess,
              })
            }
            className="h-11 text-coral border-coral/40 hover:bg-coral/10"
          >
            <ShieldOff className="w-4 h-4 me-2" />
            {t("revokeAccess", lang)}
          </Button>
        </div>

        {/* Audit log */}
        <div>
          <SectionTitle title={t("auditLog", lang)} />
          <Card className="!p-0 overflow-hidden">
            {auditLog.slice(0, 6).map((e, i, arr) => (
              <div key={e.id} className={cn("px-4 py-3", i !== arr.length - 1 && "border-b border-border")}>
                <div className="text-xs text-foreground">{lang === "ar" ? e.ar : e.en}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 ltr-nums">{new Date(e.at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</div>
              </div>
            ))}
          </Card>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{t("auditLogNote", lang)}</p>
        </div>
      </div>
    </div>
  );
}

function GrantRow({ grant, onToggle, last }: { grant: PermissionGrant; onToggle: () => void; last: boolean }) {
  const lang = useStore((s) => s.lang);
  const Icon = grant.sensitive
    ? grant.key === "live_screen_view"
      ? Eye
      : grant.key === "ambient_audio"
      ? Mic
      : Phone
    : ShieldCheck;
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", !last && "border-b border-border")}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", grant.sensitive ? "bg-coral/10 text-coral" : "bg-muted text-muted-foreground")}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{lang === "ar" ? grant.labelAr : grant.labelEn}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{lang === "ar" ? grant.descriptionAr : grant.descriptionEn}</div>
      </div>
      <Switch checked={grant.granted} onCheckedChange={onToggle} />
    </div>
  );
}
