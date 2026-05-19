import { useMemo, useRef, useState } from "react";
import * as Lucide from "lucide-react";
import { Image, Plus, Search, Upload, X, Zap } from "lucide-react";
import { SKILL_FEATURE_CATEGORIES, type Feature, type Skill, type SkillFeatureCategory } from "@/types";
import { SKILL_ATTRIBUTE_LIST, buildAttributeTag } from "@/lib/skillAttributes";
import { themedHslBorder, themedHslColor, themedHslSurface } from "@/lib/themeColor";
import { apiUpload } from "@/services/restClient";
import { AttributeBadge } from "./AttributeBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const inputClass =
  "w-full px-2 py-1.5 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "font-heading text-[10px] tracking-wider text-muted-foreground uppercase";
const categoryOptions: Array<{ value: SkillFeatureCategory; label: string }> = [
  { value: "general", label: "General" },
  { value: "passive", label: "Passive" },
  { value: "active", label: "Active" },
];

interface SkillFeatureEditorProps {
  variant: "skill" | "feature";
  items: Array<Skill | Feature>;
  onChange: (next: Array<Skill | Feature>) => void;
}

export default function SkillFeatureEditor({ variant, items, onChange }: SkillFeatureEditorProps) {
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const [iconPickerTarget, setIconPickerTarget] = useState<{ id: string; idx: number } | null>(null);
  const [iconQuery, setIconQuery] = useState("");

  const lucideNames = useMemo(
    () =>
      Object.keys(Lucide)
        .filter((key) => /^[A-Z]/.test(key) && !key.endsWith("Icon"))
        .filter((key) => {
          const exported = (Lucide as unknown as Record<string, unknown>)[key];
          return typeof exported === "function" || typeof exported === "object";
        })
        .sort((a, b) => a.localeCompare(b)),
    [],
  );

  const filteredLucideNames = useMemo(() => {
    const query = iconQuery.trim().toLowerCase();
    if (!query) return lucideNames.slice(0, 180);
    return lucideNames.filter((name) => name.toLowerCase().includes(query)).slice(0, 180);
  }, [iconQuery, lucideNames]);

  const add = () => {
    if (variant === "skill") {
      const next: Skill = {
        id: `skill-${Date.now()}`,
        name: "",
        category: "general",
        restriction: { key: "Cooldown", value: "" },
        description: "",
        icon: "Zap",
      };
      onChange([next, ...items]);
      return;
    }

    const next: Feature = {
      id: `feature-${Date.now()}`,
      title: "",
      category: "general",
      summary: "",
      details: "",
      restriction: { key: "Condition", value: "" },
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

  const updateSkillRestriction = (idx: number, field: "key" | "value", value: string) => {
    const next = [...items] as Skill[];
    const current = next[idx] as Skill;
    next[idx] = {
      ...current,
      restriction: {
        key: current.restriction?.key ?? "",
        value: current.restriction?.value ?? "",
        [field]: value,
      },
    };
    onChange(next);
  };

  const updateFeature = (idx: number, key: keyof Feature, value: string | string[] | undefined) => {
    const next = [...items] as Feature[];
    next[idx] = { ...next[idx], [key]: value } as Feature;
    onChange(next);
  };

  const updateFeatureRestriction = (idx: number, field: "key" | "value", value: string) => {
    const next = [...items] as Feature[];
    const current = next[idx] as Feature;
    next[idx] = {
      ...current,
      restriction: {
        key: current.restriction?.key ?? "",
        value: current.restriction?.value ?? "",
        [field]: value,
      },
    };
    onChange(next);
  };

  const remove = (idx: number) => onChange(items.filter((_, index) => index !== idx));

  const wrapAttr = (idx: number, attrKey: string) => {
    if (variant !== "skill") return;
    const skill = items[idx] as Skill;
    const ta = refs.current[skill.id];
    const desc = skill.description || "";
    if (!ta) {
      updateSkill(idx, "description", `${desc}${desc && !/\s$/.test(desc) ? " " : ""}${buildAttributeTag(attrKey as never)}`);
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

  const uploadSkillIcon = async (skillId: string, idx: number, file?: File | null) => {
    if (!file) return;
    setUploadingId(skillId);
    setUploadProgress((current) => ({ ...current, [skillId]: 0 }));
    setUploadError((current) => ({ ...current, [skillId]: "" }));
    try {
      const uploaded = await apiUpload<{ url?: string }>("/files/upload?folder=lore", file, {
        onProgress: ({ percent }) => {
          if (typeof percent === "number") {
            setUploadProgress((current) => ({ ...current, [skillId]: percent }));
          }
        },
      });
      if (!uploaded.url) throw new Error("Upload response did not include a file URL");
      if (variant === "skill") {
        updateSkill(idx, "icon", uploaded.url);
      } else {
        updateFeature(idx, "icon", uploaded.url);
      }
    } catch (error) {
      setUploadError((current) => ({
        ...current,
        [skillId]: error instanceof Error ? error.message : "Upload failed",
      }));
    } finally {
      setUploadingId(null);
      setUploadProgress((current) => {
        const next = { ...current };
        delete next[skillId];
        return next;
      });
      if (fileRefs.current[skillId]) fileRefs.current[skillId]!.value = "";
    }
  };

  const applyLucideIcon = (idx: number, iconName: string) => {
    if (variant === "skill") {
      updateSkill(idx, "icon", iconName);
    } else {
      updateFeature(idx, "icon", iconName);
    }
    setIconPickerTarget(null);
    setIconQuery("");
  };

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
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-[10px] font-display tracking-wider text-muted-foreground uppercase">
              {variant === "skill" ? "Skill" : "Feature"} item {idx + 1}
            </p>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              aria-label="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
              {variant === "skill" ? (
                <>
                  <div className="lg:col-span-2">
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
                    <select
                      value={((item as Skill).category || "general").toLowerCase()}
                      onChange={(e) => updateSkill(idx, "category", e.target.value)}
                      className={inputClass}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Restriction Key</label>
                    <input
                      type="text"
                      value={(item as Skill).restriction?.key ?? ""}
                      onChange={(e) => updateSkillRestriction(idx, "key", e.target.value)}
                      placeholder="e.g. Cooldown, Usage, Condition"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Restriction Value</label>
                    <input
                      type="text"
                      value={(item as Skill).restriction?.value || ""}
                      onChange={(e) => updateSkillRestriction(idx, "value", e.target.value)}
                      placeholder="e.g. 30s, 3/day, Light is present"
                      className={inputClass}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="lg:col-span-2">
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
                    <label className={labelClass}>Category</label>
                    <select
                      value={(((item as Feature).category || "general") as string).toLowerCase()}
                      onChange={(e) => updateFeature(idx, "category", e.target.value)}
                      className={inputClass}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
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
                  <div>
                    <label className={labelClass}>Restriction Key</label>
                    <input
                      type="text"
                      value={(item as Feature).restriction?.key ?? ""}
                      onChange={(e) => updateFeatureRestriction(idx, "key", e.target.value)}
                      placeholder="e.g. Condition, Usage, Cooldown"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Restriction Value</label>
                    <input
                      type="text"
                      value={(item as Feature).restriction?.value || ""}
                      onChange={(e) => updateFeatureRestriction(idx, "value", e.target.value)}
                      placeholder="e.g. Light is present, 3/day, 30s"
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              <div className="lg:col-span-2">
                <label className={labelClass}>{variant === "skill" ? "Icon (Lucide, URL, or upload)" : "Icon (optional)"}</label>
                <div className="space-y-2">
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
                  <div className="space-y-2">
                    <input
                      ref={(el) => {
                        fileRefs.current[item.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadSkillIcon(item.id, idx, e.target.files?.[0])}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIconPickerTarget({ id: item.id, idx });
                          setIconQuery("");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-[10px] font-display tracking-wider text-foreground hover:bg-muted transition-colors"
                      >
                        <Search className="h-3.5 w-3.5" />
                        {item.icon && !/^https?:\/\//i.test(item.icon) ? "ICON READY" : "PICK LUCIDE"}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileRefs.current[item.id]?.click()}
                        disabled={uploadingId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-primary/40 px-3 py-2 text-[10px] font-display tracking-wider text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingId === item.id ? `UPLOADING ${uploadProgress[item.id] ?? 0}%` : "UPLOAD ICON"}
                      </button>
                      {item.icon ? (
                        <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted px-2 py-1 text-[10px] font-display uppercase tracking-wider text-foreground">
                          <Image className="h-3 w-3" /> icon ready
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] font-body text-muted-foreground">
                      Icon requirement: 1:1 ratio. Recommended resolution 512x512 or higher.
                    </p>
                    {uploadProgress[item.id] !== undefined ? (
                      <div className="h-1.5 overflow-hidden rounded-full border border-primary/30 bg-background">
                        <div
                          className="h-full bg-primary transition-all duration-200"
                          style={{ width: `${uploadProgress[item.id]}%` }}
                        />
                      </div>
                    ) : null}
                    {uploadError[item.id] ? (
                      <p className="text-[10px] font-body text-destructive">{uploadError[item.id]}</p>
                    ) : null}
                  </div>
                </div>
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
                        color: themedHslColor(attr.hsl),
                        borderColor: themedHslBorder(attr.hsl),
                        backgroundColor: themedHslSurface(attr.hsl),
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
            <div className="grid gap-3 lg:grid-cols-2">
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

      <Dialog
        open={Boolean(iconPickerTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setIconPickerTarget(null);
            setIconQuery("");
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">LUCIDE ICON LIBRARY</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className={labelClass}>Search Icon</label>
              <input
                value={iconQuery}
                onChange={(e) => setIconQuery(e.target.value)}
                placeholder="Search Lucide icon name..."
                className={inputClass}
              />
              <p className="text-[10px] font-body text-muted-foreground">
                Use these as placeholder icons until the final uploaded icon is available.
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded-sm border border-border bg-background/40 p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {filteredLucideNames.map((name) => {
                  const Icon = (Lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] || Zap;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => iconPickerTarget && applyLucideIcon(iconPickerTarget.idx, name)}
                      className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-left text-xs font-body text-foreground hover:border-primary hover:bg-primary/10 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="truncate">{name}</span>
                    </button>
                  );
                })}
              </div>
              {filteredLucideNames.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No Lucide icon matched this search.</p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
