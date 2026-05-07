import { motion } from "framer-motion";
import { useState } from "react";

interface StatsRadarProps {
  stats: Record<string, number>;
  color: string;
  size?: number;
  max?: number;
  /** Optional map of stat key -> full descriptive name (e.g. STR -> Strength). */
  labels?: Record<string, string>;
}

/**
 * Pentagram / spider-web visualization for 3-8 stat values (0-max).
 * Pure SVG, no chart library — keeps bundle small and theme-true.
 */
export default function StatsRadar({ stats, color, size = 240, max = 100, labels }: StatsRadarProps) {
  const entries = Object.entries(stats);
  const n = entries.length;
  const [hovered, setHovered] = useState<number | null>(null);
  if (n < 3) return null;

  // Scale-aware paddings & label metrics — keeps geometry consistent
  // whether the SVG is rendered at 140px (mobile) or 320px (desktop).
  const labelOffset = Math.max(12, size * 0.075);
  const padding = Math.max(36, size * 0.18);
  const labelFont = Math.max(7, size * 0.038);
  const valueFont = Math.max(8, size * 0.042);
  const valueGap = Math.max(9, size * 0.046);
  const vertexR = Math.max(2.5, size * 0.013);
  const hitR = Math.max(10, size * 0.05);
  const hoverR = Math.max(5, size * 0.025);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - padding;
  const rings = 4;

  // angle for index i — start at top (-90deg)
  const angle = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / n;
  const point = (i: number, r: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });

  // Background grid polygons
  const gridPolys = Array.from({ length: rings }, (_, ringIdx) => {
    const r = (radius * (ringIdx + 1)) / rings;
    return entries
      .map((_, i) => {
        const p = point(i, r);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  });

  // Axis lines
  const axes = entries.map((_, i) => point(i, radius));

  // Data polygon
  const dataPoints = entries.map(([, v], i) => {
    const r = (radius * Math.max(0, Math.min(max, v))) / max;
    return point(i, r);
  });
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="relative flex justify-center w-full overflow-visible" style={{ maxWidth: size, marginInline: "auto" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        height="auto"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: size, aspectRatio: "1 / 1" }}
        className="w-full h-auto"
        role="img"
        aria-label="Stats radar chart"
        overflow="visible"
      >
        {/* Grid rings */}
        {gridPolys.map((pts, idx) => (
          <polygon
            key={idx}
            points={pts}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeOpacity={0.18}
            strokeWidth={1}
          />
        ))}
        {/* Axis lines */}
        {axes.map((p, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="hsl(var(--muted-foreground))"
            strokeOpacity={0.18}
            strokeWidth={1}
          />
        ))}
        {/* Data polygon */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          points={dataPath}
          fill={color}
          fillOpacity={0.22}
          stroke={color}
          strokeWidth={1.5}
        />
        {/* Data vertices with hover tooltips */}
        {dataPoints.map((p, i) => {
          const isActive = hovered === i;
          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered(i)}
            >
              <circle cx={p.x} cy={p.y} r={vertexR} fill={color} />
              {/* Larger transparent hit area */}
              <circle cx={p.x} cy={p.y} r={hitR} fill="transparent" />
              {/* Hover ring */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverR}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                opacity={isActive ? 0.85 : 0}
                className="transition-opacity pointer-events-none"
              />
            </g>
          );
        })}
        {/* Labels */}
        {entries.map(([key, value], i) => {
          const lp = point(i, radius + labelOffset);
          const a = angle(i);
          const cos = Math.cos(a);
          const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
          return (
            <g key={key}>
              <text
                x={lp.x}
                y={lp.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="fill-muted-foreground"
                style={{ fontSize: labelFont, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display, inherit)" }}
              >
                {key}
              </text>
              <text
                x={lp.x}
                y={lp.y + valueGap}
                textAnchor={anchor}
                dominantBaseline="middle"
                style={{ fontSize: valueFont, fill: color, fontWeight: 600 }}
              >
                {value}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Themed hover tooltip — positioned over the active vertex */}
      {hovered !== null && (() => {
        const [key, value] = entries[hovered];
        const p = dataPoints[hovered];
        const leftPct = (p.x / size) * 100;
        const topPct = (p.y / size) * 100;
        return (
          <div
            className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg whitespace-nowrap animate-in fade-in-0 zoom-in-95"
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
          >
            <div className="font-display uppercase tracking-wider text-[10px] text-muted-foreground">{key}</div>
            <div className="font-semibold" style={{ color }}>{value} <span className="text-muted-foreground font-normal">/ {max}</span></div>
          </div>
        );
      })()}
    </div>
  );
}
