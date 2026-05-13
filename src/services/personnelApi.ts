import { ApiError, apiRequest, buildQuery, unwrapPageItems, type BackendPage } from "@/services/restClient";
import { subscribeRealtimeEvents } from "@/services/realtime";
import type {
  PersonnelReport,
  PersonnelReviewAction,
  PersonnelReviewDecision,
  PersonnelStatusSeverity,
  PersonnelUser,
} from "@/types";

const EVT = "morneven:personnel-changed";

type AnyRecord = Record<string, unknown>;
export type RestrictionDurationMode = "manual" | "minutes" | "hours" | "days";

type PersonnelPatch = Partial<
  Pick<PersonnelUser, "username" | "email" | "level" | "track" | "note" | "role">
>;

export interface PersonnelDeleteResult {
  deleted: boolean;
  user?: PersonnelUser;
}

export interface PersonnelStatusUpdateInput {
  status: "active" | "suspended" | "banned";
  reason: string;
  durationMode?: RestrictionDurationMode;
  durationAmount?: number;
}

export interface PersonnelReportCreateInput {
  targetUsername: string;
  category: string;
  details: string;
}

export interface PersonnelReportReviewInput {
  decision: PersonnelReviewDecision;
  note?: string;
  action?: Extract<PersonnelReviewAction, "none" | "suspend" | "demote" | "ban">;
  actionDurationMode?: RestrictionDurationMode;
  actionDurationAmount?: number;
}

let releaseRealtimeBridge: (() => void) | null = null;

function ensureRealtimeBridge() {
  if (releaseRealtimeBridge || typeof window === "undefined") return;
  releaseRealtimeBridge = subscribeRealtimeEvents(
    [
      "personnel.updated",
      "presence.updated",
      "personnel.report.created",
      "personnel.report.updated",
      "socket.ready",
    ],
    () => {
      emitPersonnelChanged();
    },
  );
}

function emitPersonnelChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeIsoDate(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeSeverity(value: unknown): PersonnelStatusSeverity | undefined {
  if (value === "info" || value === "warning" || value === "critical") return value;
  return undefined;
}

function normalizePersonnelStatus(raw: AnyRecord) {
  const key = asString(raw.status) ?? "active";
  const expiresAt = normalizeIsoDate(raw.statusExpiresAt);
  const severity =
    normalizeSeverity(raw.statusSeverity) ??
    (key === "banned" || key === "deleted"
      ? "critical"
      : key === "suspended"
        ? "warning"
        : "info");

  return {
    key,
    label: key.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    reason: asString(raw.statusReason),
    severity,
    active: key === "active",
    imposedAt: normalizeIsoDate(raw.updatedAt),
    expiresAt,
    permanent: (key === "suspended" || key === "banned") && !expiresAt,
  };
}

function normalizePersonnelUser(raw: unknown): PersonnelUser {
  const source = isRecord(raw) ? raw : {};
  const accountStatus = normalizePersonnelStatus(source);
  return {
    id: asString(source.id) ?? "",
    username: asString(source.username) ?? "Unknown",
    email: asString(source.email) ?? "",
    role:
      source.role === "author" || source.role === "admin" || source.role === "security" || source.role === "guest"
        ? source.role
        : "personel",
    level: Math.max(0, Math.min(7, Math.trunc(asNumber(source.level) ?? 0))) as PersonnelUser["level"],
    track:
      source.track === "field" || source.track === "mechanic" || source.track === "logistics"
        ? source.track
        : "executive",
    note: asString(source.note) ?? "",
    updatedAt: normalizeIsoDate(source.updatedAt),
    online: asBoolean(source.online) ?? false,
    lastSeenAt: normalizeIsoDate(source.lastSeenAt),
    status: accountStatus.key,
    statusLabel: accountStatus.label,
    statusReason: accountStatus.reason,
    statusSeverity: accountStatus.severity,
    statusActive: accountStatus.active,
    statusUpdatedAt: accountStatus.imposedAt,
    statusExpiresAt: accountStatus.expiresAt,
    deleted: accountStatus.key === "deleted",
    moderationNote: asString(source.statusReason),
    accountStatus,
    banExpiresAt: accountStatus.key === "banned" ? accountStatus.expiresAt : undefined,
  };
}

function normalizePersonnelReport(raw: unknown): PersonnelReport {
  const source = isRecord(raw) ? raw : {};
  const reporter = isRecord(source.reporter) ? normalizePersonnelUser(source.reporter) : undefined;
  const target = isRecord(source.target) ? normalizePersonnelUser(source.target) : undefined;
  const resolvedBy = isRecord(source.resolvedBy) ? normalizePersonnelUser(source.resolvedBy) : undefined;

  return {
    id: asString(source.id) ?? "",
    targetUserId: target?.id,
    targetUsername: target?.username ?? "Unknown",
    targetEmail: target?.email,
    reporterUsername: reporter?.username,
    category: asString(source.category) ?? "other",
    reason: asString(source.details) ?? "",
    detail: asString(source.details),
    status: asString(source.status) ?? "open",
    createdAt: normalizeIsoDate(source.createdAt) ?? new Date(0).toISOString(),
    updatedAt: normalizeIsoDate(source.updatedAt),
    reviewedAt: normalizeIsoDate(source.resolvedAt),
    reviewerUsername: resolvedBy?.username,
    reviewNote: asString(source.resolutionNote),
    resolution: asString(source.resolutionAction),
    targetStatus: target?.accountStatus,
  };
}

function throwModerationUnavailable(error: unknown, feature: string): never {
  if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
    throw new Error(`${feature} is not available on this backend yet.`);
  }
  throw error;
}

