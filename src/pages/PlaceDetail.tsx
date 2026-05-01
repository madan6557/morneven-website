import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getPlace,
  addPlaceDiscussionComment,
  addPlaceDiscussionReply,
  editPlaceDiscussionComment,
  deletePlaceDiscussionComment,
  editPlaceDiscussionReply,
  deletePlaceDiscussionReply,
} from "@/services/api";
import type { Place, DiscussionComment, DiscussionMention } from "@/types";
import { ArrowLeft, Map, FileText, Info } from "lucide-react";
import DiscussionSection from "@/components/DiscussionSection";
import RedactedBlock from "@/components/RedactedBlock";
import LoreMetaPanel from "@/components/LoreMetaPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PlaceDetail() {
  const { id } = useParams<{ id: string }>();
  const [place, setPlace] = useState<Place | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [discussion, setDiscussion] = useState<DiscussionComment[]>([]);

  useEffect(() => {
    if (id) {
      getPlace(id).then((p) => {
        setPlace(p ?? null);
        setDiscussion(p?.discussions ?? []);
      });
    }
  }, [id]);

  if (!place) return <div className="p-8 text-muted-foreground font-body">Loading...</div>;

  const handleAddComment = async (author: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!place) return;
    const updated = await addPlaceDiscussionComment(place.id, author, text, mentions);
    if (!updated) return;
    setPlace(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleAddReply = async (
    commentId: string,
    author: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!place) return;
    const updated = await addPlaceDiscussionReply(place.id, commentId, author, text, mentions);
    if (!updated) return;
    setPlace(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditComment = async (commentId: string, text: string, mentions: DiscussionMention[] = []) => {
    if (!place) return;
    const updated = await editPlaceDiscussionComment(place.id, commentId, text, mentions);
    if (!updated) return;
    setPlace(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!place) return;
    const updated = await deletePlaceDiscussionComment(place.id, commentId);
    if (!updated) return;
    setPlace(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleEditReply = async (
    commentId: string,
    replyId: string,
    text: string,
    mentions: DiscussionMention[] = [],
  ) => {
    if (!place) return;
    const updated = await editPlaceDiscussionReply(place.id, commentId, replyId, text, mentions);
    if (!updated) return;
    setPlace(updated);
    setDiscussion(updated.discussions ?? []);
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    if (!place) return;
    const updated = await deletePlaceDiscussionReply(place.id, commentId, replyId);
    if (!updated) return;
    setPlace(updated);
    setDiscussion(updated.discussions ?? []);
  };

  return (
    <div className="space-y-0">
      <div className="relative h-64 md:h-80 overflow-hidden flex items-end" style={place.thumbnail ? { backgroundImage: `url(${place.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "var(--color-muted)" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        {!place.thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl text-muted-foreground/10 tracking-[0.3em]">GEMORA</span>
          </div>
        )}
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link to="/lore" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" /> BACK TO LORE
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">{place.name.toUpperCase()}</h1>
          <p className="text-xs font-display tracking-wider text-accent-orange uppercase mt-1">{place.type}</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="mecha-line" />

        <button
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-xs font-display tracking-wider text-muted-foreground hover:bg-muted transition-colors"
        >
          <Map className="h-4 w-4" />
          {showMap ? "HIDE MAP" : "SHOW INTERACTIVE MAP"}
        </button>

        {showMap && (
          <div className="hud-border bg-card aspect-[16/9] flex items-center justify-center">
            <div className="text-center space-y-2">
              <Map className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground font-heading tracking-wider">INTERACTIVE SVG MAP</p>
              <p className="text-xs text-muted-foreground font-body">Placeholder for Gemora world map</p>
            </div>
          </div>
        )}

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
              <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Overview</h2>
              <RedactedBlock fullDesc={place.fullDesc} paragraphClass="text-sm font-body text-foreground/80 leading-relaxed" />
            </div>
          </TabsContent>
          <TabsContent value="metadata" className="mt-6">
            <LoreMetaPanel meta={place.meta} fallbackCreator={place.contributor} />
          </TabsContent>
        </Tabs>

        {place.docs.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Documentation</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {place.docs.map((doc, i) => (
                <div key={i} className="hud-border-sm bg-card overflow-hidden">
                  {doc.type === "video" && doc.url ? (
                    <div className="aspect-video bg-muted">
                      <iframe
                        src={doc.url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`${place.name} Documentation`}
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
