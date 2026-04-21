import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getOther } from "@/services/api";
import type { OtherLore, DiscussionComment } from "@/types";
import { ArrowLeft } from "lucide-react";
import DiscussionSection from "@/components/DiscussionSection";
import RedactedBlock from "@/components/RedactedBlock";

export default function OtherDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OtherLore | null>(null);
  const [discussion, setDiscussion] = useState<DiscussionComment[]>([]);

  useEffect(() => {
    if (id) getOther(id).then((o) => setItem(o ?? null));
  }, [id]);

  if (!item) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;

  const handleAddComment = (author: string, text: string) => {
    setDiscussion((prev) => [...prev, { id: `dc-${Date.now()}`, author, text, date: new Date().toISOString().split("T")[0], replies: [] }]);
  };
  const handleAddReply = (commentId: string, author: string, text: string) => {
    setDiscussion((prev) => prev.map((c) => c.id === commentId ? { ...c, replies: [...c.replies, { id: `dr-${Date.now()}`, author, text, date: new Date().toISOString().split("T")[0] }] } : c));
  };

  return (
    <div className="space-y-0">
      <div className="relative h-48 md:h-64 overflow-hidden flex items-end" style={item.thumbnail ? { backgroundImage: `url(${item.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "var(--color-muted)" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link to="/lore/other" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" /> BACK TO LORE
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">{item.title.toUpperCase()}</h1>
          <p className="text-xs font-display tracking-wider text-accent-orange uppercase mt-1">{item.category}</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="mecha-line" />
        <div className="max-w-3xl space-y-4">
          <RedactedBlock fullDesc={item.fullDesc} />
        </div>

        {item.docs && item.docs.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Documentation</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {item.docs.map((doc, i) => (
                <div key={i} className="hud-border-sm bg-card overflow-hidden">
                  {doc.type === "video" && doc.url ? (
                    <div className="aspect-video bg-muted">
                      <iframe src={doc.url} className="w-full h-full" allowFullScreen title={`${item.title} doc`} />
                    </div>
                  ) : doc.type === "image" && doc.url ? (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img src={doc.url} alt={doc.caption} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground font-heading tracking-wider">{doc.type === "video" ? "▶ VIDEO" : "IMAGE"}</span>
                    </div>
                  )}
                  <div className="p-3"><p className="text-xs font-body text-muted-foreground">{doc.caption}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mecha-line" />
        <DiscussionSection comments={discussion} onAddComment={handleAddComment} onAddReply={handleAddReply} />
      </div>
    </div>
  );
}
