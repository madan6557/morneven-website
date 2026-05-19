import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  FileLock2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Siren,
  Trash2,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessSecurityConsole } from "@/lib/pl";
import { cn } from "@/lib/utils";
import {
  clearSecurityHistory,
  getFileScanRecords,
  getSecurityBlocks,
  getSecurityEvents,
  getSecuritySessions,
  getSecurityStatus,
  revokeSecurityBlock,
  revokeSecuritySession,
  type FileScanRecord,
  type SecurityBlock,
  type SecurityEvent,
  type SecurityHistorySection,
  type SecuritySession,
  type SecurityStatus,
} from "@/services/securityApi";

const EVENTS_PAGE_SIZE = 6;
const SESSIONS_PAGE_SIZE = 6;
const BLOCKS_PAGE_SIZE = 6;
const SCANS_PAGE_SIZE = 8;

const panelClass = "hud-border bg-card/95";
const metricClass = "hud-border-sm bg-background/50 p-4 space-y-2";

type LoadState = {
  status: SecurityStatus | null;
  events: SecurityEvent[];
  blocks: SecurityBlock[];
  sessions: SecuritySession[];
  scans: FileScanRecord[];
  loading: boolean;
  error: string | null;
};

const initialState: LoadState = {
  status: null,
  events: [],
  blocks: [],
  sessions: [],
  scans: [],
  loading: true,
  error: null,
};

type PendingClearHistory = {
  section: SecurityHistorySection;
  label: string;
  description: string;
  count: number;
};

