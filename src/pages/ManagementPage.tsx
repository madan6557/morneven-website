import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Crown,
  FileText,
  GitBranch,
  Inbox,
  KeyRound,
  Layers,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listRequests,
  createRequest,
  decideRequest,
  deleteRequestHistoryItem,
  clearMyRequestHistory,
  listTeams,
  createTeam,
  getQuota,
  pl2Status,
  pl3Status,
  pl4Status,
  monthKey,
  yearKey,
  reviewerForRequest,
  canDecideRequest,
  type MgmtRequest,
  type Team,
  type RequestKind,
  type RequestStatus,
} from "@/services/managementApi";
import { listPersonnel } from "@/services/personnelApi";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PERSONNEL_TRACKS, type PersonnelTrack, type PersonnelLevel } from "@/lib/pl";
import { themedHslStyle } from "@/lib/themeColor";
import type { PersonnelUser } from "@/types";
import RequestPayloadPreview from "@/components/RequestPayloadPreview";
import PasswordResetReviewPanel from "@/components/PasswordResetReviewPanel";
import { showValidation } from "@/components/ui/validation-dialog";

const KIND_LABEL: Record<RequestKind, string> = {
  transfer: "Track Transfer",
  clearance: "Clearance Upgrade",
  submission_personal: "Personal Submission",
  submission_team: "Team Project",
  team_change: "Team Membership",
  executive_promotion: "Executive Promotion",
};

const KIND_ICON: Record<RequestKind, typeof GitBranch> = {
  transfer: GitBranch,
  clearance: ShieldCheck,
  submission_personal: FileText,
  submission_team: ClipboardCheck,
  team_change: Users,
  executive_promotion: Crown,
};

const STATUS_META: Record<RequestStatus, { label: string; hsl: string; icon: typeof CheckCircle2 }> = {
  pending: {
    label: "Pending",
    hsl: "38 92% 45%",
    icon: AlertTriangle,
  },
  approved: {
    label: "Approved",
    hsl: "150 72% 36%",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    hsl: "0 72% 52%",
    icon: XCircle,
  },
};

const TAB_VALUES = ["transfer", "clearance", "submission", "team", "executive", "queue", "mine", "reset"] as const;
type MgmtTab = typeof TAB_VALUES[number];

