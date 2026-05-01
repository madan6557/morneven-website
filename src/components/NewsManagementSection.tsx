import { useEffect, useRef, useState } from "react";
import {
  getNewsPage,
  createNews,
  updateNews,
  deleteNews,
} from "@/services/newsApi";
import type { PageInfo } from "@/services/pagination";
import type { NewsItem, NewsAttachment } from "@/types";
import { Pencil, Trash2, Plus, X, Save, Calendar, Image, Video, Link as LinkIcon, FileText } from "lucide-react";

const inputClass =
  "w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "font-heading text-xs tracking-wider text-muted-foreground uppercase";

const todayStr = () => new Date().toISOString().split("T")[0];
const NEWS_PAGE_SIZE = 25;

type EditState = {
  id?: string;
  text: string;
  date: string;
  hasDetail: boolean;
  thumbnail: string;
  body: string;
  attachments: NewsAttachment[];
};

const blank = (): EditState => ({
  text: "",
  date: todayStr(),
  hasDetail: false,
  thumbnail: "",
  body: "",
  attachments: [],
});

export default function NewsManagementSection() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const editFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editing) return;
    const id = window.requestAnimationFrame(() => {
      editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [editing]);

  async function load(reset = false) {
    const page = reset ? 1 : (pageInfo?.page ?? 1) + 1;
    setLoading(true);
    try {
      const response = await getNewsPage({ page, pageSize: NEWS_PAGE_SIZE });
      setItems((current) => reset ? response.items : [...current, ...response.items]);
      setPageInfo(response.pageInfo);
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setIsCreating(true);
    setEditing(blank());
  }

  function startEdit(n: NewsItem) {
    setIsCreating(false);
    setEditing({
      id: n.id,
      text: n.text,
      date: n.date,
      hasDetail: Boolean(n.hasDetail),
      thumbnail: n.thumbnail ?? "",
      body: n.body ?? "",
      attachments: n.attachments ? [...n.attachments] : [],
    });
  }

  async function save() {
    if (!editing) return;
    const payload: Omit<NewsItem, "id"> = {
      text: editing.text,
      date: editing.date,
      hasDetail: editing.hasDetail,
      thumbnail: editing.thumbnail || undefined,
      body: editing.hasDetail ? editing.body : undefined,
      attachments: editing.hasDetail && editing.attachments.length > 0 ? editing.attachments : undefined,
    };
    if (isCreating) await createNews(payload);
    else if (editing.id) await updateNews(editing.id, payload);
    setEditing(null);
    setIsCreating(false);
    await load(true);
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete news "${title}"? This cannot be undone.`)) return;
    await deleteNews(id);
    await load(true);
  }

  function addAttachment(type: NewsAttachment["type"]) {
    if (!editing) return;
    setEditing({
      ...editing,
      attachments: [...editing.attachments, { type, url: "", caption: "" }],
    });
  }

  function updateAttachment(idx: number, patch: Partial<NewsAttachment>) {
    if (!editing) return;
    const next = [...editing.attachments];
    next[idx] = { ...next[idx], ...patch };
    setEditing({ ...editing, attachments: next });
  }

  function removeAttachment(idx: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      attachments: editing.attachments.filter((_, i) => i !== idx),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={startCreate}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground bg-primary rounded-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3 w-3" /> CREATE NEWS
        </button>
      </div>

      {editing && (
        <div ref={editFormRef} className="hud-border bg-card p-6 space-y-4 scroll-mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm tracking-wider text-accent-orange uppercase">
              {isCreating ? "Create New" : "Edit"} News
            </h3>
            <button onClick={() => { setEditing(null); setIsCreating(false); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>Headline</label>
              <input
                type="text"
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                className={inputClass}
                placeholder="e.g. Patch 0.4.2 deployed for Project Aethon"
              />
            </div>

            <div>
              <label className={labelClass}>Date</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  className={inputClass + " mt-0"}
                />
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, date: todayStr() })}
                  className="flex items-center gap-1 px-2 py-2 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0"
                  title="Set to today"
                >
                  <Calendar className="h-3 w-3" /> TODAY
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                id="news-has-detail"
                type="checkbox"
                checked={editing.hasDetail}
                onChange={(e) => setEditing({ ...editing, hasDetail: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              <label htmlFor="news-has-detail" className="text-sm font-body text-foreground cursor-pointer">
                Enable detail page (allows body and attachments)
              </label>
            </div>
          </div>

          {editing.hasDetail && (
            <>
              <div>
                <label className={labelClass}>Thumbnail URL (optional)</label>
                <input
                  type="text"
                  value={editing.thumbnail}
                  onChange={(e) => setEditing({ ...editing, thumbnail: e.target.value })}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className={labelClass}>Body (Markdown-friendly. Blank lines start new paragraphs.)</label>
                <textarea
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={6}
                  className={inputClass + " resize-y min-h-[140px]"}
                  placeholder="Detailed news content..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Attachments</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => addAttachment("image")}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Image className="h-3 w-3" /> IMAGE
                    </button>
                    <button
                      onClick={() => addAttachment("video")}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Video className="h-3 w-3" /> VIDEO
                    </button>
                    <button
                      onClick={() => addAttachment("link")}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <LinkIcon className="h-3 w-3" /> LINK
                    </button>
                  </div>
                </div>

                {editing.attachments.length === 0 && (
                  <p className="text-[11px] font-body text-muted-foreground italic">
                    No attachments yet.
                  </p>
                )}

                {editing.attachments.map((a, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2 items-center">
                        <select
                          value={a.type}
                          onChange={(e) => updateAttachment(idx, { type: e.target.value as NewsAttachment["type"] })}
                          className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground"
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                          <option value="link">Link</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={a.url}
                        onChange={(e) => updateAttachment(idx, { url: e.target.value })}
                        placeholder={a.type === "link" ? "/lore/characters/char-007 or https://..." : "URL or embed src"}
                        className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground"
                      />
                      <input
                        type="text"
                        value={a.caption ?? ""}
                        onChange={(e) => updateAttachment(idx, { caption: e.target.value })}
                        placeholder="Caption (optional)"
                        className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground"
                      />
                    </div>
                    <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive mt-1">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setEditing(null); setIsCreating(false); }}
              className="px-4 py-2 text-xs font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={save}
              className="flex items-center gap-1 px-4 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity"
            >
              <Save className="h-3 w-3" /> SAVE
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground font-body italic">No news entries yet.</p>
        )}
        {items.map((n) => (
          <div key={n.id} className="hud-border-sm bg-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-heading text-foreground truncate">{n.text}</p>
                {n.hasDetail && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-display tracking-wider uppercase px-1.5 py-0.5 rounded-sm border border-primary/40 text-primary">
                    <FileText className="h-2.5 w-2.5" /> Detail
                  </span>
                )}
              </div>
              <p className="text-[10px] font-display tracking-wider text-muted-foreground mt-0.5">{n.date}</p>
            </div>
            <button onClick={() => startEdit(n)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => remove(n.id, n.text)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {loading && (
          <p className="text-sm text-muted-foreground font-body italic py-2">Loading news...</p>
        )}
        {pageInfo?.hasNextPage && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-[11px] font-display tracking-wider text-muted-foreground uppercase">
              Showing {items.length} of {pageInfo.total}
            </p>
            <button
              type="button"
              onClick={() => load(false)}
              disabled={loading}
              className="px-4 py-2 text-xs font-display tracking-wider border border-primary text-primary rounded-sm hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary transition-colors"
            >
              LOAD MORE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
