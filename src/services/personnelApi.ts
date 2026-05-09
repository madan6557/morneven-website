import { apiRequest, buildQuery, unwrapPageItems, type BackendPage } from "@/services/restClient";
import type { PersonnelUser } from "@/types";

const EVT = "morneven:personnel-changed";

type PersonnelPatch = Partial<
  Pick<PersonnelUser, "username" | "email" | "level" | "track" | "note" | "role">
>;

function emitPersonnelChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

export async function listPersonnel(
  filters: Partial<Pick<PersonnelUser, "track" | "level">> & { q?: string } = {},
): Promise<PersonnelUser[]> {
  return unwrapPageItems(
    await apiRequest<PersonnelUser[] | BackendPage<PersonnelUser>>(`/personnel${buildQuery(filters)}`),
  );
}

export async function lookupPersonnelByUsernames(usernames: string[]): Promise<PersonnelUser[]> {
  const unique = [...new Set(usernames.map((item) => item.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  return apiRequest<PersonnelUser[]>(`/personnel/lookup${buildQuery({ usernames: unique })}`);
}

export async function getPersonnel(id: string): Promise<PersonnelUser | undefined> {
  return apiRequest<PersonnelUser>(`/personnel/${id}`);
}

export async function createPersonnel(
  data: Omit<PersonnelUser, "id" | "updatedAt"> & { password?: string },
): Promise<PersonnelUser> {
  const created = await apiRequest<PersonnelUser>("/personnel", {
    method: "POST",
    body: data,
  });
  emitPersonnelChanged();
  return created;
}

export async function updatePersonnel(id: string, data: PersonnelPatch): Promise<PersonnelUser | undefined> {
  const updated = await apiRequest<PersonnelUser>(`/personnel/${id}`, {
    method: "PUT",
    body: data,
  });
  emitPersonnelChanged();
  return updated;
}

export async function bulkUpdatePersonnel(ids: string[], patch: PersonnelPatch): Promise<PersonnelUser[]> {
  const updated = await apiRequest<PersonnelUser[]>("/personnel/bulk", {
    method: "PATCH",
    body: { ids, patch },
  });
  emitPersonnelChanged();
  return updated;
}

export async function deletePersonnel(id: string): Promise<boolean> {
  await apiRequest(`/personnel/${id}`, { method: "DELETE" });
  emitPersonnelChanged();
  return true;
}

export async function sendPresenceHeartbeat(): Promise<void> {
  await apiRequest("/personnel/presence/heartbeat", { method: "POST" });
}

export function subscribePersonnel(cb: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}
