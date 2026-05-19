import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Image as ImageIcon, Play } from "lucide-react";
import type { DocItem } from "@/types";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { downloadAuthenticatedFile, openAuthenticatedFile } from "@/services/fileProxyService";
import { cn } from "@/lib/utils";
import { ContentState } from "@/components/ContentState";
import { sortDocsByDateDesc } from "@/lib/documentation";

type DocumentationViewerProps = {
  docs?: DocItem[];
  title?: string;
  emptyText?: string;
  itemLabel?: string;
  accentColor?: string;
  className?: string;
  showEmpty?: boolean;
};

const typeIcon = {
  image: ImageIcon,
  video: Play,
  file: FileText,
} satisfies Record<DocItem["type"], typeof FileText>;

function docFallbackName(doc: DocItem, index: number, itemLabel: string) {
  return doc.caption?.trim() || `${itemLabel} document ${index + 1}`;
}

export default function DocumentationViewer({
  docs = [],
  title = "Documentation",
  emptyText = "No documentation attached.",
  itemLabel = "content",
  accentColor,
  className,
  showEmpty = false,
}: DocumentationViewerProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sortedDocs = useMemo(() => sortDocsByDateDesc(docs), [docs]);
  const activeDoc = activeIndex === null ? null : sortedDocs[activeIndex] ?? null;
  const hasDocs = sortedDocs.length > 0;
  const sectionStyle = useMemo(
    () => (accentColor ? { borderColor: `${accentColor}30` } : undefined),
    [accentColor],
  );
  const counts = useMemo(() => {
    return sortedDocs.reduce(
      (summary, doc) => {
        summary[doc.type] += 1;
        return summary;
      },
      { image: 0, video: 0, file: 0 } as Record<DocItem["type"], number>,
    );
  }, [sortedDocs]);

  const openDoc = (index: number) => setActiveIndex(index);
  const closeDoc = () => setActiveIndex(null);
  const goPrevious = useCallback(
    () => setActiveIndex((current) => (current === null ? current : (current - 1 + sortedDocs.length) % sortedDocs.length)),
    [sortedDocs.length],
  );
  const goNext = useCallback(
    () => setActiveIndex((current) => (current === null ? current : (current + 1) % sortedDocs.length)),
    [sortedDocs.length],
  );

  useEffect(() => {
    if (activeIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, goNext, goPrevious]);

  if (!hasDocs && !showEmpty) return null;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-3 border-b pb-2" style={sectionStyle}>
        <h2 className="font-heading text-lg tracking-wider text-foreground uppercase">{title}</h2>
        {hasDocs && (
          <span className="rounded-sm border border-border bg-muted px-2 py-1 text-[10px] font-heading tracking-wider text-muted-foreground uppercase">
            {sortedDocs.length} item{sortedDocs.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {hasDocs && (
        <div className="flex flex-col gap-3 rounded-sm border border-border/70 bg-card/45 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-muted-foreground">
            Preview, inspect, and download attachments linked to {itemLabel}.
          </p>
          <div className="flex flex-wrap gap-2">
            {counts.image > 0 && (
              <span className="rounded-sm border border-border bg-background px-2.5 py-1 text-[10px] font-heading tracking-wider text-foreground uppercase">
                {counts.image} image{counts.image === 1 ? "" : "s"}
              </span>
            )}
            {counts.video > 0 && (
              <span className="rounded-sm border border-border bg-background px-2.5 py-1 text-[10px] font-heading tracking-wider text-foreground uppercase">
                {counts.video} video{counts.video === 1 ? "" : "s"}
              </span>
            )}
            {counts.file > 0 && (
              <span className="rounded-sm border border-border bg-background px-2.5 py-1 text-[10px] font-heading tracking-wider text-foreground uppercase">
                {counts.file} file{counts.file === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      )}

      {!hasDocs ? (
        <ContentState
          kind="empty"
          title="No documentation attached"
          description={emptyText}
          className="bg-card/55"
        />
      ) : (
        <div className="rounded-sm border border-border/70 bg-card/55 p-3">
          <div className="max-h-[420px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sortedDocs.map((doc, index) => {
                const Icon = typeIcon[doc.type] ?? FileText;
                const label = docFallbackName(doc, index, itemLabel);
                return (
                  <button
                    key={`${doc.type}-${doc.url}-${index}`}
                    type="button"
                    onClick={() => openDoc(index)}
                    className="group overflow-hidden rounded-sm border border-border bg-background text-left transition-colors hover:border-primary/70 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/45"
                    style={accentColor ? { borderColor: `${accentColor}24` } : undefined}
                  >
                    <div className="relative aspect-video bg-muted">
                      {doc.type === "image" && doc.url ? (
                        <AuthenticatedImage
                          src={doc.url}
                          alt={label}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Icon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <span className="absolute left-2 top-2 rounded-sm border border-border/80 bg-background/90 px-2 py-1 text-[10px] font-heading tracking-wider text-foreground uppercase">
                        {doc.type}
                      </span>
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-2 text-sm font-body text-foreground">{label}</p>
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-[10px] font-heading tracking-wider text-muted-foreground uppercase">Open preview</p>
                        <span className="text-[10px] font-heading tracking-wider text-foreground/70 uppercase">
                          {doc.date || (doc.type === "file" ? "Preview or download" : "Inspect asset")}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Dialog open={activeDoc !== null} onOpenChange={(open) => { if (!open) closeDoc(); }}>
        <DialogContent className="max-h-[92vh] w-[min(1120px,calc(100vw-24px))] max-w-none gap-0 overflow-hidden border-border bg-background p-0 sm:rounded-sm">
          {activeDoc && activeIndex !== null && (
            <div className="grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)_auto]">
              <div className="border-b border-border bg-card px-4 py-3 pr-12">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <DialogTitle className="font-heading text-sm tracking-wider text-foreground uppercase">
                      {docFallbackName(activeDoc, activeIndex, itemLabel)}
                    </DialogTitle>
                    <DialogDescription className="font-body text-xs text-muted-foreground">
                      {activeDoc.type.toUpperCase()} {activeIndex + 1} of {sortedDocs.length}
                    </DialogDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeDoc.url && activeDoc.type !== "video" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void openAuthenticatedFile(activeDoc.url)}
                      >
                        <ExternalLink className="h-4 w-4" /> Open
                      </Button>
                    )}
                    {activeDoc.url && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void downloadAuthenticatedFile(activeDoc.url, docFallbackName(activeDoc, activeIndex, itemLabel))}
                      >
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative min-h-0 bg-muted/35 p-3 md:p-5">
                <div className="flex h-full min-h-[320px] items-center justify-center overflow-hidden rounded-sm border border-border bg-background">
                  {activeDoc.type === "image" && activeDoc.url ? (
                    <AuthenticatedImage
                      src={activeDoc.url}
                      alt={docFallbackName(activeDoc, activeIndex, itemLabel)}
                      className="max-h-[70vh] w-full object-contain"
                    />
                  ) : activeDoc.type === "video" && activeDoc.url ? (
                    <iframe
                      src={activeDoc.url}
                      className="aspect-video h-full max-h-[70vh] w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={docFallbackName(activeDoc, activeIndex, itemLabel)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 p-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="font-heading text-sm tracking-wider text-foreground uppercase">
                          File attachment
                        </p>
                        <p className="max-w-md text-sm text-muted-foreground">
                          Open or download this file to inspect the full document.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {activeDoc.url && (
                          <>
                            <Button
                              type="button"
                              onClick={() => void downloadAuthenticatedFile(activeDoc.url, docFallbackName(activeDoc, activeIndex, itemLabel))}
                            >
                              <Download className="h-4 w-4" /> Download
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void openAuthenticatedFile(activeDoc.url)}
                            >
                              <ExternalLink className="h-4 w-4" /> Open
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {sortedDocs.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={goPrevious}
                      className="absolute left-4 top-1/2 h-9 w-9 -translate-y-1/2 bg-background/90"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={goNext}
                      className="absolute right-4 top-1/2 h-9 w-9 -translate-y-1/2 bg-background/90"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
                <p className="line-clamp-2 text-xs font-body text-muted-foreground text-justify">
                  {activeDoc.caption || "No caption provided."}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={goPrevious} disabled={sortedDocs.length < 2}>
                    Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={goNext} disabled={sortedDocs.length < 2}>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
