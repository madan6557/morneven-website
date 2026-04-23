import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Save, X, Pencil, Search, ShieldCheck, Plus, Trash2, UserPlus, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  PERSONNEL_LEVELS,
  PERSONNEL_TRACKS,
  PL_FULL_AUTHORITY,
  canManagePersonnel,
  type PersonnelLevel,
  type PersonnelTrack,
} from "@/lib/pl";
import {
  listPersonnel,
  updatePersonnel,
  bulkUpdatePersonnel,
  createPersonnel,
  deletePersonnel,
} from "@/services/personnelApi";
import type { PersonnelUser } from "@/types";

const inputClass =
  "w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

const trackTone: Record<PersonnelTrack, string> = {
  executive: "text-primary border-primary/40 bg-primary/10",
  field: "text-accent-orange border-accent-orange/40 bg-accent-orange/10",
  mechanic: "text-accent-yellow border-accent-yellow/40 bg-accent-yellow/10",
  logistics: "text-muted-foreground border-secondary/40 bg-secondary/10",
};

const levelTone = (level: PersonnelLevel) => {
  if (level === 7) return "text-destructive border-destructive/50 bg-destructive/10";
  if (level === 6) return "text-primary border-primary/50 bg-primary/10";
  if (level >= 4) return "text-accent-orange border-accent-orange/40 bg-accent-orange/10";
  if (level >= 3) return "text-accent-yellow border-accent-yellow/40 bg-accent-yellow/10";
  return "text-muted-foreground border-border bg-muted/40";
};

interface DraftState {
  level: PersonnelLevel;
  track: PersonnelTrack;
  note: string;
}

