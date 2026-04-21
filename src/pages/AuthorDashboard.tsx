import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getProjects, createProject, updateProject, deleteProject, getCharacters, createCharacter, updateCharacter, deleteCharacter, getPlaces, createPlace, updatePlace, deletePlace, getTechnology, createTech, updateTech, deleteTech, getGallery, createGalleryItem, updateGalleryItem, deleteGalleryItem, getCreatures, createCreature, updateCreature, deleteCreature, getOthers, createOther, updateOther, deleteOther, getMapMarkers, saveMapMarkers, getMapImage, setMapImage } from "@/services/api";
import { getCommandCenterSettings, saveCommandCenterSettings, defaultSettings, type CommandCenterSettings } from "@/services/commandCenterSettings";
import type { Project, Character, CharacterContribution, Place, Technology, GalleryItem, DocItem, ProjectPatch, Creature, OtherLore, MapMarker, MapZoneStatus, CreatureClassification, CreatureDangerLevel } from "@/types";
import { Pencil, Trash2, Plus, X, Save, Upload, Link as LinkIcon, Image, Video, Calendar, LayoutDashboard, RotateCcw, Map as MapIcon } from "lucide-react";
import RestrictedMarkerTool from "@/components/RestrictedMarkerTool";
import { canAccessAuthorPanel, canEnterAuthorPanel } from "@/lib/pl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const dashTabs = ["projects", "lore", "gallery", "homepage", "map"] as const;
const loreSubs = ["characters", "places", "technology", "creatures", "other"] as const;
const inputClass = "w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "font-heading text-xs tracking-wider text-muted-foreground uppercase";

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
type DashboardItem = Project | Character | Place | Technology | GalleryItem | Creature | OtherLore;
type EditableState = {
  id?: string;
  title?: string;
  name?: string;
  status?: Project["status"];
  thumbnail?: string;
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
  stats?: Character["stats"];
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
  // Character
  contributions?: CharacterContribution[];
};

const isDashboardTab = (value: string | null): value is DashboardTab => {
  if (!value) return false;
  return dashTabs.includes(value as DashboardTab);
};

type AttachmentMode = "url" | "image" | "video";

