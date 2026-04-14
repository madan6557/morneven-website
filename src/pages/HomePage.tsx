import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getProjects, getCharacters, getNews } from "@/services/api";
import type { Project, Character, NewsItem } from "@/types";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    getProjects().then((p) => setProjects(p.slice(0, 3)));
    getCharacters().then((c) => setCharacters(c.slice(0, 3)));
    getNews().then(setNews);
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-[0.1em] text-primary">COMMAND CENTER</h1>
          <div className="mecha-line w-32 mt-2" />
        </div>
        <ThemeToggle />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Latest Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="hud-border bg-card p-5 space-y-4 glow-primary"
        >
          <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Latest Projects</h3>
          <div className="mecha-line" />
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id} className="text-sm font-body text-foreground/80 flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-accent-yellow flex-shrink-0" />
                <Link to={`/projects/${p.id}`} className="hover:text-primary transition-colors">
                  {p.title} — <span className="text-muted-foreground">{p.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Featured Lore */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hud-border bg-card p-5 space-y-4 glow-primary"
        >
          <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">Featured Lore</h3>
          <div className="mecha-line" />
          <ul className="space-y-2">
            {characters.map((c) => (
              <li key={c.id} className="text-sm font-body text-foreground/80 flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-accent-yellow flex-shrink-0" />
                <Link to={`/lore/characters/${c.id}`} className="hover:text-primary transition-colors">
                  {c.name} — <span className="text-muted-foreground">{c.race}</span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* News Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hud-border bg-card p-5 space-y-4 glow-primary"
        >
          <h3 className="font-heading text-sm tracking-[0.15em] text-accent-orange uppercase">News Feed</h3>
          <div className="mecha-line" />
          <ul className="space-y-2">
            {news.map((n) => (
              <li key={n.id} className="text-sm font-body text-foreground/80 flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-accent-yellow flex-shrink-0" />
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
