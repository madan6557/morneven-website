import type { CSSProperties } from "react";
import type { PersonnelTrack } from "@/lib/pl";
import { cn } from "@/lib/utils";

interface TrackEmblemProps {
  track: PersonnelTrack;
  size?: number;
  className?: string;
  title?: string;
  style?: CSSProperties;
}

/**
 * Authentic faction insignia for each personnel division.
 * Each emblem is built around a 64x64 grid with a uniform outer ring
 * for visual cohesion across divisions, and a unique inner glyph.
 *
 *  - Executive: crowned hexagonal command sigil (authority / oversight)
 *  - Field:     scope crosshair with arrow vector (recon / combat ops)
 *  - Mechanic:  cogged tri-bolt with circuit traces (engineering)
 *  - Logistics: stacked cargo prism with directional chevrons (supply)
 */
export function TrackEmblem({ track, size = 28, className, title, style }: TrackEmblemProps) {
  const accent = TRACK_ACCENT[track];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      style={{ color: `hsl(${accent})`, ...style }}
      role="img"
      aria-label={title ?? `${track} division emblem`}
    >
      <title>{title ?? `${track} division emblem`}</title>

      {/* Shared outer mecha ring — keeps the family identity */}
      <g fill="none" stroke="currentColor" strokeWidth={1.4} opacity={0.85}>
        <polygon
          points="32,3 56,17 56,47 32,61 8,47 8,17"
          fill="currentColor"
          fillOpacity={0.06}
        />
        <polygon points="32,7 53,18.5 53,45.5 32,57 11,45.5 11,18.5" />
        {/* Bolt notches on each vertex */}
        <circle cx="32" cy="5" r="1.2" fill="currentColor" />
        <circle cx="55" cy="17.5" r="1.2" fill="currentColor" />
        <circle cx="55" cy="46.5" r="1.2" fill="currentColor" />
        <circle cx="32" cy="59" r="1.2" fill="currentColor" />
        <circle cx="9" cy="46.5" r="1.2" fill="currentColor" />
        <circle cx="9" cy="17.5" r="1.2" fill="currentColor" />
      </g>

      <g fill="currentColor" stroke="currentColor" strokeLinejoin="miter" strokeLinecap="square">
        {track === "executive" && <ExecutiveGlyph />}
        {track === "field" && <FieldGlyph />}
        {track === "mechanic" && <MechanicGlyph />}
        {track === "logistics" && <LogisticsGlyph />}
      </g>
    </svg>
  );
}

const TRACK_ACCENT: Record<PersonnelTrack, string> = {
  executive: "0 78% 58%",
  field: "24 88% 50%",
  mechanic: "46 92% 50%",
  logistics: "226 25% 70%",
};

/* ---------- Glyphs ---------- */

function ExecutiveGlyph() {
  // Crowned command sigil: three-prong crown over a hex shield with a center star
  return (
    <g>
      {/* Crown */}
      <path d="M22 22 L26 16 L32 21 L38 16 L42 22 L42 25 L22 25 Z" fillOpacity={0.95} stroke="none" />
      {/* Shield body */}
      <path
        d="M22 27 L42 27 L42 38 L32 46 L22 38 Z"
        fill="none"
        strokeWidth={1.6}
      />
      {/* Inner star */}
      <path
        d="M32 30 L34 35 L39 35 L35 38 L36.5 43 L32 40 L27.5 43 L29 38 L25 35 L30 35 Z"
        stroke="none"
      />
    </g>
  );
}

function FieldGlyph() {
  // Scope crosshair pierced by an upward vector arrow
  return (
    <g fill="none" strokeWidth={1.6}>
      <circle cx="32" cy="34" r="11" />
      <circle cx="32" cy="34" r="3" fill="currentColor" stroke="none" />
      {/* Crosshair ticks */}
      <line x1="32" y1="19" x2="32" y2="24" />
      <line x1="32" y1="44" x2="32" y2="49" />
      <line x1="17" y1="34" x2="22" y2="34" />
      <line x1="42" y1="34" x2="47" y2="34" />
      {/* Arrow vector */}
      <path d="M32 16 L37 22 L34 22 L34 30 L30 30 L30 22 L27 22 Z" fill="currentColor" stroke="none" />
    </g>
  );
}

function MechanicGlyph() {
  // Cog with three bolt arms + center hex aperture
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 360) / 8;
    return (
      <rect
        key={i}
        x={30.5}
        y={14}
        width={3}
        height={5}
        transform={`rotate(${angle} 32 33)`}
        stroke="none"
      />
    );
  });
  return (
    <g>
      {teeth}
      <circle cx="32" cy="33" r="11" fill="none" strokeWidth={1.6} />
      <circle cx="32" cy="33" r="7.5" fill="none" strokeWidth={1.2} opacity={0.7} />
      {/* Hex aperture */}
      <polygon
        points="32,28 36,30.5 36,35.5 32,38 28,35.5 28,30.5"
        fill="currentColor"
        stroke="none"
      />
    </g>
  );
}

function LogisticsGlyph() {
  // Stacked cargo prism with directional chevrons beneath
  return (
    <g fill="none" strokeWidth={1.5}>
      {/* Top crate */}
      <rect x="24" y="20" width="16" height="8" fill="currentColor" fillOpacity={0.25} />
      <line x1="32" y1="20" x2="32" y2="28" />
      {/* Bottom crates */}
      <rect x="20" y="28" width="10" height="9" fill="currentColor" fillOpacity={0.15} />
      <rect x="34" y="28" width="10" height="9" fill="currentColor" fillOpacity={0.15} />
      <line x1="25" y1="28" x2="25" y2="37" />
      <line x1="39" y1="28" x2="39" y2="37" />
      {/* Direction chevrons */}
      <path d="M22 42 L32 47 L42 42" />
      <path d="M22 46 L32 51 L42 46" opacity={0.55} />
    </g>
  );
}

export default TrackEmblem;
