import type { LoreEvent } from "@/types";
import {
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import type { LoreSort } from "@/services/loreApi";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, type BackendPage } from "@/services/restClient";
import { isDesktopApp } from "@/services/desktop/runtime";
import * as desktopRepository from "@/services/desktop/repository";

export async function getEvents(): Promise<LoreEvent[]> {
  if (isDesktopApp) return desktopRepository.getEvents();
  return unwrapPageItems(await apiRequest<LoreEvent[] | BackendPage<LoreEvent>>("/lore/events"));
}

export async function getEventsPage(params: PaginationParams & { sort?: LoreSort } = {}): Promise<PaginatedResponse<LoreEvent>> {
  if (isDesktopApp) return desktopRepository.getEventsPage(params);
  return toPageResponse(
    await apiRequest<LoreEvent[] | BackendPage<LoreEvent>>(`/lore/events${buildQuery({ ...params, q: params.search })}`),
    params,
  );
}

export async function getEvent(id: string): Promise<LoreEvent | undefined> {
  if (isDesktopApp) return desktopRepository.getEvent(id);
  return apiRequest<LoreEvent>(`/lore/events/${id}`);
}

export async function createEvent(event: Omit<LoreEvent, "id">): Promise<LoreEvent> {
  if (isDesktopApp) return desktopRepository.createEvent(event);
  return apiRequest<LoreEvent>("/lore/events", { method: "POST", body: event });
}

export async function updateEvent(id: string, data: Partial<LoreEvent>): Promise<LoreEvent | undefined> {
  if (isDesktopApp) return desktopRepository.updateEvent(id, data);
  return apiRequest<LoreEvent>(`/lore/events/${id}`, { method: "PUT", body: data });
}

export async function deleteEvent(id: string): Promise<boolean> {
  if (isDesktopApp) return desktopRepository.deleteEvent(id);
  await apiRequest(`/lore/events/${id}`, { method: "DELETE" });
  return true;
}
