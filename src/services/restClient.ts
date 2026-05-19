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

export interface UploadProgress {
  loaded: number;
  total?: number;
  percent?: number;
}

export interface ApiUploadOptions {
  fieldName?: string;
  onProgress?: (progress: UploadProgress) => void;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  timeoutMs?: number;
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

const DEFAULT_PRODUCTION_BASE_URL = "https://morneven-backend-production.up.railway.app/api";
const DEFAULT_LOCAL_BASE_URL = "http://localhost:3000/api";
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_UPLOAD_TIMEOUT_MS = 300000;
const TOKEN_KEY = "morneven_api_token";
const REFRESH_TOKEN_KEY = "morneven_api_refresh_token";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "method"> {
  method?: RequestMethod;
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  timeoutMs?: number;
}

function inferDefaultBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_PRODUCTION_BASE_URL;

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
    return DEFAULT_LOCAL_BASE_URL;
  }

  if (hostname === "morneven.com" || hostname.endsWith(".morneven.com")) {
    return DEFAULT_PRODUCTION_BASE_URL;
  }

  return `${origin}/api`;
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const baseUrl = (configured || inferDefaultBaseUrl()).replace(/\/+$/, "");
  if (/\/(api|v1)$/i.test(baseUrl)) return baseUrl;
  return `${baseUrl}/api`;
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

function parseRawPayload(text: string, contentType: string): unknown {
  if (!contentType.includes("application/json")) return text;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function unwrapPayload<T>(payload: unknown, status: number): T {
  if (payload && typeof payload === "object" && "success" in payload) {
    const envelope = payload as ApiSuccessPayload<T> | ApiErrorPayload;
    if (envelope.success === false) throw new ApiError(status, envelope);
    return envelope.data as T;
  }

  return payload as T;
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
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) return false;
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
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
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

  const timeoutController = new AbortController();
  let timedOut = false;
  const forwardAbort = () => timeoutController.abort();
  if (init.signal) {
    if (init.signal.aborted) {
      timeoutController.abort();
    } else {
      init.signal.addEventListener("abort", forwardAbort, { once: true });
    }
  }
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    timeoutController.abort();
  }, timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      method,
      headers: requestHeaders,
      credentials: init.credentials ?? "include",
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
      signal: timeoutController.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new Error("Request timed out.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    if (init.signal) {
      init.signal.removeEventListener("abort", forwardAbort);
    }
  }

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

  return unwrapPayload<T>(payload, response.status);
}

export async function apiUpload<T>(
  path: string,
  file: File,
  fieldNameOrOptions: string | ApiUploadOptions = "file",
): Promise<T> {
  const options: ApiUploadOptions =
    typeof fieldNameOrOptions === "string" ? { fieldName: fieldNameOrOptions } : fieldNameOrOptions;

  if (typeof XMLHttpRequest === "undefined") {
    const form = new FormData();
    form.append(options.fieldName ?? "file", file);
    return apiRequest<T>(path, {
      method: "POST",
      body: form,
      auth: options.auth,
      retryOnUnauthorized: options.retryOnUnauthorized,
      timeoutMs: options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS,
    });
  }

  const {
    fieldName = "file",
    onProgress,
    auth = true,
    retryOnUnauthorized = true,
    timeoutMs = DEFAULT_UPLOAD_TIMEOUT_MS,
  } = options;
  const form = new FormData();
  form.append(fieldName, file);

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getApiBaseUrl()}${path}`);
    xhr.withCredentials = true;
    xhr.timeout = timeoutMs;

    if (auth) {
      const token = getAccessToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable && event.total > 0 ? event.total : file.size || undefined;
      const percent = total ? Math.min(100, Math.max(0, Math.round((event.loaded / total) * 100))) : undefined;
      onProgress?.({ loaded: event.loaded, total, percent });
    };

    xhr.onload = async () => {
      const payload = parseRawPayload(xhr.responseText, xhr.getResponseHeader("content-type") || "");

      if (xhr.status < 200 || xhr.status >= 300) {
        if (xhr.status === 401 && auth && retryOnUnauthorized) {
          try {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              resolve(apiUpload<T>(path, file, { ...options, retryOnUnauthorized: false }));
              return;
            }
          } catch {
            // Fall through to the original unauthorized response.
          }
        }

        reject(new ApiError(xhr.status, payload as ApiErrorPayload | null));
        return;
      }

      onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
      try {
        resolve(unwrapPayload<T>(payload, xhr.status));
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed due to a network error."));
    xhr.ontimeout = () => reject(new Error("Upload timed out."));
    xhr.onabort = () => reject(new Error("Upload was aborted."));
    xhr.send(form);
  });
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
