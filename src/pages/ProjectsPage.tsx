import { useDeferredValue, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getProjectsPage, type PageInfo } from "@/services/api";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import type { Project } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Archive, Plus, Search } from "lucide-react";
import { ContentState } from "@/components/ContentState";
import { canAccessAuthorPanel } from "@/lib/pl";

const tabs = ["All", "Planning", "On Progress", "On Hold", "Completed", "Canceled", "Archived"] as const;
type Tab = typeof tabs[number];
const PROJECT_PAGE_SIZE = 24;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as Tab) || "All";
  const [active, setActive] = useState<Tab>(tabs.includes(initial) ? initial : "All");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { personnelLevel, track } = useAuth();
  const canCreateProject = canAccessAuthorPanel({ level: personnelLevel, track, section: "projects" });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadProjects(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, deferredSearch]);

  // Keep URL tab in sync so a refresh keeps the active tab.
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (active === "All") next.delete("tab");
    else next.set("tab", active);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function loadProjects(reset = false) {
    const page = reset ? 1 : (pageInfo?.page ?? 1) + 1;
    const isArchived = active === "Archived";
    const status = active !== "All" && active !== "Archived" ? active : undefined;

    setLoading(true);
    setErrorMessage("");
    try {
      const response = await getProjectsPage({
        page,
        pageSize: PROJECT_PAGE_SIZE,
        status,
        archived: isArchived ? true : false,
        search: deferredSearch,
      });
      setProjects((current) => reset ? response.items : [...current, ...response.items]);
      setPageInfo(response.pageInfo);
    } catch (error) {
      if (reset) {
        setProjects([]);
        setPageInfo(null);
      }
      setErrorMessage(
        error instanceof Error
          ? error.message === "Failed to fetch"
            ? "Network request failed."
            : error.message
          : "Projects could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-[0.1em] text-primary">PROJECTS</h1>
          <div className="mecha-line w-32 mt-2" />
        </div>
        {canCreateProject && (
          <Link to="/author?tab=projects&action=create" className="inline-flex w-fit items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground transition-opacity hover:opacity-90">
            <Plus className="h-3 w-3" /> NEW
          </Link>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`flex min-w-[6.5rem] items-center justify-center gap-1 rounded-sm border px-4 py-2 text-xs font-display uppercase tracking-[0.1em] transition-colors
                ${active === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/80 hover:bg-muted"}`}
            >
              {t === "Archived" && <Archive className="h-3 w-3" />}
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full rounded-sm border border-border bg-card py-2 pl-10 pr-3 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {errorMessage && projects.length > 0 && (
        <ContentState
          kind="error"
          title="Project refresh failed"
          description={`The last request did not complete. ${errorMessage}`}
          actionLabel="Retry"
          onAction={() => { void loadProjects(true); }}
          compact
          className="bg-card/65 text-left"
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && projects.length === 0 && (
          <div className="col-span-full">
            <ContentState
              kind="loading"
              title="Loading projects"
              description="The project archive is being requested from the backend."
            />
          </div>
        )}
        {!loading && projects.length === 0 && errorMessage && (
          <div className="col-span-full">
            <ContentState
              kind="error"
              title="Project archive unavailable"
              description={`The project list could not be loaded. ${errorMessage}`}
              actionLabel="Retry"
              onAction={() => { void loadProjects(true); }}
            />
          </div>
        )}
        {!loading && projects.length === 0 && !errorMessage && (
          <div className="col-span-full">
            <ContentState
              kind="empty"
              title={search.trim() ? "No matching projects" : active === "Archived" ? "No archived projects" : "No projects in this view"}
              description={search.trim()
                ? "Try a different keyword or remove filters to broaden the result set."
                : active === "Archived"
                  ? "Archived entries will appear here once at least one project has been archived."
                  : "There is no project published for this filter yet."}
            />
          </div>
        )}
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="block">
            <div className={`hud-border bg-card overflow-hidden hover:glow-primary transition-shadow ${p.archived ? "opacity-70" : ""}`}>
              {p.thumbnail ? (
                <div className="aspect-video bg-muted rounded-sm overflow-hidden">
                  <AuthenticatedImage src={p.thumbnail} alt={p.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-sm flex items-center justify-center">
                  <span className="text-xs text-muted-foreground font-heading tracking-wider">NO IMAGE</span>
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base text-foreground">{p.title}</h3>
                  {p.archived && (
                    <span className="text-[9px] font-display tracking-wider uppercase border border-muted-foreground/40 text-muted-foreground px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                      <Archive className="h-2.5 w-2.5" /> Archived
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-body text-justify line-clamp-2">{p.shortDesc}</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`inline-block text-[10px] font-display tracking-wider uppercase ${p.status === "On Progress" ? "text-accent-yellow" :
                      p.status === "Planning" ? "text-primary" :
                        p.status === "On Hold" ? "text-accent-orange" :
                          p.status === "Completed" ? "text-emerald-600 dark:text-emerald-400" :
                            "text-destructive"
                    }`}>{p.status}</span>
                  {p.contributor && (
                    <span className="text-[9px] font-display tracking-wider uppercase text-muted-foreground">
                      by {p.contributor}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        {pageInfo && (
          <p className="text-[11px] font-display tracking-wider text-muted-foreground uppercase">
            Showing {projects.length} of {pageInfo.total}
          </p>
        )}
        {pageInfo?.hasNextPage && (
          <button
            type="button"
            onClick={() => loadProjects(false)}
            disabled={loading}
            className="px-4 py-2 text-xs font-display tracking-wider border border-primary text-primary rounded-sm hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary transition-colors"
          >
            {loading ? "LOADING..." : "LOAD MORE"}
          </button>
        )}
        {loading && !pageInfo?.hasNextPage && (
          <p className="text-sm text-muted-foreground font-body">Loading projects...</p>
        )}
      </div>
    </div>
  );
}
