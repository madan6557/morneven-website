type Rgb = { r: number; g: number; b: number };

function clamp(value: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function rgbToCss({ r, g, b }: Rgb) {
  return `rgb(${Math.round(clamp(r))} ${Math.round(clamp(g))} ${Math.round(clamp(b))})`;
}

function parseHex(value: string): Rgb | null {
  const text = value.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (!match) return null;

  const hex = match[1].length === 3
    ? match[1].split("").map((char) => `${char}${char}`).join("")
    : match[1];

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function parseRgb(value: string): Rgb | null {
  const match = /^rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/i.exec(value.trim());
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100;
  const light = l / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [chroma, x, 0] :
    hp < 2 ? [x, chroma, 0] :
    hp < 3 ? [0, chroma, x] :
    hp < 4 ? [0, x, chroma] :
    hp < 5 ? [x, 0, chroma] :
    [chroma, 0, x];
  const m = light - chroma / 2;

  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255,
  };
}

function parseHslTriplet(value: string): Rgb | null {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", ""));
  const l = Number(parts[2].replace("%", ""));
  if ([h, s, l].some((part) => Number.isNaN(part))) return null;
  return hslToRgb(h, s, l);
}

function parseColor(value: string): Rgb | null {
  return parseHex(value) ?? parseRgb(value);
}

function relativeLuminance({ r, g, b }: Rgb) {
  const toLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(a: Rgb, b: Rgb) {
  const light = Math.max(relativeLuminance(a), relativeLuminance(b));
  const dark = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (light + 0.05) / (dark + 0.05);
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = Math.max(0, Math.min(1, amount));
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function readThemeColor(variable: string, fallback: Rgb): Rgb {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(variable);
  return parseHslTriplet(value) ?? fallback;
}

function themeColors() {
  return {
    background: readThemeColor("--background", { r: 244, g: 246, b: 249 }),
    foreground: readThemeColor("--foreground", { r: 33, g: 38, b: 48 }),
    border: readThemeColor("--border", { r: 204, g: 210, b: 218 }),
    card: readThemeColor("--card", { r: 251, g: 252, b: 253 }),
    muted: readThemeColor("--muted", { r: 228, g: 231, b: 236 }),
  };
}

function balanceAgainstCanvas(color: Rgb, minimumContrast = 3.25) {
  const { background, foreground } = themeColors();
  let next = color;

  for (let step = 0; step <= 10; step += 1) {
    if (contrastRatio(next, background) >= minimumContrast) return next;
    next = mix(color, foreground, (step + 1) / 10);
  }

  return next;
}

function cssOrBalanced(color: string, minimumContrast?: number) {
  const parsed = parseColor(color);
  if (!parsed) return null;
  return rgbToCss(balanceAgainstCanvas(parsed, minimumContrast));
}

export function accentText(color: string, accentWeight = 65) {
  return cssOrBalanced(color, 3.25) ?? `color-mix(in srgb, ${color} ${accentWeight}%, hsl(var(--foreground)))`;
}

export function accentBorder(color: string, accentWeight = 30) {
  const parsed = parseColor(color);
  if (!parsed) return `color-mix(in srgb, ${color} ${accentWeight}%, hsl(var(--border)))`;
  const readable = balanceAgainstCanvas(parsed, 2.2);
  return rgbToCss(mix(themeColors().border, readable, accentWeight / 100));
}

export function accentSurface(color: string, accentWeight = 10) {
  const parsed = parseColor(color);
  if (!parsed) return `color-mix(in srgb, ${color} ${accentWeight}%, hsl(var(--card)))`;
  const readable = balanceAgainstCanvas(parsed, 2.2);
  return rgbToCss(mix(themeColors().card, readable, accentWeight / 100));
}

export function accentMuted(color: string, accentWeight = 18) {
  const parsed = parseColor(color);
  if (!parsed) return `color-mix(in srgb, ${color} ${accentWeight}%, hsl(var(--muted)))`;
  const readable = balanceAgainstCanvas(parsed, 2.2);
  return rgbToCss(mix(themeColors().muted, readable, accentWeight / 100));
}

export function themedHslColor(hsl: string) {
  const parsed = parseHslTriplet(hsl);
  if (!parsed) return `hsl(${hsl})`;
  return rgbToCss(balanceAgainstCanvas(parsed, 3.25));
}

export function themedHslBorder(hsl: string, amount = 0.32) {
  const parsed = parseHslTriplet(hsl);
  if (!parsed) return `hsl(${hsl} / 0.45)`;
  return rgbToCss(mix(themeColors().border, balanceAgainstCanvas(parsed, 2.2), amount));
}

export function themedHslSurface(hsl: string, amount = 0.12) {
  const parsed = parseHslTriplet(hsl);
  if (!parsed) return `hsl(${hsl} / 0.12)`;
  return rgbToCss(mix(themeColors().card, balanceAgainstCanvas(parsed, 2.2), amount));
}
