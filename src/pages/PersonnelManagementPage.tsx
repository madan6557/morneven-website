import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Save, X, Pencil, Search, ShieldCheck, Plus, Trash2, UserPlus, Layers, Loader2 } from "lucide-react";
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
import { personnelLevelBadgeStyle, personnelTrackBadgeStyle } from "@/lib/personnelTone";
import { useToast } from "@/hooks/use-toast";
import { showValidation } from "@/components/ui/validation-dialog";

const inputClass =
  "w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

function trackMeta(track: PersonnelTrack) {
  return PERSONNEL_TRACKS.find((item) => item.key === track) ?? PERSONNEL_TRACKS[0];
}

function formatPresenceText(person: PersonnelUser) {
  if (person.online) return "";
  if (person.lastSeenAt) return `Last seen ${new Date(person.lastSeenAt).toLocaleTimeString()}`;
  return "";
}

interface DraftState {
  level: PersonnelLevel;
  track: PersonnelTrack;
  note: string;
  role: PersonnelUser["role"];
}

function normalizeRoleForLevel(
  level: PersonnelLevel,
  role: PersonnelUser["role"],
  canAssignAuthor: boolean,
): PersonnelUser["role"] {
  if (level <= 0) return "guest";
  if (level >= PL_FULL_AUTHORITY) return canAssignAuthor && role === "author" ? "author" : "personel";
  return "personel";
}

function roleBadgeLabel(person: PersonnelUser) {
  if (person.level >= PL_FULL_AUTHORITY && person.role === "author") return "Author";
  if (person.level >= PL_FULL_AUTHORITY && person.role === "personel") return "Admin";
  if (person.role === "guest") return "Guest";
  return null;
}

