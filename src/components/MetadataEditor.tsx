import type { LoreMeta, LoreMetaPatch } from "@/types";
import { Plus, X, Calendar } from "lucide-react";

const inputClass =
  "w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "font-heading text-xs tracking-wider text-muted-foreground uppercase";

const todayStr = () => new Date().toISOString().split("T")[0];

interface MetadataEditorProps {
  value: LoreMeta | undefined;
  onChange: (next: LoreMeta) => void;
}

/**
 * Inline editor for the LoreMeta block. Renders production-credit fields
 * (creator, owner, designer, collaborators, team, project, dates, license,
 * source) plus a versioned patch-notes list. Pure presentation — the parent
 * decides where to persist it (typically inside the entry's `meta` field).
 */
export default function MetadataEditor({ value, onChange }: MetadataEditorProps) {
  const meta: LoreMeta = value ?? {};
  const set = <K extends keyof LoreMeta>(k: K, v: LoreMeta[K]) =>
    onChange({ ...meta, [k]: v });

  const collaboratorsStr = (meta.collaborators ?? []).join(", ");

  const patches = meta.patchNotes ?? [];
  const setPatches = (next: LoreMetaPatch[]) => set("patchNotes", next);
  const addPatch = () => {
    const v = patches.length === 0 ? "0.1" : nextVersion(patches[0].version);
    setPatches([{ version: v, date: todayStr(), notes: "" }, ...patches]);
  };
  const updatePatch = (i: number, field: keyof LoreMetaPatch, val: string) => {
    const next = [...patches];
    next[i] = { ...next[i], [field]: val };
    setPatches(next);
  };
  const removePatch = (i: number) => setPatches(patches.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4 hud-border bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-heading text-sm tracking-wider text-accent-orange uppercase">
          Metadata · Production Credits
        </h4>
        <span className="text-[10px] font-body text-muted-foreground italic">
          Optional — surfaces on the entry's Metadata tab
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>Creator</label>
          <input
            type="text"
            value={meta.creator ?? ""}
            onChange={(e) => set("creator", e.target.value)}
            className={inputClass}
            placeholder="Original author"
          />
        </div>
        <div>
          <label className={labelClass}>Owner</label>
          <input
            type="text"
            value={meta.owner ?? ""}
            onChange={(e) => set("owner", e.target.value)}
            className={inputClass}
            placeholder="Canonical maintainer"
          />
        </div>
        <div>
          <label className={labelClass}>Designer</label>
          <input
            type="text"
            value={meta.designer ?? ""}
            onChange={(e) => set("designer", e.target.value)}
            className={inputClass}
            placeholder="Visual / concept lead"
          />
        </div>
        <div>
          <label className={labelClass}>Team</label>
          <input
            type="text"
            value={meta.team ?? ""}
            onChange={(e) => set("team", e.target.value)}
            className={inputClass}
            placeholder="e.g. Lore Division"
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Collaborators (comma-separated)</label>
          <input
            type="text"
            value={collaboratorsStr}
            onChange={(e) =>
              set(
                "collaborators",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            className={inputClass}
            placeholder="e.g. Aelis, Rho-7, Director Vance"
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Project Name</label>
          <input
            type="text"
            value={meta.projectName ?? ""}
            onChange={(e) => set("projectName", e.target.value)}
            className={inputClass}
            placeholder="e.g. Pantry Continuity Initiative"
          />
        </div>
        <div>
          <label className={labelClass}>Started</label>
          <input
            type="date"
            value={meta.startedAt ?? ""}
            onChange={(e) => set("startedAt", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Completed</label>
          <input
            type="date"
            value={meta.completedAt ?? ""}
            onChange={(e) => set("completedAt", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Approved Date</label>
          <input
            type="date"
            value={meta.approvedAt ?? ""}
            onChange={(e) => set("approvedAt", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Approved By</label>
          <input
            type="text"
            value={meta.approvedBy ?? ""}
            onChange={(e) => set("approvedBy", e.target.value)}
            className={inputClass}
            placeholder="Reviewer / authority"
          />
        </div>
        <div>
          <label className={labelClass}>License</label>
          <input
            type="text"
            value={meta.license ?? ""}
            onChange={(e) => set("license", e.target.value)}
            className={inputClass}
            placeholder="e.g. Internal / CC-BY-NC"
          />
        </div>
        <div>
          <label className={labelClass}>Source URL</label>
          <input
            type="url"
            value={meta.sourceUrl ?? ""}
            onChange={(e) => set("sourceUrl", e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Patch notes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Patch Notes (entry changelog)</label>
          <button
            type="button"
            onClick={addPatch}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Plus className="h-3 w-3" /> ADD ENTRY
          </button>
        </div>
        {patches.length === 0 && (
          <p className="text-[11px] font-body text-muted-foreground italic">
            No metadata patch notes yet. Use ADD ENTRY to log canonical revisions
            (e.g. "v1.1 — clarified faction allegiance").
          </p>
        )}
        {patches.map((p, i) => (
          <div
            key={i}
            className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border"
          >
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={p.version}
                  onChange={(e) => updatePatch(i, "version", e.target.value)}
                  placeholder="0.1"
                  className="w-24 px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground"
                />
                <input
                  type="date"
                  value={p.date}
                  onChange={(e) => updatePatch(i, "date", e.target.value)}
                  className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground"
                />
                <button
                  type="button"
                  onClick={() => updatePatch(i, "date", todayStr())}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                  title="Set to today"
                >
                  <Calendar className="h-3 w-3" /> TODAY
                </button>
              </div>
              <textarea
                value={p.notes}
                onChange={(e) => updatePatch(i, "notes", e.target.value)}
                placeholder="What changed in this revision..."
                rows={2}
                className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground resize-y min-h-[50px]"
              />
            </div>
            <button
              type="button"
              onClick={() => removePatch(i)}
              className="text-muted-foreground hover:text-destructive mt-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function nextVersion(prev: string): string {
  const hasV = /^v/i.test(prev);
  const core = hasV ? prev.slice(1) : prev;
  const parts = core.split(".");
  const lastIdx = parts.length - 1;
  const n = Number(parts[lastIdx]);
  if (Number.isNaN(n)) return hasV ? `v${core}.1` : `${core}.1`;
  parts[lastIdx] = String(n + 1);
  const next = parts.join(".");
  return hasV ? `v${next}` : next;
}
