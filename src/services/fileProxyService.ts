/**
 * File Proxy Service - converts direct storage URLs to backend proxy endpoints.
 * Private storage files are fetched with the current Bearer token and exposed as blob URLs.
 */

import { getApiBaseUrl, getAccessToken } from "./restClient";

const blobUrlCache = new Map<string, string>();
const pendingBlobUrlCache = new Map<string, Promise<string>>();

/**
 * Extract storage path/key from S3-compatible URLs.
 */
export function extractStoragePath(url: string): string | null {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return null;

  try {
    const storageMatch = url.match(/https?:\/\/(?:[^/]+\.)?storageapi\.dev\/[^/]+\/(.+)/);
    if (storageMatch?.[1]) return storageMatch[1];

    const s3Match = url.match(/https?:\/\/[^/]+\.s3\.(?:amazonaws\.com|[^/]+)\/(.+)/);
    if (s3Match?.[1]) return s3Match[1];

    const s3ProtocolMatch = url.match(/s3:\/\/[^/]+\/(.+)/);
    if (s3ProtocolMatch?.[1]) return s3ProtocolMatch[1];

    return null;
  } catch {
    return null;
  }
}

export function getProxyUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("s3://")) {
    return url;
  }

  const storagePath = extractStoragePath(url);
  if (!storagePath) return url;

  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/files/object?path=${encodeURIComponent(storagePath)}`;
}

export function isProxyUrl(url: string): boolean {
  if (!url) return false;
  return /\/(?:api|v1)\/files\/object(?:\?|$)/.test(url) || /\/files\/object(?:\?|$)/.test(url);
}

export function isDirectStorageUrl(url: string): boolean {
  if (!url) return false;
  return extractStoragePath(url) !== null;
}

export async function getAuthenticatedFileUrl(url: string, accept = "*/*"): Promise<string> {
  if (!url) return "";
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
