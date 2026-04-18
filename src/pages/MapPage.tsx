import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMapMarkers, getMapImage } from "@/services/api";
import type { MapMarker, MapZoneStatus } from "@/types";
import { Plus, Minus, RotateCcw, MapPin, ExternalLink } from "lucide-react";

const STATUS_STYLES: Record<MapZoneStatus, { label: string; color: string; ring: string }> = {
  safe: { label: "Safe", color: "bg-emerald-500", ring: "ring-emerald-500/40" },
  caution: { label: "Caution", color: "bg-accent-yellow", ring: "ring-accent-yellow/40" },
  danger: { label: "Danger", color: "bg-accent-orange", ring: "ring-accent-orange/40" },
  restricted: { label: "Restricted", color: "bg-destructive", ring: "ring-destructive/40" },
  mission: { label: "Mission", color: "bg-secondary", ring: "ring-secondary/40" },
};

export default function MapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [mapImage, setMapImage] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null);
  const [filter, setFilter] = useState<MapZoneStatus | "all">("all");
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    getMapMarkers().then(setMarkers);
    setMapImage(getMapImage());
    const refresh = () => {
      getMapMarkers().then(setMarkers);
      setMapImage(getMapImage());
    };
    window.addEventListener("morneven:map-changed", refresh);
    return () => window.removeEventListener("morneven:map-changed", refresh);
  }, []);

  const visible = filter === "all" ? markers : markers.filter((m) => m.status === filter);

  const zoomIn = () => setScale((s) => Math.min(4, s * 1.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s / 1.25));
  const reset = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPan({ x: dragRef.current.baseX + (e.clientX - dragRef.current.startX), y: dragRef.current.baseY + (e.clientY - dragRef.current.startY) });
  };
  const onMouseUp = () => { dragRef.current = null; };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl sm:text-2xl tracking-[0.1em] text-primary">GEMORA — INTERACTIVE MAP</h1>
          <div className="mecha-line w-32 mt-2" />
          <p className="text-xs sm:text-sm font-body text-muted-foreground mt-2">Drag to pan, use the controls to zoom. Click any marker to view its details.</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 text-[10px] font-display tracking-wider uppercase border rounded-sm transition-colors ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>All</button>
        {(Object.keys(STATUS_STYLES) as MapZoneStatus[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-wider uppercase border rounded-sm transition-colors ${filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
            <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].color}`} />
            {STATUS_STYLES[s].label}
          </button>
        ))}
      </div>

      {/* Map viewport */}
      <div className="relative hud-border bg-card overflow-hidden h-[60vh] sm:h-[70vh]">
        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-30 flex flex-col gap-1">
          <button onClick={zoomIn} className="h-8 w-8 rounded-sm border border-border bg-background/90 backdrop-blur flex items-center justify-center hover:bg-muted transition-colors" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
          <button onClick={zoomOut} className="h-8 w-8 rounded-sm border border-border bg-background/90 backdrop-blur flex items-center justify-center hover:bg-muted transition-colors" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
          <button onClick={reset} className="h-8 w-8 rounded-sm border border-border bg-background/90 backdrop-blur flex items-center justify-center hover:bg-muted transition-colors" aria-label="Reset view"><RotateCcw className="h-3.5 w-3.5" /></button>
        </div>

        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <div
            className="absolute inset-0 origin-center transition-transform duration-100 ease-out"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
          >
            {mapImage ? (
              <img src={mapImage} alt="Gemora map" className="w-full h-full object-contain pointer-events-none" draggable={false} />
            ) : (
              // SVG placeholder map of Gemora
              <svg viewBox="0 0 1000 700" className="w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <radialGradient id="bg" cx="50%" cy="50%" r="70%">
                    <stop offset="0%" stopColor="hsl(var(--card))" />
                    <stop offset="100%" stopColor="hsl(var(--background))" />
                  </radialGradient>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
                  </pattern>
                </defs>
                <rect width="1000" height="700" fill="url(#bg)" />
                <rect width="1000" height="700" fill="url(#grid)" />
                {/* Stylized landmasses */}
                <path d="M 200 200 Q 350 150 500 220 T 800 250 Q 850 350 750 450 T 500 500 Q 300 480 220 380 Z" fill="hsl(var(--muted))" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.6" />
                <path d="M 150 500 Q 250 480 320 530 T 480 580 Q 420 620 320 620 T 180 580 Z" fill="hsl(var(--muted))" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.5" />
                <text x="500" y="60" textAnchor="middle" className="font-display" fontSize="32" fill="hsl(var(--muted-foreground))" opacity="0.3" letterSpacing="8">GEMORA</text>
              </svg>
            )}

            {/* Markers (rendered inside transformed layer so they pan/zoom with map) */}
            {visible.map((m) => {
              const style = STATUS_STYLES[m.status];
              return (
                <button
                  key={m.id}
                  onClick={(e) => { e.stopPropagation(); setActiveMarker(m); }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center gap-1 ${style.ring} hover:scale-110 transition-transform`}
                  style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                  aria-label={m.name}
                >
                  <span className={`h-3 w-3 rounded-full ${style.color} ring-4 ${style.ring} animate-pulse`} />
                  <span className="text-[10px] font-display tracking-wider uppercase bg-background/80 backdrop-blur px-1.5 py-0.5 rounded-sm text-foreground whitespace-nowrap">
                    {m.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active marker info card */}
        {activeMarker && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm z-30 hud-border bg-background/95 backdrop-blur p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-heading text-sm tracking-wider text-foreground truncate">{activeMarker.name}</h3>
              </div>
              <button onClick={() => setActiveMarker(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[activeMarker.status].color}`} />
              <span className="text-[10px] font-display tracking-wider uppercase text-muted-foreground">{STATUS_STYLES[activeMarker.status].label} Zone</span>
            </div>
            <p className="text-xs font-body text-foreground/80">{activeMarker.description}</p>
            {activeMarker.loreLink && (
              <Link to={activeMarker.loreLink} className="inline-flex items-center gap-1 text-xs font-heading text-primary hover:underline">
                Open Wiki Entry <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
