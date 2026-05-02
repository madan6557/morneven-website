import { db, hasStorage } from "@/services/dataStore";

export type ExtractionMode = "db" | "images" | "all";
export type ExtractionStatus = "processing" | "completed" | "failed";

export interface ExtractionJob {
  id: string;
  mode: ExtractionMode;
  autoDownload: boolean;
  status: ExtractionStatus;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  downloadName?: string;
  blobUrl?: string;
  error?: string;
}

const KEY = "morneven_extraction_history_v1";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function crc32(buf: Uint8Array): number { let c = ~0; for (const b of buf) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }
function le(n: number, bytes: number) { const out = new Uint8Array(bytes); for (let i=0;i<bytes;i++) out[i] = (n >>> (8*i)) & 0xff; return out; }
function enc(s: string) { return new TextEncoder().encode(s); }

function makeZip(files: Array<{ name: string; content: string }>): Blob {
  const chunks: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const f of files) {
    const name = enc(f.name); const content = enc(f.content); const crc = crc32(content);
    const local = [le(0x04034b50,4), le(20,2), le(0,2), le(0,2), le(0,2), le(0,2), le(crc,4), le(content.length,4), le(content.length,4), le(name.length,2), le(0,2), name, content];
    const l = concat(local); chunks.push(l);
    const c = concat([le(0x02014b50,4), le(20,2), le(20,2), le(0,2), le(0,2), le(0,2), le(0,2), le(crc,4), le(content.length,4), le(content.length,4), le(name.length,2), le(0,2), le(0,2), le(0,2), le(0,2), le(0,4), le(offset,4), name]);
    central.push(c); offset += l.length;
  }
  const cdir = concat(central);
  const end = concat([le(0x06054b50,4), le(0,2), le(0,2), le(files.length,2), le(files.length,2), le(cdir.length,4), le(offset,4), le(0,2)]);
  const blobParts = [...chunks, cdir, end].map((part) => part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength));
  return new Blob(blobParts, { type: "application/zip" });
}
function concat(parts: Uint8Array[]) { const len = parts.reduce((a,p)=>a+p.length,0); const out = new Uint8Array(len); let o=0; for(const p of parts){out.set(p,o);o+=p.length;} return out; }

function readHistory(): ExtractionJob[] {
  if (!hasStorage()) return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ExtractionJob[]; } catch { return []; }
}
function saveHistory(items: ExtractionJob[]) { if (hasStorage()) localStorage.setItem(KEY, JSON.stringify(items)); }

export function listExtractionHistory() {
  const now = Date.now();
  const items = readHistory().filter((i) => new Date(i.expiresAt).getTime() > now);
  saveHistory(items);
  return items.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function clearExtractionHistory(ids?: string[]) {
  if (!ids || ids.length === 0) return saveHistory([]);
  saveHistory(listExtractionHistory().filter((i) => !ids.includes(i.id)));
}

function buildFiles(mode: ExtractionMode) {
  const files: Array<{name:string;content:string}> = [];
  if (mode === "db" || mode === "all") {
    files.push({ name: "db/characters.json", content: JSON.stringify(db.characters, null, 2) });
    files.push({ name: "db/creatures.json", content: JSON.stringify(db.creatures, null, 2) });
    files.push({ name: "db/places.json", content: JSON.stringify(db.places, null, 2) });
    files.push({ name: "db/projects.json", content: JSON.stringify(db.projects, null, 2) });
    files.push({ name: "db/technology.json", content: JSON.stringify(db.technology, null, 2) });
    files.push({ name: "db/events.json", content: JSON.stringify(db.events, null, 2) });
    files.push({ name: "db/others.json", content: JSON.stringify(db.others, null, 2) });
    files.push({ name: "db/gallery.json", content: JSON.stringify(db.gallery, null, 2) });
  }
  if (mode === "images" || mode === "all") {
    const map = [{ title: "map", src: localStorage.getItem("morneven_map_image") ?? "" }];
    const gallery = db.gallery.filter((i) => i.type === "image").map((i) => ({ title: i.title, src: i.thumbnail, tags: i.tags }));
    const byCategory = {
      character: gallery.filter((g) => g.tags?.includes("character")),
      creature: gallery.filter((g) => g.tags?.includes("creature")),
      map,
      technology: gallery.filter((g) => g.tags?.includes("technology")),
      environment: gallery.filter((g) => g.tags?.includes("environment")),
      other: gallery.filter((g) => !["character", "creature", "technology", "environment"].some((t) => g.tags?.includes(t))),
    };
    files.push({ name: "images/map/images.json", content: JSON.stringify(byCategory.map, null, 2) });
    files.push({ name: "images/character/images.json", content: JSON.stringify(byCategory.character, null, 2) });
    files.push({ name: "images/creature/images.json", content: JSON.stringify(byCategory.creature, null, 2) });
    files.push({ name: "images/technology/images.json", content: JSON.stringify(byCategory.technology, null, 2) });
    files.push({ name: "images/environment/images.json", content: JSON.stringify(byCategory.environment, null, 2) });
    files.push({ name: "images/other/images.json", content: JSON.stringify(byCategory.other, null, 2) });
  }
  return files;
}

export function startExtraction(mode: ExtractionMode, autoDownload: boolean): ExtractionJob {
  const now = new Date();
  const job: ExtractionJob = { id: crypto.randomUUID(), mode, autoDownload, status: "processing", createdAt: now.toISOString(), expiresAt: new Date(now.getTime()+THIRTY_DAYS).toISOString() };
  saveHistory([job, ...listExtractionHistory()]);
  setTimeout(() => {
    try {
      const zip = makeZip(buildFiles(mode));
      const url = URL.createObjectURL(zip);
      const finished: ExtractionJob = { ...job, status: "completed", completedAt: new Date().toISOString(), blobUrl: url, downloadName: `morneven-extract-${mode}-${job.id.slice(0,8)}.zip` };
      const next = listExtractionHistory().map((x) => x.id === job.id ? finished : x);
      saveHistory(next);
      if (autoDownload) {
        const a = document.createElement("a"); a.href = url; a.download = finished.downloadName!; a.click();
      }
    } catch (error) {
      saveHistory(listExtractionHistory().map((x) => x.id === job.id ? { ...x, status: "failed", error: String(error) } : x));
    }
  }, 1500);
  return job;
}
