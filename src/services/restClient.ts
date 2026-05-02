export interface ApiErrorDetail {
  path?: string;
  message: string;
}

export interface ApiErrorPayload {
  success: false;
  message?: string;
  errorCode?: string;
  errors?: ApiErrorDetail[];
}

export interface ApiSuccessPayload<T> {
  success: true;
  message?: string;
  data: T;
}

export interface BackendPage<T> {
  items: T[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  nextCursor?: string;
  pageInfo?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    nextCursor?: string;
  };
}

export class ApiError extends Error {
  status: number;
  errorCode?: string;
  errors: ApiErrorDetail[];

  constructor(status: number, payload?: ApiErrorPayload | null) {
    super(payload?.message || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = payload?.errorCode;
    this.errors = payload?.errors ?? [];
  }
}

const DEFAULT_BASE_URL = "https://backend.dev.morneven.com/api";
const TOKEN_KEY = "morneven_api_token";
const REFRESH_TOKEN_KEY = "morneven_api_refresh_token";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "method"> {
  method?: RequestMethod;
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (configured || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function isDemoFallbackEnabled(): boolean {
  return import.meta.env.MODE === "test" || import.meta.env.VITE_DEMO_FALLBACK === "true";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthTokens(token?: string | null, refreshToken?: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);

    if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Keep in-memory UI state usable when storage is unavailable.
  }
}

export function clearAuthTokens() {
  setAuthTokens(null, null);
}

export function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return "";
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length) query.set(key, value.join(","));
      return;
    }
    query.set(key, String(value));
  });

  const text = query.toString();
  return text ? `?${text}` : "";
}

async function parsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return response.text();
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const payload = await apiRequest<{ token?: string; refreshToken?: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
      auth: false,
      retryOnUnauthorized: false,
    });

    if (!payload.token) return false;
    setAuthTokens(payload.token, payload.refreshToken ?? refreshToken);
    return true;
  } catch {
    clearAuthTokens();
    return false;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = options.body === undefined ? "GET" : "POST",
    body,
    auth = true,
    retryOnUnauthorized = true,
    headers,
    ...init
  } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    method,
    headers: requestHeaders,
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parsePayload(response);

  if (!response.ok) {
    if (response.status === 401 && auth && retryOnUnauthorized) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
      }
    }

    throw new ApiError(response.status, payload as ApiErrorPayload | null);
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as ApiSuccessPayload<T> | ApiErrorPayload;
    if (envelope.success === false) throw new ApiError(response.status, envelope);
    return envelope.data as T;
  }

  return payload as T;
}

export async function apiUpload<T>(path: string, file: File, fieldName = "file"): Promise<T> {
  const form = new FormData();
  form.append(fieldName, file);
  return apiRequest<T>(path, { method: "POST", body: form });
}

export async function withDemoFallback<T>(request: () => Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!isDemoFallbackEnabled()) throw error;

    if (error instanceof ApiError) {
      return fallback();
    }

    if (!(error instanceof ApiError)) {
      return fallback();
    }

    throw error;
  }
}

export function unwrapPageItems<T>(data: T[] | BackendPage<T>): T[] {
  return Array.isArray(data) ? data : data.items ?? [];
}

export function toPageResponse<T>(
  data: T[] | BackendPage<T>,
  fallback: { page?: number; pageSize?: number } = {},
) {
  const items = unwrapPageItems(data);
  const pageInfo = Array.isArray(data) ? undefined : data.pageInfo ?? data;
  const page = pageInfo?.page ?? fallback.page ?? 1;
  const pageSize = pageInfo?.pageSize ?? fallback.pageSize ?? Math.max(items.length, 1);
  const total = pageInfo?.total ?? items.length;
  const totalPages = pageInfo?.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    pageInfo: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: pageInfo?.hasNextPage ?? page < totalPages,
      nextCursor: pageInfo?.nextCursor,
    },
  };
}
