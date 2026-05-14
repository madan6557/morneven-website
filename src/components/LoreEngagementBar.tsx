import { Eye, Star } from "lucide-react";
import { setLoreStar } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatCompactNumber } from "@/lib/formatNumber";

interface Props {
  category: string;
  id: string;
  views?: number;
  stars?: number;
  viewerStarred?: boolean;
  onChange: (metrics: { views: number; stars: number; viewerStarred: boolean }) => void;
}

export function LoreEngagementBar({ category, id, views = 0, stars = 0, viewerStarred = false, onChange }: Props) {
  const { role } = useAuth();
  const canStar = role !== "guest";

  const toggleStar = async () => {
    if (!canStar) return;
    const next = await setLoreStar(category, id, !viewerStarred);
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-sm border border-border/70 bg-background/50 px-2 py-1 text-[10px] font-display uppercase tracking-[0.08em] text-muted-foreground">
        <Eye className="h-3 w-3" />
        {formatCompactNumber(views)} views
      </span>
      <button
        type="button"
        onClick={toggleStar}
        disabled={!canStar}
        className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-display uppercase tracking-[0.08em] transition-colors ${
          viewerStarred
            ? "border-primary/70 bg-primary/15 text-primary"
            : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/60 hover:text-primary"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <Star className={`h-3 w-3 ${viewerStarred ? "fill-current" : ""}`} />
        {formatCompactNumber(stars)} stars
      </button>
    </div>
  );
}
