import type { LoreEvent } from "@/types";
import { db, delay } from "@/services/dataStore";
import {
  matchesSearch,
  paginateCollection,
  pickByIds,
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import type { LoreSort } from "@/services/loreApi";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, withDemoFallback, type BackendPage } from "@/services/restClient";

// CRUD for Lore Events. Mirrors the shape of loreApi entries so a future
// backend can swap the in-memory db for a REST/SQL layer without UI changes.

export async function getEvents(): Promise<LoreEvent[]> {
  return withDemoFallback(
    async () => unwrapPageItems(await apiRequest<LoreEvent[] | BackendPage<LoreEvent>>("/lore/events")),
    async () => {
      await delay();
      return [...db.events];
    },
  );
}

export async function getEventsPage(params: PaginationParams & { sort?: LoreSort } = {}): Promise<PaginatedResponse<LoreEvent>> {
  return withDemoFallback(
    async () => {
      const data = await apiRequest<LoreEvent[] | BackendPage<LoreEvent>>(
        `/lore/events${buildQuery({ ...params, q: params.search })}`,
      );
      return toPageResponse(data, params);
    },
    async () => {
      await delay();
      const { ids, page, pageSize, search, sort } = params;
      let items = pickByIds([...db.events], ids).filter((item) =>
        matchesSearch(search, [item.title, item.category, item.era, item.dateLabel, item.scope, item.shortDesc]),
      );

      if (sort) {
        items = [...items].sort((a, b) => {
          const aName = a.title.toLowerCase();
          const bName = b.title.toLowerCase();
          return sort === "name" ? aName.localeCompare(bName) : bName.localeCompare(aName);
        });
      }

      return paginateCollection(items, { page, pageSize });
    },
  );
}

export async function getEvent(id: string): Promise<LoreEvent | undefined> {
  return withDemoFallback(
    () => apiRequest<LoreEvent>(`/lore/events/${id}`),
    async () => {
      await delay();
      return db.events.find((e) => e.id === id);
    },
  );
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
