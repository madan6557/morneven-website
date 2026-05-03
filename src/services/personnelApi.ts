// Personnel management service — mirrors the pattern in services/api.ts so a
// future Express/Supabase backend can swap the storage without touching pages.
//
// All exports are async and return cloned data to keep the in-memory store
// immutable from the caller's perspective. Endpoint names map 1:1 to a future
// REST surface:
//   GET    /api/personnel              → listPersonnel
//   GET    /api/personnel/:id          → getPersonnel
//   PUT    /api/personnel/:id          → updatePersonnel
//   POST   /api/personnel              → createPersonnel
//   DELETE /api/personnel/:id          → deletePersonnel
import type { PersonnelUser } from "@/types";
import seed from "@/data/personnel.json";
import { apiRequest, unwrapPageItems, withDemoFallback, type BackendPage } from "@/services/restClient";

const STORAGE_KEY = "morneven_personnel";
const METADATA_CACHE_KEY = "morneven_personnel_metadata_cache_v1";

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read(): PersonnelUser[] {
  if (!hasStorage()) return [...(seed as PersonnelUser[])];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...(seed as PersonnelUser[])];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PersonnelUser[]) : [...(seed as PersonnelUser[])];
  } catch {
    return [...(seed as PersonnelUser[])];
  }
}

function write(value: PersonnelUser[]) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

const personnel: PersonnelUser[] = read();
const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

function normalizePersonnelUser(user: PersonnelUser): PersonnelUser {
  const raw = user as PersonnelUser & {
    personnelLevel?: PersonnelUser["level"];
    clearanceLevel?: PersonnelUser["level"];
    title?: string;
  };

  return {
    ...user,
    level: raw.level ?? raw.personnelLevel ?? raw.clearanceLevel ?? 0,
    track: raw.track ?? "executive",
    note: raw.note ?? raw.title,
  };
}

function normalizePersonnelList(items: PersonnelUser[]): PersonnelUser[] {
  return items.map(normalizePersonnelUser);
}

function readMetadataCache(): PersonnelUser[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(METADATA_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizePersonnelList(parsed as PersonnelUser[]) : [];
  } catch {
    return [];
  }
}

function writeMetadataCache(items: PersonnelUser[]) {
  if (!hasStorage()) return;
  try {
    const current = readMetadataCache();
    const map = new Map(current.map((item) => [item.username.toLowerCase(), item]));
    normalizePersonnelList(items).forEach((item) => map.set(item.username.toLowerCase(), item));
    window.localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify([...map.values()]));
  } catch {
    // ignore quota errors
  }
}

function matchLocalMetadata(usernames: string[]): PersonnelUser[] {
  const wanted = new Set(usernames.map((name) => name.toLowerCase()));
  const local = [...readMetadataCache(), ...personnel];
  const map = new Map<string, PersonnelUser>();
  local.forEach((person) => {
    if (wanted.has(person.username.toLowerCase())) {
      map.set(person.username.toLowerCase(), normalizePersonnelUser(person));
    }
  });
  return [...map.values()];
}

export async function listPersonnel(): Promise<PersonnelUser[]> {
  return withDemoFallback(
    async () => {
      const items = normalizePersonnelList(
        unwrapPageItems(await apiRequest<PersonnelUser[] | BackendPage<PersonnelUser>>("/personnel")),
      );
      writeMetadataCache(items);
      return items;
    },
    async () => {
      await delay();
      return normalizePersonnelList([...personnel]);
    },
  );
}

export async function lookupPersonnelByUsernames(usernames: string[]): Promise<PersonnelUser[]> {
  const unique = [...new Set(usernames.map((name) => name.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const localMatches = matchLocalMetadata(unique);

  return withDemoFallback(
    async () => {
      const remoteItems = normalizePersonnelList(
        unwrapPageItems(
          await apiRequest<PersonnelUser[] | BackendPage<PersonnelUser>>(
            `/personnel/lookup?usernames=${encodeURIComponent(unique.join(","))}`,
          ),
        ),
      );
      writeMetadataCache(remoteItems);

      const map = new Map(localMatches.map((item) => [item.username.toLowerCase(), item]));
      remoteItems.forEach((item) => map.set(item.username.toLowerCase(), item));
      return [...map.values()];
    },
    async () => {
      await delay();
      return localMatches;
    },
  );
}

export async function getPersonnel(id: string): Promise<PersonnelUser | undefined> {
  return withDemoFallback(
    () => apiRequest<PersonnelUser>(`/personnel/${id}`),
    async () => {
      await delay();
      return personnel.find((p) => p.id === id);
    },
  );
}

export async function updatePersonnel(
  id: string,
  patch: Partial<Omit<PersonnelUser, "id">>,
): Promise<PersonnelUser | undefined> {
  return apiRequest<PersonnelUser>(`/personnel/${id}`, { method: "PUT", body: patch });
}

// Apply the same partial patch to many records in one round-trip. Mirrors a
// future REST endpoint:
//   PATCH /api/personnel/bulk  { ids: string[], patch: {...} }
// Returns the updated records (only those that were found).
export async function bulkUpdatePersonnel(
  ids: string[],
  patch: Partial<Omit<PersonnelUser, "id">>,
): Promise<PersonnelUser[]> {
  return apiRequest<PersonnelUser[]>("/personnel/bulk", { method: "PATCH", body: { ids, patch } });
}

export async function createPersonnel(data: Omit<PersonnelUser, "id">): Promise<PersonnelUser> {
  return apiRequest<PersonnelUser>("/personnel", { method: "POST", body: data });
}

export async function deletePersonnel(id: string): Promise<boolean> {
  await apiRequest(`/personnel/${id}`, { method: "DELETE" });
  return true;
}
