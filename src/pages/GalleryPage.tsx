import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { getGallery } from "@/services/api";
import type { GalleryItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";

const typeTabs = ["All", "Image", "Video"] as const;
type SortOption = "newest" | "oldest" | "title";

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const { role } = useAuth();

  useEffect(() => {
    getGallery().then(setItems);
  }, []);

  let filtered = items.filter((item) => {
    if (typeFilter !== "All" && item.type !== typeFilter.toLowerCase()) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.tags.some(t => t.includes(search.toLowerCase()))) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "newest") return b.date.localeCompare(a.date);
    if (sort === "oldest") return a.date.localeCompare(b.date);
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-[0.1em] text-primary">GALLERY</h1>
          <div className="mecha-line w-32 mt-2" />
        </div>
        {role === "author" && (
          <Link to="/author?tab=gallery&action=create" className="flex items-center gap-1 px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground bg-primary rounded-sm hover:opacity-90 transition-opacity">
            <Plus className="h-3 w-3" /> UPLOAD
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search gallery..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          {typeTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-2 text-xs font-display tracking-[0.1em] uppercase border rounded-sm transition-colors
                ${typeFilter === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => setSort(sort === "newest" ? "oldest" : sort === "oldest" ? "title" : "newest")}
            className="flex items-center gap-1 px-3 py-2 text-xs font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sort === "newest" ? "NEW" : sort === "oldest" ? "OLD" : "A-Z"}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item) => (
          <Link key={item.id} to={`/gallery/${item.id}`} className="block group">
            <div className="hud-border-sm bg-card overflow-hidden hover:glow-primary transition-shadow">
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                <span className="text-xs text-muted-foreground font-heading tracking-wider">
                  {item.type === "video" ? "▶ VIDEO" : "IMAGE"}
                </span>
                {item.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[8px] border-l-primary-foreground border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-heading text-foreground truncate group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-[10px] text-muted-foreground font-body mt-1">{item.date}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-body text-sm">No items found.</div>
      )}
    </div>
  );
}
