/**
 * File Proxy Service - converts direct storage URLs to backend proxy endpoints.
 * Private storage files are fetched with the current Bearer token and exposed as blob URLs.
 */

import { getApiBaseUrl, getAccessToken } from "./restClient";

const blobUrlCache = new Map<string, string>();
const pendingBlobUrlCache = new Map<string, Promise<string>>();
const allowedObjectFolders = new Set(["gallery", "lore", "projects", "news", "map", "chat", "bot-manager", "exports", "uploads"]);
const safeDataUrlPattern =
  /^data:(?:image\/(?:png|jpeg|webp|gif)|video\/(?:mp4|webm|ogg|quicktime)|application\/pdf|text\/plain|text\/markdown)(?:;charset=[a-z0-9_-]+)?;base64,/i;

function normalizeObjectPathCandidate(value: string): string | null {
  const normalized = value.trim().replace(/^\/+/, "");
  if (!normalized || normalized.length > 2048 || normalized.includes("\\") || !/^[a-zA-Z0-9._/-]+$/.test(normalized)) return null;
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  const [folder] = segments;
  return allowedObjectFolders.has(folder) ? normalized : null;
}

export function isSafeFileUrl(url: string): boolean {
  const value = url.trim();
  if (!value) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("blob:")) return true;
  if (value.startsWith("data:")) return safeDataUrlPattern.test(value);
  if (normalizeObjectPathCandidate(value)) return true;
  if (isProxyUrl(value)) return true;

  try {
    const origin = globalThis.location?.origin ?? "http://localhost";
    const parsed = new URL(value, origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "s3:";
  } catch {
    return false;
  }
}

/**
 * Extract storage path/key from S3-compatible URLs.
 */
export function extractStoragePath(url: string): string | null {
  const value = url.trim();
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return null;

  try {
    const storageMatch = value.match(/https?:\/\/(?:[^/]+\.)?storageapi\.dev\/[^/]+\/(.+)/);
    if (storageMatch?.[1]) return storageMatch[1];

    const s3Match = value.match(/https?:\/\/[^/]+\.s3\.(?:amazonaws\.com|[^/]+)\/(.+)/);
    if (s3Match?.[1]) return s3Match[1];

    const s3ProtocolMatch = value.match(/s3:\/\/[^/]+\/(.+)/);
    if (s3ProtocolMatch?.[1]) return s3ProtocolMatch[1];

    return null;
  } catch {
    return null;
  }
}

export function getProxyUrl(url: string): string {
  const value = url.trim();
  if (!value || !isSafeFileUrl(value)) return "";
  if (value.startsWith("data:") || value.startsWith("blob:")) return value;

  const objectPath = normalizeObjectPathCandidate(value);
  if (objectPath) {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/files/object?path=${encodeURIComponent(objectPath)}`;
  }

  if (!value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("s3://")) {
    return value;
  }

  const storagePath = extractStoragePath(value);
  if (!storagePath) return value;

  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/files/object?path=${encodeURIComponent(storagePath)}`;
}

export function isProxyUrl(url: string): boolean {
  if (!url) return false;
  return (
    /\/(?:api|v1)\/files\/object(?:\?|$)/.test(url) ||
    /\/files\/object(?:\?|$)/.test(url) ||
    /\/(?:api|v1)\/bot-manager\/identities\/[^/]+\/files\/proxy(?:\?|$)/.test(url) ||
    /\/bot-manager\/identities\/[^/]+\/files\/proxy(?:\?|$)/.test(url)
  );
}

export function isDirectStorageUrl(url: string): boolean {
  if (!url) return false;
  return extractStoragePath(url) !== null;
}

export async function getAuthenticatedFileUrl(url: string, accept = "*/*"): Promise<string> {
  if (!url || !isSafeFileUrl(url)) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  const proxyUrl = getProxyUrl(url);
  if (!isProxyUrl(proxyUrl) && !isDirectStorageUrl(url)) {
    return proxyUrl;
  }

  const cacheKey = `${accept}:${proxyUrl}`;
  const cached = blobUrlCache.get(cacheKey);
  if (cached) return cached;

  const pending = pendingBlobUrlCache.get(cacheKey);
  if (pending) return pending;

  const loadPromise = (async () => {
    const token = getAccessToken();
    if (!token) return "";

    const response = await fetch(proxyUrl, {
      method: "GET",
      headers: {
        Accept: accept,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return "";

    const blobUrl = URL.createObjectURL(await response.blob());
    blobUrlCache.set(cacheKey, blobUrl);
    return blobUrl;
  })();

  pendingBlobUrlCache.set(cacheKey, loadPromise);
  try {
    return await loadPromise;
  } catch {
    return "";
  } finally {
    pendingBlobUrlCache.delete(cacheKey);
  }
}

export async function getAuthenticatedImageUrl(url: string): Promise<string> {
  return getAuthenticatedFileUrl(url, "image/*");
}

export async function downloadAuthenticatedFile(url: string, filename?: string): Promise<void> {
  const fileUrl = await getAuthenticatedFileUrl(url, "*/*");
  if (!fileUrl) return;
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = filename || "download";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function openAuthenticatedFile(url: string): Promise<void> {
  const openedWindow = window.open("about:blank", "_blank");
  if (openedWindow) openedWindow.opener = null;
  const fileUrl = await getAuthenticatedFileUrl(url, "*/*");
  if (!fileUrl) {
    openedWindow?.close();
    return;
  }
  if (openedWindow) {
    openedWindow.location.href = fileUrl;
    return;
  }
  window.open(fileUrl, "_blank", "noopener,noreferrer");
}

export function clearBlobUrlCache(): void {
  blobUrlCache.forEach((blobUrl) => {
    URL.revokeObjectURL(blobUrl);
  });
  blobUrlCache.clear();
  pendingBlobUrlCache.clear();
}

export function getSafeImageUrl(url: string | undefined): string {
  if (!url) return "";
  return getProxyUrl(url);
}
