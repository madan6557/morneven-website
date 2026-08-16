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
      d="M32 6 52 18v28L32 58 12 46V18L32 6Zm0 7-3 7v30l3 7 3-7V20l-3-7Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  );
}

function FieldShape() {
  return (
    <path
      d="M8 32 22 13l34 19-34 19L8 32Zm17 0 18-10 5 10-5 10-18-10Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  );
}

function MechanicShape() {
  return (
    <path
      d="M22 8h20l14 14v20L42 56H22L8 42V22L22 8Zm10 16 12 8-12 8-12-8 12-8Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  );
}

function LogisticsShape() {
  return (
    <path
      d="m10 16 22-10 22 10v14H40v4h14v14L32 58 10 48V34h14v-4H10V16Z"
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