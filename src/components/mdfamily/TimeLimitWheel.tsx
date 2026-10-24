"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MD.Family — TimeLimitWheel
 *
 * A 24-hour circular dial for setting a daily time limit.
 *  - Drag handle (or click) to set the value in 15-minute increments.
 *  - Selected arc uses Trust Blue (#005C9E); remaining arc uses Light Gray.
 *  - Active thumb uses Amber (#FF9500).
 *  - Center displays the selected duration (e.g. "1 س 30 د").
 *  - Day-of-week selector is handled by the parent screen; this wheel only owns the value.
 *  - Keyboard accessible: arrow Left/Right to step, Home/End for min/max.
 *
 * The widget receives `valueMin` (current limit in minutes) and `onChange`.
 * Range: 0 to 480 minutes (8h), step 15.
 */

export interface TimeLimitWheelProps {
  valueMin: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number; // minutes per tick
  label?: string;
  className?: string;
}

const SVG_SIZE = 240;
const RADIUS = 100;
const CENTER = SVG_SIZE / 2;

function polar(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  // Convert to SVG arc coordinates
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  // sweep=1 means clockwise in SVG
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function formatDuration(min: number, lang: "ar" | "en") {
  if (min <= 0) return lang === "ar" ? "0 د" : "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return lang === "ar" ? `${m} د` : `${m}m`;
  if (m === 0) return lang === "ar" ? `${h} س` : `${h}h`;
  return lang === "ar" ? `${h} س ${m} د` : `${h}h ${m}m`;
}

export function TimeLimitWheel({
  valueMin,
  onChange,
  min = 0,
  max = 480,
  step = 15,
  label,
  className,
}: TimeLimitWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editHours, setEditHours] = useState("");
  const [editMins, setEditMins] = useState("");
  const lang = typeof window !== "undefined" ? (document.documentElement.lang as "ar" | "en") : "ar";

  const valueClamped = Math.max(min, Math.min(max, Math.round(valueMin / step) * step));

  // Convert minutes to angle on the dial.
  // Dial starts at 12 o'clock (top) and moves clockwise.
  // Full dial represents `max` minutes (so value/max = fraction of the dial).
  const fraction = max > 0 ? valueClamped / max : 0;
  // We start at -90deg (top) and go clockwise.
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + fraction * 2 * Math.PI;

  const angleToMinutes = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return valueClamped;
      const rect = svg.getBoundingClientRect();
      const px = clientX - rect.left - rect.width / 2;
      const py = clientY - rect.top - rect.height / 2;
      // atan2: 0 at +x axis (3 o'clock). Convert so 0 is at top (-PI/2).
      let theta = Math.atan2(py, px) - startAngle;
      // Normalize to [0, 2*PI)
      while (theta < 0) theta += 2 * Math.PI;
      while (theta >= 2 * Math.PI) theta -= 2 * Math.PI;
      const f = theta / (2 * Math.PI);
      let newMin = Math.round((f * max) / step) * step;
      newMin = Math.max(min, Math.min(max, newMin));
      return newMin;
    },
    [valueClamped, min, max, step],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const m = angleToMinutes(e.clientX, e.clientY);
      if (m !== valueClamped) onChange(m);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, angleToMinutes, onChange, valueClamped]);

  // Tick marks every 15 minutes
  const ticks: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
  const totalTicks = max / step;
  for (let i = 0; i <= totalTicks; i++) {
    const angle = startAngle + (i / totalTicks) * 2 * Math.PI;
    const inner = polar(CENTER, CENTER, RADIUS - 4, angle);
    const outer = polar(CENTER, CENTER, RADIUS + (i % 4 === 0 ? 8 : 4), angle);
    ticks.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, major: i % 4 === 0 });
  }

  // Thumb position
  const thumb = polar(CENTER, CENTER, RADIUS, endAngle);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(max, valueClamped + step));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(min, valueClamped - step));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(min);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
    }
  };

  const reset = () => onChange(min);

  const startEditing = () => {
    setEditHours(String(Math.floor(valueClamped / 60)));
    setEditMins(String(valueClamped % 60));
    setEditing(true);
  };

  const confirmEdit = () => {
    const h = Math.max(0, Math.min(Math.floor(max / 60), parseInt(editHours || "0", 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(editMins || "0", 10) || 0));
    let total = h * 60 + m;
    // Snap to step
    total = Math.round(total / step) * step;
    total = Math.max(min, Math.min(max, total));
    onChange(total);
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  return (
    <div className={cn("flex flex-col items-center gap-3 select-none", className)}>
      <div className="relative" dir="ltr">
        <svg
          ref={svgRef}
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="touch-none"
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging(true);
            const m = angleToMinutes(e.clientX, e.clientY);
            if (m !== valueClamped) onChange(m);
          }}
          role="slider"
          aria-valuenow={valueClamped}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={label ?? "Daily time limit"}
          tabIndex={0}
          onKeyDown={handleKey}
        >
          {/* Background track */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={14}
          />

          {/* Selected arc */}
          {fraction > 0 && (
            <path
              d={arcPath(CENTER, CENTER, RADIUS, startAngle, endAngle)}
              fill="none"
              stroke="var(--trust)"
              strokeWidth={14}
              strokeLinecap="round"
            />
          )}

          {/* Tick marks */}
          {ticks.map((tk, i) => (
            <line
              key={i}
              x1={tk.x1}
              y1={tk.y1}
              x2={tk.x2}
              y2={tk.y2}
              stroke={tk.major ? "var(--foreground)" : "var(--muted-foreground)"}
              strokeWidth={tk.major ? 1.6 : 0.8}
              opacity={tk.major ? 0.7 : 0.35}
            />
          ))}

          {/* Center hub */}
          <circle cx={CENTER} cy={CENTER} r={62} fill="var(--card)" stroke="var(--border)" strokeWidth={1} />

          {/* Thumb */}
          <circle
            cx={thumb.x}
            cy={thumb.y}
            r={12}
            fill="var(--amber)"
            stroke="var(--card)"
            strokeWidth={3}
            className={dragging ? "transition-none" : "transition-all duration-100"}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-3xl font-bold text-foreground tabular-nums ltr-nums">
            {formatDuration(valueClamped, lang)}
          </div>
          {label && (
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        {lang === "ar" ? "إعادة ضبط" : "Reset"}
      </button>

      {/* Alternative numeric input — accessibility requirement */}
      {editing ? (
        <div className="flex items-center gap-2" dir="ltr">
          <input
            type="number"
            min={0}
            max={Math.floor(max / 60)}
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            aria-label="hours"
            className="w-14 h-9 rounded-lg border border-input bg-background px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
          />
          <span className="text-xs text-muted-foreground">h</span>
          <input
            type="number"
            min={0}
            max={59}
            value={editMins}
            onChange={(e) => setEditMins(e.target.value)}
            aria-label="minutes"
            className="w-14 h-9 rounded-lg border border-input bg-background px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
          />
          <span className="text-xs text-muted-foreground">m</span>
          <button
            onClick={confirmEdit}
            aria-label="confirm"
            className="w-9 h-9 rounded-lg bg-trust text-white flex items-center justify-center hover:bg-trust/90"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={cancelEdit}
            aria-label="cancel"
            className="w-9 h-9 rounded-lg border border-border text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="inline-flex items-center gap-1.5 text-xs text-trust hover:underline"
        >
          <Pencil className="w-3.5 h-3.5" />
          {lang === "ar" ? "إدخال رقمي" : "Numeric input"}
        </button>
      )}
    </div>
  );
}
