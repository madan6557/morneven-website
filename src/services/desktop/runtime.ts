export const isDesktopApp = import.meta.env.VITE_DESKTOP_APP === "true";

export const DESKTOP_ALLOWED_PATHS = ["/author", "/projects", "/gallery", "/lore"] as const;
const DESKTOP_BLOCKED_PATHS = ["/lore/personnel"] as const;

export function isDesktopPathAllowed(pathname: string): boolean {
  if (DESKTOP_BLOCKED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return false;
  return DESKTOP_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
