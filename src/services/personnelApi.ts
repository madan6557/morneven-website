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

export async function listPersonnel(): Promise<PersonnelUser[]> {
  return withDemoFallback(
    async () => unwrapPageItems(await apiRequest<PersonnelUser[] | BackendPage<PersonnelUser>>("/personnel")),
    async () => {
      await delay();
      return [...personnel];
    },
  );
}

export async function lookupPersonnelByUsernames(usernames: string[]): Promise<PersonnelUser[]> {
  const unique = [...new Set(usernames.map((name) => name.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  return withDemoFallback(
    async () => unwrapPageItems(await apiRequest<PersonnelUser[] | BackendPage<PersonnelUser>>(
      `/personnel/lookup?usernames=${encodeURIComponent(unique.join(","))}`,
    )),
    async () => {
      await delay();
      const wanted = new Set(unique);
      return personnel.filter((person) => wanted.has(person.username));
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
