// Service layer — abstracts data access for future Express migration
import type { Project, Character, Place, Technology, GalleryItem, NewsItem } from "@/types";

import projectsData from "@/data/projects.json";
import charactersData from "@/data/characters.json";
import placesData from "@/data/places.json";
import technologyData from "@/data/technology.json";
import galleryData from "@/data/gallery.json";
import newsData from "@/data/news.json";

const STORAGE_KEYS = {
  projects: "morneven_projects",
  characters: "morneven_characters",
  places: "morneven_places",
  technology: "morneven_technology",
  gallery: "morneven_gallery",
} as const;

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readCollection<T>(key: string, fallback: T[]): T[] {
  if (!hasStorage()) return [...fallback];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [...fallback];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [...fallback];
  } catch {
    return [...fallback];
  }
}

function writeCollection<T>(key: string, value: T[]) {
  if (!hasStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures and keep in-memory behavior.
  }
}

// Mutable local copies (simulates database)
let projects: Project[] = readCollection<Project>(STORAGE_KEYS.projects, projectsData as Project[]);
let characters: Character[] = readCollection<Character>(STORAGE_KEYS.characters, charactersData as Character[]);
let places: Place[] = readCollection<Place>(STORAGE_KEYS.places, placesData as Place[]);
let technology: Technology[] = readCollection<Technology>(STORAGE_KEYS.technology, technologyData as Technology[]);
let gallery: GalleryItem[] = readCollection<GalleryItem>(STORAGE_KEYS.gallery, galleryData as GalleryItem[]);
const news: NewsItem[] = [...newsData] as NewsItem[];

// Helper to simulate async API calls
const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

// ── Projects ────────────────────────────────────────
export async function getProjects(): Promise<Project[]> {
  await delay();
  return [...projects];
}

export async function getProject(id: string): Promise<Project | undefined> {
  await delay();
  return projects.find((p) => p.id === id);
}

export async function createProject(project: Omit<Project, "id">): Promise<Project> {
  await delay();
  const newProject = { ...project, id: `proj-${Date.now()}` };
  projects = [newProject, ...projects];
  writeCollection(STORAGE_KEYS.projects, projects);
  return newProject;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
  await delay();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  projects[idx] = { ...projects[idx], ...data };
  writeCollection(STORAGE_KEYS.projects, projects);
  return projects[idx];
}

export async function deleteProject(id: string): Promise<boolean> {
  await delay();
  const len = projects.length;
  projects = projects.filter((p) => p.id !== id);
  writeCollection(STORAGE_KEYS.projects, projects);
  return projects.length < len;
}

// ── Characters ──────────────────────────────────────
export async function getCharacters(): Promise<Character[]> {
  await delay();
  return [...characters];
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  await delay();
  return characters.find((c) => c.id === id);
}

export async function createCharacter(character: Omit<Character, "id">): Promise<Character> {
  await delay();
  const newChar = { ...character, id: `char-${Date.now()}` };
  characters = [newChar, ...characters];
  writeCollection(STORAGE_KEYS.characters, characters);
  return newChar;
}

export async function updateCharacter(id: string, data: Partial<Character>): Promise<Character | undefined> {
  await delay();
  const idx = characters.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  characters[idx] = { ...characters[idx], ...data };
  writeCollection(STORAGE_KEYS.characters, characters);
  return characters[idx];
}

export async function deleteCharacter(id: string): Promise<boolean> {
  await delay();
  const len = characters.length;
  characters = characters.filter((c) => c.id !== id);
  writeCollection(STORAGE_KEYS.characters, characters);
  return characters.length < len;
}

// ── Places ──────────────────────────────────────────
export async function getPlaces(): Promise<Place[]> {
  await delay();
  return [...places];
}

export async function getPlace(id: string): Promise<Place | undefined> {
  await delay();
  return places.find((p) => p.id === id);
}

export async function createPlace(place: Omit<Place, "id">): Promise<Place> {
  await delay();
  const newPlace = { ...place, id: `place-${Date.now()}` };
  places = [newPlace, ...places];
  writeCollection(STORAGE_KEYS.places, places);
  return newPlace;
}

