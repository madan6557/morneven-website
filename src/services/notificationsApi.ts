import { apiRequest, unwrapPageItems, type BackendPage } from "@/services/restClient";
import { subscribeRealtimeEvents } from "@/services/realtime";
import { invalidateNavigationBadges } from "@/services/navigationBadgesApi";

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

export interface NotificationsChangeDetail {
  unreadTotal?: number;
}

let releaseRealtimeBridge: (() => void) | null = null;

function emitNotificationsChanged(detail: NotificationsChangeDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT, { detail }));
}

function getUnreadTotalFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;

  const candidate = payload as {
    notifications?: { unreadTotal?: unknown };
    notificationUnreadCount?: unknown;
  };

  const unreadTotal =
    candidate.notifications?.unreadTotal ?? candidate.notificationUnreadCount;

  return typeof unreadTotal === "number" ? unreadTotal : undefined;
}

function ensureRealtimeBridge() {
  if (releaseRealtimeBridge || typeof window === "undefined") return;

  releaseRealtimeBridge = subscribeRealtimeEvents(
    ["notification.created", "notifications.updated", "navigation_badges.updated", "socket.ready"],
    (payload, envelope) => {
      if (envelope.event === "notifications.updated") {
        emitNotificationsChanged({
          unreadTotal:
            typeof (payload as { unreadTotal?: unknown })?.unreadTotal === "number"
              ? ((payload as { unreadTotal?: number }).unreadTotal ?? 0)
              : undefined,
        });
        return;
      }

      if (envelope.event === "navigation_badges.updated") {
        emitNotificationsChanged({
          unreadTotal: getUnreadTotalFromPayload(payload),
        });
        return;
      }

      emitNotificationsChanged();
    },
  );
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
  invalidateNavigationBadges();
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
  invalidateNavigationBadges();
  emitNotificationsChanged();
}

export async function markAllRead(_recipient: string): Promise<void> {
  await apiRequest("/notifications/read-all", { method: "POST" });
  invalidateNavigationBadges();
  emitNotificationsChanged();
}

export async function clearAll(_recipient: string): Promise<void> {
  await apiRequest("/notifications", { method: "DELETE" });
  invalidateNavigationBadges();
  emitNotificationsChanged();
}

export async function deleteNotification(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}`, { method: "DELETE" });
  invalidateNavigationBadges();
  emitNotificationsChanged();
}

export function subscribeNotifications(
  cb: (detail?: NotificationsChangeDetail) => void,
): () => void {
  ensureRealtimeBridge();
  if (typeof window === "undefined") return () => undefined;

  const handleChange = (event: Event) => {
    const customEvent = event as CustomEvent<NotificationsChangeDetail>;
    cb(customEvent.detail);
  };
  const handleFallback = () => cb();

  window.addEventListener(EVT, handleChange);
  window.addEventListener("storage", handleFallback);
  window.addEventListener("focus", handleFallback);

  return () => {
    window.removeEventListener(EVT, handleChange);
    window.removeEventListener("storage", handleFallback);
    window.removeEventListener("focus", handleFallback);
  };
}
