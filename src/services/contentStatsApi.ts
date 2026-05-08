import { apiRequest } from "@/services/restClient";

export interface ContentStats {
  totalProjects: number;
  activeProjects: number;
  totalLore: number;
  totalGallery: number;
}

export async function getContentStats(): Promise<ContentStats> {
  return apiRequest<ContentStats>("/content-stats");
}
