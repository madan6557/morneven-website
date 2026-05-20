import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, BarChart3, ChevronDown, Eye, MessageCircle, Search, Star, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { ContentMetricPill } from "@/components/ContentMetricPill";
import {
  getActivityContent,
  getActivityContentDetail,
  getActivityOverview,
  type ActivityCategory,
  type ActivityContentDetail,
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
  const [selectedItem, setSelectedItem] = useState<ActivityContentItem | null>(null);
  const [detail, setDetail] = useState<ActivityContentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const inspectorRef = useRef<HTMLDivElement | null>(null);
  const pendingInspectorFocusRef = useRef(false);
  const pendingRowRestoreKeyRef = useRef<string | null>(null);
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
    setSelectedItem(null);
    setDetail(null);
    setDetailError(null);
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

  const selectContentItem = async (item: ActivityContentItem) => {
    pendingInspectorFocusRef.current = true;
    setSelectedItem(item);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setDetail(await getActivityContentDetail(item.entityType, item.id));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Content activity detail could not be loaded.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedItem || !pendingInspectorFocusRef.current) return;
    const inspector = inspectorRef.current;
    if (!inspector) return;
    const id = window.requestAnimationFrame(() => {
      const firstInteractive = inspector.querySelector<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])");
      firstInteractive?.focus({ preventScroll: true });
      pendingInspectorFocusRef.current = false;
    });
    return () => window.cancelAnimationFrame(id);
  }, [selectedItem, detail, detailLoading, detailError]);

  useEffect(() => {
    if (selectedItem || !pendingRowRestoreKeyRef.current) return;
    const rowKey = pendingRowRestoreKeyRef.current;
    const id = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-activity-row="${CSS.escape(rowKey)}"]`)
        ?.focus({ preventScroll: true });
      pendingRowRestoreKeyRef.current = null;
    });
    return () => window.cancelAnimationFrame(id);
  }, [selectedItem, items]);

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
            {items.map((item) => {
              const selected = selectedItem?.id === item.id && selectedItem.entityType === item.entityType;
              return (
                <div key={`${item.entityType}:${item.id}`} className="space-y-2">
                  <ActivityContentRow item={item} selected={selected} onSelect={selectContentItem} />
                  {selected && (
                    <ActivityContentInspector
                      inspectorRef={inspectorRef}
                      item={item}
                      detail={detail}
                      loading={detailLoading}
                      error={detailError}
                      onClose={() => {
                        pendingRowRestoreKeyRef.current = `${item.entityType}:${item.id}`;
                        setSelectedItem(null);
                        setDetail(null);
                        setDetailError(null);
                      }}
                    />
                  )}
                </div>
              );
            })}
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

function ActivityContentInspector({
  inspectorRef,
  item,
  detail,
  loading,
  error,
  onClose,
}: {
  inspectorRef: RefObject<HTMLDivElement | null>;
  item: ActivityContentItem;
  detail: ActivityContentDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const current = detail ?? item;

  return (
    <div ref={inspectorRef} className="hud-border bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <div className="h-40 w-full flex-shrink-0 overflow-hidden rounded-sm bg-muted sm:h-24 sm:w-32">
            {current.thumbnail ? (
              <AuthenticatedImage src={current.thumbnail} alt={current.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                {current.category}
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-display uppercase tracking-[0.1em] text-accent-orange">{current.category}</p>
            <h2 className="break-words font-heading text-base text-foreground sm:text-lg">{current.title}</h2>
            <p className="line-clamp-2 text-xs text-muted-foreground">{current.subtitle}</p>
            <div className="flex flex-wrap gap-1.5">
              <ContentMetricPill kind="views" value={current.views} />
              {current.entityType === "gallery" ? (
                <>
                  <ContentMetricPill kind="likes" value={current.likes} />
                  <ContentMetricPill kind="dislikes" value={current.dislikes} />
                </>
              ) : (
                <ContentMetricPill kind="stars" value={current.stars} />
              )}
              <ContentMetricPill kind="comments" value={current.comments} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 md:flex md:flex-shrink-0 md:items-center">
          <Link
            to={current.url}
            className="inline-flex items-center justify-center rounded-sm border border-primary/60 px-3 py-2 text-[10px] font-display uppercase tracking-[0.1em] text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Go to page
          </Link>
          <button type="button" onClick={onClose} className="rounded-sm border border-border p-2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading content activity detail...</p>
      ) : error ? (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      ) : detail ? (
        <div className="mt-4 grid gap-2 sm:gap-3 xl:grid-cols-2">
          <ActivityInspectorSection title="Viewers" count={detail.viewers.length} defaultOpen>
            <div className="space-y-2">
              {detail.viewers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No viewer records yet.</p>
              ) : detail.viewers.map((viewer) => (
                <p key={`${viewer.kind}:${viewer.label}`} className="break-words rounded-sm border border-border/60 bg-background/45 px-3 py-2 text-sm text-foreground">
                  {viewer.label} viewed {formatCompactNumber(viewer.count)} time{viewer.count === 1 ? "" : "s"}
                </p>
              ))}
            </div>
          </ActivityInspectorSection>
          <ActivityInspectorSection title="Liked by" count={detail.likedBy.length}>
            <ActivityUserList items={detail.likedBy} empty="No likes recorded." />
          </ActivityInspectorSection>
          <ActivityInspectorSection title="Disliked by" count={detail.dislikedBy.length}>
            <ActivityUserList items={detail.dislikedBy} empty="No dislikes recorded." />
          </ActivityInspectorSection>
          <ActivityInspectorSection title="Starred by" count={detail.starredBy.length}>
            <ActivityUserList items={detail.starredBy} empty="No stars recorded." />
          </ActivityInspectorSection>
          <ActivityInspectorSection title="Discussion" count={detail.discussion.reduce((count, comment) => count + 1 + comment.replies.length, 0)} defaultOpen>
            <div className="space-y-2">
              {detail.discussion.length === 0 ? (
                <p className="text-xs text-muted-foreground">No comments or discussion yet.</p>
              ) : detail.discussion.map((comment) => (
                <div key={comment.id} className="rounded-sm border border-border/60 bg-background/45 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-heading text-foreground">{comment.author}</span>
                    <span>{comment.date}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{comment.text}</p>
                  {comment.replies.length > 0 && (
                    <div className="mt-3 space-y-2 border-l border-border pl-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id}>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-heading text-foreground">{reply.author}</span>
                            <span>{reply.date}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-foreground">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ActivityInspectorSection>
        </div>
      ) : null}
    </div>
  );
}

function ActivityInspectorSection({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-sm border border-border bg-background/35">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="min-w-0 break-words text-[10px] font-display uppercase tracking-[0.12em] text-foreground">
          {title} ({formatCompactNumber(count)})
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border/60 p-3">{children}</div>}
    </section>
  );
}

function ActivityUserList({ items, empty }: { items: Array<{ username: string; date?: string }>; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span key={`${item.username}:${item.date ?? index}`} className="max-w-full break-words rounded-sm border border-border/60 bg-background/45 px-2 py-1 text-xs text-foreground">
          {item.username}
        </span>
      ))}
    </div>
  );
}

function ActivityContentRow({
  item,
  compact = false,
  selected = false,
  onSelect,
}: {
  item: ActivityContentItem;
  compact?: boolean;
  selected?: boolean;
  onSelect?: (item: ActivityContentItem) => void;
}) {
  const isGallery = item.entityType === "gallery";
  const rowKey = `${item.entityType}:${item.id}`;
  const content = (
    <div className={`hud-border-sm bg-card transition-shadow hover:glow-primary ${selected ? "ring-1 ring-primary/45" : ""} ${compact ? "p-3" : "p-4"}`}>
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
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="block w-full text-left"
        data-activity-row={rowKey}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={item.url} className="block">
      {content}
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
