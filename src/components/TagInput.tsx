import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  inputClassName?: string;
}

const splitTagText = (text: string) =>
  text
    .split(/[,\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const dedupeTags = (tags: string[]) => {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(tag);
  }
  return next;
};

export function TagInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  className,
  inputClassName,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const tags = dedupeTags(value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()));
  const locked = disabled || readOnly;

  const commitText = (text: string) => {
    if (locked) return;
    const additions = splitTagText(text);
    if (!additions.length) return;
    onChange(dedupeTags([...tags, ...additions]));
    setDraft("");
  };

  const removeTag = (tag: string) => {
    if (locked) return;
    onChange(tags.filter((item) => item !== tag));
  };

  return (
    <div
      className={cn(
        "mt-1 flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1.5 text-sm text-foreground focus-within:outline-none focus-within:ring-1 focus-within:ring-primary",
        disabled && "cursor-not-allowed opacity-50",
        readOnly && "opacity-75",
        className,
      )}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex max-w-full items-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-display uppercase tracking-[0.08em] text-primary"
        >
          <span className="truncate">{tag}</span>
          {!locked && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-primary/70 transition-colors hover:text-primary"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {!locked && (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commitText(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitText(draft);
              return;
            }
            if (event.key === "Backspace" && !draft && tags.length) {
              event.preventDefault();
              onChange(tags.slice(0, -1));
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (!/[,\n\r]/.test(text)) return;
            event.preventDefault();
            commitText(text);
          }}
          className={cn(
            "min-w-32 flex-1 bg-transparent px-1 py-1 text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none",
            inputClassName,
          )}
          placeholder={tags.length ? "" : placeholder}
        />
      )}
    </div>
  );
}

export default TagInput;
