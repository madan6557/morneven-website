import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  getCharacter,
  addCharacterDiscussionComment,
  addCharacterDiscussionReply,
  editCharacterDiscussionComment,
  deleteCharacterDiscussionComment,
  editCharacterDiscussionReply,
  deleteCharacterDiscussionReply,
} from "@/services/api";
import { getProxyUrl } from "@/services/fileProxyService";
import type { Character, DiscussionComment, DiscussionMention, LoreFieldNote } from "@/types";
import { ArrowLeft, Heart, Frown, FileText, BookOpen, Award, NotebookPen, Info } from "lucide-react";
import DiscussionSection from "@/components/DiscussionSection";
import RedactedBlock from "@/components/RedactedBlock";
import LoreMetaPanel from "@/components/LoreMetaPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillList } from "@/components/SkillCard";
import StatsRadar from "@/components/StatsRadar";
import { averageScore, STAT_DETAIL_AXES, STAT_DETAIL_LABELS, toCharacterPrimaryStats, type StatCategoryKey } from "@/lib/statDetails";

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const [char, setChar] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [discussion, setDiscussion] = useState<DiscussionComment[]>([]);
  const [selectedStatDetail, setSelectedStatDetail] = useState<StatCategoryKey | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (!id) {
      setChar(null);
      setDiscussion([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    getCharacter(id).then((c) => {
      if (!active) return;
      setChar(c ?? null);
      setDiscussion(c?.discussions ?? []);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;

  if (!char) {
    return (
      <div className="p-8 space-y-3">
        <Link to="/lore/characters" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> BACK TO CHARACTERS
        </Link>
        <p className="text-sm text-muted-foreground font-body">Character not found.</p>
      </div>
    );
  }

  const accentColor = char.accentColor;
  const contributions = char.contributions ?? [];

  const handleAddComment = async (author: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!char) return;
    const updated = await addCharacterDiscussionComment(char.id, author, text, mentions);
    if (!updated) return;
    setChar(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleAddReply = async (
    commentId: string,
    author: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!char) return;
    const updated = await addCharacterDiscussionReply(char.id, commentId, author, text, mentions);
    if (!updated) return;
    setChar(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditComment = async (commentId: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!char) return;
    const updated = await editCharacterDiscussionComment(char.id, commentId, text, mentions);
    if (!updated) return;
    setChar(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!char) return;
    const updated = await deleteCharacterDiscussionComment(char.id, commentId);
    if (!updated) return;
    setChar(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditReply = async (
    commentId: string,
    replyId: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!char) return;
    const updated = await editCharacterDiscussionReply(char.id, commentId, replyId, text, mentions);
    if (!updated) return;
    setChar(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!char) return;
    const updated = await deleteCharacterDiscussionReply(char.id, commentId, replyId);
    if (!updated) return;
    setChar(updated);
    setDiscussion(updated.discussions ?? []);
  };

  return (
    <div className="space-y-0" style={{ "--char-accent": accentColor } as React.CSSProperties}>
      {/* Parallax header with custom accent and thumbnail */}
      <div className="relative h-72 md:h-96 overflow-hidden flex items-end" style={char.thumbnail ? { backgroundImage: `url(${getProxyUrl(char.thumbnail)})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "var(--color-muted)" }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accentColor}15, transparent 60%)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
        {!char.thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-8xl opacity-5 tracking-[0.3em]" style={{ color: accentColor }}>{char.name.split(" ")[0].toUpperCase()}</span>
          </div>
        )}
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link to="/lore" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" /> BACK TO LORE
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em]" style={{ color: accentColor }}>{char.name.toUpperCase()}</h1>
          <p className="text-sm font-heading tracking-wider text-muted-foreground mt-1">{char.race}</p>
          {char.occupation && (
            <p className="text-xs font-display tracking-[0.15em] uppercase mt-1" style={{ color: accentColor }}>{char.occupation}</p>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${accentColor}50, transparent)` }} />

        {/* Quick-read profile strip */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="hud-border bg-card p-4 space-y-1" style={{ borderColor: `${accentColor}30` }}>
            <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Race</p>
            <p className="text-sm font-body text-foreground">{char.race}</p>
          </div>
          <div className="hud-border bg-card p-4 space-y-1" style={{ borderColor: `${accentColor}30` }}>
            <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Height</p>
            <p className="text-sm font-body text-foreground">{char.height}</p>
          </div>
          <div className="hud-border bg-card p-4 space-y-1" style={{ borderColor: `${accentColor}30` }}>
            <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Occupation</p>
            <p className="text-sm font-body text-foreground">{char.occupation || " - "}</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Stats & Info (always visible sidebar) */}
          <div className="space-y-6">
            {/* Stats bars */}
            <div className="hud-border bg-card p-5 space-y-4" style={{ borderColor: `${accentColor}30` }}>
              {(() => {
                const primaryStats = toCharacterPrimaryStats(char.stats);
                const overall = averageScore(Object.values(primaryStats));
                return (
                  <>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-heading text-sm tracking-[0.15em] uppercase" style={{ color: accentColor }}>Combat Stats</h3>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Overall</span>
                        <span className="font-display text-lg leading-none" style={{ color: accentColor }}>{overall}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(primaryStats).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between items-center gap-2 text-xs font-heading">
                            <span className="text-muted-foreground uppercase tracking-wider">{key}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedStatDetail(key as StatCategoryKey)}
                                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Stat Detail
                              </button>
                              <span className="text-foreground">{value}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${value}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: accentColor }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedStatDetail && (
                      <div className="pt-2 border-t border-border/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-display tracking-wider uppercase text-muted-foreground">
                            {STAT_DETAIL_LABELS[selectedStatDetail]} Breakdown
                          </p>
                          <button type="button" onClick={() => setSelectedStatDetail(null)} className="text-[10px] uppercase text-muted-foreground hover:text-foreground">Close</button>
                        </div>
                        <StatsRadar stats={STAT_DETAIL_AXES[selectedStatDetail]} color={accentColor} />
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Traits */}
            <div className="hud-border bg-card p-5 space-y-3" style={{ borderColor: `${accentColor}30` }}>
              <h3 className="font-heading text-sm tracking-[0.15em] uppercase" style={{ color: accentColor }}>Traits</h3>
              <div className="flex flex-wrap gap-2">
                {char.traits.map((t) => (
                  <span key={t} className="text-[10px] font-display tracking-wider px-2 py-1 rounded-sm border" style={{ color: accentColor, borderColor: `${accentColor}40`, backgroundColor: `${accentColor}10` }}>
                    {t.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Likes/Dislikes */}
            <div className="hud-border bg-card p-5 space-y-3" style={{ borderColor: `${accentColor}30` }}>
              <div className="space-y-3">
                <div>
                  <h4 className="font-heading text-xs tracking-wider text-muted-foreground uppercase flex items-center gap-1 mb-2"><Heart className="h-3 w-3" style={{ color: accentColor }} /> Likes</h4>
                  <div className="flex flex-wrap gap-1">
                    {char.likes.map((l) => (
                      <span key={l} className="text-[10px] font-body text-foreground/70 bg-muted px-2 py-0.5 rounded-sm">{l}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-heading text-xs tracking-wider text-muted-foreground uppercase flex items-center gap-1 mb-2"><Frown className="h-3 w-3 text-destructive" /> Dislikes</h4>
                  <div className="flex flex-wrap gap-1">
                    {char.dislikes.map((d) => (
                      <span key={d} className="text-[10px] font-body text-foreground/70 bg-muted px-2 py-0.5 rounded-sm">{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Tabbed sections */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList
                className="grid w-full grid-cols-2 gap-1 h-auto sm:h-10 sm:grid-cols-5 sm:w-auto sm:inline-flex sm:gap-0 [&>[data-state=active]]:text-[color:var(--char-accent)] [&>[data-state=active]]:shadow-[inset_0_-2px_0_0_var(--char-accent)]"
                style={{ borderColor: `${accentColor}30` }}
              >
                <TabsTrigger value="overview" className="text-[11px] font-heading tracking-wider uppercase">
                  <FileText className="h-3 w-3 mr-1.5" /> Overview
                </TabsTrigger>
                <TabsTrigger value="background" className="text-[11px] font-heading tracking-wider uppercase">
                  <BookOpen className="h-3 w-3 mr-1.5" /> Background
                </TabsTrigger>
                <TabsTrigger value="contributions" className="text-[11px] font-heading tracking-wider uppercase">
                  <Award className="h-3 w-3 mr-1.5" /> Contributions
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-[11px] font-heading tracking-wider uppercase">
                  <NotebookPen className="h-3 w-3 mr-1.5" /> Notes
                </TabsTrigger>
                <TabsTrigger value="metadata" className="text-[11px] font-heading tracking-wider uppercase">
                  <Info className="h-3 w-3 mr-1.5" /> Metadata
                </TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="mt-6 space-y-4">
                <h2 className="font-heading text-lg tracking-wider text-foreground uppercase border-b pb-2" style={{ borderColor: `${accentColor}30` }}>Field Brief</h2>
                <p className="text-sm font-body text-foreground/90 italic border-l-2 pl-4" style={{ borderColor: accentColor }}>
                  {char.shortDesc}
                </p>
              </TabsContent>

              {/* Background */}
              <TabsContent value="background" className="mt-6 space-y-6">
                <div className="space-y-4">
                  <h2 className="font-heading text-lg tracking-wider text-foreground uppercase border-b pb-2" style={{ borderColor: `${accentColor}30` }}>Background</h2>
                  <RedactedBlock fullDesc={char.fullDesc} paragraphClass="text-sm font-body text-foreground/80 leading-relaxed" />
                </div>
              </TabsContent>

              {/* Contributions */}
              <TabsContent value="contributions" className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg tracking-wider text-foreground uppercase flex items-center gap-2">
                    <Award className="h-4 w-4" style={{ color: accentColor }} /> Contributions
                  </h2>
                  <span className="text-xs text-muted-foreground font-body">{contributions.length} entr{contributions.length === 1 ? "y" : "ies"}</span>
                </div>
                {contributions.length === 0 ? (
                  <div className="hud-border bg-card p-6 text-center" style={{ borderColor: `${accentColor}20` }}>
                    <p className="text-sm font-body text-muted-foreground">No catalogued contributions on file.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contributions.map((c) => (
                      <div key={c.id} className="hud-border bg-card p-4 space-y-2" style={{ borderColor: `${accentColor}30` }}>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-heading text-sm tracking-wider text-foreground uppercase">{c.title}</h3>
                          {c.date && <span className="text-[10px] font-display tracking-wider text-muted-foreground whitespace-nowrap">{c.date}</span>}
                        </div>
                        <p className="text-sm font-body text-foreground/80 leading-relaxed">{c.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Notes */}
              <TabsContent value="notes" className="mt-6 space-y-4">
                <FieldNoteList title="Field Notes" items={char.fieldNotes ?? []} accent={accentColor} />
                <FieldNoteList title="Observations" items={char.observations ?? []} accent={accentColor} />
              </TabsContent>

              {/* Metadata */}
              <TabsContent value="metadata" className="mt-6">
                <LoreMetaPanel meta={char.meta} fallbackCreator={char.contributor} accentColor={accentColor} />
              </TabsContent>
            </Tabs>

            {/* Skills - living entity */}
            <div className="pt-6">
              <SkillList items={char.skills} accent={accentColor} variant="skill" />
            </div>

            {/* Documentation - always visible (outside tabs) */}
            {char.docs && char.docs.length > 0 && (
              <div className="space-y-4 pt-6">
                <h2 className="font-heading text-lg tracking-wider text-foreground uppercase border-b pb-2" style={{ borderColor: `${accentColor}30` }}>Documentation</h2>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  {char.docs.map((doc, i) => (
                    <div key={i} className="hud-border-sm bg-card overflow-hidden" style={{ borderColor: `${accentColor}20` }}>
                      {doc.type === "video" && doc.url ? (
                        <div className="aspect-video bg-muted">
                          <iframe
                            src={doc.url}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={`${char.name} Documentation`}
                          />
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
                      <div className="p-3">
                        <p className="text-xs font-body text-muted-foreground">{doc.caption}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discussion Section - standalone, outside tabs */}
            <div className="space-y-4 pt-6">
              <DiscussionSection
                comments={discussion}
                onAddComment={handleAddComment}
                onAddReply={handleAddReply}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                onEditReply={handleEditReply}
                onDeleteReply={handleDeleteReply}
                accentColor={accentColor}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldNoteList({ title, items, accent }: { title: string; items: LoreFieldNote[]; accent: string }) {
  if (items.length === 0) {
    return (
      <div className="hud-border bg-card p-6 text-center" style={{ borderColor: `${accent}30` }}>
        <NotebookPen className="h-5 w-5 mx-auto mb-2" style={{ color: accent }} />
        <p className="text-xs font-heading tracking-wider text-muted-foreground uppercase">{title}</p>
        <p className="mt-2 text-sm font-body text-muted-foreground italic">No entries recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-heading tracking-wider text-muted-foreground uppercase">{title}</p>
      {items.map((item) => (
        <div key={item.id} className="hud-border bg-card p-4 space-y-2" style={{ borderColor: `${accent}25` }}>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <h3 className="font-heading text-sm tracking-wider text-foreground uppercase">{item.title}</h3>
            {item.date && <span className="text-[10px] font-display tracking-wider text-muted-foreground">{item.date}</span>}
          </div>
          <p className="text-sm font-body text-foreground/80 leading-relaxed whitespace-pre-line">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
