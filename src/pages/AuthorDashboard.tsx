import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getProjects, createProject, updateProject, deleteProject, getCharacters, createCharacter, updateCharacter, deleteCharacter, getPlaces, createPlace, updatePlace, deletePlace, getTechnology, createTech, updateTech, deleteTech, getGallery, createGalleryItem, updateGalleryItem, deleteGalleryItem } from "@/services/api";
import type { Project, Character, Place, Technology, GalleryItem } from "@/types";
import { Pencil, Trash2, Plus, X, Save } from "lucide-react";

const dashTabs = ["projects", "lore", "gallery"] as const;
const loreSubs = ["characters", "places", "technology"] as const;

export default function AuthorDashboard() {
  const { role } = useAuth();
  const [params] = useSearchParams();
  const [activeTab, setActiveTab] = useState(params.get("tab") || "projects");
  const [loreSub, setLoreSub] = useState<string>("characters");

  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tech, setTech] = useState<Technology[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  // Edit state
  const [editing, setEditing] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

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
        setEditing({ name: "", race: "", height: "", traits: [], likes: [], dislikes: [], accentColor: "#4A90D9", thumbnail: "", shortDesc: "", fullDesc: "", stats: { combat: 50, intelligence: 50, stealth: 50, charisma: 50, endurance: 50 } });
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
    if (activeTab === "projects") {
      await deleteProject(id);
      setProjects(await getProjects());
    } else if (activeTab === "lore") {
      if (loreSub === "characters") { await deleteCharacter(id); setCharacters(await getCharacters()); }
      else if (loreSub === "places") { await deletePlace(id); setPlaces(await getPlaces()); }
      else { await deleteTech(id); setTech(await getTechnology()); }
    } else {
      await deleteGalleryItem(id);
      setGallery(await getGallery());
    }
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

  const getItemTitle = (item: any): string => {
    return item.title || item.name || "Untitled";
  };

  const getItemDesc = (item: any): string => {
    return item.shortDesc || item.caption || "";
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="font-display text-2xl tracking-[0.1em] text-primary">AUTHOR PANEL</h1>
      <div className="mecha-line w-32" />

      {/* Tabs */}
      <div className="flex gap-2">
        {dashTabs.map((t) => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); setEditing(null); setIsCreating(false); }}
            className={`px-4 py-1.5 text-xs font-display tracking-[0.1em] uppercase border rounded-sm transition-colors
              ${activeTab === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Lore sub-tabs */}
      {activeTab === "lore" && (
        <div className="flex gap-2">
          {loreSubs.map((s) => (
            <button
              key={s}
              onClick={() => { setLoreSub(s); setEditing(null); setIsCreating(false); }}
              className={`px-3 py-1 text-[10px] font-display tracking-[0.1em] uppercase border rounded-sm transition-colors
                ${loreSub === s ? "bg-secondary text-secondary-foreground border-secondary" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
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
              <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">{editing.title !== undefined ? "Title" : "Name"}</label>
              <input
                type="text"
                value={editing.title ?? editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, [editing.title !== undefined ? "title" : "name"]: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Status (projects) */}
            {activeTab === "projects" && (
              <div>
                <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Status</label>
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option>Planning</option>
                  <option>On Progress</option>
                  <option>On Hold</option>
                  <option>Canceled</option>
                </select>
              </div>
            )}

            {/* Race (characters) */}
            {activeTab === "lore" && loreSub === "characters" && (
              <>
                <div>
                  <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Race</label>
                  <input
                    type="text"
                    value={editing.race || ""}
                    onChange={(e) => setEditing({ ...editing, race: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Height</label>
                  <input
                    type="text"
                    value={editing.height || ""}
                    onChange={(e) => setEditing({ ...editing, height: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Accent Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={editing.accentColor || "#4A90D9"}
                      onChange={(e) => setEditing({ ...editing, accentColor: e.target.value })}
                      className="h-10 w-16 border border-border rounded-sm cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editing.accentColor || "#4A90D9"}
                      onChange={(e) => setEditing({ ...editing, accentColor: e.target.value })}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Category/Type */}
            {activeTab === "lore" && loreSub === "places" && (
              <div>
                <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Type</label>
                <input
                  type="text"
                  value={editing.type || ""}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {activeTab === "lore" && loreSub === "technology" && (
              <div>
                <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Category</label>
                <input
                  type="text"
                  value={editing.category || ""}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* Gallery type */}
            {activeTab === "gallery" && (
              <>
                <div>
                  <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Type</label>
                  <select
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                {editing.type === "video" && (
                  <div>
                    <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Video Embed URL</label>
                    <input
                      type="text"
                      value={editing.videoUrl || ""}
                      onChange={(e) => setEditing({ ...editing, videoUrl: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="https://www.youtube.com/embed/..."
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Short Desc / Caption */}
          <div>
            <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">{editing.caption !== undefined ? "Caption" : "Short Description"}</label>
            <input
              type="text"
              value={editing.shortDesc ?? editing.caption ?? ""}
              onChange={(e) => setEditing({ ...editing, [editing.caption !== undefined ? "caption" : "shortDesc"]: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Full Description */}
          {editing.fullDesc !== undefined && (
            <div>
              <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Full Description</label>
              <textarea
                value={editing.fullDesc || ""}
                onChange={(e) => setEditing({ ...editing, fullDesc: e.target.value })}
                rows={5}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>
          )}

          {/* Tags (gallery) */}
          {activeTab === "gallery" && (
            <div>
              <label className="font-heading text-xs tracking-wider text-muted-foreground uppercase">Tags (comma-separated)</label>
              <input
                type="text"
                value={(editing.tags || []).join(", ")}
                onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) })}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-sm text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditing(null); setIsCreating(false); }} className="px-4 py-2 text-xs font-display tracking-wider border border-border rounded-sm text-muted-foreground hover:bg-muted transition-colors">
              CANCEL
            </button>
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
              {"status" in item && (
                <span className="text-[10px] font-display tracking-wider text-accent-orange uppercase">{item.status}</span>
              )}
              {"accentColor" in item && (
                <span className="inline-block w-3 h-3 rounded-full ml-2 align-middle" style={{ backgroundColor: item.accentColor }} />
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { setEditing({ ...item }); setIsCreating(false); }}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
