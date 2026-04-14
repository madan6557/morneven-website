import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getPlace } from "@/services/api";
import type { Place } from "@/types";
import { ArrowLeft, Map } from "lucide-react";

export default function PlaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<Place | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (id) getPlace(id).then((p) => setPlace(p ?? null));
  }, [id]);

  if (!place) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;

  return (
    <div className="space-y-0">
      {/* Parallax header */}
      <div className="relative h-64 md:h-80 bg-muted overflow-hidden flex items-end">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-6xl text-muted-foreground/10 tracking-[0.3em]">GEMORA</span>
        </div>
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link to="/lore" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" /> BACK TO LORE
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">{place.name.toUpperCase()}</h1>
          <p className="text-xs font-display tracking-wider text-accent-orange uppercase mt-1">{place.type}</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="mecha-line" />

        {/* Map Toggle */}
        <button
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-xs font-display tracking-wider text-muted-foreground hover:bg-muted transition-colors"
        >
          <Map className="h-4 w-4" />
          {showMap ? "HIDE MAP" : "SHOW INTERACTIVE MAP"}
        </button>

        {showMap && (
          <div className="hud-border bg-card aspect-[16/9] flex items-center justify-center">
            <div className="text-center space-y-2">
              <Map className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground font-heading tracking-wider">INTERACTIVE SVG MAP</p>
              <p className="text-xs text-muted-foreground font-body">Placeholder for Gemora world map</p>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="max-w-3xl space-y-4">
          <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Overview</h2>
          {place.fullDesc.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm font-body text-foreground/80 leading-relaxed">{para}</p>
          ))}
        </div>

        {/* Documentation */}
        {place.docs.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Documentation</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {place.docs.map((doc, i) => (
                <div key={i} className="hud-border-sm bg-card overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-heading tracking-wider">IMAGE</span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-body text-muted-foreground">{doc.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
