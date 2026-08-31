import { findMediaBySourceUrl, getMedia, getMediaBlob, saveMedia, updateMedia, type LocalMedia } from "./workspaceDb";

const objectUrlCache = new Map<string, string>();

function folderFromPath(path: string): LocalMedia["folder"] {
  const folder = path.match(/folder=([^&]+)/i)?.[1];
  if (folder === "gallery" || folder === "lore" || folder === "projects") return folder;
  return "uploads";
}

export async function saveDesktopUpload(path: string, file: File) {
  const media = await saveMedia(file, folderFromPath(path));
  return { url: `local-media://${media.id}`, objectPath: `local-media://${media.id}`, provider: "local" };
}

export async function resolveDesktopMediaUrl(url: string): Promise<string> {
  const id = url.startsWith("local-media://") ? url.slice("local-media://".length) : undefined;
  const media = id ? await getMedia(id) : await findCachedRemoteMedia(url);
  if (!media) return "";

  const cacheKey = media.id;
  const cached = objectUrlCache.get(cacheKey);
  if (cached) return cached;

  const objectUrl = URL.createObjectURL(await getMediaBlob(media));
  objectUrlCache.set(cacheKey, objectUrl);
  return objectUrl;
}

async function findCachedRemoteMedia(url: string): Promise<LocalMedia | null> {
  const { findMediaBySourceUrl } = await import("./workspaceDb");
  return findMediaBySourceUrl(url);
}

export async function cacheDesktopMedia(url: string, file: File, folder: LocalMedia["folder"]): Promise<LocalMedia> {
  const existing = await findMediaBySourceUrl(url);
  const media = await saveMedia(file, folder, url, existing?.id);
  await updateMedia({ ...media, pendingUpload: false, sourceUrl: url });
  return media;
}

export function clearDesktopMediaUrls() {
  for (const url of objectUrlCache.values()) URL.revokeObjectURL(url);
  objectUrlCache.clear();
}
