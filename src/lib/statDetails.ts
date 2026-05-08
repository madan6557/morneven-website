import type { CharacterStats, CreatureStats } from "@/types";

export type StatCategoryKey = "combat" | "intelligence" | "charisma" | "stealth" | "perception";
export type CreatureStatCategoryKey = "combat" | "cognition" | "predation" | "senses" | "ferocity";

export const STAT_DETAIL_LABELS: Record<StatCategoryKey, string> = {
  combat: "Combat",
  intelligence: "Intelligence",
  charisma: "Charisma",
  stealth: "Stealth",
  perception: "Perception",
};

export const CREATURE_STAT_DETAIL_LABELS: Record<CreatureStatCategoryKey, string> = {
  combat: "Combat",
  cognition: "Cognition",
  predation: "Predation",
  senses: "Senses",
  ferocity: "Ferocity",
};

export const STAT_AXIS_FULL_NAMES: Record<string, string> = {
  STR: "Strength",
  DEF: "Defense",
  AGI: "Agility",
  END: "Endurance",
  ADP: "Adaptation",
  IQ: "Intelligence Quotient",
  EQ: "Emotional Quotient",
  SQ: "Social Quotient",
  PRS: "Persuasion",
  ITM: "Intimidation",
  MNP: "Manipulation",
  PRC: "Presence Control",
  SIL: "Silence",
  ENC: "Environment Control",
  VIS: "Visual Masking",
  ACU: "Acuity",
  FOC: "Focus",
  INT: "Intuition",
  PRB: "Problem Solving",
  MEM: "Memory",
  INS: "Instinct",
  AMB: "Ambush",
  CAM: "Camouflage",
  QUI: "Quietude",
  TRP: "Trapping",
  TRK: "Tracking",
  DET: "Detection",
  AWR: "Awareness",
  DNM: "Dominance",
  HOS: "Hostility",
};

const clampStat = (value: unknown, fallback = 50) => {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
};

export const averageScore = (values: number[]) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const mapObjectValues = <T extends Record<string, number>>(value: T, fallback = 50): T =>
  Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, clampStat(item, fallback)]),
  ) as T;

export const createDefaultCharacterStats = (base = 50): CharacterStats => ({
  combat: base,
  intelligence: base,
  charisma: base,
  stealth: base,
  perception: base,
  detail: {
    combat: { strength: base, defense: base, agility: base, endurance: base, adaptation: base },
    intelligence: { iq: base, eq: base, sq: base },
    charisma: { persuasion: base, intimidation: base, manipulation: base },
    stealth: { presenceControl: base, silence: base, environmentControl: base, visualMasking: base },
    perception: { acuity: base, focus: base, intuition: base },
  },
});

export const createDefaultCreatureStats = (base = 50): CreatureStats => ({
  combat: base,
  cognition: base,
  predation: base,
  senses: base,
  ferocity: base,
  detail: {
    combat: { strength: base, defense: base, agility: base, endurance: base, adaptation: base },
    cognition: { problemSolving: base, memory: base, instinct: base },
    predation: { ambush: base, camouflage: base, quietude: base, trapping: base },
    senses: { tracking: base, detection: base, awareness: base },
    ferocity: { intimidation: base, dominance: base, hostility: base },
  },
});

export function normalizeCharacterStatsForEditor(raw?: Partial<CharacterStats>): CharacterStats {
  const fallback = createDefaultCharacterStats();
  const combat = mapObjectValues({ ...fallback.detail!.combat!, ...raw?.detail?.combat }, clampStat(raw?.combat, 50));
  const intelligence = mapObjectValues(
    { ...fallback.detail!.intelligence!, ...raw?.detail?.intelligence },
    clampStat(raw?.intelligence, 50),
  );
  const charisma = mapObjectValues(
    { ...fallback.detail!.charisma!, ...raw?.detail?.charisma },
    clampStat(raw?.charisma, 50),
  );
  const stealth = mapObjectValues({ ...fallback.detail!.stealth!, ...raw?.detail?.stealth }, clampStat(raw?.stealth, 50));
  const perception = mapObjectValues(
    { ...fallback.detail!.perception!, ...raw?.detail?.perception },
    clampStat(raw?.perception, 50),
  );

  return {
    combat: averageScore(Object.values(combat)),
    intelligence: averageScore(Object.values(intelligence)),
    charisma: averageScore(Object.values(charisma)),
    stealth: averageScore(Object.values(stealth)),
    perception: averageScore(Object.values(perception)),
    detail: { combat, intelligence, charisma, stealth, perception },
  };
}

