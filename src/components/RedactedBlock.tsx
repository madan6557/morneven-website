import { Link } from "react-router-dom";
import { Lock, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  splitRestricted,
  canAccessRestricted,
  PL_RESTRICTED_THRESHOLD,
  PL_LORE_ID,
} from "@/lib/pl";

interface RedactedBlockProps {
  fullDesc: string;
  // Tailwind classes applied to each <p> in the block
  paragraphClass?: string;
}

/**
 * Renders a free-form description with PL-gated blocks.
 *
 * Authors mark restricted sections in source with `[L3+]...[/L3+]`.
 * Users below PL3 see a redacted notice instead of the marked content.
 */
export default function RedactedBlock({
  fullDesc,
  paragraphClass = "text-sm font-body text-foreground/80 leading-relaxed whitespace-pre-line",
}: RedactedBlockProps) {
  const { personnelLevel } = useAuth();
  const cleared = canAccessRestricted(personnelLevel);
  const segments = splitRestricted(fullDesc);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.restricted && !cleared) {
          return (
            <div
              key={i}
              className="hud-border-sm bg-muted/40 border border-dashed border-accent-orange/40 p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-accent-orange">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-display tracking-[0.15em] uppercase">
                  Restricted — Clearance L{PL_RESTRICTED_THRESHOLD}+ Required
                </span>
              </div>
              <p className="text-xs font-body text-muted-foreground leading-relaxed">
                The remainder of this section contains operational detail above
                your current Personnel Level (L{personnelLevel}). A redacted
                summary is on file; full text is sealed pending clearance
                review.
              </p>
              <Link
                to={`/lore/other/${PL_LORE_ID}`}
                className="inline-flex items-center gap-1 text-[10px] font-display tracking-wider uppercase text-accent-orange hover:underline"
              >
                <ShieldAlert className="h-3 w-3" /> About PL Clearance
              </Link>
            </div>
          );
        }

        // Render paragraph(s) — split on blank lines like the rest of the app.
        return seg.text
          .split("\n\n")
          .filter((p) => p.trim().length > 0)
          .map((para, j) => (
            <p key={`${i}-${j}`} className={paragraphClass}>
              {para.trim()}
            </p>
          ));
      })}
    </>
  );
}
