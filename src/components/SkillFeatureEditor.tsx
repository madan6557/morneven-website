import { useRef } from "react";
import { Plus, X, Zap } from "lucide-react";
import type { Skill, Feature } from "@/types";
import { SKILL_ATTRIBUTE_LIST, buildAttributeTag } from "@/lib/skillAttributes";
import { AttributeBadge } from "./AttributeBadge";

const inputClass = "w-full px-2 py-1.5 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "font-heading text-[10px] tracking-wider text-muted-foreground uppercase";

type Item = Skill | Feature;

interface SkillFeatureEditorProps {
  variant: "skill" | "feature";
  items: Item[];
  onChange: (next: Item[]) => void;
}

export default function SkillFeatureEditor({ variant, items, onChange }: SkillFeatureEditorProps) {
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const add = () => {
    const id = `${variant}-${Date.now()}`;
    onChange([{ id, name: "", icon: "Zap", accentColor: "", tagline: "", description: "", cost: "" }, ...items]);
  };
  const update = (idx: number, key: keyof Item, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const wrapAttr = (idx: number, attrKey: string) => {
    const item = items[idx];
    const ta = refs.current[item.id];
    const desc = item.description || "";
    if (!ta) {
      const tag = buildAttributeTag(attrKey as never);
      update(idx, "description", `${desc} ${tag}`);
      return;
    }
    const start = ta.selectionStart ?? desc.length;
    const end = ta.selectionEnd ?? desc.length;
    const selected = desc.slice(start, end).trim();
    const tag = buildAttributeTag(attrKey as never, selected || undefined);
    const next = `${desc.slice(0, start)}${tag}${desc.slice(end)}`;
    update(idx, "description", next);
    requestAnimationFrame(() => {
      const node = refs.current[item.id];
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
        <div key={item.id} className="p-3 rounded-sm border border-border bg-muted/40 space-y-2">
          <div className="flex gap-2 items-start">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
              <div className="sm:col-span-2">
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => update(idx, "name", e.target.value)}
                  placeholder={variant === "skill" ? "e.g. Phase Strike" : "e.g. Reactive Plating"}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Icon (Lucide / URL)</label>
                <input
                  type="text"
                  value={item.icon || ""}
                  onChange={(e) => update(idx, "icon", e.target.value)}
                  placeholder="Zap, Sword, Flame… atau https://..."
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Tagline (optional)</label>
                <input
                  type="text"
                  value={item.tagline || ""}
                  onChange={(e) => update(idx, "tagline", e.target.value)}
                  placeholder="Short one-liner"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cost / Cooldown</label>
                <input
                  type="text"
                  value={item.cost || ""}
                  onChange={(e) => update(idx, "cost", e.target.value)}
                  placeholder="3/day, 20 SP…"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Accent Color</label>
                <div className="flex gap-1 mt-1">
                  <input
                    type="color"
                    value={item.accentColor || "#7A2A2A"}
                    onChange={(e) => update(idx, "accentColor", e.target.value)}
                    className="h-8 w-10 bg-background border border-border rounded-sm cursor-pointer"
                  />
                  <input
                    type="text"
                    value={item.accentColor || ""}
                    onChange={(e) => update(idx, "accentColor", e.target.value)}
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

          <div>
            <label className={labelClass}>Description (use attribute buttons to wrap selection)</label>
            <div className="flex flex-wrap gap-1 mt-1 mb-1.5 p-1.5 rounded-sm border border-border/60 bg-background/40">
              {SKILL_ATTRIBUTE_LIST.map((a) => {
                const A = a.Icon;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => wrapAttr(idx, a.key)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-display tracking-wider uppercase border transition-opacity hover:opacity-80"
                    style={{
                      color: `hsl(${a.hsl})`,
                      borderColor: `hsl(${a.hsl} / 0.45)`,
                      backgroundColor: `hsl(${a.hsl} / 0.1)`,
                    }}
                    title={`Insert ${a.label} tag`}
                  >
                    <A className="h-3 w-3" /> {a.shortLabel}
                  </button>
                );
              })}
            </div>
            <textarea
              ref={(el) => {
                refs.current[item.id] = el;
              }}
              value={item.description}
              onChange={(e) => update(idx, "description", e.target.value)}
              rows={3}
              placeholder={`Describe the ${variant}. Select a number/word and click an attribute button to tag it.`}
              className={inputClass + " resize-y min-h-[80px] font-mono text-[11px]"}
            />
            {/* Live preview of currently selected attribute set */}
            <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-muted-foreground">
              {SKILL_ATTRIBUTE_LIST.filter((a) =>
                item.description?.includes(`[[attr:${a.key}`),
              ).map((a) => (
                <AttributeBadge key={a.key} attribute={a.key} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
