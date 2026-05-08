export const STORAGE_KEYS = {
  projects: "morneven_projects",
  characters: "morneven_characters",
  places: "morneven_places",
  technology: "morneven_technology",
  gallery: "morneven_gallery",
  creatures: "morneven_creatures",
  other: "morneven_other",
  events: "morneven_events",
  news: "morneven_news",
  mapMarkers: "morneven_map_markers",
  mapImage: "morneven_map_image",
} as const;

export function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
