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

function ExecutiveShape() {
  return (
    <g fill="currentColor">
      <polygon points="32,6 52,18 52,46 32,58 12,46 12,18" />
      <rect x="27" y="20" width="10" height="24" fillOpacity={0.42} />
    </g>
  );
}

function FieldShape() {
  return (
    <g fill="currentColor">
      <polygon points="7,32 21,16 57,32 21,48" />
      <rect x="25" y="29" width="16" height="6" fillOpacity={0.42} />
    </g>
  );
}

function MechanicShape() {
  return (
    <g fill="currentColor">
      <polygon points="22,8 42,8 56,22 56,42 42,56 22,56 8,42 8,22" />
      <rect x="24" y="24" width="16" height="16" fillOpacity={0.42} />
    </g>
  );
}

function LogisticsShape() {
  return (
    <g fill="currentColor">
      <rect x="10" y="14" width="44" height="36" />
      <polygon points="32,22 44,32 32,42 20,32" fillOpacity={0.42} />
    </g>
  );
}

const shapes: Record<PersonnelTrack, () => JSX.Element> = {
  executive: ExecutiveShape,
  field: FieldShape,
  mechanic: MechanicShape,
  logistics: LogisticsShape,
};

export function TrackEmblem({ track, size = 32, className, title, style }: TrackEmblemProps) {
  const Shape = shapes[track];
  const accessibleTitle = title ?? `${track} division emblem`;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("shrink-0", className)}
      height={size}
      role={title ? "img" : undefined}
      shapeRendering="geometricPrecision"
      style={style}
      viewBox="0 0 64 64"
      width={size}
    >
      <title>{accessibleTitle}</title>
      <Shape />
    </svg>
  );
}

export default TrackEmblem;