function FileUploadField({ label, value, onChange, accept = "image/*,video/*" }: { label: string; value: string; onChange: (url: string) => void; accept?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<AttachmentMode>(value ? "url" : "image");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    onChange(objectUrl);
  };

  return (
    <div className="space-y-2">
      <label className={labelClass}>{label}</label>
      <div className="flex gap-1 mt-1">
        <button type="button" onClick={() => setMode("image")}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider rounded-sm border transition-colors ${mode === "image" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
          <Image className="h-3 w-3" /> Image
        </button>
        <button type="button" onClick={() => setMode("video")}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider rounded-sm border transition-colors ${mode === "video" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
          <Video className="h-3 w-3" /> Video
        </button>
        <button type="button" onClick={() => setMode("url")}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider rounded-sm border transition-colors ${mode === "url" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
          <LinkIcon className="h-3 w-3" /> URL
        </button>
      </div>
      {mode === "url" ? (
        <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="https://..." />
      ) : (
        <div className="flex gap-2 items-center">
          <input ref={fileRef} type="file" accept={mode === "image" ? "image/*" : "video/*"} onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-display tracking-wider border border-dashed border-primary/40 rounded-sm text-primary hover:bg-primary/10 transition-colors">
            <Upload className="h-3.5 w-3.5" /> Choose {mode === "image" ? "Image" : "Video"}
          </button>
          {value && (
            <span className="text-xs text-muted-foreground font-body truncate max-w-[200px]">
              {value.startsWith("blob:") ? "File selected ✓" : value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuthorDashboard() {
  const { role, personnelLevel, track } = useAuth();
  const [params] = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    const tab = params.get("tab");
    return isDashboardTab(tab) ? tab : "projects";
  });
  const [loreSub, setLoreSub] = useState<LoreSub>("characters");

  // Per-section access predicate (PL + track aware).
  const canAccess = (section: DashboardTab, sub?: LoreSub) =>
    role === "author" ||
    canAccessAuthorPanel({ level: personnelLevel, track, section, loreSub: sub });

  const tabAllowed = (t: DashboardTab) => {
    if (role === "author") return true;
    if (t === "lore") {
      // Allow if any sub-section is reachable.
      return loreSubs.some((s) => canAccessAuthorPanel({ level: personnelLevel, track, section: "lore", loreSub: s }));
    }
    return canAccessAuthorPanel({ level: personnelLevel, track, section: t });
  };

  const subAllowed = (s: LoreSub) =>
    role === "author" ||
    canAccessAuthorPanel({ level: personnelLevel, track, section: "lore", loreSub: s });

  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tech, setTech] = useState<Technology[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [others, setOthers] = useState<OtherLore[]>([]);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [mapImageUrl, setMapImageUrl] = useState<string>("");

  const [editing, setEditing] = useState<EditableState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [ccSettings, setCcSettings] = useState<CommandCenterSettings>(() => getCommandCenterSettings());
  const fullDescRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const tab = params.get("tab");
    if (isDashboardTab(tab)) {
      setActiveTab(tab);
      return;
    }

    setActiveTab("projects");
  }, [params]);

  const loadAll = async () => {
    setProjects(await getProjects());
    setCharacters(await getCharacters());
    setPlaces(await getPlaces());
    setTech(await getTechnology());
    setGallery(await getGallery());
    setCreatures(await getCreatures());
    setOthers(await getOthers());
    setMapMarkers(await getMapMarkers());
    setMapImageUrl(getMapImage());
  };

  if (role !== "author") {
    return (
      <div className="p-6 md:p-8 space-y-4">
        <h1 className="font-display text-2xl tracking-[0.1em] text-primary">AUTHOR PANEL</h1>
        <div className="mecha-line w-32" />
        <div className="hud-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground font-body">Access restricted. Login with an author account to manage content.</p>
          <p className="text-xs text-muted-foreground font-body mt-2 italic">Hint: Author access is available only for approved accounts (author@morneven.org or admin@morneven.org).</p>
        </div>
      </div>
    );
  }

  const startCreate = () => {
    setIsCreating(true);
    if (activeTab === "projects") {
      setEditing({ title: "", status: "Planning", thumbnail: "", shortDesc: "", fullDesc: "", patches: [], docs: [] });
    } else if (activeTab === "lore") {
      if (loreSub === "characters") {
        setEditing({ name: "", race: "", occupation: "", height: "", traits: [], likes: [], dislikes: [], accentColor: "#4A90D9", thumbnail: "", shortDesc: "", fullDesc: "", stats: { combat: 50, intelligence: 50, stealth: 50, charisma: 50, endurance: 50 }, docs: [], contributions: [] });
      } else if (loreSub === "places") {
        setEditing({ name: "", type: "", thumbnail: "", shortDesc: "", fullDesc: "", docs: [] });
      } else if (loreSub === "technology") {
        setEditing({ name: "", category: "", thumbnail: "", shortDesc: "", fullDesc: "", docs: [] });
      } else if (loreSub === "creatures") {
        setEditing({ name: "", classification: "Amorphous", dangerLevel: 1, habitat: "", accentColor: "#7DD3FC", thumbnail: "", shortDesc: "", fullDesc: "", docs: [] });
      } else {
        setEditing({ title: "", category: "World Systems", thumbnail: "", shortDesc: "", fullDesc: "", docs: [] });
      }
    } else {
      setEditing({ type: "image", title: "", thumbnail: "", videoUrl: "", caption: "", tags: [], date: new Date().toISOString().split("T")[0], comments: [] });
    }
  };

  const handleSave = async () => {
    if (!editing) return;

    if (activeTab === "projects") {
      const payload: Omit<Project, "id"> = {
        title: editing.title ?? "",
        status: (editing.status as Project["status"]) ?? "Planning",
        thumbnail: editing.thumbnail ?? "",
        shortDesc: editing.shortDesc ?? "",
        fullDesc: editing.fullDesc ?? "",
        patches: editing.patches ?? [],
        docs: editing.docs ?? [],
      };

      if (isCreating) await createProject(payload);
      else if (editing.id) await updateProject(editing.id, payload);
      setProjects(await getProjects());
    } else if (activeTab === "lore") {
      if (loreSub === "characters") {
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
          shortDesc: editing.shortDesc ?? "",
          fullDesc: editing.fullDesc ?? "",
          stats: editing.stats ?? { combat: 50, intelligence: 50, stealth: 50, charisma: 50, endurance: 50 },
          docs: editing.docs ?? [],
          contributions: editing.contributions ?? [],
        };

        if (isCreating) await createCharacter(payload);
        else if (editing.id) await updateCharacter(editing.id, payload);
        setCharacters(await getCharacters());
      } else if (loreSub === "places") {
        const payload: Omit<Place, "id"> = {
          name: editing.name ?? "",
          type: editing.type ?? "",
          thumbnail: editing.thumbnail ?? "",
          shortDesc: editing.shortDesc ?? "",
          fullDesc: editing.fullDesc ?? "",
          docs: editing.docs ?? [],
        };

        if (isCreating) await createPlace(payload);
        else if (editing.id) await updatePlace(editing.id, payload);
        setPlaces(await getPlaces());
      } else if (loreSub === "technology") {
        const payload: Omit<Technology, "id"> = {
          name: editing.name ?? "",
          category: editing.category ?? "",
          thumbnail: editing.thumbnail ?? "",
          shortDesc: editing.shortDesc ?? "",
          fullDesc: editing.fullDesc ?? "",
          docs: editing.docs ?? [],
        };

        if (isCreating) await createTech(payload);
        else if (editing.id) await updateTech(editing.id, payload);
        setTech(await getTechnology());
      } else if (loreSub === "creatures") {
        const payload: Omit<Creature, "id"> = {
          name: editing.name ?? "",
          classification: (editing.classification as CreatureClassification) ?? "Amorphous",
          dangerLevel: (editing.dangerLevel as CreatureDangerLevel) ?? 1,
          habitat: editing.habitat ?? "",
          accentColor: editing.accentColor ?? "#7DD3FC",
          thumbnail: editing.thumbnail ?? "",
          shortDesc: editing.shortDesc ?? "",
          fullDesc: editing.fullDesc ?? "",
          docs: editing.docs ?? [],
        };

        if (isCreating) await createCreature(payload);
        else if (editing.id) await updateCreature(editing.id, payload);
        setCreatures(await getCreatures());
      } else {
        const payload: Omit<OtherLore, "id"> = {
          title: editing.title ?? "",
          category: editing.category ?? "World Systems",
          thumbnail: editing.thumbnail ?? "",
          shortDesc: editing.shortDesc ?? "",
          fullDesc: editing.fullDesc ?? "",
          docs: editing.docs ?? [],
        };

        if (isCreating) await createOther(payload);
        else if (editing.id) await updateOther(editing.id, payload);
        setOthers(await getOthers());
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
      };

      if (isCreating) await createGalleryItem(payload);
      else if (editing.id) await updateGalleryItem(editing.id, payload);
      setGallery(await getGallery());
    }
    setEditing(null);
    setIsCreating(false);
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(`Delete ${title}? This action cannot be undone.`);
    if (!confirmed) return;

    if (activeTab === "projects") { await deleteProject(id); setProjects(await getProjects()); }
    else if (activeTab === "lore") {
      if (loreSub === "characters") { await deleteCharacter(id); setCharacters(await getCharacters()); }
      else if (loreSub === "places") { await deletePlace(id); setPlaces(await getPlaces()); }
      else if (loreSub === "technology") { await deleteTech(id); setTech(await getTechnology()); }
      else if (loreSub === "creatures") { await deleteCreature(id); setCreatures(await getCreatures()); }
      else { await deleteOther(id); setOthers(await getOthers()); }
    } else if (activeTab === "gallery") { await deleteGalleryItem(id); setGallery(await getGallery()); }
  };

  const getItems = (): DashboardItem[] => {
    if (activeTab === "projects") return projects;
    if (activeTab === "lore") {
      if (loreSub === "characters") return characters;
      if (loreSub === "places") return places;
      if (loreSub === "technology") return tech;
      if (loreSub === "creatures") return creatures;
      return others;
    }
    if (activeTab === "gallery") return gallery;
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
    const docs = [...(editing.docs || []), { type: "image" as const, url: "", caption: "" }];
    setEditing({ ...editing, docs });
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
    const contributions: CharacterContribution[] = [
      { id: `ctr-${Date.now()}`, title: "", description: "", date: todayStr() },
      ...(editing.contributions || []),
    ];
    setEditing({ ...editing, contributions });
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

  // Patch management for projects:
  // - new patches are inserted at the TOP of the list
  // - version auto-increments from the HIGHEST existing version
  const addPatch = () => {
    const existing = editing?.patches || [];
    const highest = highestVersion(existing.map((p) => p.version).filter(Boolean));
    const version = nextPatchVersion(highest);
    const patches = [{ version, date: todayStr(), notes: "" }, ...existing];
    setEditing({ ...editing, patches });
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

  const isCharacter = activeTab === "lore" && loreSub === "characters";
  const isPlace = activeTab === "lore" && loreSub === "places";
  const isTech = activeTab === "lore" && loreSub === "technology";
  const isCreature = activeTab === "lore" && loreSub === "creatures";
  const isOther = activeTab === "lore" && loreSub === "other";
  const isProject = activeTab === "projects";
  const isGallery = activeTab === "gallery";
  const isMap = activeTab === "map";
  const hasDocs = isProject || isCharacter || isPlace || isTech || isCreature || isOther;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">AUTHOR PANEL</h1>
      <div className="mecha-line w-32" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {dashTabs.map((t) => (
          <button key={t} onClick={() => { setActiveTab(t); setEditing(null); setIsCreating(false); }}
            className={`px-3 md:px-4 py-1.5 text-xs font-display tracking-[0.1em] uppercase border rounded-sm transition-colors ${activeTab === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {t === "homepage" ? "Command Center" : t}
          </button>
        ))}
      </div>

      {activeTab === "lore" && (
        <div className="flex flex-wrap gap-2">
          {loreSubs.map((s) => (
            <button key={s} onClick={() => { setLoreSub(s); setEditing(null); setIsCreating(false); }}
              className={`px-3 py-1 text-[10px] font-display tracking-[0.1em] uppercase border rounded-sm transition-colors ${loreSub === s ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {activeTab !== "homepage" && activeTab !== "map" && (
        <div className="flex justify-end">
          <button onClick={startCreate} className="flex items-center gap-1 px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground bg-primary rounded-sm hover:opacity-90 transition-opacity">
            <Plus className="h-3 w-3" /> CREATE NEW
          </button>
        </div>
      )}

      {/* Command Center settings panel */}
      {activeTab === "homepage" && (
        <div className="hud-border bg-card p-4 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-heading text-sm tracking-wider text-accent-orange uppercase flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> Command Center Settings
            </h3>
            <button
              onClick={() => { setCcSettings({ ...defaultSettings }); saveCommandCenterSettings({ ...defaultSettings }); }}
              className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> RESET DEFAULTS
            </button>
          </div>
          <div className="mecha-line" />

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

          <div className="flex justify-end">
            <button
              onClick={() => { saveCommandCenterSettings(ccSettings); }}
              className="flex items-center gap-1 px-4 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity"
            >
              <Save className="h-3 w-3" /> SAVE SETTINGS
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editing && (
        <div className="hud-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm tracking-wider text-accent-orange uppercase">
              {isCreating ? "Create New" : "Edit"} {activeTab === "lore" ? loreSub.slice(0, -1) : activeTab.slice(0, -1)}
            </h3>
            <button onClick={() => { setEditing(null); setIsCreating(false); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Title/Name */}
            <div>
              <label className={labelClass}>{editing.title !== undefined ? "Title" : "Name"}</label>
              <input type="text" value={editing.title ?? editing.name ?? ""} onChange={(e) => setEditing({ ...editing, [editing.title !== undefined ? "title" : "name"]: e.target.value })} className={inputClass} />
            </div>

            <FileUploadField label="Thumbnail" value={editing.thumbnail || ""} onChange={(url) => setEditing({ ...editing, thumbnail: url })} accept="image/*" />

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
                  <input type="text" value={editing.occupation || ""} onChange={(e) => setEditing({ ...editing, occupation: e.target.value })} className={inputClass} placeholder="e.g. Chief Tactician — Field Division" />
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
                    <option value="Amorphous">Amorphous — Stable / Passive</option>
                    <option value="Crystalline">Crystalline — Reactive / Predatory</option>
                    <option value="Metamorphic">Metamorphic — Adaptive / Hostile</option>
                    <option value="Catalyst">Catalyst — Symbiotic Asset</option>
                    <option value="Singularity">Singularity — Critical / Forbidden</option>
                    <option value="Zero-State">Zero-State — Decayed / Neutralized</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Danger Level (1-5)</label>
                  <select value={editing.dangerLevel ?? 1} onChange={(e) => setEditing({ ...editing, dangerLevel: Number(e.target.value) as CreatureDangerLevel })} className={inputClass}>
                    <option value={1}>DL-1 — Negligible</option>
                    <option value={2}>DL-2 — Cautionary</option>
                    <option value={3}>DL-3 — Hostile</option>
                    <option value={4}>DL-4 — Lethal</option>
                    <option value={5}>DL-5 — Existential</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Habitat</label>
                  <input type="text" value={editing.habitat || ""} onChange={(e) => setEditing({ ...editing, habitat: e.target.value })} className={inputClass} placeholder="e.g. Scorched Wastes — crystalline canyons" />
                </div>
                <div>
                  <label className={labelClass}>Accent Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={editing.accentColor || "#7DD3FC"} onChange={(e) => setEditing({ ...editing, accentColor: e.target.value })} className="h-10 w-16 border border-border rounded-sm cursor-pointer" />
                    <input type="text" value={editing.accentColor || "#7DD3FC"} onChange={(e) => setEditing({ ...editing, accentColor: e.target.value })} className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
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

            {isCharacter && editing.stats && (
              <>
                {Object.keys(editing.stats).map((stat) => (
                  <div key={stat}>
                    <label className={labelClass}>{stat} ({editing.stats[stat]})</label>
                    <input type="range" min="0" max="100" value={editing.stats[stat]} onChange={(e) => setEditing({ ...editing, stats: { ...editing.stats, [stat]: Number(e.target.value) } })} className="w-full mt-1 accent-primary" />
                  </div>
                ))}
              </>
            )}

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

          {/* Documentation Section */}
          {hasDocs && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Documentation (Images/Videos)</label>
                <button onClick={addDoc} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Plus className="h-3 w-3" /> ADD DOC
                </button>
              </div>
              {(editing.docs || []).map((doc: DocItem, idx: number) => (
                <div key={idx} className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 items-center">
                      <select value={doc.type} onChange={(e) => updateDoc(idx, "type", e.target.value)} className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground">
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <FileUploadField label="" value={doc.url} onChange={(url) => updateDoc(idx, "url", url)} accept={doc.type === "video" ? "video/*" : "image/*"} />
                    <input type="text" value={doc.caption} onChange={(e) => updateDoc(idx, "caption", e.target.value)} placeholder="Caption" className="w-full px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                  </div>
                  <button onClick={() => removeDoc(idx)} className="text-muted-foreground hover:text-destructive mt-1"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Contributions (characters) */}
          {isCharacter && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Contributions</label>
                <button onClick={addContribution} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Plus className="h-3 w-3" /> ADD CONTRIBUTION
                </button>
              </div>
              {(editing.contributions || []).length === 0 && (
                <p className="text-[11px] font-body text-muted-foreground italic">No contributions yet. Use ADD CONTRIBUTION to log notable achievements, missions, or works.</p>
              )}
              {(editing.contributions || []).map((ctr, idx) => (
                <div key={ctr.id} className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border">
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
                  <button onClick={() => removeContribution(idx)} className="text-muted-foreground hover:text-destructive mt-1"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Patch Notes (projects) */}
          {isProject && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Patch Notes</label>
                <button onClick={addPatch} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Plus className="h-3 w-3" /> ADD PATCH
                </button>
              </div>
              {(editing.patches || []).map((patch: ProjectPatch, idx: number) => (
                <div key={idx} className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border">
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
                  <button onClick={() => removePatch(idx)} className="text-muted-foreground hover:text-destructive mt-1"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditing(null); setIsCreating(false); }} className="px-4 py-2 text-xs font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors">CANCEL</button>
            <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity">
              <Save className="h-3 w-3" /> SAVE
            </button>
          </div>
        </div>
      )}

      {/* Map management */}
      {isMap && (
        <div className="hud-border bg-card p-4 md:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-accent-orange" />
            <h3 className="font-heading text-sm tracking-wider text-accent-orange uppercase">Interactive Map</h3>
          </div>
          <div className="mecha-line" />

          <FileUploadField
            label="Map Background Image (optional)"
            value={mapImageUrl}
            onChange={(url) => { setMapImageUrl(url); setMapImage(url); window.dispatchEvent(new CustomEvent("morneven:map-changed")); }}
            accept="image/*"
          />

          <div className="flex items-center justify-between">
            <p className={labelClass}>Markers ({mapMarkers.length})</p>
            <button
              onClick={() => {
                const next = [...mapMarkers, { id: `mk-${Date.now()}`, name: "New Marker", status: "safe" as MapZoneStatus, x: 0.5, y: 0.5, description: "", loreLink: "" }];
                setMapMarkers(next);
                saveMapMarkers(next);
                window.dispatchEvent(new CustomEvent("morneven:map-changed"));
              }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="h-3 w-3" /> ADD MARKER
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
                  <button onClick={() => { const next = mapMarkers.filter((_, i) => i !== idx); setMapMarkers(next); saveMapMarkers(next); window.dispatchEvent(new CustomEvent("morneven:map-changed")); }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={() => { saveMapMarkers(mapMarkers); window.dispatchEvent(new CustomEvent("morneven:map-changed")); }} className="flex items-center gap-1 px-4 py-2 text-xs font-display tracking-wider bg-primary text-primary-foreground rounded-sm hover:opacity-90 transition-opacity">
              <Save className="h-3 w-3" /> SAVE MARKERS
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      {activeTab !== "homepage" && activeTab !== "map" && (
        <div className="space-y-2">
          {getItems().map((item) => (
            <div key={item.id} className="hud-border-sm bg-card p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-sm text-foreground truncate">{getItemTitle(item)}</h3>
                <p className="text-xs text-muted-foreground font-body truncate">{getItemDesc(item)}</p>
                {"status" in item && typeof (item as Project).status === "string" && <span className="text-[10px] font-display tracking-wider text-accent-orange uppercase">{(item as Project).status}</span>}
                {"classification" in item && <span className="text-[10px] font-display tracking-wider text-accent-orange uppercase">{(item as Creature).classification} • DL-{(item as Creature).dangerLevel}</span>}
                {"accentColor" in item && <span className="inline-block w-3 h-3 rounded-full ml-2 align-middle" style={{ backgroundColor: (item as { accentColor: string }).accentColor }} />}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => { setEditing({ ...item } as EditableState); setIsCreating(false); }} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(item.id, getItemTitle(item))} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
