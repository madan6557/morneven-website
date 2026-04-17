// Settings for what to display on the Command Center / HomePage
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
};

export function getCommandCenterSettings(): CommandCenterSettings {
  if (typeof window === "undefined") return { ...defaultSettings };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
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
