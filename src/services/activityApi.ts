import { apiRequest, buildQuery, toPageResponse, type BackendPage } from "@/services/restClient";
import type { PaginatedResponse, PaginationParams } from "@/services/pagination";

export type ActivityCategory =
  | "all"
  | "gallery"
  | "character"
  | "place"
  | "technology"
  | "creature"
  | "event"
  | "other";

export type ActivitySort = "views" | "likes" | "dislikes" | "stars" | "comments" | "title" | "recent";
export type ActivityOrder = "asc" | "desc";

export interface ActivityContentItem {
  id: string;
  entityType: Exclude<ActivityCategory, "all">;
  category: string;
  title: string;
  thumbnail: string;
  subtitle: string;
  date: string;
  url: string;
  views: number;
  likes: number;
  dislikes: number;
  stars: number;
  comments: number;
}

export interface ActivityEngagementUser {
  username: string;
  date?: string;
}

export interface ActivityViewerSummary {
  label: string;
  count: number;
  kind: string;
}

export interface ActivityDiscussionReply {
  id: string;
  author: string;
  authorStatus?: string;
  text: string;
  date: string;
}

export interface ActivityDiscussionComment {
  id: string;
  author: string;
  authorStatus?: string;
  text: string;
  date: string;
  replies: ActivityDiscussionReply[];
}

export interface ActivityContentDetail extends ActivityContentItem {
  viewers: ActivityViewerSummary[];
  likedBy: ActivityEngagementUser[];
  dislikedBy: ActivityEngagementUser[];
  starredBy: ActivityEngagementUser[];
  discussion: ActivityDiscussionComment[];
}

export interface ActivityOverview {
  totals: {
    content: number;
    gallery: number;
    lore: number;
    views: number;
    likes: number;
    dislikes: number;
    stars: number;
    comments: number;
  };
  leaders: ActivityContentItem[];
}

export interface ActivityContentParams extends PaginationParams {
  category?: ActivityCategory;
  sort?: ActivitySort;
  order?: ActivityOrder;
}

export async function getActivityOverview(): Promise<ActivityOverview> {
  return apiRequest<ActivityOverview>("/activity/overview");
}

export async function getActivityContent(
  params: ActivityContentParams = {},
): Promise<PaginatedResponse<ActivityContentItem>> {
  const data = await apiRequest<BackendPage<ActivityContentItem>>(
    `/activity/content${buildQuery({ ...params, q: params.search })}`,
  );
  return toPageResponse(data, params);
}

export async function getActivityContentDetail(
  entityType: ActivityContentItem["entityType"],
  id: string,
): Promise<ActivityContentDetail> {
  return apiRequest<ActivityContentDetail>(`/activity/content/${entityType}/${encodeURIComponent(id)}`);
}
