import type { MapMarker } from "@/types";
import { db, delay, hasStorage, STORAGE_KEYS, writeCollection } from "@/services/dataStore";
import { apiRequest, withDemoFallback } from "@/services/restClient";

function normalizeMapImageUrl(url?: string): string {
  if (!url) return "";
  if (/^https?:\/\/placeholder\.local\//i.test(url)) return "";
  return url;
}

export async function getMapMarkers(): Promise<MapMarker[]> {
  return withDemoFallback(
    () => apiRequest<MapMarker[]>("/map/markers"),
    async () => {
      await delay();
      return [...db.mapMarkers];
    },
  );
}

export async function saveMapMarkers(next: MapMarker[]): Promise<MapMarker[]> {
  return apiRequest<MapMarker[]>("/map/markers", { method: "PUT", body: next });
}

export function getMapImage(): string {
  if (!hasStorage()) return "";
  try {
    return normalizeMapImageUrl(window.localStorage.getItem(STORAGE_KEYS.mapImage) || "");
  } catch {
    return "";
  }
}

export async function getMapImageRemote(): Promise<string> {
  return withDemoFallback(
    async () => {
      const data = await apiRequest<string | { url?: string; imageUrl?: string }>("/map/image");
      if (typeof data === "string") return normalizeMapImageUrl(data);
      return normalizeMapImageUrl(data.url ?? data.imageUrl);
    },
    () => getMapImage(),
  );
}

export function setMapImage(url: string) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.mapImage, url);
  } catch {
    // ignore
  }
}

export async function setMapImageRemote(url: string): Promise<string> {
  const data = await apiRequest<string | { url?: string; imageUrl?: string }>("/map/image", {
    method: "PUT",
    body: { url },
  });
  if (typeof data === "string") return normalizeMapImageUrl(data);
  return normalizeMapImageUrl(data.url ?? data.imageUrl ?? url);
}
