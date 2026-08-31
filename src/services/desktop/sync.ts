import { getApiBaseUrl } from "@/services/restClient";
import {
  deleteConflict,
  deleteOperation,
  findMediaBySourceUrl,
  getLocalRecord,
  getMediaBlob,
  getWorkspaceMeta,
  listLocalRecords,
  listOperations,
  listConflicts,
  listPendingMedia,
  saveConflict,
  saveLocalRecord,
  saveOperation,
  updateMedia,
  updateWorkspaceMeta,
  type DesktopEntity,
  type LocalConflict,
  type LocalMedia,
  type LocalRecord,
  type PendingOperation,
} from "./workspaceDb";
import { cacheDesktopMedia } from "./media";

export type SyncEntity = "project" | "lore" | "gallery";
export type SyncAction = "upsert" | "delete";

export interface SyncChange {
  sequence: string;
  entity: SyncEntity;
  id: string;
  action: SyncAction;
  record: unknown | null;
}

export interface SyncResult {
  applied: number;
  conflicts: number;
  failed: number;
  cursor: string;
}

let syncToken: string | null = null;

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as { success: boolean; data?: T; message?: string };
    if (!envelope.success) throw new Error(envelope.message ?? "Sync request failed.");
    return envelope.data as T;
  }
  return payload as T;
}

async function syncRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!syncToken) throw new Error("Sync requires backend sign-in.");
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
      Authorization: `Bearer ${syncToken}`,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error((payload as { message?: string } | null)?.message ?? `Sync failed (${response.status}).`);
  return unwrap<T>(payload);
}

export async function loginForSync(email: string, password: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error((payload as { message?: string } | null)?.message ?? "Backend login failed.");
  const data = unwrap<{ token?: string; user?: { role?: string } }>(payload);
  if (!data.token) throw new Error("Backend did not return a sync token.");
  if (data.user?.role && !["author", "admin"].includes(data.user.role)) throw new Error("This account cannot sync author content.");
  syncToken = data.token;
  return data.user;
}

export function clearSyncSession() {
  syncToken = null;
}

export function hasSyncSession() {
  return Boolean(syncToken);
}

export function getSyncToken() {
  return syncToken;
}

function stripDecorations(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripDecorations);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    if (["discussions", "views", "stars", "likes", "dislikes", "viewerReaction", "viewerStarred", "uploadedByStatus"].includes(key)) continue;
    if (key === "_category") {
      result.loreCategory = item;
      continue;
    }
    result[key] = stripDecorations(item);
  }
  return result;
}

function localRecordForChange(change: SyncChange): unknown {
  if (!change.record || change.entity !== "lore") return change.record;
  const record = change.record as Record<string, unknown>;
  return { ...record, _category: record.loreCategory ?? record.category };
}

function entityForSync(entity: SyncEntity): DesktopEntity {
  return entity === "project" ? "project" : entity === "gallery" ? "gallery" : "lore";
}

function containsLocalMedia(value: unknown): boolean {
  if (typeof value === "string") return value.startsWith("local-media://");
  if (Array.isArray(value)) return value.some(containsLocalMedia);
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(containsLocalMedia);
}

function thumbnailUrls(value: unknown, result: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => thumbnailUrls(item, result));
    return result;
  }
  if (!value || typeof value !== "object") return result;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key === "thumbnail" && typeof item === "string" && item && !item.startsWith("local-media://")) result.push(item);
    thumbnailUrls(item, result);
  }
  return result;
}

async function cacheThumbnails(record: unknown, folder: "projects" | "lore" | "gallery") {
  for (const url of new Set(thumbnailUrls(record))) {
    if (await findMediaBySourceUrl(url)) continue;
    try {
      const target = /^https?:\/\//i.test(url) ? url : new URL(url.startsWith("/") ? url : `/${url}`, getApiBaseUrl()).toString();
      const response = await fetch(target, { headers: syncToken ? { Authorization: `Bearer ${syncToken}` } : undefined });
      if (!response.ok) continue;
      const blob = await response.blob();
      await cacheDesktopMedia(url, new File([blob], `thumbnail-${crypto.randomUUID()}`, { type: blob.type || "application/octet-stream" }), folder);
    } catch {
      // Thumbnail caching is best effort; content sync must remain usable offline.
    }
  }
}

function replaceLocalMedia(value: unknown, replacements: Map<string, string>): unknown {
  if (typeof value === "string") return replacements.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => replaceLocalMedia(item, replacements));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceLocalMedia(item, replacements)]));
}

