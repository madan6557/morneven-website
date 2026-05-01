import type { Character, Creature, OtherLore, Place, Technology } from "@/types";
import { db, delay, STORAGE_KEYS, writeCollection } from "@/services/dataStore";
import {
  matchesSearch,
  paginateCollection,
  pickByIds,
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";

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

// Characters
export async function getCharacters(): Promise<Character[]> {
  await delay();
  return [...db.characters];
}

export async function getCharactersPage(params: LorePageParams = {}): Promise<PaginatedResponse<Character>> {
  await delay();
  const { ids, page, pageSize, search, sort } = params;
  const items = sortNamedItems(
    pickByIds([...db.characters], ids).filter((item) => matchesSearch(search, [item.name, item.race, item.occupation, item.shortDesc])),
    sort,
  );
  return paginateCollection(items, { page, pageSize });
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  await delay();
  return db.characters.find((c) => c.id === id);
}

export async function createCharacter(character: Omit<Character, "id">): Promise<Character> {
  await delay();
  const next = { ...character, id: `char-${Date.now()}` };
  db.characters = [next, ...db.characters];
  writeCollection(STORAGE_KEYS.characters, db.characters);
  return next;
}

export async function updateCharacter(id: string, data: Partial<Character>): Promise<Character | undefined> {
  await delay();
  const idx = db.characters.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  db.characters[idx] = { ...db.characters[idx], ...data };
  writeCollection(STORAGE_KEYS.characters, db.characters);
  return db.characters[idx];
}

export async function deleteCharacter(id: string): Promise<boolean> {
  await delay();
  const len = db.characters.length;
  db.characters = db.characters.filter((c) => c.id !== id);
  writeCollection(STORAGE_KEYS.characters, db.characters);
  return db.characters.length < len;
}

// Places
export async function getPlaces(): Promise<Place[]> {
  await delay();
  return [...db.places];
}

export async function getPlacesPage(params: LorePageParams = {}): Promise<PaginatedResponse<Place>> {
  await delay();
  const { ids, page, pageSize, search, sort } = params;
  const items = sortNamedItems(
    pickByIds([...db.places], ids).filter((item) => matchesSearch(search, [item.name, item.type, item.shortDesc])),
    sort,
  );
  return paginateCollection(items, { page, pageSize });
}

export async function getPlace(id: string): Promise<Place | undefined> {
  await delay();
  return db.places.find((p) => p.id === id);
}

export async function createPlace(place: Omit<Place, "id">): Promise<Place> {
  await delay();
  const next = { ...place, id: `place-${Date.now()}` };
  db.places = [next, ...db.places];
  writeCollection(STORAGE_KEYS.places, db.places);
  return next;
}

export async function updatePlace(id: string, data: Partial<Place>): Promise<Place | undefined> {
  await delay();
  const idx = db.places.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  db.places[idx] = { ...db.places[idx], ...data };
  writeCollection(STORAGE_KEYS.places, db.places);
  return db.places[idx];
}

export async function deletePlace(id: string): Promise<boolean> {
  await delay();
  const len = db.places.length;
  db.places = db.places.filter((p) => p.id !== id);
  writeCollection(STORAGE_KEYS.places, db.places);
  return db.places.length < len;
}

// Technology
export async function getTechnology(): Promise<Technology[]> {
  await delay();
  return [...db.technology];
}

export async function getTechnologyPage(params: LorePageParams = {}): Promise<PaginatedResponse<Technology>> {
  await delay();
  const { ids, page, pageSize, search, sort } = params;
  const items = sortNamedItems(
    pickByIds([...db.technology], ids).filter((item) => matchesSearch(search, [item.name, item.category, item.shortDesc])),
    sort,
  );
  return paginateCollection(items, { page, pageSize });
}

export async function getTech(id: string): Promise<Technology | undefined> {
  await delay();
  return db.technology.find((t) => t.id === id);
}

export async function createTech(tech: Omit<Technology, "id">): Promise<Technology> {
  await delay();
  const next = { ...tech, id: `tech-${Date.now()}` };
  db.technology = [next, ...db.technology];
  writeCollection(STORAGE_KEYS.technology, db.technology);
  return next;
}

export async function updateTech(id: string, data: Partial<Technology>): Promise<Technology | undefined> {
  await delay();
  const idx = db.technology.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  db.technology[idx] = { ...db.technology[idx], ...data };
  writeCollection(STORAGE_KEYS.technology, db.technology);
  return db.technology[idx];
}

export async function deleteTech(id: string): Promise<boolean> {
  await delay();
  const len = db.technology.length;
  db.technology = db.technology.filter((t) => t.id !== id);
  writeCollection(STORAGE_KEYS.technology, db.technology);
  return db.technology.length < len;
}

// Creatures
export async function getCreatures(): Promise<Creature[]> {
  await delay();
  return [...db.creatures];
}

export async function getCreaturesPage(params: LorePageParams = {}): Promise<PaginatedResponse<Creature>> {
  await delay();
  const { ids, page, pageSize, search, sort } = params;
  const items = sortNamedItems(
    pickByIds([...db.creatures], ids).filter((item) => matchesSearch(search, [item.name, item.classification, item.habitat, item.shortDesc])),
    sort,
  );
  return paginateCollection(items, { page, pageSize });
}

export async function getCreature(id: string): Promise<Creature | undefined> {
  await delay();
  return db.creatures.find((c) => c.id === id);
}

export async function createCreature(creature: Omit<Creature, "id">): Promise<Creature> {
  await delay();
  const next = { ...creature, id: `crea-${Date.now()}` };
  db.creatures = [next, ...db.creatures];
  writeCollection(STORAGE_KEYS.creatures, db.creatures);
  return next;
}

export async function updateCreature(id: string, data: Partial<Creature>): Promise<Creature | undefined> {
  await delay();
  const idx = db.creatures.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  db.creatures[idx] = { ...db.creatures[idx], ...data };
  writeCollection(STORAGE_KEYS.creatures, db.creatures);
  return db.creatures[idx];
}

export async function deleteCreature(id: string): Promise<boolean> {
  await delay();
  const len = db.creatures.length;
  db.creatures = db.creatures.filter((c) => c.id !== id);
  writeCollection(STORAGE_KEYS.creatures, db.creatures);
  return db.creatures.length < len;
}

// Other lore
export async function getOthers(): Promise<OtherLore[]> {
  await delay();
  return [...db.others];
}

export async function getOthersPage(params: LorePageParams = {}): Promise<PaginatedResponse<OtherLore>> {
  await delay();
  const { ids, page, pageSize, search, sort } = params;
  const items = sortNamedItems(
    pickByIds([...db.others], ids).filter((item) => matchesSearch(search, [item.title, item.category, item.shortDesc])),
    sort,
  );
  return paginateCollection(items, { page, pageSize });
}

export async function getOther(id: string): Promise<OtherLore | undefined> {
  await delay();
  return db.others.find((o) => o.id === id);
}

export async function createOther(item: Omit<OtherLore, "id">): Promise<OtherLore> {
  await delay();
  const next = { ...item, id: `other-${Date.now()}` };
  db.others = [next, ...db.others];
  writeCollection(STORAGE_KEYS.other, db.others);
  return next;
}

export async function updateOther(id: string, data: Partial<OtherLore>): Promise<OtherLore | undefined> {
  await delay();
  const idx = db.others.findIndex((o) => o.id === id);
  if (idx === -1) return undefined;
  db.others[idx] = { ...db.others[idx], ...data };
  writeCollection(STORAGE_KEYS.other, db.others);
  return db.others[idx];
}

export async function deleteOther(id: string): Promise<boolean> {
  await delay();
  const len = db.others.length;
  db.others = db.others.filter((o) => o.id !== id);
  writeCollection(STORAGE_KEYS.other, db.others);
  return db.others.length < len;
}
