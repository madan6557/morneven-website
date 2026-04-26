// Management / Personnel workflow store.
// Backs the /management page: transfer requests, clearance upgrades, report
// submissions, team membership, and executive promotion drafts. All persisted
// to localStorage so the demo survives reloads. A future backend can swap each
// function for a REST call without touching the UI.

import type { PersonnelLevel, PersonnelTrack } from "@/lib/pl";
import { updatePersonnel, listPersonnel } from "@/services/personnelApi";
import { createGalleryItem } from "@/services/galleryApi";
import { createProject } from "@/services/projectsApi";
import { syncTeamGroup, syncDivisionMembership } from "@/services/chatApi";
import { pushNotification } from "@/services/notificationsApi";
import type { GalleryItem, Project } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────
export type RequestKind =
  | "transfer"
  | "clearance"
  | "submission_personal"
  | "submission_team"
  | "team_change"
  | "executive_promotion";

export type RequestStatus = "pending" | "approved" | "rejected";

export interface MgmtRequest {
  id: string;
  kind: RequestKind;
  requester: string; // username
  requesterTrack: PersonnelTrack;
  requesterLevel: PersonnelLevel;
  payload: Record<string, unknown>;
  reason: string;
  status: RequestStatus;
  reviewer?: string;
  reviewNote?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  leader: string; // username (PL3+)
  members: string[]; // usernames
  track: PersonnelTrack;
  createdAt: string;
  // year of the active project cycle
  cycleYear: number;
  // # completed projects this cycle
  completed: number;
}

export interface QuotaRecord {
  username: string;
  // PL2 monthly: key "YYYY-MM" → count of accepted personal submissions
  monthly: Record<string, number>;
  // PL3 yearly: key "YYYY" → count of approved team projects
  yearly: Record<string, number>;
  // PL4 yearly: key "YYYY" → count of completed supervisions
  supervised: Record<string, number>;
}

// ─── Storage ────────────────────────────────────────────────────────────────
const KEY_REQ = "morneven_mgmt_requests";
const KEY_TEAMS = "morneven_mgmt_teams";
const KEY_QUOTA = "morneven_mgmt_quotas";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

let requests: MgmtRequest[] = read<MgmtRequest[]>(KEY_REQ, []);
let teams: Team[] = read<Team[]>(KEY_TEAMS, []);
const quotas: QuotaRecord[] = read<QuotaRecord[]>(KEY_QUOTA, []);

// First-run seed: populate a small set of demo teams + pending requests so
// the Management UI is browsable on a fresh install. Re-seeds only when the
// stored arrays are completely empty (so production data is never overwritten).
const KEY_SEED = "morneven_mgmt_seeded_v1";
if (typeof window !== "undefined" && !window.localStorage.getItem(KEY_SEED)) {
  if (teams.length === 0) {
    teams = [
      {
        id: "team-seed-ops",
        name: "Field Recon Alpha",
        leader: "ops.delta",
        members: ["h.kato", "j.fenris"],
        track: "field",
        createdAt: "2026-04-10",
        cycleYear: new Date().getFullYear(),
        completed: 0,
      },
      {
        id: "team-seed-eng",
        name: "Nexus Maintenance Cell",
        leader: "r.ashford",
        members: ["m.veyra"],
        track: "mechanic",
        createdAt: "2026-04-12",
        cycleYear: new Date().getFullYear(),
        completed: 1,
      },
    ];
    write(KEY_TEAMS, teams);
  }
  if (requests.length === 0) {
    requests = [
      {
        id: "req-seed-1",
        kind: "clearance",
        requester: "h.kato",
        requesterTrack: "field",
        requesterLevel: 2,
        payload: { targetLevel: 3 },
        reason: "Six months of completed recon ops; ready to lead a sub-team.",
        status: "pending",
        createdAt: "2026-04-20",
      },
      {
        id: "req-seed-2",
        kind: "transfer",
        requester: "m.veyra",
        requesterTrack: "logistics",
        requesterLevel: 2,
        payload: { targetTrack: "mechanic" },
        reason: "Background in propulsion systems; better fit with ENG track.",
        status: "pending",
        createdAt: "2026-04-21",
      },
      {
        id: "req-seed-3",
        kind: "submission_personal",
        requester: "j.fenris",
        requesterTrack: "field",
        requesterLevel: 2,
        payload: {
          item: {
            type: "image",
            title: "Patrol Log: West Ridge",
            thumbnail: "/placeholder.svg",
            caption: "Visual log from the West Ridge boundary sweep.",
            tags: ["recon", "field"],
            date: "2026-04-22",
            comments: [],
          },
        },
        reason: "Monthly personal submission for April quota.",
        status: "pending",
        createdAt: "2026-04-22",
      },
    ];
    write(KEY_REQ, requests);
  }
  try { window.localStorage.setItem(KEY_SEED, "1"); } catch { /* ignore */ }
}