async function uploadPendingMedia() {
  const pending = await listPendingMedia();
  if (!pending.length) return;
  const replacements = new Map<string, string>();

  for (const media of pending) {
    const form = new FormData();
    form.append("file", await getMediaBlob(media), media.name);
    const response = await fetch(`${getApiBaseUrl()}/files/upload?folder=${media.folder}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${syncToken}` },
      body: form,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error((payload as { message?: string } | null)?.message ?? `Media upload failed (${response.status}).`);
    const data = unwrap<{ url?: string }>(payload);
    if (!data.url) throw new Error("Media upload did not return a URL.");
    replacements.set(`local-media://${media.id}`, data.url);
    await updateMedia({ ...media, pendingUpload: false, uploadedUrl: data.url, sourceUrl: data.url });
  }

  if (!replacements.size) return;
  for (const entity of ["project", "lore", "gallery"] as const) {
    const records = await listLocalRecords(entity, true);
    for (const record of records) {
      if (!containsLocalMedia(record.data)) continue;
      const next = { ...record, data: replaceLocalMedia(record.data, replacements) };
      await saveLocalRecord(next);
    }
  }
  const operations = await listOperations();
  for (const operation of operations) {
    if (!containsLocalMedia(operation.record)) continue;
    await saveOperation({ ...operation, record: replaceLocalMedia(operation.record, replacements) });
  }
  const conflicts = await listConflicts();
  for (const conflict of conflicts) {
    await saveConflict({
      ...conflict,
      localRecord: replaceLocalMedia(conflict.localRecord, replacements),
      serverRecord: replaceLocalMedia(conflict.serverRecord, replacements),
    });
  }
}

