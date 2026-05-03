import { db } from "@/services/dataStore";
import { apiRequest, withDemoFallback } from "@/services/restClient";
import {
  defaultSettings,
  getCommandCenterSettings,
  normalizeCommandCenterSettings,
  resolveSectionItems,
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

function buildDemoCommandCenterSnapshot(): CommandCenterSnapshot {
  const settings = getCommandCenterSettings();

  return {
    settings,
    stats: {
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
    },
    sections: {
      projects: settings.showProjects ? resolveSectionItems("projects", db.projects, settings) : [],
      news: settings.showNews ? resolveSectionItems("news", db.news, settings) : [],
      characters: settings.showCharacters ? resolveSectionItems("characters", db.characters, settings) : [],
      places: settings.showPlaces ? resolveSectionItems("places", db.places, settings) : [],
      technology: settings.showTechnology ? resolveSectionItems("technology", db.technology, settings) : [],
      gallery: settings.showGallery ? resolveSectionItems("gallery", db.gallery, settings) : [],
    },
  };
}

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
  return withDemoFallback(
    async () => normalizeCommandCenterSnapshot(await apiRequest<Partial<CommandCenterSnapshot>>("/command-center")),
    () => buildDemoCommandCenterSnapshot(),
  );
}
