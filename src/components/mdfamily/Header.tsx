"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

/** App-style header with optional back button. */
export function Header({ title, subtitle, onBack, right }: HeaderProps) {
  const lang = useStore((s) => s.lang);
  const Back = lang === "ar" ? ChevronRight : ChevronLeft;

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border safe-header">
      <div className="px-3 sm:px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="back"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent text-foreground transition-colors shrink-0"
          >
            <Back className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}

interface SectionTitleProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionTitle({ title, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-3 mt-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {action}
    </div>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-xl p-4 shadow-sm",
        onClick && "cursor-pointer hover:border-trust/40 transition-colors active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </div>
  );
}
