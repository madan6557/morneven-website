import type { CSSProperties } from "react";
import type { PersonnelLevel, PersonnelTrack } from "@/lib/pl";
import { themedHslPanelStyle, themedHslStyle } from "@/lib/themeColor";

const LEVEL_HSL: Record<PersonnelLevel, string> = {
  0: "220 8% 48%",
  1: "199 89% 48%",
  2: "158 64% 38%",
  3: "190 80% 42%",
  4: "38 90% 45%",
  5: "24 90% 48%",
  6: "348 76% 54%",
  7: "0 78% 58%",
};

const TRACK_HSL: Record<PersonnelTrack, string> = {
  executive: "0 78% 58%",
  field: "24 88% 50%",
  mechanic: "46 92% 46%",
  logistics: "226 13% 54%",
};

export function personnelLevelBadgeStyle(level: PersonnelLevel | number): CSSProperties {
  const safeLevel = level in LEVEL_HSL ? (level as PersonnelLevel) : 0;
  return themedHslStyle(LEVEL_HSL[safeLevel], 0.12, 0.34);
}

export function personnelLevelPanelStyle(level: PersonnelLevel | number): CSSProperties {
  const safeLevel = level in LEVEL_HSL ? (level as PersonnelLevel) : 0;
  return themedHslPanelStyle(LEVEL_HSL[safeLevel], 0.09, 0.28);
}

export function personnelTrackBadgeStyle(track: PersonnelTrack): CSSProperties {
  return themedHslStyle(TRACK_HSL[track] ?? TRACK_HSL.executive, 0.12, 0.34);
}
