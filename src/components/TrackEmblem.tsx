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
    <path
      d="M32 6 52 18v28L32 58 12 46V18L32 6Zm0 0-2.4 14v24L32 58l2.4-14V20L32 6Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  );
}

function FieldShape() {
  return (
    <path
      d="M32 6 54 19 45 43 33 58 21 49 12 32 24 17 32 6Zm0 0-1.2 25-10 16 4 4 11-17V17L32 6Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  );
}

function MechanicShape() {
  return (
    <g fill="currentColor">
      <path d="M22 8h10v12L20 32H8V22L22 8Z" />
      <path d="M42 8 56 22v10H44L32 20V8h10Z" />
      <path d="M8 36h12l12 12v12H22L8 46V36Z" />
      <path d="M44 36h12v10L42 60H32V48l12-12Z" />
    </g>
  );
}

function LogisticsShape() {
  return (
    <path
      d="M32 6 54 16v15H40v4h14v14L32 58 10 49V35h14v-4H10V16L32 6Z"
      fill="currentColor"
    />
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