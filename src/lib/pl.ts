// Personnel Level (PL) — Morneven Institute clearance scale.
// L0 (lowest, external/guest) → L6 (executive sovereign).
// PL is access clearance, NOT social caste, salary band, or worth.

import type { UserRole } from "@/types";

export type PersonnelLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PersonnelTrack = "executive" | "field" | "mechanic" | "logistics";

export const PERSONNEL_LEVELS: PersonnelLevel[] = [0, 1, 2, 3, 4, 5, 6];

// Reading restricted lore content requires PL >= this.
export const PL_RESTRICTED_THRESHOLD: PersonnelLevel = 3;

// Inline marker authors place inside fullDesc to flag a restricted block.
// Everything between [L3+] and [/L3+] is hidden from PL < 3.
export const PL_RESTRICTED_OPEN = "[L3+]";
export const PL_RESTRICTED_CLOSE = "[/L3+]";

// Default PL per auth role — used when seeding the user's clearance.
export const DEFAULT_PL_BY_ROLE: Record<UserRole, PersonnelLevel> = {
  author: 6,
  viewer: 2,
  guest: 0,
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
}

export function splitRestricted(fullDesc: string): DescSegment[] {
  const segments: DescSegment[] = [];
  let cursor = 0;
  while (cursor < fullDesc.length) {
    const open = fullDesc.indexOf(PL_RESTRICTED_OPEN, cursor);
    if (open === -1) {
      segments.push({ restricted: false, text: fullDesc.slice(cursor) });
      break;
    }
    if (open > cursor) {
      segments.push({ restricted: false, text: fullDesc.slice(cursor, open) });
    }
    const close = fullDesc.indexOf(PL_RESTRICTED_CLOSE, open + PL_RESTRICTED_OPEN.length);
    if (close === -1) {
      // Unclosed marker — treat the rest as restricted.
      segments.push({ restricted: true, text: fullDesc.slice(open + PL_RESTRICTED_OPEN.length) });
      break;
    }
    segments.push({
      restricted: true,
      text: fullDesc.slice(open + PL_RESTRICTED_OPEN.length, close),
    });
    cursor = close + PL_RESTRICTED_CLOSE.length;
  }
  return segments.filter((s) => s.text.trim().length > 0);
}

export const PL_LORE_ID = "other-005";
