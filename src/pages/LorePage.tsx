import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCharacters, getPlaces, getTechnology } from "@/services/api";
import type { Character, Place, Technology } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, ArrowUpDown } from "lucide-react";

const tabs = ["Characters", "Places", "Technology"] as const;
type SortOption = "name" | "name-desc";

export default function LorePage() {
  const { category } = useParams<{ category?: string }>();
  const [active, setActive] = useState<string>(category || "Characters");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tech, setTech] = useState<Technology[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const { role } = useAuth();

  useEffect(() => {
    getCharacters().then(setCharacters);
    getPlaces().then(setPlaces);
    getTechnology().then(setTech);
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
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return sort === "name" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  };

  const filteredChars = sortItems(characters.filter((c) => matchSearch(c.name, c.shortDesc)));
  const filteredPlaces = sortItems(places.filter((p) => matchSearch(p.name, p.shortDesc)));
  const filteredTech = sortItems(tech.filter((t) => matchSearch(t.name, t.shortDesc)));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-[0.1em] text-primary">LORE / WIKI</h1>
          <div className="mecha-line w-32 mt-2" />
        </div>
        {role === "author" && (
          <Link to="/author?tab=lore&action=create" className="flex items-center gap-1 px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground bg-primary rounded-sm hover:opacity-90 transition-opacity">
            <Plus className="h-3 w-3" /> NEW
          </Link>
        )}
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search lore..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`px-4 py-2 text-xs font-display tracking-[0.1em] uppercase border rounded-sm transition-colors
                ${active === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => setSort(sort === "name" ? "name-desc" : "name")}
            className="flex items-center gap-1 px-3 py-2 text-xs font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sort === "name" ? "A-Z" : "Z-A"}
          </button>
        </div>
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
                  <h3 className="text-sm font-heading text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-body">{c.race}</p>
                </div>
              </div>
            </Link>
          ))}
          {filteredChars.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground font-body py-8">No characters found.</p>}
        </div>
      )}

      {/* Places */}
      {active === "Places" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
