// Management / Personnel workflow store.
// Backs the /management page: transfer requests, clearance upgrades, report
// submissions, team membership, and executive promotion drafts. All persisted
// to localStorage so the demo survives reloads. A future backend can swap each
// function for a REST call without touching the UI.

import type { PersonnelLevel, PersonnelTrack } from "@/lib/pl";
import { updatePersonnel, listPersonnel } from "@/services/personnelApi";
import { createGalleryItem } from "@/services/galleryApi";
import { createProject } from "@/services/projectsApi";
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
let quotas: QuotaRecord[] = read<QuotaRecord[]>(KEY_QUOTA, []);

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
      break;
    }
    case "clearance": {
      const newLevel = req.payload.targetLevel as PersonnelLevel;
      await updatePersonnel(target.id, { level: newLevel });
      break;
    }
    case "submission_personal": {
      const item = req.payload.item as Omit<GalleryItem, "id">;
      await createGalleryItem({ ...item, uploadedBy: req.requester });
      bumpQuota(req.requester, "monthly", monthKey());
      break;
    }
    case "submission_team": {
      const project = req.payload.project as Omit<Project, "id">;
      await createProject(project);
      bumpQuota(req.requester, "yearly", yearKey());
      if (req.reviewer) bumpQuota(req.reviewer, "supervised", yearKey());
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
      }
      break;
    }
    case "executive_promotion": {
      await updatePersonnel(target.id, { level: 5 });
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
