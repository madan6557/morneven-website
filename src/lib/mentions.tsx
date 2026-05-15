import type { ReactNode } from "react";
import type { DiscussionMention } from "@/types";
import { accentSurface, accentText } from "@/lib/themeColor";

export function renderWithMentions(
  text: string,
  accent: string,
  className = "",
): ReactNode {
  const readableAccent = accentText(accent);
  const softAccentSurface = accentSurface(accent);
  const parts = text.split(/(@[\w.-]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span
          key={index}
          className={`font-heading tracking-wider px-1 rounded-sm ${className}`}
          style={{ color: readableAccent, backgroundColor: softAccentSurface }}
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function extractMentions(text: string): DiscussionMention[] {
  const matches = text.matchAll(/@([\w.-]+)/g);
  const result: DiscussionMention[] = [];

  for (const match of matches) {
    const raw = match[0];
    const username = match[1];
    const start = match.index ?? -1;
    if (start < 0) continue;
    result.push({
      username,
      start,
      end: start + raw.length,
    });
  }

  return result;
}
