import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getTech,
  addTechDiscussionComment,
  addTechDiscussionReply,
  editTechDiscussionComment,
  deleteTechDiscussionComment,
  editTechDiscussionReply,
  deleteTechDiscussionReply,
} from "@/services/api";
import type { Technology, DiscussionComment, DiscussionMention } from "@/types";
import { ArrowLeft, FileText, Info } from "lucide-react";
import DiscussionSection from "@/components/DiscussionSection";
import RedactedBlock from "@/components/RedactedBlock";
import LoreMetaPanel from "@/components/LoreMetaPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TechDetail() {
  const { id } = useParams<{ id: string }>();
  const [tech, setTech] = useState<Technology | null>(null);
  const [discussion, setDiscussion] = useState<DiscussionComment[]>([]);

  useEffect(() => {
    if (id) {
      getTech(id).then((t) => {
        setTech(t ?? null);
        setDiscussion(t?.discussions ?? []);
      });
    }
  }, [id]);

  if (!tech) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;

  const handleAddComment = async (author: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!tech) return;
    const updated = await addTechDiscussionComment(tech.id, author, text, mentions);
    if (!updated) return;
    setTech(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleAddReply = async (
    commentId: string,
    author: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!tech) return;
    const updated = await addTechDiscussionReply(tech.id, commentId, author, text, mentions);
    if (!updated) return;
    setTech(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditComment = async (commentId: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!tech) return;
    const updated = await editTechDiscussionComment(tech.id, commentId, text, mentions);
    if (!updated) return;
    setTech(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!tech) return;
    const updated = await deleteTechDiscussionComment(tech.id, commentId);
    if (!updated) return;
    setTech(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditReply = async (
    commentId: string,
    replyId: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!tech) return;
    const updated = await editTechDiscussionReply(tech.id, commentId, replyId, text, mentions);
    if (!updated) return;
    setTech(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!tech) return;
    const updated = await deleteTechDiscussionReply(tech.id, commentId, replyId);
    if (!updated) return;
    setTech(updated);
    setDiscussion(updated.discussions ?? []);
  };

  return (
    <div className="space-y-0">
      <div className="relative h-64 md:h-80 overflow-hidden flex items-end" style={tech.thumbnail ? { backgroundImage: `url(${tech.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "var(--color-muted)" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
        {!tech.thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl text-muted-foreground/10 tracking-[0.3em]">TECH</span>
          </div>
        )}
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview" className="text-[11px] font-heading tracking-wider uppercase">
              <FileText className="h-3 w-3 mr-1.5" /> Specifications
            </TabsTrigger>
            <TabsTrigger value="metadata" className="text-[11px] font-heading tracking-wider uppercase">
              <Info className="h-3 w-3 mr-1.5" /> Metadata
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <div className="max-w-3xl space-y-4">
              <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Technical Specifications</h2>
              <RedactedBlock fullDesc={tech.fullDesc} paragraphClass="text-sm font-body text-foreground/80 leading-relaxed" />
            </div>
          </TabsContent>
          <TabsContent value="metadata" className="mt-6">
            <LoreMetaPanel meta={tech.meta} fallbackCreator={tech.contributor} />
          </TabsContent>
        </Tabs>

        {tech.docs.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Documentation</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {tech.docs.map((doc, i) => (
                <div key={i} className="hud-border-sm bg-card overflow-hidden">
                  {doc.type === "video" && doc.url ? (
                    <div className="aspect-video bg-muted">
                      <iframe
                        src={doc.url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`${tech.name} Documentation`}
                      />
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
                  <div className="p-3">
                    <p className="text-xs font-body text-muted-foreground">{doc.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mecha-line" />
        <DiscussionSection
          comments={discussion}
          onAddComment={handleAddComment}
          onAddReply={handleAddReply}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onEditReply={handleEditReply}
          onDeleteReply={handleDeleteReply}
        />
      </div>
    </div>
  );
}
