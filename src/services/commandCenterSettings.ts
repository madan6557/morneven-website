// Settings for what to display on the Command Center / HomePage
export type CommandCenterSection =
  | "projects"
  | "news"
  | "characters"
  | "places"
  | "technology"
  | "gallery";

export interface CommandCenterSettings {
  showStats: boolean;
  showProjects: boolean;
  showNews: boolean;
  showCharacters: boolean;
  showPlaces: boolean;
  showTechnology: boolean;
  showGallery: boolean;
  showQuickActions: boolean;
  welcomeMessage: string;
  // How many items to show per section. Lazy-loaded views use a safe page
  // default when this is 0.
  itemLimits: Record<CommandCenterSection, number>;
  // Optional manual selection of items to show per section. When the
  // array is non-empty, the HomePage uses these IDs in order and ignores
  // the itemLimits cap. An empty array means "auto" (use limit + default
  // ordering).
  manualSelections: Record<CommandCenterSection, string[]>;
}

const STORAGE_KEY = "morneven_cc_settings";

export const defaultSettings: CommandCenterSettings = {
  showStats: true,
  showProjects: true,
  showNews: true,
  showCharacters: true,
  showPlaces: true,
  showTechnology: true,
  showGallery: true,
  showQuickActions: true,
  welcomeMessage: "Here's your operational overview.",
  itemLimits: {
    projects: 5,
    news: 6,
    characters: 3,
    places: 3,
    technology: 3,
    gallery: 4,
  },
  manualSelections: {
    projects: [],
    news: [],
    characters: [],
    places: [],
    technology: [],
    gallery: [],
  },
};

function mergeSettings(parsed: Partial<CommandCenterSettings>): CommandCenterSettings {
  return {
    ...defaultSettings,
    ...parsed,
    itemLimits: { ...defaultSettings.itemLimits, ...(parsed.itemLimits ?? {}) },
    manualSelections: {
      ...defaultSettings.manualSelections,
      ...(parsed.manualSelections ?? {}),
    },
  };
}

export function getCommandCenterSettings(): CommandCenterSettings {
  if (typeof window === "undefined") return mergeSettings({});
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeSettings({});
    const parsed = JSON.parse(raw);
    return mergeSettings(parsed);
  } catch {
    return mergeSettings({});
  }
}

export function saveCommandCenterSettings(settings: CommandCenterSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("morneven:cc-settings-changed"));
  } catch {
    // ignore
  }
}

// Resolve the items to display for a given section based on the
// manualSelections / itemLimits configuration.
export function resolveSectionItems<T extends { id: string }>(
  section: CommandCenterSection,
  all: T[],
  settings: CommandCenterSettings,
): T[] {
  const manual = settings.manualSelections[section] ?? [];
  if (manual.length > 0) {
    const byId = new Map(all.map((it) => [it.id, it]));
    const picked = manual.map((id) => byId.get(id)).filter((x): x is T => Boolean(x));
    return picked;
  }
  const limit = settings.itemLimits[section] ?? 0;
  if (!limit || limit <= 0) return all;
  return all.slice(0, limit);
}
