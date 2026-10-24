"use client";

import { cn } from "@/lib/utils";
import type { SafetySeverity, WebAction } from "@/lib/types";

export function SeverityPill({ severity }: { severity: SafetySeverity }) {
  const cfg: Record<SafetySeverity, { cls: string; ar: string }> = {
    low: { cls: "bg-emerald/15 text-emerald", ar: "منخفضة" },
    medium: { cls: "bg-amber/15 text-amber", ar: "متوسطة" },
    high: { cls: "bg-coral/15 text-coral", ar: "عالية" },
    critical: { cls: "bg-coral text-white", ar: "حرجة" },
  };
  const c = cfg[severity];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", c.cls)}>
      {c.ar}
    </span>
  );
}

export function ActionPill({ action }: { action: WebAction }) {
  const cfg: Record<WebAction, { cls: string; ar: string }> = {
    allow: { cls: "bg-emerald/15 text-emerald", ar: "سماح" },
    alert: { cls: "bg-amber/15 text-amber", ar: "تنبيه" },
    block: { cls: "bg-coral/15 text-coral", ar: "حظر" },
  };
  const c = cfg[action];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", c.cls)}>
      {c.ar}
    </span>
  );
}

export function ConfidencePill({ confidence }: { confidence: "low" | "medium" | "high" }) {
  const cfg = {
    low: { cls: "bg-slate/15 text-slate", label: "منخفضة" },
    medium: { cls: "bg-amber/15 text-amber", label: "متوسطة" },
    high: { cls: "bg-emerald/15 text-emerald", label: "عالية" },
  };
  const c = cfg[confidence];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", c.cls)}>
      {c.label}
    </span>
  );
}

export function ClassificationPill({ kind }: { kind: "safe" | "adult" }) {
  const cls =
    kind === "safe"
      ? "bg-emerald/15 text-emerald"
      : "bg-coral/15 text-coral";
  const ar = kind === "safe" ? "آمن" : "للبالغين";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", cls)}>
      {ar}
    </span>
  );
}

export function ProgressRing({
  pct,
  size = 64,
  stroke = 6,
  color = "var(--trust)",
  label,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{label}</div>
    </div>
  );
}
