import { useRef } from "react";
import { Plus, X, Zap } from "lucide-react";
import type { Feature, Skill } from "@/types";
import { SKILL_ATTRIBUTE_LIST, buildAttributeTag } from "@/lib/skillAttributes";
import { AttributeBadge } from "./AttributeBadge";

const inputClass =
  "w-full px-2 py-1.5 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "font-heading text-[10px] tracking-wider text-muted-foreground uppercase";

interface SkillFeatureEditorProps {
  variant: "skill" | "feature";
  items: Array<Skill | Feature>;
  onChange: (next: Array<Skill | Feature>) => void;
}

export default function SkillFeatureEditor({ variant, items, onChange }: SkillFeatureEditorProps) {
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const add = () => {
    if (variant === "skill") {
      const next: Skill = {
        id: `skill-${Date.now()}`,
        name: "",
        category: "general",
        level: 50,
        description: "",
        icon: "Zap",
      };
      onChange([next, ...items]);
      return;
    }

    const next: Feature = {
      id: `feature-${Date.now()}`,
      title: "",
      summary: "",
      details: "",
      icon: "Zap",
      tags: [],
    };
    onChange([next, ...items]);
  };

  const updateSkill = (idx: number, key: keyof Skill, value: string | number) => {
    const next = [...items] as Skill[];
    next[idx] = { ...next[idx], [key]: value } as Skill;
    onChange(next);
  };

  const updateFeature = (idx: number, key: keyof Feature, value: string | string[] | undefined) => {
    const next = [...items] as Feature[];
    next[idx] = { ...next[idx], [key]: value } as Feature;
    onChange(next);
  };

  const remove = (idx: number) => onChange(items.filter((_, index) => index !== idx));

  const wrapAttr = (idx: number, attrKey: string) => {
    if (variant !== "skill") return;
    const skill = items[idx] as Skill;
    const ta = refs.current[skill.id];
    const desc = skill.description || "";
    if (!ta) {
      updateSkill(idx, "description", `${desc} ${buildAttributeTag(attrKey as never)}`.trim());
      return;
    }
    const start = ta.selectionStart ?? desc.length;
    const end = ta.selectionEnd ?? desc.length;
    const selected = desc.slice(start, end).trim();
    const tag = buildAttributeTag(attrKey as never, selected || undefined);
    const next = `${desc.slice(0, start)}${tag}${desc.slice(end)}`;
    updateSkill(idx, "description", next);
    requestAnimationFrame(() => {
      const node = refs.current[skill.id];
      if (!node) return;
      node.focus();
      const pos = start + tag.length;
      node.setSelectionRange(pos, pos);
    });
  };

  const heading = variant === "skill" ? "Skills" : "Features";
  const addLabel = variant === "skill" ? "ADD SKILL" : "ADD FEATURE";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-primary" /> {heading}
        </label>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Plus className="h-3 w-3" /> {addLabel}
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-[11px] font-body text-muted-foreground italic">
          No {variant === "skill" ? "skills" : "features"} yet. Click {addLabel} to create one.
        </p>
      )}

      {items.map((item, idx) => (
        <div key={item.id} className="p-3 rounded-sm border border-border bg-muted/40 space-y-3">
          <div className="flex gap-2 items-start">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
              {variant === "skill" ? (
                <>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Name</label>
                    <input
                      type="text"
                      value={(item as Skill).name}
                      onChange={(e) => updateSkill(idx, "name", e.target.value)}
                      placeholder="e.g. Phase Strike"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Category</label>
                    <input
                      type="text"
                      value={(item as Skill).category}
                      onChange={(e) => updateSkill(idx, "category", e.target.value)}
                      placeholder="combat, support, utility"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Level ({(item as Skill).level})</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(item as Skill).level}
                      onChange={(e) => updateSkill(idx, "level", Number(e.target.value))}
                      className="w-full mt-1 accent-primary"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Title</label>
                    <input
                      type="text"
                      value={(item as Feature).title}
                      onChange={(e) => updateFeature(idx, "title", e.target.value)}
                      placeholder="e.g. Resonance Plating"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tags</label>
                    <input
                      type="text"
                      value={((item as Feature).tags ?? []).join(", ")}
                      onChange={(e) =>
                        updateFeature(
                          idx,
                          "tags",
                          e.target.value
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder="defense, mobility"
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className={labelClass}>{variant === "skill" ? "Icon (Lucide or URL)" : "Icon (optional)"}</label>
                <input
                  type="text"
                  value={item.icon || ""}
                  onChange={(e) =>
                    variant === "skill"
                      ? updateSkill(idx, "icon", e.target.value)
                      : updateFeature(idx, "icon", e.target.value)
                  }
                  placeholder="Zap or https://..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Color</label>
                <div className="flex gap-1 mt-1">
                  <input
                    type="color"
                    value={item.color || "#7A2A2A"}
                    onChange={(e) =>
                      variant === "skill"
                        ? updateSkill(idx, "color", e.target.value)
                        : updateFeature(idx, "color", e.target.value)
                    }
                    className="h-8 w-10 bg-background border border-border rounded-sm cursor-pointer"
                  />
                  <input
                    type="text"
                    value={item.color || ""}
                    onChange={(e) =>
                      variant === "skill"
                        ? updateSkill(idx, "color", e.target.value)
                        : updateFeature(idx, "color", e.target.value)
                    }
                    placeholder="#7A2A2A"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-muted-foreground hover:text-destructive mt-5"
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {variant === "skill" ? (
            <div className="space-y-2">
              <label className={labelClass}>Description</label>
              <div className="flex flex-wrap gap-1 p-1.5 rounded-sm border border-border/60 bg-background/40">
                {SKILL_ATTRIBUTE_LIST.map((attr) => {
                  const Icon = attr.Icon;
                  return (
                    <button
                      key={attr.key}
                      type="button"
                      onClick={() => wrapAttr(idx, attr.key)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-display tracking-wider uppercase border transition-opacity hover:opacity-80"
                      style={{
                        color: `hsl(${attr.hsl})`,
                        borderColor: `hsl(${attr.hsl} / 0.45)`,
                        backgroundColor: `hsl(${attr.hsl} / 0.1)`,
                      }}
                      title={`Insert ${attr.label} tag`}
                    >
                      <Icon className="h-3 w-3" /> {attr.shortLabel}
                    </button>
                  );
                })}
              </div>
              <textarea
                ref={(el) => {
                  refs.current[item.id] = el;
                }}
                value={(item as Skill).description}
                onChange={(e) => updateSkill(idx, "description", e.target.value)}
                rows={3}
                placeholder="Describe the skill."
                className={inputClass + " resize-y min-h-[90px] font-mono text-[11px]"}
              />
              <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                {SKILL_ATTRIBUTE_LIST.filter((attr) =>
                  (item as Skill).description?.includes(`[[attr:${attr.key}`),
                ).map((attr) => (
                  <AttributeBadge key={attr.key} attribute={attr.key} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={labelClass}>Summary</label>
                <textarea
                  value={(item as Feature).summary}
                  onChange={(e) => updateFeature(idx, "summary", e.target.value)}
                  rows={3}
                  placeholder="Short summary shown on the card."
                  className={inputClass + " resize-y min-h-[90px]"}
                />
              </div>
              <div>
                <label className={labelClass}>Details</label>
                <textarea
                  value={(item as Feature).details || ""}
                  onChange={(e) => updateFeature(idx, "details", e.target.value)}
                  rows={3}
                  placeholder="Expanded details."
                  className={inputClass + " resize-y min-h-[90px]"}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