async function applyPulledChange(change: SyncChange) {
  const entity = entityForSync(change.entity);
  const existing = await getLocalRecord(entity, change.id);
  const operations = await listOperations();
  const pending = operations.find((operation) => operation.entity === entity && operation.id === change.id && (operation.status === "pending" || operation.status === "conflict"));

  if (pending && existing?.dirty) {
    if (pending.status === "conflict") {
      const current = (await listConflicts()).find((conflict) => conflict.opId === pending.opId);
      if (current) {
        await saveConflict({
          ...current,
          serverRecord: localRecordForChange(change),
          serverSequence: change.sequence,
          createdAt: new Date().toISOString(),
        });
      }
      return;
    }
    const conflict: LocalConflict = {
      key: `${entity}:${change.id}:${pending.opId}`,
      opId: pending.opId,
      entity,
      id: change.id,
      localRecord: existing.data,
      serverRecord: localRecordForChange(change),
      serverSequence: change.sequence,
      createdAt: new Date().toISOString(),
    };
    await saveConflict(conflict);
    await saveOperation({ ...pending, status: "conflict" });
    return;
  }

  if (change.action === "delete") {
    await saveLocalRecord({
      entity,
      id: change.id,
      data: existing?.data ?? {},
      serverSequence: change.sequence,
      dirty: false,
      deleted: true,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  await saveLocalRecord({
    entity,
    id: change.id,
    data: localRecordForChange(change),
    serverSequence: change.sequence,
    dirty: false,
    deleted: false,
    updatedAt: new Date().toISOString(),
  });
  await cacheThumbnails(change.record, entity === "project" ? "projects" : entity);
}

export async function bootstrapWorkspace() {
  const data = await syncRequest<{
    cursor: string;
    projects: Array<{ id: string } & Record<string, unknown>>;
    lore: Array<{ id: string; category?: string } & Record<string, unknown>>;
    gallery: Array<{ id: string } & Record<string, unknown>>;
  }>("/sync/bootstrap");

  for (const record of data.projects) {
    await saveLocalRecord({ entity: "project", id: record.id, data: record, serverSequence: data.cursor, dirty: false, deleted: false, updatedAt: new Date().toISOString() });
    await cacheThumbnails(record, "projects");
  }
  for (const record of data.lore) {
    await saveLocalRecord({ entity: "lore", id: record.id, data: { ...record, _category: record.loreCategory ?? record.category }, serverSequence: data.cursor, dirty: false, deleted: false, updatedAt: new Date().toISOString() });
    await cacheThumbnails(record, "lore");
  }
  for (const record of data.gallery) {
    await saveLocalRecord({ entity: "gallery", id: record.id, data: record, serverSequence: data.cursor, dirty: false, deleted: false, updatedAt: new Date().toISOString() });
    await cacheThumbnails(record, "gallery");
  }
  await updateWorkspaceMeta({ cursor: data.cursor, lastSyncAt: new Date().toISOString() });
  return data.cursor;
}

async function pushOperations(): Promise<{ applied: number; conflicts: number; failed: number }> {
  const meta = await getWorkspaceMeta();
  if (!meta) throw new Error("Workspace is not initialized.");
  const operations = (await listOperations("pending")).filter((operation) => operation.status === "pending");
  if (!operations.length) return { applied: 0, conflicts: 0, failed: 0 };
  const response = await syncRequest<{
    applied: Array<{ opId: string; entity: SyncEntity; id: string; sequence: string; record: unknown | null }>;
    conflicts: Array<{ opId: string; entity: SyncEntity; id: string; serverSequence: string; serverRecord: unknown | null }>;
    rejected: Array<{ opId: string; reason: string; message: string }>;
  }>("/sync/push", {
    method: "POST",
    body: JSON.stringify({
      clientId: meta.clientId,
      changes: operations.map((operation) => ({
        opId: operation.opId,
        entity: operation.entity,
        id: operation.id,
        action: operation.action,
        baseSequence: operation.baseSequence,
        record: operation.record ? stripDecorations(operation.record) : undefined,
      })),
    }),
  });

  for (const applied of response.applied) {
    const entity = entityForSync(applied.entity);
    const local = await getLocalRecord(entity, applied.id);
    if (local) {
      await saveLocalRecord({
        ...local,
        data: applied.record === null ? local.data : localRecordForChange({ ...applied, action: "upsert", sequence: applied.sequence, record: applied.record }),
        serverSequence: applied.sequence,
        dirty: false,
        deleted: applied.record === null,
      });
    }
    await deleteOperation(applied.opId);
  }

  for (const conflict of response.conflicts) {
    const entity = entityForSync(conflict.entity);
    const local = await getLocalRecord(entity, conflict.id);
    const operation = await listOperations().then((items) => items.find((item) => item.opId === conflict.opId));
    if (!operation) continue;
    await saveOperation({ ...operation, status: "conflict" });
    await saveConflict({
      key: `${entity}:${conflict.id}:${conflict.opId}`,
      opId: conflict.opId,
      entity,
      id: conflict.id,
      localRecord: local?.data ?? null,
      serverRecord: localRecordForChange({ ...conflict, action: "upsert", sequence: conflict.serverSequence, record: conflict.serverRecord }),
      serverSequence: conflict.serverSequence,
      createdAt: new Date().toISOString(),
    });
  }

  for (const rejected of response.rejected) {
    const operation = await listOperations().then((items) => items.find((item) => item.opId === rejected.opId));
    if (operation) await saveOperation({ ...operation, status: "failed", error: `${rejected.reason}: ${rejected.message}` });
  }
  return { applied: response.applied.length, conflicts: response.conflicts.length, failed: response.rejected.length };
}

async function pullChanges() {
  const meta = await getWorkspaceMeta();
  if (!meta) throw new Error("Workspace is not initialized.");
  let cursor = meta.cursor;
  let hasMore = true;
  while (hasMore) {
    const data = await syncRequest<{ changes: SyncChange[]; nextCursor: string; hasMore: boolean }>(`/sync/changes?after=${encodeURIComponent(cursor)}&limit=100`);
    for (const change of data.changes) await applyPulledChange(change);
    cursor = data.nextCursor;
    hasMore = data.hasMore;
    await updateWorkspaceMeta({ cursor });
  }
  return cursor;
}

export async function syncWorkspace(): Promise<SyncResult> {
  if (!syncToken) throw new Error("Sync requires backend sign-in.");
  await uploadPendingMedia();
  const pushed = await pushOperations();
  const cursor = await pullChanges();
  await updateWorkspaceMeta({ cursor, lastSyncAt: new Date().toISOString() });
  return { ...pushed, cursor };
}

export async function resolveConflict(conflict: LocalConflict, resolution: "local" | "server") {
  const local = await getLocalRecord(conflict.entity, conflict.id);
  if (!local) throw new Error("Local record no longer exists.");
  if (resolution === "server") {
    await saveLocalRecord({
      ...local,
      data: conflict.serverRecord ?? {},
      serverSequence: conflict.serverSequence,
      dirty: false,
      deleted: conflict.serverRecord === null,
      updatedAt: new Date().toISOString(),
    });
    await deleteOperation(conflict.opId);
  } else {
    const previousOperation = await listOperations().then((items) => items.find((item) => item.opId === conflict.opId));
    await saveOperation({
      opId: crypto.randomUUID(),
      entity: conflict.entity,
      id: conflict.id,
      action: previousOperation?.action ?? "upsert",
      baseSequence: conflict.serverSequence,
      record: previousOperation?.action === "delete" ? undefined : local.data,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  }
  await deleteConflict(conflict.key);
}
