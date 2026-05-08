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
  amorphous:    "bg-emerald-500/10 text-emerald-700 border-emerald-600/35 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40",
  // Reactive / predatory - cold crystalline cyan
  crystalline:  "bg-sky-500/10 text-sky-700 border-sky-600/35 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/40",
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
