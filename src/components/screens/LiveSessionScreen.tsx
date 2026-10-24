"use client";

import { useEffect } from "react";
import {
  Eye,
  Mic,
  Phone,
  PhoneOff,
  Loader2,
  ShieldAlert,
  XCircle,
  Video,
  Wifi,
} from "lucide-react";
import { useStore, useSelectedChild } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LiveSession } from "@/lib/types";

const KIND_META: Record<LiveSession["kind"], { ar: string; en: string; icon: typeof Eye; tone: "coral" | "trust" | "amber" }> = {
  screen_view: { ar: "مشاهدة الشاشة الحية", en: "Live Screen View", icon: Eye, tone: "coral" },
  voice_call: { ar: "مكالمة صوتية", en: "Voice Call", icon: Phone, tone: "trust" },
  ambient_audio: { ar: "جلسة صوت المحيط", en: "Ambient Audio", icon: Mic, tone: "amber" },
};

const STATUS_META: Record<LiveSession["status"], { ar: string; en: string; tone: "amber" | "emerald" | "coral" | "slate" }> = {
  requested: { ar: "جارٍ الطلب...", en: "Requesting...", tone: "amber" },
  active: { ar: "الجلسة نشطة", en: "Session active", tone: "emerald" },
  ended: { ar: "انتهت الجلسة", en: "Session ended", tone: "slate" },
  failed: { ar: "فشل", en: "Failed", tone: "coral" },
  permission_required: { ar: "يلزم إذن النظام", en: "System permission required", tone: "amber" },
  not_supported: { ar: "غير مدعومة على هذا الجهاز", en: "Not supported on this device", tone: "slate" },
};

