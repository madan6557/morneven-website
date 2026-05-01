import { useEffect, useState } from "react";
import {
  getCharactersPage,
  getGalleryPage,
  getNewsPage,
  getPlacesPage,
  getProjectsPage,
  getTechnologyPage,
  type PageInfo,
} from "@/services/api";
import type { CommandCenterSection, CommandCenterSettings } from "@/services/commandCenterSettings";
import { ScrollArea } from "@/components/ui/scroll-area";

const labelClass = "font-heading text-xs tracking-wider text-muted-foreground uppercase";
const OPTION_PAGE_SIZE = 25;

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

const emptyOptions = (): Record<CommandCenterSection, OptionItem[]> => ({
  projects: [],
  news: [],
  characters: [],
  places: [],
  technology: [],
  gallery: [],
});

const emptyPageInfo = (): Record<CommandCenterSection, PageInfo | null> => ({
  projects: null,
  news: null,
  characters: null,
  places: null,
  technology: null,
  gallery: null,
});

const emptyLoading = (): Record<CommandCenterSection, boolean> => ({
  projects: false,
  news: false,
  characters: false,
  places: false,
  technology: false,
  gallery: false,
});

const emptySearches = (): Record<CommandCenterSection, string> => ({
  projects: "",
  news: "",
  characters: "",
  places: "",
  technology: "",
  gallery: "",
});

export interface CommandCenterSelectionPanelProps {
  settings: CommandCenterSettings;
  onChange: (next: CommandCenterSettings) => void;
}

export default function CommandCenterSelectionPanel({ settings, onChange }: CommandCenterSelectionPanelProps) {
  const [options, setOptions] = useState<Record<CommandCenterSection, OptionItem[]>>(emptyOptions);
  const [pageInfo, setPageInfo] = useState<Record<CommandCenterSection, PageInfo | null>>(emptyPageInfo);
  const [loading, setLoading] = useState<Record<CommandCenterSection, boolean>>(emptyLoading);
  const [searches, setSearches] = useState<Record<CommandCenterSection, string>>(emptySearches);

  useEffect(() => {
    SECTIONS.forEach((section) => {
      void loadOptions(section.key, 1, "replace", "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadOptions(
    section: CommandCenterSection,
    page: number,
    mode: "replace" | "append",
    search = searches[section],
  ) {
    setLoading((current) => ({ ...current, [section]: true }));

    try {
      let nextOptions: OptionItem[] = [];
      let nextPageInfo: PageInfo | null = null;

      if (section === "projects") {
        const response = await getProjectsPage({ page, pageSize: OPTION_PAGE_SIZE, search, sort: "title" });
        nextOptions = response.items.map((p) => ({ id: p.id, label: p.title }));
        nextPageInfo = response.pageInfo;
      } else if (section === "news") {
        const response = await getNewsPage({ page, pageSize: OPTION_PAGE_SIZE, search });
        nextOptions = response.items.map((n) => ({ id: n.id, label: `${n.text} (${n.date})` }));
        nextPageInfo = response.pageInfo;
      } else if (section === "characters") {
        const response = await getCharactersPage({ page, pageSize: OPTION_PAGE_SIZE, search, sort: "name" });
        nextOptions = response.items.map((c) => ({ id: c.id, label: c.name }));
        nextPageInfo = response.pageInfo;
      } else if (section === "places") {
        const response = await getPlacesPage({ page, pageSize: OPTION_PAGE_SIZE, search, sort: "name" });
        nextOptions = response.items.map((p) => ({ id: p.id, label: p.name }));
        nextPageInfo = response.pageInfo;
      } else if (section === "technology") {
        const response = await getTechnologyPage({ page, pageSize: OPTION_PAGE_SIZE, search, sort: "name" });
        nextOptions = response.items.map((t) => ({ id: t.id, label: t.name }));
        nextPageInfo = response.pageInfo;
      } else {
        const response = await getGalleryPage({ page, pageSize: OPTION_PAGE_SIZE, search, sort: "newest" });
        nextOptions = response.items.map((g) => ({ id: g.id, label: g.title }));
        nextPageInfo = response.pageInfo;
      }

      setOptions((current) => ({
        ...current,
        [section]: mode === "append" ? [...current[section], ...nextOptions] : nextOptions,
      }));
      setPageInfo((current) => ({ ...current, [section]: nextPageInfo }));
    } finally {
      setLoading((current) => ({ ...current, [section]: false }));
    }
  }

  function updateLimit(section: CommandCenterSection, value: number) {
    onChange({
      ...settings,
      itemLimits: { ...settings.itemLimits, [section]: Math.max(0, value) },
    });
  }

  function updateSearch(section: CommandCenterSection, value: string) {
    setSearches((current) => ({ ...current, [section]: value }));
    void loadOptions(section, 1, "replace", value);
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
          const currentPageInfo = pageInfo[s.key];
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

              <input
                type="search"
                value={searches[s.key]}
                onChange={(e) => updateSearch(s.key, e.target.value)}
                placeholder={`Search ${s.label.toLowerCase()}...`}
                className="w-full px-2 py-1.5 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />

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
                  {options[s.key].length === 0 && !loading[s.key] ? (
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
                  {loading[s.key] && (
                    <p className="text-[11px] font-body text-muted-foreground italic p-2">Loading options...</p>
                  )}
                  {currentPageInfo?.hasNextPage && (
                    <button
                      type="button"
                      onClick={() => loadOptions(s.key, currentPageInfo.page + 1, "append")}
                      disabled={loading[s.key]}
                      className="w-full px-2 py-2 text-[10px] font-display tracking-wider text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                    >
                      LOAD MORE
                    </button>
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
