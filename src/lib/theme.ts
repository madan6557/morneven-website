export const THEME_KEY = "theme";
export const APP_THEME_EVENT = "morneven-theme-change";

export const APP_THEMES = [
  {
    value: "dark",
    label: "Dark",
    description: "Classic Morneven HUD with warm red contrast.",
    tone: "dark",
  },
  {
    value: "light",
    label: "Light",
    description: "Neutral bright canvas tuned for long reading sessions.",
    tone: "light",
  },
  {
    value: "aurora",
    label: "Aurora",
    description: "Cool night console with cyan and violet accents.",
    tone: "dark",
  },
] as const;

export type AppTheme = (typeof APP_THEMES)[number]["value"];

function isAppTheme(value: string | null | undefined): value is AppTheme {
  return APP_THEMES.some((theme) => theme.value === value);
}

export function isDarkTheme(theme: AppTheme) {
  return APP_THEMES.find((item) => item.value === theme)?.tone === "dark";
}

export function getStoredTheme(): AppTheme | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(THEME_KEY);
  return isAppTheme(stored) ? stored : null;
}

export function resolveInitialTheme(): AppTheme {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", isDarkTheme(theme));
}

export function setAppTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;
  applyTheme(theme);
  window.localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new CustomEvent<AppTheme>(APP_THEME_EVENT, { detail: theme }));
}

export function getActiveTheme(): AppTheme {
  if (typeof document !== "undefined") {
    const applied = document.documentElement.dataset.theme;
    if (isAppTheme(applied)) return applied;
  }
  return resolveInitialTheme();
}

export function subscribeThemeChange(callback: (theme: AppTheme) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleThemeEvent = (event: Event) => {
    const next = (event as CustomEvent<AppTheme>).detail;
    if (isAppTheme(next)) callback(next);
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY) return;
    if (isAppTheme(event.newValue)) callback(event.newValue);
  };

  window.addEventListener(APP_THEME_EVENT, handleThemeEvent as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(APP_THEME_EVENT, handleThemeEvent as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
}
