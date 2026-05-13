import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  KeyRound,
} from "lucide-react";

import { ContentState } from "@/components/ContentState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { showValidation } from "@/components/ui/validation-dialog";
import {
  listPasswordResetRequests,
  reviewPasswordResetRequest,
  type PasswordResetRequestRecord,
} from "@/services/accountApi";
import { cn } from "@/lib/utils";

type ReviewDraft = {
  status: "approved" | "rejected";
  reviewNote: string;
};

const PAGE_SIZE = 6;

const inputClass =
  "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:ring-1 focus:ring-primary";

function statusLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function toUserFacingError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (error.message === "Failed to fetch") return "Network request failed.";
  return error.message || fallback;
}

interface Props {
  enabled: boolean;
}

export default function PasswordResetReviewPanel({ enabled }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PasswordResetRequestRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listPasswordResetRequests();
      setRequests(items);
      setDrafts((current) => {
        const next = { ...current };
        items.forEach((item) => {
          next[item.id] ??= { status: "approved", reviewNote: "" };
        });
        return next;
      });
    } catch (err) {
      setRequests([]);
      setError(toUserFacingError(err, "Password reset requests could not be loaded."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setRequests([]);
      setDrafts({});
      setLoading(false);
      setError(null);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "pending").length,
    [requests],
  );
  const completedCount = useMemo(
    () => requests.filter((item) => item.status === "completed").length,
    [requests],
  );

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return requests.slice(start, start + PAGE_SIZE);
  }, [requests, page]);

  const updateDraft = (id: string, patch: Partial<ReviewDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        status: "approved",
        reviewNote: "",
        ...current[id],
        ...patch,
      },
    }));
  };

  const runWithFeedback = async (
    key: string,
    action: () => Promise<void>,
    successTitle: string,
    failureTitle: string,
  ) => {
    if (busyAction) return;
    setBusyAction(key);
    try {
      await action();
      toast({ title: successTitle });
    } catch (err) {
      toast({
        title: failureTitle,
        description: toUserFacingError(err, "The request could not be completed."),
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleReview = async (request: PasswordResetRequestRecord) => {
    const draft = drafts[request.id] ?? { status: "approved" as const, reviewNote: "" };
    const reviewed = await reviewPasswordResetRequest(request.id, {
      status: draft.status,
      reviewNote: draft.reviewNote.trim() || undefined,
    });
    setRequests((current) => current.map((item) => (item.id === reviewed.id ? reviewed : item)));
    setDrafts((current) => ({
      ...current,
      [request.id]: { status: "approved", reviewNote: "" },
    }));
  };

  if (!enabled) {
    return (
      <ContentState
        kind="empty"
        title="Restricted"
        description="Password reset review requires PL7 author or admin clearance."
        compact
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="hud-border bg-card/95 p-4 md:p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-background/60 text-accent-orange">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm uppercase tracking-[0.18em] text-primary">
                Password Reset Review
              </p>
              <p className="text-xs text-muted-foreground">
                Manual recovery requests from personnel without email path access.
              </p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric icon={Inbox} label="Total requests" value={requests.length} />
          <Metric icon={AlertTriangle} label="Pending review" value={pendingCount} />
          <Metric icon={CheckCircle2} label="Completed" value={completedCount} />
        </div>
      </div>

      {loading ? (
        <ContentState
          kind="loading"
          title="Loading password reset requests"
          description="Fetching account recovery requests for reviewer action."
          compact
        />
      ) : error ? (
        <ContentState
          kind="error"
          title="Password reset review unavailable"
          description={error}
          actionLabel="Retry"
          onAction={() => void load()}
          compact
        />
      ) : requests.length === 0 ? (
        <ContentState
          kind="empty"
          title="No password reset requests"
          description="Manual account recovery requests will appear here for review."
          compact
        />
      ) : (
        <div className="space-y-2">
          <ul className="space-y-2">
            {pageItems.map((request) => {
              const draft = drafts[request.id] ?? { status: "approved" as const, reviewNote: "" };
              const isOpen = expanded === request.id;
              const requiresCriticalConfirm = draft.status === "approved";
              const targetStatus = request.targetUser?.status ?? "unknown";
              return (
                <li key={request.id} className="rounded-sm border border-border bg-background/45">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : request.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-background/70"
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-heading text-sm tracking-[0.1em] text-foreground uppercase truncate">
                          {request.username}
                        </p>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-sm border px-2 py-0.5 text-[10px] font-display tracking-wider uppercase",
                            request.status === "approved" || request.status === "completed"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : request.status === "rejected"
                                ? "border-muted bg-muted/20 text-muted-foreground"
                                : "border-accent-orange/40 bg-accent-orange/10 text-accent-orange",
                          )}
                        >
                          {statusLabel(request.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {request.email} · {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-4 border-t border-border/60 px-4 py-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2 text-sm">
                          <p className="text-muted-foreground">
                            Account role:{" "}
                            <span className="text-foreground">
                              {statusLabel(request.targetUser?.role ?? "unknown")}
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            Clearance:{" "}
                            <span className="text-foreground">L{request.targetUser?.level ?? "?"}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Track:{" "}
                            <span className="text-foreground">{request.targetUser?.track ?? "unknown"}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Account status:{" "}
                            <span className="text-foreground">{statusLabel(targetStatus)}</span>
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-heading tracking-[0.12em] text-muted-foreground uppercase">
                            Identity proof
                          </p>
                          <div className="rounded-sm border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                            {request.identityProof}
                          </div>
                        </div>
                      </div>

                      {request.status === "pending" ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="space-y-2">
                            <label className="text-xs font-heading tracking-[0.12em] text-muted-foreground uppercase">
                              Decision
                            </label>
                            <select
                              value={draft.status}
                              onChange={(event) =>
                                updateDraft(request.id, {
                                  status: event.target.value as "approved" | "rejected",
                                })
                              }
                              className={inputClass}
                            >
                              <option value="approved">Approve request</option>
                              <option value="rejected">Reject request</option>
                            </select>
                          </div>
                          <div className="space-y-2 md:col-span-2 xl:col-span-2">
                            <label className="text-xs font-heading tracking-[0.12em] text-muted-foreground uppercase">
                              Reviewer note
                            </label>
                            <Textarea
                              value={draft.reviewNote}
                              onChange={(event) =>
                                updateDraft(request.id, { reviewNote: event.target.value })
                              }
                              placeholder="Explain the approval or rejection decision"
                              className="min-h-[96px]"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              size="sm"
                              className="w-full"
                              isLoading={busyAction === `review-password-reset-${request.id}`}
                              loadingText="Applying..."
                              onClick={() =>
                                showValidation({
                                  variant: draft.status === "approved" ? "warning" : "info",
                                  title:
                                    draft.status === "approved"
                                      ? "Approve password reset request"
                                      : "Reject password reset request",
                                  description:
                                    draft.status === "approved"
                                      ? `Approve ${request.username} for credential confirmation with the submitted replacement password?`
                                      : `Reject the password reset request from ${request.username}?`,
                                  confirmLabel:
                                    draft.status === "approved" ? "Approve request" : "Reject request",
                                  cancelLabel: "Cancel",
                                  critical: requiresCriticalConfirm,
                                  confirmDelaySeconds: requiresCriticalConfirm ? 5 : undefined,
                                  onConfirm: async () => {
                                    await runWithFeedback(
                                      `review-password-reset-${request.id}`,
                                      () => handleReview(request),
                                      "Password reset request reviewed",
                                      "Password reset review failed",
                                    );
                                  },
                                })
                              }
                            >
                              Apply Decision
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-sm border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                          <p>
                            Reviewed{" "}
                            {request.reviewedAt
                              ? new Date(request.reviewedAt).toLocaleString()
                              : "previously"}
                            {request.reviewedBy ? ` by ${request.reviewedBy.username}` : ""}.
                          </p>
                          {request.reviewNote ? (
                            <p className="mt-2 whitespace-pre-wrap">{request.reviewNote}</p>
                          ) : null}
                          {request.completedAt ? (
                            <p className="mt-2 text-emerald-300">
                              Credential confirmation completed{" "}
                              {new Date(request.completedAt).toLocaleString()}.
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, requests.length)} of{" "}
                {requests.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-display tracking-wider">
                  {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof KeyRound;
  label: string;
  value: number;
}) {
  return (
    <div className="hud-border-sm flex min-h-[108px] flex-col justify-between bg-background/50 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-accent-orange" />
        <span className="text-xs uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="mt-3 break-all font-display text-xl leading-tight text-primary">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
