import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Eye, MessageCircle, Reply, ThumbsDown, ThumbsUp } from "lucide-react";
import { getGalleryItem, addComment, addReply, setGalleryReaction } from "@/services/api";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import type { GalleryItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import MentionInput, { extractMentions, renderWithMentions } from "@/components/MentionInput";
import { formatCompactNumber } from "@/lib/formatNumber";

export default function GalleryDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<GalleryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { role, username } = useAuth();

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (!id) {
      setItem(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    getGalleryItem(id).then((g) => {
      if (!active) return;
      setItem(g ?? null);
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
        <Link to="/gallery" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> BACK TO GALLERY
        </Link>
        <p className="text-sm text-muted-foreground font-body">Gallery item not found.</p>
      </div>
    );
  }

  const handleComment = async () => {
    if (!commentText.trim() || role === "guest") return;
    const text = commentText.trim();
    const updated = await addComment(item.id, username, text, extractMentions(text));
    if (updated) setItem({ ...updated });
    setCommentText("");
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim() || role === "guest") return;
    const text = replyText.trim();
    const updated = await addReply(item.id, commentId, username, text, extractMentions(text));
    if (updated) setItem({ ...updated });
    setReplyText("");
    setReplyingTo(null);
  };

  const handleReaction = async (reaction: "like" | "dislike") => {
    if (role === "guest") return;
    const nextReaction = item.viewerReaction === reaction ? null : reaction;
    const metrics = await setGalleryReaction(item.id, nextReaction);
    setItem((current) => current ? { ...current, ...metrics } : current);
  };

  return (
    <div className="space-y-0">
      {/* Header with back link */}
      <div className="p-6 md:p-8 border-b border-border">
        <Link to="/gallery" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> BACK TO GALLERY
        </Link>
      </div>

      <div className="p-6 md:p-8 space-y-6">
      {/* Media Display */}
      <div className="hud-border bg-card overflow-hidden">
        {item.type === "video" && item.videoUrl ? (
          <div className="aspect-video">
            <iframe
              src={item.videoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={item.title}
            />
          </div>
        ) : item.type === "image" && item.thumbnail ? (
          <div className="aspect-video bg-muted overflow-hidden">
            <AuthenticatedImage src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <span className="text-sm text-muted-foreground font-heading tracking-wider">IMAGE PLACEHOLDER</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-xl tracking-[0.1em] text-primary">{item.title.toUpperCase()}</h1>
        <div className="mecha-line w-32" />
        <p className="text-sm font-body text-foreground/80 leading-relaxed">{item.caption}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-sm border border-border/70 bg-background/50 px-2 py-1 text-[10px] font-display uppercase tracking-[0.08em] text-muted-foreground">
            <Eye className="h-3 w-3" />
            {formatCompactNumber(item.views)} views
          </span>
          <button
            type="button"
            onClick={() => handleReaction("like")}
            disabled={role === "guest"}
            className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-display uppercase tracking-[0.08em] transition-colors ${
              item.viewerReaction === "like"
                ? "border-primary/70 bg-primary/15 text-primary"
                : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/60 hover:text-primary"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <ThumbsUp className="h-3 w-3" />
            {formatCompactNumber(item.likes)}
          </button>
          <button
            type="button"
            onClick={() => handleReaction("dislike")}
            disabled={role === "guest"}
            className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-display uppercase tracking-[0.08em] transition-colors ${
              item.viewerReaction === "dislike"
                ? "border-destructive/70 bg-destructive/15 text-destructive"
                : "border-border/70 bg-background/50 text-muted-foreground hover:border-destructive/60 hover:text-destructive"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <ThumbsDown className="h-3 w-3" />
            {formatCompactNumber(item.dislikes)}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          {item.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-display tracking-wider text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded-sm uppercase">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Comments Section */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg tracking-wider text-foreground uppercase flex items-center gap-2">
          <MessageCircle className="h-4 w-4" /> Discussion ({item.comments.length})
        </h2>
        <div className="mecha-line" />

        {/* Add Comment */}
        {role !== "guest" ? (
          <div className="flex gap-2">
            <MentionInput
              placeholder="Add a comment..."
              value={commentText}
              onChange={setCommentText}
              onSubmit={handleComment}
              className="flex-1"
            />
            <button onClick={handleComment} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-display tracking-wider rounded-sm hover:opacity-90">
              POST
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-body italic">Login to comment.</p>
        )}

        {/* Comments List - newest first */}
        <div className="space-y-4">
          {[...item.comments]
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .map((comment) => (
            <div key={comment.id} className="hud-border-sm bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-heading text-sm text-foreground">{comment.author}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{comment.date}</span>
                </div>
                {role !== "guest" && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Reply className="h-3 w-3" /> Reply
                  </button>
                )}
              </div>
              <p className="text-sm font-body text-foreground/80">{renderWithMentions(comment.text, "hsl(var(--primary))")}</p>

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-4 border-l-2 border-border pl-4 space-y-3">
                  {[...comment.replies]
                    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                    .map((reply) => (
                    <div key={reply.id}>
                      <span className="font-heading text-xs text-foreground">{reply.author}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{reply.date}</span>
                      <p className="text-xs font-body text-foreground/80 mt-1">{renderWithMentions(reply.text, "hsl(var(--primary))")}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="flex gap-2 ml-4">
                  <MentionInput
                    placeholder={`Reply to @${comment.author}...`}
                    value={replyText}
                    onChange={setReplyText}
                    onSubmit={() => handleReply(comment.id)}
                    className="flex-1"
                    size="sm"
                    autoFocus
                  />
                  <button onClick={() => handleReply(comment.id)} className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-display tracking-wider rounded-sm hover:opacity-90">
                    REPLY
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