const panelClass = "hud-border bg-card/95 p-4 md:p-5 space-y-4";
const labelClass = "font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground";
const selectClass =
  "w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary";

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ManagementPage() {
  const { username, personnelLevel, track, role } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as MgmtTab) ?? "transfer";
  const [tab, setTab] = useState<MgmtTab>(TAB_VALUES.includes(initialTab) ? initialTab : "transfer");

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === "transfer") next.delete("tab");
    else next.set("tab", tab);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const [requests, setRequests] = useState<MgmtRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelUser[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [quota, setQuota] = useState<{
    pl2: { met: boolean; count: number };
    pl3: { met: boolean; count: number };
    pl4: { met: boolean; count: number; target: number };
  } | null>(null);

  const refresh = useCallback(async () => {
    const [r, t, p, q] = await Promise.all([
      listRequests(),
      listTeams(),
      listPersonnel(),
      getQuota(username),
    ]);
    setRequests(r);
    setTeams(t);
    setPersonnel(p);
    setQuota({ pl2: pl2Status(q), pl3: pl3Status(q), pl4: pl4Status(q) });
  }, [username]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const myRequests = useMemo(() => requests.filter((r) => r.requester === username), [requests, username]);
  const reviewable = useMemo(() => {
    return requests.filter((r) => canDecideRequest(r, { level: personnelLevel, track, username }));
  }, [requests, personnelLevel, track, username]);
  const pendingRequests = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
  const myPendingRequests = useMemo(() => myRequests.filter((r) => r.status === "pending"), [myRequests]);
  const myHistoryRequests = useMemo(() => myRequests.filter((r) => r.status !== "pending"), [myRequests]);
  const myTeams = useMemo(() => teams.filter((t) => t.leader === username), [teams, username]);

  const decide = async (id: string, decision: "approved" | "rejected", note: string) => {
    showValidation({
      variant: decision === "approved" ? "warning" : "error",
      title: `${decision === "approved" ? "Approve" : "Reject"} management request`,
      description: "This decision may change personnel workflow state and cannot be treated as a draft.",
      confirmLabel: decision === "approved" ? "Approve" : "Reject",
      cancelLabel: "Cancel",
      critical: true,
      confirmDelaySeconds: 5,
      onConfirm: async () => {
        setBusyAction(`decide-${id}`);
        try {
          await decideRequest(id, decision, username, note);
          toast({ title: `Request ${decision}` });
          refresh();
        } catch (error) {
          toast({
            title: `Request ${decision} failed`,
            description: error instanceof Error ? error.message : "Backend rejected the decision.",
            variant: "destructive",
          });
        } finally {
          setBusyAction(null);
        }
      },
    });
  };

  const submit = async (
    kind: RequestKind,
    payload: Record<string, unknown>,
    reason: string,
    targetTrack?: PersonnelTrack,
  ) => {
    if (!reason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return false;
    }
    setBusyAction(`submit-${kind}`);
    try {
      await createRequest({
        kind,
        requester: username,
        requesterTrack: targetTrack ?? track,
        requesterLevel: personnelLevel,
        payload,
        reason,
      });
      toast({ title: "Request submitted" });
      refresh();
      return true;
    } catch (error) {
      toast({
        title: "Request submit failed",
        description: error instanceof Error ? error.message : "Backend rejected the request.",
        variant: "destructive",
      });
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const deleteHistoryItem = (request: MgmtRequest) => {
    showValidation({
      variant: "error",
      title: "Delete management history",
      description: "This removes the selected resolved request from your Mine history. Pending requests cannot be deleted.",
      confirmLabel: "Delete History",
      cancelLabel: "Cancel",
      critical: true,
      confirmDelaySeconds: 3,
      onConfirm: async () => {
        setBusyAction(`delete-${request.id}`);
        try {
          await deleteRequestHistoryItem(request.id);
          toast({ title: "History item deleted" });
          refresh();
        } catch (error) {
          toast({
            title: "Delete failed",
            description: error instanceof Error ? error.message : "Backend rejected the delete request.",
            variant: "destructive",
          });
        } finally {
          setBusyAction(null);
        }
      },
    });
  };

  const clearHistory = () => {
    showValidation({
      variant: "error",
      title: "Clear management history",
      description: `This removes ${myHistoryRequests.length} resolved request${myHistoryRequests.length === 1 ? "" : "s"} from your Mine history. Pending requests remain visible.`,
      confirmLabel: "Clear History",
      cancelLabel: "Cancel",
      critical: true,
      confirmDelaySeconds: 5,
      onConfirm: async () => {
        setBusyAction("clear-history");
        try {
          const result = await clearMyRequestHistory();
          toast({ title: "History cleared", description: `${result.deleted} resolved request${result.deleted === 1 ? "" : "s"} removed.` });
          refresh();
        } catch (error) {
          toast({
            title: "Clear failed",
            description: error instanceof Error ? error.message : "Backend rejected the clear request.",
            variant: "destructive",
          });
        } finally {
          setBusyAction(null);
        }
      },
    });
  };

  if (role === "guest") {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center p-6">
        <Card className={`${panelClass} w-full text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-muted/60 text-muted-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="font-display text-xl uppercase tracking-[0.18em] text-primary">Management Locked</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Guests cannot access the Management system. Use a personnel account to file requests, review team changes, or manage workflow approvals.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Morneven Institute
          </p>
          <h1 className="font-display text-2xl uppercase tracking-[0.15em] text-primary md:text-3xl">
            Management
          </h1>
          <div className="mecha-line mt-2 w-32" />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="px-3 py-1 font-display uppercase tracking-wider">
            {username}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 font-display uppercase tracking-wider">
            L{personnelLevel}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 font-display uppercase tracking-wider">
            {track}
          </Badge>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile icon={Inbox} label="Review Queue" value={reviewable.length} hint="Requests waiting for your authority" />
        <MetricTile icon={AlertTriangle} label="My Pending" value={myPendingRequests.length} hint="Your open submissions" />
        <MetricTile icon={Users} label="Teams Led" value={myTeams.length} hint="Registered under your command" />
        <MetricTile icon={ClipboardList} label="Total Requests" value={requests.length} hint={`${pendingRequests.length} pending in system`} />
      </section>

      {quota && (
        <Card className={panelClass}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={labelClass}>Obligation Status</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {username} | L{personnelLevel} | {track.toUpperCase()}
              </p>
            </div>
            <Badge variant={personnelLevel >= 7 ? "default" : "outline"} className="w-fit">
              {personnelLevel >= 7 ? "Full Authority" : "Tracked Obligation"}
            </Badge>
          </div>
          {personnelLevel >= 7 ? (
            <p className="text-sm text-muted-foreground">
              PL7 holds no submission, supervision, or clearance obligations.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ObligationCell
                label={`PL2 Monthly ${monthKey()}`}
                value={`${quota.pl2.count} / 1`}
                ok={quota.pl2.met}
                relevant={personnelLevel === 2}
              />
              <ObligationCell
                label={`PL3 Yearly ${yearKey()}`}
                value={`${quota.pl3.count} / 1`}
                ok={quota.pl3.met}
                relevant={personnelLevel === 3}
              />
              <ObligationCell
                label={`PL4 Supervision ${yearKey()}`}
                value={`${quota.pl4.count} / ${quota.pl4.target}`}
                ok={quota.pl4.met}
                relevant={personnelLevel >= 4 && personnelLevel < 7}
              />
            </div>
          )}
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as MgmtTab)} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-sm bg-muted/70 p-1.5 sm:grid-cols-3 xl:grid-cols-8">
          <ManagementTab value="transfer" icon={GitBranch} label="Transfer" />
          <ManagementTab value="clearance" icon={ShieldCheck} label="Clearance" />
          <ManagementTab value="submission" icon={FileText} label="Submit" />
          <ManagementTab value="team" icon={Users} label="Team" />
          <ManagementTab value="executive" icon={Crown} label="Executive" />
          <ManagementTab value="queue" icon={Inbox} label="Queue" count={reviewable.length} />
          <ManagementTab value="mine" icon={ClipboardList} label="Mine" count={myRequests.length} />
          <ManagementTab value="reset" icon={KeyRound} label="Reset" />
        </TabsList>

        <TabsContent value="transfer" className="mt-4">
          <TransferForm currentTrack={track} level={personnelLevel} isSubmitting={busyAction === "submit-transfer"} onSubmit={submit} />
        </TabsContent>

        <TabsContent value="clearance" className="mt-4">
          <ClearanceForm level={personnelLevel} isSubmitting={busyAction === "submit-clearance"} onSubmit={submit} />
        </TabsContent>

        <TabsContent value="submission" className="mt-4">
          <SubmissionForm
            level={personnelLevel}
            teams={teams.filter((t) => t.leader === username)}
            isSubmitting={busyAction === "submit-submission_personal" || busyAction === "submit-submission_team"}
            onSubmit={submit}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamPanel
            level={personnelLevel}
            track={track}
            username={username}
            teams={teams}
            personnel={personnel}
            onCreateTeam={async (name, members) => {
              setBusyAction("create-team");
              try {
                await createTeam({ name, leader: username, members, track });
                toast({ title: "Team created" });
                refresh();
                return true;
              } catch (error) {
                toast({
                  title: "Team create failed",
                  description: error instanceof Error ? error.message : "Backend rejected team creation.",
                  variant: "destructive",
                });
                return false;
              } finally {
                setBusyAction(null);
              }
            }}
            isCreatingTeam={busyAction === "create-team"}
            isSubmittingChange={busyAction === "submit-team_change"}
            onSubmit={submit}
          />
        </TabsContent>

        <TabsContent value="executive" className="mt-4">
          <ExecutivePromotionForm level={personnelLevel} isSubmitting={busyAction === "submit-executive_promotion"} onSubmit={submit} />
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <RequestList list={reviewable} viewer={{ level: personnelLevel, track, username }} busyAction={busyAction} onDecide={decide} />
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <RequestList
            list={myRequests}
            viewer={{ level: personnelLevel, track, username }}
            busyAction={busyAction}
            onDeleteHistoryItem={deleteHistoryItem}
            onClearHistory={myHistoryRequests.length > 0 ? clearHistory : undefined}
            clearHistoryCount={myHistoryRequests.length}
          />
        </TabsContent>

        <TabsContent value="reset" className="mt-4">
          <PasswordResetReviewPanel enabled={personnelLevel >= 7 && (role === "author" || role === "admin")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManagementTab({
  value,
  icon: Icon,
  label,
  count,
}: {
  value: MgmtTab;
  icon: typeof GitBranch;
  label: string;
  count?: number;
}) {
  return (
    <TabsTrigger value={value} className="min-w-0 w-full gap-2 px-3 py-2 text-xs">
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
      {!!count && (
        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card className="hud-border flex min-h-[132px] bg-card/95 p-4">
      <div className="flex w-full items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={labelClass}>{label}</p>
          <p className="mt-2 font-display text-3xl text-primary">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-muted/60 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function ObligationCell({
  label,
  value,
  ok,
  relevant,
}: {
  label: string;
  value: string;
  ok: boolean;
  relevant: boolean;
}) {
  const Icon = !relevant ? Target : ok ? CheckCircle2 : AlertTriangle;
  const style = !relevant
    ? undefined
    : ok
      ? themedHslStyle("150 72% 36%", 0.1, 0.34)
      : themedHslStyle("38 92% 45%", 0.1, 0.34);
  return (
    <div
      className={`rounded-sm border p-3 ${!relevant ? "border-border bg-muted/30 text-muted-foreground" : ""}`}
      style={style}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider opacity-75">{label}</p>
          <p className="mt-1 font-display text-xl">{value}</p>
        </div>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-wider">{ok ? "Met" : relevant ? "Pending" : "Not required"}</p>
    </div>
  );
}

function FormHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof GitBranch;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/60 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="font-display text-base uppercase tracking-[0.16em] text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground text-justify">{description}</p>
      </div>
    </div>
  );
}

function InfoPanel({ children }: { children: React.ReactNode }) {
  return (
    <Card className={`${panelClass} text-sm text-muted-foreground`}>
      {children}
    </Card>
  );
}

function TransferForm({
  currentTrack,
  level,
  isSubmitting,
  onSubmit,
}: {
  currentTrack: PersonnelTrack;
  level: PersonnelLevel;
  isSubmitting: boolean;
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string, t?: PersonnelTrack) => Promise<boolean>;
}) {
  const [target, setTarget] = useState<PersonnelTrack>(
    PERSONNEL_TRACKS.find((t) => t.key !== currentTrack)!.key,
  );
  const [reason, setReason] = useState("");

  if (level >= 7) {
    return (
      <InfoPanel>
        PL7 Full Authority operates above tracks and cannot file a transfer request.
      </InfoPanel>
    );
  }

  return (
    <Card className={panelClass}>
      <FormHeader
        icon={GitBranch}
        title="Track Transfer"
        description="Apply to move into a different operating track. The target track reviewer will verify fit and capacity."
      />
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div className="space-y-1.5">
          <p className={labelClass}>Current Track</p>
          <div className="rounded-sm border border-border bg-muted/40 px-3 py-2 font-display text-sm uppercase">
            {currentTrack}
          </div>
        </div>
        <ArrowRight className="hidden h-4 w-4 text-muted-foreground md:block" />
        <div className="space-y-1.5">
          <p className={labelClass}>Target Track</p>
          <select value={target} onChange={(e) => setTarget(e.target.value as PersonnelTrack)} className={selectClass}>
            {PERSONNEL_TRACKS.filter((t) => t.key !== currentTrack).map((t) => (
              <option key={t.key} value={t.key}>{t.short} - {t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className={labelClass}>Reason</p>
        <Textarea placeholder="Explain the transfer reason, expected contribution, and current obligations." value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button isLoading={isSubmitting} loadingText="Submitting..." onClick={async () => { if (await onSubmit("transfer", { targetTrack: target }, reason, target)) setReason(""); }}>
        <Send className="mr-2 h-4 w-4" />
        Submit Transfer
      </Button>
    </Card>
  );
}

function ClearanceForm({
  level,
  isSubmitting,
  onSubmit,
}: {
  level: PersonnelLevel;
  isSubmitting: boolean;
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const target = (level + 1) as PersonnelLevel;
  const canApply = level >= 1 && level <= 3;

  return (
    <Card className={panelClass}>
      <FormHeader
        icon={ShieldCheck}
        title="Clearance Upgrade"
        description="Request a standard clearance step from L1 through L4. Higher movement is handled through executive promotion."
      />
      {!canApply ? (
        <p className="text-sm text-muted-foreground">
          Standard clearance applications are only available from L1 to L4.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-border bg-muted/40 p-3">
              <p className={labelClass}>Current</p>
              <p className="mt-2 font-display text-2xl text-muted-foreground">L{level}</p>
            </div>
            <div className="rounded-sm border border-primary/40 bg-primary/10 p-3">
              <p className={labelClass}>Target</p>
              <p className="mt-2 font-display text-2xl text-primary">L{target}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className={labelClass}>Contribution Record</p>
            <Textarea placeholder="Summarize completed work, reliability, and readiness for the next obligation level." value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input className="mt-1" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>I agree to the L{target} responsibilities and review terms.</span>
          </label>
          <Button
            disabled={!agreed}
            isLoading={isSubmitting}
            loadingText="Submitting..."
            onClick={async () => {
              if (await onSubmit("clearance", { targetLevel: target }, reason)) {
                setReason("");
                setAgreed(false);
              }
            }}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Submit Upgrade Request
          </Button>
        </>
      )}
    </Card>
  );
}

function SubmissionForm({
  level,
  teams,
  isSubmitting,
  onSubmit,
}: {
  level: PersonnelLevel;
  teams: Team[];
  isSubmitting: boolean;
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"personal" | "team">("personal");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [reason, setReason] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");

  const canTeam = level >= 3 && teams.length > 0;

  return (
    <Card className={panelClass}>
      <FormHeader
        icon={FileText}
        title="Report Submission"
        description="Submit personal or team work for review. Team projects require PL3 or higher and an owned team."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant={mode === "personal" ? "default" : "outline"} onClick={() => setMode("personal")}>
          Personal Project
        </Button>
        <Button
          variant={mode === "team" ? "default" : "outline"}
          onClick={() => setMode("team")}
          disabled={!canTeam}
        >
          Team Project {!canTeam && "(PL3+ lead)"}
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className={labelClass}>Title</p>
          <Input placeholder="Submission title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Thumbnail URL</p>
          <Input placeholder="Optional image URL" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className={labelClass}>Caption</p>
        <Textarea placeholder="Describe the project outcome." value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
      {mode === "team" && (
        <div className="space-y-1.5">
          <p className={labelClass}>Team</p>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={selectClass}>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}
      <div className="space-y-1.5">
        <p className={labelClass}>Goals and Reasoning</p>
        <Textarea placeholder="Explain why this should count toward obligation or project progress." value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button
        disabled={!title || !caption}
        isLoading={isSubmitting}
        loadingText="Submitting..."
        onClick={async () => {
          if (mode === "personal") {
            const item = {
              type: "image" as const,
              title,
              thumbnail: thumbnail || "/placeholder.svg",
              caption,
              tags: [],
              date: new Date().toISOString().split("T")[0],
              comments: [],
            };
            if (!(await onSubmit("submission_personal", { item }, reason))) return;
          } else {
            const project = {
              title,
              status: "Planning" as const,
              thumbnail: thumbnail || "/placeholder.svg",
              shortDesc: caption,
              fullDesc: caption,
              patches: [],
              docs: [],
            };
            if (!(await onSubmit("submission_team", { project, teamId }, reason))) return;
          }
          setTitle("");
          setCaption("");
          setThumbnail("");
          setReason("");
        }}
      >
        <Send className="mr-2 h-4 w-4" />
        Submit for Review
      </Button>
    </Card>
  );
}

function TeamPanel({
  level,
  track,
  username,
  teams,
  personnel,
  onCreateTeam,
  isCreatingTeam,
  isSubmittingChange,
  onSubmit,
}: {
  level: PersonnelLevel;
  track: PersonnelTrack;
  username: string;
  teams: Team[];
  personnel: PersonnelUser[];
  onCreateTeam: (name: string, members: string[]) => Promise<boolean>;
  isCreatingTeam: boolean;
  isSubmittingChange: boolean;
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const myTeams = teams.filter((t) => t.leader === username);

  const [changeTeam, setChangeTeam] = useState("");
  const [changeMember, setChangeMember] = useState("");
  const [changeAction, setChangeAction] = useState<"add" | "remove">("add");
  const [changeReason, setChangeReason] = useState("");

  const pl2Pool = personnel.filter((p) => p.level === 2 && p.track === track);

  if (level < 3) {
    return (
      <InfoPanel>
        Team registration requires PL3 or higher. Apply through Clearance before creating a team.
      </InfoPanel>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className={panelClass}>
        <FormHeader
          icon={UserPlus}
          title="Register Team"
          description="Create a track team with 2 to 5 members including the leader."
        />
        <div className="space-y-1.5">
          <p className={labelClass}>Team Name</p>
          <Input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <p className={labelClass}>Member Pool</p>
            <select value={memberInput} onChange={(e) => setMemberInput(e.target.value)} className={selectClass}>
              <option value="">Select PL2 member from {track.toUpperCase()}</option>
              {pl2Pool.map((p) => <option key={p.id} value={p.username}>{p.username}</option>)}
            </select>
          </div>
          <Button
            className="self-end"
            onClick={() => {
              if (memberInput && !members.includes(memberInput) && members.length < 4) {
                setMembers([...members, memberInput]);
                setMemberInput("");
              }
            }}
          >
            Add
          </Button>
        </div>
        <div className="min-h-9 rounded-sm border border-border bg-muted/30 p-2">
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">No members selected.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => (
                <Badge key={m} variant="secondary" className="cursor-pointer" onClick={() => setMembers(members.filter((x) => x !== m))}>
                  {m} x
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button
          disabled={!name || members.length < 1}
          isLoading={isCreatingTeam}
          loadingText="Creating..."
          onClick={async () => {
            if (await onCreateTeam(name, members)) {
              setName("");
              setMembers([]);
            }
          }}
        >
          <Users className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </Card>

      <Card className={panelClass}>
        <FormHeader
          icon={Layers}
          title="My Teams"
          description="Review your current teams and completed project counters."
        />
        {myTeams.length === 0 ? (
          <p className="rounded-sm border border-border bg-muted/30 p-3 text-sm text-muted-foreground">No teams yet.</p>
        ) : (
          <div className="space-y-2">
            {myTeams.map((t) => (
              <div key={t.id} className="rounded-sm border border-border bg-muted/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-sm uppercase tracking-wider">{t.name}</p>
                  <Badge variant="outline">{t.track.toUpperCase()}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Leader: {t.leader} | Members: {t.members.join(", ") || "-"} | Completed {t.completed}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className={`${panelClass} xl:col-span-2`}>
        <FormHeader
          icon={ClipboardCheck}
          title="Membership Change"
          description="Request member add or remove actions. Review is handled by the appropriate PL4 authority."
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-1">
            <p className={labelClass}>Team</p>
            <select value={changeTeam} onChange={(e) => setChangeTeam(e.target.value)} className={selectClass}>
              <option value="">Select team</option>
              {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <p className={labelClass}>Action</p>
            <select value={changeAction} onChange={(e) => setChangeAction(e.target.value as "add" | "remove")} className={selectClass}>
              <option value="add">Add</option>
              <option value="remove">Remove</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <p className={labelClass}>Member Username</p>
            <Input placeholder="username" value={changeMember} onChange={(e) => setChangeMember(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className={labelClass}>Reason</p>
          <Textarea placeholder="Include reason and evidence of consent where relevant." value={changeReason} onChange={(e) => setChangeReason(e.target.value)} />
        </div>
        <Button
          disabled={!changeTeam || !changeMember}
          isLoading={isSubmittingChange}
          loadingText="Submitting..."
          onClick={async () => {
            if (await onSubmit("team_change", { teamId: changeTeam, member: changeMember, action: changeAction }, changeReason)) {
              setChangeMember("");
              setChangeReason("");
            }
          }}
        >
          Submit Change Request
        </Button>
      </Card>
    </div>
  );
}

function ExecutivePromotionForm({
  level,
  isSubmitting,
  onSubmit,
}: {
  level: PersonnelLevel;
  isSubmitting: boolean;
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string) => Promise<boolean>;
}) {
  const [plan, setPlan] = useState("");
  const [reason, setReason] = useState("");

  if (level !== 4) {
    return (
      <InfoPanel>
        Executive Promotion from PL4 to PL5 requires current PL4 status, at least 3 months tenure, Track Master title, and a strategic plan. Reviewed by PL6 and PL7.
      </InfoPanel>
    );
  }

  return (
    <Card className={panelClass}>
      <FormHeader
        icon={Crown}
        title="Executive Promotion"
        description="Submit the strategic development plan required for PL5 review."
      />
      <div className="space-y-1.5">
        <p className={labelClass}>Strategic Plan</p>
        <Textarea placeholder="Strategic plan for your track unit" rows={6} value={plan} onChange={(e) => setPlan(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <p className={labelClass}>Justification</p>
        <Textarea placeholder="Dedication record, tenure context, and operational justification" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <Button
        disabled={!plan || !reason}
        isLoading={isSubmitting}
        loadingText="Submitting..."
        onClick={async () => {
          if (await onSubmit("executive_promotion", { plan, targetLevel: 5 }, reason)) {
            setPlan("");
            setReason("");
          }
        }}
      >
        <Crown className="mr-2 h-4 w-4" />
        Submit for PL6/PL7 Review
      </Button>
    </Card>
  );
}

function RequestList({
  list,
  viewer,
  busyAction,
  onDecide,
  onDeleteHistoryItem,
  onClearHistory,
  clearHistoryCount = 0,
}: {
  list: MgmtRequest[];
  viewer: { level: PersonnelLevel; track: PersonnelTrack; username: string };
  busyAction?: string | null;
  onDecide?: (id: string, d: "approved" | "rejected", note: string) => void;
  onDeleteHistoryItem?: (request: MgmtRequest) => void;
  onClearHistory?: () => void;
  clearHistoryCount?: number;
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (list.length === 0) {
    return (
      <Card className={`${panelClass} items-center text-center`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-muted/60 text-muted-foreground">
          <Inbox className="h-5 w-5" />
        </div>
        <p className="font-display text-base uppercase tracking-[0.16em]">No Requests</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Nothing is waiting in this view. New workflow items will appear here when submitted.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {onClearHistory && (
        <Card className="hud-border flex flex-col gap-3 bg-card/95 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={labelClass}>Mine History Control</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {clearHistoryCount} resolved request{clearHistoryCount === 1 ? "" : "s"} can be removed from your personal history.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={onClearHistory}
            isLoading={busyAction === "clear-history"}
            loadingText="Clearing..."
            className="w-full sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear History
          </Button>
        </Card>
      )}
      {list.map((r) => {
        const reviewer = reviewerForRequest(r);
        const canDecide = canDecideRequest(r, viewer);
        const isOwn = r.requester === viewer.username;
        const canDeleteHistory = isOwn && r.status !== "pending" && !!onDeleteHistoryItem;
        const KindIcon = KIND_ICON[r.kind];
        const status = STATUS_META[r.status];
        const StatusIcon = status.icon;

        return (
          <Card key={r.id} className={panelClass}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/60 text-primary">
                  <KindIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm uppercase tracking-[0.14em] text-foreground">
                    {KIND_LABEL[r.kind]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.requester} | L{r.requesterLevel} {r.requesterTrack.toUpperCase()} | {formatDate(r.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[10px]" title={reviewer.description}>
                  Reviewer: {reviewer.label}
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]" style={themedHslStyle(status.hsl, 0.1, 0.34)}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
                {canDeleteHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                    isLoading={busyAction === `delete-${r.id}`}
                    loadingText="Deleting..."
                    onClick={() => onDeleteHistoryItem?.(r)}
                  >
                    <Trash2 className="mr-1.5 h-3 w-3" />
                    Delete
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-sm border border-border bg-muted/25 p-3">
              <p className={labelClass}>Reason</p>
              <p className="mt-2 text-sm">{r.reason}</p>
            </div>

            {Object.keys(r.payload).length > 0 && <RequestPayloadPreview req={r} />}

            {r.reviewer && (
              <p className="text-xs text-muted-foreground">
                Reviewed by {r.reviewer} on {formatDate(r.decidedAt)}{r.reviewNote ? ` - ${r.reviewNote}` : ""}
              </p>
            )}

            {r.status === "pending" && onDecide && (
              canDecide ? (
                <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
                  <Input
                    placeholder="Review note (optional)"
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                  />
                  <Button
                    isLoading={busyAction === `decide-${r.id}`}
                    loadingText="Approving..."
                    onClick={() => onDecide(r.id, "approved", notes[r.id] ?? "")}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    isLoading={busyAction === `decide-${r.id}`}
                    loadingText="Rejecting..."
                    onClick={() => onDecide(r.id, "rejected", notes[r.id] ?? "")}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  {isOwn ? "You cannot decide on your own request. Awaiting " : "You lack authority to decide. Awaiting "}
                  {reviewer.label}.
                </p>
              )
            )}
          </Card>
        );
      })}
    </div>
  );
}
