// Settings for what to display on the Command Center / HomePage
import { apiRequest, withDemoFallback } from "@/services/restClient";

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

export interface CommandCenterPreset {
  id: string;
  presetKey: string;
  presetName: string;
  isActive: boolean;
  updatedBy?: string;
  updatedAt?: string;
  createdAt?: string;
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

export function normalizeCommandCenterSettings(parsed: Partial<CommandCenterSettings>): CommandCenterSettings {
  return mergeSettings(parsed);
}

export async function getCommandCenterSettingsRemote(): Promise<CommandCenterSettings> {
  return withDemoFallback(
    async () => mergeSettings(await apiRequest<Partial<CommandCenterSettings>>("/settings/command-center")),
    () => getCommandCenterSettings(),
  );
}

export async function getCommandCenterDefaults(): Promise<CommandCenterSettings> {
  return withDemoFallback(
    async () => mergeSettings(await apiRequest<Partial<CommandCenterSettings>>("/settings/command-center/defaults")),
    () => defaultSettings,
  );
}

export async function getCommandCenterPresets(): Promise<CommandCenterPreset[]> {
  return withDemoFallback(
    () => apiRequest<CommandCenterPreset[]>("/settings/command-center/presets"),
    () => [],
  );
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

export async function saveCommandCenterSettingsRemote(settings: CommandCenterSettings): Promise<CommandCenterSettings> {
  const saved = mergeSettings(await apiRequest<Partial<CommandCenterSettings>>("/settings/command-center", {
    method: "PUT",
    body: settings,
  }));
  saveCommandCenterSettings(saved);
  return saved;
}

export async function createCommandCenterPreset(payload: {
  presetKey: string;
  presetName: string;
  settings: Partial<CommandCenterSettings>;
}): Promise<CommandCenterPreset> {
  return apiRequest<CommandCenterPreset>("/settings/command-center/presets", {
    method: "POST",
    body: payload,
  });
}

export async function updateCommandCenterPreset(
  id: string,
  payload: { presetName?: string; settings?: Partial<CommandCenterSettings> },
): Promise<CommandCenterPreset> {
  return apiRequest<CommandCenterPreset>(`/settings/command-center/presets/${id}`, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteCommandCenterPreset(id: string): Promise<void> {
  await apiRequest<void>(`/settings/command-center/presets/${id}`, {
    method: "DELETE",
  });
}

export async function activateCommandCenterPreset(id: string): Promise<CommandCenterPreset> {
  return apiRequest<CommandCenterPreset>(`/settings/command-center/presets/${id}/activate`, {
    method: "POST",
  });
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
