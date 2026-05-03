import { apiRequest, withDemoFallback } from "@/services/restClient";
import { getChatUnreadCount } from "@/services/chatApi";
import { getReviewableRequestCount } from "@/services/managementApi";
import { unreadCount } from "@/services/notificationsApi";
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

export async function getNavigationBadges(viewer: {
  username: string;
  level: PersonnelLevel;
  track: PersonnelTrack;
}): Promise<NavigationBadges> {
  return withDemoFallback(
    () => apiRequest<NavigationBadges>("/me/navigation-badges"),
    () => ({
      chat: {
        unreadTotal: getChatUnreadCount(viewer.username),
      },
      notifications: {
        unreadTotal: unreadCount(viewer.username),
      },
      management: {
        pendingRequests: getReviewableRequestCount(viewer),
      },
    }),
  );
}
