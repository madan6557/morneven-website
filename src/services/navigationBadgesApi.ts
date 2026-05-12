import { apiRequest } from "@/services/restClient";
import type { PersonnelLevel, PersonnelTrack } from "@/lib/pl";
import { subscribeRealtimeEvents } from "@/services/realtime";

export interface NavigationBadges {
  chat: {
    unreadTotal: number;
    mentions?: number;
  };
  notifications: {
    unreadTotal: number;
  };
  management: {
    pendingRequests: number;
  };
}

type BackendNavigationBadges =
  | NavigationBadges
  | {
      chatUnreadCount?: number;
      managementPendingCount?: number;
      notificationUnreadCount?: number;
    };

const EVT = "morneven:navigation-badges-changed";

let cachedBadges: NavigationBadges | null = null;
let releaseRealtimeBridge: (() => void) | null = null;

function normalizeNavigationBadges(data: BackendNavigationBadges | null | undefined): NavigationBadges {
  if (data && "chat" in data && "notifications" in data && "management" in data) {
    return data;
  }

  const legacy = data as
    | {
        chatUnreadCount?: number;
        managementPendingCount?: number;
        notificationUnreadCount?: number;
      }
    | null
    | undefined;

  return {
    chat: {
      unreadTotal: Number(legacy?.chatUnreadCount ?? 0),
    },
    notifications: {
      unreadTotal: Number(legacy?.notificationUnreadCount ?? 0),
    },
    management: {
      pendingRequests: Number(legacy?.managementPendingCount ?? 0),
    },
  };
}

function emitNavigationBadgesChanged(badges?: NavigationBadges) {
  if (typeof window === "undefined") return;
  if (badges) {
    cachedBadges = badges;
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: { badges } }));
}

function ensureRealtimeBridge() {
  if (releaseRealtimeBridge || typeof window === "undefined") return;

  releaseRealtimeBridge = subscribeRealtimeEvents(
    ["navigation_badges.updated", "socket.ready"],
    (payload, envelope) => {
      if (envelope.event === "navigation_badges.updated") {
        emitNavigationBadgesChanged(
          normalizeNavigationBadges(payload as BackendNavigationBadges),
        );
        return;
      }

      emitNavigationBadgesChanged();
    },
  );
}

export function getCachedNavigationBadges() {
  return cachedBadges;
}

export function invalidateNavigationBadges() {
  emitNavigationBadgesChanged();
}

export async function getNavigationBadges(_viewer: {
  username: string;
  level: PersonnelLevel;
  track: PersonnelTrack;
}): Promise<NavigationBadges> {
  ensureRealtimeBridge();
  const data = await apiRequest<BackendNavigationBadges>("/me/navigation-badges");
  const normalized = normalizeNavigationBadges(data);
  cachedBadges = normalized;
  return normalized;
}

export function subscribeNavigationBadges(cb: (badges?: NavigationBadges) => void): () => void {
  ensureRealtimeBridge();
  if (typeof window === "undefined") return () => undefined;

  const handleChange = (event: Event) => {
    const customEvent = event as CustomEvent<{ badges?: NavigationBadges }>;
    cb(customEvent.detail?.badges);
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
