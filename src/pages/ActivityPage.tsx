import { useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, BarChart3, Eye, MessageCircle, Search, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { ContentMetricPill } from "@/components/ContentMetricPill";
import {
  getActivityContent,
  getActivityOverview,
  type ActivityCategory,
  type ActivityContentItem,
  type ActivityOrder,
  type ActivityOverview,
  type ActivitySort,
  type PageInfo,
} from "@/services/api";
import { formatCompactNumber } from "@/lib/formatNumber";

const tabs = ["overview", "content", "signals"] as const;
type ActivityTab = (typeof tabs)[number];

const categories: Array<{ key: ActivityCategory; label: string }> = [
  { key: "all", label: "All" },
  { key: "gallery", label: "Gallery" },
  { key: "character", label: "Characters" },
  { key: "place", label: "Places" },
  { key: "technology", label: "Technology" },
  { key: "creature", label: "Creatures" },
  { key: "event", label: "Events" },
  { key: "other", label: "Other" },
];

const sortOptions: Array<{ key: ActivitySort; label: string }> = [
  { key: "views", label: "Most View" },
  { key: "likes", label: "Most Liked" },
  { key: "dislikes", label: "Most Disliked" },
  { key: "stars", label: "Most Starred" },
  { key: "comments", label: "Discussion" },
  { key: "recent", label: "Recent" },
  { key: "title", label: "Title" },
];

const galleryOnlySorts = new Set<ActivitySort>(["likes", "dislikes"]);
const loreOnlySorts = new Set<ActivitySort>(["stars"]);

function sortOptionsForCategory(category: ActivityCategory) {
  if (category === "gallery") {
    return sortOptions.filter((entry) => !loreOnlySorts.has(entry.key));
  }
  if (category !== "all") {
    return sortOptions.filter((entry) => !galleryOnlySorts.has(entry.key));
  }
  return sortOptions;
}

const summaryMetrics = [
  { key: "views", label: "Views", icon: Eye },
  { key: "likes", label: "Likes", icon: ThumbsUp },
  { key: "dislikes", label: "Dislikes", icon: ThumbsDown },
  { key: "stars", label: "Stars", icon: Star },
  { key: "comments", label: "Discussion", icon: MessageCircle },
] as const;

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("overview");
  const [overview, setOverview] = useState<ActivityOverview | null>(null);
  const [items, setItems] = useState<ActivityContentItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState<ActivityCategory>("all");
  const [sort, setSort] = useState<ActivitySort>("views");
  const [order, setOrder] = useState<ActivityOrder>("desc");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const availableSortOptions = sortOptionsForCategory(category);

  useEffect(() => {
    if (!sortOptionsForCategory(category).some((entry) => entry.key === sort)) {
      setSort("views");
    }
  }, [category, sort]);

  useEffect(() => {
    let active = true;
    void getActivityOverview().then((next) => {
      if (active) setOverview(next);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setItems([]);
    setPageInfo(null);
    void getActivityContent({
      page: 1,
      pageSize: 24,
      category,
      sort,
      order,
      search: deferredSearch,
    })
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        setPageInfo(response.pageInfo);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, deferredSearch, order, sort]);

  const loadMore = async () => {
    if (!pageInfo?.hasNextPage || isLoading) return;
    setIsLoading(true);
    try {
      const response = await getActivityContent({
        page: pageInfo.page + 1,
        pageSize: 24,
        category,
        sort,
        order,
        search: deferredSearch,
      });
      setItems((current) => [...current, ...response.items]);
      setPageInfo(response.pageInfo);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-[0.1em] text-primary">ACTIVITY</h1>
          <div className="mecha-line mt-2 w-32" />
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-sm border px-3 py-2 text-[10px] font-display uppercase tracking-[0.1em] transition-colors ${
                activeTab === tab
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {summaryMetrics.map(({ key, label, icon: Icon }) => (
              <div key={key} className="hud-border-sm bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-display uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 font-display text-2xl tracking-[0.08em] text-foreground">
                  {formatCompactNumber(overview?.totals[key] ?? 0)}
                </p>
              </div>
            ))}
          </div>

          <div className="hud-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-sm uppercase tracking-[0.12em] text-foreground">Content Leaders</h2>
                <p className="text-xs text-muted-foreground">Highest reach across gallery and approved lore.</p>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(overview?.leaders ?? []).map((item) => (
                <ActivityContentRow key={`${item.entityType}:${item.id}`} item={item} compact />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "content" && (
        <div className="space-y-4">
          <ActivityFilters
            category={category}
            sort={sort}
            order={order}
            search={search}
            sortOptions={availableSortOptions}
            onCategoryChange={setCategory}
            onSortChange={setSort}
            onOrderChange={setOrder}
            onSearchChange={setSearch}
          />
          <div className="space-y-3">
            {items.map((item) => (
              <ActivityContentRow key={`${item.entityType}:${item.id}`} item={item} />
            ))}
            {!isLoading && items.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No activity data found.</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-3 pt-2">
            {pageInfo && (
              <p className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">
                Showing {items.length} of {pageInfo.total}
              </p>
            )}
            {pageInfo?.hasNextPage && (
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoading}
                className="rounded-sm border border-primary px-4 py-2 text-xs font-display tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                {isLoading ? "LOADING..." : "LOAD MORE"}
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "signals" && (
        <div className="hud-border bg-card p-5">
          <h2 className="font-heading text-sm uppercase tracking-[0.12em] text-foreground">System Signals</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Signal label="Content Pool" value={overview?.totals.content ?? 0} />
            <Signal label="Gallery Items" value={overview?.totals.gallery ?? 0} />
            <Signal label="Lore Entries" value={overview?.totals.lore ?? 0} />
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityFilters({
  category,
  sort,
  order,
  search,
  sortOptions,
  onCategoryChange,
  onSortChange,
  onOrderChange,
  onSearchChange,
}: {
  category: ActivityCategory;
  sort: ActivitySort;
  order: ActivityOrder;
  search: string;
  sortOptions: Array<{ key: ActivitySort; label: string }>;
  onCategoryChange: (category: ActivityCategory) => void;
  onSortChange: (sort: ActivitySort) => void;
  onOrderChange: (order: ActivityOrder) => void;
  onSearchChange: (search: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search content activity..."
          className="w-full rounded-sm border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => onCategoryChange(entry.key)}
            className={`rounded-sm border px-3 py-2 text-[10px] font-display uppercase tracking-[0.08em] transition-colors ${
              category === entry.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {sortOptions.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => onSortChange(entry.key)}
            className={`rounded-sm border px-3 py-2 text-[10px] font-display uppercase tracking-[0.08em] transition-colors ${
              sort === entry.key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onOrderChange(order === "desc" ? "asc" : "desc")}
          className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-2 text-[10px] font-display uppercase tracking-[0.08em] text-muted-foreground hover:bg-muted"
        >
          <ArrowUpDown className="h-3 w-3" />
          {order === "desc" ? "High First" : "Low First"}
        </button>
      </div>
    </div>
  );
}

function ActivityContentRow({ item, compact = false }: { item: ActivityContentItem; compact?: boolean }) {
  const isGallery = item.entityType === "gallery";

  return (
    <Link to={item.url} className="block">
      <div className={`hud-border-sm bg-card transition-shadow hover:glow-primary ${compact ? "p-3" : "p-4"}`}>
        <div className="flex gap-3">
          <div className={`${compact ? "h-16 w-24" : "h-20 w-28"} flex-shrink-0 overflow-hidden rounded-sm bg-muted`}>
            {item.thumbnail ? (
              <AuthenticatedImage src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                {item.category}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[10px] font-display uppercase tracking-[0.1em] text-accent-orange">{item.category}</p>
              <h3 className="truncate text-sm font-heading text-foreground">{item.title}</h3>
              {!compact && <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ContentMetricPill kind="views" value={item.views} />
              {isGallery ? (
                <>
                  <ContentMetricPill kind="likes" value={item.likes} />
                  <ContentMetricPill kind="dislikes" value={item.dislikes} />
                </>
              ) : (
                <ContentMetricPill kind="stars" value={item.stars} />
              )}
              <ContentMetricPill kind="comments" value={item.comments} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Signal({ label, value }: { label: string; value: number }) {
  return (
    <div className="hud-border-sm bg-background/40 p-4">
      <p className="text-[10px] font-display uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-xl tracking-[0.08em] text-foreground">{formatCompactNumber(value)}</p>
    </div>
  );
}
