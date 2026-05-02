import type { Character, Creature, OtherLore, Place, Technology } from "@/types";
import { db, delay } from "@/services/dataStore";
import {
  matchesSearch,
  paginateCollection,
  pickByIds,
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, withDemoFallback, type BackendPage } from "@/services/restClient";

export type LoreSort = "name" | "name-desc";

interface LorePageParams extends PaginationParams {
  sort?: LoreSort;
}

function sortNamedItems<T extends { name?: string; title?: string }>(items: T[], sort?: LoreSort): T[] {
  if (!sort) return items;

  return [...items].sort((a, b) => {
    const aName = (a.name || a.title || "").toLowerCase();
    const bName = (b.name || b.title || "").toLowerCase();
    return sort === "name" ? aName.localeCompare(bName) : bName.localeCompare(aName);
  });
}

function getLoreList<T>(category: string): Promise<T[]> {
  return apiRequest<T[] | BackendPage<T>>(`/lore/${category}`).then(unwrapPageItems);
}

function getLorePage<T>(category: string, params: LorePageParams): Promise<PaginatedResponse<T>> {
  return apiRequest<T[] | BackendPage<T>>(`/lore/${category}${buildQuery({ ...params, q: params.search })}`).then((data) =>
    toPageResponse(data, params),
  );
}

function getLoreItem<T>(category: string, id: string): Promise<T> {
  return apiRequest<T>(`/lore/${category}/${id}`);
}

function createLoreItem<T>(category: string, data: Omit<T, "id">): Promise<T> {
  return apiRequest<T>(`/lore/${category}`, { method: "POST", body: data });
}

function updateLoreItem<T>(category: string, id: string, data: Partial<T>): Promise<T> {
  return apiRequest<T>(`/lore/${category}/${id}`, { method: "PUT", body: data });
}

async function deleteLoreItem(category: string, id: string): Promise<boolean> {
  await apiRequest(`/lore/${category}/${id}`, { method: "DELETE" });
  return true;
}

// Characters
export async function getCharacters(): Promise<Character[]> {
  return withDemoFallback(() => getLoreList<Character>("characters"), async () => {
    await delay();
    return [...db.characters];
  });
}

export async function getCharactersPage(params: LorePageParams = {}): Promise<PaginatedResponse<Character>> {
  return withDemoFallback(() => getLorePage<Character>("characters", params), async () => {
    await delay();
    const { ids, page, pageSize, search, sort } = params;
    const items = sortNamedItems(
      pickByIds([...db.characters], ids).filter((item) => matchesSearch(search, [item.name, item.race, item.occupation, item.shortDesc])),
      sort,
    );
    return paginateCollection(items, { page, pageSize });
  });
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  return withDemoFallback(() => getLoreItem<Character>("characters", id), async () => {
    await delay();
    return db.characters.find((c) => c.id === id);
  });
}

export async function createCharacter(character: Omit<Character, "id">): Promise<Character> {
  return createLoreItem<Character>("characters", character);
}

export async function updateCharacter(id: string, data: Partial<Character>): Promise<Character | undefined> {
  return updateLoreItem<Character>("characters", id, data);
}

export async function deleteCharacter(id: string): Promise<boolean> {
  return deleteLoreItem("characters", id);
}

// Places
export async function getPlaces(): Promise<Place[]> {
  return withDemoFallback(() => getLoreList<Place>("places"), async () => {
    await delay();
    return [...db.places];
  });
}

export async function getPlacesPage(params: LorePageParams = {}): Promise<PaginatedResponse<Place>> {
  return withDemoFallback(() => getLorePage<Place>("places", params), async () => {
    await delay();
    const { ids, page, pageSize, search, sort } = params;
    const items = sortNamedItems(
      pickByIds([...db.places], ids).filter((item) => matchesSearch(search, [item.name, item.type, item.shortDesc])),
      sort,
    );
    return paginateCollection(items, { page, pageSize });
  });
}

export async function getPlace(id: string): Promise<Place | undefined> {
  return withDemoFallback(() => getLoreItem<Place>("places", id), async () => {
    await delay();
    return db.places.find((p) => p.id === id);
  });
}

export async function createPlace(place: Omit<Place, "id">): Promise<Place> {
  return createLoreItem<Place>("places", place);
}

