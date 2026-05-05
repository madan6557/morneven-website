import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getOther,
  addOtherDiscussionComment,
  addOtherDiscussionReply,
  editOtherDiscussionComment,
  deleteOtherDiscussionComment,
  editOtherDiscussionReply,
  deleteOtherDiscussionReply,
} from "@/services/api";
import type { OtherLore, DiscussionComment, DiscussionMention } from "@/types";
import { ArrowLeft, FileText, Info } from "lucide-react";
import DiscussionSection from "@/components/DiscussionSection";
import { SkillList } from "@/components/SkillCard";
import RedactedBlock from "@/components/RedactedBlock";
import LoreMetaPanel from "@/components/LoreMetaPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OtherDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<OtherLore | null>(null);
  const [loading, setLoading] = useState(true);
  const [discussion, setDiscussion] = useState<DiscussionComment[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (!id) {
      setItem(null);
      setDiscussion([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    getOther(id).then((o) => {
      if (!active) return;
      setItem(o ?? null);
      setDiscussion(o?.discussions ?? []);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;

  if (!item) {
    return (
      <div className="p-8 space-y-3">
        <Link to="/lore/other" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> BACK TO OTHER
        </Link>
        <p className="text-sm text-muted-foreground font-body">Lore entry not found.</p>
      </div>
    );
  }

  const handleAddComment = async (author: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!item) return;
    const updated = await addOtherDiscussionComment(item.id, author, text, mentions);
    if (!updated) return;
    setItem(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleAddReply = async (
    commentId: string,
    author: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!item) return;
    const updated = await addOtherDiscussionReply(item.id, commentId, author, text, mentions);
    if (!updated) return;
    setItem(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditComment = async (commentId: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!item) return;
    const updated = await editOtherDiscussionComment(item.id, commentId, text, mentions);
    if (!updated) return;
    setItem(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!item) return;
    const updated = await deleteOtherDiscussionComment(item.id, commentId);
    if (!updated) return;
    setItem(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditReply = async (
    commentId: string,
    replyId: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!item) return;
    const updated = await editOtherDiscussionReply(item.id, commentId, replyId, text, mentions);
    if (!updated) return;
    setItem(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!item) return;
    const updated = await deleteOtherDiscussionReply(item.id, commentId, replyId);
    if (!updated) return;
    setItem(updated);
    setDiscussion(updated.discussions ?? []);
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
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview" className="text-[11px] font-heading tracking-wider uppercase">
              <FileText className="h-3 w-3 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="metadata" className="text-[11px] font-heading tracking-wider uppercase">
              <Info className="h-3 w-3 mr-1.5" /> Metadata
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <div className="max-w-3xl space-y-4">
              <RedactedBlock fullDesc={item.fullDesc} />
            </div>
          </TabsContent>
          <TabsContent value="metadata" className="mt-6">
            <LoreMetaPanel meta={item.meta} fallbackCreator={item.contributor} />
          </TabsContent>
        </Tabs>

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
                  ) : doc.type === "file" && doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="aspect-video bg-muted flex flex-col items-center justify-center gap-2 hover:bg-muted/80 transition-colors">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-heading tracking-wider">FILE</span>
                    </a>
                  ) : doc.type === "image" && doc.url ? (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img src={doc.url} alt={doc.caption} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground font-heading tracking-wider">{doc.type === "video" ? "▶ VIDEO" : doc.type === "file" ? "FILE" : "IMAGE"}</span>
                    </div>
                  )}
                  <div className="p-3"><p className="text-xs font-body text-muted-foreground">{doc.caption}</p></div>
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