export function LiveSessionScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const child = useSelectedChild();
  const startLiveSession = useStore((s) => s.startLiveSession);
  const endLiveSession = useStore((s) => s.endLiveSession);
  const liveSessions = useStore((s) => s.family.liveSessions);
  const confirmDialog = useStore((s) => s.confirmDialog);

  const childSessions = child ? liveSessions.filter((s) => s.childId === child.id) : [];
  const activeSession = childSessions.find((s) => s.status === "active" || s.status === "requested");
  const device = child?.devices[0];

  // Auto-end requested session after 5 min if still active (simulated)
  useEffect(() => {
    if (!activeSession || activeSession.status !== "requested") return;
    const t = setTimeout(() => {}, 5000);
    return () => clearTimeout(t);
  }, [activeSession]);

  const startSession = (kind: LiveSession["kind"]) => {
    if (!child) return;
    const supported =
      kind === "screen_view"
        ? device?.capabilities.mediaProjection
        : device?.capabilities.microphone;

    if (!supported) {
      confirmDialog({
        title: KIND_META[kind][lang],
        body: lang === "ar"
          ? "هذه الميزة غير مدعومة على هذا الجهاز. على Android يتطلب MediaProjection، وعلى iOS لا يمكن الوصول الكامل للشاشة عن بُعد."
          : "This feature is not supported on this device. On Android requires MediaProjection; on iOS remote full-screen access is unavailable.",
        confirmLabel: t("close", lang),
        onConfirm: () => {},
      });
      return;
    }

    confirmDialog({
      title: KIND_META[kind][lang],
      body: t("sensitiveFeatureNote", lang),
      confirmLabel: t("sessionRequested", lang),
      onConfirm: () => startLiveSession(child.id, kind),
    });
  };

  return (
    <div className="min-h-screen pb-24">
      <Header
        title={t("liveScreenView", lang)}
        subtitle={child?.name}
        onBack={() => go("childProfile")}
      />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Privacy notice */}
        <Card className="bg-coral/5 border-coral/30">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-coral shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              {t("sensitiveFeatureNote", lang)}
            </p>
          </div>
        </Card>

        {/* Active session */}
        {activeSession && (
          <Card className={cn(
            "border-2",
            activeSession.status === "active" ? "border-emerald/40 bg-emerald/5" : "border-amber/40 bg-amber/5",
          )}>
            <div className="flex items-start gap-3">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                activeSession.status === "active" ? "bg-emerald/15 text-emerald" : "bg-amber/15 text-amber")}>
                {activeSession.status === "requested" ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  (() => {
                    const Icon = KIND_META[activeSession.kind].icon;
                    return <Icon className="w-6 h-6" />;
                  })()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-foreground">
                  {KIND_META[activeSession.kind][lang]}
                </div>
                <div className={cn("text-xs font-medium mt-1",
                  STATUS_META[activeSession.status].tone === "emerald" ? "text-emerald" :
                  STATUS_META[activeSession.status].tone === "amber" ? "text-amber" :
                  STATUS_META[activeSession.status].tone === "coral" ? "text-coral" : "text-slate")}>
                  {STATUS_META[activeSession.status][lang]}
                </div>
                {activeSession.status === "active" && (
                  <>
                    {/* Mock live preview area */}
                    <div className="mt-3 aspect-video bg-navy rounded-lg relative overflow-hidden flex items-center justify-center">
                      {activeSession.kind === "screen_view" ? (
                        <>
                          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                          <Video className="w-8 h-8 text-white/40" />
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-coral text-white text-[10px] px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            LIVE
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-white/70">
                          <Mic className="w-6 h-6" />
                          <span className="text-xs">{lang === "ar" ? "جارٍ الاستماع..." : "Listening..."}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Wifi className="w-3.5 h-3.5 text-emerald" />
                      <span>{lang === "ar" ? "جودة الاتصال: جيدة" : "Connection quality: Good"}</span>
                    </div>
                  </>
                )}
                {activeSession.status === "requested" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {lang === "ar" ? "بانتظار موافقة نظام التشغيل والجهاز..." : "Waiting for OS consent and device..."}
                  </p>
                )}
              </div>
              {activeSession.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => endLiveSession(activeSession.id)}
                  className="h-9 text-coral border-coral/40 hover:bg-coral/10 shrink-0"
                >
                  <PhoneOff className="w-4 h-4 me-1.5" />
                  {t("close", lang)}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Available sessions */}
        <div>
          <SectionTitle title={lang === "ar" ? "بدء جلسة جديدة" : "Start a new session"} />
          <div className="space-y-2">
            {(Object.keys(KIND_META) as LiveSession["kind"][]).map((kind) => {
              const meta = KIND_META[kind];
              const Icon = meta.icon;
              const supported =
                kind === "screen_view"
                  ? device?.capabilities.mediaProjection
                  : device?.capabilities.microphone;
              const disabled = !!activeSession;
              return (
                <button
                  key={kind}
                  onClick={() => !disabled && startSession(kind)}
                  disabled={disabled}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 text-start transition-all flex items-center gap-3",
                    disabled
                      ? "border-border bg-muted opacity-60 cursor-not-allowed"
                      : "border-border hover:border-trust/40 active:scale-[0.99]",
                  )}
                >
                  <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0",
                    `bg-${meta.tone}/10 text-${meta.tone}`)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{meta[lang]}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {!supported
                        ? t("notSupportedOnDevice", lang)
                        : kind === "screen_view"
                        ? lang === "ar" ? "يتطلب MediaProjection وإذن النظام" : "Requires MediaProjection and OS consent"
                        : lang === "ar" ? "يتطلب إذن الميكروفون" : "Requires microphone permission"}
                    </div>
                  </div>
                  {!supported && <XCircle className="w-4 h-4 text-slate" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Session history */}
        {childSessions.length > 0 && (
          <div>
            <SectionTitle title={lang === "ar" ? "سجل الجلسات" : "Session history"} />
            <Card className="!p-0 overflow-hidden">
              {childSessions.slice(0, 6).map((s, i, arr) => {
                const meta = KIND_META[s.kind];
                const Icon = meta.icon;
                const stMeta = STATUS_META[s.status];
                return (
                  <div key={s.id} className={cn("flex items-center gap-3 px-4 py-3", i !== arr.length - 1 && "border-b border-border")}>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      stMeta.tone === "emerald" ? "bg-emerald/15 text-emerald" :
                      stMeta.tone === "amber" ? "bg-amber/15 text-amber" :
                      stMeta.tone === "coral" ? "bg-coral/15 text-coral" : "bg-slate/15 text-slate")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground">{meta[lang]}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 ltr-nums">
                        {s.startedAt ? new Date(s.startedAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US") : "—"}
                      </div>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                      stMeta.tone === "emerald" ? "bg-emerald/15 text-emerald" :
                      stMeta.tone === "amber" ? "bg-amber/15 text-amber" :
                      stMeta.tone === "coral" ? "bg-coral/15 text-coral" : "bg-slate/15 text-slate")}>
                      {stMeta[lang]}
                    </span>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed pt-2">
          {lang === "ar"
            ? "لا يُضاف التحكم عن بُعد باللمسات ضمن هذه المرحلة. كل جلسة مسجّلة في سجل التدقيق مع مدتها وحالتها."
            : "No remote touch control is added at this stage. Every session is recorded in the audit log with its duration and status."}
        </p>
      </div>
    </div>
  );
}
