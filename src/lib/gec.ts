// GEC (Gemora Entropy Classification) - Mark II
// Color tokens for each tier, themed against the Morneven palette.
// Use semantic tokens / accent utilities so it stays on-brand in dark mode.

export const GEC_LORE_ID = "other-002";

export type GecTier =
  | "Amorphous"
  | "Crystalline"
  | "Metamorphic"
  | "Catalyst"
  | "Singularity"
  | "Zero-State";

// Tailwind class strings for the chip - uses existing brand tokens
// (primary maroon, secondary purple, accent orange/yellow, destructive)
// instead of hard-coded hex values, so the chip stays themed.
const GEC_CHIP_STYLES: Record<string, string> = {
  // Stable / passive - calm, mossy survey green
  amorphous:    "bg-success/10 text-success border-success/35",
  // Reactive / predatory - cold crystalline cyan
  crystalline:  "bg-info/10 text-info border-info/35",
  // Adaptive / hostile - institute purple (secondary)
  metamorphic:  "bg-secondary/10 text-secondary border-secondary/35 dark:bg-secondary/20 dark:text-secondary-foreground dark:border-secondary/50",
  // Symbiotic asset - accent yellow (catalyst / leverage)
  catalyst:     "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/35 dark:bg-accent-yellow/15 dark:text-accent-yellow dark:border-accent-yellow/40",
  // Critical / forbidden - Morneven maroon primary
  singularity:  "bg-primary/10 text-primary border-primary/35 dark:bg-primary/20 dark:text-primary dark:border-primary/50",
  // Decayed / closed file - neutral muted
  "zero-state": "bg-muted text-muted-foreground border-border",
};

const FALLBACK = "bg-card text-foreground border-border";

export function gecChipClass(classification: string): string {
  const key = classification.trim().toLowerCase();
  return GEC_CHIP_STYLES[key] ?? FALLBACK;
}

export function gecHref(): string {
  return `/lore/other/${GEC_LORE_ID}`;
}
