"use client";

import { Loader2, Inbox, AlertTriangle, WifiOff, ShieldOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function LoadingState({ label }: { label?: string }) {
  const lang = useStore((s) => s.lang);
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Loader2 className="w-8 h-8 text-trust animate-spin" />
      <p className="text-sm text-muted-foreground">{label ?? t("loading", lang)}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-trust">
        {icon ?? <Inbox className="w-8 h-8" />}
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-2 bg-trust text-white hover:bg-trust/90"
          size="lg"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const lang = useStore((s) => s.lang);
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-coral/10 flex items-center justify-center text-coral">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {title ?? t("errorTitle", lang)}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          {t("retryAgain", lang)}
        </Button>
      )}
    </div>
  );
}

export function OfflineBanner({ show }: { show: boolean }) {
  const lang = useStore((s) => s.lang);
  if (!show) return null;
  return (
    <div className="bg-amber/10 border-b border-amber/30 px-4 py-2 flex items-center justify-center gap-2 text-amber text-xs font-medium">
      <WifiOff className="w-4 h-4" />
      <span>{t("offline", lang)}</span>
    </div>
  );
}

export function PermissionDeniedState({
  feature,
  onEnable,
}: {
  feature: string;
  onEnable?: () => void;
}) {
  const lang = useStore((s) => s.lang);
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-slate/10 flex items-center justify-center text-slate">
        <ShieldOff className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{feature}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {t("permissionDenied", lang)}
      </p>
      {onEnable && (
        <Button onClick={onEnable} className="mt-2 bg-trust text-white hover:bg-trust/90">
          {t("enable", lang)}
        </Button>
      )}
    </div>
  );
}

export function StateWrap({
  loading,
  error,
  empty,
  children,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState description={error} />;
  if (empty)
    return <EmptyState title="—" description="" />;
  return <>{children}</>;
}
