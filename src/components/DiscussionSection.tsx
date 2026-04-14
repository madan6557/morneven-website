import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { DiscussionComment } from "@/types";
import { MessageSquare, Reply, Send } from "lucide-react";

interface Props {
  comments: DiscussionComment[];
  onAddComment: (author: string, text: string) => void;
  onAddReply: (commentId: string, author: string, text: string) => void;
  accentColor?: string;
}

export default function DiscussionSection({ comments, onAddComment, onAddReply, accentColor }: Props) {
  const { role, username } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const authorName = username || (role === "guest" ? "Guest" : "User");
  const canComment = role !== "guest";

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    onAddComment(authorName, newComment.trim());
    setNewComment("");
  };

  const handleSubmitReply = (commentId: string) => {
    if (!replyText.trim()) return;
    onAddReply(commentId, authorName, replyText.trim());
    setReplyText("");
    setReplyTo(null);
  };

  const accent = accentColor || "hsl(var(--primary))";

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg tracking-wider text-foreground uppercase flex items-center gap-2">
        <MessageSquare className="h-5 w-5" style={{ color: accent }} />
        Discussion
        <span className="text-xs text-muted-foreground font-body normal-case">({comments.length})</span>
      </h2>

      {/* New comment input */}
      {canComment ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
            placeholder="Add to the discussion..."
            className="flex-1 px-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSubmitComment}
            className="px-3 py-2 text-xs font-display tracking-wider rounded-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent, color: "#fff" }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground font-body italic">Login to join the discussion.</p>
      )}

      {/* Comments list */}
      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground font-body text-center py-4">No discussion yet. Be the first to comment.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="hud-border-sm bg-card p-4 space-y-2" style={{ borderColor: `${accent}20` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading tracking-wider" style={{ color: accent }}>{c.author}</span>
              <span className="text-[10px] text-muted-foreground font-body">{c.date}</span>
            </div>
            <p className="text-sm font-body text-foreground/80">{c.text}</p>

            {/* Replies */}
            {c.replies.length > 0 && (
              <div className="ml-4 border-l-2 pl-3 space-y-2 mt-2" style={{ borderColor: `${accent}30` }}>
                {c.replies.map((r) => (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-heading tracking-wider text-muted-foreground">{r.author}</span>
                      <span className="text-[10px] text-muted-foreground/60 font-body">{r.date}</span>
                    </div>
                    <p className="text-xs font-body text-foreground/70">{r.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply button & input */}
            {canComment && (
              <>
                {replyTo === c.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmitReply(c.id)}
                      placeholder={`Reply to @${c.author}...`}
                      className="flex-1 px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <button onClick={() => handleSubmitReply(c.id)} className="text-xs px-2 py-1 rounded-sm" style={{ backgroundColor: accent, color: "#fff" }}>
                      <Send className="h-3 w-3" />
                    </button>
                    <button onClick={() => { setReplyTo(null); setReplyText(""); }} className="text-xs text-muted-foreground px-2 py-1">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyTo(c.id)}
                    className="flex items-center gap-1 text-[10px] font-heading tracking-wider text-muted-foreground hover:text-foreground transition-colors mt-1"
                  >
                    <Reply className="h-3 w-3" /> REPLY
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