const delay = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const todayISO = () => new Date().toISOString().split("T")[0];
const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const yearKey = (d = new Date()) => String(d.getFullYear());

// ─── Requests ───────────────────────────────────────────────────────────────
export async function listRequests(filter?: {
  kind?: RequestKind;
  status?: RequestStatus;
  requester?: string;
}): Promise<MgmtRequest[]> {
  await delay();
  return requests
    .filter((r) => (filter?.kind ? r.kind === filter.kind : true))
    .filter((r) => (filter?.status ? r.status === filter.status : true))
    .filter((r) => (filter?.requester ? r.requester === filter.requester : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createRequest(
  data: Omit<MgmtRequest, "id" | "status" | "createdAt">,
): Promise<MgmtRequest> {
  await delay();
  const next: MgmtRequest = {
    ...data,
    id: `req-${Date.now()}`,
    status: "pending",
    createdAt: todayISO(),
  };
  requests = [next, ...requests];
  write(KEY_REQ, requests);
  return next;
}

export async function decideRequest(
  id: string,
  decision: "approved" | "rejected",
  reviewer: string,
  reviewNote?: string,
): Promise<MgmtRequest | undefined> {
  await delay();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  const req = { ...requests[idx], status: decision, reviewer, reviewNote, decidedAt: todayISO() };
  requests[idx] = req;
  write(KEY_REQ, requests);

  // Side effects on approval
  if (decision === "approved") {
    await applySideEffects(req);
  }
  return req;
}

async function applySideEffects(req: MgmtRequest) {
  const personnel = await listPersonnel();
  const target = personnel.find((p) => p.username === req.requester);
  if (!target) return;

  switch (req.kind) {
    case "transfer": {
      const newTrack = req.payload.targetTrack as PersonnelTrack;
      await updatePersonnel(target.id, { track: newTrack });
      // Re-sync division chat membership.
      syncDivisionMembership(target.username, newTrack);
      pushNotification({
        kind: "system",
        title: "Track transfer approved",
        body: `You have been transferred to ${newTrack.toUpperCase()}.`,
        recipient: target.username,
        sender: req.reviewer ?? "system",
      });
      break;
    }
    case "clearance": {
      const newLevel = req.payload.targetLevel as PersonnelLevel;
      await updatePersonnel(target.id, { level: newLevel });
      pushNotification({
        kind: "system",
        title: "Clearance upgrade approved",
        body: `You are now L${newLevel}.`,
        recipient: target.username,
        sender: req.reviewer ?? "system",
      });
      break;
    }
    case "submission_personal": {
      const item = req.payload.item as Omit<GalleryItem, "id">;
      await createGalleryItem({ ...item, uploadedBy: req.requester });
      bumpQuota(req.requester, "monthly", monthKey());
      pushNotification({
        kind: "info",
        title: "Submission approved",
        body: `"${item.title}" is now in the Gallery.`,
        recipient: target.username,
        sender: req.reviewer ?? "system",
        link: "/gallery",
      });
      break;
    }
    case "submission_team": {
      const project = req.payload.project as Omit<Project, "id">;
      await createProject({ ...project, contributor: req.requester });
      bumpQuota(req.requester, "yearly", yearKey());
      if (req.reviewer) bumpQuota(req.reviewer, "supervised", yearKey());
      pushNotification({
        kind: "info",
        title: "Team project approved",
        body: `"${project.title}" is now active.`,
        recipient: target.username,
        sender: req.reviewer ?? "system",
        link: "/projects",
      });
      break;
    }
    case "team_change": {
      const teamId = req.payload.teamId as string;
      const action = req.payload.action as "add" | "remove";
      const member = req.payload.member as string;
      const t = teams.find((x) => x.id === teamId);
      if (t) {
        if (action === "add" && !t.members.includes(member)) t.members.push(member);
        if (action === "remove") t.members = t.members.filter((m) => m !== member);
        write(KEY_TEAMS, teams);
        // Sync team chat group with new roster.
        syncTeamGroup(t.id, t.name, [t.leader, ...t.members]);
      }
      break;
    }
    case "executive_promotion": {
      await updatePersonnel(target.id, { level: 5 });
      pushNotification({
        kind: "system",
        title: "Executive promotion approved",
        body: "You are now L5.",
        recipient: target.username,
        sender: req.reviewer ?? "system",
      });
      break;
    }
  }
}

// ─── Teams ──────────────────────────────────────────────────────────────────
export async function listTeams(filter?: { leader?: string; member?: string }): Promise<Team[]> {
  await delay();
  return teams.filter((t) => {
    if (filter?.leader && t.leader !== filter.leader) return false;
    if (filter?.member && !t.members.includes(filter.member) && t.leader !== filter.member)
      return false;
    return true;
  });
}

export async function createTeam(data: Omit<Team, "id" | "createdAt" | "completed" | "cycleYear">) {
  await delay();
  const next: Team = {
    ...data,
    id: `team-${Date.now()}`,
    createdAt: todayISO(),
    completed: 0,
    cycleYear: new Date().getFullYear(),
  };
  teams = [next, ...teams];
  write(KEY_TEAMS, teams);
  // Auto-create team chat group with leader + members.
  syncTeamGroup(next.id, next.name, [next.leader, ...next.members]);
  return next;
}

// ─── Quotas ─────────────────────────────────────────────────────────────────
function ensureQuota(username: string): QuotaRecord {
  let q = quotas.find((x) => x.username === username);
  if (!q) {
    q = { username, monthly: {}, yearly: {}, supervised: {} };
    quotas.push(q);
  }
  return q;
}

function bumpQuota(username: string, kind: "monthly" | "yearly" | "supervised", key: string) {
  const q = ensureQuota(username);
  q[kind][key] = (q[kind][key] ?? 0) + 1;
  write(KEY_QUOTA, quotas);
}

export async function getQuota(username: string): Promise<QuotaRecord> {
  await delay();
  return ensureQuota(username);
}

// PL2 obligation status for the current month
export function pl2Status(q: QuotaRecord): { met: boolean; count: number } {
  const count = q.monthly[monthKey()] ?? 0;
  return { met: count >= 1, count };
}
// PL3 obligation status for the current year
export function pl3Status(q: QuotaRecord): { met: boolean; count: number } {
  const count = q.yearly[yearKey()] ?? 0;
  return { met: count >= 1, count };
}
// PL4 supervision status for the current year (target = 2)
export function pl4Status(q: QuotaRecord): { met: boolean; count: number; target: number } {
  const count = q.supervised[yearKey()] ?? 0;
  return { met: count >= 2, count, target: 2 };
}

export { monthKey, yearKey };

// ─── Reviewer authority ─────────────────────────────────────────────────────
// Returns who is authorised to decide a given request, plus a quick predicate
// for the current viewer. Centralised so the UI and any future server logic
// agree on the same rules.
export interface ReviewerInfo {
  label: string; // e.g. "PL5 GOV"
  description: string; // human-readable rule
}

export function reviewerForRequest(req: MgmtRequest): ReviewerInfo {
  switch (req.kind) {
    case "transfer":
      return {
        label: `PL5 ${req.payload.targetTrack ? String(req.payload.targetTrack).toUpperCase() : req.requesterTrack.toUpperCase()}`,
        description: "Reviewed by the target track's PL5 (Division Director).",
      };
    case "clearance":
      return {
        label: `PL4 ${req.requesterTrack.toUpperCase()}`,
        description: "Reviewed by PL4 supervisor of the requester's track.",
      };
    case "submission_personal":
      return {
        label: `PL4 ${req.requesterTrack.toUpperCase()}`,
        description: "Personal submissions reviewed by PL4 of the same track.",
      };
    case "submission_team":
      return {
        label: `PL4 ${req.requesterTrack.toUpperCase()}`,
        description: "Team projects reviewed by PL4 supervisor of the same track.",
      };
    case "team_change":
      return {
        label: `PL4 ${req.requesterTrack.toUpperCase()}`,
        description: "Team membership changes reviewed by PL4 of the same track.",
      };
    case "executive_promotion":
      return {
        label: "PL6 + PL7",
        description: "Executive Promotion reviewed by Board (PL6) and Full Authority (PL7).",
      };
  }
}

export function canDecideRequest(
  req: MgmtRequest,
  viewer: { level: PersonnelLevel; track: PersonnelTrack; username: string },
): boolean {
  if (req.status !== "pending") return false;
  if (req.requester === viewer.username) return false; // can't self-approve
  if (viewer.level >= 7) return true;

  switch (req.kind) {
    case "executive_promotion":
      // PL6 (any track) or PL7 only
      return viewer.level >= 6;
    case "transfer": {
      // Reviewed by PL5 of the TARGET track
      const target = (req.payload.targetTrack as PersonnelTrack) ?? req.requesterTrack;
      return viewer.level >= 5 && viewer.track === target;
    }
    case "clearance":
    case "submission_personal":
    case "submission_team":
    case "team_change":
      return viewer.level >= 4 && viewer.track === req.requesterTrack;
    default:
      return false;
  }
}
