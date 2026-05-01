export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  nextCursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: PageInfo;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  ids?: string[];
}

export function paginateCollection<T>(
  allItems: T[],
  { page = 1, pageSize = 24 }: Pick<PaginationParams, "page" | "pageSize"> = {},
): PaginatedResponse<T> {
  const safePageSize = Math.max(1, pageSize);
  const total = allItems.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safePageSize;
  const items = allItems.slice(start, start + safePageSize);

  return {
    items,
    pageInfo: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      nextCursor: safePage < totalPages ? String(safePage + 1) : undefined,
    },
  };
}

export function matchesSearch(search: string | undefined, fields: Array<string | undefined>): boolean {
  const query = search?.trim().toLowerCase();
  if (!query) return true;

  return fields.some((field) => field?.toLowerCase().includes(query));
}

export function pickByIds<T extends { id: string }>(items: T[], ids?: string[]): T[] {
  if (!ids || ids.length === 0) return items;

  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
}
