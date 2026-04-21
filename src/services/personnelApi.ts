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

let personnel: PersonnelUser[] = read();
const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

export async function listPersonnel(): Promise<PersonnelUser[]> {
  await delay();
  return [...personnel];
}

export async function getPersonnel(id: string): Promise<PersonnelUser | undefined> {
  await delay();
  return personnel.find((p) => p.id === id);
}

export async function updatePersonnel(
  id: string,
  patch: Partial<Omit<PersonnelUser, "id">>,
): Promise<PersonnelUser | undefined> {
  await delay();
  const idx = personnel.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  personnel[idx] = {
    ...personnel[idx],
    ...patch,
    updatedAt: new Date().toISOString().split("T")[0],
  };
  write(personnel);
  return personnel[idx];
}

export async function createPersonnel(data: Omit<PersonnelUser, "id">): Promise<PersonnelUser> {
  await delay();
  const newUser: PersonnelUser = {
    ...data,
    id: `psn-${Date.now()}`,
    updatedAt: new Date().toISOString().split("T")[0],
  };
  personnel = [newUser, ...personnel];
  write(personnel);
  return newUser;
}

export async function deletePersonnel(id: string): Promise<boolean> {
  await delay();
  const len = personnel.length;
  personnel = personnel.filter((p) => p.id !== id);
  write(personnel);
  return personnel.length < len;
}
