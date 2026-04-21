import { useState, type RefObject } from "react";
import { Lock } from "lucide-react";
import {
  PERSONNEL_LEVELS,
  PERSONNEL_TRACKS,
  buildRestrictedMarkers,
  type PersonnelLevel,
  type PersonnelTrack,
} from "@/lib/pl";

interface RestrictedMarkerToolProps {
  // The textarea the markers should be inserted into.
  textareaRef: RefObject<HTMLTextAreaElement>;
  // Current value of the textarea (controlled by parent).
  value: string;
  // Receives the new value after a marker is inserted/wrapped.
  onChange: (next: string) => void;
}

/**
 * Author-only inline tool that inserts PL restriction markers into a textarea.
 *
 * - If text is selected, wraps it: `[Lx+ track=...]selection[/Lx+]`
 * - Otherwise, inserts a placeholder block at the caret with sample text.
 *
 * Format is kept compatible with `splitRestricted` in `src/lib/pl.ts`.
 */
export default function RestrictedMarkerTool({
  textareaRef,
  value,
  onChange,
}: RestrictedMarkerToolProps) {
  const [threshold, setThreshold] = useState<PersonnelLevel>(3);
  const [track, setTrack] = useState<PersonnelTrack | "">("");

  const insert = () => {
    const ta = textareaRef.current;
    const trackHint = track === "" ? undefined : track;
    const { open, close } = buildRestrictedMarkers(threshold, trackHint);

    if (!ta) {
      // Fallback: append to the end if the ref isn't ready.
      const placeholder = "Restricted content goes here.";
      const next = `${value}${value.endsWith("\n") ? "" : "\n\n"}${open}${placeholder}${close}`;
      onChange(next);
      return;
    }

    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const inner = selected.length > 0 ? selected : "Restricted content goes here.";
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = `${before}${open}${inner}${close}${after}`;
    onChange(next);

    // Re-focus and position the caret inside the new block for fast editing.
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      const innerStart = before.length + open.length;
      const innerEnd = innerStart + inner.length;
      node.focus();
      node.setSelectionRange(innerStart, innerEnd);
    });
  };

  return (
    <div className="hud-border-sm bg-muted/30 border border-border/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Lock className="h-3 w-3 text-accent-orange" />
        <span className="text-[10px] font-display tracking-[0.15em] uppercase text-muted-foreground">
          Insert Restricted Block
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col">
          <label className="text-[10px] font-display tracking-wider uppercase text-muted-foreground">
            PL Threshold
          </label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) as PersonnelLevel)}
            className="mt-1 px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {PERSONNEL_LEVELS.filter((l) => l >= 1).map((l) => (
              <option key={l} value={l}>
                L{l}+
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-display tracking-wider uppercase text-muted-foreground">
            Track (optional)
          </label>
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value as PersonnelTrack | "")}
            className="mt-1 px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Any track</option>
            {PERSONNEL_TRACKS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label} ({t.short})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={insert}
          className="px-3 py-1.5 text-[10px] font-display tracking-wider uppercase rounded-sm border border-accent-orange/60 text-accent-orange hover:bg-accent-orange hover:text-background transition-colors"
        >
          Wrap / Insert
        </button>
      </div>
      <p className="text-[10px] font-body text-muted-foreground leading-relaxed">
        Select text in the description and click <em>Wrap / Insert</em> to mark it as
        restricted. With nothing selected, a placeholder block is added at the caret.
        Output format: <code className="text-foreground/70">{`[L${threshold}+${track ? ` track=${track}` : ""}]…[/L${threshold}+]`}</code>
      </p>
    </div>
  );
}
