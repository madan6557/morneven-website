import { useMemo, useState } from "react";
import * as Lucide from "lucide-react";
import { Zap, Clock, Filter, X } from "lucide-react";
import type { Skill, Feature } from "@/types";
import { RichDescription } from "./AttributeBadge";
import { SKILL_ATTRIBUTE_LIST, type SkillAttribute } from "@/lib/skillAttributes";
import { AuthenticatedImage } from "./AuthenticatedImage";
import { cn } from "@/lib/utils";

function resolveIcon(name?: string) {
  if (!name) return Zap;
  const Comp = (Lucide as unknown as Record<string, unknown>)[name];
  if (typeof Comp === "function" || typeof Comp === "object") {
    return Comp as typeof Zap;
  }
  return Zap;
}

function isImageSource(value?: string) {
  if (!value) return false;
  return /^(https?:\/\/|\/api\/files\/|\/uploads\/|\/storage\/|data:image\/)/i.test(value);
}

interface SkillCardProps {
  item: Skill | Feature;
  accent?: string;
  variant?: "skill" | "feature";
}

export function SkillCard({ item, accent, variant = "skill" }: SkillCardProps) {
  const Icon = resolveIcon(item.icon);
  const hasImageIcon = isImageSource(item.icon);
  const hue = item.accentColor || accent || "hsl(var(--primary))";
  return (
    <div
      className="group relative hud-border-sm bg-card/70 p-3 sm:p-4 flex gap-3 sm:gap-4 items-start transition-all duration-200 hover:bg-card hover:-translate-y-0.5"
      style={{
        borderColor: `${hue}40`,
        boxShadow: `0 0 0 0 ${hue}00`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 6px 24px -8px ${hue}66, 0 0 0 1px ${hue}55`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 0 ${hue}00`;
      }}
    >
      {/* Accent stripe */}
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(to bottom, ${hue}, transparent)` }}
      />

      {/* Icon frame */}
      <div
        className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-sm flex items-center justify-center transition-transform group-hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${hue}26, ${hue}10)`,
          border: `1px solid ${hue}80`,
          boxShadow: `0 0 14px ${hue}40, inset 0 0 12px ${hue}20`,
        }}
      >
        {hasImageIcon ? (
          <AuthenticatedImage
            src={item.icon as string}
            alt={item.name || "feature icon"}
            className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
          />
        ) : (
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: hue }} aria-hidden />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h3
            className="font-display text-sm tracking-[0.12em] uppercase text-foreground break-words"
            style={{ color: hue }}
          >
            {item.name || (variant === "skill" ? "Unnamed Skill" : "Unnamed Feature")}
          </h3>
          {item.cost && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-display tracking-wider uppercase rounded-sm border shrink-0"
              style={{
                color: "hsl(var(--accent-foreground))",
                borderColor: "hsl(var(--accent) / 0.6)",
                backgroundColor: "hsl(var(--accent) / 0.18)",
              }}
              title="Limitation / cooldown / cost"
            >
              <Clock className="h-3 w-3" /> {item.cost}
            </span>
          )}
        </div>
        {item.tagline && (
          <p className="text-[11px] font-heading tracking-wider uppercase text-muted-foreground">
            {item.tagline}
          </p>
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

type RawSkillFeature = Partial<Skill & Feature> & {
  title?: string;
  summary?: string;
  details?: string;
  color?: string;
};

function normalizeItem(raw: RawSkillFeature, idx: number, variant: "skill" | "feature"): Skill | Feature {
  return {
    id: raw.id || `${variant}-${idx}`,
    name: raw.name || raw.title || "",
    icon: raw.icon,
    accentColor: raw.accentColor || raw.color,
    tagline: raw.tagline || raw.summary,
    description: raw.description || raw.details || raw.summary || "",
    cost: raw.cost,
  };
}

function itemHasAttr(item: Skill | Feature, key: SkillAttribute) {
  return (item.description || "").includes(`[[attr:${key}`);
}

export function SkillList({ title, items, accent, variant = "skill" }: SkillListProps) {
  const list = useMemo(
    () => (items ?? []).map((item, idx) => normalizeItem(item as RawSkillFeature, idx, variant)),
    [items, variant],
  );
  const [activeAttr, setActiveAttr] = useState<SkillAttribute | null>(null);

  // Only surface the attributes actually used in this list
  const usedAttributes = useMemo(
    () => SKILL_ATTRIBUTE_LIST.filter((a) => list.some((it) => itemHasAttr(it, a.key))),
    [list],
  );

  const filtered = useMemo(
    () => (activeAttr ? list.filter((it) => itemHasAttr(it, activeAttr)) : list),
    [list, activeAttr],
  );

  if (list.length === 0) return null;

  const heading = title ?? (variant === "skill" ? "Skills" : "Features");
  const accentColor = accent || "hsl(var(--primary))";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b pb-2" style={{ borderColor: `${accentColor}30` }}>
        <h2 className="font-heading text-lg tracking-wider text-foreground uppercase flex items-center gap-2">
          {heading}
          <span
            className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[10px] font-display tracking-wider rounded-sm border"
            style={{
              color: accentColor,
              borderColor: `${accentColor}66`,
              backgroundColor: `${accentColor}1A`,
            }}
            aria-label={`${list.length} ${variant === "skill" ? "skills" : "features"}`}
          >
            {list.length}
          </span>
        </h2>
        {usedAttributes.length > 1 && (
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-display tracking-wider uppercase text-muted-foreground">
            <Filter className="h-3 w-3" />
            <span>Filter</span>
          </div>
        )}
      </div>

      {/* Attribute filter chips — only when multiple attribute types are present */}
      {usedAttributes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {usedAttributes.map((a) => {
            const A = a.Icon;
            const active = activeAttr === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setActiveAttr(active ? null : a.key)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-display tracking-wider uppercase border transition-all",
                  active ? "ring-1 ring-offset-0 scale-[1.02]" : "opacity-70 hover:opacity-100",
                )}
                style={{
                  color: `hsl(${a.hsl})`,
                  borderColor: `hsl(${a.hsl} / ${active ? 0.9 : 0.4})`,
                  backgroundColor: `hsl(${a.hsl} / ${active ? 0.22 : 0.08})`,
                }}
                title={`Filter by ${a.label}`}
                aria-pressed={active}
              >
                <A className="h-2.5 w-2.5" /> {a.shortLabel}
              </button>
            );
          })}
          {activeAttr && (
            <button
              type="button"
              onClick={() => setActiveAttr(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-display tracking-wider uppercase border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <X className="h-2.5 w-2.5" /> Clear
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-[11px] font-body text-muted-foreground italic px-1">
          No {variant === "skill" ? "skills" : "features"} match this filter.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((s) => (
            <SkillCard key={s.id} item={s} accent={accent} variant={variant} />
          ))}
        </div>
      )}
    </div>
  );
}
