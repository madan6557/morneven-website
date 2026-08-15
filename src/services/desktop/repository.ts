import type {
  Character,
  Creature,
  GalleryItem,
  LoreEvent,
  OtherLore,
  Place,
  Project,
  Technology,
} from "@/types";
import { matchesSearch, paginateCollection, type PaginatedResponse, type PaginationParams } from "@/services/pagination";
import {
  deleteOperation,
  getLocalRecord,
  listLocalRecords,
  listOperations,
  saveLocalRecord,
  saveOperation,
  type DesktopEntity,
  type LocalRecord,
  type PendingOperation,
} from "./workspaceDb";

export type DesktopLoreCategory = "characters" | "places" | "technology" | "creatures" | "events" | "other";

const now = () => new Date().toISOString();
const notifyWorkspaceChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("morneven:workspace-changed"));
};

function recordFor<T>(entity: DesktopEntity, id: string, data: T, previous?: LocalRecord<T> | null): LocalRecord<T> {
  return {
    entity,
    id,
    data,
    serverSequence: previous?.serverSequence ?? null,
    dirty: true,
    deleted: false,
    updatedAt: now(),
  };
}

async function queueMutation<T>(record: LocalRecord<T>, action: PendingOperation["action"] = "upsert") {
  await saveLocalRecord(record);
  const operations = await listOperations();
  const existing = operations.find((operation) => operation.entity === record.entity && operation.id === record.id);

  if (action === "delete" && record.serverSequence === null && existing?.action === "upsert") {
    await deleteOperation(existing.opId);
    await saveLocalRecord({ ...record, dirty: false });
    notifyWorkspaceChanged();
    return;
  }

  await saveOperation({
    opId: existing?.opId ?? crypto.randomUUID(),
    entity: record.entity,
    id: record.id,
    action,
    baseSequence: existing?.baseSequence ?? record.serverSequence,
    record: action === "delete" ? undefined : record.data,
    createdAt: existing?.createdAt ?? now(),
    status: "pending",
  });
  notifyWorkspaceChanged();
}

function page<T>(items: T[], params: PaginationParams, searchFields: (item: T) => Array<string | undefined>) {
  const searched = items.filter((item) => matchesSearch(params.search, searchFields(item)));
  return paginateCollection(searched, params);
}

function normalizeProject(project: Project): Project {
  return { ...project, patches: project.patches ?? [], docs: project.docs ?? [], discussions: [] };
}

function normalizeGallery(item: GalleryItem): GalleryItem {
  return { ...item, tags: item.tags ?? [], comments: [], views: 0, likes: 0, dislikes: 0, viewerReaction: null };
}

function normalizeLore<T extends Character | Place | Technology | Creature | LoreEvent | OtherLore>(item: T): T {
  return {
    ...item,
    docs: item.docs ?? [],
    discussions: [],
    views: 0,
    stars: 0,
    viewerStarred: false,
  } as T;
}

export async function getProjects(): Promise<Project[]> {
  const records = await listLocalRecords<Project>("project");
  return records.map((record) => normalizeProject(record.data));
}

export async function getProjectsPage(params: PaginationParams & { sort?: "title" | "title-desc" | "status"; status?: Project["status"]; archived?: boolean } = {}): Promise<PaginatedResponse<Project>> {
  let projects = await getProjects();
  if (params.archived !== undefined) projects = projects.filter((project) => Boolean(project.archived) === params.archived);
  if (params.status) projects = projects.filter((project) => project.status === params.status);
  if (params.sort === "title") projects.sort((a, b) => a.title.localeCompare(b.title));
  if (params.sort === "title-desc") projects.sort((a, b) => b.title.localeCompare(a.title));
  return page(projects, params, (project) => [project.title, project.shortDesc, project.fullDesc]);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const record = await getLocalRecord<Project>("project", id);
  return record && !record.deleted ? normalizeProject(record.data) : undefined;
}

