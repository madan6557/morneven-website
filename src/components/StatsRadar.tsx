import { motion } from "framer-motion";

interface StatsRadarProps {
  stats: Record<string, number>;
  color: string;
  size?: number;
  max?: number;
}

/**
 * Pentagram / spider-web visualization for 3-8 stat values (0-max).
 * Pure SVG, no chart library — keeps bundle small and theme-true.
 */
export default function StatsRadar({ stats, color, size = 240, max = 100 }: StatsRadarProps) {
  const entries = Object.entries(stats);
  const n = entries.length;
  if (n < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 36;
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
    <div className="flex justify-center">
      <svg width={size} height={size} role="img" aria-label="Stats radar chart">
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
        {/* Data vertices */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}
        {/* Labels */}
        {entries.map(([key, value], i) => {
          const lp = point(i, radius + 18);
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
                style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--font-display, inherit)" }}
              >
                {key}
              </text>
              <text
                x={lp.x}
                y={lp.y + 11}
                textAnchor={anchor}
                dominantBaseline="middle"
                style={{ fontSize: 10, fill: color, fontWeight: 600 }}
              >
                {value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
