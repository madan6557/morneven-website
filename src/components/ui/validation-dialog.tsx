import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ValidationVariant = "error" | "warning" | "success" | "info";

export interface ValidationIssue {
  field?: string;
  message: string;
}

export interface ValidationDialogOptions {
  title?: string;
  description?: string;
  variant?: ValidationVariant;
  issues?: ValidationIssue[];
  confirmLabel?: string;
  cancelLabel?: string;
  dontShowAgainKey?: string;
  dontShowAgainLabel?: string;
  critical?: boolean;
  confirmDelaySeconds?: number;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface InternalState extends ValidationDialogOptions {
  open: boolean;
}

const variantStyles: Record<
  ValidationVariant,
  { icon: React.ReactNode; iconClass: string; ring: string }
> = {
  error: {
    icon: <XCircle className="h-5 w-5" />,
    iconClass: "text-destructive",
    ring: "ring-destructive/30 bg-destructive/10",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    iconClass: "text-[hsl(var(--warning,38_92%_50%))]",
    ring: "ring-[hsl(var(--warning,38_92%_50%))]/30 bg-[hsl(var(--warning,38_92%_50%))]/10",
  },
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    iconClass: "text-[hsl(var(--success,142_70%_45%))]",
    ring: "ring-[hsl(var(--success,142_70%_45%))]/30 bg-[hsl(var(--success,142_70%_45%))]/10",
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    iconClass: "text-primary",
    ring: "ring-primary/30 bg-primary/10",
  },
};

interface ValidationDialogContextValue {
  show: (opts: ValidationDialogOptions) => void;
  close: () => void;
}

const ValidationDialogContext = React.createContext<ValidationDialogContextValue | null>(null);

let externalShow: ((opts: ValidationDialogOptions) => void) | null = null;

/**
 * Imperative API – usable outside React components (services, utils).
 * Requires <ValidationDialogProvider /> to be mounted at the app root.
 */
export function showValidation(opts: ValidationDialogOptions) {
  if (shouldSkipDialog(opts)) {
    void opts.onConfirm?.();
    return;
  }

  if (externalShow) externalShow(opts);
  else if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn("[validation-dialog] Provider not mounted; falling back to window.alert");
    window.alert(opts.title ? `${opts.title}\n\n${opts.description ?? ""}` : opts.description ?? "");
  }
}

export function useValidationDialog() {
  const ctx = React.useContext(ValidationDialogContext);
  if (!ctx) throw new Error("useValidationDialog must be used within ValidationDialogProvider");
  return ctx;
}

export function ValidationDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<InternalState>({ open: false });
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const [secondsLeft, setSecondsLeft] = React.useState(0);

  const show = React.useCallback((opts: ValidationDialogOptions) => {
    if (shouldSkipDialog(opts)) {
      void opts.onConfirm?.();
      return;
    }
    setState({ ...opts, open: true });
    setDontShowAgain(false);
    setSecondsLeft(opts.critical ? opts.confirmDelaySeconds ?? 5 : 0);
  }, []);

  const close = React.useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  React.useEffect(() => {
    externalShow = show;
    return () => {
      if (externalShow === show) externalShow = null;
    };
  }, [show]);

  React.useEffect(() => {
    if (!state.open || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft, state.open]);

  const variant = state.variant ?? "error";
  const styles = variantStyles[variant];
  const showCancel = !!state.cancelLabel;

  return (
    <ValidationDialogContext.Provider value={{ show, close }}>
      {children}
      <AlertDialog
        open={state.open}
        onOpenChange={(o) => {
          if (!o) {
            state.onCancel?.();
            close();
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
                  styles.ring,
                  styles.iconClass,
                )}
                aria-hidden
              >
                {styles.icon}
              </div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="font-heading">
                  {state.title ?? defaultTitle(variant)}
                </AlertDialogTitle>
                {state.description && (
                  <AlertDialogDescription className="mt-1 font-body">
                    {state.description}
                  </AlertDialogDescription>
                )}
              </div>
            </div>
          </AlertDialogHeader>

          {state.issues && state.issues.length > 0 && (
            <ul className="mt-2 max-h-56 overflow-y-auto rounded-sm border border-border bg-muted/30 p-3 space-y-1.5 font-body text-xs">
              {state.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", styles.iconClass)} />
                  <span>
                    {issue.field && (
                      <span className="font-medium text-foreground">{issue.field}: </span>
                    )}
                    <span className="text-muted-foreground">{issue.message}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <AlertDialogFooter>
            {state.dontShowAgainKey && !state.critical && (
              <label className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(event) => setDontShowAgain(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {state.dontShowAgainLabel ?? "Don't show this again"}
              </label>
            )}
            {showCancel && (
              <AlertDialogCancel
                onClick={() => {
                  state.onCancel?.();
                }}
              >
                {state.cancelLabel}
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              disabled={secondsLeft > 0}
              onClick={async () => {
                if (secondsLeft > 0) return;
                if (state.dontShowAgainKey && dontShowAgain && !state.critical) {
                  setSuppressed(state.dontShowAgainKey);
                }
                await state.onConfirm?.();
              }}
            >
              {secondsLeft > 0
                ? `${state.confirmLabel ?? "OK"} (${secondsLeft})`
                : state.confirmLabel ?? "OK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ValidationDialogContext.Provider>
  );
}

function shouldSkipDialog(opts: ValidationDialogOptions) {
  if (!opts.dontShowAgainKey || opts.critical) return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(suppressionKey(opts.dontShowAgainKey)) === "true";
  } catch {
    return false;
  }
}

function setSuppressed(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(suppressionKey(key), "true");
  } catch {
    // ignore
  }
}

function suppressionKey(key: string) {
  return `morneven_validation_suppressed_${key}`;
}

function defaultTitle(variant: ValidationVariant) {
  switch (variant) {
    case "error":
      return "Validation failed";
    case "warning":
      return "Heads up";
    case "success":
      return "Success";
    case "info":
      return "Notice";
  }
}

/**
 * Convenience helper that maps a ZodError-like issues list to the dialog.
 */
export function showZodValidation(error: {
  issues?: Array<{ path?: (string | number)[]; message: string }>;
}, opts: Partial<ValidationDialogOptions> = {}) {
  const issues: ValidationIssue[] =
    error.issues?.map((i) => ({
      field: i.path && i.path.length ? i.path.join(".") : undefined,
      message: i.message,
    })) ?? [];
  showValidation({
    variant: "error",
    title: "Please fix the following",
    issues,
    ...opts,
  });
}
