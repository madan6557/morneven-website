import type { Character, Creature, OtherLore, Place, Technology } from "@/types";
import {
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, type BackendPage } from "@/services/restClient";

export type LoreSort = "name" | "name-desc";

interface LorePageParams extends PaginationParams {
  sort?: LoreSort;
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
  return getLoreList<Character>("characters");
}

export async function getCharactersPage(params: LorePageParams = {}): Promise<PaginatedResponse<Character>> {
  return getLorePage<Character>("characters", params);
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  return getLoreItem<Character>("characters", id);
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
  return getLoreList<Place>("places");
}

export async function getPlacesPage(params: LorePageParams = {}): Promise<PaginatedResponse<Place>> {
  return getLorePage<Place>("places", params);
}

export async function getPlace(id: string): Promise<Place | undefined> {
  return getLoreItem<Place>("places", id);
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
  return getLoreList<Technology>("technology");
}

export async function getTechnologyPage(params: LorePageParams = {}): Promise<PaginatedResponse<Technology>> {
  return getLorePage<Technology>("technology", params);
}

export async function getTech(id: string): Promise<Technology | undefined> {
  return getLoreItem<Technology>("technology", id);
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
  return getLoreList<Creature>("creatures");
}

export async function getCreaturesPage(params: LorePageParams = {}): Promise<PaginatedResponse<Creature>> {
  return getLorePage<Creature>("creatures", params);
}

export async function getCreature(id: string): Promise<Creature | undefined> {
  return getLoreItem<Creature>("creatures", id);
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
  return getLoreList<OtherLore>("other");
}

export async function getOthersPage(params: LorePageParams = {}): Promise<PaginatedResponse<OtherLore>> {
  return getLorePage<OtherLore>("other", params);
}

export async function getOther(id: string): Promise<OtherLore | undefined> {
  return getLoreItem<OtherLore>("other", id);
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
