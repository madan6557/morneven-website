import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCharacters, getPlaces, getTechnology, getCreatures, getOthers } from "@/services/api";
import type { Character, Place, Technology, Creature, OtherLore } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, ArrowUpDown, ShieldAlert } from "lucide-react";
import { gecChipClass, GEC_LORE_ID } from "@/lib/gec";

const tabs = ["Characters", "Places", "Technology", "Creatures", "Other"] as const;
type SortOption = "name" | "name-desc";

const dangerColor: Record<number, string> = {
  1: "text-emerald-500",
  2: "text-lime-500",
  3: "text-accent-yellow",
  4: "text-accent-orange",
  5: "text-destructive",
};

export default function LorePage() {
  const { category } = useParams<{ category?: string }>();
  const [active, setActive] = useState<string>(category ? category.charAt(0).toUpperCase() + category.slice(1) : "Characters");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tech, setTech] = useState<Technology[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [others, setOthers] = useState<OtherLore[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const { role } = useAuth();

  useEffect(() => {
    getCharacters().then(setCharacters);
    getPlaces().then(setPlaces);
    getTechnology().then(setTech);
    getCreatures().then(setCreatures);
    getOthers().then(setOthers);
  }, []);

  useEffect(() => {
    if (category) setActive(category.charAt(0).toUpperCase() + category.slice(1));
  }, [category]);

  const matchSearch = (name: string, desc: string) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  };

  const sortItems = <T extends { name?: string; title?: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const nameA = (a.name || a.title || "").toLowerCase();
      const nameB = (b.name || b.title || "").toLowerCase();
      return sort === "name" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  };

  const filteredChars = sortItems(characters.filter((c) => matchSearch(c.name, c.shortDesc)));
  const filteredPlaces = sortItems(places.filter((p) => matchSearch(p.name, p.shortDesc)));
  const filteredTech = sortItems(tech.filter((t) => matchSearch(t.name, t.shortDesc)));
  const filteredCreatures = sortItems(creatures.filter((c) => matchSearch(c.name, c.shortDesc)));
  const filteredOthers = sortItems(others.filter((o) => matchSearch(o.title, o.shortDesc)));

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

      {/* Category buttons + Sort - stack on mobile */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`w-full sm:w-auto px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-display tracking-[0.08em] sm:tracking-[0.1em] uppercase border rounded-sm transition-colors truncate
                ${active === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
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
          {filteredChars.map((c) => (
            <Link key={c.id} to={`/lore/characters/${c.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow" style={{ borderColor: `${c.accentColor}30` }}>
                {c.thumbnail ? (
                  <div className="aspect-[3/4] bg-muted overflow-hidden relative">
                    <img src={c.thumbnail} alt={c.name} className="w-full h-full object-cover" />
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
          {filteredChars.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">No characters found.</p>}
        </div>
      )}

      {/* Places */}
      {active === "Places" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlaces.map((p) => (
            <Link key={p.id} to={`/lore/places/${p.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
                {p.thumbnail ? (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
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
          {filteredPlaces.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">No places found.</p>}
        </div>
      )}

      {/* Technology */}
      {active === "Technology" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTech.map((t) => (
            <Link key={t.id} to={`/lore/tech/${t.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
                {t.thumbnail ? (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover" />
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
          {filteredTech.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">No technology found.</p>}
        </div>
      )}

      {/* Creatures */}
      {active === "Creatures" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCreatures.map((c) => (
            <Link key={c.id} to={`/lore/creatures/${c.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow" style={{ borderColor: `${c.accentColor}30` }}>
                {c.thumbnail ? (
                  <div className="aspect-video bg-muted overflow-hidden relative">
                    <img src={c.thumbnail} alt={c.name} className="w-full h-full object-cover" />
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
          {filteredCreatures.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">No creatures catalogued.</p>}
        </div>
      )}

      {/* Other */}
      {active === "Other" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOthers.map((o) => (
            <Link key={o.id} to={`/lore/other/${o.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
                {o.thumbnail ? (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img src={o.thumbnail} alt={o.title} className="w-full h-full object-cover" />
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
          {filteredOthers.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">No entries found.</p>}
        </div>
      )}
    </div>
  );
}
