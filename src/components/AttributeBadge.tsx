import { SKILL_ATTRIBUTES, parseDescription, type SkillAttribute } from "@/lib/skillAttributes";
import { themedHslBorder, themedHslColor, themedHslSurface } from "@/lib/themeColor";
import { cn } from "@/lib/utils";

interface AttributeBadgeProps {
  attribute: SkillAttribute;
  value?: string;
  size?: "sm" | "md";
}

export function AttributeBadge({ attribute, value, size = "sm" }: AttributeBadgeProps) {
  const cfg = SKILL_ATTRIBUTES[attribute];
  if (!cfg) return null;
  const Icon = cfg.Icon;
  const px = size === "md" ? "px-2 py-0.5" : "px-1.5 py-0.5";
  const text = size === "md" ? "text-xs" : "text-[10px]";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm font-display tracking-wider uppercase border align-middle mx-0.5",
        px,
        text,
      )}
      style={{
        color: cfg.textColor ?? themedHslColor(cfg.hsl),
        backgroundColor: cfg.backgroundColor ?? themedHslSurface(cfg.hsl),
        borderColor: cfg.borderColor ?? themedHslBorder(cfg.hsl),
        textShadow: cfg.textShadow ?? "none",
      }}
      title={cfg.label}
    >
      <Icon className={iconSize} aria-hidden />
      <span>{cfg.shortLabel}</span>
      {value && <span className="font-body normal-case tracking-normal opacity-90">{value}</span>}
    </span>
  );
}

interface RichDescriptionProps {
  text: string;
  className?: string;
}

/** Renders text with [[attr:...]] tags converted to inline AttributeBadges. */
export function RichDescription({ text, className }: RichDescriptionProps) {
  const tokens = parseDescription(text || "");
  return (
    <p className={cn("text-sm font-body text-foreground/85 leading-relaxed", className)}>
      {tokens.map((tok, i) =>
        tok.type === "text" ? (
          <span key={i}>{tok.text}</span>
        ) : (
          <AttributeBadge key={i} attribute={tok.attribute} value={tok.value} />
        )
      )}
    </p>
  );
}
