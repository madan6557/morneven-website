import type { CharacterStats, CreatureStats } from "@/types";

export type StatCategoryKey = "combat" | "intelligence" | "charisma" | "stealth" | "perception";

export const STAT_DETAIL_LABELS: Record<StatCategoryKey, string> = {
  combat: "Combat",
  intelligence: "Intelligence",
  charisma: "Charisma",
  stealth: "Stealth",
  perception: "Perception",
};

export const STAT_DETAIL_AXES: Record<StatCategoryKey, Record<string, number>> = {
  combat: { STR: 50, DEF: 50, AGI: 50, END: 50, ADP: 50 },
  intelligence: { IQ: 50, EQ: 50, SQ: 50 },
  charisma: { PRS: 50, INT: 50, MNP: 50 },
  stealth: { PRC: 50, SIL: 50, ENC: 50, VIS: 50 },
  perception: { ACU: 50, FOC: 50, INT: 50 },
};

export const averageScore = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0);

export function toCharacterPrimaryStats(stats: CharacterStats): Record<StatCategoryKey, number> {
  return {
    combat: stats.combat,
    intelligence: stats.intelligence,
    charisma: stats.charisma,
    stealth: stats.stealth,
    perception: stats.perception ?? stats.endurance,
  };
}

export type CreatureStatCategoryKey = "combat" | "cognition" | "predation" | "senses" | "ferocity";

export const CREATURE_STAT_DETAIL_LABELS: Record<CreatureStatCategoryKey, string> = {
  combat: "Combat",
  cognition: "Cognition",
  predation: "Predation",
  senses: "Senses",
  ferocity: "Ferocity",
};

export const CREATURE_STAT_DETAIL_AXES: Record<CreatureStatCategoryKey, Record<string, number>> = {
  combat: { STR: 50, DEF: 50, AGI: 50, END: 50, ADP: 50 },
  cognition: { PRB: 50, MEM: 50, INS: 50 },
  predation: { AMB: 50, CAM: 50, QUI: 50, TRP: 50 },
  senses: { TRK: 50, DET: 50, AWR: 50 },
  ferocity: { INT: 50, DOM: 50, HOS: 50 },
};

export function toCreaturePrimaryStats(stats: CreatureStats): Record<CreatureStatCategoryKey, number> {
  return {
    combat: stats.combat,
    cognition: stats.cognition ?? stats.intelligence,
    predation: stats.predation ?? stats.stealth,
    senses: stats.senses ?? stats.endurance,
    ferocity: stats.ferocity,
  };
}
