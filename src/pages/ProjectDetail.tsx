import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getProject } from "@/services/api";
import type { Project } from "@/types";
import { ArrowLeft, Calendar, Tag } from "lucide-react";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (id) getProject(id).then((p) => setProject(p ?? null));
  }, [id]);

  if (!project) {
    return (
      <div className="p-8 text-muted-foreground font-body">Loading project...</div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Parallax-style header */}
      <div className="relative h-64 md:h-80 overflow-hidden flex items-end" style={project.thumbnail ? { backgroundImage: `url(${project.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "var(--color-muted)" }}>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
        {!project.thumbnail && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl text-muted-foreground/10 tracking-[0.3em]">MORNEVEN</span>
          </div>
        )}
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link to="/projects" className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3 w-3" /> BACK TO PROJECTS
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">{project.title.toUpperCase()}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-display tracking-wider uppercase ${project.status === "On Progress" ? "text-accent-yellow" :
                project.status === "Planning" ? "text-primary" :
                  project.status === "On Hold" ? "text-accent-orange" :
                    project.status === "Completed" ? "text-emerald-600 dark:text-emerald-400" :
                      "text-destructive"
              }`}>{project.status}</span>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="mecha-line" />

        {/* Description */}
        <div className="max-w-3xl space-y-4">
          <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Description</h2>
          {project.fullDesc.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm font-body text-foreground/80 leading-relaxed">{para}</p>
          ))}
        </div>

        {/* Patch Notes */}
        {project.patches.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Patch Notes</h2>
            <div className="space-y-3">
              {project.patches.map((patch) => (
                <motion.div
                  key={patch.version}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="hud-border-sm bg-card p-4 flex flex-col sm:flex-row sm:items-start gap-3"
                >
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Tag className="h-3 w-3 text-accent-orange" />
                    <span className="font-display text-xs tracking-wider text-accent-orange">v{patch.version}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-body text-foreground/80">{patch.notes}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-heading flex-shrink-0">
                    <Calendar className="h-3 w-3" />
                    {patch.date}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation */}
        {project.docs.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">Documentation</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {project.docs.map((doc, i) => (
                <div key={i} className="hud-border-sm bg-card overflow-hidden">
                  {doc.type === "video" && doc.url ? (
                    <div className="aspect-video bg-muted">
                      <iframe
                        src={doc.url}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`${project.title} Documentation`}
                      />
                    </div>
                  ) : doc.type === "image" && doc.url ? (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img src={doc.url} alt={doc.caption} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground font-heading tracking-wider">
                        {doc.type === "video" ? "▶ VIDEO" : "IMAGE"}
                      </span>
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
      </div>
    </div>
  );
}