export default function PersonnelManagementPage() {
  const { personnelLevel, username, track, role } = useAuth();
  const { toast } = useToast();
  const [people, setPeople] = useState<PersonnelUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [filter, setFilter] = useState("");
  const [trackFilter, setTrackFilter] = useState<"all" | PersonnelTrack>("all");
  const [creating, setCreating] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
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
  const isPl7Author = personnelLevel >= PL_FULL_AUTHORITY && role === "author";
  const isPl7Admin = personnelLevel >= PL_FULL_AUTHORITY && role === "personel";
  const maxManageableLevel = personnelLevel === 6 ? 5 : personnelLevel >= PL_FULL_AUTHORITY ? PL_FULL_AUTHORITY : personnelLevel;
  const availableLevels = useMemo(
    () =>
      (personnelLevel >= PL_FULL_AUTHORITY
        ? [...PERSONNEL_LEVELS, PL_FULL_AUTHORITY]
        : PERSONNEL_LEVELS.filter((level) => level <= maxManageableLevel)) as PersonnelLevel[],
    [maxManageableLevel, personnelLevel],
  );
  const canCreatePersonnel = personnelLevel >= 6;
  const canBulkUpdatePersonnel = personnelLevel >= 6;
  const canDeletePersonnelRecord = personnelLevel >= PL_FULL_AUTHORITY;
  const canManageRoleAtLevel7 = isPl7Author;

  const roleOptionsForLevel = (level: PersonnelLevel) => {
    if (level <= 0) return [{ value: "guest" as const, label: "Guest" }];
    if (level >= PL_FULL_AUTHORITY) {
      return canManageRoleAtLevel7
        ? [
            { value: "personel" as const, label: "Admin" },
            { value: "author" as const, label: "Author" },
          ]
        : [{ value: "personel" as const, label: "Admin" }];
    }
    return [{ value: "personel" as const, label: "Personnel" }];
  };

  const canUpdatePersonnelRecord = (p: PersonnelUser) => {
    const isSelf = p.username.toLowerCase() === username.toLowerCase();
    const isTargetAuthor = p.level >= PL_FULL_AUTHORITY && p.role === "author";
    if (isSelf) return false;
    if (personnelLevel < 5) return false;
    if (personnelLevel === 5) return p.track === track && p.level < PL_FULL_AUTHORITY;
    if (personnelLevel === 6) return p.level < PL_FULL_AUTHORITY;
    if (personnelLevel >= PL_FULL_AUTHORITY) return !isTargetAuthor;
    return false;
  };

  const canDeletePersonnelRow = (p: PersonnelUser) => {
    const isSelf = p.username.toLowerCase() === username.toLowerCase();
    const isTargetAuthor = p.level >= PL_FULL_AUTHORITY && p.role === "author";
    if (isSelf || !canDeletePersonnelRecord) return false;
    if (isTargetAuthor) return false;
    if (isPl7Admin) return p.role !== "author";
    if (isPl7Author) return p.role !== "author";
    return false;
  };

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      listPersonnel().then((next) => {
        if (!cancelled) setPeople(next);
      });

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
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

  // PL5+ guard. Detailed create, update, and delete permissions are enforced
  // by the action-level predicates below.
  if (!canManagePersonnel(personnelLevel)) {
    return <Navigate to="/home" replace />;
  }

  const startEdit = (p: PersonnelUser) => {
    if (!canUpdatePersonnelRecord(p)) return;
    setEditingId(p.id);
    setDraft({ level: p.level, track: p.track, note: p.note ?? "", role: p.role });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const persistEdit = async (person: PersonnelUser) => {
    if (!draft) return;
    setBusyAction(`save-${person.id}`);
    try {
      const payload =
        personnelLevel === 5
          ? { note: draft.note }
          : {
              level: draft.level,
              track: draft.track,
              note: draft.note,
              role: draft.role,
            };
      const updated = await updatePersonnel(person.id, payload);
      if (updated) {
        setPeople((prev) => prev.map((p) => (p.id === person.id ? updated : p)));
        toast({ title: "Personnel updated" });
      }
      cancelEdit();
    } catch (error) {
      toast({
        title: "Personnel update failed",
        description: error instanceof Error ? error.message : "Backend rejected the personnel update.",
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const saveEdit = async (person: PersonnelUser) => {
    if (!draft) return;
    if (personnelLevel >= 6 && draft.level !== person.level) {
      showValidation({
        variant: "warning",
        title: "Change personnel clearance",
        description: `Change ${person.username} from L${person.level} to L${draft.level}?`,
        confirmLabel: "Apply level change",
        cancelLabel: "Cancel",
        critical: true,
        confirmDelaySeconds: 5,
        onConfirm: async () => {
          await persistEdit(person);
        },
      });
      return;
    }
    await persistEdit(person);
  };

  const handleDelete = async (p: PersonnelUser) => {
    if (!canDeletePersonnelRow(p)) {
      window.alert("You do not have permission to delete this personnel record.");
      return;
    }
    showValidation({
      variant: "error",
      title: "Delete personnel record",
      description: `Remove ${p.username} (${p.email})? This action is irreversible.`,
      confirmLabel: "Delete personnel",
      cancelLabel: "Cancel",
      critical: true,
      confirmDelaySeconds: 5,
      onConfirm: async () => {
        setBusyAction(`delete-${p.id}`);
        try {
          const ok = await deletePersonnel(p.id);
          if (ok) {
            setPeople((prev) => prev.filter((x) => x.id !== p.id));
            toast({ title: "Personnel removed" });
          }
        } catch (error) {
          toast({
            title: "Personnel delete failed",
            description: error instanceof Error ? error.message : "Backend rejected the delete request.",
            variant: "destructive",
          });
        } finally {
          setBusyAction(null);
        }
      },
    });
  };

  const handleCreate = async () => {
    if (!canCreatePersonnel) {
      window.alert("PL6 or higher is required to create personnel.");
      return;
    }
    if (!newUser.username.trim() || !newUser.email.trim()) {
      window.alert("Username and email are required.");
      return;
    }
    setBusyAction("create");
    try {
      const created = await createPersonnel({
        ...newUser,
        role: normalizeRoleForLevel(newUser.level, newUser.role, canManageRoleAtLevel7),
      });
      setPeople((prev) => [created, ...prev]);
      setCreating(false);
      setNewUser({ username: "", email: "", role: "personel", level: 2, track: "executive", note: "" });
      toast({ title: "Personnel created" });
    } catch (error) {
      toast({
        title: "Personnel create failed",
        description: error instanceof Error ? error.message : "Backend rejected the create request.",
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
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
    if (!canBulkUpdatePersonnel) {
      window.alert("PL6 or higher is required for bulk personnel updates.");
      return;
    }
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
    showValidation({
      variant: bulkLevel !== "" ? "warning" : "info",
      title: "Apply bulk personnel update",
      description: `Apply ${summary} to ${ids.length} personnel record${ids.length === 1 ? "" : "s"}?`,
      confirmLabel: "Apply bulk update",
      cancelLabel: "Cancel",
      critical: bulkLevel !== "",
      confirmDelaySeconds: bulkLevel !== "" ? 5 : undefined,
      onConfirm: async () => {
        setBulkSaving(true);
        try {
          const updated = await bulkUpdatePersonnel(ids, patch);
          const updatedById = new Map(updated.map((u) => [u.id, u]));
          setPeople((prev) => prev.map((p) => updatedById.get(p.id) ?? p));
          clearSelection();
          setBulkLevel("");
          setBulkTrack("");
          toast({ title: "Bulk update applied" });
        } catch (error) {
          toast({
            title: "Bulk update failed",
            description: error instanceof Error ? error.message : "Backend rejected the bulk update.",
            variant: "destructive",
          });
        } finally {
          setBulkSaving(false);
        }
      },
    });
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
            disabled={!canCreatePersonnel}
            className="flex items-center gap-1 px-3 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity"
            title={canCreatePersonnel ? "Create personnel" : "PL6 or higher required"}
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
                <select
                  value={newUser.level}
                  onChange={(e) => {
                    const nextLevel = Number(e.target.value) as PersonnelLevel;
                    setNewUser((current) => ({
                      ...current,
                      level: nextLevel,
                      role: normalizeRoleForLevel(nextLevel, current.role, canManageRoleAtLevel7),
                    }));
                  }}
                  className={inputClass}
                >
                  {availableLevels.map((l) => (
                    <option key={l} value={l}>L{l}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Role</span>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as PersonnelUser["role"] })}
                  className={inputClass}
                >
                  {roleOptionsForLevel(newUser.level).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
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
              <button
                onClick={handleCreate}
                disabled={busyAction === "create"}
                className="flex items-center gap-1 px-4 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:cursor-wait disabled:opacity-60"
              >
                {busyAction === "create" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                {busyAction === "create" ? "CREATING" : "CREATE"}
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

        {/* Bulk action toolbar - visible when 1+ rows are selected. Lets the
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
                <option value=""> -  keep - </option>
                {availableLevels.map((l) => (
                  <option key={l} value={l}>L{l}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Set Track</span>
              <select
                value={bulkTrack}
                onChange={(e) => setBulkTrack(e.target.value === "" ? "" : (e.target.value as PersonnelTrack))}
                className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value=""> -  keep - </option>
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
              disabled={!canBulkUpdatePersonnel || bulkSaving || (bulkLevel === "" && bulkTrack === "")}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              title={canBulkUpdatePersonnel ? "Apply to selected" : "PL6 or higher required"}
            >
              {bulkSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {bulkSaving ? "APPLYING..." : "APPLY TO SELECTED"}
            </button>
          </div>
        )}

        {/* Table - desktop */}
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
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground w-36">Status</th>
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Email</th>
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground w-28">Level</th>
                <th className="text-left p-3 font-display text-[10px] tracking-[0.15em] uppercase text-muted-foreground w-36">Track</th>
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
                        {roleBadgeLabel(p) && (
                          <span className="text-[9px] font-display tracking-wider uppercase px-1.5 py-0.5 rounded-sm border border-destructive/40 bg-destructive/10 text-destructive">
                            {roleBadgeLabel(p)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="inline-flex items-center gap-2 rounded-sm border border-border/70 bg-background/40 px-2 py-1">
                        <span className={`h-2.5 w-2.5 rounded-full ${p.online ? "bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.55)]" : "bg-muted-foreground/40"}`} />
                        <span className={`text-[10px] font-display tracking-wider uppercase ${p.online ? "text-emerald-300" : "text-muted-foreground"}`}>
                          {p.online ? "Online" : "Offline"}
                        </span>
                      </div>
                      {formatPresenceText(p) ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">{formatPresenceText(p)}</p>
                      ) : null}
                    </td>
                    <td className="p-3 align-top text-xs font-body text-muted-foreground">{p.email}</td>
                    <td className="p-3 align-top">
                      {isEditing && draft ? (
                        personnelLevel === 5 ? (
                          <span
                            className="inline-flex items-center justify-center text-[11px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border"
                            style={personnelLevelBadgeStyle(p.level)}
                          >
                            L{p.level}
                          </span>
                        ) : (
                          <select
                            value={draft.level}
                            onChange={(e) => {
                              const nextLevel = Number(e.target.value) as PersonnelLevel;
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      level: nextLevel,
                                      role: normalizeRoleForLevel(nextLevel, current.role, canManageRoleAtLevel7),
                                    }
                                  : current,
                              );
                            }}
                            className={inputClass}
                          >
                            {availableLevels.map((l) => (
                              <option key={l} value={l}>L{l}</option>
                            ))}
                          </select>
                        )
                      ) : (
                        <span
                          className="inline-flex items-center justify-center text-[11px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border"
                          style={personnelLevelBadgeStyle(p.level)}
                        >
                          L{p.level}
                        </span>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      {isEditing && draft ? (
                        personnelLevel === 5 ? (
                          <span
                            className="inline-flex min-w-12 items-center justify-center rounded-sm border px-2 py-1 text-[10px] font-display tracking-wider uppercase"
                            style={personnelTrackBadgeStyle(p.track)}
                            title={trackMeta(p.track).label}
                          >
                            {trackMeta(p.track).short}
                          </span>
                        ) : (
                          <div className="space-y-2">
                            <select
                              value={draft.track}
                              onChange={(e) => setDraft({ ...draft, track: e.target.value as PersonnelTrack })}
                              className={inputClass}
                            >
                              {PERSONNEL_TRACKS.map((t) => (
                                <option key={t.key} value={t.key}>{t.label}</option>
                              ))}
                            </select>
                            {draft.level >= PL_FULL_AUTHORITY && (
                              <select
                                value={draft.role}
                                onChange={(e) => setDraft({ ...draft, role: e.target.value as PersonnelUser["role"] })}
                                className={inputClass}
                              >
                                {roleOptionsForLevel(draft.level).map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )
                      ) : (
                        <span
                          className="inline-flex min-w-12 items-center justify-center rounded-sm border px-2 py-1 text-[10px] font-display tracking-wider uppercase"
                          style={personnelTrackBadgeStyle(p.track)}
                          title={trackMeta(p.track).label}
                        >
                          {trackMeta(p.track).short}
                        </span>
                      )}
                    </td>
                    <td className="p-3 align-top text-xs font-body text-foreground/80">
                      {isEditing && draft ? (
                        <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className={inputClass} />
                      ) : (
                        p.note || <span className="italic text-muted-foreground"> - </span>
                      )}
                    </td>
                    <td className="p-3 align-top text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => void saveEdit(p)}
                            disabled={busyAction === `save-${p.id}`}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                          >
                            {busyAction === `save-${p.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            {busyAction === `save-${p.id}` ? "SAVING" : "SAVE"}
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
                            title={canUpdatePersonnelRecord(p) ? "Edit" : personnelLevel >= 5 ? "Action not allowed for this account" : "PL5 or higher required"}
                            disabled={!canUpdatePersonnelRecord(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            disabled={!canDeletePersonnelRow(p) || busyAction === `delete-${p.id}`}
                            className="text-muted-foreground hover:text-destructive p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={!canDeletePersonnelRow(p) ? "Delete not allowed" : "Delete"}
                          >
                            {busyAction === `delete-${p.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground font-body italic">
                    No personnel match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards - mobile/tablet */}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-sm text-foreground">{p.username}</p>
                        {roleBadgeLabel(p) && (
                          <span className="text-[9px] font-display tracking-wider uppercase px-1.5 py-0.5 rounded-sm border border-destructive/40 bg-destructive/10 text-destructive">
                            {roleBadgeLabel(p)}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-display tracking-wider uppercase ${p.online ? "border-emerald-500/40 text-emerald-300" : "border-border text-muted-foreground"}`}>
                          <span className={`h-2 w-2 rounded-full ${p.online ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                          {p.online ? "Online" : "Offline"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-body">{p.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <>
                        <button
                          onClick={() => startEdit(p)}
                          disabled={!canUpdatePersonnelRecord(p)}
                          className="text-muted-foreground hover:text-primary p-1.5 disabled:opacity-30"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={!canDeletePersonnelRow(p) || busyAction === `delete-${p.id}`}
                          className="text-muted-foreground hover:text-destructive p-1.5 disabled:opacity-30"
                        >
                          {busyAction === `delete-${p.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing && draft ? (
                  <div className="space-y-2">
                    {personnelLevel === 5 ? null : (
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={draft.level}
                          onChange={(e) => {
                            const nextLevel = Number(e.target.value) as PersonnelLevel;
                            setDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    level: nextLevel,
                                    role: normalizeRoleForLevel(nextLevel, current.role, canManageRoleAtLevel7),
                                  }
                                : current,
                            );
                          }}
                          className={inputClass}
                        >
                          {availableLevels.map((l) => (
                            <option key={l} value={l}>L{l}</option>
                          ))}
                        </select>
                        <select value={draft.track} onChange={(e) => setDraft({ ...draft, track: e.target.value as PersonnelTrack })} className={inputClass}>
                          {PERSONNEL_TRACKS.map((t) => (
                            <option key={t.key} value={t.key}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {draft.level >= PL_FULL_AUTHORITY && personnelLevel !== 5 ? (
                      <select
                        value={draft.role}
                        onChange={(e) => setDraft({ ...draft, role: e.target.value as PersonnelUser["role"] })}
                        className={inputClass}
                      >
                        {roleOptionsForLevel(draft.level).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : null}
                    <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Note" className={inputClass} />
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="px-2 py-1 text-[10px] font-display tracking-wider border border-border rounded-sm text-muted-foreground">CANCEL</button>
                      <button
                        onClick={() => void saveEdit(p)}
                        disabled={busyAction === `save-${p.id}`}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider bg-primary text-primary-foreground rounded-sm disabled:cursor-wait disabled:opacity-60"
                      >
                        {busyAction === `save-${p.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {busyAction === `save-${p.id}` ? "SAVING" : "SAVE"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="inline-flex items-center text-[10px] font-display tracking-wider uppercase px-2 py-0.5 rounded-sm border"
                      style={personnelLevelBadgeStyle(p.level)}
                    >
                      L{p.level}
                    </span>
                    <span
                      className="inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-display tracking-wider uppercase"
                      style={personnelTrackBadgeStyle(p.track)}
                      title={trackMeta(p.track).label}
                    >
                      {trackMeta(p.track).short}
                    </span>
                    {formatPresenceText(p) ? (
                      <span className="w-full text-[10px] text-muted-foreground">{formatPresenceText(p)}</span>
                    ) : null}
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

