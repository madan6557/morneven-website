import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const BALANCED_COLUMN_TEXT_THRESHOLD = 1200;

interface DetailAdaptiveSectionProps {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  contentClassName?: string;
  asideClassName?: string;
}

export function DetailAdaptiveSection({
  children,
  aside,
  className,
  contentClassName,
  asideClassName,
}: DetailAdaptiveSectionProps) {
  const hasAside = Boolean(aside);
  const contentRef = useRef<HTMLDivElement>(null);
  const [useBalancedColumns, setUseBalancedColumns] = useState(false);

  useEffect(() => {
    if (hasAside) {
      setUseBalancedColumns(false);
      return;
    }

    const textLength = contentRef.current?.innerText.replace(/\s+/g, " ").trim().length ?? 0;
    setUseBalancedColumns(textLength >= BALANCED_COLUMN_TEXT_THRESHOLD);
  }, [children, hasAside]);

  return (
    <div
      className={cn(
        "grid min-w-0 gap-6",
        hasAside && "xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]",
        className,
      )}
    >
      <div
        ref={contentRef}
        className={cn(
          "min-w-0 space-y-4",
          !hasAside && !useBalancedColumns && "max-w-3xl",
          useBalancedColumns &&
            "xl:columns-2 xl:gap-8 xl:space-y-0 xl:[&>*]:mb-4 xl:[&>*]:break-inside-avoid",
          contentClassName,
        )}
      >
        {children}
      </div>
      {aside ? (
        <aside className={cn("min-w-0 space-y-6", asideClassName)}>
          {aside}
        </aside>
      ) : null}
    </div>
  );
}
