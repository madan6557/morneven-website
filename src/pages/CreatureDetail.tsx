import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getCreature,
  addCreatureDiscussionComment,
  addCreatureDiscussionReply,
  editCreatureDiscussionComment,
  deleteCreatureDiscussionComment,
  editCreatureDiscussionReply,
  deleteCreatureDiscussionReply,
} from "@/services/api";
import { getProxyUrl } from "@/services/fileProxyService";
import type { Creature, DiscussionComment, DiscussionMention, LoreFieldNote } from "@/types";
import { ArrowLeft, ShieldAlert, FileText, MapPin, NotebookPen, ExternalLink, Info } from "lucide-react";
import DiscussionSection from "@/components/DiscussionSection";
import RedactedBlock from "@/components/RedactedBlock";
import LoreMetaPanel from "@/components/LoreMetaPanel";
import { gecChipClass, GEC_LORE_ID } from "@/lib/gec";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const dangerLabel: Record<number, string> = {
  1: "DL-1 - Negligible",
  2: "DL-2 - Cautionary",
  3: "DL-3 - Hostile",
  4: "DL-4 - Lethal",
  5: "DL-5 - Existential",
};

// GEC tier → Morneven doctrine snippet shown as a linked chip on the detail page
const gecTierDoctrine: Record<string, { protocol: string; summary: string }> = {
  amorphous: {
    protocol: "Routine Survey",
    summary: "Stable / passive entity. Observation only unless expansion path is obstructed.",
  },
  crystalline: {
    protocol: "Tactical Analysis",
    summary: "Reactive / predatory. Identify Fracture Points from range before engagement.",
  },
  metamorphic: {
    protocol: "High-Intensity Suppression",
    summary: "Adaptive / hostile. Saturate before the entity completes its adaptive cycle.",
  },
  catalyst: {
    protocol: "Strategic Asset - CATALYST-7",
    summary: "Symbiotic resonance source. Secure and transport intact. Destruction prohibited.",
  },
  singularity: {
    protocol: "Immediate Neutralization",
    summary: "Existential threat. All assets authorized, including tactical ordnance.",
  },
  "zero-state": {
    protocol: "ZS-1 - Closed File",
    summary: "Neutralized residue. No response required; catalogued for historical record.",
  },
};

function getDoctrine(classification: string) {
  return gecTierDoctrine[classification.trim().toLowerCase()];
}

