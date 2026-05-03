import { db, delay } from "@/services/dataStore";
import { apiRequest, withDemoFallback } from "@/services/restClient";

export interface ContentStats {
  totalProjects: number;
  activeProjects: number;
  totalLore: number;
  totalGallery: number;
}

export async function getContentStats(): Promise<ContentStats> {
  return withDemoFallback(
    () => apiRequest<ContentStats>("/content-stats"),
    async () => {
      await delay();

      return {
        totalProjects: db.projects.length,
        activeProjects: db.projects.filter((project) => project.status === "On Progress").length,
        totalLore:
          db.characters.length +
          db.places.length +
          db.technology.length +
          db.creatures.length +
          db.others.length +
          db.events.length,
        totalGallery: db.gallery.length,
      };
    },
  );
}
