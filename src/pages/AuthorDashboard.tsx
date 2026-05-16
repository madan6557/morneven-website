import { useEffect, useState, useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiUpload, getProjectsPage, createProject, updateProject, deleteProject, getCharactersPage, createCharacter, updateCharacter, deleteCharacter, getPlacesPage, createPlace, updatePlace, deletePlace, getTechnologyPage, createTech, updateTech, deleteTech, getGalleryPage, createGalleryItem, updateGalleryItem, deleteGalleryItem, getCreaturesPage, createCreature, updateCreature, deleteCreature, getEventsPage, createEvent, updateEvent, deleteEvent, getOthersPage, createOther, updateOther, deleteOther, getMapMarkers, saveMapMarkers, getMapImageRemote, setMapImageRemote, type PageInfo } from "@/services/api";
import {
  activateCommandCenterPreset,
  createCommandCenterPreset,
  updateCommandCenterPreset,
  deleteCommandCenterPreset,
  getCommandCenterDefaults,
  getCommandCenterPresets,
  getCommandCenterSettings,
  getCommandCenterSettingsRemote,
  saveCommandCenterSettings,
  saveCommandCenterSettingsRemote,
  defaultSettings,
  type CommandCenterPreset,
  type CommandCenterSettings,
} from "@/services/commandCenterSettings";
import type { Project, Character, CharacterContribution, Place, Technology, GalleryItem, DocItem, ProjectPatch, Creature, OtherLore, LoreEvent, EventRelatedLink, MapMarker, MapZoneStatus, CreatureClassification, CreatureDangerLevel, LoreMeta, LoreFieldNote, Skill, Feature } from "@/types";
import { Pencil, Trash2, Plus, X, Save, Upload, Link as LinkIcon, Image, Video, File as FileIcon, Calendar, LayoutDashboard, RotateCcw, Map as MapIcon, Star, CheckCircle2, FilePlus, RefreshCw, Loader2, ChevronDown } from "lucide-react";
import RestrictedMarkerTool from "@/components/RestrictedMarkerTool";
import NewsManagementSection from "@/components/NewsManagementSection";
import CommandCenterSelectionPanel from "@/components/CommandCenterSelectionPanel";
import MetadataEditor from "@/components/MetadataEditor";
import { canAccessAuthorPanel, canEnterAuthorPanel } from "@/lib/pl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { showValidation } from "@/components/ui/validation-dialog";
import SkillFeatureEditor from "@/components/SkillFeatureEditor";
import {
  averageScore,
  createDefaultCharacterStats,
  createDefaultCreatureStats,
  normalizeCharacterStatsForEditor,
  normalizeCreatureStatsForEditor,
} from "@/lib/statDetails";

const dashTabs = ["projects", "lore", "gallery", "news", "homepage", "map"] as const;
const loreSubs = ["characters", "places", "technology", "creatures", "events", "other"] as const;
const inputClass = "w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "font-heading text-xs tracking-wider text-muted-foreground uppercase";
const DASHBOARD_LIST_PAGE_SIZE = 25;

const todayStr = () => new Date().toISOString().split("T")[0];

// Auto-increment patch version. Strips/preserves a leading "v" and increments the
// last numeric segment by 1 (so 0.1 -> 0.2, v1.2 -> v1.3). Empty -> "0.1".
function nextPatchVersion(prev?: string): string {
  if (!prev) return "0.1";
  const trimmed = prev.trim();
  const hasV = /^v/i.test(trimmed);
  const core = hasV ? trimmed.slice(1) : trimmed;
  const parts = core.split(".");
  const lastIdx = parts.length - 1;
  const lastNum = Number(parts[lastIdx]);
  if (Number.isNaN(lastNum)) return hasV ? `v${core}.1` : `${core}.1`;
  parts[lastIdx] = String(lastNum + 1);
  const next = parts.join(".");
  return hasV ? `v${next}` : next;
}

