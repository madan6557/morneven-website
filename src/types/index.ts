// Types for all data models

export interface ProjectPatch {
  version: string;
  date: string;
  notes: string;
}

export interface DocItem {
  type: "image" | "video";
  url: string;
  caption: string;
}

export interface Project {
  id: string;
  title: string;
  status: "Planning" | "On Progress" | "On Hold" | "Completed" | "Canceled";
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  patches: ProjectPatch[];
  docs: DocItem[];
}

export interface CharacterStats {
  combat: number;
  intelligence: number;
  stealth: number;
  charisma: number;
  endurance: number;
}

export interface CharacterContribution {
  id: string;
  title: string;
  description: string;
  date?: string;
}

export interface Character {
  id: string;
  name: string;
  race: string;
  occupation?: string;
  height: string;
  traits: string[];
  likes: string[];
  dislikes: string[];
  accentColor: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  stats: CharacterStats;
  docs: DocItem[];
  contributions?: CharacterContribution[];
}

// Creature classification — Gemora Entropy Classification (GEC) Mark II
export type CreatureClassification = "Amorphous" | "Crystalline" | "Metamorphic" | "Catalyst" | "Singularity" | "Zero-State";

// Gemora danger level scale 1-5 (5 = world-ending)
export type CreatureDangerLevel = 1 | 2 | 3 | 4 | 5;

export interface Creature {
  id: string;
  name: string;
  classification: CreatureClassification;
  dangerLevel: CreatureDangerLevel;
  habitat: string;
  thumbnail: string;
  accentColor: string;
  shortDesc: string;
  fullDesc: string;
  docs: DocItem[];
}

export interface OtherLore {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  docs: DocItem[];
}

export interface DiscussionReply {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface DiscussionComment {
  id: string;
  author: string;
  text: string;
  date: string;
  replies: DiscussionReply[];
}

export interface Place {
  id: string;
  name: string;
  type: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  docs: DocItem[];
}

export interface Technology {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  docs: DocItem[];
}

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface GalleryComment {
  id: string;
  author: string;
  text: string;
  date: string;
  replies: CommentReply[];
}

export interface GalleryItem {
  id: string;
  type: "image" | "video";
  title: string;
  thumbnail: string;
  videoUrl?: string;
  caption: string;
  tags: string[];
  date: string;
  comments: GalleryComment[];
  // Username of the personnel who uploaded this item. Used to scope
  // edit/delete permissions for L6 personnel — they may only modify
  // gallery items they uploaded themselves. L7 (Full Authority) and the
  // legacy "author" role bypass this check.
  uploadedBy?: string;
}

export interface NewsItem {
  id: string;
  text: string;
  date: string;
}

export type MapZoneStatus = "safe" | "caution" | "danger" | "restricted" | "mission";

export interface MapMarker {
  id: string;
  name: string;
  status: MapZoneStatus;
  // normalized 0-1 coordinates relative to map image
  x: number;
  y: number;
  description: string;
  // optional link to a lore entry, e.g. "/lore/places/place-001"
  loreLink?: string;
}

export type UserRole = "author" | "personel" | "guest";

// Managed personnel record — stored separately from auth identity so a future
// backend can swap localStorage for a real users table without touching the UI.
export interface PersonnelUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  // 0-7. Level 7 ("Full Authority") is reserved for the Author and is
  // never exposed in the public clearance matrix.
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  track: "executive" | "field" | "mechanic" | "logistics";
  note?: string;
  updatedAt?: string;
}