export default function CreatureDetail() {
  const { id } = useParams<{ id: string }>();
  const [creature, setCreature] = useState<Creature | null>(null);
  const [loading, setLoading] = useState(true);
  const [discussion, setDiscussion] = useState<DiscussionComment[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (!id) {
      setCreature(null);
      setDiscussion([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    getCreature(id).then((c) => {
      if (!active) return;
      setCreature(c ?? null);
      setDiscussion(c?.discussions ?? []);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;

  if (!creature) {
    return (
      <div className="p-8 space-y-3">
        <Link to="/lore/creatures" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3 w-3" /> BACK TO CREATURES
        </Link>
        <p className="text-sm text-muted-foreground font-body">Creature not found.</p>
      </div>
    );
  }

  const accent = creature.accentColor;
  const doctrine = getDoctrine(creature.classification);

  const handleAddComment = async (author: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!creature) return;
    const updated = await addCreatureDiscussionComment(creature.id, author, text, mentions);
    if (!updated) return;
    setCreature(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleAddReply = async (
    commentId: string,
    author: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!creature) return;
    const updated = await addCreatureDiscussionReply(creature.id, commentId, author, text, mentions);
    if (!updated) return;
    setCreature(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditComment = async (commentId: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!creature) return;
    const updated = await editCreatureDiscussionComment(creature.id, commentId, text, mentions);
    if (!updated) return;
    setCreature(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!creature) return;
    const updated = await deleteCreatureDiscussionComment(creature.id, commentId);
    if (!updated) return;
    setCreature(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditReply = async (
    commentId: string,
    replyId: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!creature) return;
    const updated = await editCreatureDiscussionReply(creature.id, commentId, replyId, text, mentions);
    if (!updated) return;
    setCreature(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!creature) return;
    const updated = await deleteCreatureDiscussionReply(creature.id, commentId, replyId);
    if (!updated) return;
    setCreature(updated);
    setDiscussion(updated.discussions ?? []);
  };

  return (
    <div className="space-y-0">
      <div className="relative h-64 md:h-80 overflow-hidden flex items-end" style={creature.thumbnail ? { backgroundImage: `url(${getProxyUrl(creature.thumbnail)})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "var(--color-muted)" }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}20, transparent 60%)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent }} />
        {!creature.thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl opacity-5 tracking-[0.3em]" style={{ color: accent }}>{creature.name.split(" ")[0].toUpperCase()}</span>
          </div>
        )}
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link to="/lore/creatures" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" /> BACK TO LORE
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em]" style={{ color: accent }}>{creature.name.toUpperCase()}</h1>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* Quick-read stat strip */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="hud-border bg-card p-4 space-y-2" style={{ borderColor: `${accent}30` }}>
            <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Classification</p>
            <Link
              to={`/lore/other/${GEC_LORE_ID}`}
              className={`inline-flex items-center gap-1 text-xs font-display tracking-wider uppercase px-2 py-1 rounded-sm border ${gecChipClass(creature.classification)} hover:opacity-80 transition-opacity`}
              title="View GEC Mark II classification"
            >
              {creature.classification}
            </Link>
          </div>
          <div className="hud-border bg-card p-4 space-y-1" style={{ borderColor: `${accent}30` }}>
            <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Danger Level</p>
            <p className="text-lg font-heading flex items-center gap-2 text-accent-orange"><ShieldAlert className="h-4 w-4" /> {dangerLabel[creature.dangerLevel]}</p>
          </div>
          <div className="hud-border bg-card p-4 space-y-1" style={{ borderColor: `${accent}30` }}>
            <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Habitat</p>
            <p className="text-sm font-body text-foreground">{creature.habitat}</p>
          </div>
        </div>

        {/* GEC documentation chips - clickable, route to GEC lore entry */}
        <div className="space-y-3">
          <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">GEC Documentation</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/lore/other/${GEC_LORE_ID}`}
              className={`inline-flex items-center gap-1.5 text-[11px] font-display tracking-wider uppercase px-2.5 py-1 rounded-sm border ${gecChipClass(creature.classification)} hover:opacity-80 transition-opacity`}
            >
              <FileText className="h-3 w-3" /> GEC Mark II
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </Link>
            <Link
              to={`/lore/other/${GEC_LORE_ID}`}
              className={`inline-flex items-center gap-1.5 text-[11px] font-display tracking-wider uppercase px-2.5 py-1 rounded-sm border ${gecChipClass(creature.classification)} hover:opacity-80 transition-opacity`}
            >
              Tier · {creature.classification}
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </Link>
            {doctrine && (
              <Link
                to={`/lore/other/${GEC_LORE_ID}`}
                className="inline-flex items-center gap-1.5 text-[11px] font-display tracking-wider uppercase px-2.5 py-1 rounded-sm border border-border bg-card hover:bg-muted/50 transition-colors text-foreground"
              >
                Protocol · {doctrine.protocol}
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </Link>
            )}
            <Link
              to={`/lore/other/${GEC_LORE_ID}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-display tracking-wider uppercase px-2.5 py-1 rounded-sm border border-accent-orange/40 bg-accent-orange/10 text-accent-orange hover:opacity-80 transition-opacity"
            >
              {dangerLabel[creature.dangerLevel].split(" ")[0]} Doctrine
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </Link>
          </div>
        </div>

        {/* Threat Stats */}
        {creature.stats && (
          <div className="hud-border bg-card p-5 space-y-4 max-w-2xl" style={{ borderColor: `${accent}30` }}>
            <div className="flex items-baseline justify-between">
              <h3 className="font-heading text-sm tracking-[0.15em] uppercase" style={{ color: accent }}>Threat Profile</h3>
              {(() => {
                const values = Object.values(creature.stats);
                const overall = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
                return (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Overall</span>
                    <span className="font-display text-lg leading-none" style={{ color: accent }}>{overall}</span>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-3">
              {Object.entries(creature.stats).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs font-heading">
                    <span className="text-muted-foreground uppercase tracking-wider">{key}</span>
                    <span className="text-foreground">{value}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${value}%`, backgroundColor: accent }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabbed sections: Overview / Habitat / Notes */}
          <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:w-auto sm:inline-flex sm:grid-cols-4 sm:gap-0 sm:h-10">
            <TabsTrigger value="overview" className="text-[11px] font-heading tracking-wider uppercase">
              <FileText className="h-3 w-3 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="habitat" className="text-[11px] font-heading tracking-wider uppercase">
              <MapPin className="h-3 w-3 mr-1.5" /> Habitat
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-[11px] font-heading tracking-wider uppercase">
              <NotebookPen className="h-3 w-3 mr-1.5" /> Notes
            </TabsTrigger>
            <TabsTrigger value="metadata" className="text-[11px] font-heading tracking-wider uppercase">
              <Info className="h-3 w-3 mr-1.5" /> Metadata
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="max-w-3xl space-y-4">
              <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Field Report</h2>
              <p className="text-sm font-body text-foreground/90 italic border-l-2 pl-4" style={{ borderColor: accent }}>
                {creature.shortDesc}
              </p>
              <RedactedBlock fullDesc={creature.fullDesc} />
            </div>

          </TabsContent>

          <TabsContent value="habitat" className="mt-6 space-y-6">
            <div className="max-w-3xl space-y-4">
              <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Operational Environment</h2>
              <div className="hud-border bg-card p-5 space-y-3" style={{ borderColor: `${accent}30` }}>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5" style={{ color: accent }} />
                  <div className="space-y-1">
                    <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Primary Range</p>
                    <p className="text-sm font-body text-foreground">{creature.habitat}</p>
                  </div>
                </div>
              </div>
              <p className="text-sm font-body text-foreground/70 leading-relaxed">
                Field teams operating within this range must observe <span className="text-foreground font-semibold">{dangerLabel[creature.dangerLevel]}</span> engagement doctrine.
                {doctrine && <> Morneven standing protocol for {creature.classification}-class entities is <span className="text-foreground font-semibold">{doctrine.protocol}</span>.</>}
              </p>
              <Link
                to="/map"
                className="inline-flex items-center gap-1.5 text-xs font-heading tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                View on Tactical Map <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-6 space-y-6">
            <div className="max-w-3xl space-y-4">
                <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Field Notes & Observations</h2>
                <FieldNoteList title="Field Notes" items={creature.fieldNotes ?? []} accent={accent} />
                <FieldNoteList title="Observations" items={creature.observations ?? []} accent={accent} />
                {doctrine ? (
                  <div className="hud-border bg-card p-5 space-y-3" style={{ borderColor: `${accent}30` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center text-[10px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border ${gecChipClass(creature.classification)}`}>
                        {creature.classification}
                      </span>
                      <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Protocol · {doctrine.protocol}</span>
                    </div>
                    <p className="text-sm font-body text-foreground/80 leading-relaxed">{doctrine.summary}</p>
                    <Link
                      to={`/lore/other/${GEC_LORE_ID}`}
                      className="inline-flex items-center gap-1.5 text-xs font-heading tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors pt-1"
                    >
                      Read full GEC Mark II entry <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ) : null}
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="mt-6">
            <LoreMetaPanel meta={creature.meta} fallbackCreator={creature.contributor} accentColor={accent} />
          </TabsContent>
        </Tabs>

        {/* Documentation - always visible (outside tabs) */}
        {creature.docs && creature.docs.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Documentation</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {creature.docs.map((doc, i) => (
                <div key={i} className="hud-border-sm bg-card overflow-hidden" style={{ borderColor: `${accent}20` }}>
                  {doc.type === "video" && doc.url ? (
                    <div className="aspect-video bg-muted">
                      <iframe src={doc.url} className="w-full h-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={`${creature.name} doc`} />
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

        {/* Discussion Section - standalone, outside tabs */}
        <div className="max-w-3xl space-y-4 pt-4">
          <div className="mecha-line" />
          <DiscussionSection
            comments={discussion}
            onAddComment={handleAddComment}
            onAddReply={handleAddReply}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onEditReply={handleEditReply}
            onDeleteReply={handleDeleteReply}
            accentColor={accent}
          />
        </div>
      </div>
    </div>
  );
}

function FieldNoteList({ title, items, accent }: { title: string; items: LoreFieldNote[]; accent: string }) {
  if (items.length === 0) {
    return (
      <div className="hud-border bg-card p-4" style={{ borderColor: `${accent}20` }}>
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
