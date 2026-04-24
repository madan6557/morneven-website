import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { DiscussionComment, DiscussionMention } from "@/types";
import { MessageSquare, Reply, Send, Pencil, Trash2, Check, X } from "lucide-react";
import MentionInput, { extractMentions, renderWithMentions } from "@/components/MentionInput";

interface Props {
  comments: DiscussionComment[];
  onAddComment: (author: string, text: string, mentions?: DiscussionMention[]) => void | Promise<void>;
  onAddReply: (commentId: string, author: string, text: string, mentions?: DiscussionMention[]) => void | Promise<void>;
  onEditComment?: (commentId: string, text: string, mentions?: DiscussionMention[]) => void | Promise<void>;
  onDeleteComment?: (commentId: string) => void;
  onEditReply?: (commentId: string, replyId: string, text: string, mentions?: DiscussionMention[]) => void | Promise<void>;
  onDeleteReply?: (commentId: string, replyId: string) => void;
  accentColor?: string;
}

export default function DiscussionSection({
  comments,
  onAddComment,
  onAddReply,
  onEditComment,
  onDeleteComment,
  onEditReply,
  onDeleteReply,
  accentColor,
}: Props) {
  const { role, username } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const authorName = username || (role === "guest" ? "Guest" : "User");
  const canComment = role !== "guest";
  const isAuthor = role === "author";

  const canModify = (commentAuthor: string) => isAuthor || commentAuthor === username;

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    const text = newComment.trim();
    onAddComment(authorName, text, extractMentions(text));
    setNewComment("");
  };

  const handleSubmitReply = (commentId: string) => {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    onAddReply(commentId, authorName, text, extractMentions(text));
    setReplyText("");
    setReplyTo(null);
  };

  const startEditComment = (id: string, currentText: string) => {
    setEditingComment(id);
    setEditingReply(null);
    setEditText(currentText);
  };

  const startEditReply = (replyId: string, currentText: string) => {
    setEditingReply(replyId);
    setEditingComment(null);
    setEditText(currentText);
  };

  const saveEditComment = (id: string) => {
    if (!editText.trim() || !onEditComment) return;
    const text = editText.trim();
    onEditComment(id, text, extractMentions(text));
    setEditingComment(null);
    setEditText("");
  };

  const saveEditReply = (commentId: string, replyId: string) => {
    if (!editText.trim() || !onEditReply) return;
    const text = editText.trim();
    onEditReply(commentId, replyId, text, extractMentions(text));
    setEditingReply(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditingReply(null);
    setEditText("");
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
          <MentionInput
            value={newComment}
            onChange={setNewComment}
            onSubmit={handleSubmitComment}
            placeholder="Add to the discussion... use @ to mention personnel"
            className="flex-1"
            accentColor={accent}
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

      {/* Comments list — newest first. Sort by parsable date desc when
          available, otherwise fall back to original (insertion) order
          reversed. */}
      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground font-body text-center py-4">No discussion yet. Be the first to comment.</p>
        )}
        {[...comments]
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
          .map((c) => (
          <div key={c.id} className="hud-border-sm bg-card p-4 space-y-2" style={{ borderColor: `${accent}20` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading tracking-wider" style={{ color: accent }}>{c.author}</span>
                <span className="text-[10px] text-muted-foreground font-body">{c.date}</span>
              </div>
              {canModify(c.author) && editingComment !== c.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditComment(c.id, c.text)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDeleteComment?.(c.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {editingComment === c.id ? (
              <div className="flex gap-2">
                <MentionInput
                  value={editText}
                  onChange={setEditText}
                  onSubmit={() => saveEditComment(c.id)}
                  className="flex-1"
                  accentColor={accent}
                  autoFocus
                />
                <button onClick={() => saveEditComment(c.id)} className="text-xs px-2 py-1 rounded-sm" style={{ backgroundColor: accent, color: "#fff" }} title="Save">
                  <Check className="h-3 w-3" />
                </button>
                <button onClick={cancelEdit} className="text-xs text-muted-foreground px-2 py-1" title="Cancel">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-body text-foreground/80">{renderWithMentions(c.text, accent)}</p>
            )}

            {/* Replies */}
            {c.replies.length > 0 && (
              <div className="ml-4 border-l-2 pl-3 space-y-2 mt-2" style={{ borderColor: `${accent}30` }}>
                {c.replies.map((r) => (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-heading tracking-wider text-muted-foreground">{r.author}</span>
                        <span className="text-[10px] text-muted-foreground/60 font-body">{r.date}</span>
                      </div>
                      {canModify(r.author) && editingReply !== r.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditReply(r.id, r.text)}
                            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={() => onDeleteReply?.(c.id, r.id)}
                            className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {editingReply === r.id ? (
                      <div className="flex gap-2">
                        <MentionInput
                          value={editText}
                          onChange={setEditText}
                          onSubmit={() => saveEditReply(c.id, r.id)}
                          className="flex-1"
                          size="sm"
                          accentColor={accent}
                          autoFocus
                        />
                        <button onClick={() => saveEditReply(c.id, r.id)} className="text-xs px-2 py-1 rounded-sm" style={{ backgroundColor: accent, color: "#fff" }} title="Save">
                          <Check className="h-3 w-3" />
                        </button>
                        <button onClick={cancelEdit} className="text-xs text-muted-foreground px-2 py-1" title="Cancel">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-body text-foreground/70">{renderWithMentions(r.text, accent)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Reply button & input */}
            {canComment && (
              <>
                {replyTo === c.id ? (
                  <div className="flex gap-2 mt-2">
                    <MentionInput
                      value={replyText}
                      onChange={setReplyText}
                      onSubmit={() => handleSubmitReply(c.id)}
                      placeholder={`Reply to @${c.author}... use @ to mention`}
                      className="flex-1"
                      size="sm"
                      accentColor={accent}
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
