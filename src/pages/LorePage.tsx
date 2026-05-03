import { useDeferredValue, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getCharactersPage,
  getCreaturesPage,
  getEventsPage,
  getOthersPage,
  getPlacesPage,
  getTechnologyPage,
  type PageInfo,
  type PaginatedResponse,
} from "@/services/api";
import type { Character, Creature, OtherLore, Place, Technology, LoreEvent } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUpDown, CalendarClock, Plus, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { gecChipClass, GEC_LORE_ID } from "@/lib/gec";

const tabs = ["Characters", "Places", "Technology", "Creatures", "Events", "Other", "Personnel"] as const;
type LoreTab = Exclude<typeof tabs[number], "Personnel">;
type SortOption = "name" | "name-desc";

type LoreListState<T> = {
  items: T[];
  pageInfo: PageInfo | null;
  loading: boolean;
  queryKey: string;
};

type LoreLists = {
  Characters: LoreListState<Character>;
  Places: LoreListState<Place>;
  Technology: LoreListState<Technology>;
  Creatures: LoreListState<Creature>;
  Events: LoreListState<LoreEvent>;
  Other: LoreListState<OtherLore>;
};

type LorePageParams = {
  page: number;
  pageSize: number;
  search: string;
  sort: SortOption;
};
type LoreItem = Character | Place | Technology | Creature | LoreEvent | OtherLore;

const loreRoutes: Record<LoreTab, string> = {
  Characters: "characters",
  Places: "places",
  Technology: "tech",
  Creatures: "creatures",
  Events: "events",
  Other: "other",
};

const emptyMessages: Record<LoreTab, string> = {
  Characters: "No characters found.",
  Places: "No places found.",
  Technology: "No technology found.",
  Creatures: "No creatures catalogued.",
  Events: "No events recorded.",
  Other: "No entries found.",
};

const dangerColor: Record<number, string> = {
  1: "text-emerald-500",
  2: "text-lime-500",
  3: "text-accent-yellow",
  4: "text-accent-orange",
  5: "text-destructive",
};

function emptyList<T>(): LoreListState<T> {
  return {
    items: [],
    pageInfo: null,
    loading: false,
    queryKey: "",
  };
}

function getResponsivePageSize() {
  if (typeof window === "undefined") return 24;
  if (window.matchMedia("(max-width: 640px)").matches) return 12;
  if (window.matchMedia("(max-width: 1024px)").matches) return 18;
  return 24;
}

function routeToTab(category?: string): LoreTab {
  switch (category?.toLowerCase()) {
    case "places":
      return "Places";
    case "tech":
    case "technology":
      return "Technology";
    case "creatures":
      return "Creatures";
    case "events":
      return "Events";
    case "other":
      return "Other";
    case "characters":
    default:
      return "Characters";
  }
}

function buildQueryKey(search: string, sort: SortOption, pageSize: number) {
  return `${search.trim().toLowerCase()}|${sort}|${pageSize}`;
}

function loadLoreTab(tab: LoreTab, params: LorePageParams): Promise<PaginatedResponse<LoreItem>> {
  if (tab === "Characters") return getCharactersPage(params);
  if (tab === "Places") return getPlacesPage(params);
  if (tab === "Technology") return getTechnologyPage(params);
  if (tab === "Creatures") return getCreaturesPage(params);
  if (tab === "Events") return getEventsPage(params);
  return getOthersPage(params);
}

