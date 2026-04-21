// Personnel Level (PL) — Morneven Institute clearance scale.
// L0 (lowest, external/guest) → L6 (executive sovereign).
// PL is access clearance, NOT social caste, salary band, or worth.

import type { UserRole } from "@/types";

export type PersonnelLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type PersonnelTrack = "executive" | "field" | "mechanic" | "logistics";

// Public ladder — what users see in the matrix and clearance switcher.
export const PERSONNEL_LEVELS: PersonnelLevel[] = [0, 1, 2, 3, 4, 5, 6];

// Hidden top tier. Author-only. Never rendered in the public matrix or
// the regular clearance switcher.
export const PL_FULL_AUTHORITY: PersonnelLevel = 7;

// Reading restricted lore content requires PL >= this.
export const PL_RESTRICTED_THRESHOLD: PersonnelLevel = 3;

// Inline markers authors place inside fullDesc to flag a restricted block.
// Supported forms:
//   [L3+] ... [/L3+]                    → require PL>=3
//   [L5+] ... [/L5+]                    → require PL>=5
//   [L4+ track=field] ... [/L4+]        → require PL>=4 AND (optional) track hint
// The default authoring threshold (used by the legacy helpers) stays L3.
export const PL_RESTRICTED_OPEN = "[L3+]";
export const PL_RESTRICTED_CLOSE = "[/L3+]";

// Matches an opening tag like [L3+] or [L4+ track=field]. Captures threshold + optional track.
const PL_OPEN_RE = /\[L([0-6])\+(?:\s+track=([a-zA-Z]+))?\]/;

// Default PL per auth role — used when seeding the user's clearance.
// Authors start at L7 (Full Authority); they can voluntarily downshift via
// the clearance switcher to preview lower tiers.
export const DEFAULT_PL_BY_ROLE: Record<UserRole, PersonnelLevel> = {
  author: 7,
  viewer: 2,
  guest: 0,
};

export const DEFAULT_TRACK_BY_ROLE: Record<UserRole, PersonnelTrack> = {
  author: "executive",
  viewer: "executive",
  guest: "executive",
};

export interface TrackTitles {
  key: PersonnelTrack;
  label: string;
  short: string;
  // index 0..6 → title at that level
  titles: Record<PersonnelLevel, string>;
}

export const PERSONNEL_TRACKS: TrackTitles[] = [
  {
    key: "executive",
    label: "Executive",
    short: "GOV",
    titles: {
      7: "Full Authority",
      6: "Board of Trustees",
      5: "Division Director",
      4: "Senior Manager",
      3: "Project Lead",
      2: "Associate",
      1: "Intern / Assistant",
      0: "Visiting VIP",
    },
  },
  {
    key: "field",
    label: "Field Personnel",
    short: "OPS",
    titles: {
      7: "Full Authority",
      6: "Global Operative",
      5: "Field Commander",
      4: "Squad Leader",
      3: "Specialist Agent",
      2: "Field Agent",
      1: "Trainee",
      0: "Consultant",
    },
  },
  {
    key: "mechanic",
    label: "Mechanic / Tech",
    short: "ENG",
    titles: {
      7: "Full Authority",
      6: "Chief Architect",
      5: "Lead Systems Engineer",
      4: "Senior Technician",
      3: "Maintenance Lead",
      2: "Junior Mechanic",
      1: "Apprentice",
      0: "External Contractor",
    },
  },
  {
    key: "logistics",
    label: "Logistics",
    short: "LOG",
    titles: {
      7: "Full Authority",
      6: "Supply Chain Sovereign",
      5: "Logistics Director",
      4: "Distribution Manager",
      3: "Warehouse Supervisor",
      2: "Fleet Operator",
      1: "Cargo Handler",
      0: "Delivery Vendor",
    },
  },
];

export function plLabel(level: PersonnelLevel): string {
  return `L${level}`;
}

export function canAccessRestricted(level: PersonnelLevel): boolean {
  return level >= PL_RESTRICTED_THRESHOLD;
}

// Splits a free-form fullDesc into segments, each marked public/restricted.
// Restricted segments are wrapped in [L3+]...[/L3+] in the source data.
export interface DescSegment {
  restricted: boolean;
  text: string;
  // Minimum PL required to view this segment. Public segments use 0.
  threshold: PersonnelLevel;
  // Optional authoring hint for the audience track (executive/field/...). Not gated.
  track?: PersonnelTrack;
}

