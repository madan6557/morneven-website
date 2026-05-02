// Lightweight notification + warning system. Persisted to localStorage so
// each user (by username) has their own inbox. PL7 may issue warnings to any
// personnel; system events (e.g. team approval) generate notifications too.
import { apiRequest, unwrapPageItems, withDemoFallback, type BackendPage } from "@/services/restClient";

export type NotificationKind = "info" | "warning" | "system" | "mention" | "request";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  recipient: string; // username
  sender?: string; // username (PL7 for warnings) or "system"
  createdAt: string;
  read: boolean;
  link?: string;
}

const KEY = "morneven_notifications";
const EVT = "morneven:notifications-changed";

function read(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}
function write(list: AppNotification[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* ignore */
  }
}

let store: AppNotification[] = read();

export function listNotifications(recipient: string): AppNotification[] {
  return store
    .filter((n) => n.recipient === recipient || n.recipient === "*")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listNotificationsRemote(recipient: string): Promise<AppNotification[]> {
  return withDemoFallback(
    async () => unwrapPageItems(await apiRequest<AppNotification[] | BackendPage<AppNotification>>("/notifications")),
    () => listNotifications(recipient),
  );
}

export function unreadCount(recipient: string): number {
  return listNotifications(recipient).filter((n) => !n.read).length;
}

export async function unreadCountRemote(recipient: string): Promise<number> {
  return withDemoFallback(
    async () => {
      const data = await apiRequest<number | { unreadTotal?: number; count?: number }>("/notifications/unread-count");
      return typeof data === "number" ? data : data.unreadTotal ?? data.count ?? 0;
    },
    () => unreadCount(recipient),
  );
}

export function pushNotification(n: Omit<AppNotification, "id" | "createdAt" | "read">) {
  const next: AppNotification = {
    ...n,
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  store = [next, ...store];
  write(store);
  return next;
}

export async function pushNotificationRemote(n: Omit<AppNotification, "id" | "createdAt" | "read">): Promise<AppNotification> {
  return apiRequest<AppNotification>("/notifications", { method: "POST", body: n });
}

export function markRead(id: string) {
  store = store.map((n) => (n.id === id ? { ...n, read: true } : n));
  write(store);
  apiRequest(`/notifications/${id}/read`, { method: "POST" }).catch(() => undefined);
}

export function markAllRead(recipient: string) {
  store = store.map((n) =>
    n.recipient === recipient || n.recipient === "*" ? { ...n, read: true } : n,
  );
  write(store);
  apiRequest("/notifications/read-all", { method: "POST" }).catch(() => undefined);
}

export function clearAll(recipient: string) {
  store = store.filter((n) => n.recipient !== recipient && n.recipient !== "*");
  write(store);
}

export function deleteNotification(id: string) {
  store = store.filter((n) => n.id !== id);
  write(store);
  apiRequest(`/notifications/${id}`, { method: "DELETE" }).catch(() => undefined);
}

// Subscribe to changes (returns unsubscribe).
export function subscribeNotifications(cb: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}