// Compare two patch versions numerically (segment by segment) and return the
// one that is greater. Handles optional leading "v".
function compareVersion(a: string, b: string): number {
  const norm = (v: string) => v.replace(/^v/i, "").split(".").map((n) => Number(n) || 0);
  const aa = norm(a);
  const bb = norm(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const av = aa[i] ?? 0;
    const bv = bb[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function highestVersion(versions: string[]): string {
  if (versions.length === 0) return "";
  return versions.reduce((max, v) => (compareVersion(v, max) > 0 ? v : max), versions[0]);
}

type DashboardTab = typeof dashTabs[number];
type LoreSub = typeof loreSubs[number];
type DashboardItem = Project | Character | Place | Technology | GalleryItem | Creature | LoreEvent | OtherLore;
type EditableState = {
  id?: string;
  title?: string;
  name?: string;
  status?: Project["status"];
  thumbnail?: string;
  headerImage?: string;
  shortDesc?: string;
  fullDesc?: string;
  patches?: ProjectPatch[];
  docs?: DocItem[];
  race?: string;
  occupation?: string;
  height?: string;
  traits?: string[];
  likes?: string[];
  dislikes?: string[];
  accentColor?: string;
  stats?: Character["stats"] | Creature["stats"];
  type?: GalleryItem["type"] | string;
  category?: string;
  videoUrl?: string;
  caption?: string;
  tags?: string[];
  date?: string;
  comments?: GalleryItem["comments"];
  // Creature
  classification?: CreatureClassification;
  dangerLevel?: CreatureDangerLevel;
  habitat?: string;
  instincts?: string[];
  aversions?: string[];
  era?: string;
  dateLabel?: string;
  scope?: string;
  impactLevel?: string;
  consequences?: string[];
  relatedLinks?: EventRelatedLink[];
  // Character
  contributions?: CharacterContribution[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  skills?: Skill[];
  features?: Feature[];
  // Gallery - preserved across edits so ownership doesn't transfer.
  uploadedBy?: string;
  // Production-credit metadata (all lore + projects).
  meta?: LoreMeta;
};

function EditorSection({
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-sm border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/30 sm:p-4"
        aria-expanded={open}
      >
        <span className="min-w-0 space-y-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-xs tracking-wider text-accent-orange uppercase">{title}</span>
            {badge ? (
              <span className="rounded-sm border border-border bg-background/70 px-2 py-0.5 text-[10px] font-display tracking-wider text-muted-foreground uppercase">
                {badge}
              </span>
            ) : null}
          </span>
          {description ? <span className="block text-xs leading-5 text-muted-foreground">{description}</span> : null}
        </span>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <div className={`${open ? "block" : "hidden"} border-t border-border/70 p-3 sm:p-4`}>
        {children}
      </div>
    </section>
  );
}

const isDashboardTab = (value: string | null): value is DashboardTab => {
  if (!value) return false;
  return dashTabs.includes(value as DashboardTab);
};

type AttachmentMode = "url" | "image" | "video" | "file";

type StatSliderField = {
  key: string;
  label: string;
};

type StatEditorGroup = {
  key: string;
  label: string;
  fields: readonly StatSliderField[];
};

const characterStatEditorGroups: readonly StatEditorGroup[] = [
  {
    key: "combat",
    label: "Combat",
    fields: [
      { key: "strength", label: "Strength" },
      { key: "defense", label: "Defense" },
      { key: "agility", label: "Agility" },
      { key: "endurance", label: "Endurance" },
      { key: "adaptation", label: "Adaptation" },
    ],
  },
  {
    key: "intelligence",
    label: "Intelligence",
    fields: [
      { key: "iq", label: "IQ" },
      { key: "eq", label: "EQ" },
      { key: "sq", label: "SQ" },
    ],
  },
  {
    key: "charisma",
    label: "Charisma",
    fields: [
      { key: "persuasion", label: "Persuasion" },
      { key: "intimidation", label: "Intimidation" },
      { key: "manipulation", label: "Manipulation" },
    ],
  },
  {
    key: "stealth",
    label: "Stealth",
    fields: [
      { key: "presenceControl", label: "Presence Control" },
      { key: "silence", label: "Silence" },
      { key: "environmentControl", label: "Environment Control" },
      { key: "visualMasking", label: "Visual Masking" },
    ],
  },
  {
    key: "perception",
    label: "Perception",
    fields: [
      { key: "acuity", label: "Acuity" },
      { key: "focus", label: "Focus" },
      { key: "intuition", label: "Intuition" },
    ],
  },
] as const;

const creatureStatEditorGroups: readonly StatEditorGroup[] = [
  {
    key: "combat",
    label: "Combat",
    fields: [
      { key: "strength", label: "Strength" },
      { key: "defense", label: "Defense" },
      { key: "agility", label: "Agility" },
      { key: "endurance", label: "Endurance" },
      { key: "adaptation", label: "Adaptation" },
    ],
  },
  {
    key: "cognition",
    label: "Cognition",
    fields: [
      { key: "problemSolving", label: "Problem Solving" },
      { key: "memory", label: "Memory" },
      { key: "instinct", label: "Instinct" },
    ],
  },
  {
    key: "predation",
    label: "Predation",
    fields: [
      { key: "ambush", label: "Ambush" },
      { key: "camouflage", label: "Camouflage" },
      { key: "quietude", label: "Quietude" },
      { key: "trapping", label: "Trapping" },
    ],
  },
  {
    key: "senses",
    label: "Senses",
    fields: [
      { key: "tracking", label: "Tracking" },
      { key: "detection", label: "Detection" },
      { key: "awareness", label: "Awareness" },
    ],
  },
  {
    key: "ferocity",
    label: "Ferocity",
    fields: [
      { key: "intimidation", label: "Intimidation" },
      { key: "dominance", label: "Dominance" },
      { key: "hostility", label: "Hostility" },
    ],
  },
] as const;

function StatEditorCard({
  title,
  score,
  fields,
  values,
  onChange,
}: {
  title: string;
  score: number;
  fields: readonly StatSliderField[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <div className="rounded-sm border border-border bg-background/40 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className={labelClass}>{title}</label>
        <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">
          Primary <span className="text-primary">{score}</span>
        </span>
      </div>
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.key}>
            <div className="flex items-center justify-between gap-3">
              <label className={labelClass}>{field.label}</label>
              <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">
                {values[field.key] ?? 0}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={values[field.key] ?? 0}
              onChange={(e) => onChange(field.key, Number(e.target.value))}
              className="w-full mt-1 accent-primary"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FileUploadField({ label, value, onChange, accept = "image/*,video/*", attachmentType = "image", folder = "uploads" }: { label: string; value: string; onChange: (url: string) => void; accept?: string; attachmentType?: Exclude<AttachmentMode, "url">; folder?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const looksLikeManualUrl = /^https?:\/\//i.test(value) && !/storage|blob:|object|assets/i.test(value);
  const [mode, setMode] = useState<AttachmentMode>(looksLikeManualUrl ? "url" : attachmentType);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const isUrlMode = mode === "url";
  const isUploadedValue = value && !isUrlMode;
  const selectedType = mode === "file" ? "file" : mode;

  useEffect(() => {
    if (mode !== "url") setMode(attachmentType);
  }, [attachmentType, mode]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const uploaded = await apiUpload<{ url?: string }>(`/files/upload?folder=${folder}`, file);
      if (!uploaded.url) throw new Error("Upload response did not include a file URL");
      onChange(uploaded.url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className={labelClass}>{label}</label>
      <div className="flex flex-wrap gap-1 mt-1">
        <button type="button" onClick={() => setMode("image")}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider rounded-sm border transition-colors ${mode === "image" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
          <Image className="h-3 w-3" /> Image
        </button>
        <button type="button" onClick={() => setMode("video")}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider rounded-sm border transition-colors ${mode === "video" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
          <Video className="h-3 w-3" /> Video
        </button>
        <button type="button" onClick={() => setMode("file")}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider rounded-sm border transition-colors ${mode === "file" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
          <FileIcon className="h-3 w-3" /> File
        </button>
        <button type="button" onClick={() => setMode("url")}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider rounded-sm border transition-colors ${mode === "url" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
          <LinkIcon className="h-3 w-3" /> URL
        </button>
      </div>
      {isUrlMode ? (
        <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="https://..." />
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          <input ref={fileRef} type="file" accept={mode === "image" ? "image/*" : mode === "video" ? "video/*" : accept} onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-display tracking-wider border border-dashed border-primary/40 rounded-sm text-primary hover:bg-primary/10 transition-colors">
            <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading" : `Choose ${selectedType}`}
          </button>
          {isUploadedValue && (
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted px-2 py-1 text-[10px] font-display uppercase tracking-wider text-foreground">
              {selectedType === "image" ? <Image className="h-3 w-3" /> : selectedType === "video" ? <Video className="h-3 w-3" /> : <FileIcon className="h-3 w-3" />}
              {selectedType}
              <button type="button" onClick={() => onChange("")} className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${selectedType} attachment`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {uploadError && <span className="text-[10px] text-destructive">{uploadError}</span>}
        </div>
      )}
    </div>
  );
}

function FieldEntryEditor({
  label,
  items,
  onAdd,
  onUpdate,
  onRemove,
  itemRef,
}: {
  label: string;
  items: LoreFieldNote[];
  onAdd: () => void;
  onUpdate: (idx: number, key: keyof LoreFieldNote, value: string) => void;
  onRemove: (idx: number) => void;
  itemRef: (key: string) => (el: HTMLDivElement | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={labelClass}>{label}</label>
        <button type="button" onClick={onAdd} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors">
          <Plus className="h-3 w-3" /> ADD ENTRY
        </button>
      </div>
      {items.length === 0 && <p className="text-[11px] font-body text-muted-foreground italic">No {label.toLowerCase()} recorded.</p>}
      {items.map((item, idx) => (
        <div key={item.id} ref={itemRef(item.id)} className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <input type="text" value={item.title} onChange={(e) => onUpdate(idx, "title", e.target.value)} placeholder="Title" className="flex-1 min-w-[180px] px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
              <input type="date" value={item.date || ""} onChange={(e) => onUpdate(idx, "date", e.target.value)} className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
              <button type="button" onClick={() => onUpdate(idx, "date", todayStr())} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors" title="Set to today">
                <Calendar className="h-3 w-3" /> TODAY
              </button>
            </div>
            <textarea value={item.body} onChange={(e) => onUpdate(idx, "body", e.target.value)} placeholder="Write entry..." rows={3} className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground resize-y min-h-[70px]" />
          </div>
          <button type="button" onClick={() => onRemove(idx)} className="text-muted-foreground hover:text-destructive mt-1"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

export default function AuthorDashboard() {
  const { role, username, personnelLevel, track } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [activeTab, setActiveTabRaw] = useState<DashboardTab>(() => {
    const tab = params.get("tab");
    return isDashboardTab(tab) ? tab : "projects";
  });
  const setActiveTab = (t: DashboardTab) => {
    setActiveTabRaw(t);
    const next = new URLSearchParams(params);
    if (t === "projects") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };
  const [loreSub, setLoreSub] = useState<LoreSub>("characters");

  // Per-section access predicate (PL + track aware).
  const canAccess = (section: DashboardTab, sub?: LoreSub) =>
    canAccessAuthorPanel({ level: personnelLevel, track, section, loreSub: sub });

  const tabAllowed = (t: DashboardTab) => {
    if (t === "lore") {
      // Allow if any sub-section is reachable.
      return loreSubs.some((s) => canAccessAuthorPanel({ level: personnelLevel, track, section: "lore", loreSub: s }));
    }
    return canAccessAuthorPanel({ level: personnelLevel, track, section: t });
  };

  const subAllowed = (s: LoreSub) =>
    canAccessAuthorPanel({ level: personnelLevel, track, section: "lore", loreSub: s });

  // Gallery ownership gate. L7 / "author" role bypasses; everyone else
  // (i.e. L6) may only modify items they uploaded themselves. Items with
  // no uploader stamp (legacy seed data) are treated as author-owned.
  const canModifyGalleryItem = (item: GalleryItem): boolean => {
    if (personnelLevel >= 7) return true;
    if (!item.uploadedBy) return false;
    return item.uploadedBy === username;
  };

  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tech, setTech] = useState<Technology[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [events, setEvents] = useState<LoreEvent[]>([]);
  const [others, setOthers] = useState<OtherLore[]>([]);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [mapImageUrl, setMapImageUrl] = useState<string>("");
  const [dashboardPageInfo, setDashboardPageInfo] = useState<PageInfo | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [editing, setEditing] = useState<EditableState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mapSaving, setMapSaving] = useState(false);
  const [mapImageSaving, setMapImageSaving] = useState(false);
  const [ccSettings, setCcSettings] = useState<CommandCenterSettings>(() => getCommandCenterSettings());
  const [ccPresets, setCcPresets] = useState<CommandCenterPreset[]>([]);
  const [ccSettingsLoading, setCcSettingsLoading] = useState(false);
  const [ccSettingsSaving, setCcSettingsSaving] = useState(false);
  const fullDescRef = useRef<HTMLTextAreaElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  // Key of the most-recently-added inline list item (doc/contribution/patch).
  // On phone layouts we intentionally do not focus the new field because the
  // mobile keyboard/visual viewport can force-scroll the page.
  const [pendingFocusKey, setPendingFocusKey] = useState<string | null>(null);
  const newItemRef = (key: string) => (el: HTMLDivElement | null) => {
    if (!el || pendingFocusKey !== key) return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      const firstInput = el.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input:not([type=hidden]), textarea, select",
      );
      firstInput?.focus({ preventScroll: true });
    }
    setPendingFocusKey(null);
  };

  const editSessionKey = editing
    ? `${activeTab}:${loreSub}:${isCreating ? "create" : editing.id ?? "draft"}`
    : null;

  // Scroll only when a new edit/create session opens. Do not react to every
  // field/list update, otherwise adding inline rows jumps back to the form top.
  useEffect(() => {
    if (!editSessionKey) return;
    // Defer to next frame so the form has rendered.
    const id = window.requestAnimationFrame(() => {
      editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [editSessionKey]);

  useEffect(() => {
    if (activeTab === "homepage" || activeTab === "map" || activeTab === "news") {
      setDashboardPageInfo(null);
      return;
    }

    if (!canAccess(activeTab, loreSub)) return;
    void loadDashboardItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loreSub, personnelLevel, role, track, username]);

  useEffect(() => {
    if (activeTab !== "map" || !canAccess("map")) return;
    void getMapMarkers().then(setMapMarkers);
    void getMapImageRemote().then(setMapImageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, personnelLevel, role, track]);

  useEffect(() => {
    if (activeTab !== "homepage" || !canAccess("homepage")) return;
    let isActive = true;

    setCcSettingsLoading(true);
    void Promise.all([
      getCommandCenterSettingsRemote(),
      getCommandCenterPresets(),
    ])
      .then(([settings, presets]) => {
        if (!isActive) return;
        setCcSettings(settings);
        setCcPresets(presets);
      })
      .catch(() => {
        if (!isActive) return;
        toast({
          title: "Command Center unavailable",
          description: "Could not load global presets from backend.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (isActive) setCcSettingsLoading(false);
      });

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, personnelLevel, role, track]);

  const refreshCommandCenterPresets = async () => {
    setCcPresets(await getCommandCenterPresets());
  };

  const saveGlobalCommandCenterSettings = async () => {
    setCcSettingsSaving(true);
    try {
      const saved = await saveCommandCenterSettingsRemote(ccSettings);
      setCcSettings(saved);
      await refreshCommandCenterPresets();
      toast({
        title: "Command Center saved",
        description: "Active global preset has been updated.",
      });
    } catch {
      toast({
        title: "Save failed",
        description: "Backend rejected the Command Center settings update.",
        variant: "destructive",
      });
    } finally {
      setCcSettingsSaving(false);
    }
  };

  const resetGlobalCommandCenterSettings = async () => {
    setCcSettingsSaving(true);
    try {
      const defaults = await getCommandCenterDefaults();
      const saved = await saveCommandCenterSettingsRemote(defaults);
      setCcSettings(saved);
      await refreshCommandCenterPresets();
      toast({
        title: "Command Center reset",
        description: "Active global preset now uses backend defaults.",
      });
    } catch {
      toast({
        title: "Reset failed",
        description: "Backend defaults were unavailable, so the active preset was left unchanged.",
        variant: "destructive",
      });
    } finally {
      setCcSettingsSaving(false);
    }
  };

  const activatePreset = async (id: string) => {
    setCcSettingsSaving(true);
    try {
      await activateCommandCenterPreset(id);
      const [settings, presets] = await Promise.all([
        getCommandCenterSettingsRemote(),
        getCommandCenterPresets(),
      ]);
      setCcSettings(settings);
      setCcPresets(presets);
      toast({
        title: "Preset activated",
        description: "Command Center now uses the selected global preset.",
      });
    } catch {
      toast({
        title: "Activation failed",
        description: "Backend could not activate this preset.",
        variant: "destructive",
      });
    } finally {
      setCcSettingsSaving(false);
    }
  };

  const removePreset = async (id: string) => {
    setCcSettingsSaving(true);
    try {
      await deleteCommandCenterPreset(id);
      await refreshCommandCenterPresets();
      toast({
        title: "Preset deleted",
        description: "The inactive preset was removed.",
      });
    } catch {
      toast({
        title: "Delete failed",
        description: "Active presets cannot be deleted. Activate another preset first.",
        variant: "destructive",
      });
    } finally {
      setCcSettingsSaving(false);
    }
  };

  const slugifyPresetKey = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || `preset-${Date.now().toString(36)}`;

  const promptCreatePreset = () => {
    showValidation({
      variant: "info",
      title: "Save current settings as preset",
      description: "Captures the unsaved Command Center configuration above as a new preset.",
      confirmLabel: "Name it",
      cancelLabel: "Cancel",
      onConfirm: () => {
        const name = window.prompt("Preset name", "New preset")?.trim();
        if (!name) return;
        void createPresetFromCurrent(name);
      },
    });
  };

  const createPresetFromCurrent = async (name: string) => {
    setCcSettingsSaving(true);
    try {
      const existingKeys = new Set(ccPresets.map((p) => p.presetKey));
      let key = slugifyPresetKey(name);
      let n = 2;
      while (existingKeys.has(key)) {
        key = `${slugifyPresetKey(name)}-${n++}`;
      }
      await createCommandCenterPreset({ presetKey: key, presetName: name, settings: ccSettings });
      await refreshCommandCenterPresets();
      toast({ title: "Preset saved", description: `"${name}" added to global presets.` });
    } catch {
      toast({
        title: "Create failed",
        description: "Backend rejected the new preset.",
        variant: "destructive",
      });
    } finally {
      setCcSettingsSaving(false);
    }
  };

  const renamePreset = (preset: CommandCenterPreset) => {
    const name = window.prompt("Rename preset", preset.presetName)?.trim();
    if (!name || name === preset.presetName) return;
    void (async () => {
      setCcSettingsSaving(true);
      try {
        await updateCommandCenterPreset(preset.id, { presetName: name });
        await refreshCommandCenterPresets();
        toast({ title: "Preset renamed", description: `Now called "${name}".` });
      } catch {
        toast({ title: "Rename failed", variant: "destructive", description: "Backend rejected the update." });
      } finally {
        setCcSettingsSaving(false);
      }
    })();
  };

  const overwritePresetWithCurrent = (preset: CommandCenterPreset) => {
    showValidation({
      variant: "warning",
      title: `Overwrite "${preset.presetName}"?`,
      description: "Replaces the saved preset configuration with the current Command Center settings.",
      confirmLabel: "Overwrite",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        setCcSettingsSaving(true);
        try {
          await updateCommandCenterPreset(preset.id, { settings: ccSettings });
          await refreshCommandCenterPresets();
          toast({ title: "Preset updated", description: `"${preset.presetName}" now matches current settings.` });
        } catch {
          toast({ title: "Update failed", variant: "destructive", description: "Backend rejected the update." });
        } finally {
          setCcSettingsSaving(false);
        }
      },
    });
  };

  useEffect(() => {
    const tab = params.get("tab");
    if (isDashboardTab(tab)) {
      setActiveTabRaw(tab);
      return;
    }
    setActiveTabRaw("projects");
  }, [params]);

  const loadDashboardItems = async (reset = false) => {
    if (activeTab === "homepage" || activeTab === "map" || activeTab === "news") return;
    if (!canAccess(activeTab, loreSub)) return;

    const page = reset ? 1 : (dashboardPageInfo?.page ?? 1) + 1;
    setDashboardLoading(true);

    try {
      if (activeTab === "projects") {
        const response = await getProjectsPage({ page, pageSize: DASHBOARD_LIST_PAGE_SIZE });
        setProjects((current) => reset ? response.items : [...current, ...response.items]);
        setDashboardPageInfo(response.pageInfo);
        return;
      }

      if (activeTab === "gallery") {
        const response = await getGalleryPage({
          page,
          pageSize: DASHBOARD_LIST_PAGE_SIZE,
          uploadedBy: personnelLevel >= 7 ? undefined : username,
        });
        setGallery((current) => reset ? response.items : [...current, ...response.items]);
        setDashboardPageInfo(response.pageInfo);
        return;
      }

      if (loreSub === "characters") {
        const response = await getCharactersPage({ page, pageSize: DASHBOARD_LIST_PAGE_SIZE });
        setCharacters((current) => reset ? response.items : [...current, ...response.items]);
        setDashboardPageInfo(response.pageInfo);
      } else if (loreSub === "places") {
        const response = await getPlacesPage({ page, pageSize: DASHBOARD_LIST_PAGE_SIZE });
        setPlaces((current) => reset ? response.items : [...current, ...response.items]);
        setDashboardPageInfo(response.pageInfo);
      } else if (loreSub === "technology") {
        const response = await getTechnologyPage({ page, pageSize: DASHBOARD_LIST_PAGE_SIZE });
        setTech((current) => reset ? response.items : [...current, ...response.items]);
        setDashboardPageInfo(response.pageInfo);
      } else if (loreSub === "creatures") {
        const response = await getCreaturesPage({ page, pageSize: DASHBOARD_LIST_PAGE_SIZE });
        setCreatures((current) => reset ? response.items : [...current, ...response.items]);
        setDashboardPageInfo(response.pageInfo);
      } else if (loreSub === "events") {
        const response = await getEventsPage({ page, pageSize: DASHBOARD_LIST_PAGE_SIZE });
        setEvents((current) => reset ? response.items : [...current, ...response.items]);
        setDashboardPageInfo(response.pageInfo);
      } else {
        const response = await getOthersPage({ page, pageSize: DASHBOARD_LIST_PAGE_SIZE });
        setOthers((current) => reset ? response.items : [...current, ...response.items]);
        setDashboardPageInfo(response.pageInfo);
      }
    } finally {
      setDashboardLoading(false);
    }
  };

  const hasAnyAccess = canEnterAuthorPanel(personnelLevel, track);
  if (!hasAnyAccess) {
    return (
      <div className="p-6 md:p-8 space-y-4">
        <h1 className="font-display text-2xl tracking-[0.1em] text-primary">AUTHOR PANEL</h1>
        <div className="mecha-line w-32" />
        <div className="hud-border bg-card p-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground font-body">Access restricted.</p>
          <p className="text-xs text-muted-foreground font-body italic">
            Author Panel requires an author account, L7 (Full Authority), or L6 clearance.
          </p>
        </div>
      </div>
    );
  }

  const startCreate = () => {
    setIsCreating(true);
    if (activeTab === "projects") {
      setEditing({ title: "", status: "Planning", thumbnail: "", headerImage: "", shortDesc: "", fullDesc: "", patches: [], docs: [], features: [] });
    } else if (activeTab === "lore") {
      if (loreSub === "characters") {
        setEditing({
          name: "",
          race: "",
          occupation: "",
          height: "",
          traits: [],
          likes: [],
          dislikes: [],
          accentColor: "#4A90D9",
          thumbnail: "",
          headerImage: "",
          shortDesc: "",
          fullDesc: "",
          stats: createDefaultCharacterStats(),
          docs: [],
          fieldNotes: [],
          observations: [],
          contributions: [],
          skills: [],
        });
      } else if (loreSub === "places") {
        setEditing({ name: "", type: "", thumbnail: "", headerImage: "", shortDesc: "", fullDesc: "", docs: [], fieldNotes: [], observations: [], features: [] });
      } else if (loreSub === "technology") {
        setEditing({ name: "", category: "", thumbnail: "", headerImage: "", shortDesc: "", fullDesc: "", docs: [], fieldNotes: [], observations: [], features: [] });
      } else if (loreSub === "creatures") {
        setEditing({
          name: "",
          classification: "Amorphous",
          dangerLevel: 1,
          habitat: "",
          traits: [],
          instincts: [],
          aversions: [],
          accentColor: "#7DD3FC",
          thumbnail: "",
          headerImage: "",
          shortDesc: "",
          fullDesc: "",
          stats: createDefaultCreatureStats(),
          docs: [],
          fieldNotes: [],
          observations: [],
          skills: [],
        });
      } else if (loreSub === "events") {
        setEditing({
          title: "",
          category: "Institute Milestone",
          era: "",
          dateLabel: "",
          scope: "",
          impactLevel: "",
          thumbnail: "",
          headerImage: "",
          shortDesc: "",
          fullDesc: "",
          consequences: [],
          relatedLinks: [],
          docs: [],
          fieldNotes: [],
          observations: [],
          features: [],
        });
      } else {
        setEditing({ title: "", category: "World Systems", thumbnail: "", headerImage: "", shortDesc: "", fullDesc: "", docs: [], fieldNotes: [], observations: [], features: [] });
      }
    } else {
      setEditing({ type: "image", title: "", thumbnail: "", videoUrl: "", caption: "", tags: [], date: new Date().toISOString().split("T")[0], comments: [] });
    }
  };

  const requireText = (value: string | undefined, label: string) => {
    if (value?.trim()) return true;
    toast({
      title: "Required field missing",
      description: `${label} is required before saving.`,
      variant: "destructive",
    });
    return false;
  };

  const validateEditing = () => {
    if (!editing) return false;

    if (activeTab === "projects") {
      return (
        requireText(editing.title, "Project title") &&
        requireText(editing.shortDesc, "Project short description") &&
        requireText(editing.fullDesc, "Project full description")
      );
    }

    if (activeTab === "gallery") {
      return (
        requireText(editing.title, "Gallery title") &&
        requireText(editing.caption, "Gallery caption")
      );
    }

    if (activeTab === "lore") {
      const label = loreSub === "other" || loreSub === "events" ? "Lore title" : "Lore name";
      return (
        requireText(loreSub === "other" || loreSub === "events" ? editing.title : editing.name, label) &&
        requireText(editing.shortDesc, "Lore short description") &&
        requireText(editing.fullDesc, "Lore full description")
      );
    }

    return true;
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!validateEditing()) return;

    setContentSaving(true);
    try {
      if (activeTab === "projects") {
        const payload: Omit<Project, "id"> = {
          title: editing.title ?? "",
          status: (editing.status as Project["status"]) ?? "Planning",
          thumbnail: editing.thumbnail ?? "",
          headerImage: editing.headerImage ?? "",
          shortDesc: editing.shortDesc ?? "",
          fullDesc: editing.fullDesc ?? "",
          patches: editing.patches ?? [],
          docs: editing.docs ?? [],
          features: editing.features ?? [],
          meta: editing.meta,
        };

        if (isCreating) await createProject(payload);
        else if (editing.id) await updateProject(editing.id, payload);
        await loadDashboardItems(true);
      } else if (activeTab === "lore") {
        if (loreSub === "characters") {
          const normalizedStats = normalizeCharacterStatsForEditor(editing.stats as Partial<Character["stats"]>);
          const payload: Omit<Character, "id"> = {
            name: editing.name ?? "",
            race: editing.race ?? "",
            occupation: editing.occupation ?? "",
            height: editing.height ?? "",
            traits: editing.traits ?? [],
            likes: editing.likes ?? [],
            dislikes: editing.dislikes ?? [],
            accentColor: editing.accentColor ?? "#4A90D9",
            thumbnail: editing.thumbnail ?? "",
            headerImage: editing.headerImage ?? "",
            shortDesc: editing.shortDesc ?? "",
            fullDesc: editing.fullDesc ?? "",
            stats: normalizedStats,
            docs: editing.docs ?? [],
            fieldNotes: editing.fieldNotes ?? [],
            observations: editing.observations ?? [],
            contributions: editing.contributions ?? [],
            skills: editing.skills ?? [],
            meta: editing.meta,
          };

          if (isCreating) await createCharacter(payload);
          else if (editing.id) await updateCharacter(editing.id, payload);
          await loadDashboardItems(true);
        } else if (loreSub === "places") {
          const payload: Omit<Place, "id"> = {
            name: editing.name ?? "",
            type: editing.type ?? "",
            thumbnail: editing.thumbnail ?? "",
            headerImage: editing.headerImage ?? "",
            shortDesc: editing.shortDesc ?? "",
            fullDesc: editing.fullDesc ?? "",
            docs: editing.docs ?? [],
            fieldNotes: editing.fieldNotes ?? [],
            observations: editing.observations ?? [],
            features: editing.features ?? [],
            meta: editing.meta,
          };

          if (isCreating) await createPlace(payload);
          else if (editing.id) await updatePlace(editing.id, payload);
          await loadDashboardItems(true);
        } else if (loreSub === "technology") {
          const payload: Omit<Technology, "id"> = {
            name: editing.name ?? "",
            category: editing.category ?? "",
            thumbnail: editing.thumbnail ?? "",
            headerImage: editing.headerImage ?? "",
            shortDesc: editing.shortDesc ?? "",
            fullDesc: editing.fullDesc ?? "",
            docs: editing.docs ?? [],
            fieldNotes: editing.fieldNotes ?? [],
            observations: editing.observations ?? [],
            features: editing.features ?? [],
            meta: editing.meta,
          };

          if (isCreating) await createTech(payload);
          else if (editing.id) await updateTech(editing.id, payload);
          await loadDashboardItems(true);
        } else if (loreSub === "creatures") {
          const normalizedStats = normalizeCreatureStatsForEditor(editing.stats as Partial<Creature["stats"]>);
          const payload: Omit<Creature, "id"> = {
            name: editing.name ?? "",
            classification: (editing.classification as CreatureClassification) ?? "Amorphous",
            dangerLevel: (editing.dangerLevel as CreatureDangerLevel) ?? 1,
            habitat: editing.habitat ?? "",
            traits: editing.traits ?? [],
            instincts: editing.instincts ?? [],
            aversions: editing.aversions ?? [],
            accentColor: editing.accentColor ?? "#7DD3FC",
            thumbnail: editing.thumbnail ?? "",
            headerImage: editing.headerImage ?? "",
            shortDesc: editing.shortDesc ?? "",
            fullDesc: editing.fullDesc ?? "",
            docs: editing.docs ?? [],
            fieldNotes: editing.fieldNotes ?? [],
            observations: editing.observations ?? [],
            stats: normalizedStats,
            skills: editing.skills ?? [],
            meta: editing.meta,
          };

          if (isCreating) await createCreature(payload);
          else if (editing.id) await updateCreature(editing.id, payload);
          await loadDashboardItems(true);
        } else if (loreSub === "events") {
          const payload: Omit<LoreEvent, "id"> = {
            title: editing.title ?? "",
            category: editing.category ?? "Institute Milestone",
            era: editing.era,
            dateLabel: editing.dateLabel,
            scope: editing.scope,
            impactLevel: editing.impactLevel,
            thumbnail: editing.thumbnail ?? "",
            headerImage: editing.headerImage ?? "",
            shortDesc: editing.shortDesc ?? "",
            fullDesc: editing.fullDesc ?? "",
            consequences: editing.consequences ?? [],
            relatedLinks: editing.relatedLinks ?? [],
            docs: editing.docs ?? [],
            fieldNotes: editing.fieldNotes ?? [],
            observations: editing.observations ?? [],
            features: editing.features ?? [],
            meta: editing.meta,
          };

          if (isCreating) await createEvent(payload);
          else if (editing.id) await updateEvent(editing.id, payload);
          await loadDashboardItems(true);
        } else {
          const payload: Omit<OtherLore, "id"> = {
            title: editing.title ?? "",
            category: editing.category ?? "World Systems",
            thumbnail: editing.thumbnail ?? "",
            headerImage: editing.headerImage ?? "",
            shortDesc: editing.shortDesc ?? "",
            fullDesc: editing.fullDesc ?? "",
            docs: editing.docs ?? [],
            fieldNotes: editing.fieldNotes ?? [],
            observations: editing.observations ?? [],
            features: editing.features ?? [],
            meta: editing.meta,
          };

          if (isCreating) await createOther(payload);
          else if (editing.id) await updateOther(editing.id, payload);
          await loadDashboardItems(true);
        }
      } else {
        const payload: Omit<GalleryItem, "id"> = {
          type: (editing.type as GalleryItem["type"]) ?? "image",
          title: editing.title ?? "",
          thumbnail: editing.thumbnail ?? "",
          videoUrl: editing.videoUrl,
          caption: editing.caption ?? "",
          tags: editing.tags ?? [],
          date: editing.date ?? new Date().toISOString().split("T")[0],
          comments: editing.comments ?? [],
          // Stamp the uploader on creation; preserve on edit so ownership
          // doesn't transfer when an author edits someone else's upload.
        uploadedBy: isCreating
          ? (personnelLevel >= 7 ? undefined : username)
          : ((editing as EditableState & { uploadedBy?: string }).uploadedBy ?? username),
        };

        if (isCreating) await createGalleryItem(payload);
        else if (editing.id) await updateGalleryItem(editing.id, payload);
        await loadDashboardItems(true);
      }
      toast({ title: isCreating ? "Content created" : "Content updated" });
      setEditing(null);
      setIsCreating(false);
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Backend rejected the content update.",
        variant: "destructive",
      });
    } finally {
      setContentSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    showValidation({
      variant: "error",
      title: "Delete content",
      description: `Delete "${title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      critical: true,
      confirmDelaySeconds: 5,
      onConfirm: async () => {
        setDeletingId(id);
        try {
          if (activeTab === "projects") { await deleteProject(id); await loadDashboardItems(true); }
          else if (activeTab === "lore") {
            if (loreSub === "characters") await deleteCharacter(id);
            else if (loreSub === "places") await deletePlace(id);
            else if (loreSub === "technology") await deleteTech(id);
            else if (loreSub === "creatures") await deleteCreature(id);
            else if (loreSub === "events") await deleteEvent(id);
            else await deleteOther(id);
            await loadDashboardItems(true);
          } else if (activeTab === "gallery") { await deleteGalleryItem(id); await loadDashboardItems(true); }
          toast({ title: "Content deleted" });
        } catch (error) {
          toast({
            title: "Delete failed",
            description: error instanceof Error ? error.message : "Backend rejected the delete request.",
            variant: "destructive",
          });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const persistMapMarkers = async (markers: MapMarker[], successTitle = "Map markers saved") => {
    setMapSaving(true);
    try {
      await saveMapMarkers(markers);
      window.dispatchEvent(new CustomEvent("morneven:map-changed"));
      toast({ title: successTitle });
    } catch (error) {
      toast({
        title: "Map marker save failed",
        description: error instanceof Error ? error.message : "Backend rejected the marker update.",
        variant: "destructive",
      });
    } finally {
      setMapSaving(false);
    }
  };

  const getItems = (): DashboardItem[] => {
    if (activeTab === "projects") return projects;
    if (activeTab === "lore") {
      if (loreSub === "characters") return characters;
      if (loreSub === "places") return places;
      if (loreSub === "technology") return tech;
      if (loreSub === "creatures") return creatures;
      if (loreSub === "events") return events;
      return others;
    }
    if (activeTab === "gallery") {
      // L6 personnel only see their own uploads in the management list.
      // L7 / author see everything.
      if (personnelLevel >= 7) return gallery;
      return gallery.filter((g) => g.uploadedBy === username);
    }
    return [];
  };

  const getItemTitle = (item: DashboardItem): string => {
    if ("title" in item) return item.title || "Untitled";
    return item.name || "Untitled";
  };

  const getItemDesc = (item: DashboardItem): string => {
    if ("caption" in item) return item.caption || "";
    return item.shortDesc || "";
  };

  // Doc management helpers
  const addDoc = () => {
    const key = `doc-${Date.now()}`;
    // Prepend so newest doc appears at the top of the list, right under
    // the ADD DOC button - keeps the editing context next to the action.
    const docs = [{ type: "image" as const, url: "", caption: "", _key: key } as DocItem & { _key?: string }, ...(editing.docs || [])];
    setEditing({ ...editing, docs });
    setPendingFocusKey(key);
  };
  const updateDoc = (idx: number, field: keyof DocItem, value: string) => {
    const docs = [...(editing.docs || [])];
    docs[idx] = { ...docs[idx], [field]: value };
    setEditing({ ...editing, docs });
  };
  const removeDoc = (idx: number) => {
    if (!editing) return;
    const docs = (editing.docs || []).filter((_, i: number) => i !== idx);
    setEditing({ ...editing, docs });
  };

  // Character contribution helpers
  const addContribution = () => {
    if (!editing) return;
    const id = `ctr-${Date.now()}`;
    const contributions: CharacterContribution[] = [
      { id, title: "", description: "", date: todayStr() },
      ...(editing.contributions || []),
    ];
    setEditing({ ...editing, contributions });
    setPendingFocusKey(id);
  };
  const updateContribution = (idx: number, field: keyof CharacterContribution, value: string) => {
    if (!editing) return;
    const contributions = [...(editing.contributions || [])];
    contributions[idx] = { ...contributions[idx], [field]: value };
    setEditing({ ...editing, contributions });
  };
  const removeContribution = (idx: number) => {
    if (!editing) return;
    const contributions = (editing.contributions || []).filter((_, i) => i !== idx);
    setEditing({ ...editing, contributions });
  };

  const addFieldEntry = (field: "fieldNotes" | "observations") => {
    if (!editing) return;
    const id = `${field}-${Date.now()}`;
    const next: LoreFieldNote[] = [{ id, title: "", body: "", date: todayStr() }, ...(editing[field] || [])];
    setEditing({ ...editing, [field]: next });
    setPendingFocusKey(id);
  };
  const updateFieldEntry = (field: "fieldNotes" | "observations", idx: number, key: keyof LoreFieldNote, value: string) => {
    if (!editing) return;
    const next = [...(editing[field] || [])];
    next[idx] = { ...next[idx], [key]: value };
    setEditing({ ...editing, [field]: next });
  };
  const removeFieldEntry = (field: "fieldNotes" | "observations", idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, [field]: (editing[field] || []).filter((_, i) => i !== idx) });
  };

  // Patch management for projects:
  // - new patches are inserted at the TOP of the list
  // - version auto-increments from the HIGHEST existing version
  const addPatch = () => {
    const existing = editing?.patches || [];
    const highest = highestVersion(existing.map((p) => p.version).filter(Boolean));
    const version = nextPatchVersion(highest);
    const key = `patch-${Date.now()}`;
    const patches = [{ version, date: todayStr(), notes: "", _key: key } as ProjectPatch & { _key?: string }, ...existing];
    setEditing({ ...editing, patches });
    setPendingFocusKey(key);
  };
  const updatePatch = (idx: number, field: string, value: string) => {
    const patches = [...(editing.patches || [])];
    patches[idx] = { ...patches[idx], [field]: value };
    setEditing({ ...editing, patches });
  };
  const removePatch = (idx: number) => {
    if (!editing) return;
    const patches = (editing.patches || []).filter((_, i: number) => i !== idx);
    setEditing({ ...editing, patches });
  };

  const beginEdit = (item: DashboardItem) => {
    if (activeTab === "projects") {
      const project = item as Project;
      setEditing({
        ...project,
        docs: project.docs ?? [],
        features: project.features ?? [],
        patches: project.patches ?? [],
      });
      setIsCreating(false);
      return;
    }

    if (activeTab === "gallery") {
      const galleryItem = item as GalleryItem;
      setEditing({
        id: galleryItem.id,
        type: galleryItem.type,
        title: galleryItem.title,
        thumbnail: galleryItem.thumbnail,
        videoUrl: galleryItem.videoUrl,
        caption: galleryItem.caption,
        date: galleryItem.date,
        uploadedBy: galleryItem.uploadedBy,
        comments: galleryItem.comments ?? [],
        tags: galleryItem.tags ?? [],
      });
      setIsCreating(false);
      return;
    }

    if (loreSub === "characters") {
      const character = item as Character;
      setEditing({
        ...character,
        docs: character.docs ?? [],
        fieldNotes: character.fieldNotes ?? [],
        observations: character.observations ?? [],
        contributions: character.contributions ?? [],
        skills: character.skills ?? [],
        stats: normalizeCharacterStatsForEditor(character.stats),
      });
      setIsCreating(false);
      return;
    }

    if (loreSub === "creatures") {
      const creature = item as Creature;
      setEditing({
        ...creature,
        docs: creature.docs ?? [],
        fieldNotes: creature.fieldNotes ?? [],
        observations: creature.observations ?? [],
        traits: creature.traits ?? [],
        instincts: creature.instincts ?? [],
        aversions: creature.aversions ?? [],
        skills: creature.skills ?? [],
        stats: normalizeCreatureStatsForEditor(creature.stats),
      });
      setIsCreating(false);
      return;
    }

    if (loreSub === "events") {
      const event = item as LoreEvent;
      setEditing({
        ...event,
        docs: event.docs ?? [],
        fieldNotes: event.fieldNotes ?? [],
        observations: event.observations ?? [],
        features: event.features ?? [],
        consequences: event.consequences ?? [],
        relatedLinks: event.relatedLinks ?? [],
      });
      setIsCreating(false);
      return;
    }

    if (loreSub === "places") {
      const place = item as Place;
      setEditing({
        ...place,
        docs: place.docs ?? [],
        fieldNotes: place.fieldNotes ?? [],
        observations: place.observations ?? [],
        features: place.features ?? [],
      });
      setIsCreating(false);
      return;
    }

    if (loreSub === "technology") {
      const technology = item as Technology;
      setEditing({
        ...technology,
        docs: technology.docs ?? [],
        fieldNotes: technology.fieldNotes ?? [],
        observations: technology.observations ?? [],
        features: technology.features ?? [],
      });
      setIsCreating(false);
      return;
    }

    const other = item as OtherLore;
    setEditing({
      ...other,
      docs: other.docs ?? [],
      fieldNotes: other.fieldNotes ?? [],
      observations: other.observations ?? [],
      features: other.features ?? [],
    });
    setIsCreating(false);
  };

  const updateCharacterStatDetail = (category: string, key: string, value: number) => {
    if (!editing) return;
    const current = normalizeCharacterStatsForEditor(editing.stats as Partial<Character["stats"]>);
    const currentGroup = (current.detail?.[category as keyof NonNullable<Character["stats"]["detail"]>] ?? {}) as Record<string, number>;
    const nextStats = normalizeCharacterStatsForEditor({
      ...current,
      detail: {
        ...current.detail,
        [category]: {
          ...currentGroup,
          [key]: value,
        },
      },
    });
    setEditing({ ...editing, stats: nextStats });
  };

  const updateCreatureStatDetail = (category: string, key: string, value: number) => {
    if (!editing) return;
    const current = normalizeCreatureStatsForEditor(editing.stats as Partial<Creature["stats"]>);
    const currentGroup = (current.detail?.[category as keyof NonNullable<NonNullable<Creature["stats"]>["detail"]>] ?? {}) as Record<string, number>;
    const nextStats = normalizeCreatureStatsForEditor({
      ...current,
      detail: {
        ...current.detail,
        [category]: {
          ...currentGroup,
          [key]: value,
        },
      },
    });
    setEditing({ ...editing, stats: nextStats });
  };

  const isCharacter = activeTab === "lore" && loreSub === "characters";
  const isPlace = activeTab === "lore" && loreSub === "places";
  const isTech = activeTab === "lore" && loreSub === "technology";
  const isCreature = activeTab === "lore" && loreSub === "creatures";
  const isEvent = activeTab === "lore" && loreSub === "events";
  const isOther = activeTab === "lore" && loreSub === "other";
  const isProject = activeTab === "projects";
  const isGallery = activeTab === "gallery";
  const isMap = activeTab === "map";
  const hasDocs = isProject || isCharacter || isPlace || isTech || isCreature || isEvent || isOther;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">AUTHOR PANEL</h1>
      <div className="mecha-line w-32" />

      {/* Tabs - disabled tabs render as locked with a tooltip explaining
          the clearance gate (per L6 track scoping). */}
      <div className="flex flex-wrap gap-2">
        {dashTabs.map((t) => {
          const allowed = tabAllowed(t);
          const button = (
            <button
              onClick={() => {
                if (!allowed) return;
                setActiveTab(t);
                setEditing(null);
                setIsCreating(false);
              }}
              disabled={!allowed}
              className={`px-3 md:px-4 py-1.5 text-xs font-display tracking-[0.1em] uppercase border rounded-sm transition-colors ${
                activeTab === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              } ${!allowed ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""}`}
            >
              {t === "homepage" ? "Command Center" : t}
            </button>
          );
          if (allowed) return <div key={t}>{button}</div>;
          return (
            <Tooltip key={t} delayDuration={0}>
              <TooltipTrigger asChild><span>{button}</span></TooltipTrigger>
              <TooltipContent side="bottom" className="font-heading text-[10px] tracking-wider uppercase">
                Locked · clearance / track does not permit this section
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {activeTab === "lore" && (
        <div className="flex flex-wrap gap-2">
          {loreSubs.map((s) => {
            const allowed = subAllowed(s);
            const button = (
              <button
                onClick={() => {
                  if (!allowed) return;
                  setLoreSub(s);
                  setEditing(null);
                  setIsCreating(false);
                }}
                disabled={!allowed}
                className={`px-3 py-1 text-[10px] font-display tracking-[0.1em] uppercase border rounded-sm transition-colors ${
                  loreSub === s
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "border-border text-muted-foreground hover:bg-muted"
                } ${!allowed ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""}`}
              >
                {s}
              </button>
            );
            if (allowed) return <div key={s}>{button}</div>;
            return (
              <Tooltip key={s} delayDuration={0}>
                <TooltipTrigger asChild><span>{button}</span></TooltipTrigger>
                <TooltipContent side="bottom" className="font-heading text-[10px] tracking-wider uppercase">
                  Locked · clearance/track mismatch
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}

      {activeTab !== "homepage" && activeTab !== "map" && activeTab !== "news" && canAccess(activeTab, loreSub) && (
        <div className="flex justify-end">
          <button onClick={startCreate} className="flex items-center gap-1 px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground bg-primary rounded-sm hover:opacity-90 transition-opacity">
            <Plus className="h-3 w-3" /> CREATE NEW
          </button>
        </div>
      )}

      {/* News management */}
      {activeTab === "news" && canAccess("news") && (
        <NewsManagementSection />
      )}

      {/* Locked-section banner when current tab/sub is not accessible. */}
      {!canAccess(activeTab, loreSub) && (
        <div className="hud-border bg-card p-6 text-center space-y-2">
          <p className="text-sm font-heading tracking-wider uppercase text-destructive">Section Locked</p>
          <p className="text-xs text-muted-foreground font-body italic">
            Your clearance (L{personnelLevel} · {track}) does not grant write access to this section.
          </p>
        </div>
      )}

      {/* Command Center settings panel */}
      {activeTab === "homepage" && canAccess("homepage") && (
        <div className="hud-border bg-card p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="font-heading text-sm tracking-wider text-accent-orange uppercase flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" /> Command Center Settings
              </h3>
              <p className="text-[11px] font-body text-muted-foreground italic">
                Configure the global Home screen shared by all personnel.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={saveGlobalCommandCenterSettings}
                disabled={ccSettingsSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                title="Save changes to the active preset"
              >
                <Save className="h-3 w-3" /> {ccSettingsSaving ? "SAVING" : "SAVE ACTIVE"}
              </button>
              <button
                onClick={promptCreatePreset}
                disabled={ccSettingsSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-wider border border-primary/40 text-primary rounded-sm hover:bg-primary/10 transition-colors disabled:opacity-50"
                title="Save current configuration as a new preset"
              >
                <FilePlus className="h-3 w-3" /> SAVE AS NEW
              </button>
              <button
                onClick={() => showValidation({
                  variant: "warning",
                  title: "Reset global Command Center",
                  description: "This will overwrite the active global preset for all personnel.",
                  confirmLabel: "Reset defaults",
                  cancelLabel: "Cancel",
                  critical: true,
                  confirmDelaySeconds: 5,
                  onConfirm: resetGlobalCommandCenterSettings,
                })}
                disabled={ccSettingsSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" /> RESET
              </button>
            </div>
          </div>

          {/* Preset Library */}
          <div className="rounded-sm border border-border bg-background/40 p-3 md:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className={labelClass}>Preset Library</p>
                <span className="text-[10px] font-display tracking-wider px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                  {ccPresets.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void refreshCommandCenterPresets()}
                disabled={ccSettingsLoading || ccSettingsSaving}
                className="inline-flex items-center gap-1 text-[10px] font-display tracking-wider text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${ccSettingsLoading ? "animate-spin" : ""}`} /> REFRESH
              </button>
            </div>

            {ccPresets.length === 0 ? (
              <div className="rounded-sm border border-dashed border-border bg-card/40 p-6 text-center space-y-2">
                <p className="text-xs font-heading tracking-wider uppercase text-muted-foreground">No presets yet</p>
                <p className="text-[11px] font-body text-muted-foreground italic">
                  Configure the settings below, then click <span className="text-foreground">Save as New</span> to create one.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {[...ccPresets]
                  .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.presetName.localeCompare(b.presetName))
                  .map((preset) => (
                    <div
                      key={preset.id}
                      className={`group relative rounded-sm border p-3 transition-colors ${
                        preset.isActive
                          ? "border-primary/60 bg-primary/5"
                          : "border-border bg-card hover:border-border/80 hover:bg-card/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            {preset.isActive ? (
                              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                            ) : (
                              <Star className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                            )}
                            <p className="truncate text-sm font-heading uppercase tracking-wider text-foreground">
                              {preset.presetName}
                            </p>
                          </div>
                          <p className="truncate text-[10px] font-mono text-muted-foreground/80">
                            {preset.presetKey}
                          </p>
                          {preset.isActive && (
                            <span className="inline-block text-[9px] font-display tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-primary/15 text-primary">
                              Active · Live for all
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border/50 pt-2">
                        {!preset.isActive && (
                          <button
                            type="button"
                            onClick={() => activatePreset(preset.id)}
                            disabled={ccSettingsSaving}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary hover:bg-primary/10 rounded-sm disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3 w-3" /> ACTIVATE
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => overwritePresetWithCurrent(preset)}
                          disabled={ccSettingsSaving}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-sm disabled:opacity-50"
                          title="Overwrite this preset with current settings"
                        >
                          <Save className="h-3 w-3" /> OVERWRITE
                        </button>
                        <button
                          type="button"
                          onClick={() => renamePreset(preset)}
                          disabled={ccSettingsSaving}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-sm disabled:opacity-50"
                        >
                          <Pencil className="h-3 w-3" /> RENAME
                        </button>
                        {!preset.isActive && (
                          <button
                            type="button"
                            onClick={() => showValidation({
                              variant: "warning",
                              title: "Delete preset",
                              description: `Delete inactive preset "${preset.presetName}"?`,
                              confirmLabel: "Delete",
                              cancelLabel: "Cancel",
                              dontShowAgainKey: "delete_command_center_preset",
                              onConfirm: () => removePreset(preset.id),
                            })}
                            disabled={ccSettingsSaving}
                            className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-destructive hover:bg-destructive/10 rounded-sm disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" /> DELETE
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="mecha-line" />

          {/* Configuration */}
          <div className="space-y-5">
            <p className="text-[10px] font-display tracking-wider uppercase text-muted-foreground">
              Configuration · edits apply to the active preset on save
            </p>

            <div>
              <label className={labelClass}>Welcome Message</label>
              <input
                type="text"
                value={ccSettings.welcomeMessage}
                onChange={(e) => setCcSettings({ ...ccSettings, welcomeMessage: e.target.value })}
                className={inputClass}
                placeholder="Here's your operational overview."
              />
            </div>

            <div>
              <p className={labelClass + " mb-2"}>Visible Sections</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ["showStats", "Stat Cards"],
                  ["showProjects", "Project Status"],
                  ["showNews", "News Feed"],
                  ["showCharacters", "Key Personnel"],
                  ["showPlaces", "Key Locations"],
                  ["showTechnology", "Technology"],
                  ["showGallery", "Recent Gallery"],
                  ["showQuickActions", "Quick Navigation"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 p-2 rounded-sm bg-background/50 border border-border cursor-pointer hover:bg-background transition-colors">
                    <input
                      type="checkbox"
                      checked={ccSettings[key]}
                      onChange={(e) => setCcSettings({ ...ccSettings, [key]: e.target.checked })}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-body text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mecha-line" />
            <CommandCenterSelectionPanel
              settings={ccSettings}
              onChange={(next) => setCcSettings(next)}
            />
          </div>

          {/* Sticky-feel save bar at bottom */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:items-center pt-2 border-t border-border/50">
            <button
              onClick={promptCreatePreset}
              disabled={ccSettingsSaving}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-display tracking-wider border border-primary/40 text-primary rounded-sm hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              <FilePlus className="h-3 w-3" /> SAVE AS NEW PRESET
            </button>
            <button
              onClick={saveGlobalCommandCenterSettings}
              disabled={ccSettingsSaving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Save className="h-3 w-3" /> {ccSettingsSaving ? "SAVING" : "SAVE TO ACTIVE"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editing && canAccess(activeTab, loreSub) && (
        <div ref={editFormRef} className="hud-border bg-card p-4 space-y-3 scroll-mt-4 sm:p-6 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm tracking-wider text-accent-orange uppercase">
              {isCreating ? "Create New" : "Edit"} {activeTab === "lore" ? loreSub.slice(0, -1) : activeTab.slice(0, -1)}
            </h3>
            <button onClick={() => { setEditing(null); setIsCreating(false); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <EditorSection
            title="Core Fields"
            description="Identity, media, status, and type-specific fields."
            defaultOpen
          >
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Title/Name */}
            <div>
              <label className={labelClass}>{editing.title !== undefined ? "Title" : "Name"}</label>
              <input type="text" value={editing.title ?? editing.name ?? ""} onChange={(e) => setEditing({ ...editing, [editing.title !== undefined ? "title" : "name"]: e.target.value })} className={inputClass} />
            </div>

            <FileUploadField
              label="Thumbnail"
              value={editing.thumbnail || ""}
              onChange={(url) => setEditing({ ...editing, thumbnail: url })}
              accept="image/*"
              folder={isProject ? "projects" : isGallery ? "gallery" : "lore"}
            />

            {!isGallery && editing.fullDesc !== undefined && (
              <FileUploadField
                label="Header Image"
                value={editing.headerImage || ""}
                onChange={(url) => setEditing({ ...editing, headerImage: url })}
                accept="image/*"
                folder={isProject ? "projects" : "lore"}
              />
            )}

            {/* Project-specific: Status */}
            {isProject && (
              <div>
                <label className={labelClass}>Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Project["status"] })} className={inputClass}>
                  <option>Planning</option>
                  <option>On Progress</option>
                  <option>On Hold</option>
                  <option>Completed</option>
                  <option>Canceled</option>
                </select>
              </div>
            )}

            {/* Character-specific fields */}
            {isCharacter && (
              <>
                <div>
                  <label className={labelClass}>Race</label>
                  <input type="text" value={editing.race || ""} onChange={(e) => setEditing({ ...editing, race: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Height</label>
                  <input type="text" value={editing.height || ""} onChange={(e) => setEditing({ ...editing, height: e.target.value })} className={inputClass} placeholder="e.g. 180 cm" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Occupation</label>
                  <input type="text" value={editing.occupation || ""} onChange={(e) => setEditing({ ...editing, occupation: e.target.value })} className={inputClass} placeholder="e.g. Chief Tactician - Field Division" />
                </div>
                <div>
                  <label className={labelClass}>Accent Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={editing.accentColor || "#4A90D9"} onChange={(e) => setEditing({ ...editing, accentColor: e.target.value })} className="h-10 w-16 border border-border rounded-sm cursor-pointer" />
                    <input type="text" value={editing.accentColor || "#4A90D9"} onChange={(e) => setEditing({ ...editing, accentColor: e.target.value })} className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Traits (comma-separated)</label>
                  <input type="text" value={(editing.traits || []).join(", ")} onChange={(e) => setEditing({ ...editing, traits: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} className={inputClass} placeholder="e.g. Brave, Loyal, Cunning" />
                </div>
                <div>
                  <label className={labelClass}>Likes (comma-separated)</label>
                  <input type="text" value={(editing.likes || []).join(", ")} onChange={(e) => setEditing({ ...editing, likes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Dislikes (comma-separated)</label>
                  <input
                    type="text"
                    value={(editing.dislikes || []).join(", ")}
                    onChange={(e) => setEditing({
                      ...editing,
                      dislikes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {/* Creature-specific fields */}
            {isCreature && (
              <>
                <div>
                  <label className={labelClass}>Classification (GEC Mark II)</label>
                  <select value={editing.classification || "Amorphous"} onChange={(e) => setEditing({ ...editing, classification: e.target.value as CreatureClassification })} className={inputClass}>
                    <option value="Amorphous">Amorphous - Stable / Passive</option>
                    <option value="Crystalline">Crystalline - Reactive / Predatory</option>
                    <option value="Metamorphic">Metamorphic - Adaptive / Hostile</option>
                    <option value="Catalyst">Catalyst - Symbiotic Asset</option>
                    <option value="Singularity">Singularity - Critical / Forbidden</option>
                    <option value="Zero-State">Zero-State - Decayed / Neutralized</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Danger Level (1-5)</label>
                  <select value={editing.dangerLevel ?? 1} onChange={(e) => setEditing({ ...editing, dangerLevel: Number(e.target.value) as CreatureDangerLevel })} className={inputClass}>
                    <option value={1}>DL-1 - Negligible</option>
                    <option value={2}>DL-2 - Cautionary</option>
                    <option value={3}>DL-3 - Hostile</option>
                    <option value={4}>DL-4 - Lethal</option>
                    <option value={5}>DL-5 - Existential</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Habitat</label>
                  <input type="text" value={editing.habitat || ""} onChange={(e) => setEditing({ ...editing, habitat: e.target.value })} className={inputClass} placeholder="e.g. Scorched Wastes - crystalline canyons" />
                </div>
                <div>
                  <label className={labelClass}>Accent Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={editing.accentColor || "#7DD3FC"} onChange={(e) => setEditing({ ...editing, accentColor: e.target.value })} className="h-10 w-16 border border-border rounded-sm cursor-pointer" />
                    <input type="text" value={editing.accentColor || "#7DD3FC"} onChange={(e) => setEditing({ ...editing, accentColor: e.target.value })} className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Traits (comma-separated)</label>
                  <input
                    type="text"
                    value={(editing.traits || []).join(", ")}
                    onChange={(e) => setEditing({ ...editing, traits: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    className={inputClass}
                    placeholder="e.g. Territorial, Pack-Hunting, Nocturnal"
                  />
                </div>
                <div>
                  <label className={labelClass}>Instincts (comma-separated)</label>
                  <input
                    type="text"
                    value={(editing.instincts || []).join(", ")}
                    onChange={(e) => setEditing({ ...editing, instincts: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    className={inputClass}
                    placeholder="e.g. Follows heat, Protects nest, Drawn to vibration"
                  />
                </div>
                <div>
                  <label className={labelClass}>Aversions (comma-separated)</label>
                  <input
                    type="text"
                    value={(editing.aversions || []).join(", ")}
                    onChange={(e) => setEditing({ ...editing, aversions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    className={inputClass}
                    placeholder="e.g. Bright magnesium light, Salt fog, High-frequency noise"
                  />
                </div>
              </>
            )}

            {/* Other lore: category */}
            {isOther && (
              <div>
                <label className={labelClass}>Category</label>
                <input type="text" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputClass} placeholder="e.g. World Systems, Cosmology" />
              </div>
            )}

            {isEvent && (
              <>
                <div>
                  <label className={labelClass}>Category</label>
                  <input type="text" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputClass} placeholder="e.g. Institute Milestone, Incident" />
                </div>
                <div>
                  <label className={labelClass}>Era</label>
                  <input type="text" value={editing.era || ""} onChange={(e) => setEditing({ ...editing, era: e.target.value })} className={inputClass} placeholder="e.g. Post Fracture Era" />
                </div>
                <div>
                  <label className={labelClass}>Date Label</label>
                  <input type="text" value={editing.dateLabel || ""} onChange={(e) => setEditing({ ...editing, dateLabel: e.target.value })} className={inputClass} placeholder="e.g. Cycle 04, 2026" />
                </div>
                <div>
                  <label className={labelClass}>Scope</label>
                  <input type="text" value={editing.scope || ""} onChange={(e) => setEditing({ ...editing, scope: e.target.value })} className={inputClass} placeholder="e.g. Institute-wide, Regional" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Impact Level</label>
                  <input type="text" value={editing.impactLevel || ""} onChange={(e) => setEditing({ ...editing, impactLevel: e.target.value })} className={inputClass} placeholder="e.g. High, Critical, Contained" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Consequences (comma-separated)</label>
                  <input
                    type="text"
                    value={(editing.consequences || []).join(", ")}
                    onChange={(e) => setEditing({
                      ...editing,
                      consequences: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                    })}
                    className={inputClass}
                    placeholder="e.g. Archive lockdown, Team redeployment"
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Related Links</label>
                    <button
                      type="button"
                      onClick={() => setEditing({
                        ...editing,
                        relatedLinks: [...(editing.relatedLinks || []), { label: "", url: "" }],
                      })}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Plus className="h-3 w-3" /> ADD LINK
                    </button>
                  </div>
                  {(editing.relatedLinks || []).length === 0 && (
                    <p className="text-[11px] font-body text-muted-foreground italic">No related links yet.</p>
                  )}
                  {(editing.relatedLinks || []).map((link, idx) => (
                    <div key={`event-link-${idx}`} className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border">
                      <div className="flex-1 grid gap-2 md:grid-cols-2">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => setEditing({
                            ...editing,
                            relatedLinks: (editing.relatedLinks || []).map((item, linkIdx) =>
                              linkIdx === idx ? { ...item, label: e.target.value } : item,
                            ),
                          })}
                          placeholder="Link label"
                          className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground"
                        />
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => setEditing({
                            ...editing,
                            relatedLinks: (editing.relatedLinks || []).map((item, linkIdx) =>
                              linkIdx === idx ? { ...item, url: e.target.value } : item,
                            ),
                          })}
                          placeholder="/lore/characters/char-001 or https://..."
                          className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditing({
                          ...editing,
                          relatedLinks: (editing.relatedLinks || []).filter((_, linkIdx) => linkIdx !== idx),
                        })}
                        className="text-muted-foreground hover:text-destructive mt-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isCharacter && editing.stats && (() => {
              const stats = normalizeCharacterStatsForEditor(editing.stats as Partial<Character["stats"]>);
              const overall = averageScore([
                stats.combat,
                stats.intelligence,
                stats.charisma,
                stats.stealth,
                stats.perception,
              ]);

              return (
                <div className="md:col-span-2 space-y-3 p-3 border border-border rounded-sm bg-muted/20">
                  <div className="flex items-center justify-between gap-3">
                    <label className={labelClass}>Stat Breakdown</label>
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">
                      Overall <span className="text-primary">{overall}</span>
                    </span>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {characterStatEditorGroups.map((group) => (
                      <StatEditorCard
                        key={group.key}
                        title={group.label}
                        score={stats[group.key as keyof Character["stats"]] as number}
                        fields={group.fields}
                        values={(stats.detail?.[group.key as keyof NonNullable<Character["stats"]["detail"]>] ?? {}) as Record<string, number>}
                        onChange={(fieldKey, value) => updateCharacterStatDetail(group.key, fieldKey, value)}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {isCreature && editing.stats && (() => {
              const stats = normalizeCreatureStatsForEditor(editing.stats as Partial<Creature["stats"]>);
              const overall = averageScore([
                stats.combat,
                stats.cognition,
                stats.predation,
                stats.senses,
                stats.ferocity,
              ]);

              return (
                <div className="md:col-span-2 space-y-3 p-3 border border-border rounded-sm bg-muted/20">
                  <div className="flex items-center justify-between gap-3">
                    <label className={labelClass}>Threat Breakdown</label>
                    <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">
                      Overall <span className="text-primary">{overall}</span>
                    </span>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {creatureStatEditorGroups.map((group) => (
                      <StatEditorCard
                        key={group.key}
                        title={group.label}
                        score={stats[group.key as keyof Creature["stats"]] as number}
                        fields={group.fields}
                        values={(stats.detail?.[group.key as keyof NonNullable<NonNullable<Creature["stats"]>["detail"]>] ?? {}) as Record<string, number>}
                        onChange={(fieldKey, value) => updateCreatureStatDetail(group.key, fieldKey, value)}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Place type */}
            {isPlace && (
              <div>
                <label className={labelClass}>Type</label>
                <input type="text" value={editing.type || ""} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className={inputClass} placeholder="e.g. City, Region, Ruins" />
              </div>
            )}

            {/* Tech category */}
            {isTech && (
              <div>
                <label className={labelClass}>Category</label>
                <input type="text" value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputClass} placeholder="e.g. Weapon, Tool, Anomaly" />
              </div>
            )}

            {/* Gallery fields */}
            {isGallery && (
              <>
                <div>
                  <label className={labelClass}>Type</label>
                  <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className={inputClass}>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                {editing.type === "video" && (
                  <div>
                    <label className={labelClass}>Video Embed URL</label>
                    <input type="text" value={editing.videoUrl || ""} onChange={(e) => setEditing({ ...editing, videoUrl: e.target.value })} className={inputClass} placeholder="https://www.youtube.com/embed/..." />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Date</label>
                  <div className="flex gap-2 mt-1">
                    <input type="date" value={editing.date || ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className={inputClass + " mt-0"} />
                    <button type="button" onClick={() => setEditing({ ...editing, date: todayStr() })} className="flex items-center gap-1 px-2 py-2 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0" title="Set to today">
                      <Calendar className="h-3 w-3" /> TODAY
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          </EditorSection>

          <EditorSection
            title={editing.caption !== undefined ? "Caption & Tags" : "Descriptions"}
            description="Primary text shown on list and detail views."
            defaultOpen
          >
            <div className="space-y-4">
              {/* Short Description / Caption */}
              <div>
                <label className={labelClass}>{editing.caption !== undefined ? "Caption" : "Short Description"}</label>
                <input type="text" value={editing.shortDesc ?? editing.caption ?? ""} onChange={(e) => setEditing({ ...editing, [editing.caption !== undefined ? "caption" : "shortDesc"]: e.target.value })} className={inputClass} />
              </div>

              {/* Full Description */}
              {editing.fullDesc !== undefined && (
                <div className="space-y-2">
                  <label className={labelClass}>Full Description</label>
                  <RestrictedMarkerTool
                    textareaRef={fullDescRef}
                    value={editing.fullDesc || ""}
                    onChange={(next) => setEditing({ ...editing, fullDesc: next })}
                  />
                  <textarea ref={fullDescRef} value={editing.fullDesc || ""} onChange={(e) => setEditing({ ...editing, fullDesc: e.target.value })} rows={5} className={inputClass + " resize-y min-h-[120px]"} />
                </div>
              )}

              {/* Tags (gallery) */}
              {isGallery && (
                <div>
                  <label className={labelClass}>Tags (comma-separated)</label>
                  <input type="text" value={(editing.tags || []).join(", ")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) })} className={inputClass} />
                </div>
              )}
            </div>
          </EditorSection>

          {/* Documentation Section */}
          {hasDocs && (
            <EditorSection
              title="Documentation"
              description="Images, videos, files, and captions attached to this content."
              badge={`${(editing.docs || []).length} item${(editing.docs || []).length === 1 ? "" : "s"}`}
            >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Documentation (Images/Videos/Files)</label>
                <button type="button" onClick={addDoc} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Plus className="h-3 w-3" /> ADD DOC
                </button>
              </div>
              {(editing.docs || []).map((doc: DocItem & { _key?: string }, idx: number) => {
                const key = doc._key ?? `doc-${idx}`;
                return (
                <div
                  key={key}
                  ref={newItemRef(key)}
                  className="space-y-3 rounded-sm border border-border bg-muted/50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <select value={doc.type} onChange={(e) => updateDoc(idx, "type", e.target.value)} className="h-8 rounded-sm border border-border bg-background px-2 py-1 text-xs font-body text-foreground">
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="file">File</option>
                      </select>
                      <p className="truncate text-[10px] font-display tracking-wider text-muted-foreground">
                        Documentation item {idx + 1}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDoc(idx)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                      aria-label={`Remove documentation item ${idx + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <FileUploadField
                      label=""
                      value={doc.url}
                      onChange={(url) => updateDoc(idx, "url", url)}
                      accept={doc.type === "video" ? "video/*" : doc.type === "image" ? "image/*" : "*/*"}
                      attachmentType={doc.type}
                      folder={isProject ? "projects" : isGallery ? "gallery" : "lore"}
                    />
                    <input type="text" value={doc.caption} onChange={(e) => updateDoc(idx, "caption", e.target.value)} placeholder="Caption" className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                  </div>
                </div>
                );
              })}
            </div>
            </EditorSection>
          )}

          {activeTab === "lore" && (
            <EditorSection
              title="Field Records"
              description="Internal notes and observations displayed on lore detail pages."
              badge={`${(editing.fieldNotes || []).length + (editing.observations || []).length} item${(editing.fieldNotes || []).length + (editing.observations || []).length === 1 ? "" : "s"}`}
            >
            <div className="grid gap-4 lg:grid-cols-2">
              <FieldEntryEditor
                label="Field Notes"
                items={editing.fieldNotes || []}
                onAdd={() => addFieldEntry("fieldNotes")}
                onUpdate={(idx, key, value) => updateFieldEntry("fieldNotes", idx, key, value)}
                onRemove={(idx) => removeFieldEntry("fieldNotes", idx)}
                itemRef={newItemRef}
              />
              <FieldEntryEditor
                label="Observations"
                items={editing.observations || []}
                onAdd={() => addFieldEntry("observations")}
                onUpdate={(idx, key, value) => updateFieldEntry("observations", idx, key, value)}
                onRemove={(idx) => removeFieldEntry("observations", idx)}
                itemRef={newItemRef}
              />
            </div>
            </EditorSection>
          )}

          {/* Skills (living entities: characters, creatures) */}
          {(isCharacter || isCreature) && (
            <EditorSection
              title="Skills"
              description="Combat, support, utility skills, attribute tags, icons, and restrictions."
              badge={`${(editing.skills || []).length} item${(editing.skills || []).length === 1 ? "" : "s"}`}
            >
            <SkillFeatureEditor
              variant="skill"
              items={editing.skills ?? []}
              onChange={(skills) => setEditing({ ...editing, skills: skills as Skill[] })}
            />
            </EditorSection>
          )}

          {/* Features (non-living entities: places, tech, other, projects) */}
          {(isPlace || isTech || isEvent || isOther || isProject) && (
            <EditorSection
              title="Features"
              description="Reusable feature cards, summaries, tags, icons, and restrictions."
              badge={`${(editing.features || []).length} item${(editing.features || []).length === 1 ? "" : "s"}`}
            >
            <SkillFeatureEditor
              variant="feature"
              items={editing.features ?? []}
              onChange={(features) => setEditing({ ...editing, features: features as Feature[] })}
            />
            </EditorSection>
          )}


          {/* Contributions (characters) */}
          {isCharacter && (
            <EditorSection
              title="Contributions"
              description="Notable achievements, missions, and historical works."
              badge={`${(editing.contributions || []).length} item${(editing.contributions || []).length === 1 ? "" : "s"}`}
            >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Contributions</label>
                <button type="button" onClick={addContribution} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Plus className="h-3 w-3" /> ADD CONTRIBUTION
                </button>
              </div>
              {(editing.contributions || []).length === 0 && (
                <p className="text-[11px] font-body text-muted-foreground italic">No contributions yet. Use ADD CONTRIBUTION to log notable achievements, missions, or works.</p>
              )}
              {(editing.contributions || []).map((ctr, idx) => (
                <div key={ctr.id} ref={newItemRef(ctr.id)} className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <input type="text" value={ctr.title} onChange={(e) => updateContribution(idx, "title", e.target.value)} placeholder="Title (e.g. Operation Blacklight)" className="flex-1 min-w-[180px] px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                      <input type="date" value={ctr.date || ""} onChange={(e) => updateContribution(idx, "date", e.target.value)} className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                      <button type="button" onClick={() => updateContribution(idx, "date", todayStr())} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors" title="Set to today">
                        <Calendar className="h-3 w-3" /> TODAY
                      </button>
                    </div>
                    <textarea value={ctr.description} onChange={(e) => updateContribution(idx, "description", e.target.value)} placeholder="Describe the contribution..." rows={2} className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground resize-y min-h-[60px]" />
                  </div>
                  <button type="button" onClick={() => removeContribution(idx)} className="text-muted-foreground hover:text-destructive mt-1"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            </EditorSection>
          )}

          {/* Patch Notes (projects) */}
          {isProject && (
            <EditorSection
              title="Patch Notes"
              description="Project version history and release notes."
              badge={`${(editing.patches || []).length} item${(editing.patches || []).length === 1 ? "" : "s"}`}
            >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Patch Notes</label>
                <button type="button" onClick={addPatch} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Plus className="h-3 w-3" /> ADD PATCH
                </button>
              </div>
              {(editing.patches || []).map((patch: ProjectPatch & { _key?: string }, idx: number) => {
                const key = patch._key ?? `patch-${idx}-${patch.version}`;
                return (
                <div key={key} ref={newItemRef(key)} className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <input type="text" value={patch.version} onChange={(e) => updatePatch(idx, "version", e.target.value)} placeholder="0.1" className="w-24 px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                      <input type="date" value={patch.date} onChange={(e) => updatePatch(idx, "date", e.target.value)} className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                      <button type="button" onClick={() => updatePatch(idx, "date", todayStr())} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors" title="Set to today">
                        <Calendar className="h-3 w-3" /> TODAY
                      </button>
                    </div>
                    <input type="text" value={patch.notes} onChange={(e) => updatePatch(idx, "notes", e.target.value)} placeholder="Patch notes..." className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                  </div>
                  <button type="button" onClick={() => removePatch(idx)} className="text-muted-foreground hover:text-destructive mt-1"><X className="h-3.5 w-3.5" /></button>
                </div>
                );
              })}
            </div>
            </EditorSection>
          )}

          {/* Metadata editor (production credits) - for projects + lore. */}
          {!isGallery && (
            <EditorSection
              title="Metadata"
              description="Production credits and metadata surfaced on detail pages."
            >
            <MetadataEditor
              value={editing.meta}
              onChange={(next) => setEditing({ ...editing, meta: next })}
            />
            </EditorSection>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(null); setIsCreating(false); }} disabled={contentSaving} className="px-4 py-2 text-xs font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors disabled:cursor-wait disabled:opacity-60">CANCEL</button>
            <button
              type="button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                void handleSave();
              }}
              disabled={contentSaving}
              className="flex items-center gap-1 px-4 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:cursor-wait disabled:opacity-60"
            >
              {contentSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {contentSaving ? "SAVING..." : "SAVE"}
            </button>
          </div>
        </div>
      )}

      {/* Map management */}
      {isMap && canAccess("map") && (
        <div className="hud-border bg-card p-4 md:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-accent-orange" />
            <h3 className="font-heading text-sm tracking-wider text-accent-orange uppercase">Interactive Map</h3>
          </div>
          <div className="mecha-line" />

          <FileUploadField
            label="Map Background Image (optional)"
            value={mapImageUrl}
            onChange={(url) => {
              setMapImageUrl(url);
              setMapImageSaving(true);
              void setMapImageRemote(url)
                .then(() => {
                  toast({ title: "Map image updated" });
                })
                .catch((error) => {
                  toast({
                    title: "Map image update failed",
                    description: error instanceof Error ? error.message : "Backend rejected the map image update.",
                    variant: "destructive",
                  });
                })
                .finally(() => {
                  setMapImageSaving(false);
                  window.dispatchEvent(new CustomEvent("morneven:map-changed"));
                });
            }}
            accept="image/*"
            folder="map"
          />
          {mapImageSaving && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground font-body">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving map image...
            </p>
          )}

          <div className="flex items-center justify-between">
            <p className={labelClass}>Markers ({mapMarkers.length})</p>
            <button
              onClick={() => {
                const next = [...mapMarkers, { id: `mk-${Date.now()}`, name: "New Marker", status: "safe" as MapZoneStatus, x: 0.5, y: 0.5, description: "", loreLink: "" }];
                setMapMarkers(next);
                void persistMapMarkers(next, "Map marker added");
              }}
              disabled={mapSaving}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors disabled:cursor-wait disabled:opacity-60"
            >
              {mapSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              ADD MARKER
            </button>
          </div>

          <div className="space-y-3">
            {mapMarkers.map((m, idx) => (
              <div key={m.id} className="p-3 bg-muted/50 rounded-sm border border-border space-y-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <input type="text" value={m.name} onChange={(e) => { const next = [...mapMarkers]; next[idx] = { ...m, name: e.target.value }; setMapMarkers(next); }} placeholder="Marker name" className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                  <select value={m.status} onChange={(e) => { const next = [...mapMarkers]; next[idx] = { ...m, status: e.target.value as MapZoneStatus }; setMapMarkers(next); }} className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground">
                    <option value="safe">Safe</option>
                    <option value="caution">Caution</option>
                    <option value="danger">Danger</option>
                    <option value="restricted">Restricted</option>
                    <option value="mission">Mission</option>
                  </select>
                  <label className="flex items-center gap-2 text-[10px] text-muted-foreground">X (0-1):
                    <input type="number" min={0} max={1} step={0.01} value={m.x} onChange={(e) => { const next = [...mapMarkers]; next[idx] = { ...m, x: Number(e.target.value) }; setMapMarkers(next); }} className="flex-1 px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                  </label>
                  <label className="flex items-center gap-2 text-[10px] text-muted-foreground">Y (0-1):
                    <input type="number" min={0} max={1} step={0.01} value={m.y} onChange={(e) => { const next = [...mapMarkers]; next[idx] = { ...m, y: Number(e.target.value) }; setMapMarkers(next); }} className="flex-1 px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                  </label>
                </div>
                <input type="text" value={m.description} onChange={(e) => { const next = [...mapMarkers]; next[idx] = { ...m, description: e.target.value }; setMapMarkers(next); }} placeholder="Description" className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                <input type="text" value={m.loreLink || ""} onChange={(e) => { const next = [...mapMarkers]; next[idx] = { ...m, loreLink: e.target.value }; setMapMarkers(next); }} placeholder="Lore link (e.g. /lore/places/place-001)" className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                <div className="flex justify-end">
                  <button onClick={() => { const next = mapMarkers.filter((_, i) => i !== idx); setMapMarkers(next); void persistMapMarkers(next, "Map marker removed"); }} disabled={mapSaving} className="text-muted-foreground hover:text-destructive disabled:cursor-wait disabled:opacity-60">
                    {mapSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={() => { void persistMapMarkers(mapMarkers); }} disabled={mapSaving} className="flex items-center gap-1 px-4 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity disabled:cursor-wait disabled:opacity-60">
              {mapSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {mapSaving ? "SAVING..." : "SAVE MARKERS"}
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      {activeTab !== "homepage" && activeTab !== "map" && activeTab !== "news" && canAccess(activeTab, loreSub) && (
        <div className="space-y-2">
          {getItems().length === 0 && !dashboardLoading && (
            <p className="text-sm text-muted-foreground font-body italic">No items found.</p>
          )}
          {getItems().map((item) => {
            // For Gallery, gate edit/delete by per-item ownership.
            const canModify =
              activeTab !== "gallery" || canModifyGalleryItem(item as GalleryItem);
            return (
            <div key={item.id} className="hud-border-sm bg-card p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-sm text-foreground truncate">{getItemTitle(item)}</h3>
                <p className="text-xs text-muted-foreground font-body truncate">{getItemDesc(item)}</p>
                {"status" in item && typeof (item as Project).status === "string" && <span className="text-[10px] font-display tracking-wider text-accent-orange uppercase">{(item as Project).status}</span>}
                {"classification" in item && <span className="text-[10px] font-display tracking-wider text-accent-orange uppercase">{(item as Creature).classification} • DL-{(item as Creature).dangerLevel}</span>}
                {"accentColor" in item && <span className="inline-block w-3 h-3 rounded-full ml-2 align-middle" style={{ backgroundColor: (item as { accentColor: string }).accentColor }} />}
                {activeTab === "gallery" && (item as GalleryItem).uploadedBy && (
                  <span className="ml-2 text-[10px] font-display tracking-wider text-muted-foreground uppercase">
                    · by {(item as GalleryItem).uploadedBy}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {canModify ? (
                  <>
                    <button onClick={() => beginEdit(item)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id, getItemTitle(item))} disabled={deletingId === item.id} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:cursor-wait disabled:opacity-60">
                      {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </>
                ) : (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <span className="text-[10px] font-display tracking-wider text-muted-foreground uppercase opacity-60 cursor-not-allowed">
                        Locked
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="font-heading text-[10px] tracking-wider uppercase">
                      You can only modify gallery items you uploaded
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            );
          })}
          {dashboardLoading && (
            <p className="text-sm text-muted-foreground font-body italic py-2">Loading items...</p>
          )}
          {dashboardPageInfo?.hasNextPage && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-[11px] font-display tracking-wider text-muted-foreground uppercase">
                Showing {getItems().length} of {dashboardPageInfo.total}
              </p>
              <button
                type="button"
                onClick={() => loadDashboardItems(false)}
                disabled={dashboardLoading}
                className="px-4 py-2 text-xs font-display tracking-wider border border-primary text-primary rounded-sm hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary transition-colors"
              >
                LOAD MORE
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
