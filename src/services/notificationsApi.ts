import { apiRequest, unwrapPageItems, type BackendPage } from "@/services/restClient";

export type NotificationKind = "info" | "warning" | "system" | "mention" | "request";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  recipient: string;
  sender?: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

const EVT = "morneven:notifications-changed";

function emitNotificationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

export async function listNotifications(_recipient: string): Promise<AppNotification[]> {
  return unwrapPageItems(
    await apiRequest<AppNotification[] | BackendPage<AppNotification>>("/notifications"),
  );
}

export async function listNotificationsRemote(recipient: string): Promise<AppNotification[]> {
  return listNotifications(recipient);
}

export async function unreadCount(_recipient: string): Promise<number> {
  const data = await apiRequest<number | { unreadTotal?: number; count?: number }>("/notifications/unread-count");
  return typeof data === "number" ? data : data.unreadTotal ?? data.count ?? 0;
}

export async function unreadCountRemote(recipient: string): Promise<number> {
  return unreadCount(recipient);
}

export async function pushNotification(
  notification: Omit<AppNotification, "id" | "createdAt" | "read">,
): Promise<AppNotification> {
  const created = await apiRequest<AppNotification>("/notifications", {
    method: "POST",
    body: notification,
  });
  emitNotificationsChanged();
  return created;
}

export async function pushNotificationRemote(
  notification: Omit<AppNotification, "id" | "createdAt" | "read">,
): Promise<AppNotification> {
  return pushNotification(notification);
}

export async function markRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, { method: "POST" });
  emitNotificationsChanged();
}

export async function markAllRead(_recipient: string): Promise<void> {
  await apiRequest("/notifications/read-all", { method: "POST" });
  emitNotificationsChanged();
}

export async function clearAll(_recipient: string): Promise<void> {
  await apiRequest("/notifications", { method: "DELETE" });
  emitNotificationsChanged();
}

export async function deleteNotification(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}`, { method: "DELETE" });
  emitNotificationsChanged();
}

export function subscribeNotifications(cb: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  window.addEventListener("focus", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener("focus", handler);
  };
}