export async function updatePlace(id: string, data: Partial<Place>): Promise<Place | undefined> {
  await delay();
  const idx = places.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  places[idx] = { ...places[idx], ...data };
  writeCollection(STORAGE_KEYS.places, places);
  return places[idx];
}

export async function deletePlace(id: string): Promise<boolean> {
  await delay();
  const len = places.length;
  places = places.filter((p) => p.id !== id);
  writeCollection(STORAGE_KEYS.places, places);
  return places.length < len;
}

// ── Technology ──────────────────────────────────────
export async function getTechnology(): Promise<Technology[]> {
  await delay();
  return [...technology];
}

export async function getTech(id: string): Promise<Technology | undefined> {
  await delay();
  return technology.find((t) => t.id === id);
}

export async function createTech(tech: Omit<Technology, "id">): Promise<Technology> {
  await delay();
  const newTech = { ...tech, id: `tech-${Date.now()}` };
  technology = [newTech, ...technology];
  writeCollection(STORAGE_KEYS.technology, technology);
  return newTech;
}

export async function updateTech(id: string, data: Partial<Technology>): Promise<Technology | undefined> {
  await delay();
  const idx = technology.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  technology[idx] = { ...technology[idx], ...data };
  writeCollection(STORAGE_KEYS.technology, technology);
  return technology[idx];
}

export async function deleteTech(id: string): Promise<boolean> {
  await delay();
  const len = technology.length;
  technology = technology.filter((t) => t.id !== id);
  writeCollection(STORAGE_KEYS.technology, technology);
  return technology.length < len;
}

// ── Gallery ─────────────────────────────────────────
export async function getGallery(): Promise<GalleryItem[]> {
  await delay();
  return [...gallery];
}

export async function getGalleryItem(id: string): Promise<GalleryItem | undefined> {
  await delay();
  return gallery.find((g) => g.id === id);
}

export async function createGalleryItem(item: Omit<GalleryItem, "id">): Promise<GalleryItem> {
  await delay();
  const newItem = { ...item, id: `gal-${Date.now()}` };
  gallery = [newItem, ...gallery];
  writeCollection(STORAGE_KEYS.gallery, gallery);
  return newItem;
}

export async function updateGalleryItem(id: string, data: Partial<GalleryItem>): Promise<GalleryItem | undefined> {
  await delay();
  const idx = gallery.findIndex((g) => g.id === id);
  if (idx === -1) return undefined;
  gallery[idx] = { ...gallery[idx], ...data };
  writeCollection(STORAGE_KEYS.gallery, gallery);
  return gallery[idx];
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  await delay();
  const len = gallery.length;
  gallery = gallery.filter((g) => g.id !== id);
  writeCollection(STORAGE_KEYS.gallery, gallery);
  return gallery.length < len;
}

export async function addComment(galleryId: string, author: string, text: string): Promise<GalleryItem | undefined> {
  await delay();
  const idx = gallery.findIndex((g) => g.id === galleryId);
  if (idx === -1) return undefined;
  gallery[idx].comments.push({
    id: `c-${Date.now()}`,
    author,
    text,
    date: new Date().toISOString().split("T")[0],
    replies: [],
  });
  writeCollection(STORAGE_KEYS.gallery, gallery);
  return gallery[idx];
}

export async function addReply(galleryId: string, commentId: string, author: string, text: string): Promise<GalleryItem | undefined> {
  await delay();
  const gIdx = gallery.findIndex((g) => g.id === galleryId);
  if (gIdx === -1) return undefined;
  const comment = gallery[gIdx].comments.find((c) => c.id === commentId);
  if (!comment) return undefined;
  comment.replies.push({
    id: `r-${Date.now()}`,
    author,
    text,
    date: new Date().toISOString().split("T")[0],
  });
  writeCollection(STORAGE_KEYS.gallery, gallery);
  return gallery[gIdx];
}

// ── News ────────────────────────────────────────────
export async function getNews(): Promise<NewsItem[]> {
  await delay();
  return [...news];
}
