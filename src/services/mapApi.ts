import type { MapMarker } from "@/types";
import { db, delay, hasStorage, STORAGE_KEYS, writeCollection } from "@/services/dataStore";

export async function getMapMarkers(): Promise<MapMarker[]> {
  await delay();
  return [...db.mapMarkers];
}

export async function saveMapMarkers(next: MapMarker[]): Promise<MapMarker[]> {
  await delay();
  db.mapMarkers = [...next];
  writeCollection(STORAGE_KEYS.mapMarkers, db.mapMarkers);
  return [...db.mapMarkers];
}

export function getMapImage(): string {
  if (!hasStorage()) return "";
  try {
    return window.localStorage.getItem(STORAGE_KEYS.mapImage) || "";
  } catch {
    return "";
  }
}

export function setMapImage(url: string) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.mapImage, url);
  } catch {
    // ignore
  }
}
