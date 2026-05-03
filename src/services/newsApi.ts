import type { NewsItem } from "@/types";
import { db, delay, STORAGE_KEYS, writeCollection } from "@/services/dataStore";
import {
  matchesSearch,
  paginateCollection,
  pickByIds,
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";
import { apiRequest, buildQuery, toPageResponse, unwrapPageItems, withDemoFallback, type BackendPage } from "@/services/restClient";

export type NewsSort = "newest" | "oldest" | "headline";

export interface NewsPageParams extends PaginationParams {
  sort?: NewsSort;
}

export async function getNews(): Promise<NewsItem[]> {
  return withDemoFallback(
    async () => unwrapPageItems(await apiRequest<NewsItem[] | BackendPage<NewsItem>>("/news")),
    async () => {
      await delay();
      return [...db.news].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    },
  );
}

export async function getNewsPage(params: NewsPageParams = {}): Promise<PaginatedResponse<NewsItem>> {
  return withDemoFallback(
    async () => {
      const data = await apiRequest<NewsItem[] | BackendPage<NewsItem>>(
        `/news${buildQuery({ ...params, q: params.search })}`,
      );
      return toPageResponse(data, params);
    },
    async () => {
      await delay();
      const { ids, page, pageSize, search, sort: requestedSort } = params;
      const sort = requestedSort ?? (ids?.length ? undefined : "newest");
      let items = pickByIds([...db.news], ids).filter((item) => matchesSearch(search, [item.text, item.date, item.body]));

      if (sort) {
        items = [...items].sort((a, b) => {
          if (sort === "oldest") return (a.date || "").localeCompare(b.date || "");
          if (sort === "headline") return a.text.localeCompare(b.text);
          return (b.date || "").localeCompare(a.date || "");
        });
      }

      return paginateCollection(items, { page, pageSize });
    },
  );
}

export async function getNewsItem(id: string): Promise<NewsItem | undefined> {
  return withDemoFallback(
    () => apiRequest<NewsItem>(`/news/${id}`),
    async () => {
      await delay();
      return db.news.find((n) => n.id === id);
    },
  );
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
