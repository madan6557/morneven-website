import { Eye, MessageCircle, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { formatCompactNumber } from "@/lib/formatNumber";

type MetricKind = "views" | "likes" | "dislikes" | "stars" | "comments";

const metricIcons = {
  views: Eye,
  likes: ThumbsUp,
  dislikes: ThumbsDown,
  stars: Star,
  comments: MessageCircle,
} satisfies Record<MetricKind, typeof Eye>;

interface Props {
  kind: MetricKind;
  value?: number;
  active?: boolean;
  label?: string;
}

export function ContentMetricPill({ kind, value = 0, active = false, label }: Props) {
  const Icon = metricIcons[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-display uppercase tracking-[0.08em] ${
        active
          ? "border-primary/70 bg-primary/15 text-primary"
          : "adaptive-surface-soft text-muted-foreground"
      }`}
      title={label}
    >
      <Icon className="h-3 w-3" />
      {formatCompactNumber(value)}
    </span>
  );
}
