import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  getCommandCenterSnapshot,
  type ContentStats,
} from "@/services/api";
import {
  getCommandCenterSettings,
  type CommandCenterSettings,
} from "@/services/commandCenterSettings";
import type { Project, Character, NewsItem, GalleryItem, Place, Technology } from "@/types";
import {
  Activity,
  Users,
  FolderKanban,
  Image,
  MapPin,
  Cpu,
  TrendingUp,
  Clock,
  Zap,
  BookOpen,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { averageScore, toCharacterPrimaryStats } from "@/lib/statDetails";
import { ContentState } from "@/components/ContentState";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

const emptyStats: ContentStats = {
  totalProjects: 0,
  activeProjects: 0,
  totalLore: 0,
  totalGallery: 0,
};

type SnapshotStatus = "loading" | "ready" | "error";

function StatCard({ icon: Icon, label, value, color, delay }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string; delay: number }) {
  return (
    <motion.div {...fadeUp(delay)} className="hud-border bg-card flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${color}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div>
        <p className="text-xl font-display tracking-wider text-foreground sm:text-2xl">{value}</p>
        <p className="text-[10px] font-heading tracking-wider text-muted-foreground uppercase sm:text-xs">{label}</p>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const { username, role } = useAuth();
  const isMountedRef = useRef(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tech, setTech] = useState<Technology[]>([]);
  const [stats, setStats] = useState<ContentStats>(emptyStats);
  const [settings, setSettings] = useState<CommandCenterSettings>(() => getCommandCenterSettings());
  const [snapshotStatus, setSnapshotStatus] = useState<SnapshotStatus>("loading");
  const [snapshotError, setSnapshotError] = useState("");

  const refresh = useCallback(async (preserveContent = false) => {
    if (!preserveContent) {
      setSnapshotStatus("loading");
    }
    setSnapshotError("");

    try {
      const snapshot = await getCommandCenterSnapshot();
      if (!isMountedRef.current) return;

      setSettings(snapshot.settings);
      setStats(snapshot.stats);
      setProjects(snapshot.sections.projects);
      setNews(snapshot.sections.news);
      setCharacters(snapshot.sections.characters);
      setPlaces(snapshot.sections.places);
      setTech(snapshot.sections.technology);
      setGallery(snapshot.sections.gallery);
      setSnapshotStatus("ready");
    } catch (error) {
      if (!isMountedRef.current) return;
      const message = error instanceof Error
        ? error.message === "Failed to fetch"
          ? "Network request failed."
          : error.message
        : "The command center feed could not be loaded.";
      if (!preserveContent) {
        setStats(emptyStats);
        setProjects([]);
        setNews([]);
        setCharacters([]);
        setPlaces([]);
        setTech([]);
        setGallery([]);
      }
      setSnapshotStatus("error");
      setSnapshotError(message);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    void refresh();
    const handleSoftRefresh = () => { void refresh(true); };
    window.addEventListener("morneven:cc-settings-changed", handleSoftRefresh);
    window.addEventListener("focus", handleSoftRefresh);
    window.addEventListener("storage", handleSoftRefresh);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("morneven:cc-settings-changed", handleSoftRefresh);
      window.removeEventListener("focus", handleSoftRefresh);
      window.removeEventListener("storage", handleSoftRefresh);
    };
  }, [refresh]);

  const statusColor: Record<string, string> = {
    "On Progress": "text-accent-yellow",
    "Planning": "text-primary",
    "On Hold": "text-accent-orange",
    "Completed": "text-emerald-600 dark:text-emerald-400",
    "Canceled": "text-destructive",
  };

  const showBlockingStatus = snapshotStatus !== "ready";
  const statusDescription = snapshotStatus === "loading"
    ? "Live dashboard data is loading. Existing layout settings will appear first, then content blocks will populate."
    : `Live dashboard data could not be loaded. ${snapshotError || "The API request failed."}`;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-3 sm:space-y-6 sm:p-6 md:space-y-8 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <motion.div {...fadeUp(0)} className="flex items-center gap-3">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl tracking-[0.1em] text-primary">COMMAND CENTER</h1>
          </motion.div>
          <div className="mecha-line mt-2 w-24 sm:w-32" />
          <motion.p {...fadeUp(0.05)} className="mt-2 text-xs font-body text-muted-foreground sm:mt-3 sm:text-sm">
            Welcome back, <span className="text-foreground font-medium">{username}</span>. {settings.welcomeMessage}
          </motion.p>
        </div>
        <ThemeToggle />
      </div>

      {showBlockingStatus && (
        <ContentState
          kind={snapshotStatus}
          title={snapshotStatus === "loading" ? "Preparing command center" : "Command center unavailable"}
          description={statusDescription}
          actionLabel={snapshotStatus === "error" ? "Retry" : undefined}
          onAction={snapshotStatus === "error" ? (() => { void refresh(); }) : undefined}
          className="bg-card/65"
        />
      )}

      {/* Stat Cards */}
      {settings.showStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={FolderKanban} label="Total Projects" value={snapshotStatus === "loading" ? "..." : snapshotStatus === "error" ? "--" : stats.totalProjects} color="bg-primary/20 text-primary" delay={0.05} />
          <StatCard icon={Activity} label="In Progress" value={snapshotStatus === "loading" ? "..." : snapshotStatus === "error" ? "--" : stats.activeProjects} color="bg-green-500/20 text-green-400" delay={0.1} />
          <StatCard icon={BookOpen} label="Lore Entries" value={snapshotStatus === "loading" ? "..." : snapshotStatus === "error" ? "--" : stats.totalLore} color="bg-secondary/20 text-secondary" delay={0.15} />
          <StatCard icon={Image} label="Gallery Items" value={snapshotStatus === "loading" ? "..." : snapshotStatus === "error" ? "--" : stats.totalGallery} color="bg-accent/20 text-accent-foreground" delay={0.2} />
        </div>
      )}

      {/* Main Grid */}
      {(settings.showProjects || settings.showNews) && (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {settings.showProjects && (
            <motion.div {...fadeUp(0.1)} className="md:col-span-2 hud-border bg-card p-4 sm:p-5 space-y-4 glow-primary min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-xs sm:text-sm tracking-[0.15em] text-accent-orange uppercase flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" /> Project Status
                </h3>
                <Link to="/projects" className="text-xs font-heading text-primary hover:underline flex items-center gap-1 flex-shrink-0">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mecha-line" />
              <div className="space-y-3">
                {snapshotStatus === "loading" ? (
                  <ContentState
                    kind="loading"
                    title="Loading project feed"
                    description="Project status cards are being requested from the live dashboard snapshot."
                    compact
                  />
                ) : snapshotStatus === "error" && projects.length === 0 ? (
                  <ContentState
                    kind="error"
                    title="Project feed unavailable"
                    description="The project status feed could not be loaded from the backend."
                    actionLabel="Retry"
                    onAction={() => { void refresh(); }}
                    compact
                  />
                ) : projects.length === 0 ? (
                  <ContentState
                    kind="empty"
                    title="No project highlights"
                    description="No project has been pinned into the command center snapshot yet."
                    compact
                  />
                ) : projects.map((p, index) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-background/50 p-2.5 transition-colors group hover:bg-background sm:p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading text-foreground group-hover:text-primary transition-colors truncate">
                        {p.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground text-justify sm:text-xs">{p.shortDesc}</p>
                    </div>
                    <span className={`text-[10px] sm:text-xs font-display tracking-wider uppercase flex-shrink-0 ${statusColor[p.status] || "text-muted-foreground"}`}>
                      {p.status}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {settings.showNews && (
            <motion.div {...fadeUp(0.15)} className="hud-border bg-card p-4 sm:p-5 space-y-4 glow-primary min-w-0">
              <h3 className="font-heading text-xs sm:text-sm tracking-[0.15em] text-accent-orange uppercase flex items-center gap-2">
                <Zap className="h-4 w-4" /> News Feed
              </h3>
              <div className="mecha-line" />
              <ul className="space-y-3">
                {snapshotStatus === "loading" ? (
                  <li>
                    <ContentState
                      kind="loading"
                      title="Loading news feed"
                      description="Recent briefings are being requested from the live dashboard snapshot."
                      compact
                    />
                  </li>
                ) : snapshotStatus === "error" && news.length === 0 ? (
                  <li>
                    <ContentState
                      kind="error"
                      title="News feed unavailable"
                      description="Briefing entries could not be loaded from the backend."
                      actionLabel="Retry"
                      onAction={() => { void refresh(); }}
                      compact
                    />
                  </li>
                ) : news.length === 0 ? (
                  <li>
                    <ContentState
                      kind="empty"
                      title="No briefing posted"
                      description="The news feed is active, but there are no entries to display yet."
                      compact
                    />
                  </li>
                ) : news.map((n, index) => {
                  const inner = (
                    <>
                      <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className="flex-1 break-words font-body text-foreground/80 line-clamp-2 sm:line-clamp-none">{n.text}</p>
                          {n.hasDetail && (
                            <span className="hidden flex-shrink-0 items-center gap-1 rounded-sm border border-primary/40 px-1.5 py-0.5 text-[9px] font-display tracking-wider uppercase text-primary sm:inline-flex">
                              <BookOpen className="h-2.5 w-2.5" /> Detail
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-display tracking-wider text-muted-foreground mt-0.5">{n.date}</p>
                      </div>
                    </>
                  );
                  return n.hasDetail ? (
                    <li key={n.id}>
                      <Link
                        to={`/news/${n.id}`}
                        className="flex items-start gap-3 text-sm rounded-sm p-1 -m-1 hover:bg-background/60 transition-colors"
                      >
                        {inner}
                      </Link>
                    </li>
                  ) : (
                    <li key={n.id} className="flex items-start gap-3 text-sm">
                      {inner}
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </div>
      )}

      {/* Second Row */}
      {(settings.showCharacters || settings.showPlaces || settings.showTechnology) && (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {settings.showCharacters && (
            <motion.div {...fadeUp(0.2)} className="hud-border bg-card p-4 sm:p-5 space-y-4 glow-primary">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-xs sm:text-sm tracking-[0.15em] text-accent-orange uppercase flex items-center gap-2">
                  <Users className="h-4 w-4" /> Key Personnel
                </h3>
                <Link to="/lore/characters" className="text-xs font-heading text-primary hover:underline flex items-center gap-1 flex-shrink-0">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mecha-line" />
              <div className="space-y-3">
                {snapshotStatus === "loading" ? (
                  <ContentState
                    kind="loading"
                    title="Loading personnel"
                    description="Personnel spotlight entries are being prepared."
                    compact
                  />
                ) : snapshotStatus === "error" && characters.length === 0 ? (
                  <ContentState
                    kind="error"
                    title="Personnel unavailable"
                    description="Character spotlight data could not be loaded."
                    actionLabel="Retry"
                    onAction={() => { void refresh(); }}
                    compact
                  />
                ) : characters.length === 0 ? (
                  <ContentState
                    kind="empty"
                    title="No personnel spotlight"
                    description="No character is currently featured in this panel."
                    compact
                  />
                ) : characters.map((c, index) => (
                  <Link
                    key={c.id}
                    to={`/lore/characters/${c.id}`}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-background/50 transition-colors group"
                  >
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                      style={{ backgroundColor: `${c.accentColor}20`, color: c.accentColor }}
                    >
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading text-foreground group-hover:text-primary transition-colors truncate">{c.name}</p>
                      <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase truncate">{c.race}</p>
                    </div>
                    {c.stats && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-display text-primary">
                          {averageScore(Object.values(toCharacterPrimaryStats(c.stats)))}
                        </p>
                        <p className="text-[9px] text-muted-foreground uppercase">Overall</p>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {settings.showPlaces && (
            <motion.div {...fadeUp(0.25)} className="hud-border bg-card p-4 sm:p-5 space-y-4 glow-primary">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-xs sm:text-sm tracking-[0.15em] text-accent-orange uppercase flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Key Locations
                </h3>
                <Link to="/lore/places" className="text-xs font-heading text-primary hover:underline flex items-center gap-1 flex-shrink-0">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mecha-line" />
              <div className="space-y-3">
                {snapshotStatus === "loading" ? (
                  <ContentState
                    kind="loading"
                    title="Loading locations"
                    description="Location entries are being requested."
                    compact
                  />
                ) : snapshotStatus === "error" && places.length === 0 ? (
                  <ContentState
                    kind="error"
                    title="Locations unavailable"
                    description="Location cards could not be loaded."
                    actionLabel="Retry"
                    onAction={() => { void refresh(); }}
                    compact
                  />
                ) : places.length === 0 ? (
                  <ContentState
                    kind="empty"
                    title="No featured locations"
                    description="There is no location highlight configured for this panel."
                    compact
                  />
                ) : places.map((p, index) => (
                  <Link
                    key={p.id}
                    to={`/lore/places/${p.id}`}
                    className="block p-2 rounded-md hover:bg-background/50 transition-colors group"
                  >
                    <p className="text-sm font-heading text-foreground group-hover:text-primary transition-colors truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground text-justify mt-0.5 line-clamp-2">{p.type} / {p.shortDesc}</p>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {settings.showTechnology && (
            <motion.div {...fadeUp(0.3)} className="hud-border bg-card p-4 sm:p-5 space-y-4 glow-primary sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-xs sm:text-sm tracking-[0.15em] text-accent-orange uppercase flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> Technology
                </h3>
                <Link to="/lore/tech" className="text-xs font-heading text-primary hover:underline flex items-center gap-1 flex-shrink-0">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mecha-line" />
              <div className="space-y-3">
                {snapshotStatus === "loading" ? (
                  <ContentState
                    kind="loading"
                    title="Loading technology"
                    description="Technology references are being requested."
                    compact
                  />
                ) : snapshotStatus === "error" && tech.length === 0 ? (
                  <ContentState
                    kind="error"
                    title="Technology unavailable"
                    description="Technology cards could not be loaded."
                    actionLabel="Retry"
                    onAction={() => { void refresh(); }}
                    compact
                  />
                ) : tech.length === 0 ? (
                  <ContentState
                    kind="empty"
                    title="No featured technology"
                    description="No technology entry is currently pinned here."
                    compact
                  />
                ) : tech.map((t, index) => (
                  <Link
                    key={t.id}
                    to={`/lore/tech/${t.id}`}
                    className="block p-2 rounded-md hover:bg-background/50 transition-colors group"
                  >
                    <p className="text-sm font-heading text-foreground group-hover:text-primary transition-colors truncate">{t.name}</p>
                    <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">{t.category}</p>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Recent Gallery */}
      {settings.showGallery && (
        <motion.div {...fadeUp(0.35)} className="hud-border bg-card p-4 sm:p-5 space-y-4 glow-primary">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-xs sm:text-sm tracking-[0.15em] text-accent-orange uppercase flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Recent Gallery
            </h3>
            <Link to="/gallery" className="text-xs font-heading text-primary hover:underline flex items-center gap-1 flex-shrink-0">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mecha-line" />
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
            {snapshotStatus === "loading" ? (
              <div className="col-span-full">
                <ContentState
                  kind="loading"
                  title="Loading gallery"
                  description="Recent media entries are being requested from the live snapshot."
                  compact
                />
              </div>
            ) : snapshotStatus === "error" && gallery.length === 0 ? (
              <div className="col-span-full">
                <ContentState
                  kind="error"
                  title="Gallery unavailable"
                  description="Recent media entries could not be loaded."
                  actionLabel="Retry"
                  onAction={() => { void refresh(); }}
                  compact
                />
              </div>
            ) : gallery.length === 0 ? (
              <div className="col-span-full">
                <ContentState
                  kind="empty"
                  title="No recent gallery items"
                  description="The gallery is active, but there is no recent media selected for this panel."
                  compact
                />
              </div>
            ) : gallery.map((g) => (
              <Link
                key={g.id}
                to={`/gallery/${g.id}`}
                className="group rounded-md overflow-hidden bg-background/50 hover:ring-1 hover:ring-primary/30 transition-all"
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {g.thumbnail ? (
                    <AuthenticatedImage src={g.thumbnail} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-heading text-foreground group-hover:text-primary transition-colors truncate">{g.title}</p>
                  <p className="hidden text-[10px] text-muted-foreground sm:block">{g.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      {settings.showQuickActions && (
        <motion.div {...fadeUp(0.4)} className="hud-border bg-card p-4 sm:p-5 space-y-4">
          <h3 className="font-heading text-xs sm:text-sm tracking-[0.15em] text-accent-orange uppercase flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Quick Navigation
          </h3>
          <div className="mecha-line" />
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
            {[
              { label: "Projects", to: "/projects", icon: FolderKanban, desc: "View all projects" },
              { label: "Gallery", to: "/gallery", icon: Image, desc: "Browse artwork" },
              { label: "Lore Wiki", to: "/lore", icon: BookOpen, desc: "Explore the world" },
              { label: "Settings", to: "/settings", icon: Zap, desc: "Preferences" },
            ].map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="flex items-center gap-3 p-3 rounded-md bg-background/50 hover:bg-primary/5 hover:ring-1 hover:ring-primary/20 transition-all group"
              >
                <q.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-heading text-foreground group-hover:text-primary transition-colors truncate">{q.label}</p>
                  <p className="hidden truncate text-[10px] text-muted-foreground sm:block">{q.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Footer status */}
      <motion.div {...fadeUp(0.45)} className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-muted-foreground font-heading tracking-wider px-1 pb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-yellow animate-pulse" />
          {snapshotStatus === "error" ? "LIVE DATA DEGRADED" : snapshotStatus === "loading" ? "SYNCING LIVE DATA" : "ALL SYSTEMS OPERATIONAL"}
        </div>
        <button
          type="button"
          onClick={() => { void refresh(true); }}
          className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh Feed
        </button>
      </motion.div>
    </div>
  );
}
