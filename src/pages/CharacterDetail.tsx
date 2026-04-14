import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getCharacter } from "@/services/api";
import type { Character, DiscussionComment } from "@/types";
import { ArrowLeft, Heart, Frown } from "lucide-react";
import DiscussionSection from "@/components/DiscussionSection";

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const [char, setChar] = useState<Character | null>(null);
  const [discussion, setDiscussion] = useState<DiscussionComment[]>([]);

  useEffect(() => {
    if (id) getCharacter(id).then((c) => setChar(c ?? null));
  }, [id]);

  if (!char) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;

  const accentColor = char.accentColor;

  const handleAddComment = (author: string, text: string) => {
    setDiscussion((prev) => [...prev, { id: `dc-${Date.now()}`, author, text, date: new Date().toISOString().split("T")[0], replies: [] }]);
  };

  const handleAddReply = (commentId: string, author: string, text: string) => {
    setDiscussion((prev) => prev.map((c) => c.id === commentId ? { ...c, replies: [...c.replies, { id: `dr-${Date.now()}`, author, text, date: new Date().toISOString().split("T")[0] }] } : c));
  };

  return (
    <div className="space-y-0" style={{ "--char-accent": accentColor } as React.CSSProperties}>
      {/* Parallax header with custom accent */}
      <div className="relative h-72 md:h-96 bg-muted overflow-hidden flex items-end">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accentColor}15, transparent 60%)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-8xl opacity-5 tracking-[0.3em]" style={{ color: accentColor }}>{char.name.split(" ")[0].toUpperCase()}</span>
        </div>
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link to="/lore" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" /> BACK TO LORE
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em]" style={{ color: accentColor }}>{char.name.toUpperCase()}</h1>
          <p className="text-sm font-heading tracking-wider text-muted-foreground mt-1">{char.race}</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${accentColor}50, transparent)` }} />

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Stats & Info */}
          <div className="space-y-6">
            <div className="hud-border bg-card p-5 space-y-4" style={{ borderColor: `${accentColor}30` }}>
              <h3 className="font-heading text-sm tracking-[0.15em] uppercase" style={{ color: accentColor }}>Profile Data</h3>
              <div className="space-y-2 text-sm font-body">
                <div className="flex justify-between"><span className="text-muted-foreground">Height</span><span className="text-foreground">{char.height}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Race</span><span className="text-foreground">{char.race}</span></div>
              </div>
            </div>

            {/* Stats bars */}
            <div className="hud-border bg-card p-5 space-y-4" style={{ borderColor: `${accentColor}30` }}>
              <h3 className="font-heading text-sm tracking-[0.15em] uppercase" style={{ color: accentColor }}>Combat Stats</h3>
              <div className="space-y-3">
                {Object.entries(char.stats).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-heading">
                      <span className="text-muted-foreground uppercase tracking-wider">{key}</span>
                      <span className="text-foreground">{value}</span>
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

          {/* Right: Description, Docs, Discussion */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Background</h2>
              {char.fullDesc.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm font-body text-foreground/80 leading-relaxed">{para}</p>
              ))}
            </div>

            {/* Documentation */}
            {char.docs && char.docs.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Documentation</h2>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  {char.docs.map((doc, i) => (
                    <div key={i} className="hud-border-sm bg-card overflow-hidden" style={{ borderColor: `${accentColor}20` }}>
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

            {/* Discussion */}
            <div className="h-px w-full" style={{ background: `linear-gradient(to right, transparent, ${accentColor}30, transparent)` }} />
            <DiscussionSection
              comments={discussion}
              onAddComment={handleAddComment}
              onAddReply={handleAddReply}
              accentColor={accentColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
