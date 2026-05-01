import { db, delay } from "@/services/dataStore";

export interface ContentStats {
  totalProjects: number;
  activeProjects: number;
  totalLore: number;
  totalGallery: number;
}

export async function getContentStats(): Promise<ContentStats> {
  await delay();

  return {
    totalProjects: db.projects.length,
    activeProjects: db.projects.filter((project) => project.status === "On Progress").length,
    totalLore: db.characters.length + db.places.length + db.technology.length,
    totalGallery: db.gallery.length,
  };
}
