import type { NewsItem } from "@/types";
import { db, delay } from "@/services/dataStore";

export async function getNews(): Promise<NewsItem[]> {
  await delay();
  return [...db.news];
}
