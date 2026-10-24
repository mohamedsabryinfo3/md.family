"use client";

import { useState } from "react";
import {
  Clock,
  Sun,
  Moon,
  BookOpen,
  Calendar,
  Plus,
  Send,
  Ban,
  Bell,
  Check,
  X,
  AlarmClock,
} from "lucide-react";
import { useStore, useSelectedChild } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { TimeLimitWheel } from "@/components/mdfamily/TimeLimitWheel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const DAYS = [
  { key: "sat", ar: "سبت", en: "Sat" },
  { key: "sun", ar: "أحد", en: "Sun" },
  { key: "mon", ar: "إثنين", en: "Mon" },
  { key: "tue", ar: "ثلاثاء", en: "Tue" },
  { key: "wed", ar: "أربعاء", en: "Wed" },
  { key: "thu", ar: "خميس", en: "Thu" },
  { key: "fri", ar: "جمعة", en: "Fri" },
];

export function ScreenTimeScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const child = useSelectedChild();
  const confirmDialog = useStore((s) => s.confirmDialog);
  const toastMsg = useStore((s) => s.toast);
  const extensionRequests = useStore((s) => s.family.extensionRequests);
  const decideExtension = useStore((s) => s.decideExtension);

  const [day, setDay] = useState("sat");
  const [limitMin, setLimitMin] = useState(child?.screenTimeLimitMin || 180);
  const [postLimit, setPostLimit] = useState<"lock_device" | "lock_navigation" | "notify">("lock_navigation");
  const [studyRoutineOn, setStudyRoutineOn] = useState(true);
  const [sleepRoutineOn, setSleepRoutineOn] = useState(true);
  const [downtimeOn, setDowntimeOn] = useState(false);

  if (!child) {
    return (
      <div className="min-h-screen pb-24">
        <Header title={t("screenTime", lang)} onBack={() => go("children")} />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <p className="text-sm text-muted-foreground">{lang === "ar" ? "اختر طفلاً أولاً" : "Select a child first"}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Header
        title={t("screenTime", lang)}
        subtitle={child.name}
        onBack={() => go("childProfile")}
      />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-5 mdf-fade-in">
        {/* Used / Remaining summary */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-trust" />
              <span className="text-sm font-semibold text-foreground">{t("screenTimeToday", lang)}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {t("resetDay", lang)} · {t("resetHint", lang)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SummaryStat
              label={t("used", lang)}
              value={`${Math.floor(child.screenTimeTodayMin / 60)}س ${child.screenTimeTodayMin % 60}د`}
              tone="coral"
            />
            <SummaryStat
              label={t("remaining", lang)}
              value={`${Math.floor(Math.max(0, limitMin - child.screenTimeTodayMin) / 60)}س ${Math.max(0, limitMin - child.screenTimeTodayMin) % 60}د`}
              tone="emerald"
            />
            <SummaryStat
              label={t("dailyLimit", lang)}
              value={`${Math.floor(limitMin / 60)}س ${limitMin % 60}د`}
              tone="trust"
            />
          </div>
        </Card>

        {/* Time wheel */}
        <Card>
          <SectionTitle title={`${t("dailyLimit", lang)} — ${t("timeWheel", lang)}`} />
          <div className="flex flex-col items-center">
            <TimeLimitWheel
              valueMin={limitMin}
              onChange={setLimitMin}
              min={0}
              max={480}
              step={15}
              label={t("dailyLimit", lang)}
            />
          </div>

          {/* Day of week selector */}
          <div className="mt-4">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {lang === "ar" ? "اليوم" : "Day"}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDay(d.key)}
                  className={cn(
                    "h-9 rounded-lg text-xs font-medium transition-all",
                    day === d.key
                      ? "bg-trust text-white"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {lang === "ar" ? d.ar : d.en}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => toastMsg({ title: t("save", lang), variant: "success" })}
            className="w-full mt-4 bg-trust text-white hover:bg-trust/90"
          >
            {t("save", lang)}
          </Button>
        </Card>

        {/* Post-limit action */}
        <Card>
          <SectionTitle title={t("postLimitAction", lang)} />
          <div className="space-y-2">
            <OptionRow
              icon={<Ban className="w-4 h-4" />}
              label={t("lockNavigation", lang)}
              desc={lang === "ar" ? "حظر التصفح مع إبقاء التطبيقات غير المعتمدة على الإنترنت متاحة" : "Block browsing, keep offline apps available"}
              selected={postLimit === "lock_navigation"}
              onSelect={() => setPostLimit("lock_navigation")}
            />
            <OptionRow
              icon={<Ban className="w-4 h-4" />}
              label={t("lockDevice", lang)}
              desc={lang === "ar" ? "قفل الجهاز بالكامل" : "Lock entire device"}
              selected={postLimit === "lock_device"}
              onSelect={() => setPostLimit("lock_device")}
            />
            <OptionRow
              icon={<Bell className="w-4 h-4" />}
              label={t("notifyOnly", lang)}
              desc={lang === "ar" ? "تنبيه فقط دون قفل" : "Notify only, no lock"}
              selected={postLimit === "notify"}
              onSelect={() => setPostLimit("notify")}
            />
          </div>
        </Card>

        {/* Routines */}
        <Card>
          <SectionTitle title={t("routines", lang)} action={<button className="text-trust text-xs font-semibold hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" />{t("add", lang)}</button>} />
          <div className="space-y-3">
            <RoutineRow
              icon={<BookOpen className="w-4 h-4" />}
              name={t("studyRoutine", lang)}
              time={lang === "ar" ? "16:00 - 18:00" : "4:00 PM - 6:00 PM"}
              desc={lang === "ar" ? "استثناءات: القاموس، الآلة الحاسبة" : "Exceptions: dictionary, calculator"}
              on={studyRoutineOn}
              onToggle={() => setStudyRoutineOn((v) => !v)}
              tone="amber"
            />
            <RoutineRow
              icon={<Moon className="w-4 h-4" />}
              name={t("sleepRoutine", lang)}
              time={lang === "ar" ? "21:00 - 06:30" : "9:00 PM - 6:30 AM"}
              desc={lang === "ar" ? "هاتف وضيعات الطوارئ فقط" : "Phone & emergency calls only"}
              on={sleepRoutineOn}
              onToggle={() => setSleepRoutineOn((v) => !v)}
              tone="navy"
            />
          </div>
        </Card>

        {/* Downtime */}
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy/10 text-navy flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{t("downtime", lang)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{lang === "ar" ? "إيقاف كامل لفترة محددة" : "Full pause for a defined period"}</div>
            </div>
          </div>
          <Switch checked={downtimeOn} onCheckedChange={setDowntimeOn} />
        </Card>

        {/* Request extension */}
        <Card className="bg-accent border-trust/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-trust/15 text-trust flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{t("requestMoreTime", lang)}</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {lang === "ar"
                  ? "عند انتهاء الوقت، يمكن للطفل طلب وقت إضافي مرتبط بالتطبيق، يظهر لك للقبول أو الرفض ويُسجَّل في سجل التدقيق."
                  : "When time runs out, the child can request extra time tied to the app; you can approve or reject, and it's recorded in the audit log."}
              </p>
            </div>
          </div>
        </Card>

        {/* Pending extension requests */}
        {child && extensionRequests.filter((er) => er.childId === child.id).length > 0 && (
          <div>
            <SectionTitle title={lang === "ar" ? "طلبات وقت إضافي" : "Extension requests"} />
            <div className="space-y-2">
              {extensionRequests
                .filter((er) => er.childId === child.id)
                .map((er) => {
                  const locale = lang === "ar" ? ar : enUS;
                  return (
                    <Card key={er.id} className={cn(er.status === "pending" && "border-amber/40 bg-amber/5")}>
                      <div className="flex items-start gap-3">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                          er.status === "pending" ? "bg-amber/15 text-amber" : er.status === "approved" ? "bg-emerald/15 text-emerald" : "bg-slate/15 text-slate")}>
                          <AlarmClock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                            {er.appName ? `${er.appName} · ` : ""}{er.requestedMinutes} {lang === "ar" ? "دقيقة" : "min"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 ltr-nums">
                            {formatDistanceToNow(new Date(er.requestedAt), { addSuffix: true, locale })}
                          </div>
                          {er.status === "pending" ? (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => decideExtension(er.id, "rejected")}
                                className="h-8 text-coral border-coral/40 hover:bg-coral/10"
                              >
                                <X className="w-3.5 h-3.5 me-1.5" />
                                {t("reject", lang)}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => decideExtension(er.id, "approved")}
                                className="h-8 bg-emerald text-white hover:bg-emerald/90"
                              >
                                <Check className="w-3.5 h-3.5 me-1.5" />
                                {t("approve", lang)}
                              </Button>
                            </div>
                          ) : (
                            <div className={cn("text-xs font-medium mt-2 inline-flex items-center gap-1",
                              er.status === "approved" ? "text-emerald" : "text-slate")}>
                              {er.status === "approved" ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              {er.status === "approved" ? (lang === "ar" ? "تم القبول" : "Approved") : (lang === "ar" ? "تم الرفض" : "Rejected")}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone: "trust" | "emerald" | "coral" }) {
  const toneCls = {
    trust: "bg-trust/10 text-trust",
    emerald: "bg-emerald/10 text-emerald",
    coral: "bg-coral/10 text-coral",
  }[tone];
  return (
    <div className="bg-muted/40 rounded-lg p-3 text-center">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-sm font-bold ltr-nums inline-flex items-center px-1.5 py-0.5 rounded", toneCls)}>
        {value}
      </div>
    </div>
  );
}

function OptionRow({
  icon,
  label,
  desc,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full p-3 rounded-lg border-2 text-start transition-all flex items-center gap-3",
        selected ? "border-trust bg-trust/5" : "border-border hover:border-trust/30",
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", selected ? "bg-trust text-white" : "bg-muted text-muted-foreground")}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-semibold", selected ? "text-trust" : "text-foreground")}>{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", selected ? "border-trust" : "border-border")}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-trust" />}
      </div>
    </button>
  );
}

function RoutineRow({
  icon,
  name,
  time,
  desc,
  on,
  onToggle,
  tone,
}: {
  icon: React.ReactNode;
  name: string;
  time: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  tone: "amber" | "navy";
}) {
  const toneCls = {
    amber: "bg-amber/10 text-amber",
    navy: "bg-navy/10 text-navy",
  }[tone];
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", toneCls)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground ltr-nums">{time}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <Switch checked={on} onCheckedChange={onToggle} />
    </div>
  );
}
