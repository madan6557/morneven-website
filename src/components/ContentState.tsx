import { AlertTriangle, Inbox, Loader2, type LucideIcon, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ContentStateKind = "loading" | "empty" | "error";
type ContentStateTone = "default" | "warning" | "danger";

type ContentStateProps = {
  kind: ContentStateKind;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
  tone?: ContentStateTone;
};

const toneClassMap: Record<ContentStateTone, string> = {
  default: "text-primary",
  warning: "text-accent-orange",
  danger: "text-destructive",
};

const iconMap: Record<ContentStateKind, LucideIcon> = {
  loading: Loader2,
  empty: Inbox,
  error: WifiOff,
};

export function ContentState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact = false,
  tone,
}: ContentStateProps) {
  const resolvedTone = tone ?? (kind === "error" ? "danger" : "default");
  const Icon = iconMap[kind];

  return (
    <div
      className={cn(
        "hud-border-sm bg-background/55 text-center",
        compact ? "space-y-3 p-4" : "space-y-4 p-5",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-current/20 bg-current/5",
          toneClassMap[resolvedTone],
        )}
      >
        <Icon className={cn("h-4 w-4", kind === "loading" && "animate-spin")} />
      </div>

      <div className="space-y-1.5">
        <p className="font-heading text-sm tracking-[0.12em] text-foreground uppercase">{title}</p>
        <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      {actionLabel && onAction && (
        <Button
          type="button"
          size="sm"
          variant={resolvedTone === "danger" ? "destructive" : "outline"}
          onClick={onAction}
        >
          {resolvedTone === "warning" ? <AlertTriangle className="h-4 w-4" /> : null}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
