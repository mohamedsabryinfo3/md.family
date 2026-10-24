"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, RefreshCw, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { apiActions } from "@/lib/api-actions";
import { t } from "@/lib/i18n";
import { Header, Card } from "@/components/mdfamily/Header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PairingScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const session = useStore((s) => s.pairingSession);
  const simulateVerify = useStore((s) => s.simulatePairingVerify);
  const finishPairing = useStore((s) => s.finishPairing);
  const child = useStore((s) =>
    s.family.children.find((c) => c.id === session?.childId),
  );

  // When scanning -> verifying, automatically run the verify step.
  // (this is for mock mode; in real backend mode, api-actions handles everything)
  useEffect(() => {
    if (session?.status === "verifying") {
      simulateVerify();
    }
  }, [session?.status, simulateVerify]);

  if (!session) {
    return (
      <div className="min-h-screen pb-24">
        <Header title={t("pairDevice", lang)} onBack={() => go("childProfile")} />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد جلسة اقتران نشطة." : "No active pairing session."}</p>
            <Button onClick={() => go("childProfile")} className="mt-3 bg-trust text-white">
              {t("back", lang)}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const expiresInSeconds = Math.max(
    0,
    Math.round((new Date(session.expiresAt).getTime() - Date.now()) / 1000),
  );

  // Render QR placeholder — a simple visual block representing the code.
  const renderQR = () => {
    // Pseudo-random 21x21 grid deterministically derived from the code
    const size = 21;
    const cells: boolean[] = [];
    let seed = 0;
    for (let i = 0; i < session.code.length; i++) seed = (seed * 31 + session.code.charCodeAt(i)) >>> 0;
    for (let i = 0; i < size * size; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      cells.push(((seed >> 16) & 1) === 1);
    }
    // Force corners (finder patterns)
    const isFinder = (r: number, c: number) => {
      const inBox = (br: number, bc: number) =>
        r >= br && r < br + 7 && c >= bc && c < bc + 7;
      return inBox(0, 0) || inBox(0, size - 7) || inBox(size - 7, 0);
    };
    const isFinderDark = (r: number, c: number) => {
      const box = (br: number, bc: number) => {
        if (r < br || r >= br + 7 || c < bc || c >= bc + 7) return null;
        const lr = r - br;
        const lc = c - bc;
        if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
        if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
        return false;
      };
      return box(0, 0) ?? box(0, size - 7) ?? box(size - 7, 0) ?? false;
    };

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="w-56 h-56 bg-white p-2 rounded-xl" shapeRendering="crispEdges">
        {Array.from({ length: size }).map((_, r) =>
          Array.from({ length: size }).map((__, c) => {
            const dark = isFinder(r, c) ? isFinderDark(r, c) : cells[r * size + c];
            return dark ? (
              <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0A192F" />
            ) : null;
          }),
        )}
      </svg>
    );
  };

  const status = session.status;
  const stateInfo: Record<typeof status, { title: string; tone: "trust" | "amber" | "emerald" | "coral" | "slate"; Icon: typeof CheckCircle2 }> = {
    ready: { title: t("pairReady", lang), tone: "trust", Icon: RefreshCw },
    scanning: { title: t("pairScanning", lang), tone: "amber", Icon: RefreshCw },
    verifying: { title: t("pairVerifying", lang), tone: "amber", Icon: RefreshCw },
    linked: { title: t("pairLinked", lang), tone: "emerald", Icon: CheckCircle2 },
    failed: { title: t("pairFailed", lang), tone: "coral", Icon: XCircle },
    expired: { title: t("pairExpired", lang), tone: "slate", Icon: XCircle },
  };
  const si = stateInfo[status];
  const Icon = si.Icon;

  return (
    <div className="min-h-screen pb-24">
      <Header title={t("pairDevice", lang)} onBack={() => go("childProfile")} />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Status banner */}
        <Card className={cn("flex items-center gap-3", `border-${si.tone}/30 bg-${si.tone}/5`)}>
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", `bg-${si.tone}/15 text-${si.tone}`)}>
            <Icon className={cn("w-5 h-5", (status === "scanning" || status === "verifying") && "animate-spin")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-foreground">{si.title}</div>
            {child && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {lang === "ar" ? "الطفل:" : "Child:"} {child.name}
              </div>
            )}
          </div>
          {status === "ready" && expiresInSeconds > 0 && (
            <span className="text-xs text-muted-foreground ltr-nums">
              {t("pairExpiresIn", lang, { n: expiresInSeconds })}
            </span>
          )}
        </Card>

        {/* QR display */}
        {(status === "ready" || status === "scanning" || status === "verifying") && (
          <Card className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
              {t("pairSubtitle", lang)}
            </p>
            <div className="relative">
              {renderQR()}
              {(status === "scanning" || status === "verifying") && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur rounded-xl">
                  <RefreshCw className="w-10 h-10 text-trust animate-spin" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{lang === "ar" ? "الرمز:" : "Code:"}</span>
              <span className="text-2xl font-bold tracking-[0.3em] text-foreground ltr-nums">
                {session.code}
              </span>
            </div>
          </Card>
        )}

        {/* Linked success */}
        {status === "linked" && (
          <Card className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald/15 flex items-center justify-center text-emerald">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <div className="text-base font-bold text-foreground">{t("pairLinked", lang)}</div>
              {child && (
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {lang === "ar"
                    ? `تم ربط جهاز ${child.name} بنجاح وتحديث حالته في لوحة الوالد.`
                    : `${child.name}'s device was linked and the dashboard has been updated.`}
                </p>
              )}
            </div>
            <Button onClick={finishPairing} className="bg-trust text-white hover:bg-trust/90">
              {t("confirm", lang)}
            </Button>
          </Card>
        )}

        {/* Audit hint */}
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          {t("pairAuditHint", lang)}
        </p>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          {status === "ready" && (
            <Button
              onClick={() => apiActions.simulatePairingScan()}
              className="bg-trust text-white hover:bg-trust/90 col-span-2 h-11"
            >
              {lang === "ar" ? "محاكاة مسح QR من جهاز الطفل" : "Simulate QR scan from child device"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => apiActions.regeneratePairing()}
            className="h-11"
          >
            <RefreshCw className="w-4 h-4 me-2" />
            {t("pairRegenerate", lang)}
          </Button>
          <Button
            variant="outline"
            onClick={() => apiActions.cancelPairing()}
            className="h-11 text-coral border-coral/40 hover:bg-coral/10"
          >
            <X className="w-4 h-4 me-2" />
            {t("pairCancel", lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}
