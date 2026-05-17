import { useMemo, useState } from "react";
import * as Lucide from "lucide-react";
import { Filter, Tag, X, Zap } from "lucide-react";
import { SKILL_FEATURE_CATEGORIES, type Feature, type Skill, type SkillFeatureCategory, type SkillRestriction } from "@/types";
import { AttributeBadge, RichDescription } from "./AttributeBadge";
import {
  SKILL_ATTRIBUTES,
  SKILL_ATTRIBUTE_LIST,
  parseDescription,
  type SkillAttribute,
} from "@/lib/skillAttributes";
import { AuthenticatedImage } from "./AuthenticatedImage";
import { cn } from "@/lib/utils";
import { accentBorder, accentMuted, accentSurface, accentText, themedHslBorder, themedHslColor, themedHslSurface } from "@/lib/themeColor";

function resolveIcon(name?: string) {
  if (!name) return Zap;
  const component = (Lucide as unknown as Record<string, unknown>)[name];
  if (typeof component === "function" || typeof component === "object") {
    return component as typeof Zap;
  }
  return Zap;
}

function isImageSource(value?: string) {
  if (!value) return false;
  return /^(https?:\/\/|\/api\/files\/|\/uploads\/|\/storage\/|data:image\/)/i.test(value);
}

function restrictionLabel(restriction?: SkillRestriction) {
  if (!restriction?.key && !restriction?.value) return "";
  const key = restriction?.key?.trim() || "Restriction";
  const value = restriction?.value?.trim() || "-";
  return `${key}: ${value}`;
}

const categoryOrder: SkillFeatureCategory[] = ["general", "passive", "active"];
const categoryLabels: Record<SkillFeatureCategory, string> = {
  general: "General",
  passive: "Passive",
  active: "Active",
};

function normalizeCategory(value?: string): SkillFeatureCategory {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "passive" || normalized === "active") return normalized;
  return "general";
}

function categoryLabel(value?: string) {
  return categoryLabels[normalizeCategory(value)];
}

interface SkillCardProps {
  item: Skill | Feature;
  accent?: string;
  variant?: "skill" | "feature";
}

