import { apiRequest } from "@/services/restClient";
import {
  defaultSettings,
  normalizeCommandCenterSettings,
  type CommandCenterSettings,
} from "@/services/commandCenterSettings";
import type { Character, GalleryItem, NewsItem, Place, Project, Technology } from "@/types";
import type { ContentStats } from "@/services/contentStatsApi";

export interface CommandCenterSections {
  projects: Project[];
  news: NewsItem[];
  characters: Character[];
  places: Place[];
  technology: Technology[];
  gallery: GalleryItem[];
}

export interface CommandCenterSnapshot {
  settings: CommandCenterSettings;
  stats: ContentStats;
  sections: CommandCenterSections;
}

const emptySections: CommandCenterSections = {
  projects: [],
  news: [],
  characters: [],
  places: [],
  technology: [],
  gallery: [],
};

const emptyStats: ContentStats = {
  totalProjects: 0,
  activeProjects: 0,
  totalLore: 0,
  totalGallery: 0,
};

function normalizeCommandCenterSnapshot(snapshot: Partial<CommandCenterSnapshot>): CommandCenterSnapshot {
  return {
    settings: normalizeCommandCenterSettings(snapshot.settings ?? defaultSettings),
    stats: {
      ...emptyStats,
      ...(snapshot.stats ?? {}),
    },
    sections: {
      ...emptySections,
      ...(snapshot.sections ?? {}),
    },
  };
}

export async function getCommandCenterSnapshot(): Promise<CommandCenterSnapshot> {
  return normalizeCommandCenterSnapshot(await apiRequest<Partial<CommandCenterSnapshot>>("/command-center"));
}
