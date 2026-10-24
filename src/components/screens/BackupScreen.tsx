"use client";

import { Database, HardDrive, Cloud, CloudOff, ShieldCheck, RotateCcw, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { apiActions } from "@/lib/api-actions";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { EmptyState } from "@/components/mdfamily/States";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

function formatSize(kb: number): string {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(2)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

export function BackupScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const backups = useStore((s) => s.family.backups);
  const createBackup = () => apiActions.createBackup();
  const restoreBackup = (id: string) => apiActions.restoreBackup(id);
  const confirmDialog = useStore((s) => s.confirmDialog);

  const locale = lang === "ar" ? ar : enUS;
  const lastBackup = backups[0];
  const cloudConfigured = false; // Explicit: cloud is NOT configured yet

  return (
    <div className="min-h-screen pb-24">
      <Header title={t("backupAndRestore", lang)} onBack={() => go("settings")} />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Storage location */}
        <Card>
          <SectionTitle title={t("storageLocation", lang)} />
          <div className="grid grid-cols-3 gap-2">
            <StorageOption
              icon={<HardDrive className="w-5 h-5" />}
              label={lang === "ar" ? "محلي" : "Local"}
              tone="emerald"
              active
            />
            <StorageOption
              icon={<Database className="w-5 h-5" />}
              label={lang === "ar" ? "خادم" : "Server"}
              tone="slate"
            />
            <StorageOption
              icon={cloudConfigured ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
              label={lang === "ar" ? "سحابي" : "Cloud"}
              tone="slate"
              disabled
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{t("localOnly", lang)}</p>
        </Card>

        {/* Last backup */}
        {lastBackup && (
          <Card>
            <SectionTitle title={t("lastBackup", lang)} />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">{t("backupSize", lang)}</div>
                <div className="text-base font-bold text-foreground mt-1 ltr-nums">{formatSize(lastBackup.sizeKb)}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">{lang === "ar" ? "التاريخ" : "Date"}</div>
                <div className="text-base font-bold text-foreground mt-1 ltr-nums">
                  {format(new Date(lastBackup.createdAt), "d MMM yyyy", { locale })}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1.5">{t("includedData", lang)}</div>
              <div className="text-xs text-foreground">{lastBackup.scope}</div>
            </div>
          </Card>
        )}

        {/* Create */}
        <Button
          onClick={createBackup}
          className="w-full h-12 bg-trust text-white hover:bg-trust/90"
        >
          <ShieldCheck className="w-5 h-5 me-2" />
          {t("createBackup", lang)}
        </Button>

        {/* Restore warning */}
        <Card className="bg-amber/5 border-amber/30">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">{t("restoreWarning", lang)}</p>
          </div>
        </Card>

        {/* History */}
        <div>
          <SectionTitle title={lang === "ar" ? "سجل النسخ" : "Backup history"} />
          {backups.length === 0 ? (
            <EmptyState title={t("empty", lang)} />
          ) : (
            <Card className="!p-0 overflow-hidden">
              {backups.map((b, i) => (
                <div
                  key={b.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    i !== backups.length - 1 && "border-b border-border",
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-trust/10 text-trust flex items-center justify-center shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground ltr-nums">
                      {format(new Date(b.createdAt), "d MMM yyyy · HH:mm", { locale })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 ltr-nums">{formatSize(b.sizeKb)} · {b.storage === "local" ? (lang === "ar" ? "محلي" : "Local") : b.storage}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      confirmDialog({
                        title: t("confirmRestoreTitle", lang),
                        body: t("restoreWarning", lang),
                        confirmLabel: t("restore", lang),
                        destructive: true,
                        onConfirm: () => restoreBackup(b.id),
                      })
                    }
                    className="h-8 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 me-1.5" />
                    {t("restore", lang)}
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Security note */}
        <Card className="bg-accent border-trust/30">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-trust shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              {lang === "ar"
                ? "تُحمى ملفات النسخ بالتشفير والصلاحيات والعزل بين الأسر. لا تُحفظ كلمات المرور أو مفاتيح API بصورتها الصريحة."
                : "Backup files are protected by encryption, permissions, and isolation between families. No passwords or API keys are stored in plaintext."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StorageOption({
  icon,
  label,
  tone,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "emerald" | "slate";
  active?: boolean;
  disabled?: boolean;
}) {
  const toneCls = {
    emerald: "bg-emerald/15 text-emerald border-emerald/40",
    slate: "bg-slate/10 text-slate border-slate/30",
  }[tone];
  return (
    <div className={cn("border-2 rounded-lg p-3 flex flex-col items-center gap-1.5 text-center", active ? toneCls : "border-border opacity-50", disabled && "opacity-40")}>
      {icon}
      <span className="text-xs font-semibold">{label}</span>
      {active && <span className="text-[10px] text-emerald">{active ? "●" : ""}</span>}
    </div>
  );
}
