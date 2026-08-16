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
      <path d="M32 5 51 17l4 24-23 18L9 41l4-24L32 5Z" />
      <path d="m32 12 12 8-2 18-10 8-10-8-2-18 12-8Z" fillOpacity={0.4} />
      <path d="m32 23 7 5-1 8-6 4-6-4-1-8 7-5Z" fillOpacity={0.9} />
    </g>
  );
}

function FieldShape() {
  return (
    <g fill="currentColor">
      <path d="M7 11 57 32 7 53l13-21L7 11Z" />
      <path d="m18 18 27 14-27 14 8-14-8-14Z" fillOpacity={0.4} />
      <path d="m36 27 12 5-12 5 5-5-5-5Z" fillOpacity={0.9} />
    </g>
  );
}

function MechanicShape() {
  return (
    <g fill="currentColor">
      <path d="m32 5 14 8 9 13-4 15-19 18-19-18-4-15 9-13 14-8Z" />
      <path d="m32 13 9 5 6 9-3 10-12 12-12-12-3-10 6-9 9-5Z" fillOpacity={0.4} />
      <path d="m32 24 7 4v8l-7 5-7-5v-8l7-4Z" fillOpacity={0.9} />
    </g>
  );
}

function LogisticsShape() {
  return (
    <g fill="currentColor">
      <path d="m32 5 24 14-10 6 10 6-24 14-24-14 10-6-10-6L32 5Z" />
      <path d="m32 14 13 8-13 8-13-8 13-8Zm0 17 13 8-13 8-13-8 13-8Z" fillOpacity={0.4} />
      <path d="m32 23 8 5-8 5-8-5 8-5Z" fillOpacity={0.9} />
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