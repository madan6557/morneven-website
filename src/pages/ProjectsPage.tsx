import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects } from "@/services/api";
import type { Project } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";

const tabs = ["All", "Planning", "On Progress", "On Hold", "Completed", "Canceled"] as const;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<string>("All");
  const { role } = useAuth();

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  const filtered = active === "All" ? projects : projects.filter((p) => p.status === active);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-[0.1em] text-primary">PROJECTS</h1>
          <div className="mecha-line w-32 mt-2" />
        </div>
        {role === "author" && (
          <Link to="/author?tab=projects&action=create" className="flex items-center gap-1 px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground bg-primary rounded-sm hover:opacity-90 transition-opacity">
            <Plus className="h-3 w-3" /> NEW
          </Link>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-4 py-1.5 text-xs font-display tracking-[0.1em] uppercase border rounded-sm transition-colors
              ${active === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="block">
            <div className="hud-border bg-card overflow-hidden hover:glow-primary transition-shadow">
              {p.thumbnail ? (
                <div className="aspect-video bg-muted rounded-sm overflow-hidden">
                  <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-sm flex items-center justify-center">
                  <span className="text-xs text-muted-foreground font-heading tracking-wider">NO IMAGE</span>
                </div>
              )}
              <div className="p-5 space-y-3">
                <h3 className="font-heading text-base text-foreground">{p.title}</h3>
                <p className="text-xs text-muted-foreground font-body line-clamp-2">{p.shortDesc}</p>
                <span className={`inline-block text-[10px] font-display tracking-wider uppercase ${p.status === "On Progress" ? "text-accent-yellow" :
                    p.status === "Planning" ? "text-primary" :
                      p.status === "On Hold" ? "text-accent-orange" :
                        p.status === "Completed" ? "text-emerald-600 dark:text-emerald-400" :
                          "text-destructive"
                  }`}>{p.status}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
