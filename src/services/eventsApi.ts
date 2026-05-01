import type { LoreEvent } from "@/types";
import { db, delay, STORAGE_KEYS, writeCollection } from "@/services/dataStore";
import {
  matchesSearch,
  paginateCollection,
  pickByIds,
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import type { LoreSort } from "@/services/loreApi";

// CRUD for Lore Events. Mirrors the shape of loreApi entries so a future
// backend can swap the in-memory db for a REST/SQL layer without UI changes.

export async function getEvents(): Promise<LoreEvent[]> {
  await delay();
  return [...db.events];
}

export async function getEventsPage(params: PaginationParams & { sort?: LoreSort } = {}): Promise<PaginatedResponse<LoreEvent>> {
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
}

export async function getEvent(id: string): Promise<LoreEvent | undefined> {
  await delay();
  return db.events.find((e) => e.id === id);
}

export async function createEvent(event: Omit<LoreEvent, "id">): Promise<LoreEvent> {
  await delay();
  const next: LoreEvent = { ...event, id: `evt-${Date.now()}` };
  db.events = [next, ...db.events];
  writeCollection(STORAGE_KEYS.events, db.events);
  return next;
}

export async function updateEvent(id: string, data: Partial<LoreEvent>): Promise<LoreEvent | undefined> {
  await delay();
  const idx = db.events.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  db.events[idx] = { ...db.events[idx], ...data };
  writeCollection(STORAGE_KEYS.events, db.events);
  return db.events[idx];
}

export async function deleteEvent(id: string): Promise<boolean> {
  await delay();
  const len = db.events.length;
  db.events = db.events.filter((e) => e.id !== id);
  writeCollection(STORAGE_KEYS.events, db.events);
  return db.events.length < len;
}
