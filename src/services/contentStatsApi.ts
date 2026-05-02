import { db, delay } from "@/services/dataStore";
import { getCharactersPage, getCreaturesPage, getOthersPage, getPlacesPage, getTechnologyPage } from "@/services/loreApi";
import { getEventsPage } from "@/services/eventsApi";
import { getGalleryPage } from "@/services/galleryApi";
import { getProjectsPage } from "@/services/projectsApi";
import { withDemoFallback } from "@/services/restClient";

export interface ContentStats {
  totalProjects: number;
  activeProjects: number;
  totalLore: number;
  totalGallery: number;
}

export async function getContentStats(): Promise<ContentStats> {
  return withDemoFallback(
    async () => {
      const [
        projects,
        activeProjects,
        characters,
        places,
        technology,
        creatures,
        others,
        events,
        gallery,
      ] = await Promise.all([
        getProjectsPage({ page: 1, pageSize: 1 }),
        getProjectsPage({ page: 1, pageSize: 1, status: "On Progress" }),
        getCharactersPage({ page: 1, pageSize: 1 }),
        getPlacesPage({ page: 1, pageSize: 1 }),
        getTechnologyPage({ page: 1, pageSize: 1 }),
        getCreaturesPage({ page: 1, pageSize: 1 }),
        getOthersPage({ page: 1, pageSize: 1 }),
        getEventsPage({ page: 1, pageSize: 1 }),
        getGalleryPage({ page: 1, pageSize: 1 }),
      ]);

      return {
        totalProjects: projects.pageInfo.total,
        activeProjects: activeProjects.pageInfo.total,
        totalLore:
          characters.pageInfo.total +
          places.pageInfo.total +
          technology.pageInfo.total +
          creatures.pageInfo.total +
          others.pageInfo.total +
          events.pageInfo.total,
        totalGallery: gallery.pageInfo.total,
      };
    },
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
