import type { LoreEvent } from "@/types";
import {
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import type { LoreSort } from "@/services/loreApi";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, type BackendPage } from "@/services/restClient";

export async function getEvents(): Promise<LoreEvent[]> {
  return unwrapPageItems(await apiRequest<LoreEvent[] | BackendPage<LoreEvent>>("/lore/events"));
}

export async function getEventsPage(params: PaginationParams & { sort?: LoreSort } = {}): Promise<PaginatedResponse<LoreEvent>> {
  return toPageResponse(
    await apiRequest<LoreEvent[] | BackendPage<LoreEvent>>(`/lore/events${buildQuery({ ...params, q: params.search })}`),
    params,
  );
}

export async function getEvent(id: string): Promise<LoreEvent | undefined> {
  return apiRequest<LoreEvent>(`/lore/events/${id}`);
}

export async function createEvent(event: Omit<LoreEvent, "id">): Promise<LoreEvent> {
  return apiRequest<LoreEvent>("/lore/events", { method: "POST", body: event });
}

export async function updateEvent(id: string, data: Partial<LoreEvent>): Promise<LoreEvent | undefined> {
  return apiRequest<LoreEvent>(`/lore/events/${id}`, { method: "PUT", body: data });
}

export async function deleteEvent(id: string): Promise<boolean> {
  await apiRequest(`/lore/events/${id}`, { method: "DELETE" });
  return true;
}
