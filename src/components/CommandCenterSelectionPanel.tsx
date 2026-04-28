import { useEffect, useState } from "react";
import {
  getProjects,
  getNews,
  getCharacters,
  getPlaces,
  getTechnology,
  getGallery,
} from "@/services/api";
import type { CommandCenterSection, CommandCenterSettings } from "@/services/commandCenterSettings";
import { ScrollArea } from "@/components/ui/scroll-area";

const labelClass = "font-heading text-xs tracking-wider text-muted-foreground uppercase";

interface OptionItem {
  id: string;
  label: string;
}

interface SectionConfig {
  key: CommandCenterSection;
  label: string;
}

const SECTIONS: SectionConfig[] = [
  { key: "projects", label: "Projects" },
  { key: "news", label: "News" },
  { key: "characters", label: "Characters" },
  { key: "places", label: "Places" },
  { key: "technology", label: "Technology" },
  { key: "gallery", label: "Gallery" },
];

export interface CommandCenterSelectionPanelProps {
  settings: CommandCenterSettings;
  onChange: (next: CommandCenterSettings) => void;
}

export default function CommandCenterSelectionPanel({ settings, onChange }: CommandCenterSelectionPanelProps) {
  const [options, setOptions] = useState<Record<CommandCenterSection, OptionItem[]>>({
    projects: [],
    news: [],
    characters: [],
    places: [],
    technology: [],
    gallery: [],
  });

  useEffect(() => {
    void (async () => {
      const [projects, news, characters, places, tech, gallery] = await Promise.all([
        getProjects(),
        getNews(),
        getCharacters(),
        getPlaces(),
        getTechnology(),
        getGallery(),
      ]);
      setOptions({
        projects: projects.map((p) => ({ id: p.id, label: p.title })),
        news: news.map((n) => ({ id: n.id, label: `${n.text} (${n.date})` })),
        characters: characters.map((c) => ({ id: c.id, label: c.name })),
        places: places.map((p) => ({ id: p.id, label: p.name })),
        technology: tech.map((t) => ({ id: t.id, label: t.name })),
        gallery: gallery.map((g) => ({ id: g.id, label: g.title })),
      });
    })();
  }, []);

  function updateLimit(section: CommandCenterSection, value: number) {
    onChange({
      ...settings,
      itemLimits: { ...settings.itemLimits, [section]: Math.max(0, value) },
    });
  }

  function toggleManual(section: CommandCenterSection, id: string) {
    const current = settings.manualSelections[section] ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange({
      ...settings,
      manualSelections: { ...settings.manualSelections, [section]: next },
    });
  }

  function clearManual(section: CommandCenterSection) {
    onChange({
      ...settings,
      manualSelections: { ...settings.manualSelections, [section]: [] },
    });
  }

  return (
    <div className="space-y-4">
      <p className={labelClass}>Per-Section Limits and Selection</p>
      <p className="text-[11px] font-body text-muted-foreground italic">
        Set how many items each section shows. Manually pick items to override the limit and order. Leave selection empty for automatic ordering.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const manual = settings.manualSelections[s.key] ?? [];
          const limit = settings.itemLimits[s.key] ?? 0;
          return (
            <div key={s.key} className="hud-border-sm bg-background/50 p-3 space-y-3 overflow-hidden">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="font-heading text-xs tracking-wider text-foreground uppercase break-words">{s.label}</h4>
                <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                  <label className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Limit</label>
                  <input
                    type="number"
                    min={0}
                    value={limit}
                    onChange={(e) => updateLimit(s.key, Number(e.target.value))}
                    className="w-16 max-w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-display tracking-wider text-muted-foreground uppercase">
                <span>{manual.length > 0 ? `Manual: ${manual.length} selected` : "Auto"}</span>
                {manual.length > 0 && (
                  <button
                    onClick={() => clearManual(s.key)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <ScrollArea className="h-40 border border-border rounded-sm bg-background">
                <div className="divide-y divide-border">
                  {options[s.key].length === 0 ? (
                    <p className="text-[11px] font-body text-muted-foreground italic p-2">No items.</p>
                  ) : (
                    options[s.key].map((opt) => {
                      const checked = manual.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleManual(s.key, opt.id)}
                            className="h-3.5 w-3.5 accent-primary flex-shrink-0"
                          />
                          <span className="text-[11px] font-body text-foreground truncate">{opt.label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
