import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMapMarkers, getMapImageRemote } from "@/services/api";
import type { MapMarker, MapZoneStatus } from "@/types";
import { Plus, Minus, RotateCcw, MapPin, ExternalLink } from "lucide-react";
import { ContentState } from "@/components/ContentState";

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
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mapError, setMapError] = useState("");
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const refresh = async () => {
    setMapStatus("loading");
    setMapError("");

    try {
      const [nextMarkers, nextMapImage] = await Promise.all([
        getMapMarkers(),
        getMapImageRemote(),
      ]);
      setMarkers(nextMarkers);
      setMapImage(nextMapImage);
      setMapStatus("ready");
    } catch (error) {
      setMarkers([]);
      setMapImage("");
      setMapStatus("error");
      setMapError(
        error instanceof Error
          ? error.message === "Failed to fetch"
            ? "Network request failed."
            : error.message
          : "The live map dataset could not be loaded.",
      );
    }
  };

  useEffect(() => {
    void refresh();
    const handleRefresh = () => { void refresh(); };
    window.addEventListener("morneven:map-changed", handleRefresh);
    return () => window.removeEventListener("morneven:map-changed", handleRefresh);
  }, []);

  const visible = filter === "all" ? markers : markers.filter((m) => m.status === filter);

  const applyZoom = (nextScale: number, anchor?: { clientX: number; clientY: number }) => {
    const clampedScale = Math.max(0.5, Math.min(4, nextScale));
    if (clampedScale === scale) return;

    if (!anchor || !viewportRef.current) {
      setScale(clampedScale);
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const offsetX = anchor.clientX - rect.left - rect.width / 2;
    const offsetY = anchor.clientY - rect.top - rect.height / 2;

    setPan((currentPan) => ({
      x: offsetX - ((offsetX - currentPan.x) / scale) * clampedScale,
      y: offsetY - ((offsetY - currentPan.y) / scale) * clampedScale,
    }));
    setScale(clampedScale);
  };

  const zoomIn = () => applyZoom(scale * 1.25);
  const zoomOut = () => applyZoom(scale / 1.25);
  const reset = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target;
    if (target instanceof HTMLElement && target.closest("[data-map-control='true']")) {
      return;
    }
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
    activePointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== e.pointerId || !dragRef.current) return;
    setPan({
      x: dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.baseY + (e.clientY - dragRef.current.startY),
    });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current === e.pointerId) {
      dragRef.current = null;
      activePointerRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    applyZoom(scale * factor, { clientX: e.clientX, clientY: e.clientY });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl sm:text-2xl tracking-[0.1em] text-primary">GEMORA - INTERACTIVE MAP</h1>
          <div className="mecha-line w-32 mt-2" />
          <p className="text-sm font-body text-muted-foreground mt-2">Drag or touch and move to pan, use the controls to zoom, then open any marker for details.</p>
        </div>
      </div>

      {mapStatus === "error" && (
        <ContentState
          kind="error"
          title="Live map data unavailable"
          description={`The page is showing fallback terrain because the backend map request failed. ${mapError}`}
          actionLabel="Retry"
          onAction={() => { void refresh(); }}
          className="bg-card/65"
        />
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`px-3 py-2 text-xs font-display tracking-wider uppercase border rounded-sm transition-colors ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/80 hover:bg-muted"}`}>All</button>
        {(Object.keys(STATUS_STYLES) as MapZoneStatus[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-display tracking-wider uppercase border rounded-sm transition-colors ${filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/80 hover:bg-muted"}`}>
            <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[s].color}`} />
            {STATUS_STYLES[s].label}
          </button>
        ))}
      </div>

      {/* Map viewport */}
      <div className="relative hud-border bg-card overflow-hidden h-[60vh] sm:h-[70vh]">
        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-30 flex flex-col gap-1">
          <button data-map-control="true" onClick={zoomIn} className="h-8 w-8 rounded-sm border border-border bg-background/90 backdrop-blur flex items-center justify-center hover:bg-muted transition-colors" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
          <button data-map-control="true" onClick={zoomOut} className="h-8 w-8 rounded-sm border border-border bg-background/90 backdrop-blur flex items-center justify-center hover:bg-muted transition-colors" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
          <button data-map-control="true" onClick={reset} className="h-8 w-8 rounded-sm border border-border bg-background/90 backdrop-blur flex items-center justify-center hover:bg-muted transition-colors" aria-label="Reset view"><RotateCcw className="h-3.5 w-3.5" /></button>
        </div>

        <div
          ref={viewportRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing select-none touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
        >
          <div
            className="absolute inset-0 origin-center transition-transform duration-100 ease-out"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
          >
            {mapImage ? (
              <img
                src={mapImage}
                alt="Gemora map"
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
                onError={() => setMapImage("")}
              />
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

            {/* Markers pan and zoom with map position, but counter-scale so their UI size stays stable. */}
            {visible.map((m) => {
              const style = STATUS_STYLES[m.status];
              return (
                <button
                  key={m.id}
                  data-map-control="true"
                  onClick={(e) => { e.stopPropagation(); setActiveMarker(m); }}
                  className="absolute"
                  style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                  aria-label={m.name}
                >
                  <span
                    className="-translate-x-1/2 -translate-y-1/2"
                    style={{ transform: `translate(-50%, -50%) scale(${1 / scale})` }}
                  >
                    <span className={`group flex flex-col items-center gap-1 transition-transform hover:scale-110 ${style.ring}`}>
                      <span className={`h-3 w-3 rounded-full ${style.color} ring-4 ${style.ring} animate-pulse`} />
                      <span className="whitespace-nowrap rounded-sm bg-background/80 px-1.5 py-0.5 text-[10px] font-display tracking-wider uppercase text-foreground backdrop-blur">
                        {m.name}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active marker info card */}
        {activeMarker && (
          <div data-map-control="true" className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm z-30 hud-border bg-background/95 backdrop-blur p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <h3 className="font-heading text-sm tracking-wider text-foreground truncate">{activeMarker.name}</h3>
              </div>
              <button data-map-control="true" onClick={() => setActiveMarker(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[activeMarker.status].color}`} />
              <span className="text-[10px] font-display tracking-wider uppercase text-muted-foreground">{STATUS_STYLES[activeMarker.status].label} Zone</span>
            </div>
            <p className="text-xs font-body text-foreground/80 text-justify">{activeMarker.description}</p>
            {activeMarker.loreLink && (
              <Link data-map-control="true" to={activeMarker.loreLink} className="inline-flex items-center gap-1 text-xs font-heading text-primary hover:underline">
                Open Wiki Entry <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        {mapStatus === "loading" && !mapImage && markers.length === 0 && (
          <div className="absolute inset-x-3 bottom-3 z-30 sm:inset-x-auto sm:right-3 sm:max-w-sm">
            <ContentState
              kind="loading"
              title="Loading map dataset"
              description="Markers and map assets are being requested from the backend."
              compact
              className="bg-background/95 backdrop-blur"
            />
          </div>
        )}

        {mapStatus === "ready" && visible.length === 0 && (
          <div className="absolute inset-x-3 bottom-3 z-30 sm:inset-x-auto sm:right-3 sm:max-w-sm">
            <ContentState
              kind="empty"
              title="No markers match this filter"
              description="Switch zone status or reset filters to reveal map markers again."
              compact
              className="bg-background/95 backdrop-blur"
            />
          </div>
        )}
      </div>
    </div>
  );
}
