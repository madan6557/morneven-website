import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listRequests,
  createRequest,
  decideRequest,
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
import type { PersonnelUser } from "@/types";

const KIND_LABEL: Record<RequestKind, string> = {
  transfer: "Track Transfer",
  clearance: "Clearance Upgrade",
  submission_personal: "Personal Submission",
  submission_team: "Team Project",
  team_change: "Team Membership",
  executive_promotion: "Executive Promotion",
};

export default function ManagementPage() {
  const { username, personnelLevel, track, role } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<MgmtRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelUser[]>([]);
  const [quota, setQuota] = useState<{
    pl2: { met: boolean; count: number };
    pl3: { met: boolean; count: number };
    pl4: { met: boolean; count: number; target: number };
  } | null>(null);

  const refresh = async () => {
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
  };

  useEffect(() => {
    refresh();
  }, [username]);

  const myRequests = useMemo(() => requests.filter((r) => r.requester === username), [requests, username]);

  // ── Reviewer queue: requests this user can decide on ──────────────────────
  const reviewable = useMemo(() => {
    return requests.filter((r) =>
      canDecideRequest(r, { level: personnelLevel, track, username }),
    );
  }, [requests, personnelLevel, track, username]);

  const decide = async (id: string, decision: "approved" | "rejected", note: string) => {
    await decideRequest(id, decision, username, note);
    toast({ title: `Request ${decision}` });
    refresh();
  };

  const submit = async (
    kind: RequestKind,
    payload: Record<string, unknown>,
    reason: string,
    targetTrack?: PersonnelTrack,
  ) => {
    if (!reason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
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
  };

  if (role === "guest") {
    return (
      <div className="p-8">
        <h1 className="font-display text-xl">Management</h1>
        <p className="text-muted-foreground mt-2">Guests cannot access the Management system.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <p className="font-display text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
          Morneven Institute
        </p>
        <h1 className="font-display text-2xl tracking-[0.15em] text-primary uppercase">Management</h1>
        <div className="mecha-line w-32 mt-2" />
      </header>

      {/* Obligation summary */}
      {quota && (
        <Card className="p-4">
          <p className="font-heading text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Obligation Status — {username} · L{personnelLevel} · {track.toUpperCase()}
          </p>
          {personnelLevel >= 7 ? (
            <p className="text-xs text-muted-foreground">
              PL7 (Full Authority) holds no submission, supervision, or clearance obligations.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <ObligationCell
                label={`PL2 Monthly (${monthKey()})`}
                value={`${quota.pl2.count} / 1`}
                ok={quota.pl2.met}
                relevant={personnelLevel === 2}
              />
              <ObligationCell
                label={`PL3 Yearly (${yearKey()})`}
                value={`${quota.pl3.count} / 1`}
                ok={quota.pl3.met}
                relevant={personnelLevel === 3}
              />
              <ObligationCell
                label={`PL4 Supervision (${yearKey()})`}
                value={`${quota.pl4.count} / ${quota.pl4.target}`}
                ok={quota.pl4.met}
                relevant={personnelLevel >= 4 && personnelLevel < 7}
              />
            </div>
          )}
        </Card>
      )}

      <Tabs defaultValue="transfer" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
          <TabsTrigger value="clearance">Clearance</TabsTrigger>
          <TabsTrigger value="submission">Report Submission</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="executive">Executive Promotion</TabsTrigger>
          <TabsTrigger value="queue">
            Review Queue {reviewable.length > 0 && <Badge className="ml-2">{reviewable.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="mine">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="transfer">
          <TransferForm currentTrack={track} onSubmit={submit} />
        </TabsContent>

        <TabsContent value="clearance">
          <ClearanceForm level={personnelLevel} onSubmit={submit} />
        </TabsContent>

        <TabsContent value="submission">
          <SubmissionForm level={personnelLevel} teams={teams.filter((t) => t.leader === username)} onSubmit={submit} />
        </TabsContent>

        <TabsContent value="team">
          <TeamPanel
            level={personnelLevel}
            track={track}
            username={username}
            teams={teams}
            personnel={personnel}
            onCreateTeam={async (name, members) => {
              await createTeam({ name, leader: username, members, track });
              toast({ title: "Team created" });
              refresh();
            }}
            onSubmit={submit}
          />
        </TabsContent>

        <TabsContent value="executive">
          <ExecutivePromotionForm level={personnelLevel} onSubmit={submit} />
        </TabsContent>

        <TabsContent value="queue">
          <RequestList list={reviewable} canDecide onDecide={decide} />
        </TabsContent>

        <TabsContent value="mine">
          <RequestList list={myRequests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
  const color = !relevant
    ? "text-muted-foreground border-border/40"
    : ok
      ? "text-green-500 border-green-500/40"
      : "text-amber-500 border-amber-500/40";
  return (
    <div className={`border rounded-sm p-3 ${color}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="font-display text-lg mt-1">{value}</p>
      <p className="text-[10px] mt-0.5">{ok ? "Met" : relevant ? "Pending" : "N/A"}</p>
    </div>
  );
}

function TransferForm({
  currentTrack,
  onSubmit,
}: {
  currentTrack: PersonnelTrack;
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string, t?: PersonnelTrack) => void;
}) {
  const [target, setTarget] = useState<PersonnelTrack>(
    PERSONNEL_TRACKS.find((t) => t.key !== currentTrack)!.key,
  );
  const [reason, setReason] = useState("");
  return (
    <Card className="p-4 space-y-3">
      <p className="font-heading text-sm">Apply to transfer to a different track. Reviewed by the target track's PL5.</p>
      <div className="flex gap-3 items-center">
        <span className="text-xs text-muted-foreground">Current: <b>{currentTrack.toUpperCase()}</b></span>
        <span className="text-xs">→</span>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as PersonnelTrack)}
          className="bg-card border border-border rounded-sm px-2 py-1 text-sm"
        >
          {PERSONNEL_TRACKS.filter((t) => t.key !== currentTrack).map((t) => (
            <option key={t.key} value={t.key}>{t.short} — {t.label}</option>
          ))}
        </select>
      </div>
      <Textarea placeholder="Reason for transfer" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button onClick={() => { onSubmit("transfer", { targetTrack: target }, reason, target); setReason(""); }}>
        Submit Transfer
      </Button>
    </Card>
  );
}

function ClearanceForm({
  level,
  onSubmit,
}: {
  level: PersonnelLevel;
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const target = (level + 1) as PersonnelLevel;
  const canApply = level >= 1 && level <= 3;
  return (
    <Card className="p-4 space-y-3">
      <p className="font-heading text-sm">
        Apply for clearance upgrade. Current: <b>L{level}</b> → Target: <b>L{target}</b>
      </p>
      {!canApply ? (
        <p className="text-xs text-muted-foreground">
          Standard clearance applications are L1→L4 only. Higher tiers use Executive Promotion.
        </p>
      ) : (
        <>
          <Textarea placeholder="Reason / contributions so far" value={reason} onChange={(e) => setReason(e.target.value)} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I agree to the L{target} terms and obligations.
          </label>
          <Button
            disabled={!agreed}
            onClick={() => { onSubmit("clearance", { targetLevel: target }, reason); setReason(""); setAgreed(false); }}
          >
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
  onSubmit,
}: {
  level: PersonnelLevel;
  teams: Team[];
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string) => void;
}) {
  const [mode, setMode] = useState<"personal" | "team">("personal");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [reason, setReason] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");

  const canTeam = level >= 3 && teams.length > 0;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex gap-2">
        <Button variant={mode === "personal" ? "default" : "outline"} size="sm" onClick={() => setMode("personal")}>
          Personal Project
        </Button>
        <Button
          variant={mode === "team" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("team")}
          disabled={!canTeam}
        >
          Team Project {!canTeam && "(PL3+ team lead)"}
        </Button>
      </div>

      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input
        placeholder="Thumbnail URL (image)"
        value={thumbnail}
        onChange={(e) => setThumbnail(e.target.value)}
      />
      <Textarea placeholder="Caption / description" value={caption} onChange={(e) => setCaption(e.target.value)} />

      {mode === "team" && (
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="bg-card border border-border rounded-sm px-2 py-1 text-sm w-full">
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}

      <Textarea placeholder="Goals / reasoning" value={reason} onChange={(e) => setReason(e.target.value)} />

      <Button
        disabled={!title || !caption}
        onClick={() => {
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
            onSubmit("submission_personal", { item }, reason);
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
            onSubmit("submission_team", { project, teamId }, reason);
          }
          setTitle(""); setCaption(""); setThumbnail(""); setReason("");
        }}
      >
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
  onSubmit,
}: {
  level: PersonnelLevel;
  track: PersonnelTrack;
  username: string;
  teams: Team[];
  personnel: PersonnelUser[];
  onCreateTeam: (name: string, members: string[]) => void;
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string) => void;
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
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Team registration requires PL3 (Senior Personnel / Lead). Apply via the Clearance tab.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="font-heading text-sm">Register a new team (2-5 members including leader)</p>
        <Input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <select
            value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            className="bg-card border border-border rounded-sm px-2 py-1 text-sm flex-1"
          >
            <option value="">Select PL2 member from {track.toUpperCase()}</option>
            {pl2Pool.map((p) => <option key={p.id} value={p.username}>{p.username}</option>)}
          </select>
          <Button
            size="sm"
            onClick={() => {
              if (memberInput && !members.includes(memberInput) && members.length < 4) {
                setMembers([...members, memberInput]);
                setMemberInput("");
              }
            }}
          >Add</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {members.map((m) => (
            <Badge key={m} variant="secondary" className="cursor-pointer" onClick={() => setMembers(members.filter((x) => x !== m))}>
              {m} ×
            </Badge>
          ))}
        </div>
        <Button
          disabled={!name || members.length < 1}
          onClick={() => { onCreateTeam(name, members); setName(""); setMembers([]); }}
        >Create Team</Button>
      </Card>

      <Card className="p-4 space-y-2">
        <p className="font-heading text-sm">My Teams</p>
        {myTeams.length === 0 ? (
          <p className="text-xs text-muted-foreground">No teams yet.</p>
        ) : myTeams.map((t) => (
          <div key={t.id} className="border border-border rounded-sm p-2">
            <p className="font-heading text-sm">{t.name} <Badge variant="outline" className="ml-2">{t.track.toUpperCase()}</Badge></p>
            <p className="text-xs text-muted-foreground">Leader: {t.leader} · Members: {t.members.join(", ") || "—"} · Completed {t.completed}</p>
          </div>
        ))}
      </Card>

      <Card className="p-4 space-y-3">
        <p className="font-heading text-sm">Request membership change (reviewed by PL4)</p>
        <select value={changeTeam} onChange={(e) => setChangeTeam(e.target.value)} className="bg-card border border-border rounded-sm px-2 py-1 text-sm w-full">
          <option value="">Select team</option>
          {myTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select value={changeAction} onChange={(e) => setChangeAction(e.target.value as "add" | "remove")} className="bg-card border border-border rounded-sm px-2 py-1 text-sm">
            <option value="add">Add</option>
            <option value="remove">Remove</option>
          </select>
          <Input placeholder="Member username" value={changeMember} onChange={(e) => setChangeMember(e.target.value)} />
        </div>
        <Textarea placeholder="Reason + evidence of consent" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} />
        <Button
          disabled={!changeTeam || !changeMember}
          onClick={() => {
            onSubmit("team_change", { teamId: changeTeam, member: changeMember, action: changeAction }, changeReason);
            setChangeMember(""); setChangeReason("");
          }}
        >Submit Change Request</Button>
      </Card>
    </div>
  );
}

function ExecutivePromotionForm({
  level,
  onSubmit,
}: {
  level: PersonnelLevel;
  onSubmit: (k: RequestKind, p: Record<string, unknown>, r: string) => void;
}) {
  const [plan, setPlan] = useState("");
  const [reason, setReason] = useState("");

  if (level !== 4) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Executive Promotion (PL4 → PL5) requires current PL4 status, ≥3 months tenure, Track Master title, and a strategic plan. Reviewed by PL6 + PL7.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <p className="font-heading text-sm">Operational Test — Strategic Development Plan</p>
      <Textarea placeholder="Strategic plan for your track unit" rows={6} value={plan} onChange={(e) => setPlan(e.target.value)} />
      <Textarea placeholder="Justification & dedication record" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button
        disabled={!plan || !reason}
        onClick={() => { onSubmit("executive_promotion", { plan, targetLevel: 5 }, reason); setPlan(""); setReason(""); }}
      >Submit for PL6/PL7 Review</Button>
    </Card>
  );
}

function RequestList({
  list,
  canDecide = false,
  onDecide,
}: {
  list: MgmtRequest[];
  canDecide?: boolean;
  onDecide?: (id: string, d: "approved" | "rejected", note: string) => void;
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (list.length === 0) return <p className="p-4 text-sm text-muted-foreground">No requests.</p>;
  return (
    <div className="space-y-2">
      {list.map((r) => (
        <Card key={r.id} className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-heading text-sm">
                {KIND_LABEL[r.kind]} <span className="text-muted-foreground">· {r.requester}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                L{r.requesterLevel} {r.requesterTrack.toUpperCase()} · {r.createdAt}
              </p>
            </div>
            <Badge
              variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}
            >
              {r.status}
            </Badge>
          </div>
          <p className="text-xs">{r.reason}</p>
          {Object.keys(r.payload).length > 0 && (
            <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(r.payload, null, 2)}</pre>
          )}
          {r.reviewer && (
            <p className="text-[10px] text-muted-foreground">
              Reviewed by {r.reviewer} on {r.decidedAt}{r.reviewNote ? ` — ${r.reviewNote}` : ""}
            </p>
          )}
          {canDecide && r.status === "pending" && onDecide && (
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Review note (optional)"
                value={notes[r.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                className="flex-1"
              />
              <Button size="sm" onClick={() => onDecide(r.id, "approved", notes[r.id] ?? "")}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDecide(r.id, "rejected", notes[r.id] ?? "")}>
                Reject
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