export async function createProject(input: Omit<Project, "id">): Promise<Project> {
  const project = normalizeProject({ ...input, id: crypto.randomUUID() } as Project);
  await queueMutation(recordFor("project", project.id, project));
  return project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project | undefined> {
  const previous = await getLocalRecord<Project>("project", id);
  if (!previous || previous.deleted) return undefined;
  const project = normalizeProject({ ...previous.data, ...patch, id });
  await queueMutation(recordFor("project", id, project, previous));
  return project;
}

export async function deleteProject(id: string): Promise<boolean> {
  const previous = await getLocalRecord<Project>("project", id);
  if (!previous) return false;
  await queueMutation({ ...previous, dirty: true, deleted: true, updatedAt: now() }, "delete");
  return true;
}

async function getLoreItems<T extends Character | Place | Technology | Creature | LoreEvent | OtherLore>(category: DesktopLoreCategory): Promise<T[]> {
  const records = await listLocalRecords<T>("lore");
  return records
    .filter((record) => (record.data as T & { _category?: string })._category === category)
    .map((record) => normalizeLore(record.data));
}

async function getLorePage<T extends Character | Place | Technology | Creature | LoreEvent | OtherLore>(category: DesktopLoreCategory, params: PaginationParams & { sort?: "name" | "name-desc" } = {}): Promise<PaginatedResponse<T>> {
  const items = await getLoreItems<T>(category);
  const label = (item: T) => {
    const value = item as unknown as { name?: string; title?: string };
    return value.name ?? value.title ?? "";
  };
  if (params.sort === "name") items.sort((a, b) => label(a).localeCompare(label(b)));
  if (params.sort === "name-desc") items.sort((a, b) => label(b).localeCompare(label(a)));
  return page(items, params, (item) => [label(item), item.shortDesc, item.fullDesc]);
}

async function createLore<T extends Character | Place | Technology | Creature | LoreEvent | OtherLore>(category: DesktopLoreCategory, input: Omit<T, "id">): Promise<T> {
  const item = normalizeLore({ ...input, id: crypto.randomUUID(), _category: category } as unknown as T & { _category: string });
  await queueMutation(recordFor("lore", item.id, item));
  return item;
}

async function updateLore<T extends Character | Place | Technology | Creature | LoreEvent | OtherLore>(category: DesktopLoreCategory, id: string, patch: Partial<T>): Promise<T | undefined> {
  const previous = await getLocalRecord<T>("lore", id);
  if (!previous || previous.deleted || (previous.data as T & { _category?: string })._category !== category) return undefined;
  const item = normalizeLore({ ...previous.data, ...patch, id, _category: category } as unknown as T & { _category: string });
  await queueMutation(recordFor("lore", id, item, previous));
  return item;
}

async function deleteLore(category: DesktopLoreCategory, id: string): Promise<boolean> {
  const previous = await getLocalRecord("lore", id);
  if (!previous || (previous.data as { _category?: string })._category !== category) return false;
  await queueMutation({ ...previous, dirty: true, deleted: true, updatedAt: now() }, "delete");
  return true;
}

export const getCharacters = () => getLoreItems<Character>("characters");
export const getCharactersPage = (params: PaginationParams & { sort?: "name" | "name-desc" } = {}) => getLorePage<Character>("characters", params);
export const getCharacter = async (id: string) => (await getLoreItems<Character>("characters")).find((item) => item.id === id);
export const createCharacter = (item: Omit<Character, "id">) => createLore<Character>("characters", item);
export const updateCharacter = (id: string, patch: Partial<Character>) => updateLore<Character>("characters", id, patch);
export const deleteCharacter = (id: string) => deleteLore("characters", id);

export const getPlaces = () => getLoreItems<Place>("places");
export const getPlacesPage = (params: PaginationParams & { sort?: "name" | "name-desc" } = {}) => getLorePage<Place>("places", params);
export const getPlace = async (id: string) => (await getLoreItems<Place>("places")).find((item) => item.id === id);
export const createPlace = (item: Omit<Place, "id">) => createLore<Place>("places", item);
export const updatePlace = (id: string, patch: Partial<Place>) => updateLore<Place>("places", id, patch);
export const deletePlace = (id: string) => deleteLore("places", id);

export const getTechnology = () => getLoreItems<Technology>("technology");
export const getTechnologyPage = (params: PaginationParams & { sort?: "name" | "name-desc" } = {}) => getLorePage<Technology>("technology", params);
export const getTech = async (id: string) => (await getLoreItems<Technology>("technology")).find((item) => item.id === id);
export const createTech = (item: Omit<Technology, "id">) => createLore<Technology>("technology", item);
export const updateTech = (id: string, patch: Partial<Technology>) => updateLore<Technology>("technology", id, patch);
export const deleteTech = (id: string) => deleteLore("technology", id);

export const getCreatures = () => getLoreItems<Creature>("creatures");
export const getCreaturesPage = (params: PaginationParams & { sort?: "name" | "name-desc" } = {}) => getLorePage<Creature>("creatures", params);
export const getCreature = async (id: string) => (await getLoreItems<Creature>("creatures")).find((item) => item.id === id);
export const createCreature = (item: Omit<Creature, "id">) => createLore<Creature>("creatures", item);
export const updateCreature = (id: string, patch: Partial<Creature>) => updateLore<Creature>("creatures", id, patch);
export const deleteCreature = (id: string) => deleteLore("creatures", id);

export const getOthers = () => getLoreItems<OtherLore>("other");
export const getOthersPage = (params: PaginationParams & { sort?: "name" | "name-desc" } = {}) => getLorePage<OtherLore>("other", params);
export const getOther = async (id: string) => (await getLoreItems<OtherLore>("other")).find((item) => item.id === id);
export const createOther = (item: Omit<OtherLore, "id">) => createLore<OtherLore>("other", item);
export const updateOther = (id: string, patch: Partial<OtherLore>) => updateLore<OtherLore>("other", id, patch);
export const deleteOther = (id: string) => deleteLore("other", id);

export const getEvents = () => getLoreItems<LoreEvent>("events");
export const getEventsPage = (params: PaginationParams & { sort?: "name" | "name-desc" } = {}) => getLorePage<LoreEvent>("events", params);
export const getEvent = async (id: string) => (await getLoreItems<LoreEvent>("events")).find((item) => item.id === id);
export const createEvent = (item: Omit<LoreEvent, "id">) => createLore<LoreEvent>("events", item);
export const updateEvent = (id: string, patch: Partial<LoreEvent>) => updateLore<LoreEvent>("events", id, patch);
export const deleteEvent = (id: string) => deleteLore("events", id);

export async function getGallery(): Promise<GalleryItem[]> {
  const records = await listLocalRecords<GalleryItem>("gallery");
  return records.map((record) => normalizeGallery(record.data));
}

export async function getGalleryPage(params: PaginationParams & { sort?: "newest" | "oldest" | "title"; type?: GalleryItem["type"] | "All" } = {}): Promise<PaginatedResponse<GalleryItem>> {
  let items = await getGallery();
  if (params.type && params.type !== "All") items = items.filter((item) => item.type === params.type);
  if ("uploadedBy" in params && params.uploadedBy) items = items.filter((item) => item.uploadedBy === params.uploadedBy);
  if (params.sort === "title") items.sort((a, b) => a.title.localeCompare(b.title));
  if (params.sort === "oldest") items.sort((a, b) => a.date.localeCompare(b.date));
  if (params.sort === "newest" || !params.sort) items.sort((a, b) => b.date.localeCompare(a.date));
  return page(items, params, (item) => [item.title, item.caption, ...(item.tags ?? [])]);
}

export async function getGalleryItem(id: string): Promise<GalleryItem | undefined> {
  const record = await getLocalRecord<GalleryItem>("gallery", id);
  return record && !record.deleted ? normalizeGallery(record.data) : undefined;
}

export async function createGalleryItem(input: Omit<GalleryItem, "id">): Promise<GalleryItem> {
  const item = normalizeGallery({ ...input, id: crypto.randomUUID() } as GalleryItem);
  await queueMutation(recordFor("gallery", item.id, item));
  return item;
}

export async function updateGalleryItem(id: string, patch: Partial<GalleryItem>): Promise<GalleryItem | undefined> {
  const previous = await getLocalRecord<GalleryItem>("gallery", id);
  if (!previous || previous.deleted) return undefined;
  const item = normalizeGallery({ ...previous.data, ...patch, id });
  await queueMutation(recordFor("gallery", id, item, previous));
  return item;
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  const previous = await getLocalRecord<GalleryItem>("gallery", id);
  if (!previous) return false;
  await queueMutation({ ...previous, dirty: true, deleted: true, updatedAt: now() }, "delete");
  return true;
}

export async function getLocalStatus() {
  const operations = await listOperations();
  return {
    pending: operations.filter((operation) => operation.status === "pending").length,
    conflicts: operations.filter((operation) => operation.status === "conflict").length,
  };
}
