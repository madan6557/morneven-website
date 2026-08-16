import type { CSSProperties } from "react";
import type { PersonnelTrack } from "@/lib/pl";
import { cn } from "@/lib/utils";
import executiveMask from "@/assets/division-emblems/executive.png";
import fieldMask from "@/assets/division-emblems/field.png";
import mechanicMask from "@/assets/division-emblems/mechanic.png";
import logisticsMask from "@/assets/division-emblems/logistics.png";

interface TrackEmblemProps {
  track: PersonnelTrack;
  size?: number;
  className?: string;
  title?: string;
  style?: CSSProperties;
}

const masks: Record<PersonnelTrack, string> = {
  executive: executiveMask,
  field: fieldMask,
  mechanic: mechanicMask,
  logistics: logisticsMask,
};

const emblemColors: Record<PersonnelTrack, string> = {
  executive: "#18C8DC",
  field: "#FF7A00",
  mechanic: "#FFC21A",
  logistics: "#4F83BD",
};

export function TrackEmblem({ track, size = 32, className, title, style }: TrackEmblemProps) {
  const accessibleLabel = title ?? `${track} division emblem`;
  const mask = masks[track];

  return (
    <span
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("inline-block shrink-0", className)}
      role={title ? "img" : undefined}
      style={{
        ...style,
        color: emblemColors[track],
        backgroundColor: "currentColor",
        height: size,
        maskImage: `url(${mask})`,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage: `url(${mask})`,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        width: size,
      }}
      title={title ? accessibleLabel : undefined}
    />
  );
}

export default TrackEmblem;