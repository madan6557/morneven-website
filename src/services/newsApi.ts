import type { NewsItem } from "@/types";
import {
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, type BackendPage } from "@/services/restClient";

export type NewsSort = "newest" | "oldest" | "headline";

export interface NewsPageParams extends PaginationParams {
  sort?: NewsSort;
}

export async function getNews(): Promise<NewsItem[]> {
  return unwrapPageItems(await apiRequest<NewsItem[] | BackendPage<NewsItem>>("/news"));
}

export async function getNewsPage(params: NewsPageParams = {}): Promise<PaginatedResponse<NewsItem>> {
  const data = await apiRequest<NewsItem[] | BackendPage<NewsItem>>(
    `/news${buildQuery({ ...params, q: params.search })}`,
  );
  return toPageResponse(data, params);
}

export async function getNewsItem(id: string): Promise<NewsItem | undefined> {
  return apiRequest<NewsItem>(`/news/${id}`);
}

export async function createNews(item: Omit<NewsItem, "id">): Promise<NewsItem> {
  return apiRequest<NewsItem>("/news", { method: "POST", body: item });
}

export async function updateNews(id: string, data: Partial<NewsItem>): Promise<NewsItem | undefined> {
  return apiRequest<NewsItem>(`/news/${id}`, { method: "PUT", body: data });
}

export async function deleteNews(id: string): Promise<boolean> {
  await apiRequest(`/news/${id}`, { method: "DELETE" });
  return true;
}