export async function updatePlace(id: string, data: Partial<Place>): Promise<Place | undefined> {
  return updateLoreItem<Place>("places", id, data);
}

export async function deletePlace(id: string): Promise<boolean> {
  return deleteLoreItem("places", id);
}

// Technology
export async function getTechnology(): Promise<Technology[]> {
  return withDemoFallback(() => getLoreList<Technology>("technology"), async () => {
    await delay();
    return [...db.technology];
  });
}

export async function getTechnologyPage(params: LorePageParams = {}): Promise<PaginatedResponse<Technology>> {
  return withDemoFallback(() => getLorePage<Technology>("technology", params), async () => {
    await delay();
    const { ids, page, pageSize, search, sort } = params;
    const items = sortNamedItems(
      pickByIds([...db.technology], ids).filter((item) => matchesSearch(search, [item.name, item.category, item.shortDesc])),
      sort,
    );
    return paginateCollection(items, { page, pageSize });
  });
}

export async function getTech(id: string): Promise<Technology | undefined> {
  return withDemoFallback(() => getLoreItem<Technology>("technology", id), async () => {
    await delay();
    return db.technology.find((t) => t.id === id);
  });
}

export async function createTech(tech: Omit<Technology, "id">): Promise<Technology> {
  return createLoreItem<Technology>("technology", tech);
}

export async function updateTech(id: string, data: Partial<Technology>): Promise<Technology | undefined> {
  return updateLoreItem<Technology>("technology", id, data);
}

export async function deleteTech(id: string): Promise<boolean> {
  return deleteLoreItem("technology", id);
}

// Creatures
export async function getCreatures(): Promise<Creature[]> {
  return withDemoFallback(() => getLoreList<Creature>("creatures"), async () => {
    await delay();
    return [...db.creatures];
  });
}

export async function getCreaturesPage(params: LorePageParams = {}): Promise<PaginatedResponse<Creature>> {
  return withDemoFallback(() => getLorePage<Creature>("creatures", params), async () => {
    await delay();
    const { ids, page, pageSize, search, sort } = params;
    const items = sortNamedItems(
      pickByIds([...db.creatures], ids).filter((item) => matchesSearch(search, [item.name, item.classification, item.habitat, item.shortDesc])),
      sort,
    );
    return paginateCollection(items, { page, pageSize });
  });
}

export async function getCreature(id: string): Promise<Creature | undefined> {
  return withDemoFallback(() => getLoreItem<Creature>("creatures", id), async () => {
    await delay();
    return db.creatures.find((c) => c.id === id);
  });
}

export async function createCreature(creature: Omit<Creature, "id">): Promise<Creature> {
  return createLoreItem<Creature>("creatures", creature);
}

export async function updateCreature(id: string, data: Partial<Creature>): Promise<Creature | undefined> {
  return updateLoreItem<Creature>("creatures", id, data);
}

export async function deleteCreature(id: string): Promise<boolean> {
  return deleteLoreItem("creatures", id);
}

// Other lore
export async function getOthers(): Promise<OtherLore[]> {
  return withDemoFallback(() => getLoreList<OtherLore>("other"), async () => {
    await delay();
    return [...db.others];
  });
}

export async function getOthersPage(params: LorePageParams = {}): Promise<PaginatedResponse<OtherLore>> {
  return withDemoFallback(() => getLorePage<OtherLore>("other", params), async () => {
    await delay();
    const { ids, page, pageSize, search, sort } = params;
    const items = sortNamedItems(
      pickByIds([...db.others], ids).filter((item) => matchesSearch(search, [item.title, item.category, item.shortDesc])),
      sort,
    );
    return paginateCollection(items, { page, pageSize });
  });
}

export async function getOther(id: string): Promise<OtherLore | undefined> {
  return withDemoFallback(() => getLoreItem<OtherLore>("other", id), async () => {
    await delay();
    return db.others.find((o) => o.id === id);
  });
}

export async function createOther(item: Omit<OtherLore, "id">): Promise<OtherLore> {
  return createLoreItem<OtherLore>("other", item);
}

export async function updateOther(id: string, data: Partial<OtherLore>): Promise<OtherLore | undefined> {
  return updateLoreItem<OtherLore>("other", id, data);
}

export async function deleteOther(id: string): Promise<boolean> {
  return deleteLoreItem("other", id);
}
