import type {
  Character,
  Creature,
  GalleryItem,
  MapMarker,
  NewsItem,
  OtherLore,
  Place,
  Project,
  Technology,
} from "@/types";

import projectsData from "@/data/projects.json";
import charactersData from "@/data/characters.json";
import placesData from "@/data/places.json";
import technologyData from "@/data/technology.json";
import galleryData from "@/data/gallery.json";
import newsData from "@/data/news.json";
import creaturesData from "@/data/creatures.json";
import otherData from "@/data/other.json";
import mapData from "@/data/map.json";

export const STORAGE_KEYS = {
  projects: "morneven_projects",
  characters: "morneven_characters",
  places: "morneven_places",
  technology: "morneven_technology",
  gallery: "morneven_gallery",
  creatures: "morneven_creatures",
  other: "morneven_other",
  news: "morneven_news",
  mapMarkers: "morneven_map_markers",
  mapImage: "morneven_map_image",
} as const;

export function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readCollection<T>(key: string, fallback: T[]): T[] {
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

export function writeCollection<T>(key: string, value: T[]) {
  if (!hasStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures and keep in-memory behavior.
  }
}

export const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

export const db = {
  projects: readCollection<Project>(STORAGE_KEYS.projects, projectsData as Project[]),
  characters: readCollection<Character>(STORAGE_KEYS.characters, charactersData as Character[]),
  places: readCollection<Place>(STORAGE_KEYS.places, placesData as Place[]),
  technology: readCollection<Technology>(STORAGE_KEYS.technology, technologyData as Technology[]),
  gallery: readCollection<GalleryItem>(STORAGE_KEYS.gallery, galleryData as GalleryItem[]),
  creatures: readCollection<Creature>(STORAGE_KEYS.creatures, creaturesData as Creature[]),
  others: readCollection<OtherLore>(STORAGE_KEYS.other, otherData as OtherLore[]),
  mapMarkers: readCollection<MapMarker>(
    STORAGE_KEYS.mapMarkers,
    (mapData as { markers: MapMarker[] }).markers,
  ),
  news: readCollection<NewsItem>(STORAGE_KEYS.news, newsData as NewsItem[]),
};

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
