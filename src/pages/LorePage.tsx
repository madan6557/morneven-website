import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCharacters, getPlaces, getTechnology } from "@/services/api";
import type { Character, Place, Technology } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";

const tabs = ["Characters", "Places", "Technology"] as const;

export default function LorePage() {
  const { category } = useParams<{ category?: string }>();
  const [active, setActive] = useState<string>(category || "Characters");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tech, setTech] = useState<Technology[]>([]);
  const { role } = useAuth();

  useEffect(() => {
    getCharacters().then(setCharacters);
    getPlaces().then(setPlaces);
    getTechnology().then(setTech);
  }, []);

  useEffect(() => {
    if (category) setActive(category.charAt(0).toUpperCase() + category.slice(1));
  }, [category]);

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

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-4 py-1.5 text-xs font-display tracking-[0.1em] uppercase border rounded-sm transition-colors
              ${active === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Characters */}
      {active === "Characters" && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {characters.map((c) => (
            <Link key={c.id} to={`/lore/characters/${c.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow" style={{ borderColor: `${c.accentColor}30` }}>
                <div className="aspect-[3/4] bg-muted flex items-center justify-center relative">
                  <span className="text-xs text-muted-foreground font-heading tracking-wider">PORTRAIT</span>
                  <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: c.accentColor }} />
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-heading text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-body">{c.race}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Places */}
      {active === "Places" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {places.map((p) => (
            <Link key={p.id} to={`/lore/places/${p.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground font-heading tracking-wider">LANDSCAPE</span>
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="text-sm font-heading text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-display tracking-wider uppercase">{p.type}</p>
                  <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">{p.shortDesc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Technology */}
      {active === "Technology" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tech.map((t) => (
            <Link key={t.id} to={`/lore/tech/${t.id}`} className="block group">
              <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground font-heading tracking-wider">TECH</span>
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="text-sm font-heading text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                  <p className="text-[10px] text-muted-foreground font-display tracking-wider uppercase">{t.category}</p>
                  <p className="text-xs text-muted-foreground font-body line-clamp-2 mt-1">{t.shortDesc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
