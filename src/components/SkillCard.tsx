import * as Lucide from "lucide-react";
import { Zap, Clock } from "lucide-react";
import type { Skill, Feature } from "@/types";
import { RichDescription } from "./AttributeBadge";
import { SKILL_ATTRIBUTE_LIST } from "@/lib/skillAttributes";

type LucideIconName = keyof typeof Lucide;

function resolveIcon(name?: string) {
  if (!name) return Zap;
  const Comp = (Lucide as unknown as Record<string, unknown>)[name];
  if (typeof Comp === "function" || typeof Comp === "object") {
    return Comp as typeof Zap;
  }
  return Zap;
}

interface SkillCardProps {
  item: Skill | Feature;
  accent?: string;
  variant?: "skill" | "feature";
}

export function SkillCard({ item, accent, variant = "skill" }: SkillCardProps) {
  const Icon = resolveIcon(item.icon);
  const hue = item.accentColor || accent || "hsl(var(--primary))";
  return (
    <div
      className="hud-border-sm bg-card/70 p-4 flex gap-4 items-start transition-colors hover:bg-card"
      style={{ borderColor: `${hue}40` }}
    >
      {/* Icon frame */}
      <div
        className="relative shrink-0 w-14 h-14 rounded-sm flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${hue}26, ${hue}10)`,
          border: `1px solid ${hue}80`,
          boxShadow: `0 0 14px ${hue}40, inset 0 0 12px ${hue}20`,
        }}
      >
        <Icon className="h-7 w-7" style={{ color: hue }} aria-hidden />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h3 className="font-display text-sm tracking-[0.12em] uppercase text-foreground" style={{ color: hue }}>
            {item.name || (variant === "skill" ? "Unnamed Skill" : "Unnamed Feature")}
          </h3>
          {item.cost && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-display tracking-wider uppercase rounded-sm border"
              style={{ color: "hsl(var(--accent-foreground))", borderColor: "hsl(var(--accent) / 0.6)", backgroundColor: "hsl(var(--accent) / 0.18)" }}
              title="Limitation / cooldown / cost"
            >
              <Clock className="h-3 w-3" /> {item.cost}
            </span>
          )}
        </div>
        {item.tagline && (
          <p className="text-[11px] font-heading tracking-wider uppercase text-muted-foreground">{item.tagline}</p>
        )}
        <RichDescription text={item.description || ""} />
      </div>
    </div>
  );
}

interface SkillListProps {
  title?: string;
  items: (Skill | Feature)[] | undefined;
  accent?: string;
  variant?: "skill" | "feature";
}

export function SkillList({ title, items, accent, variant = "skill" }: SkillListProps) {
  const list = items ?? [];
  const heading = title ?? (variant === "skill" ? "Skills" : "Features");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg tracking-wider text-foreground uppercase border-b pb-2 flex-1" style={{ borderColor: `${accent || "hsl(var(--primary))"}30` }}>
          {heading}
        </h2>
      </div>
      {list.length === 0 ? (
        <div className="hud-border-sm bg-card/40 p-4 text-center text-xs font-body text-muted-foreground">
          No {variant === "skill" ? "skills" : "features"} catalogued.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((s) => (
            <SkillCard key={s.id} item={s} accent={accent} variant={variant} />
          ))}
        </div>
      )}
      {/* Attribute legend */}
      {list.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SKILL_ATTRIBUTE_LIST.map((a) => {
            const A = a.Icon;
            return (
              <span
                key={a.key}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-display tracking-wider uppercase border"
                style={{
                  color: `hsl(${a.hsl})`,
                  borderColor: `hsl(${a.hsl} / 0.4)`,
                  backgroundColor: `hsl(${a.hsl} / 0.08)`,
                }}
                title={a.label}
              >
                <A className="h-2.5 w-2.5" /> {a.shortLabel}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
