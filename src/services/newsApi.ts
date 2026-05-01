import type { NewsItem } from "@/types";
import { db, delay, STORAGE_KEYS, writeCollection } from "@/services/dataStore";
import {
  matchesSearch,
  paginateCollection,
  pickByIds,
  type PaginatedResponse,
  type PaginationParams,
} from "@/services/pagination";

export type NewsSort = "newest" | "oldest" | "headline";

export interface NewsPageParams extends PaginationParams {
  sort?: NewsSort;
}

export async function getNews(): Promise<NewsItem[]> {
  await delay();
  // Newest first by date when available; otherwise preserve insertion order.
  return [...db.news].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export async function getNewsPage(params: NewsPageParams = {}): Promise<PaginatedResponse<NewsItem>> {
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
}

export async function getNewsItem(id: string): Promise<NewsItem | undefined> {
  await delay();
  return db.news.find((n) => n.id === id);
}

export async function createNews(item: Omit<NewsItem, "id">): Promise<NewsItem> {
  await delay();
  const next: NewsItem = { ...item, id: `news-${Date.now()}` };
  db.news = [next, ...db.news];
  writeCollection(STORAGE_KEYS.news, db.news);
  return next;
}

export async function updateNews(id: string, data: Partial<NewsItem>): Promise<NewsItem | undefined> {
  await delay();
  const idx = db.news.findIndex((n) => n.id === id);
  if (idx === -1) return undefined;
  db.news[idx] = { ...db.news[idx], ...data };
  writeCollection(STORAGE_KEYS.news, db.news);
  return db.news[idx];
}

export async function deleteNews(id: string): Promise<boolean> {
  await delay();
  const len = db.news.length;
  db.news = db.news.filter((n) => n.id !== id);
  writeCollection(STORAGE_KEYS.news, db.news);
  return db.news.length < len;
}