export async function listPersonnel(
  filters: Partial<Pick<PersonnelUser, "track" | "level">> & { q?: string; status?: string } = {},
): Promise<PersonnelUser[]> {
  ensureRealtimeBridge();
  const payload = await apiRequest<unknown[] | BackendPage<unknown>>(`/personnel${buildQuery(filters)}`);
  return unwrapPageItems(payload).map(normalizePersonnelUser);
}

export async function lookupPersonnelByUsernames(usernames: string[]): Promise<PersonnelUser[]> {
  ensureRealtimeBridge();
  const unique = [...new Set(usernames.map((item) => item.trim()).filter(Boolean))];
  if (unique.length === 0) return [];
  const payload = await apiRequest<unknown[]>(`/personnel/lookup${buildQuery({ usernames: unique })}`);
  return payload.map(normalizePersonnelUser);
}

export async function getPersonnel(id: string): Promise<PersonnelUser | undefined> {
  const payload = await apiRequest<unknown>(`/personnel/${id}`);
  return normalizePersonnelUser(payload);
}

export async function createPersonnel(
  data: Omit<PersonnelUser, "id" | "updatedAt"> & { password?: string },
): Promise<PersonnelUser> {
  const created = normalizePersonnelUser(
    await apiRequest<unknown>("/personnel", {
      method: "POST",
      body: data,
    }),
  );
  emitPersonnelChanged();
  return created;
}

export async function updatePersonnel(id: string, data: PersonnelPatch): Promise<PersonnelUser | undefined> {
  const updated = normalizePersonnelUser(
    await apiRequest<unknown>(`/personnel/${id}`, {
      method: "PUT",
      body: data,
    }),
  );
  emitPersonnelChanged();
  return updated;
}

export async function bulkUpdatePersonnel(ids: string[], patch: PersonnelPatch): Promise<PersonnelUser[]> {
  const updated = await apiRequest<unknown[]>("/personnel/bulk", {
    method: "PATCH",
    body: { ids, patch },
  });
  emitPersonnelChanged();
  return updated.map(normalizePersonnelUser);
}

export async function updatePersonnelStatus(
  id: string,
  input: PersonnelStatusUpdateInput,
): Promise<PersonnelUser> {
  try {
    const updated = normalizePersonnelUser(
      await apiRequest<unknown>(`/personnel/${id}/status`, {
        method: "POST",
        body: input,
      }),
    );
    emitPersonnelChanged();
    return updated;
  } catch (error) {
    throwModerationUnavailable(error, "Account moderation");
  }
}

export async function deletePersonnel(id: string): Promise<PersonnelDeleteResult> {
  const payload = await apiRequest<unknown>(`/personnel/${id}`, { method: "DELETE" });
  const source = isRecord(payload) ? payload : {};
  const result = {
    deleted: asBoolean(source.deleted) ?? false,
    user: isRecord(source.user) ? normalizePersonnelUser(source.user) : undefined,
  };
  emitPersonnelChanged();
  return result;
}

export async function createPersonnelReport(input: PersonnelReportCreateInput): Promise<PersonnelReport> {
  try {
    return normalizePersonnelReport(
      await apiRequest<unknown>("/personnel/reports", {
        method: "POST",
        body: {
          target: input.targetUsername,
          category: input.category,
          details: input.details,
        },
      }),
    );
  } catch (error) {
    throwModerationUnavailable(error, "User reporting");
  }
}

export async function listMyPersonnelReports(): Promise<PersonnelReport[]> {
  try {
    const payload = await apiRequest<unknown[] | BackendPage<unknown>>("/personnel/reports/mine");
    return unwrapPageItems(payload).map(normalizePersonnelReport);
  } catch (error) {
    throwModerationUnavailable(error, "User reporting");
  }
}

export async function listPersonnelReportQueue(): Promise<PersonnelReport[]> {
  try {
    const payload = await apiRequest<unknown[] | BackendPage<unknown>>("/personnel/reports");
    return unwrapPageItems(payload).map(normalizePersonnelReport);
  } catch (error) {
    throwModerationUnavailable(error, "Moderation review queue");
  }
}

export async function reviewPersonnelReport(
  reportId: string,
  input: PersonnelReportReviewInput,
): Promise<PersonnelReport> {
  try {
    return normalizePersonnelReport(
      await apiRequest<unknown>(`/personnel/reports/${reportId}/resolve`, {
        method: "POST",
        body: {
          status: input.decision,
          resolutionNote: input.note,
          action: input.action ?? "none",
          actionDurationMode: input.actionDurationMode,
          actionDurationAmount: input.actionDurationAmount,
        },
      }),
    );
  } catch (error) {
    throwModerationUnavailable(error, "Moderation review queue");
  }
}

export async function sendPresenceHeartbeat(): Promise<void> {
  await apiRequest("/personnel/presence/heartbeat", { method: "POST" });
}

export function subscribePersonnel(cb: () => void): () => void {
  ensureRealtimeBridge();
  if (typeof window === "undefined") return () => undefined;
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}
