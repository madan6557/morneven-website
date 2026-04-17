import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getProjects, getCharacters, getNews, getGallery, getPlaces, getTechnology } from "@/services/api";
import { getCommandCenterSettings, type CommandCenterSettings } from "@/services/commandCenterSettings";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

function StatCard({ icon: Icon, label, value, color, delay }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string; delay: number }) {
  return (
    <motion.div {...fadeUp(delay)} className="hud-border bg-card p-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-display tracking-wider text-foreground">{value}</p>
        <p className="text-xs font-heading tracking-wider text-muted-foreground uppercase">{label}</p>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const { username, role } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tech, setTech] = useState<Technology[]>([]);
  const [settings, setSettings] = useState<CommandCenterSettings>(() => getCommandCenterSettings());

  useEffect(() => {
    getProjects().then(setProjects);
    getCharacters().then(setCharacters);
    getNews().then(setNews);
    getGallery().then(setGallery);
    getPlaces().then(setPlaces);
    getTechnology().then(setTech);
  }, []);

  // Refresh settings when author saves them, or when tab regains focus
  useEffect(() => {
    const refresh = () => setSettings(getCommandCenterSettings());
    window.addEventListener("morneven:cc-settings-changed", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("morneven:cc-settings-changed", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const activeProjects = projects.filter((p) => p.status === "On Progress").length;
  const totalLore = characters.length + places.length + tech.length;

  const statusColor: Record<string, string> = {
    "On Progress": "text-accent-yellow",
    "Planning": "text-primary",
    "On Hold": "text-accent-orange",
    "Completed": "text-emerald-600 dark:text-emerald-400",
    "Canceled": "text-destructive",
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <motion.div {...fadeUp(0)} className="flex items-center gap-3">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl tracking-[0.1em] text-primary">COMMAND CENTER</h1>
          </motion.div>
          <div className="mecha-line w-32 mt-2" />
          <motion.p {...fadeUp(0.05)} className="mt-3 text-sm font-body text-muted-foreground">
            Welcome back, <span className="text-foreground font-medium">{username}</span>. {settings.welcomeMessage}
          </motion.p>
        </div>
        <ThemeToggle />
      </div>

      {/* Stat Cards */}
      {settings.showStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={FolderKanban} label="Projects" value={projects.length} color="bg-primary/20 text-primary" delay={0.05} />
          <StatCard icon={Activity} label="Active" value={activeProjects} color="bg-green-500/20 text-green-400" delay={0.1} />
          <StatCard icon={BookOpen} label="Lore Entries" value={totalLore} color="bg-secondary/20 text-secondary" delay={0.15} />
          <StatCard icon={Image} label="Gallery" value={gallery.length} color="bg-accent/20 text-accent-foreground" delay={0.2} />
        </div>
      )}

      {/* Main Grid */}
      {(settings.showProjects || settings.showNews) && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {settings.showProjects && (
            <motion.div {...fadeUp(0.1)} className="lg:col-span-2 hud-border bg-card p-4 sm:p-5 space-y-4 glow-primary">
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
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-background/50 hover:bg-background transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading text-foreground group-hover:text-primary transition-colors truncate">
                        {p.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{p.shortDesc}</p>
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
            <motion.div {...fadeUp(0.15)} className="hud-border bg-card p-4 sm:p-5 space-y-4 glow-primary">
              <h3 className="font-heading text-xs sm:text-sm tracking-[0.15em] text-accent-orange uppercase flex items-center gap-2">
                <Zap className="h-4 w-4" /> News Feed
              </h3>
              <div className="mecha-line" />
              <ul className="space-y-3">
                {news.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-body text-foreground/80 break-words">{n.text}</p>
                      <p className="text-[10px] font-display tracking-wider text-muted-foreground mt-0.5">{n.date}</p>
                    </div>
                  </li>
                ))}
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
                {characters.slice(0, 3).map((c) => (
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
                        <p className="text-xs font-display text-primary">{c.stats.combat}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">Combat</p>
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
                {places.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    to={`/lore/places/${p.id}`}
                    className="block p-2 rounded-md hover:bg-background/50 transition-colors group"
                  >
                    <p className="text-sm font-heading text-foreground group-hover:text-primary transition-colors truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.type} — {p.shortDesc}</p>
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
                {tech.slice(0, 3).map((t) => (
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {gallery.slice(0, 4).map((g) => (
              <Link
                key={g.id}
                to={`/gallery/${g.id}`}
                className="group rounded-md overflow-hidden bg-background/50 hover:ring-1 hover:ring-primary/30 transition-all"
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {g.thumbnail ? (
                    <img src={g.thumbnail} alt={g.title} className="w-full h-full object-cover" />
                  ) : (
                    <Image className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-heading text-foreground group-hover:text-primary transition-colors truncate">{g.title}</p>
                  <p className="text-[10px] text-muted-foreground">{g.date}</p>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                  <p className="text-[10px] text-muted-foreground truncate">{q.desc}</p>
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
          ALL SYSTEMS OPERATIONAL
        </div>
        <span>MORNEVEN INSTITUTE © 2026</span>
      </motion.div>
    </div>
  );
}