const severityClass = (severity: string) => {
  if (severity === "critical") return "border-destructive/60 bg-destructive/15 text-destructive";
  if (severity === "high") return "border-accent-orange/60 bg-accent-orange/15 text-accent-orange";
  if (severity === "medium") return "border-primary/40 bg-primary/10 text-primary";
  return "border-border bg-background/60 text-muted-foreground";
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const shortHash = (value?: string | null) => (value ? `${value.slice(0, 12)}...` : "N/A");

export default function SecurityPage() {
  const { isAuthenticated, role, personnelLevel } = useAuth();
  const [state, setState] = useState<LoadState>(initialState);
  const [actionId, setActionId] = useState<string | null>(null);
  const [eventsPage, setEventsPage] = useState(1);
  const [blocksPage, setBlocksPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [scansPage, setScansPage] = useState(1);
  const [pendingRevoke, setPendingRevoke] = useState<SecuritySession | null>(null);
  const [pendingClear, setPendingClear] = useState<PendingClearHistory | null>(null);

  useEffect(() => {
    setEventsPage(1);
  }, [state.events.length]);

  useEffect(() => {
    setSessionsPage(1);
  }, [state.sessions.length]);

  useEffect(() => {
    setBlocksPage(1);
  }, [state.blocks.length]);

  useEffect(() => {
    setScansPage(1);
  }, [state.scans.length]);

  const accessAllowed = canAccessSecurityConsole(personnelLevel, role);

  const activeBlocks = useMemo(
    () => state.blocks.filter((block) => !block.revokedAt && new Date(block.expiresAt).getTime() > Date.now()),
    [state.blocks],
  );
  const inactiveBlocks = useMemo(
    () => state.blocks.filter((block) => block.revokedAt || new Date(block.expiresAt).getTime() <= Date.now()),
    [state.blocks],
  );
  const activeSessions = useMemo(
    () => state.sessions.filter((session) => !session.revokedAt),
    [state.sessions],
  );
  const revokedSessions = useMemo(
    () => state.sessions.filter((session) => session.revokedAt),
    [state.sessions],
  );
  const blockedScans = useMemo(
    () => state.scans.filter((scan) => scan.verdict === "blocked" || scan.verdict === "quarantined"),
    [state.scans],
  );

  const clearTargets: Record<SecurityHistorySection, PendingClearHistory> = {
    events: {
      section: "events",
      label: "security event",
      description: "This permanently removes security event history. Audit log history is kept.",
      count: state.events.length,
    },
    blocks: {
      section: "blocks",
      label: "inactive block",
      description: "This removes revoked or expired block history only. Active defense blocks are kept.",
      count: inactiveBlocks.length,
    },
    sessions: {
      section: "sessions",
      label: "revoked session",
      description: "This removes revoked session history only. Active sessions are kept.",
      count: revokedSessions.length,
    },
    "file-scans": {
      section: "file-scans",
      label: "file scan",
      description: "This permanently removes upload scan history. Stored files are not deleted.",
      count: state.scans.length,
    },
  };

  const loadSecurity = async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [status, events, blocks, sessions, scans] = await Promise.all([
        getSecurityStatus(),
        getSecurityEvents(50),
        getSecurityBlocks(),
        getSecuritySessions(),
        getFileScanRecords(),
      ]);
      setState({ status, events, blocks, sessions, scans, loading: false, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Security module unavailable.",
      }));
    }
  };

  useEffect(() => {
    if (!accessAllowed) return;
    void loadSecurity();
  }, [accessAllowed]);

  const handleRevokeBlock = async (block: SecurityBlock) => {
    setActionId(block.id);
    try {
      await revokeSecurityBlock(block.id, "Revoked from security console");
      await loadSecurity();
    } finally {
      setActionId(null);
    }
  };

  const handleRevokeSession = async (session: SecuritySession) => {
    setActionId(session.id);
    try {
      await revokeSecuritySession(session.id, "Revoked from security console");
      await loadSecurity();
    } finally {
      setActionId(null);
    }
  };

  const handleClearHistory = async (target: PendingClearHistory) => {
    const id = `clear-${target.section}`;
    setActionId(id);
    try {
      await clearSecurityHistory(target.section);
      await loadSecurity();
    } finally {
      setActionId(null);
    }
  };

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!accessAllowed) return <Navigate to="/home" replace />;

  const status = state.status;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 xl:px-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="font-display text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Security Manager Console</p>
            <h1 className="font-display text-3xl uppercase tracking-[0.14em] text-primary md:text-4xl">Security</h1>
            <div className="mecha-line w-32" />
            <p className="max-w-4xl text-sm leading-7 text-muted-foreground md:text-base">
              Global security posture, event evidence, session control, block control, and upload scan visibility.
            </p>
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={() => void loadSecurity()} disabled={state.loading}>
            <RefreshCw className={cn("h-4 w-4", state.loading && "animate-spin")} />
            Refresh
          </Button>
        </header>

        {state.error && (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <MetricCard
            icon={status?.enabled ? ShieldCheck : ShieldOff}
            label="Security level"
            value={status ? `${status.level}/${status.maxLevel}` : "N/A"}
            detail={status?.label ?? "Unavailable"}
            active={Boolean(status?.enabled)}
          />
          <MetricCard
            icon={Siren}
            label="Events 24h"
            value={String(status?.stats.events24h ?? 0)}
            detail={`${status?.stats.highEvents24h ?? 0} high or critical`}
          />
          <MetricCard
            icon={Ban}
            label="Active blocks"
            value={String(status?.stats.activeBlocks ?? activeBlocks.length)}
            detail="TTL based deny rules"
          />
          <MetricCard
            icon={KeyRound}
            label="Active sessions"
            value={String(status?.stats.sessionsActive ?? activeSessions.length)}
            detail="Revocable sessions"
          />
          <MetricCard
            icon={FileLock2}
            label="File findings"
            value={String(blockedScans.length)}
            detail={`${status?.fileScanProvider ?? "none"} scanner`}
          />
        </section>

        <section className="grid gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
          <Card className={panelClass}>
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="font-display text-xl uppercase tracking-[0.12em] text-primary">Recent security events</CardTitle>
                <CardDescription>Latest deny, rate-limit, auth, upload, and risk engine events.</CardDescription>
              </div>
              <ClearHistoryButton
                target={clearTargets.events}
                disabled={state.loading || actionId === "clear-events"}
                onClick={setPendingClear}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {state.events.length ? (() => {
                const totalPages = Math.max(1, Math.ceil(state.events.length / EVENTS_PAGE_SIZE));
                const safePage = Math.min(eventsPage, totalPages);
                const start = (safePage - 1) * EVENTS_PAGE_SIZE;
                const pageEvents = state.events.slice(start, start + EVENTS_PAGE_SIZE);
                return (
                  <>
                    <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {pageEvents.map((event) => (
                        <li key={event.id} className="rounded-sm border border-border/70 bg-background/45 px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate font-heading text-sm tracking-wide text-foreground">
                              {event.action}
                            </p>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Badge variant="outline" className={cn("text-[10px] font-display uppercase tracking-wider", severityClass(event.severity))}>
                                {event.severity}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-display uppercase tracking-wider">
                                {event.decision}
                              </Badge>
                            </div>
                          </div>
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {formatDate(event.createdAt)} - {event.actorUsername ?? "anonymous"} - risk {event.riskScore}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>
                        {start + 1}-{Math.min(start + EVENTS_PAGE_SIZE, state.events.length)} of {state.events.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2"
                          onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Prev
                        </Button>
                        <span className="px-1 font-display tracking-[0.1em]">
                          {safePage}/{totalPages}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2"
                          onClick={() => setEventsPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })() : (
                <EmptyState text={state.loading ? "Loading events." : "No security events recorded."} />
              )}
            </CardContent>
          </Card>

          <Card className={panelClass}>
            <CardHeader>
              <CardTitle className="font-display text-xl uppercase tracking-[0.12em] text-primary">Feature switch</CardTitle>
              <CardDescription>Controlled by backend `SECURITY_LEVEL`.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {status ? Object.entries(status.features).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-sm border border-border/70 bg-background/45 p-3">
                  <span className="font-heading text-sm text-foreground">{key}</span>
                  <Badge variant="outline" className={enabled ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200" : "text-muted-foreground"}>
                    {enabled ? "On" : "Off"}
                  </Badge>
                </div>
              )) : (
                <EmptyState text="Security status unavailable." />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className={panelClass}>
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="font-display text-xl uppercase tracking-[0.12em] text-primary">Active defense blocks</CardTitle>
                <CardDescription>Temporary deny rules created by active defense or security operators.</CardDescription>
              </div>
              <ClearHistoryButton
                target={clearTargets.blocks}
                disabled={state.loading || actionId === "clear-blocks"}
                onClick={setPendingClear}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {state.blocks.length ? (() => {
                const totalPages = Math.max(1, Math.ceil(state.blocks.length / BLOCKS_PAGE_SIZE));
                const safePage = Math.min(blocksPage, totalPages);
                const start = (safePage - 1) * BLOCKS_PAGE_SIZE;
                const pageBlocks = state.blocks.slice(start, start + BLOCKS_PAGE_SIZE);
                return (
                  <>
                    <div className="space-y-3">
                      {pageBlocks.map((block) => (
                        <div key={block.id} className="rounded-sm border border-border/70 bg-background/45 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-heading text-sm text-foreground">{block.subjectType} / {shortHash(block.subjectHash)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{block.reason}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Expires {formatDate(block.expiresAt)}</p>
                            </div>
                            {!block.revokedAt && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void handleRevokeBlock(block)}
                                disabled={actionId === block.id}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>
                        {start + 1}-{Math.min(start + BLOCKS_PAGE_SIZE, state.blocks.length)} of {state.blocks.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2"
                          onClick={() => setBlocksPage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Prev
                        </Button>
                        <span className="px-1 font-display tracking-[0.1em]">
                          {safePage}/{totalPages}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2"
                          onClick={() => setBlocksPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })() : (
                <EmptyState text={state.loading ? "Loading blocks." : "No blocks recorded."} />
              )}
            </CardContent>
          </Card>

          <Card className={panelClass}>
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="font-display text-xl uppercase tracking-[0.12em] text-primary">Sessions</CardTitle>
                <CardDescription>Security sessions are revocable without deleting the account.</CardDescription>
              </div>
              <ClearHistoryButton
                target={clearTargets.sessions}
                disabled={state.loading || actionId === "clear-sessions"}
                onClick={setPendingClear}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {state.sessions.length ? (() => {
                const totalPages = Math.max(1, Math.ceil(state.sessions.length / SESSIONS_PAGE_SIZE));
                const safePage = Math.min(sessionsPage, totalPages);
                const start = (safePage - 1) * SESSIONS_PAGE_SIZE;
                const pageSessions = state.sessions.slice(start, start + SESSIONS_PAGE_SIZE);
                return (
                  <>
                    <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {pageSessions.map((session) => (
                        <li key={session.id} className="rounded-sm border border-border/70 bg-background/45 px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-heading text-sm text-foreground">
                                {session.user?.username ?? session.userId}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {session.user?.role ?? "unknown"} - L{session.user?.level ?? "?"} - risk {session.riskScore} - {formatDate(session.lastSeenAt)}
                              </p>
                            </div>
                            {!session.revokedAt && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 shrink-0 gap-1 px-2"
                                onClick={() => setPendingRevoke(session)}
                                disabled={actionId === session.id}
                              >
                                <UserX className="h-3.5 w-3.5" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>
                        {start + 1}-{Math.min(start + SESSIONS_PAGE_SIZE, state.sessions.length)} of {state.sessions.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2"
                          onClick={() => setSessionsPage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Prev
                        </Button>
                        <span className="px-1 font-display tracking-[0.1em]">
                          {safePage}/{totalPages}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2"
                          onClick={() => setSessionsPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })() : (
                <EmptyState text={state.loading ? "Loading sessions." : "No security sessions recorded."} />
              )}
            </CardContent>
          </Card>
        </section>


        <section>
          <Card className={panelClass}>
            <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 font-display text-xl uppercase tracking-[0.12em] text-primary">
                  <AlertTriangle className="h-5 w-5" />
                  File scan records
                </CardTitle>
                <CardDescription>Upload scan abstraction, MIME validation, signature check, and hash evidence.</CardDescription>
              </div>
              <ClearHistoryButton
                target={clearTargets["file-scans"]}
                disabled={state.loading || actionId === "clear-file-scans"}
                onClick={setPendingClear}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {state.scans.length ? (() => {
                const totalPages = Math.max(1, Math.ceil(state.scans.length / SCANS_PAGE_SIZE));
                const safePage = Math.min(scansPage, totalPages);
                const start = (safePage - 1) * SCANS_PAGE_SIZE;
                const pageScans = state.scans.slice(start, start + SCANS_PAGE_SIZE);
                return (
                  <>
                    <div className="space-y-3">
                      {pageScans.map((scan) => (
                        <div key={scan.id} className="grid gap-3 rounded-sm border border-border/70 bg-background/45 p-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_auto_minmax(0,0.8fr)]">
                          <div className="min-w-0">
                            <p className="truncate font-heading text-sm text-foreground">{scan.objectPath}</p>
                            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{shortHash(scan.sha256)}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{scan.mime}</p>
                          <Badge variant="outline" className={cn("w-fit text-[10px] font-display uppercase tracking-wider", severityClass(scan.verdict === "clean" ? "low" : "high"))}>
                            {scan.verdict}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{formatDate(scan.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>
                        {start + 1}-{Math.min(start + SCANS_PAGE_SIZE, state.scans.length)} of {state.scans.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2"
                          onClick={() => setScansPage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Prev
                        </Button>
                        <span className="px-1 font-display tracking-[0.1em]">
                          {safePage}/{totalPages}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2"
                          onClick={() => setScansPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })() : (
                <EmptyState text={state.loading ? "Loading scan records." : "No file scans recorded."} />
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <AlertDialog open={pendingRevoke !== null} onOpenChange={(open) => !open && setPendingRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRevoke ? (
                <>
                  This will immediately sign out{" "}
                  <span className="font-heading text-foreground">
                    {pendingRevoke.user?.username ?? pendingRevoke.userId}
                  </span>
                  {" "}from this device. The account itself is not deleted, and the user can sign back in.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingRevoke ? actionId === pendingRevoke.id : false}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pendingRevoke ? actionId === pendingRevoke.id : false}
              onClick={async (e) => {
                e.preventDefault();
                if (!pendingRevoke) return;
                const target = pendingRevoke;
                await handleRevokeSession(target);
                setPendingRevoke(null);
              }}
            >
              Revoke session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingClear !== null} onOpenChange={(open) => !open && setPendingClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear {pendingClear?.label} history?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingClear ? (
                <>
                  {pendingClear.description} This will affect {pendingClear.count} record
                  {pendingClear.count === 1 ? "" : "s"} and cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingClear ? actionId === `clear-${pendingClear.section}` : false}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pendingClear ? actionId === `clear-${pendingClear.section}` : false}
              onClick={async (e) => {
                e.preventDefault();
                if (!pendingClear) return;
                const target = pendingClear;
                await handleClearHistory(target);
                setPendingClear(null);
              }}
            >
              Clear history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClearHistoryButton({
  target,
  disabled,
  onClick,
}: {
  target: PendingClearHistory;
  disabled?: boolean;
  onClick: (target: PendingClearHistory) => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="shrink-0 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
      disabled={disabled || target.count === 0}
      onClick={() => onClick(target)}
    >
      <Trash2 className="h-3.5 w-3.5" />
      Clear History
    </Button>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  active = true,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div className={metricClass}>
      <div className={cn("flex min-w-0 items-start gap-2", active ? "text-primary" : "text-muted-foreground")}>
        <Icon className="h-4 w-4" />
        <p className="min-w-0 break-words font-display text-[10px] uppercase tracking-[0.22em]">{label}</p>
      </div>
      <p className="text-3xl font-display tracking-[0.08em] text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-sm border border-border/70 bg-background/45 p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
