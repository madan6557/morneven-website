import type { PersonnelLevel, PersonnelTrack } from "@/lib/pl";
import { apiRequest, buildQuery, unwrapPageItems, type BackendPage } from "@/services/restClient";

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
  requester: string;
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
  leader: string;
  members: string[];
  track: PersonnelTrack;
  createdAt: string;
  cycleYear: number;
  completed: number;
}

export interface QuotaRecord {
  username: string;
  monthly: Record<string, number>;
  yearly: Record<string, number>;
  supervised: Record<string, number>;
}

const EVT = "morneven:management-changed";

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const yearKey = (d = new Date()) => String(d.getFullYear());

function emitManagementChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

export async function listRequests(filter?: {
  kind?: RequestKind;
  status?: RequestStatus;
  requester?: string;
}): Promise<MgmtRequest[]> {
  return unwrapPageItems(
    await apiRequest<MgmtRequest[] | BackendPage<MgmtRequest>>(`/management/requests${buildQuery(filter)}`),
  );
}

export async function createRequest(
  data: Omit<MgmtRequest, "id" | "status" | "createdAt">,
): Promise<MgmtRequest> {
  const created = await apiRequest<MgmtRequest>("/management/requests", {
    method: "POST",
    body: {
      kind: data.kind,
      payload: data.payload,
      reason: data.reason,
    },
  });
  emitManagementChanged();
  return created;
}

export async function decideRequest(
  id: string,
  decision: "approved" | "rejected",
  _reviewer: string,
  reviewNote?: string,
): Promise<MgmtRequest | undefined> {
  const decided = await apiRequest<MgmtRequest>(`/management/requests/${id}/decide`, {
    method: "POST",
    body: { decision, reviewNote },
  });
  emitManagementChanged();
  return decided;
}

export async function listTeams(filter?: { leader?: string; member?: string }): Promise<Team[]> {
  return unwrapPageItems(
    await apiRequest<Team[] | BackendPage<Team>>(`/management/teams${buildQuery(filter)}`),
  );
}

export async function createTeam(data: Omit<Team, "id" | "createdAt" | "completed" | "cycleYear">): Promise<Team> {
  const created = await apiRequest<Team>("/management/teams", {
    method: "POST",
    body: {
      name: data.name,
      members: data.members,
    },
  });
  emitManagementChanged();
  return created;
}

export async function getQuota(username: string): Promise<QuotaRecord> {
  return apiRequest<QuotaRecord>(`/management/quotas/${username}`);
}

export function pl2Status(q: QuotaRecord): { met: boolean; count: number } {
  const count = q.monthly[monthKey()] ?? 0;
  return { met: count >= 1, count };
}

export function pl3Status(q: QuotaRecord): { met: boolean; count: number } {
  const count = q.yearly[yearKey()] ?? 0;
  return { met: count >= 1, count };
}

export function pl4Status(q: QuotaRecord): { met: boolean; count: number; target: number } {
  const count = q.supervised[yearKey()] ?? 0;
  return { met: count >= 2, count, target: 2 };
}

export { monthKey, yearKey };

export interface ReviewerInfo {
  label: string;
  description: string;
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
  if (req.requester === viewer.username) return false;
  if (viewer.level >= 7) return true;

  switch (req.kind) {
    case "executive_promotion":
      return viewer.level >= 6;
    case "transfer": {
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

export function getReviewableRequestCount(_viewer: {
  level: PersonnelLevel;
  track: PersonnelTrack;
  username: string;
}): number {
  return 0;
}

export function subscribeManagement(cb: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  window.addEventListener("focus", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener("focus", handler);
  };
}
