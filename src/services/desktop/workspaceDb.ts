import {
  decryptBytes,
  decryptJson,
  deriveWorkspaceKey,
  encryptBytes,
  encryptJson,
  randomBase64,
  requireActiveWorkspaceKey,
  setActiveWorkspaceKey,
  type EncryptedValue,
} from "./crypto";

const DB_NAME = "morneven-desktop-workspace";
const DB_VERSION = 1;
const META_ID = "main";
const VERIFIER = "morneven-local-workspace-v1";

export type DesktopEntity = "project" | "lore" | "gallery";

export interface WorkspaceProfile {
  username: string;
  role: "author";
  track: "executive" | "field" | "mechanic" | "logistics";
}

export interface WorkspaceMeta {
  id: typeof META_ID;
  schemaVersion: number;
  clientId: string;
  salt: string;
  verifier: EncryptedValue;
  profile: WorkspaceProfile;
  cursor: string;
  lastSyncAt?: string;
}

export interface LocalRecord<T = unknown> {
  entity: DesktopEntity;
  id: string;
  data: T;
  serverSequence: string | null;
  dirty: boolean;
  deleted: boolean;
  updatedAt: string;
}

export interface PendingOperation {
  opId: string;
  entity: DesktopEntity;
  id: string;
  action: "upsert" | "delete";
  baseSequence: string | null;
  record?: unknown;
  createdAt: string;
  status: "pending" | "conflict" | "failed";
  error?: string;
}

export interface LocalConflict {
  key: string;
  opId: string;
  entity: DesktopEntity;
  id: string;
  localRecord: unknown | null;
  serverRecord: unknown | null;
  serverSequence: string;
  createdAt: string;
}

export interface LocalMedia {
  id: string;
  sourceUrl?: string;
  uploadedUrl?: string;
  folder: "gallery" | "lore" | "projects" | "uploads";
  name: string;
  mime: string;
  size: number;
  pendingUpload: boolean;
  createdAt: string;
  payload: EncryptedValue;
}

interface StoredRecord {
  key: string;
  entity: DesktopEntity;
  id: string;
  serverSequence: string | null;
  dirty: boolean;
  deleted: boolean;
  updatedAt: string;
  payload: EncryptedValue;
}

interface StoredOperation {
  opId: string;
  status: PendingOperation["status"];
  payload: EncryptedValue;
}

interface StoredConflict {
  key: string;
  entity: DesktopEntity;
  id: string;
  payload: EncryptedValue;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB is unavailable in this runtime.");
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("workspace")) db.createObjectStore("workspace", { keyPath: "id" });
      if (!db.objectStoreNames.contains("records")) {
        const store = db.createObjectStore("records", { keyPath: "key" });
        store.createIndex("entity", "entity", { unique: false });
      }
      if (!db.objectStoreNames.contains("operations")) {
        const store = db.createObjectStore("operations", { keyPath: "opId" });
        store.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("conflicts")) {
        const store = db.createObjectStore("conflicts", { keyPath: "key" });
        store.createIndex("entity", "entity", { unique: false });
      }
      if (!db.objectStoreNames.contains("media")) {
        const store = db.createObjectStore("media", { keyPath: "id" });
        store.createIndex("sourceUrl", "sourceUrl", { unique: false });
        store.createIndex("pendingUpload", "pendingUpload", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open workspace database."));
  });

  return databasePromise;
}

async function clearStore(name: string) {
  const db = await openDatabase();
  const transaction = db.transaction(name, "readwrite");
  transaction.objectStore(name).clear();
  await transactionDone(transaction);
}

export async function getWorkspaceMeta(): Promise<WorkspaceMeta | null> {
  const db = await openDatabase();
  const transaction = db.transaction("workspace", "readonly");
  return (await requestResult(transaction.objectStore("workspace").get(META_ID))) as WorkspaceMeta | undefined ?? null;
}

async function putWorkspaceMeta(meta: WorkspaceMeta) {
  const db = await openDatabase();
  const transaction = db.transaction("workspace", "readwrite");
  transaction.objectStore("workspace").put(meta);
  await transactionDone(transaction);
}

export async function createWorkspace(
  pin: string,
  profile: WorkspaceProfile = { username: "Local Author", role: "author", track: "executive" },
): Promise<WorkspaceMeta> {
  if (await getWorkspaceMeta()) throw new Error("Workspace already exists.");
  const salt = randomBase64(16);
  const key = await deriveWorkspaceKey(pin, salt);
  const meta: WorkspaceMeta = {
    id: META_ID,
    schemaVersion: 1,
    clientId: crypto.randomUUID(),
    salt,
    verifier: await encryptJson(VERIFIER, key),
    profile,
    cursor: "0",
  };
  await putWorkspaceMeta(meta);
  setActiveWorkspaceKey(key);
  return meta;
}

