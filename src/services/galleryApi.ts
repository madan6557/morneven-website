import type { DiscussionMention, GalleryItem } from "@/types";
import {
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, type BackendPage } from "@/services/restClient";

export type GallerySort = "newest" | "oldest" | "title";

export interface GalleryPageParams extends PaginationParams {
  type?: "image" | "video" | "All";
  sort?: GallerySort;
  uploadedBy?: string;
}

export async function getGallery(): Promise<GalleryItem[]> {
  return unwrapPageItems(await apiRequest<GalleryItem[] | BackendPage<GalleryItem>>("/gallery"));
}

export async function getGalleryPage(params: GalleryPageParams = {}): Promise<PaginatedResponse<GalleryItem>> {
  const data = await apiRequest<GalleryItem[] | BackendPage<GalleryItem>>(
    `/gallery${buildQuery({ ...params, q: params.search })}`,
  );
  return toPageResponse(data, params);
}

export async function getGalleryItem(id: string): Promise<GalleryItem | undefined> {
  return apiRequest<GalleryItem>(`/gallery/${id}`);
}

export async function createGalleryItem(item: Omit<GalleryItem, "id">): Promise<GalleryItem> {
  return apiRequest<GalleryItem>("/gallery", { method: "POST", body: item });
}

export async function updateGalleryItem(id: string, data: Partial<GalleryItem>): Promise<GalleryItem | undefined> {
  return apiRequest<GalleryItem>(`/gallery/${id}`, { method: "PUT", body: data });
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  await apiRequest(`/gallery/${id}`, { method: "DELETE" });
  return true;
}

export async function addComment(
  galleryId: string,
  _author: string,
  text: string,
  mentions: DiscussionMention[] = [],
): Promise<GalleryItem | undefined> {
  await apiRequest(`/gallery/${galleryId}/comments`, {
    method: "POST",
    body: { text, mentions },
  });
  return getGalleryItem(galleryId);
}

export async function addReply(
  galleryId: string,
  commentId: string,
  _author: string,
  text: string,
  mentions: DiscussionMention[] = [],
): Promise<GalleryItem | undefined> {
  await apiRequest(`/gallery/${galleryId}/comments/${commentId}/replies`, {
    method: "POST",
    body: { text, mentions },
  });
  return getGalleryItem(galleryId);
}
