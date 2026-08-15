import type { Character, Creature, OtherLore, Place, Technology } from "@/types";
import {
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, type BackendPage } from "@/services/restClient";
import { isDesktopApp } from "@/services/desktop/runtime";
import * as desktopRepository from "@/services/desktop/repository";

export type LoreSort = "name" | "name-desc";

interface LorePageParams extends PaginationParams {
  sort?: LoreSort;
  searchScope?: "name-traits";
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

export async function setLoreStar(
  category: string,
  id: string,
  starred: boolean,
): Promise<{ views: number; stars: number; viewerStarred: boolean }> {
  if (isDesktopApp) return { views: 0, stars: 0, viewerStarred: false };
  return apiRequest(`/lore/${category}/${id}/star`, {
    method: "POST",
    body: { starred },
  });
}

// Characters
export async function getCharacters(): Promise<Character[]> {
  if (isDesktopApp) return desktopRepository.getCharacters();
  return getLoreList<Character>("characters");
}

export async function getCharactersPage(params: LorePageParams = {}): Promise<PaginatedResponse<Character>> {
  if (isDesktopApp) return desktopRepository.getCharactersPage(params);
  return getLorePage<Character>("characters", params);
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  if (isDesktopApp) return desktopRepository.getCharacter(id);
  return getLoreItem<Character>("characters", id);
}

export async function createCharacter(character: Omit<Character, "id">): Promise<Character> {
  if (isDesktopApp) return desktopRepository.createCharacter(character);
  return createLoreItem<Character>("characters", character);
}

export async function updateCharacter(id: string, data: Partial<Character>): Promise<Character | undefined> {
  if (isDesktopApp) return desktopRepository.updateCharacter(id, data);
  return updateLoreItem<Character>("characters", id, data);
}

export async function deleteCharacter(id: string): Promise<boolean> {
  if (isDesktopApp) return desktopRepository.deleteCharacter(id);
  return deleteLoreItem("characters", id);
}

// Places
export async function getPlaces(): Promise<Place[]> {
  if (isDesktopApp) return desktopRepository.getPlaces();
  return getLoreList<Place>("places");
}

export async function getPlacesPage(params: LorePageParams = {}): Promise<PaginatedResponse<Place>> {
  if (isDesktopApp) return desktopRepository.getPlacesPage(params);
  return getLorePage<Place>("places", params);
}

export async function getPlace(id: string): Promise<Place | undefined> {
  if (isDesktopApp) return desktopRepository.getPlace(id);
  return getLoreItem<Place>("places", id);
}

export async function createPlace(place: Omit<Place, "id">): Promise<Place> {
  if (isDesktopApp) return desktopRepository.createPlace(place);
  return createLoreItem<Place>("places", place);
}

export async function updatePlace(id: string, data: Partial<Place>): Promise<Place | undefined> {
  if (isDesktopApp) return desktopRepository.updatePlace(id, data);
  return updateLoreItem<Place>("places", id, data);
}

export async function deletePlace(id: string): Promise<boolean> {
  if (isDesktopApp) return desktopRepository.deletePlace(id);
  return deleteLoreItem("places", id);
}

// Technology
export async function getTechnology(): Promise<Technology[]> {
  if (isDesktopApp) return desktopRepository.getTechnology();
  return getLoreList<Technology>("technology");
}

export async function getTechnologyPage(params: LorePageParams = {}): Promise<PaginatedResponse<Technology>> {
  if (isDesktopApp) return desktopRepository.getTechnologyPage(params);
  return getLorePage<Technology>("technology", params);
}

export async function getTech(id: string): Promise<Technology | undefined> {
  if (isDesktopApp) return desktopRepository.getTech(id);
  return getLoreItem<Technology>("technology", id);
}

export async function createTech(tech: Omit<Technology, "id">): Promise<Technology> {
  if (isDesktopApp) return desktopRepository.createTech(tech);
  return createLoreItem<Technology>("technology", tech);
}

export async function updateTech(id: string, data: Partial<Technology>): Promise<Technology | undefined> {
  if (isDesktopApp) return desktopRepository.updateTech(id, data);
  return updateLoreItem<Technology>("technology", id, data);
}

export async function deleteTech(id: string): Promise<boolean> {
  if (isDesktopApp) return desktopRepository.deleteTech(id);
  return deleteLoreItem("technology", id);
}

// Creatures
export async function getCreatures(): Promise<Creature[]> {
  if (isDesktopApp) return desktopRepository.getCreatures();
  return getLoreList<Creature>("creatures");
}

export async function getCreaturesPage(params: LorePageParams = {}): Promise<PaginatedResponse<Creature>> {
  if (isDesktopApp) return desktopRepository.getCreaturesPage(params);
  return getLorePage<Creature>("creatures", params);
}

export async function getCreature(id: string): Promise<Creature | undefined> {
  if (isDesktopApp) return desktopRepository.getCreature(id);
  return getLoreItem<Creature>("creatures", id);
}

export async function createCreature(creature: Omit<Creature, "id">): Promise<Creature> {
  if (isDesktopApp) return desktopRepository.createCreature(creature);
  return createLoreItem<Creature>("creatures", creature);
}

export async function updateCreature(id: string, data: Partial<Creature>): Promise<Creature | undefined> {
  if (isDesktopApp) return desktopRepository.updateCreature(id, data);
  return updateLoreItem<Creature>("creatures", id, data);
}

export async function deleteCreature(id: string): Promise<boolean> {
  if (isDesktopApp) return desktopRepository.deleteCreature(id);
  return deleteLoreItem("creatures", id);
}

// Other lore
export async function getOthers(): Promise<OtherLore[]> {
  if (isDesktopApp) return desktopRepository.getOthers();
  return getLoreList<OtherLore>("other");
}

export async function getOthersPage(params: LorePageParams = {}): Promise<PaginatedResponse<OtherLore>> {
  if (isDesktopApp) return desktopRepository.getOthersPage(params);
  return getLorePage<OtherLore>("other", params);
}

export async function getOther(id: string): Promise<OtherLore | undefined> {
  if (isDesktopApp) return desktopRepository.getOther(id);
  return getLoreItem<OtherLore>("other", id);
}

export async function createOther(item: Omit<OtherLore, "id">): Promise<OtherLore> {
  if (isDesktopApp) return desktopRepository.createOther(item);
  return createLoreItem<OtherLore>("other", item);
}

export async function updateOther(id: string, data: Partial<OtherLore>): Promise<OtherLore | undefined> {
  if (isDesktopApp) return desktopRepository.updateOther(id, data);
  return updateLoreItem<OtherLore>("other", id, data);
}

export async function deleteOther(id: string): Promise<boolean> {
  if (isDesktopApp) return desktopRepository.deleteOther(id);
  return deleteLoreItem("other", id);
}