export async function unlockWorkspace(pin: string): Promise<WorkspaceMeta> {
  const meta = await getWorkspaceMeta();
  if (!meta) throw new Error("Workspace is not initialized.");
  const key = await deriveWorkspaceKey(pin, meta.salt);
  try {
    const verifier = await decryptJson<string>(meta.verifier, key);
    if (verifier !== VERIFIER) throw new Error("Invalid PIN.");
  } catch {
    throw new Error("Invalid PIN.");
  }
  setActiveWorkspaceKey(key);
  return meta;
}

export function lockWorkspace() {
  setActiveWorkspaceKey(null);
}

export function isWorkspaceUnlocked(): boolean {
  try {
    requireActiveWorkspaceKey();
    return true;
  } catch {
    return false;
  }
}

export async function updateWorkspaceMeta(patch: Partial<Omit<WorkspaceMeta, "id">>): Promise<WorkspaceMeta> {
  const current = await getWorkspaceMeta();
  if (!current) throw new Error("Workspace is not initialized.");
  const next = { ...current, ...patch, id: META_ID } as WorkspaceMeta;
  await putWorkspaceMeta(next);
  return next;
}

export async function resetWorkspace() {
  lockWorkspace();
  const db = await openDatabase();
  db.close();
  databasePromise = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Unable to reset workspace."));
    request.onblocked = () => reject(new Error("Workspace is still open in another window."));
  });
}

function recordKey(entity: DesktopEntity, id: string) {
  return `${entity}:${id}`;
}

export async function getLocalRecord<T = unknown>(entity: DesktopEntity, id: string): Promise<LocalRecord<T> | null> {
  const db = await openDatabase();
  const transaction = db.transaction("records", "readonly");
  const stored = (await requestResult(transaction.objectStore("records").get(recordKey(entity, id)))) as StoredRecord | undefined;
  if (!stored) return null;
  return { ...stored, data: await decryptJson<T>(stored.payload) };
}

export async function listLocalRecords<T = unknown>(entity: DesktopEntity, includeDeleted = false): Promise<LocalRecord<T>[]> {
  const db = await openDatabase();
  const transaction = db.transaction("records", "readonly");
  const stored = (await requestResult(transaction.objectStore("records").index("entity").getAll(entity))) as StoredRecord[];
  const result: LocalRecord<T>[] = [];
  for (const item of stored) {
    if (!includeDeleted && item.deleted) continue;
    result.push({ ...item, data: await decryptJson<T>(item.payload) });
  }
  return result;
}

export async function saveLocalRecord<T>(record: LocalRecord<T>) {
  const payload = await encryptJson(record.data);
  const db = await openDatabase();
  const transaction = db.transaction("records", "readwrite");
  const stored: StoredRecord = {
    key: recordKey(record.entity, record.id),
    entity: record.entity,
    id: record.id,
    serverSequence: record.serverSequence,
    dirty: record.dirty,
    deleted: record.deleted,
    updatedAt: record.updatedAt,
    payload,
  };
  transaction.objectStore("records").put(stored);
  await transactionDone(transaction);
}

export async function deleteLocalRecord(entity: DesktopEntity, id: string) {
  const db = await openDatabase();
  const transaction = db.transaction("records", "readwrite");
  transaction.objectStore("records").delete(recordKey(entity, id));
  await transactionDone(transaction);
}

export async function listOperations(status?: PendingOperation["status"]): Promise<PendingOperation[]> {
  const db = await openDatabase();
  const transaction = db.transaction("operations", "readonly");
  const request = status
    ? transaction.objectStore("operations").index("status").getAll(status)
    : transaction.objectStore("operations").getAll();
  const stored = (await requestResult(request)) as Array<StoredOperation | PendingOperation>;
  return Promise.all(stored.map(async (item) => {
    if ("payload" in item) return decryptJson<PendingOperation>(item.payload);
    return item;
  }));
}

export async function getOperation(opId: string): Promise<PendingOperation | null> {
  const db = await openDatabase();
  const transaction = db.transaction("operations", "readonly");
  const item = await requestResult(transaction.objectStore("operations").get(opId)) as StoredOperation | PendingOperation | undefined;
  if (!item) return null;
  return "payload" in item ? decryptJson<PendingOperation>(item.payload) : item;
}

export async function saveOperation(operation: PendingOperation) {
  const payload = await encryptJson(operation);
  const db = await openDatabase();
  const transaction = db.transaction("operations", "readwrite");
  transaction.objectStore("operations").put({ opId: operation.opId, status: operation.status, payload } satisfies StoredOperation);
  await transactionDone(transaction);
}

export async function deleteOperation(opId: string) {
  const db = await openDatabase();
  const transaction = db.transaction("operations", "readwrite");
  transaction.objectStore("operations").delete(opId);
  await transactionDone(transaction);
}