export default function PersonnelManagementPage() {
  const { personnelLevel, username } = useAuth();
  const [people, setPeople] = useState<PersonnelUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [filter, setFilter] = useState("");
  const [trackFilter, setTrackFilter] = useState<"all" | PersonnelTrack>("all");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState<Omit<PersonnelUser, "id" | "updatedAt">>({
    username: "",
    email: "",
    role: "personel",
    level: 2,
    track: "executive",
    note: "",
  });

  // Bulk selection state. `selected` holds personnel IDs marked for a
  // bulk operation. `bulkLevel` / `bulkTrack` are tri-state: undefined
  // means "leave as-is", which lets the operator change just one field.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLevel, setBulkLevel] = useState<PersonnelLevel | "">("");
  const [bulkTrack, setBulkTrack] = useState<PersonnelTrack | "">("");
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    listPersonnel().then(setPeople);
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return people.filter((p) => {
      if (trackFilter !== "all" && p.track !== trackFilter) return false;
      if (!q) return true;
      return (
        p.username.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.note ?? "").toLowerCase().includes(q)
      );
    });
  }, [people, filter, trackFilter]);

  // L7-only guard. Render an explicit denial page rather than silently
  // redirecting so the rule is visible.
  if (!canManagePersonnel(personnelLevel)) {
    return <Navigate to="/home" replace />;
  }

  const startEdit = (p: PersonnelUser) => {
    // Tidak bisa edit akun LV7
    if (p.level >= PL_FULL_AUTHORITY) return;
    setEditingId(p.id);
    setDraft({ level: p.level, track: p.track, note: p.note ?? "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = async (id: string) => {
    if (!draft) return;
    const updated = await updatePersonnel(id, draft);
    if (updated) {
      setPeople((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
    cancelEdit();
  };

  const handleDelete = async (p: PersonnelUser) => {
    if (p.level >= PL_FULL_AUTHORITY) {
      window.alert("Full Authority personnel cannot be deleted.");
      return;
    }
    if (!window.confirm(`Remove ${p.username} (${p.email})?`)) return;
    const ok = await deletePersonnel(p.id);
    if (ok) setPeople((prev) => prev.filter((x) => x.id !== p.id));
  };

  const handleCreate = async () => {
    if (!newUser.username.trim() || !newUser.email.trim()) {
      window.alert("Username and email are required.");
      return;
    }
    const created = await createPersonnel(newUser);
    setPeople((prev) => [created, ...prev]);
    setCreating(false);
    setNewUser({ username: "", email: "", role: "personel", level: 2, track: "executive", note: "" });
  };

  // ─── Bulk selection helpers ────────────────────────────────────────────
  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const someFilteredSelected =
    filtered.some((p) => selected.has(p.id)) && !allFilteredSelected;

  const toggleSelectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const applyBulk = async () => {
    if (selected.size === 0) return;
    if (bulkLevel === "" && bulkTrack === "") {
      window.alert("Choose a new level and/or track to apply.");
      return;
    }
    const patch: Partial<Pick<PersonnelUser, "level" | "track">> = {};
    if (bulkLevel !== "") patch.level = bulkLevel;
    if (bulkTrack !== "") patch.track = bulkTrack;

    const ids = Array.from(selected);
    const summary = [
      bulkLevel !== "" ? `level → L${bulkLevel}` : null,
      bulkTrack !== "" ? `track → ${PERSONNEL_TRACKS.find((t) => t.key === bulkTrack)?.label}` : null,
    ].filter(Boolean).join(", ");
    if (!window.confirm(`Apply ${summary} to ${ids.length} personnel record${ids.length === 1 ? "" : "s"}?`)) return;

    setBulkSaving(true);
    try {
      const updated = await bulkUpdatePersonnel(ids, patch);
      const updatedById = new Map(updated.map((u) => [u.id, u]));
      setPeople((prev) => prev.map((p) => updatedById.get(p.id) ?? p));
      clearSelection();
      setBulkLevel("");
      setBulkTrack("");
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="relative h-40 md:h-52 overflow-hidden flex items-end bg-muted">
        <div className="absolute inset-0 bg-gradient-to-br from-destructive/20 via-primary/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        <div className="relative z-20 p-6 md:p-8 w-full">
          <Link
            to="/author"
            className="inline-flex items-center gap-1 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3 w-3" /> BACK TO AUTHOR PANEL
          </Link>
          <h1 className="font-display text-2xl md:text-3xl tracking-[0.1em] text-primary">
            PERSONNEL MANAGEMENT
          </h1>
          <p className="text-xs font-display tracking-wider text-destructive uppercase mt-1">
            L{PL_FULL_AUTHORITY} · Full Authority Required
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        <div className="mecha-line" />

        {/* Authority banner */}
        <div className="hud-border bg-card p-4 md:p-5 flex flex-wrap items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="flex-1 min-w-[220px]">
            <p className="font-heading text-sm tracking-wider text-foreground uppercase">
              {username} · L{personnelLevel} Full Authority
            </p>
            <p className="text-xs font-body text-muted-foreground">
              You can modify the clearance level (0–7) and track of any personnel record. L7 cannot be deleted.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 px-3 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-3.5 w-3.5" /> NEW PERSONNEL
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="hud-border bg-card p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm tracking-wider text-accent-orange uppercase">
                New Personnel Record
              </h3>
              <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Username</span>
                <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className={inputClass} />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Email</span>
                <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputClass} />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Level</span>
                <select value={newUser.level} onChange={(e) => setNewUser({ ...newUser, level: Number(e.target.value) as PersonnelLevel })} className={inputClass}>
                  {PERSONNEL_LEVELS.map((l) => (
                    <option key={l} value={l}>L{l}</option>
                  ))}
                  {/* Tidak ada opsi L7 di create personnel */}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Track</span>
                <select value={newUser.track} onChange={(e) => setNewUser({ ...newUser, track: e.target.value as PersonnelTrack })} className={inputClass}>
                  {PERSONNEL_TRACKS.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Note</span>
                <input value={newUser.note ?? ""} onChange={(e) => setNewUser({ ...newUser, note: e.target.value })} className={inputClass} />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCreating(false)} className="px-3 py-2 text-xs font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors">CANCEL</button>
              <button onClick={handleCreate} className="flex items-center gap-1 px-4 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity">
                <Plus className="h-3 w-3" /> CREATE
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search username, email, note..."
              className="w-full pl-7 pr-3 py-2 bg-card border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", ...PERSONNEL_TRACKS.map((t) => t.key)] as Array<"all" | PersonnelTrack>).map((k) => (
              <button
                key={k}
                onClick={() => setTrackFilter(k)}
                className={`px-3 py-1.5 text-[10px] font-display tracking-[0.1em] uppercase border rounded-sm transition-colors ${
                  trackFilter === k
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {k === "all" ? "All Tracks" : PERSONNEL_TRACKS.find((t) => t.key === k)?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk action toolbar — visible when 1+ rows are selected. Lets the
            operator change level and/or track on every selected record in
            a single round-trip via bulkUpdatePersonnel. */}
        {selected.size > 0 && (
          <div className="hud-border-sm bg-card/90 backdrop-blur p-3 md:p-4 sticky top-2 z-30 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Layers className="h-4 w-4 text-accent-orange" />
              <span className="font-display text-xs tracking-wider text-accent-orange uppercase">
                {selected.size} selected
              </span>
            </div>
            <div className="h-5 w-px bg-border" />
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Set Level</span>
              <select
                value={bulkLevel}
                onChange={(e) => setBulkLevel(e.target.value === "" ? "" : Number(e.target.value) as PersonnelLevel)}
                className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— keep —</option>
                {PERSONNEL_LEVELS.map((l) => (
                  <option key={l} value={l}>L{l}</option>
                ))}
                {/* Tidak ada opsi L7 di bulk edit */}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Set Track</span>
              <select
                value={bulkTrack}
                onChange={(e) => setBulkTrack(e.target.value === "" ? "" : (e.target.value as PersonnelTrack))}
                className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— keep —</option>
                {PERSONNEL_TRACKS.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </label>
            <div className="flex-1" />
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-[10px] font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              CLEAR
            </button>
            <button
              onClick={applyBulk}
              disabled={bulkSaving || (bulkLevel === "" && bulkTrack === "")}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="h-3 w-3" /> {bulkSaving ? "APPLYING…" : "APPLY TO SELECTED"}
            </button>
          </div>
        )}

        {/* Table — desktop */}
        <div className="hidden lg:block hud-border bg-card overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible personnel"
                    checked={allFilteredSelected}
                    ref={(el) => { if (el) el.indeterminate = someFilteredSelected; }}
                    onChange={toggleSelectAllFiltered}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                </th>
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">User</th>
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Email</th>
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground w-28">Level</th>
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground w-44">Track</th>
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Note</th>
                <th className="text-right p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id} className={`border-b border-border/60 last:border-b-0 ${selected.has(p.id) ? "bg-primary/5" : ""}`}>
                    <td className="p-3 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.username}`}
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelected(p.id)}
                        className="h-4 w-4 accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm text-foreground">{p.username}</span>
                        {p.role === "author" && (
                          <span className="text-[9px] font-display tracking-wider uppercase px-1.5 py-0.5 rounded-sm border border-destructive/40 bg-destructive/10 text-destructive">
                            Author
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 align-top text-xs font-body text-muted-foreground">{p.email}</td>
                    <td className="p-3 align-top">
                      {isEditing && draft ? (
                        <select
                          value={draft.level}
                          onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) as PersonnelLevel })}
                          className={inputClass}
                        >
                          {PERSONNEL_LEVELS.map((l) => (
                            <option key={l} value={l}>L{l}</option>
                          ))}
                          {/* Tidak ada opsi L7 di edit kecuali user sendiri, tapi untuk keamanan, LV7 tidak bisa diedit sama sekali */}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center justify-center text-[11px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border ${levelTone(p.level)}`}>
                          L{p.level}
                        </span>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      {isEditing && draft ? (
                        <select
                          value={draft.track}
                          onChange={(e) => setDraft({ ...draft, track: e.target.value as PersonnelTrack })}
                          className={inputClass}
                        >
                          {PERSONNEL_TRACKS.map((t) => (
                            <option key={t.key} value={t.key}>{t.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center text-[10px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border ${trackTone[p.track]}`}>
                          {PERSONNEL_TRACKS.find((t) => t.key === p.track)?.label}
                        </span>
                      )}
                    </td>
                    <td className="p-3 align-top text-xs font-body text-foreground/80">
                      {isEditing && draft ? (
                        <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className={inputClass} />
                      ) : (
                        p.note || <span className="italic text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 align-top text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => saveEdit(p.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90">
                            <Save className="h-3 w-3" /> SAVE
                          </button>
                          <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground p-1">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => startEdit(p)}
                            className="text-muted-foreground hover:text-primary p-1.5"
                            title={p.level >= PL_FULL_AUTHORITY ? "L7 cannot be edited" : "Edit"}
                            disabled={p.level >= PL_FULL_AUTHORITY}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            disabled={p.level >= PL_FULL_AUTHORITY}
                            className="text-muted-foreground hover:text-destructive p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={p.level >= PL_FULL_AUTHORITY ? "L7 cannot be deleted" : "Delete"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-muted-foreground font-body italic">
                    No personnel match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards — mobile/tablet */}
        <div className="lg:hidden space-y-3">
          {filtered.map((p) => {
            const isEditing = editingId === p.id;
            return (
              <div key={p.id} className={`hud-border-sm bg-card p-3 space-y-2 ${selected.has(p.id) ? "ring-1 ring-primary/40" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.username}`}
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelected(p.id)}
                      className="h-4 w-4 mt-0.5 accent-primary cursor-pointer"
                    />
                    <div>
                      <p className="font-heading text-sm text-foreground">{p.username}</p>
                      <p className="text-[11px] text-muted-foreground font-body">{p.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <>
                        <button onClick={() => startEdit(p)} className="text-muted-foreground hover:text-primary p-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={p.level >= PL_FULL_AUTHORITY}
                          className="text-muted-foreground hover:text-destructive p-1.5 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing && draft ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select value={draft.level} onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) as PersonnelLevel })} className={inputClass}>
                        {PERSONNEL_LEVELS.map((l) => (
                          <option key={l} value={l}>L{l}</option>
                        ))}
                        <option value={PL_FULL_AUTHORITY}>L{PL_FULL_AUTHORITY}</option>
                      </select>
                      <select value={draft.track} onChange={(e) => setDraft({ ...draft, track: e.target.value as PersonnelTrack })} className={inputClass}>
                        {PERSONNEL_TRACKS.map((t) => (
                          <option key={t.key} value={t.key}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Note" className={inputClass} />
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="px-2 py-1 text-[10px] font-display tracking-wider border border-border rounded-sm text-muted-foreground">CANCEL</button>
                      <button onClick={() => saveEdit(p.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider bg-primary text-primary-foreground rounded-sm">
                        <Save className="h-3 w-3" /> SAVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center text-[10px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border ${levelTone(p.level)}`}>
                      L{p.level}
                    </span>
                    <span className={`inline-flex items-center text-[10px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border ${trackTone[p.track]}`}>
                      {PERSONNEL_TRACKS.find((t) => t.key === p.track)?.label}
                    </span>
                    {p.note && <p className="w-full text-xs text-foreground/80 font-body">{p.note}</p>}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-center text-muted-foreground font-body italic py-6">
              No personnel match the current filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
