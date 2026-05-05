import { Sword, Sparkles, Brain, Shield, ShieldHalf, ShieldCheck } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

// All supported skill/feature attribute tags. Damage attributes use a primary
// element icon; defence variants always use a shield (per spec) but inherit
// the same hue as their attacking counterpart so they stay visually linked.
export type SkillAttribute =
  | "physical-damage"
  | "magic-damage"
  | "mental-effect"
  | "physical-defense"
  | "magic-defense"
  | "mental-defense";

export interface SkillAttributeConfig {
  key: SkillAttribute;
  label: string;
  shortLabel: string;
  // HSL token from the design system (used for badge bg + glow).
  hsl: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const SKILL_ATTRIBUTES: Record<SkillAttribute, SkillAttributeConfig> = {
  "physical-damage": {
    key: "physical-damage",
    label: "Physical Damage",
    shortLabel: "PHYS DMG",
    hsl: "0 78% 58%",
    Icon: Sword,
  },
  "magic-damage": {
    key: "magic-damage",
    label: "Magic Damage",
    shortLabel: "MAG DMG",
    hsl: "276 60% 62%",
    Icon: Sparkles,
  },
  "mental-effect": {
    key: "mental-effect",
    label: "Mental Effect",
    shortLabel: "MENTAL",
    hsl: "190 80% 55%",
    Icon: Brain,
  },
  "physical-defense": {
    key: "physical-defense",
    label: "Physical Defense",
    shortLabel: "PHYS DEF",
    hsl: "0 78% 58%",
    Icon: Shield,
  },
  "magic-defense": {
    key: "magic-defense",
    label: "Magic Defense",
    shortLabel: "MAG DEF",
    hsl: "276 60% 62%",
    Icon: ShieldHalf,
  },
  "mental-defense": {
    key: "mental-defense",
    label: "Mental Defense",
    shortLabel: "MENTAL DEF",
    hsl: "190 80% 55%",
    Icon: ShieldCheck,
  },
};

export const SKILL_ATTRIBUTE_LIST: SkillAttributeConfig[] = Object.values(SKILL_ATTRIBUTES);

// Inline tag format we author into descriptions:
//   [[attr:physical-damage|5%]]
// or self-labelling:
//   [[attr:physical-damage]]
// Renderer turns each tag into an inline AttributeBadge.
const TAG_RE = /\[\[attr:([a-z-]+)(?:\|([^\]]+))?\]\]/g;

export interface AttributeTagToken {
  type: "tag";
  attribute: SkillAttribute;
  value?: string;
}
export interface TextToken {
  type: "text";
  text: string;
}
export type DescriptionToken = TextToken | AttributeTagToken;

export function parseDescription(input: string): DescriptionToken[] {
  if (!input) return [];
  const tokens: DescriptionToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(input)) !== null) {
    if (m.index > last) tokens.push({ type: "text", text: input.slice(last, m.index) });
    const attr = m[1] as SkillAttribute;
    if (SKILL_ATTRIBUTES[attr]) {
      tokens.push({ type: "tag", attribute: attr, value: m[2]?.trim() });
    } else {
      tokens.push({ type: "text", text: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < input.length) tokens.push({ type: "text", text: input.slice(last) });
  return tokens;
}

export function buildAttributeTag(attribute: SkillAttribute, value?: string): string {
  const v = value?.trim();
  return v ? `[[attr:${attribute}|${v}]]` : `[[attr:${attribute}]]`;
}
