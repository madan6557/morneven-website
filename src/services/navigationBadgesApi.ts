import { apiRequest } from "@/services/restClient";
import type { PersonnelLevel, PersonnelTrack } from "@/lib/pl";

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

export async function getNavigationBadges(_viewer: {
  username: string;
  level: PersonnelLevel;
  track: PersonnelTrack;
}): Promise<NavigationBadges> {
  const data = await apiRequest<BackendNavigationBadges>("/me/navigation-badges");

  if ("chat" in data && "notifications" in data && "management" in data) {
    return data;
  }

  return {
    chat: {
      unreadTotal: Number(data.chatUnreadCount ?? 0),
    },
    notifications: {
      unreadTotal: Number(data.notificationUnreadCount ?? 0),
    },
    management: {
      pendingRequests: Number(data.managementPendingCount ?? 0),
    },
  };
}