export async function listConflicts(): Promise<LocalConflict[]> {
  const db = await openDatabase();
  const transaction = db.transaction("conflicts", "readonly");
  const stored = (await requestResult(transaction.objectStore("conflicts").getAll())) as Array<StoredConflict | LocalConflict>;
  return Promise.all(stored.map(async (item) => "payload" in item ? decryptJson<LocalConflict>(item.payload) : item));
}

export async function saveConflict(conflict: LocalConflict) {
  const payload = await encryptJson(conflict);
  const db = await openDatabase();
  const transaction = db.transaction("conflicts", "readwrite");
  transaction.objectStore("conflicts").put({ key: conflict.key, entity: conflict.entity, id: conflict.id, payload } satisfies StoredConflict);
  await transactionDone(transaction);
}

export async function deleteConflict(key: string) {
  const db = await openDatabase();
  const transaction = db.transaction("conflicts", "readwrite");
  transaction.objectStore("conflicts").delete(key);
  await transactionDone(transaction);
}

export async function saveMedia(file: File, folder: LocalMedia["folder"], sourceUrl?: string, existingId?: string): Promise<LocalMedia> {
  const id = existingId ?? crypto.randomUUID();
  const media: LocalMedia = {
    id,
    sourceUrl,
    folder,
    name: file.name || `${id}.bin`,
    mime: file.type || "application/octet-stream",
    size: file.size,
    pendingUpload: !sourceUrl,
    createdAt: new Date().toISOString(),
    payload: await encryptBytes(await file.arrayBuffer()),
  };
  const db = await openDatabase();
  const transaction = db.transaction("media", "readwrite");
  transaction.objectStore("media").put(media);
  await transactionDone(transaction);
  return media;
}

export async function getMedia(id: string): Promise<LocalMedia | null> {
  const db = await openDatabase();
  const transaction = db.transaction("media", "readonly");
  return (await requestResult(transaction.objectStore("media").get(id))) as LocalMedia | undefined ?? null;
}

export async function findMediaBySourceUrl(sourceUrl: string): Promise<LocalMedia | null> {
  const db = await openDatabase();
  const transaction = db.transaction("media", "readonly");
  const items = (await requestResult(transaction.objectStore("media").index("sourceUrl").getAll(sourceUrl))) as LocalMedia[];
  return items[0] ?? null;
}

export async function listPendingMedia(): Promise<LocalMedia[]> {
  const db = await openDatabase();
  const transaction = db.transaction("media", "readonly");
  const items = (await requestResult(transaction.objectStore("media").getAll())) as LocalMedia[];
  return items.filter((item) => item.pendingUpload);
}

export async function updateMedia(media: LocalMedia) {
  const db = await openDatabase();
  const transaction = db.transaction("media", "readwrite");
  transaction.objectStore("media").put(media);
  await transactionDone(transaction);
}

export async function getMediaBlob(media: LocalMedia): Promise<Blob> {
  return new Blob([await decryptBytes(media.payload)], { type: media.mime });
}

export async function getMediaBlobById(id: string): Promise<Blob | null> {
  const media = await getMedia(id);
  return media ? getMediaBlob(media) : null;
}

export async function clearWorkspaceData() {
  await Promise.all(["records", "operations", "conflicts", "media"].map(clearStore));
}

export async function exportWorkspaceData() {
  const meta = await getWorkspaceMeta();
  if (!meta) throw new Error("Workspace is not initialized.");
  const [projects, lore, gallery] = await Promise.all([
    listLocalRecords("project", true),
    listLocalRecords("lore", true),
    listLocalRecords("gallery", true),
  ]);
  return {
    meta: { ...meta, verifier: undefined },
    records: [...projects, ...lore, ...gallery],
    operations: await listOperations(),
    conflicts: await listConflicts(),
    media: await exportMedia(),
  };
}

async function exportMedia() {
  const db = await openDatabase();
  const transaction = db.transaction("media", "readonly");
  const items = (await requestResult(transaction.objectStore("media").getAll())) as LocalMedia[];
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      payload: await decryptBytes(item.payload).then((buffer) => Array.from(new Uint8Array(buffer))),
    })),
  );
}

export async function importWorkspaceData(snapshot: Awaited<ReturnType<typeof exportWorkspaceData>>) {
  if (snapshot.meta.schemaVersion !== 1) throw new Error("Unsupported workspace schema version.");
  await clearWorkspaceData();
  for (const record of snapshot.records) await saveLocalRecord(record);
  for (const operation of snapshot.operations) await saveOperation(operation);
  for (const conflict of snapshot.conflicts) await saveConflict(conflict);
  for (const item of snapshot.media) {
    const media: LocalMedia = {
      ...item,
      payload: await encryptBytes(new Uint8Array(item.payload).buffer),
    };
    await updateMedia(media);
  }
  await updateWorkspaceMeta({
    clientId: snapshot.meta.clientId,
    profile: snapshot.meta.profile,
    schemaVersion: snapshot.meta.schemaVersion,
    cursor: snapshot.meta.cursor,
    lastSyncAt: snapshot.meta.lastSyncAt
  });
}
