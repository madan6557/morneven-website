// Lightweight @mention-aware input with username autocomplete.
// Pulls suggestions from the personnel registry (listPersonnel) so mentions
// stay in sync with the people directory.

import { useEffect, useMemo, useRef, useState } from "react";
import { listPersonnel } from "@/services/personnelApi";

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  // visual size variant — only affects suggestion popup font sizing
  size?: "sm" | "md";
  // ref allows the caller to focus the input
  inputRef?: React.RefObject<HTMLInputElement>;
  // accent color for the highlighted suggestion row
  accentColor?: string;
  autoFocus?: boolean;
}

interface Suggestion {
  username: string;
  label: string;
}

// Match the trigger token at the caret: @ followed by word chars, with no
// whitespace between the @ and the caret position.
const TRIGGER_RE = /(?:^|\s)@([\w.\-]*)$/;

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  className = "",
  size = "md",
  inputRef,
  accentColor,
  autoFocus,
}: Props) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;

  const [people, setPeople] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    listPersonnel().then((rows) => {
      if (!alive) return;
      setPeople(
        rows.map((r) => ({
          username: r.username,
          label: r.note ? `${r.username} · ${r.note}` : r.username,
        })),
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!open) return [];
    const q = query.toLowerCase();
    return people
      .filter((p) => p.username.toLowerCase().includes(q))
      .slice(0, 6);
  }, [open, query, people]);

  const detectTrigger = (next: string, caret: number) => {
    const upToCaret = next.slice(0, caret);
    const m = TRIGGER_RE.exec(upToCaret);
    if (m) {
      setQuery(m[1] ?? "");
      setOpen(true);
      setActiveIdx(0);
    } else {
      setOpen(false);
      setQuery("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    onChange(next);
    detectTrigger(next, e.target.selectionStart ?? next.length);
  };

  const insertMention = (username: string) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    // Replace the trailing "@partial" with "@username "
    const replaced = before.replace(/(^|\s)@([\w.\-]*)$/, (_m, lead) => `${lead}@${username} `);
    const next = replaced + after;
    onChange(next);
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => {
      const pos = replaced.length;
      el.focus();
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        /* noop */
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filtered[activeIdx].username);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && onSubmit) {
      onSubmit();
    }
  };

  const accent = accentColor || "hsl(var(--primary))";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full px-3 py-2 bg-card border border-border rounded-sm ${textSize} font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 bottom-full mb-1 z-30 bg-popover border border-border rounded-sm shadow-lg overflow-hidden">
          {filtered.map((p, i) => (
            <button
              key={p.username}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(p.username);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className="w-full text-left px-3 py-1.5 text-xs font-body flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: i === activeIdx ? `${accent}20` : "transparent",
                color: i === activeIdx ? accent : "hsl(var(--foreground))",
              }}
            >
              <span className="font-heading tracking-wider" style={{ color: accent }}>@{p.username}</span>
              {p.label !== p.username && (
                <span className="text-muted-foreground truncate">{p.label.replace(`${p.username} · `, "")}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Render a string with @mentions as accent-colored chips.
export function renderWithMentions(
  text: string,
  accent: string,
  className = "",
): React.ReactNode {
  // Split on @username tokens (word chars, dots, dashes). Preserve surrounding
  // whitespace so the rendered output reads identically to the source.
  const parts = text.split(/(@[\w.\-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span
          key={i}
          className={`font-heading tracking-wider px-1 rounded-sm ${className}`}
          style={{ color: accent, backgroundColor: `${accent}15` }}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
