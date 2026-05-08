import type { MapMarker } from "@/types";
import { hasStorage, STORAGE_KEYS } from "@/services/dataStore";
import { apiRequest } from "@/services/restClient";

function normalizeMapImageUrl(url?: string): string {
  if (!url) return "";
  if (/^https?:\/\/placeholder\.local\//i.test(url)) return "";
  return url;
}

export async function getMapMarkers(): Promise<MapMarker[]> {
  return apiRequest<MapMarker[]>("/map/markers");
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
  const data = await apiRequest<string | { url?: string; imageUrl?: string }>("/map/image");
  if (typeof data === "string") return normalizeMapImageUrl(data);
  return normalizeMapImageUrl(data.url ?? data.imageUrl);
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
