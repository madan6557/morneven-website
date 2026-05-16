// Personnel Level (PL) - Morneven Institute clearance scale.
// L0 (lowest, external/guest) → L6 (executive sovereign).
// PL is access clearance, NOT social caste, salary band, or worth.

import type { UserRole } from "@/types";

export type PersonnelLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type PersonnelTrack = "executive" | "field" | "mechanic" | "logistics";

// Public ladder - what users see in the matrix and clearance switcher.
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

// Default PL per auth role - used when seeding the user's clearance.
// Authors start at L7 (Full Authority); they can voluntarily downshift via
// the clearance switcher to preview lower tiers.
export const DEFAULT_PL_BY_ROLE: Record<UserRole, PersonnelLevel> = {
  author: 7,
  admin: 7,
  security: 7,
  personel: 2,
  guest: 0,
};

export const DEFAULT_TRACK_BY_ROLE: Record<UserRole, PersonnelTrack> = {
  author: "executive",
  admin: "executive",
  security: "executive",
  personel: "executive",
  guest: "executive",
};

export interface TrackTitles {
  key: PersonnelTrack;
  label: string;
  short: string;
  summary: string;
  description: string;
  emblemTitle: string;
  emblemDescription: string;
  // index 0..6 → title at that level
  titles: Record<PersonnelLevel, string>;
}

export const PERSONNEL_TRACKS: TrackTitles[] = [
  {
    key: "executive",
    label: "Executive",
    short: "GOV",
    summary: "Strategic governance, doctrine control, and institute-wide decision authority.",
    description:
      "The Executive division governs policy, inter-division alignment, strategic approvals, and crisis doctrine. Personnel in this ladder are expected to translate fragmented field, engineering, and logistics realities into stable institutional direction without collapsing operational tempo.",
    emblemTitle: "Command Sigil",
    emblemDescription:
      "A crowned hexagonal command sigil that represents supervisory authority, layered oversight, and the burden of central doctrine.",
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
    summary: "Reconnaissance, containment, combat deployment, and hostile-zone survival.",
    description:
      "The Field division handles direct exposure to unstable sectors, creature activity, anomaly response, and tactical retrieval. Its doctrine values adaptability, observation under stress, and the ability to move from intelligence gathering to decisive engagement without waiting for ideal conditions.",
    emblemTitle: "Vector Scope",
    emblemDescription:
      "A crosshair pierced by an upward vector arrow, symbolizing target acquisition, mobility, and the will to advance into contested ground.",
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
    summary: "Systems design, maintenance, reverse engineering, and technical continuity.",
    description:
      "The Mechanic division keeps the institute functional at every scale, from emergency repairs to high-complexity architecture. It owns machine reliability, technical research conversion, and the disciplined translation of dangerous theory into tools that can survive field use.",
    emblemTitle: "Cog Array",
    emblemDescription:
      "A cogged tri-bolt array with a hex core, representing engineered precision, modular systems thinking, and continuous maintenance pressure.",
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
    summary: "Supply routing, inventory continuity, transport discipline, and operational sustainment.",
    description:
      "The Logistics division ensures the rest of the institute can continue operating when conditions degrade. It coordinates movement, storage, provisioning, and redundancy planning, treating continuity itself as a strategic capability rather than a background service.",
    emblemTitle: "Cargo Prism",
    emblemDescription:
      "Stacked cargo prisms with directional chevrons, representing controlled throughput, layered distribution, and forward movement of critical resources.",
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
export type AuthorSection = "projects" | "lore" | "gallery" | "homepage" | "map" | "news";
export type LoreSubSection = "characters" | "places" | "technology" | "creatures" | "events" | "other";

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
// L0-L5 has no author panel access.
export function canAccessAuthorPanel(opts: SectionAccessOpts): boolean {
  const { level, track, section, loreSub } = opts;
  if (level >= PL_FULL_AUTHORITY) return true;
  if (level < 6) return false;

  if (track === "executive") return true;

  // News is executive-only at L7+; L6 non-executive tracks have no access.
  if (section === "news") return false;

  // Gallery is the shared L6 surface - any L6 may enter and manage their
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
  // Any L6 may enter - Gallery is now available to all tracks.
  return level >= 6;
}

export function canModerateDiscussions(level: PersonnelLevel, _track: PersonnelTrack): boolean {
  if (level >= PL_FULL_AUTHORITY) return true;
  return level >= 6;
}

export function canManagePersonnel(level: PersonnelLevel): boolean {
  return level >= 4;
}

export function canAccessSecurityConsole(level: PersonnelLevel, role: UserRole): boolean {
  return level >= PL_FULL_AUTHORITY && (role === "author" || role === "admin" || role === "security");
}
