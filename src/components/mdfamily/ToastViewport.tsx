"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Toast viewport — stacked at top of screen, RTL-aware. */
export function ToastViewport() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const lang = useStore((s) => s.lang);

  return (
    <div
      aria-live="polite"
      className={cn(
        "fixed top-3 inset-x-3 z-[200] flex flex-col gap-2 pointer-events-none",
        lang === "ar" ? "items-end" : "items-start",
      )}
    >
      {toasts.map((t) => {
        const Icon =
          t.variant === "success"
            ? CheckCircle2
            : t.variant === "error"
            ? XCircle
            : t.variant === "warning"
            ? AlertTriangle
            : Info;
        const color =
          t.variant === "success"
            ? "text-emerald"
            : t.variant === "error"
            ? "text-coral"
            : t.variant === "warning"
            ? "text-amber"
            : "text-trust";
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto max-w-sm w-full rounded-xl border bg-card shadow-lg p-3 mdf-fade-in",
              "flex items-start gap-2.5",
            )}
            role="status"
          >
            <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", color)} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">{t.title}</div>
              {t.description && (
                <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
              )}
            </div>
            <button
              type="button"
              aria-label="close"
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
