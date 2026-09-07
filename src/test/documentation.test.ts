import { describe, expect, it } from "vitest";
import { normalizeDocsForEditor, normalizeDocsForSave, sortDocsByDateDesc } from "@/lib/documentation";
import type { DocItem } from "@/types";

describe("documentation helpers", () => {
  it("sorts docs by date descending", () => {
    const docs: DocItem[] = [
      { type: "image", url: "url1", caption: "old", date: "2024-01-01" },
      { type: "image", url: "url2", caption: "new", date: "2026-09-07" },
      { type: "image", url: "url3", caption: "mid", date: "2025-06-15" },
    ];
    const sorted = sortDocsByDateDesc(docs);
    expect(sorted.map((d) => d.caption)).toEqual(["new", "mid", "old"]);
  });

  it("normalizes image docs by falling back between url and thumbnail in save and editor", () => {
    const docs: DocItem[] = [
      { type: "image", url: "", thumbnail: "projects/thumb-only.png", caption: "Thumb only", date: "2026-09-07" },
      { type: "image", url: "projects/url-only.png", thumbnail: "", caption: "Url only", date: "2026-09-07" },
      { type: "file", url: "projects/document.pdf", thumbnail: "", caption: "File doc", date: "2026-09-07" },
    ];

    const saved = normalizeDocsForSave(docs, "2026-09-07");
    const thumbOnly = saved.find((d) => d.caption === "Thumb only");
    const urlOnly = saved.find((d) => d.caption === "Url only");
    const fileDoc = saved.find((d) => d.caption === "File doc");

    expect(thumbOnly?.url).toBe("projects/thumb-only.png");
    expect(thumbOnly?.thumbnail).toBe("projects/thumb-only.png");

    expect(urlOnly?.url).toBe("projects/url-only.png");
    expect(urlOnly?.thumbnail).toBe("projects/url-only.png");

    // File doc shouldn't sync file url into thumbnail
    expect(fileDoc?.url).toBe("projects/document.pdf");
    expect(fileDoc?.thumbnail).toBe("");

    const editor = normalizeDocsForEditor(docs, "2026-09-07");
    const editorThumbOnly = editor.find((d) => d.caption === "Thumb only");
    expect(editorThumbOnly?.url).toBe("projects/thumb-only.png");
    expect(editorThumbOnly?.thumbnail).toBe("projects/thumb-only.png");
  });
});
