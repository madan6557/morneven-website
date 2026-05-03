import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react";
import { getNewsItem } from "@/services/newsApi";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { getProxyUrl } from "@/services/fileProxyService";
import type { NewsItem } from "@/types";

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getNewsItem(id).then((n) => {
      setItem(n ?? null);
      setLoading(false);
      // If the news entry has no detail page enabled, send back home.
      if (n && !n.hasDetail) navigate("/home", { replace: true });
    });
  }, [id, navigate]);

  if (loading) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;
  if (!item) return <div className="p-8 text-muted-foreground font-body">News entry not found.</div>;

  return (
    <div className="space-y-0">
      <div
        className="relative h-48 md:h-64 overflow-hidden flex items-end"
        style={
          item.thumbnail
            ? { backgroundImage: `url(${getProxyUrl(item.thumbnail)})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: "var(--color-muted)" }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link
            to="/home"
            className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3 w-3" /> BACK TO COMMAND CENTER
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">{item.text.toUpperCase()}</h1>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground font-heading">
            <Calendar className="h-3 w-3" /> {item.date}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6 max-w-3xl">
        <div className="mecha-line" />
        {item.body ? (
          <div className="space-y-4">
            {item.body.split("\n\n").map((p, i) => (
              <p key={i} className="text-sm font-body text-foreground/85 leading-relaxed whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm font-body text-muted-foreground italic">No additional body content.</p>
        )}

        {item.attachments && item.attachments.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-heading text-sm tracking-wider text-foreground uppercase">Attachments</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {item.attachments.map((a, i) => (
                <div key={i} className="hud-border-sm bg-card overflow-hidden">
                  {a.type === "image" && a.url ? (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <AuthenticatedImage src={a.url} alt={a.caption || "attachment"} className="w-full h-full object-cover" />
                    </div>
                  ) : a.type === "video" && a.url ? (
                    <div className="aspect-video bg-muted">
                      <iframe src={a.url} className="w-full h-full" allowFullScreen title={a.caption || "video"} />
                    </div>
                  ) : a.type === "link" && a.url ? (
                    <Link
                      to={a.url}
                      className="flex items-center justify-between gap-2 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-heading text-foreground truncate">
                        {a.caption || a.url}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </Link>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground font-heading tracking-wider">ATTACHMENT</span>
                    </div>
                  )}
                  {(a.type === "image" || a.type === "video") && a.caption && (
                    <div className="p-3">
                      <p className="text-xs font-body text-muted-foreground">{a.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