export function normalizeCreatureStatsForEditor(raw?: Partial<CreatureStats>): CreatureStats {
  const fallback = createDefaultCreatureStats();
  const combat = mapObjectValues({ ...fallback.detail!.combat!, ...raw?.detail?.combat }, clampStat(raw?.combat, 50));
  const cognition = mapObjectValues(
    { ...fallback.detail!.cognition!, ...raw?.detail?.cognition },
    clampStat(raw?.cognition, 50),
  );
  const predation = mapObjectValues(
    { ...fallback.detail!.predation!, ...raw?.detail?.predation },
    clampStat(raw?.predation, 50),
  );
  const senses = mapObjectValues({ ...fallback.detail!.senses!, ...raw?.detail?.senses }, clampStat(raw?.senses, 50));
  const ferocity = mapObjectValues(
    { ...fallback.detail!.ferocity!, ...raw?.detail?.ferocity },
    clampStat(raw?.ferocity, 50),
  );

  return {
    combat: averageScore(Object.values(combat)),
    cognition: averageScore(Object.values(cognition)),
    predation: averageScore(Object.values(predation)),
    senses: averageScore(Object.values(senses)),
    ferocity: averageScore(Object.values(ferocity)),
    detail: { combat, cognition, predation, senses, ferocity },
  };
}

export function toCharacterPrimaryStats(stats: CharacterStats): Record<StatCategoryKey, number> {
  return {
    combat: clampStat(stats.combat),
    intelligence: clampStat(stats.intelligence),
    charisma: clampStat(stats.charisma),
    stealth: clampStat(stats.stealth),
    perception: clampStat(stats.perception),
  };
}

export function toCreaturePrimaryStats(stats: CreatureStats): Record<CreatureStatCategoryKey, number> {
  return {
    combat: clampStat(stats.combat),
    cognition: clampStat(stats.cognition),
    predation: clampStat(stats.predation),
    senses: clampStat(stats.senses),
    ferocity: clampStat(stats.ferocity),
  };
}

export function getCharacterStatDetailAxes(stats: CharacterStats, category: StatCategoryKey): Record<string, number> {
  const normalized = normalizeCharacterStatsForEditor(stats);

  if (category === "combat") {
    const detail = normalized.detail!.combat!;
    return { STR: detail.strength, DEF: detail.defense, AGI: detail.agility, END: detail.endurance, ADP: detail.adaptation };
  }

  if (category === "intelligence") {
    const detail = normalized.detail!.intelligence!;
    return { IQ: detail.iq, EQ: detail.eq, SQ: detail.sq };
  }

  if (category === "charisma") {
    const detail = normalized.detail!.charisma!;
    return { PRS: detail.persuasion, ITM: detail.intimidation, MNP: detail.manipulation };
  }

  if (category === "stealth") {
    const detail = normalized.detail!.stealth!;
    return {
      PRC: detail.presenceControl,
      SIL: detail.silence,
      ENC: detail.environmentControl,
      VIS: detail.visualMasking,
    };
  }

  const detail = normalized.detail!.perception!;
  return { ACU: detail.acuity, FOC: detail.focus, INT: detail.intuition };
}

export function getCreatureStatDetailAxes(
  stats: CreatureStats,
  category: CreatureStatCategoryKey,
): Record<string, number> {
  const normalized = normalizeCreatureStatsForEditor(stats);

  if (category === "combat") {
    const detail = normalized.detail!.combat!;
    return { STR: detail.strength, DEF: detail.defense, AGI: detail.agility, END: detail.endurance, ADP: detail.adaptation };
  }

  if (category === "cognition") {
    const detail = normalized.detail!.cognition!;
    return { PRB: detail.problemSolving, MEM: detail.memory, INS: detail.instinct };
  }

  if (category === "predation") {
    const detail = normalized.detail!.predation!;
    return { AMB: detail.ambush, CAM: detail.camouflage, QUI: detail.quietude, TRP: detail.trapping };
  }

  if (category === "senses") {
    const detail = normalized.detail!.senses!;
    return { TRK: detail.tracking, DET: detail.detection, AWR: detail.awareness };
  }

  const detail = normalized.detail!.ferocity!;
  return { ITM: detail.intimidation, DNM: detail.dominance, HOS: detail.hostility };
}
