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

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ExecutiveGlyph() {
  return (
    <g {...strokeProps}>
      <path d="M32 7 51 18v28L32 57 13 46V18L32 7Z" />
      <path d="m24 28 8-5 8 5-8 5-8-5Z" />
      <path d="M24 28v9l8 5 8-5v-9" />
      <path d="M32 33v9" />
      <path d="M20 16h24" opacity={0.55} />
    </g>
  );
}

function FieldGlyph() {
  return (
    <g {...strokeProps}>
      <path d="M32 7v50" opacity={0.45} />
      <path d="m32 11 8 10h-5v10h-6V21h-5l8-10Z" />
      <path d="M16 43h32" opacity={0.55} />
      <path d="m20 36 12 7 12-7" />
      <path d="M25 49h14" />
    </g>
  );
}

function MechanicGlyph() {
  return (
    <g {...strokeProps}>
      <path d="m32 9 5 5 7-1 1 7 5 5-5 5 1 7-7-1-5 5-5-5-7 1 1-7-5-5 5-5-1-7 7 1 5-5Z" />
      <circle cx="32" cy="32" r="8" />
      <path d="M32 24v16M24 32h16" opacity={0.55} />
      <circle cx="32" cy="32" r="2" fill="currentColor" stroke="none" />
    </g>
  );
}

function LogisticsGlyph() {
  return (
    <g {...strokeProps}>
      <path d="m32 10 18 10v24L32 54 14 44V20l18-10Z" />
      <path d="m14 20 18 10 18-10M32 30v24" />
      <path d="M24 24h16v8H24z" opacity={0.75} />
      <path d="m23 42 9 5 9-5" opacity={0.55} />
    </g>
  );
}

const glyphs: Record<PersonnelTrack, () => JSX.Element> = {
  executive: ExecutiveGlyph,
  field: FieldGlyph,
  mechanic: MechanicGlyph,
  logistics: LogisticsGlyph,
};

export function TrackEmblem({ track, size = 32, className, title, style }: TrackEmblemProps) {
  const Glyph = glyphs[track];
  const accessibleTitle = title ?? `${track} division emblem`;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("shrink-0", className)}
      height={size}
      role={title ? "img" : undefined}
      style={style}
      viewBox="0 0 64 64"
      width={size}
    >
      <title>{accessibleTitle}</title>
      <circle cx="32" cy="32" r="25" fill="currentColor" fillOpacity={0.06} stroke="currentColor" strokeOpacity={0.16} />
      <Glyph />
    </svg>
  );
}

export default TrackEmblem;