export function splitRestricted(fullDesc: string): DescSegment[] {
  const segments: DescSegment[] = [];
  let cursor = 0;
  while (cursor < fullDesc.length) {
    const rest = fullDesc.slice(cursor);
    const match = PL_OPEN_RE.exec(rest);
    if (!match) {
      segments.push({ restricted: false, text: fullDesc.slice(cursor), threshold: 0 });
      break;
    }
    const openIdx = cursor + match.index;
    const openLen = match[0].length;
    const threshold = Number(match[1]) as PersonnelLevel;
    const track = match[2] as PersonnelTrack | undefined;

    if (openIdx > cursor) {
      segments.push({ restricted: false, text: fullDesc.slice(cursor, openIdx), threshold: 0 });
    }
    const closeTag = `[/L${threshold}+]`;
    const closeIdx = fullDesc.indexOf(closeTag, openIdx + openLen);
    if (closeIdx === -1) {
      segments.push({
        restricted: true,
        text: fullDesc.slice(openIdx + openLen),
        threshold,
        track,
      });
      break;
    }
    segments.push({
      restricted: true,
      text: fullDesc.slice(openIdx + openLen, closeIdx),
      threshold,
      track,
    });
    cursor = closeIdx + closeTag.length;
  }
  return segments.filter((s) => s.text.trim().length > 0);
}

// Build the marker pair for a given threshold + optional track hint.
export function buildRestrictedMarkers(
  threshold: PersonnelLevel,
  track?: PersonnelTrack,
): { open: string; close: string } {
  const trackPart = track ? ` track=${track}` : "";
  return { open: `[L${threshold}+${trackPart}]`, close: `[/L${threshold}+]` };
}

export const PL_LORE_ID = "other-005";

// ────────────────────────────────────────────────────────────────────────────
// Author Panel section access
// ────────────────────────────────────────────────────────────────────────────
export type AuthorSection = "projects" | "lore" | "gallery" | "homepage" | "map";
export type LoreSubSection = "characters" | "places" | "technology" | "creatures" | "other";

export interface SectionAccessOpts {
  level: PersonnelLevel;
  track: PersonnelTrack;
  section: AuthorSection;
  loreSub?: LoreSubSection;
}

// L7 = unrestricted. L6 access depends on track:
//   • executive   → full author panel + comment moderation
//   • field       → only Lore (Creatures + Places) + Gallery (own uploads)
//   • mechanic    → only Projects + Lore (Technology) + Gallery (own uploads)
//   • logistics   → only Gallery (own uploads)
// All L6 tracks may enter the panel via Gallery, but Gallery edits are
// scoped per-item to the original uploader (enforced in the UI layer).
// L0–L5 → no author panel access.
export function canAccessAuthorPanel(opts: SectionAccessOpts): boolean {
  const { level, track, section, loreSub } = opts;
  if (level >= PL_FULL_AUTHORITY) return true;
  if (level < 6) return false;

  if (track === "executive") return true;

  // Gallery is the shared L6 surface — any L6 may enter and manage their
  // own uploads. Per-item ownership gating happens in AuthorDashboard.
  if (section === "gallery") return true;

  if (track === "field") {
    if (section === "lore" && (loreSub === "creatures" || loreSub === "places")) return true;
    return false;
  }

  if (track === "mechanic") {
    if (section === "projects") return true;
    if (section === "lore" && loreSub === "technology") return true;
    return false;
  }
  return false;
}

export function canEnterAuthorPanel(level: PersonnelLevel, track: PersonnelTrack): boolean {
  if (level >= PL_FULL_AUTHORITY) return true;
  // Any L6 may enter — Gallery is now available to all tracks.
  return level >= 6;
}

export function canModerateDiscussions(level: PersonnelLevel, track: PersonnelTrack): boolean {
  if (level >= PL_FULL_AUTHORITY) return true;
  return level >= 6 && track === "executive";
}

export function canManagePersonnel(level: PersonnelLevel): boolean {
  return level >= PL_FULL_AUTHORITY;
}
