"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ArrowLeft, User, QrCode, Smartphone, Bell } from "lucide-react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Slide {
  icon: typeof ShieldCheck;
  color: string;
  titleKey: string;
  bodyKey: string;
  customTitle?: string;
  customBody?: string;
}

export function SplashScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const [slide, setSlide] = useState(0);

  const slides: Slide[] = [
    {
      icon: ShieldCheck,
      color: "#005C9E",
      titleKey: "onboardingTitle1",
      bodyKey: "onboardingBody1",
    },
    {
      icon: User,
      color: "#3182CE",
      titleKey: "",
      bodyKey: "",
      customTitle: lang === "ar" ? "ابدأ كولي أمر" : "Start as Parent",
      customBody: lang === "ar"
        ? "أنشئ حساب ولي أمر جديد — هويتك محفوظة بأمان ولن تُستخدم إلا لمزامنة بيانات أسرتك."
        : "Create a new parent account — your identity is securely stored and only used to sync your family's data.",
    },
    {
      icon: QrCode,
      color: "#FF9500",
      titleKey: "",
      bodyKey: "",
      customTitle: lang === "ar" ? "اربط جهاز طفلك" : "Link Your Child's Device",
      customBody: lang === "ar"
        ? "بعد إضافة ملف الطفل، أنشئ رمز QR أحادي الاستخدام. ثبّت MD.Family على هاتف طفلك وامسح الرمز لربطه بحسابك."
        : "After adding a child profile, generate a one-time QR code. Install MD.Family on your child's phone and scan the code to link it to your account.",
    },
    {
      icon: Bell,
      color: "#34C759",
      titleKey: "",
      bodyKey: "",
      customTitle: lang === "ar" ? "استقبال التنبيهات" : "Receive Alerts",
      customBody: lang === "ar"
        ? "بعد الربط، ستصل لك تنبيهات SOS، تنبيهات السلامة، دخول/خروج المناطق الآمنة، وطلبات الوقت الإضافي مباشرة على هاتفك."
        : "Once linked, you'll receive SOS alerts, safety alerts, safe zone enter/exit, and time extension requests directly on your phone.",
    },
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  const current = slides[slide];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-trust to-navy text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Logo */}
        <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center mb-6 shadow-2xl">
          <ShieldCheck className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("appName", lang)}</h1>
        <p className="text-white/80 text-sm mt-2 max-w-xs">{t("appTagline", lang)}</p>

        {/* Carousel */}
        <div className="mt-12 w-full max-w-sm mdf-fade-in" key={slide}>
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{ backgroundColor: current.color + "33" }}
          >
            <current.icon className="w-8 h-8" style={{ color: current.color }} />
          </div>
          <div className="text-lg font-bold mb-2">
            {current.customTitle || t(current.titleKey as any, lang)}
          </div>
          <div className="text-sm text-white/80 leading-relaxed">
            {current.customBody || t(current.bodyKey as any, lang)}
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5 mt-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === slide ? "w-6 bg-white" : "w-1.5 bg-white/40",
              )}
            />
          ))}
        </div>
      </div>

      <div className="p-6 pb-10 flex flex-col gap-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2.5rem)" }}>
        <button
          onClick={() => go("login")}
          className="w-full h-12 rounded-xl bg-white text-trust font-bold text-base shadow-lg active:scale-[0.98] transition-transform"
        >
          {t("getStarted", lang)}
        </button>
        <button
          onClick={() => go("login")}
          className="w-full h-10 text-white/80 text-sm hover:text-white transition-colors"
        >
          {t("skip", lang)}
        </button>
      </div>
    </div>
  );
}
