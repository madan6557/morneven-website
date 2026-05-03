/**
 * File Proxy Service — Convert direct S3 URLs to BE proxy endpoints
 * All file access goes through BE authentication layer for private buckets
 */

import { getApiBaseUrl, getAccessToken } from "./restClient";

/**
 * Blob URL cache to avoid refetching the same file
 * Maps proxy URL → blob URL
 */
const blobUrlCache = new Map<string, string>();

/**
 * Extract storage path/key from S3 URL
 * Handles formats like:
 *  - https://t3.storageapi.dev/morneven-chat/chat/msg-123/image.jpg
 *  - https://morneven-chat.s3.amazonaws.com/chat/msg-123/image.jpg
 *  - s3://morneven-chat/chat/msg-123/image.jpg
 */
export function extractStoragePath(url: string): string | null {
  if (!url) return null;

  // Skip data URLs
  if (url.startsWith("data:")) return null;

  try {
    // Format: https://t3.storageapi.dev/bucket/path/to/file
    const storageMatch = url.match(/https?:\/\/(?:[^/]+\.)?storageapi\.dev\/[^/]+\/(.+)/);
    if (storageMatch?.[1]) return storageMatch[1];

    // Format: https://bucket-name.s3.amazonaws.com/path/to/file
    const s3Match = url.match(/https?:\/\/[^/]+\.s3\.(?:amazonaws\.com|[^/]+)\/(.+)/);
    if (s3Match?.[1]) return s3Match[1];

    // Format: s3://bucket-name/path/to/file
    const s3ProtocolMatch = url.match(/s3:\/\/[^/]+\/(.+)/);
    if (s3ProtocolMatch?.[1]) return s3ProtocolMatch[1];

    return null;
  } catch {
    return null;
  }
}

/**
 * Convert S3 URL to BE proxy endpoint
 * Used as primary method for all file access
 *
 * @param url - Direct S3 URL or path
 * @returns Proxy endpoint URL, or original URL if not a storage URL
 */
export function getProxyUrl(url: string): string {
  if (!url) return "";

  // Skip data URLs
  if (url.startsWith("data:")) return url;

  // Skip relative paths that are already local endpoints
  if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("s3://")) {
    return url;
  }

  const storagePath = extractStoragePath(url);
  if (!storagePath) return url; // Not a storage URL, return as-is

  // Convert to BE proxy endpoint
  const baseUrl = getApiBaseUrl();
  const encodedPath = encodeURIComponent(storagePath);
  return `${baseUrl}/files/object?path=${encodedPath}`;
}

/**
 * Fetch file from proxy endpoint with Bearer token authentication
 * Returns blob URL for use in img src or background-image
 * Results are cached to avoid refetching
 *
 * @param url - Original S3 URL or proxy endpoint URL
 * @returns Promise<string> - Blob URL for rendering, or empty string on error
 * @throws Will warn if Bearer token is missing (should always be present in production)
 */
export async function getAuthenticatedFileUrl(url: string, accept = "*/*"): Promise<string> {
  if (!url) return "";

  // Skip data URLs - use directly
  if (url.startsWith("data:")) return url;

  // Convert S3 URL to proxy URL if needed
  const proxyUrl = getProxyUrl(url);

  // Check cache first
  const cacheKey = `${accept}:${proxyUrl}`;
  if (blobUrlCache.has(cacheKey)) {
    return blobUrlCache.get(cacheKey) || "";
  }

  try {
    const token = getAccessToken();
    if (!token) {
      console.error("❌ Missing Bearer token for authenticated image request. User must be logged in.");
      return "";
    }

    const headers: Record<string, string> = {
      "Accept": accept,
      "Authorization": `Bearer ${token}`,
    };

    const response = await fetch(proxyUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Failed to fetch file from proxy: ${response.status}`,
        errorText
      );
      return "";
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Cache the blob URL
    blobUrlCache.set(cacheKey, blobUrl);

    return blobUrl;
  } catch (error) {
    console.error(`❌ Error fetching authenticated file from ${proxyUrl}:`, error);
    return "";
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

/**
 * Clear blob URL cache - useful for memory management
 */
export function clearBlobUrlCache(): void {
  blobUrlCache.forEach((blobUrl) => {
    URL.revokeObjectURL(blobUrl);
  });
  blobUrlCache.clear();
}

/**
 * Check if URL is a direct storage URL (not a proxy endpoint)
 */
export function isDirectStorageUrl(url: string): boolean {
  if (!url) return false;
  const storagePath = extractStoragePath(url);
  return storagePath !== null;
}

/**
 * Check if URL is already a proxy endpoint
 */
export function isProxyUrl(url: string): boolean {
  if (!url) return false;
  return url.includes("/api/files/object");
}

/**
 * Fallback for image rendering - convert S3 URL to proxy if needed
 * Use this in img src attributes and background images
 */
export function getSafeImageUrl(url: string | undefined): string {
  if (!url) return "";
  return getProxyUrl(url);
}
