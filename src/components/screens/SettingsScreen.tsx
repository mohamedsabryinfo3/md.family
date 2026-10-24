"use client";

import {
  User,
  ShieldCheck,
  Crown,
  Globe,
  Moon,
  Sun,
  School,
  Phone,
  Database,
  Info,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileText,
  ScrollText,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Header, Card } from "@/components/mdfamily/Header";
import { Avatar } from "@/components/mdfamily/DeviceStatus";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

export function SettingsScreen() {
  const lang = useStore((s) => s.lang);
  const theme = useStore((s) => s.theme);
  const parent = useStore((s) => s.parent);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const setLang = useStore((s) => s.setLang);
  const go = useStore((s) => s.go);
  const signOut = useStore((s) => s.signOut);
  const confirmDialog = useStore((s) => s.confirmDialog);
  const Chev = lang === "ar" ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-screen pb-24">
      <Header title={t("settings", lang)} />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Profile */}
        <Card className="flex items-center gap-3">
          <Avatar initials={parent.avatarInitials} color={parent.avatarColor} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-foreground">{parent.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">{parent.email}</div>
            <span className="inline-flex items-center gap-1 text-xs text-emerald bg-emerald/10 px-2 py-0.5 rounded-full mt-1.5">
              <Crown className="w-3 h-3" />
              {lang === "ar" ? "المالك الأساسي" : "Primary Owner"}
            </span>
          </div>
        </Card>

        {/* Language */}
        <SectionCard title={t("language", lang)}>
          <div className="grid grid-cols-2 gap-2 p-2">
            <LangButton active={lang === "ar"} onClick={() => setLang("ar")}>
              <Globe className="w-4 h-4" />
              {t("arabic", lang)}
            </LangButton>
            <LangButton active={lang === "en"} onClick={() => setLang("en")}>
              <Globe className="w-4 h-4" />
              {t("english", lang)}
            </LangButton>
          </div>
        </SectionCard>

        {/* Theme */}
        <SectionCard title={t("theme", lang)}>
          <Row icon={theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">
                {theme === "dark" ? t("darkMode", lang) : t("light", lang)}
              </div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </Row>
        </SectionCard>

        {/* Family management */}
        <SectionCard title={lang === "ar" ? "إدارة الأسرة" : "Family management"}>
          <Row icon={<ShieldCheck className="w-4 h-4" />} onClick={() => go("motherPermissions")}>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{t("motherPermissions", lang)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lang === "ar" ? "Full / Custom / No Access" : "Full / Custom / No Access"}</div>
            </div>
            <Chev className="w-4 h-4 text-muted-foreground" />
          </Row>
          <Row icon={<School className="w-4 h-4" />} onClick={() => go("schools")}>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{t("schools", lang)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lang === "ar" ? "المدارس وبلاغات التصنيف" : "Schools & classification reports"}</div>
            </div>
            <Chev className="w-4 h-4 text-muted-foreground" />
          </Row>
          <Row icon={<Phone className="w-4 h-4" />} onClick={() => go("contacts")}>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{t("contacts", lang)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lang === "ar" ? "أرقام الأب والأم والعائلة" : "Father, mother & family numbers"}</div>
            </div>
            <Chev className="w-4 h-4 text-muted-foreground" />
          </Row>
          <Row icon={<Database className="w-4 h-4" />} onClick={() => go("backup")} last>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{t("backupAndRestore", lang)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lang === "ar" ? "نسخ احتياطي محلي آمن" : "Secure local backups"}</div>
            </div>
            <Chev className="w-4 h-4 text-muted-foreground" />
          </Row>
        </SectionCard>

        {/* About */}
        <SectionCard title={t("about", lang)}>
          <Row icon={<Info className="w-4 h-4" />}>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{t("appName", lang)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t("appTagline", lang)}</div>
            </div>
          </Row>
          <Row icon={<ScrollText className="w-4 h-4" />}>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{t("versionLabel", lang)}</div>
              <div className="text-xs text-muted-foreground mt-0.5 ltr-nums">2.0.0 · MD-Sabry</div>
            </div>
          </Row>
          <Row icon={<FileText className="w-4 h-4" />}>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{t("privacyPolicy", lang)}</div>
            </div>
            <Chev className="w-4 h-4 text-muted-foreground" />
          </Row>
          <Row icon={<FileText className="w-4 h-4" />} last>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{t("termsOfUse", lang)}</div>
            </div>
            <Chev className="w-4 h-4 text-muted-foreground" />
          </Row>
        </SectionCard>

        {/* Sign out */}
        <button
          onClick={() =>
            confirmDialog({
              title: t("signOut", lang),
              body: lang === "ar" ? "سيتم تسجيل الخروج من حسابك." : "You will be signed out.",
              confirmLabel: t("signOut", lang),
              destructive: true,
              onConfirm: signOut,
            })
          }
          className="w-full rounded-xl border border-coral/40 bg-coral/5 text-coral font-semibold py-3 hover:bg-coral/10 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {t("signOut", lang)}
        </button>

        <p className="text-center text-[11px] text-muted-foreground leading-relaxed pt-2">
          {t("auditLogNote", lang)}
        </p>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-2 mt-2 px-1">{title}</h2>
      <Card className="!p-0 overflow-hidden">{children}</Card>
    </div>
  );
}

function Row({
  icon,
  children,
  onClick,
  last,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  last?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !last && "border-b border-border",
        onClick && "cursor-pointer hover:bg-accent transition-colors",
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
        {icon}
      </div>
      {children}
    </div>
  );
}

function LangButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-12 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
        active ? "bg-trust text-white" : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