export function SkillCard({ item, accent, variant = "skill" }: SkillCardProps) {
  const Icon = resolveIcon(item.icon);
  const hasImageIcon = isImageSource(item.icon);
  const hue = item.color || accent || "hsl(var(--primary))";
  const readableHue = accentText(hue);
  const softBorder = accentBorder(hue);
  const softSurface = accentSurface(hue);
  const mutedHue = accentMuted(hue);
  const [expanded, setExpanded] = useState(false);
  const skill = variant === "skill" ? (item as Skill) : null;
  const feature = variant === "feature" ? (item as Feature) : null;

  const attrSummary = useMemo(() => {
    if (!skill) return [];
    const tokens = parseDescription(skill.description || "");
    const map = new Map<SkillAttribute, string[]>();
    for (const token of tokens) {
      if (token.type !== "tag") continue;
      const values = map.get(token.attribute) ?? [];
      if (token.value) values.push(token.value);
      map.set(token.attribute, values);
    }
    return Array.from(map.entries()).map(([attribute, values]) => ({ attribute, values }));
  }, [skill]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
      className={cn(
        "group relative hud-border-sm bg-card/70 p-3 sm:p-4 flex flex-col gap-3 transition-all duration-200 hover:bg-card hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2",
        expanded && "bg-card",
      )}
      style={{
        borderColor: expanded ? readableHue : softBorder,
        boxShadow: expanded ? `0 8px 28px -14px ${readableHue}, 0 0 0 1px ${softBorder}` : "none",
        ["--tw-ring-color" as string]: readableHue,
      }}
      onMouseEnter={(event) => {
        if (expanded) return;
        event.currentTarget.style.boxShadow = `0 6px 24px -14px ${readableHue}, 0 0 0 1px ${softBorder}`;
      }}
      onMouseLeave={(event) => {
        if (expanded) return;
        event.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex gap-3 sm:gap-4 items-start">
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(to bottom, ${readableHue}, transparent)` }}
        />

        <div
          className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-sm flex items-center justify-center transition-transform group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${softSurface}, ${mutedHue})`,
            border: `1px solid ${softBorder}`,
            boxShadow: `inset 0 0 12px ${softSurface}`,
          }}
        >
          {hasImageIcon ? (
            <AuthenticatedImage
              src={item.icon as string}
              alt={variant === "skill" ? skill?.name || "skill icon" : feature?.title || "feature icon"}
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
            />
          ) : (
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: readableHue }} aria-hidden />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3
              className="font-display text-sm tracking-[0.12em] uppercase text-foreground break-words"
              style={{ color: readableHue }}
            >
              {variant === "skill" ? skill?.name || "Unnamed Skill" : feature?.title || "Unnamed Feature"}
            </h3>
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {variant === "skill" && skill ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-display tracking-wider uppercase rounded-sm border"
                  style={{
                    color: readableHue,
                    borderColor: softBorder,
                    backgroundColor: softSurface,
                  }}
                >
                  {categoryLabel(skill.category)}
                </span>
              ) : null}
              {variant === "feature" && feature ? (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-display tracking-wider uppercase rounded-sm border"
                  style={{
                    color: readableHue,
                    borderColor: softBorder,
                    backgroundColor: softSurface,
                  }}
                >
                  {categoryLabel(feature.category)}
                </span>
              ) : null}
            </div>
          </div>

          {variant === "skill" && skill ? (
            <>
              {!expanded && attrSummary.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {attrSummary.map(({ attribute }) => {
                    const config = SKILL_ATTRIBUTES[attribute];
                    const AttrIcon = config.Icon;
                    return (
                      <span
                        key={attribute}
                        className="inline-flex items-center justify-center h-4 w-4 rounded-sm border"
                        style={{
                          color: themedHslColor(config.hsl),
                          borderColor: themedHslBorder(config.hsl),
                          backgroundColor: themedHslSurface(config.hsl),
                        }}
                        title={config.label}
                      >
                        <AttrIcon className="h-2.5 w-2.5" />
                      </span>
                    );
                  })}
                </div>
              )}
              {!expanded && <RichDescription text={skill.description || ""} className="line-clamp-2" />}
            </>
          ) : null}

          {variant === "feature" && feature ? (
            <>
              {!expanded && (
                <p className="text-sm font-body text-foreground/80 text-justify line-clamp-2">
                  {feature.summary || "No summary provided."}
                </p>
              )}
              {feature.tags && feature.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-display tracking-wider uppercase rounded-sm border"
                      style={{
                        color: readableHue,
                        borderColor: softBorder,
                        backgroundColor: softSurface,
                      }}
                    >
                      <Tag className="h-2.5 w-2.5" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {expanded && (
        <div
          className="space-y-3 pl-0 sm:pl-[4.5rem] animate-in fade-in slide-in-from-top-1 duration-200"
          onClick={(event) => event.stopPropagation()}
        >
          {variant === "skill" && skill ? (
            <>
              {attrSummary.length > 0 && (
                <section className="space-y-1.5">
                  <h4 className="text-[10px] font-display tracking-[0.18em] uppercase text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Attribute Details
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {attrSummary.flatMap(({ attribute, values }) =>
                      values.length === 0
                        ? [<AttributeBadge key={attribute} attribute={attribute} size="md" />]
                        : values.map((value, index) => (
                            <AttributeBadge
                              key={`${attribute}-${index}`}
                              attribute={attribute}
                              value={value}
                              size="md"
                            />
                          )),
                    )}
                  </div>
                </section>
              )}

              <section className="space-y-1.5">
                <h4 className="text-[10px] font-display tracking-[0.18em] uppercase text-muted-foreground">
                  Skill Brief
                </h4>
                {restrictionLabel(skill.restriction) ? (
                  <p className="text-[11px] font-display tracking-wider uppercase text-muted-foreground">
                    {restrictionLabel(skill.restriction)}
                  </p>
                ) : null}
                <RichDescription text={skill.description || "-"} />
              </section>
            </>
          ) : null}

          {variant === "feature" && feature ? (
            <>
              <section className="space-y-1.5">
                <h4 className="text-[10px] font-display tracking-[0.18em] uppercase text-muted-foreground">
                  Feature Summary
                </h4>
                {restrictionLabel(feature.restriction) ? (
                  <p className="text-[11px] font-display tracking-wider uppercase text-muted-foreground">
                    {restrictionLabel(feature.restriction)}
                  </p>
                ) : null}
                <p className="text-sm font-body text-foreground/85 text-justify">
                  {feature.summary || "No summary provided."}
                </p>
              </section>
              {feature.details ? (
                <section className="space-y-1.5">
                  <h4 className="text-[10px] font-display tracking-[0.18em] uppercase text-muted-foreground">
                    Details
                  </h4>
                  <p className="text-sm font-body text-foreground/80 text-justify whitespace-pre-line">
                    {feature.details}
                  </p>
                </section>
              ) : null}
            </>
          ) : null}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(false);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-display tracking-wider uppercase border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            <X className="h-2.5 w-2.5" /> Collapse
          </button>
        </div>
      )}
    </div>
  );
}

interface SkillListProps {
  title?: string;
  items: Array<Skill | Feature> | undefined;
  accent?: string;
  variant?: "skill" | "feature";
  className?: string;
  gridClassName?: string;
}

function itemHasAttr(item: Skill, key: SkillAttribute) {
  return (item.description || "").includes(`[[attr:${key}`);
}

function compareDisplayItems(a: Skill | Feature, b: Skill | Feature, variant: "skill" | "feature") {
  const leftCategory = normalizeCategory(
    variant === "skill" ? (a as Skill).category : (a as Feature).category,
  );
  const rightCategory = normalizeCategory(
    variant === "skill" ? (b as Skill).category : (b as Feature).category,
  );
  const categoryCompare = categoryOrder.indexOf(leftCategory) - categoryOrder.indexOf(rightCategory);
  if (categoryCompare !== 0) return categoryCompare;

  if (variant === "skill") {
    return ((a as Skill).name || "").trim().toLowerCase().localeCompare(((b as Skill).name || "").trim().toLowerCase());
  }
  return ((a as Feature).title || "").trim().toLowerCase().localeCompare(((b as Feature).title || "").trim().toLowerCase());
}

export function SkillList({ title, items, accent, variant = "skill", className, gridClassName }: SkillListProps) {
  const list = useMemo(
    () => [...(items ?? [])].sort((left, right) => compareDisplayItems(left, right, variant)),
    [items, variant],
  );
  const [activeAttr, setActiveAttr] = useState<SkillAttribute | null>(null);

  const usedAttributes = useMemo(() => {
    if (variant !== "skill") return [];
    return SKILL_ATTRIBUTE_LIST.filter((attr) => list.some((item) => itemHasAttr(item as Skill, attr.key)));
  }, [list, variant]);

  const filtered = useMemo(() => {
    if (variant !== "skill" || !activeAttr) return list;
    return list.filter((item) => itemHasAttr(item as Skill, activeAttr));
  }, [activeAttr, list, variant]);

  if (list.length === 0) return null;

  const heading = title ?? (variant === "skill" ? "Skills" : "Features");
  const accentColor = accent || "hsl(var(--primary))";
  const readableAccent = accentText(accentColor);
  const softAccentBorder = accentBorder(accentColor);
  const softAccentSurface = accentSurface(accentColor);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="flex items-center justify-between gap-3 border-b pb-2"
        style={{ borderColor: softAccentBorder }}
      >
        <h2 className="font-heading text-lg tracking-wider text-foreground uppercase flex items-center gap-2">
          {heading}
          <span
            className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[10px] font-display tracking-wider rounded-sm border"
            style={{
              color: readableAccent,
              borderColor: softAccentBorder,
              backgroundColor: softAccentSurface,
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

      {usedAttributes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {usedAttributes.map((attr) => {
            const Icon = attr.Icon;
            const active = activeAttr === attr.key;
            return (
              <button
                key={attr.key}
                type="button"
                onClick={() => setActiveAttr(active ? null : attr.key)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-display tracking-wider uppercase border transition-all",
                  active ? "ring-1 ring-offset-0 scale-[1.02]" : "opacity-70 hover:opacity-100",
                )}
                style={{
                  color: themedHslColor(attr.hsl),
                  borderColor: themedHslBorder(attr.hsl, active ? 0.56 : 0.28),
                  backgroundColor: themedHslSurface(attr.hsl, active ? 0.2 : 0.08),
                }}
                title={`Filter by ${attr.label}`}
                aria-pressed={active}
              >
                <Icon className="h-2.5 w-2.5" /> {attr.shortLabel}
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
        <div className={cn("grid grid-cols-1 gap-3 xl:grid-cols-2", gridClassName)}>
          {filtered.map((item) => (
            <SkillCard key={item.id} item={item} accent={accent} variant={variant} />
          ))}
        </div>
      )}
    </div>
  );
}
