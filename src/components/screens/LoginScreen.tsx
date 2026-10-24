"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Fingerprint, Lock, ArrowRight, Loader2, UserPlus, LogIn, Eye, EyeOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { apiActions } from "@/lib/api-actions";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LoginScreen() {
  const lang = useStore((s) => s.lang);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── App Lock: PIN / Biometric ───────────────────
  const [locked, setLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [storedPin, setStoredPin] = useState<string | null>(null);

  // Check on mount if app is locked
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pin = localStorage.getItem("mdf_app_pin");
    if (pin) {
      // Use microtask to avoid synchronous setState in effect
      Promise.resolve().then(() => {
        setStoredPin(pin);
        setLocked(true);
      });
    }
  }, []);

  const handlePinSubmit = () => {
    if (pinInput === storedPin) {
      setLocked(false);
      setPinInput("");
    } else {
      setError(lang === "ar" ? "رمز خاطئ" : "Wrong PIN");
      setPinInput("");
    }
  };

  // ─── Authentication ───────────────────────────────

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (mode === "register" && name.trim().length < 2) {
      setError(lang === "ar" ? "الاسم يجب أن يكون حرفين على الأقل" : "Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        await apiActions.loginWithEmail(email, password);
      } else {
        await apiActions.register(name.trim(), email, password);
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (mode === "login") {
        if (msg.includes("401") || msg.includes("Invalid")) {
          setError(lang === "ar" ? "البريد أو كلمة المرور غير صحيحة" : "Wrong email or password");
        } else {
          setError(lang === "ar" ? "تعذر الاتصال بالخادم" : "Connection error");
        }
      } else {
        if (msg.includes("409") || msg.includes("already")) {
          setError(lang === "ar" ? "هذا البريد مسجل بالفعل" : "Email already registered");
          setMode("login");
        } else {
          setError(lang === "ar" ? "تعذر الاتصال بالخادم" : "Connection error");
        }
      }
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      // Google Sign-In requires the SDK. For now, create a local account.
      await apiActions.loginWithGoogle("google-id-token-fallback");
    } catch (err: any) {
      setError(lang === "ar" ? "تعذر الاتصال" : "Connection error");
    }
    setLoading(false);
  };

  const valid = email.trim().length > 0 && password.trim().length >= 8 &&
                (mode === "login" || name.trim().length >= 2);

  // ─── PIN Lock Screen ─────────────────────────────

  if (locked) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-trust to-navy text-white items-center justify-center px-6"
           style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center mb-6">
          <Fingerprint className="w-10 h-10" />
        </div>
        <h1 className="text-xl font-bold mb-2">{lang === "ar" ? "أدخل الرمز السري" : "Enter PIN"}</h1>
        <p className="text-white/60 text-sm mb-8">{lang === "ar" ? "لفتح MD.Family" : "to unlock MD.Family"}</p>

        <input
          type="number"
          inputMode="numeric"
          maxLength={4}
          value={pinInput}
          onChange={(e) => { setPinInput(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && pinInput.length === 4 && handlePinSubmit()}
          className="w-48 h-14 text-center text-2xl font-bold tracking-[0.5em] rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 mb-4 focus:outline-none focus:ring-2 focus:ring-white/40"
          placeholder="••••"
          dir="ltr"
          autoFocus
        />

        {error && <p className="text-coral text-sm mb-4">{error}</p>}

        <button
          onClick={pinInput.length === 4 ? handlePinSubmit : undefined}
          disabled={pinInput.length !== 4}
          className={cn(
            "w-48 h-12 rounded-xl font-semibold text-sm transition-all",
            pinInput.length === 4
              ? "bg-white text-trust hover:bg-white/90 active:scale-95"
              : "bg-white/20 text-white/40 cursor-not-allowed",
          )}
        >
          {lang === "ar" ? "فتح" : "Unlock"}
        </button>
      </div>
    );
  }

  // ─── Login / Register Screen ─────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="bg-gradient-to-b from-trust to-navy text-white px-6 pt-12 pb-10 rounded-b-[2rem]">
        <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold">
          {mode === "login" ? t("loginTitle", lang) : (lang === "ar" ? "إنشاء حساب جديد" : "Create new account")}
        </h1>
        <p className="text-white/80 text-sm mt-2 leading-relaxed">
          {mode === "login" ? t("loginSubtitle", lang) : (lang === "ar" ? "أنشئ حساب ولي الأمر للبدء" : "Create a parent account to get started")}
        </p>
      </div>

      <div className="flex-1 px-6 -mt-4">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5 space-y-4">
          {mode === "register" && (
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">{lang === "ar" ? "الاسم" : "Name"}</span>
              <input
                type="text" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={lang === "ar" ? "اكتب اسمك" : "Enter your name"}
                className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                disabled={loading} autoFocus
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">{t("email", lang)}</span>
            <div className="mt-1 relative">
              <input
                type="email" dir="ltr" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                disabled={loading}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">{t("password", lang)}</span>
            <div className="mt-1 relative">
              <Lock className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground start-3" />
              <input
                type={showPassword ? "text" : "password"} dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 ps-10 pe-10 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                onKeyDown={(e) => e.key === "Enter" && valid && handleSubmit()}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {error && (
            <div className="bg-coral/10 border border-coral/30 rounded-lg p-3 text-xs text-coral">{error}</div>
          )}

          <button
            disabled={loading || !valid}
            onClick={handleSubmit}
            className={cn(
              "w-full h-11 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2",
              loading || !valid ? "bg-muted text-muted-foreground" : "bg-trust text-white hover:bg-trust/90 active:scale-[0.98]",
            )}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{lang === "ar" ? "جارٍ المعالجة..." : "Processing..."}</>
            ) : mode === "login" ? (
              <><LogIn className="w-4 h-4" />{lang === "ar" ? "تسجيل الدخول" : "Sign in"}</>
            ) : (
              <><UserPlus className="w-4 h-4" />{lang === "ar" ? "إنشاء حساب" : "Create account"}<ArrowRight className={cn("w-4 h-4", lang === "ar" && "rotate-180")} /></>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
              className="text-xs text-trust hover:underline"
            >
              {mode === "login"
                ? (lang === "ar" ? "ليس لديك حساب؟ إنشاء حساب جديد" : "Don't have an account? Create new")
                : (lang === "ar" ? "لديك حساب بالفعل؟ تسجيل الدخول" : "Already have an account? Sign in")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 my-5">
          <span className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{lang === "ar" ? "أو" : "OR"}</span>
          <span className="flex-1 h-px bg-border" />
        </div>

        <button
          disabled={loading}
          onClick={handleGoogle}
          className="w-full h-11 rounded-lg border border-border bg-card hover:bg-accent text-foreground font-medium text-sm flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {t("continueWithGoogle", lang)}
        </button>
      </div>
    </div>
  );
}