export default function LorePage() {
  const { category } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const [active, setActive] = useState<LoreTab>(() => routeToTab(category));
  const [lists, setLists] = useState<LoreLists>({
    Characters: emptyList(),
    Places: emptyList(),
    Technology: emptyList(),
    Creatures: emptyList(),
    Events: emptyList(),
    Other: emptyList(),
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const [pageSize, setPageSize] = useState(getResponsivePageSize);
  const deferredSearch = useDeferredValue(search);
  const { role } = useAuth();

  useEffect(() => {
    setActive(routeToTab(category));
  }, [category]);

  useEffect(() => {
    const updatePageSize = () => setPageSize(getResponsivePageSize());
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  async function requestLorePage(tab: LoreTab, page: number, mode: "replace" | "append") {
    const queryKey = buildQueryKey(deferredSearch, sort, pageSize);

    setLists((current) => ({
      ...current,
      [tab]: {
        ...current[tab],
        ...(mode === "replace" ? { items: [], pageInfo: null } : {}),
        loading: true,
        queryKey,
      },
    }));

    try {
      const response = await loadLoreTab(tab, {
        page,
        pageSize,
        search: deferredSearch,
        sort,
      });

      setLists((current) => {
        if (current[tab].queryKey !== queryKey) return current;
        return {
          ...current,
          [tab]: {
            ...current[tab],
            items: mode === "append" ? [...current[tab].items, ...response.items] : response.items,
            pageInfo: response.pageInfo,
            loading: false,
          },
        };
      });
    } finally {
      setLists((current) => {
        if (current[tab].queryKey !== queryKey) return current;
        return {
          ...current,
          [tab]: {
            ...current[tab],
            loading: false,
          },
        };
      });
    }
  }

  useEffect(() => {
    const queryKey = buildQueryKey(deferredSearch, sort, pageSize);
    const state = lists[active];
    if (state.queryKey === queryKey && state.pageInfo) return;

    void requestLorePage(active, 1, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, deferredSearch, pageSize, sort]);

  const activeState = lists[active];
  const characters = lists.Characters.items;
  const places = lists.Places.items;
  const tech = lists.Technology.items;
  const creatures = lists.Creatures.items;
  const events = lists.Events.items;
  const others = lists.Other.items;

  function showEmpty(tab: LoreTab) {
    return !lists[tab].loading && lists[tab].items.length === 0;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl sm:text-2xl tracking-[0.1em] text-primary">LORE / WIKI</h1>
          <div className="mecha-line w-32 mt-2" />
        </div>
        {role === "author" && (
          <Link to="/author?tab=lore&action=create" className="flex items-center gap-1 px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground bg-primary rounded-sm hover:opacity-90 transition-opacity">
            <Plus className="h-3 w-3" /> NEW
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search lore..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Category buttons and sort */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end sm:justify-between">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === "Personnel") {
                  navigate("/lore/personnel");
                  return;
                }

                setActive(t);
                navigate(`/lore/${loreRoutes[t]}`);
              }}
              className={`w-full sm:w-auto px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-display tracking-[0.08em] sm:tracking-[0.1em] uppercase border rounded-sm transition-colors truncate inline-flex items-center justify-center gap-1
                ${active === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {t === "Personnel" && <ShieldCheck className="h-3 w-3" />}
              {t === "Events" && <CalendarClock className="h-3 w-3" />}
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSort(sort === "name" ? "name-desc" : "name")}
          className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors sm:flex-shrink-0"
        >
          <ArrowUpDown className="h-3 w-3" />
          {sort === "name" ? "A-Z" : "Z-A"}
        </button>
      </div>

      {/* Characters */}
      {active === "Characters" && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {characters.map((c) => (
            <Link key={c.id} to={`/lore/characters/${c.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow" style={{ borderColor: `${c.accentColor}30` }}>
                {c.thumbnail ? (
                  <div className="aspect-[3/4] bg-muted overflow-hidden relative">
                    <AuthenticatedImage src={c.thumbnail} alt={c.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: c.accentColor }} />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-muted flex items-center justify-center relative">
                    <span className="text-xs text-muted-foreground font-heading tracking-wider">PORTRAIT</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: c.accentColor }} />
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-heading text-foreground group-hover:text-primary transition-colors truncate">{c.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-body truncate">{c.race}</p>
                  {c.occupation && <p className="text-[10px] text-accent-orange font-display tracking-wider uppercase truncate">{c.occupation}</p>}
                </div>
              </div>
            </Link>
          ))}
          {showEmpty("Characters") && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">{emptyMessages.Characters}</p>}
        </div>
      )}

      {/* Places */}
      {active === "Places" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((p) => (
            <Link key={p.id} to={`/lore/places/${p.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
                {p.thumbnail ? (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <AuthenticatedImage src={p.thumbnail} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-heading tracking-wider">LANDSCAPE</span>
                  </div>
                )}
                <div className="p-4 space-y-1">
                  <h3 className="text-sm font-heading text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-display tracking-wider uppercase">{p.type}</p>
                  <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">{p.shortDesc}</p>
                </div>
              </div>
            </Link>
          ))}
          {showEmpty("Places") && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">{emptyMessages.Places}</p>}
        </div>
      )}

      {/* Technology */}
      {active === "Technology" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tech.map((t) => (
            <Link key={t.id} to={`/lore/tech/${t.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
                {t.thumbnail ? (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <AuthenticatedImage src={t.thumbnail} alt={t.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-heading tracking-wider">TECH</span>
                  </div>
                )}
                <div className="p-4 space-y-1">
                  <h3 className="text-sm font-heading text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-display tracking-wider uppercase">{t.category}</p>
                  <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">{t.shortDesc}</p>
                </div>
              </div>
            </Link>
          ))}
          {showEmpty("Technology") && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">{emptyMessages.Technology}</p>}
        </div>
      )}

      {/* Creatures */}
      {active === "Creatures" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creatures.map((c) => (
            <Link key={c.id} to={`/lore/creatures/${c.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow" style={{ borderColor: `${c.accentColor}30` }}>
                {c.thumbnail ? (
                  <div className="aspect-video bg-muted overflow-hidden relative">
                    <AuthenticatedImage src={c.thumbnail} alt={c.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: c.accentColor }} />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center relative">
                    <span className="text-xs text-muted-foreground font-heading tracking-wider">CREATURE</span>
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: c.accentColor }} />
                  </div>
                )}
                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-heading text-foreground group-hover:text-primary transition-colors truncate">{c.name}</h3>
                    <span className={`flex items-center gap-1 text-[10px] font-display tracking-wider flex-shrink-0 ${dangerColor[c.dangerLevel]}`}>
                      <ShieldAlert className="h-3 w-3" /> DL-{c.dangerLevel}
                    </span>
                  </div>
                  <Link
                    to={`/lore/other/${GEC_LORE_ID}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`inline-block text-[10px] font-display tracking-wider uppercase px-1.5 py-0.5 rounded-sm border ${gecChipClass(c.classification)} hover:opacity-80 transition-opacity`}
                    title="View GEC Mark II classification"
                  >
                    {c.classification}
                  </Link>
                  <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">{c.shortDesc}</p>
                </div>
              </div>
            </Link>
          ))}
          {showEmpty("Creatures") && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">{emptyMessages.Creatures}</p>}
        </div>
      )}

      {/* Events */}
      {active === "Events" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Link key={e.id} to={`/lore/events/${e.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
                {e.thumbnail ? (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <AuthenticatedImage src={e.thumbnail} alt={e.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <CalendarClock className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                )}
                <div className="p-4 space-y-1.5">
                  <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <h3 className="min-w-0 text-sm font-heading text-foreground group-hover:text-primary transition-colors break-words sm:truncate">{e.title}</h3>
                    {e.impactLevel && (
                      <span className="text-[10px] font-display tracking-wider uppercase px-1.5 py-0.5 rounded-sm border border-accent-orange/40 text-accent-orange flex-shrink-0">
                        {e.impactLevel.split(" ")[0]}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-display tracking-wider uppercase">{e.category}{e.era ? ` / ${e.era}` : ""}</p>
                  {e.dateLabel && (
                    <p className="text-[10px] text-muted-foreground font-body italic truncate">{e.dateLabel}</p>
                  )}
                  <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">{e.shortDesc}</p>
                </div>
              </div>
            </Link>
          ))}
          {showEmpty("Events") && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">{emptyMessages.Events}</p>}
        </div>
      )}

      {/* Other */}
      {active === "Other" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((o) => (
            <Link key={o.id} to={`/lore/other/${o.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
                {o.thumbnail ? (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <AuthenticatedImage src={o.thumbnail} alt={o.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-heading tracking-wider">DOCUMENT</span>
                  </div>
                )}
                <div className="p-4 space-y-1">
                  <h3 className="text-sm font-heading text-foreground group-hover:text-primary transition-colors">{o.title}</h3>
                  <p className="text-[10px] text-muted-foreground font-display tracking-wider uppercase">{o.category}</p>
                  <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">{o.shortDesc}</p>
                </div>
              </div>
            </Link>
          ))}
          {showEmpty("Other") && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">{emptyMessages.Other}</p>}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 pt-2">
        {activeState.pageInfo && (
          <p className="text-[11px] font-display tracking-wider text-muted-foreground uppercase">
            Showing {activeState.items.length} of {activeState.pageInfo.total}
          </p>
        )}
        {activeState.pageInfo?.hasNextPage && (
          <button
            onClick={() => requestLorePage(active, activeState.pageInfo!.page + 1, "append")}
            disabled={activeState.loading}
            className="px-4 py-2 text-xs font-display tracking-wider border border-primary text-primary rounded-sm hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary transition-colors"
          >
            {activeState.loading ? "LOADING..." : "LOAD MORE"}
          </button>
        )}
        {activeState.loading && !activeState.pageInfo?.hasNextPage && (
          <p className="text-xs text-muted-foreground font-body">Loading lore...</p>
        )}
      </div>
    </div>
  );
}
