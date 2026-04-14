import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTech } from "@/services/api";
import type { Technology, DiscussionComment } from "@/types";
import { ArrowLeft } from "lucide-react";
import DiscussionSection from "@/components/DiscussionSection";

export default function TechDetail() {
  const { id } = useParams<{ id: string }>();
  const [tech, setTech] = useState<Technology | null>(null);
  const [discussion, setDiscussion] = useState<DiscussionComment[]>([]);

  useEffect(() => {
    if (id) getTech(id).then((t) => setTech(t ?? null));
  }, [id]);

  if (!tech) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;

  const handleAddComment = (author: string, text: string) => {
    setDiscussion((prev) => [...prev, { id: `dc-${Date.now()}`, author, text, date: new Date().toISOString().split("T")[0], replies: [] }]);
  };
  const handleAddReply = (commentId: string, author: string, text: string) => {
    setDiscussion((prev) => prev.map((c) => c.id === commentId ? { ...c, replies: [...c.replies, { id: `dr-${Date.now()}`, author, text, date: new Date().toISOString().split("T")[0] }] } : c));
  };

  return (
    <div className="space-y-0">
      <div className="relative h-64 md:h-80 bg-muted overflow-hidden flex items-end">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-6xl text-muted-foreground/10 tracking-[0.3em]">TECH</span>
        </div>
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link to="/lore" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" /> BACK TO LORE
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">{tech.name.toUpperCase()}</h1>
          <p className="text-xs font-display tracking-wider text-accent-orange uppercase mt-1">{tech.category}</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="mecha-line" />
        <div className="max-w-3xl space-y-4">
          <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Technical Specifications</h2>
          {tech.fullDesc.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm font-body text-foreground/80 leading-relaxed">{para}</p>
          ))}
        </div>

        {tech.docs.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Documentation</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {tech.docs.map((doc, i) => (
                <div key={i} className="hud-border-sm bg-card overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground font-heading tracking-wider">{doc.type === "video" ? "▶ VIDEO" : "IMAGE"}</span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-body text-muted-foreground">{doc.caption}</p>
                  </div>
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
