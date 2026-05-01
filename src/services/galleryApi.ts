import type { DiscussionMention, GalleryItem } from "@/types";
import { db, delay, STORAGE_KEYS, todayISO, writeCollection } from "@/services/dataStore";
import {
  matchesSearch,
  paginateCollection,
  pickByIds,
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";

export type GallerySort = "newest" | "oldest" | "title";

export interface GalleryPageParams extends PaginationParams {
  type?: "image" | "video" | "All";
  sort?: GallerySort;
  uploadedBy?: string;
}

export async function getGallery(): Promise<GalleryItem[]> {
  await delay();
  return [...db.gallery];
}

export async function getGalleryPage(params: GalleryPageParams = {}): Promise<PaginatedResponse<GalleryItem>> {
  await delay();
  const { ids, page, pageSize, search, sort: requestedSort, type, uploadedBy } = params;
  const sort = requestedSort ?? (ids?.length ? undefined : "newest");
  const typeFilter = type && type !== "All" ? type : undefined;
  let items = pickByIds([...db.gallery], ids);

  if (typeFilter) items = items.filter((item) => item.type === typeFilter);
  if (uploadedBy) items = items.filter((item) => item.uploadedBy === uploadedBy);
  items = items.filter((item) => matchesSearch(search, [item.title, item.caption, ...item.tags]));

  if (sort) {
    items = [...items].sort((a, b) => {
      if (sort === "oldest") return a.date.localeCompare(b.date);
      if (sort === "title") return a.title.localeCompare(b.title);
      return b.date.localeCompare(a.date);
    });
  }

  return paginateCollection(items, { page, pageSize });
}

export async function getGalleryItem(id: string): Promise<GalleryItem | undefined> {
  await delay();
  return db.gallery.find((g) => g.id === id);
}

export async function createGalleryItem(item: Omit<GalleryItem, "id">): Promise<GalleryItem> {
  await delay();
  const next = { ...item, id: `gal-${Date.now()}` };
  db.gallery = [next, ...db.gallery];
  writeCollection(STORAGE_KEYS.gallery, db.gallery);
  return next;
}

export async function updateGalleryItem(id: string, data: Partial<GalleryItem>): Promise<GalleryItem | undefined> {
  await delay();
  const idx = db.gallery.findIndex((g) => g.id === id);
  if (idx === -1) return undefined;
  db.gallery[idx] = { ...db.gallery[idx], ...data };
  writeCollection(STORAGE_KEYS.gallery, db.gallery);
  return db.gallery[idx];
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  await delay();
  const len = db.gallery.length;
  db.gallery = db.gallery.filter((g) => g.id !== id);
  writeCollection(STORAGE_KEYS.gallery, db.gallery);
  return db.gallery.length < len;
}

export async function addComment(
  galleryId: string,
  author: string,
  text: string,
  mentions: DiscussionMention[] = [],
): Promise<GalleryItem | undefined> {
  await delay();
  const idx = db.gallery.findIndex((g) => g.id === galleryId);
  if (idx === -1) return undefined;
  db.gallery[idx].comments.push({
    id: `c-${Date.now()}`,
    author,
    text,
    date: todayISO(),
    mentions,
    replies: [],
  });
  writeCollection(STORAGE_KEYS.gallery, db.gallery);
  return db.gallery[idx];
}

export async function addReply(
  galleryId: string,
  commentId: string,
  author: string,
  text: string,
  mentions: DiscussionMention[] = [],
): Promise<GalleryItem | undefined> {
  await delay();
  const gIdx = db.gallery.findIndex((g) => g.id === galleryId);
  if (gIdx === -1) return undefined;
  const comment = db.gallery[gIdx].comments.find((c) => c.id === commentId);
  if (!comment) return undefined;
  comment.replies.push({
    id: `r-${Date.now()}`,
    author,
    text,
    date: todayISO(),
    mentions,
  });
  writeCollection(STORAGE_KEYS.gallery, db.gallery);
  return db.gallery[gIdx];
}
