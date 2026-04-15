import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getProjects, createProject, updateProject, deleteProject, getCharacters, createCharacter, updateCharacter, deleteCharacter, getPlaces, createPlace, updatePlace, deletePlace, getTechnology, createTech, updateTech, deleteTech, getGallery, createGalleryItem, updateGalleryItem, deleteGalleryItem } from "@/services/api";
import type { Project, Character, Place, Technology, GalleryItem, DocItem } from "@/types";
import { Pencil, Trash2, Plus, X, Save, Upload, Link as LinkIcon, Image, Video } from "lucide-react";

const dashTabs = ["projects", "lore", "gallery"] as const;
const loreSubs = ["characters", "places", "technology"] as const;
const inputClass = "w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const labelClass = "font-heading text-xs tracking-wider text-muted-foreground uppercase";

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
  const { role } = useAuth();
  const [params] = useSearchParams();
  const [activeTab, setActiveTab] = useState(params.get("tab") || "projects");
  const [loreSub, setLoreSub] = useState<string>("characters");

  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tech, setTech] = useState<Technology[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const [editing, setEditing] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setProjects(await getProjects());
    setCharacters(await getCharacters());
    setPlaces(await getPlaces());
    setTech(await getTechnology());
    setGallery(await getGallery());
  };

  if (role !== "author") {
    return (
      <div className="p-6 md:p-8 space-y-4">
        <h1 className="font-display text-2xl tracking-[0.1em] text-primary">AUTHOR PANEL</h1>
        <div className="mecha-line w-32" />
        <div className="hud-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground font-body">Access restricted. Login with an author account to manage content.</p>
          <p className="text-xs text-muted-foreground font-body mt-2 italic">Hint: Use an email containing "author" (e.g. author@morneven.org) to access.</p>
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
        setEditing({ name: "", race: "", height: "", traits: [], likes: [], dislikes: [], accentColor: "#4A90D9", thumbnail: "", shortDesc: "", fullDesc: "", stats: { combat: 50, intelligence: 50, stealth: 50, charisma: 50, endurance: 50 }, docs: [] });
      } else if (loreSub === "places") {
        setEditing({ name: "", type: "", thumbnail: "", shortDesc: "", fullDesc: "", docs: [] });
      } else {
        setEditing({ name: "", category: "", thumbnail: "", shortDesc: "", fullDesc: "", docs: [] });
      }
    } else {
      setEditing({ type: "image", title: "", thumbnail: "", videoUrl: "", caption: "", tags: [], date: new Date().toISOString().split("T")[0], comments: [] });
    }
  };

  const handleSave = async () => {
    if (activeTab === "projects") {
      if (isCreating) await createProject(editing);
      else await updateProject(editing.id, editing);
      setProjects(await getProjects());
    } else if (activeTab === "lore") {
      if (loreSub === "characters") {
        if (isCreating) await createCharacter(editing);
        else await updateCharacter(editing.id, editing);
        setCharacters(await getCharacters());
      } else if (loreSub === "places") {
        if (isCreating) await createPlace(editing);
        else await updatePlace(editing.id, editing);
        setPlaces(await getPlaces());
      } else {
        if (isCreating) await createTech(editing);
        else await updateTech(editing.id, editing);
        setTech(await getTechnology());
      }
    } else {
      if (isCreating) await createGalleryItem(editing);
      else await updateGalleryItem(editing.id, editing);
      setGallery(await getGallery());
    }
    setEditing(null);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (activeTab === "projects") { await deleteProject(id); setProjects(await getProjects()); }
    else if (activeTab === "lore") {
      if (loreSub === "characters") { await deleteCharacter(id); setCharacters(await getCharacters()); }
      else if (loreSub === "places") { await deletePlace(id); setPlaces(await getPlaces()); }
      else { await deleteTech(id); setTech(await getTechnology()); }
    } else { await deleteGalleryItem(id); setGallery(await getGallery()); }
  };

  const getItems = (): any[] => {
    if (activeTab === "projects") return projects;
    if (activeTab === "lore") {
      if (loreSub === "characters") return characters;
      if (loreSub === "places") return places;
      return tech;
    }
    return gallery;
  };

  const getItemTitle = (item: any): string => item.title || item.name || "Untitled";
  const getItemDesc = (item: any): string => item.shortDesc || item.caption || "";

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
    const docs = (editing.docs || []).filter((_: any, i: number) => i !== idx);
    setEditing({ ...editing, docs });
  };

  // Patch management for projects
  const addPatch = () => {
    const patches = [...(editing.patches || []), { version: "", date: new Date().toISOString().split("T")[0], notes: "" }];
    setEditing({ ...editing, patches });
  };
  const updatePatch = (idx: number, field: string, value: string) => {
    const patches = [...(editing.patches || [])];
    patches[idx] = { ...patches[idx], [field]: value };
    setEditing({ ...editing, patches });
  };
  const removePatch = (idx: number) => {
    const patches = (editing.patches || []).filter((_: any, i: number) => i !== idx);
    setEditing({ ...editing, patches });
  };

  const isCharacter = activeTab === "lore" && loreSub === "characters";
  const isPlace = activeTab === "lore" && loreSub === "places";
  const isTech = activeTab === "lore" && loreSub === "technology";
  const isProject = activeTab === "projects";
  const isGallery = activeTab === "gallery";
  const hasDocs = isProject || isCharacter || isPlace || isTech;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">AUTHOR PANEL</h1>
      <div className="mecha-line w-32" />

      {/* Tabs */}
      <div className="flex gap-2">
        {dashTabs.map((t) => (
          <button key={t} onClick={() => { setActiveTab(t); setEditing(null); setIsCreating(false); }}
            className={`px-4 py-1.5 text-xs font-display tracking-[0.1em] uppercase border rounded-sm transition-colors ${activeTab === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === "lore" && (
        <div className="flex gap-2">
          {loreSubs.map((s) => (
            <button key={s} onClick={() => { setLoreSub(s); setEditing(null); setIsCreating(false); }}
              className={`px-3 py-1 text-[10px] font-display tracking-[0.1em] uppercase border rounded-sm transition-colors ${loreSub === s ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={startCreate} className="flex items-center gap-1 px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground bg-primary rounded-sm hover:opacity-90 transition-opacity">
          <Plus className="h-3 w-3" /> CREATE NEW
        </button>
      </div>

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
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className={inputClass}>
                  <option>Planning</option>
                  <option>On Progress</option>
                  <option>On Hold</option>
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
                  <input type="text" value={(editing.dislikes || []).join(", ")} onChange={(e) => setEditing({ ...editing, dislikes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} className={inputClass} />
                </div>
              </>
            )}

            {/* Character Stats */}
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
                  <input type="date" value={editing.date || ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className={inputClass} />
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
            <div>
              <label className={labelClass}>Full Description</label>
              <textarea value={editing.fullDesc || ""} onChange={(e) => setEditing({ ...editing, fullDesc: e.target.value })} rows={5} className={inputClass + " resize-y min-h-[120px]"} />
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

          {/* Patch Notes (projects) */}
          {isProject && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className={labelClass}>Patch Notes</label>
                <button onClick={addPatch} className="flex items-center gap-1 px-2 py-1 text-[10px] font-display tracking-wider text-primary border border-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Plus className="h-3 w-3" /> ADD PATCH
                </button>
              </div>
              {(editing.patches || []).map((patch: any, idx: number) => (
                <div key={idx} className="flex gap-2 items-start p-3 bg-muted/50 rounded-sm border border-border">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input type="text" value={patch.version} onChange={(e) => updatePatch(idx, "version", e.target.value)} placeholder="Version (e.g. v1.0)" className="w-24 px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
                      <input type="date" value={patch.date} onChange={(e) => updatePatch(idx, "date", e.target.value)} className="px-2 py-1 bg-background border border-border rounded-sm text-xs font-body text-foreground" />
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

      {/* Items List */}
      <div className="space-y-2">
        {getItems().map((item) => (
          <div key={item.id} className="hud-border-sm bg-card p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading text-sm text-foreground truncate">{getItemTitle(item)}</h3>
              <p className="text-xs text-muted-foreground font-body truncate">{getItemDesc(item)}</p>
              {"status" in item && <span className="text-[10px] font-display tracking-wider text-accent-orange uppercase">{item.status}</span>}
              {"accentColor" in item && <span className="inline-block w-3 h-3 rounded-full ml-2 align-middle" style={{ backgroundColor: item.accentColor }} />}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => { setEditing({ ...item }); setIsCreating(false); }} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
