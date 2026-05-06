// Types for all data models

// MOBA-style ability attached to living entities (characters, creatures).
// `description` may contain inline attribute tags like [[attr:physical-damage|5%]]
// which the renderer converts into colored AttributeBadge chips.
export interface Skill {
  id: string;
  name: string;
  // Lucide icon key — defaults to "Zap" when missing/unknown.
  icon?: string;
  // Color hue for the skill icon frame (HSL or hex). Optional.
  accentColor?: string;
  // Short tagline shown next to the icon.
  tagline?: string;
  // Long description with attribute tags inline.
  description: string;
  // Limitation/cooldown/cost text. e.g. "3 times per day", "Drains 20 SP".
  cost?: string;
}

// Non-living equivalent of a Skill — used for places, technology, projects,
// events and other lore. Same shape so the editor and renderer can reuse code.
export interface Feature {
  id: string;
  name: string;
  icon?: string;
  accentColor?: string;
  tagline?: string;
  description: string;
  cost?: string;
}

export interface ProjectPatch {
  version: string;
  date: string;
  notes: string;
}

export interface DocItem {
  type: "image" | "video" | "file";
  url: string;
  caption: string;
}

export interface LoreFieldNote {
  id: string;
  title: string;
  body: string;
  date?: string;
}

// Production-credit metadata attached to any lore entry. Optional and purely
// descriptive — does not affect access control or quotas. Surfaces on the
// per-entry "Metadata" tab so readers can see who built and approved it.
export interface LoreMetaPatch {
  version: string;
  date: string;
  notes: string;
}

export interface LoreMeta {
  // Original creator (in-universe or out-of-universe author).
  creator?: string;
  // Long-term maintainer / canonical owner of the page.
  owner?: string;
  // Visual / concept designer (if distinct from creator).
  designer?: string;
  // Other named collaborators.
  collaborators?: string[];
  // Team that produced or maintains the entry. May be a single team name
  // or an array of contributing teams.
  team?: string | string[];
  // Originating project (e.g. "Pantry Continuity Initiative").
  projectName?: string;
  // ISO-ish dates (free-form to allow in-universe labels too).
  startedAt?: string;
  completedAt?: string;
  approvedAt?: string;
  // Reviewer who signed off canon entry.
  approvedBy?: string;
  // Versioned change log for the lore entry itself.
  patchNotes?: LoreMetaPatch[];
  // Free-form license / source notes.
  license?: string;
  sourceUrl?: string;
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
  // Archived projects are hidden from active lists but remain accessible
  // through the dedicated Archives view.
  archived?: boolean;
  features?: Feature[];
  // Original author / contributor of the project.
  contributor?: string;
  // Production credits (creator, designer, team, dates, patch notes, etc.)
  meta?: LoreMeta;
}

export interface CharacterStats {
  combat: number;
  intelligence: number;
  stealth: number;
  charisma: number;
  endurance: number;
  perception?: number;
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
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  contributions?: CharacterContribution[];
  skills?: Skill[];
  discussions?: DiscussionComment[];
  // Original author / contributor for attribution.
  contributor?: string;
  // Production credits (creator, designer, team, dates, patch notes, etc.)
  meta?: LoreMeta;
}

// Creature classification — Gemora Entropy Classification (GEC) Mark II
export type CreatureClassification = "Amorphous" | "Crystalline" | "Metamorphic" | "Catalyst" | "Singularity" | "Zero-State";

// Gemora danger level scale 1-5 (5 = world-ending)
export type CreatureDangerLevel = 1 | 2 | 3 | 4 | 5;

export interface CreatureStats {
  combat: number;
  intelligence: number;
  cognition?: number;
  stealth: number;
  predation?: number;
  ferocity: number;
  endurance: number;
  senses?: number;
}

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
  stats?: CreatureStats;
  docs: DocItem[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  skills?: Skill[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
}

export interface OtherLore {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  docs: DocItem[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  features?: Feature[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
}

// Recorded event in the Gemora Universe — historical milestones, yearly
// observances, institute incidents, etc. Discoverable from /lore/events.
export type EventCategory =
  | "Cataclysm"
  | "Institute Milestone"
  | "Yearly Observance"
  | "Incident"
  | "Operation"
  | "Anomaly Surge"
  | "Other";

export interface EventRelatedLink {
  label: string;
  url: string;
}

export interface LoreEvent {
  id: string;
  title: string;
  category: EventCategory | string;
  // Free-form era label (e.g. "Pre-Founding", "Modern", "Year of Lanterns").
  era?: string;
  // Free-form date or date-range label (calendar varies in-universe).
  dateLabel?: string;
  // Geographic / institutional scope (e.g. "Sector", "Continental").
  scope?: string;
  // Subjective impact tier; not gameplay-bound.
  impactLevel?: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  consequences?: string[];
  relatedLinks?: EventRelatedLink[];
  docs: DocItem[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  features?: Feature[];
  discussions?: DiscussionComment[];
  // Original author / contributor for attribution.
  contributor?: string;
  meta?: LoreMeta;
}

export interface DiscussionMention {
  username: string;
  start: number;
  end: number;
}

export interface DiscussionReply {
  id: string;
  author: string;
  text: string;
  date: string;
  mentions?: DiscussionMention[];
}

export interface DiscussionComment {
  id: string;
  author: string;
  text: string;
  date: string;
  mentions?: DiscussionMention[];
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
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  features?: Feature[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
}

export interface Technology {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  docs: DocItem[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  features?: Feature[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
}

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  date: string;
  mentions?: DiscussionMention[];
}

export interface GalleryComment {
  id: string;
  author: string;
  text: string;
  date: string;
  mentions?: DiscussionMention[];
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

export interface NewsAttachment {
  type: "image" | "video" | "link";
  url: string;
  caption?: string;
}

export interface NewsItem {
  id: string;
  // Headline shown in the Command Center feed.
  text: string;
  date: string;
  // Optional long-form body. Only relevant when hasDetail is true.
  body?: string;
  // Optional thumbnail used on the detail page.
  thumbnail?: string;
  // Optional rich attachments (images, videos, external links).
  attachments?: NewsAttachment[];
  // When true, the feed entry links to /news/:id. When false (or omitted),
  // the entry is rendered as a plain note with no detail page.
  hasDetail?: boolean;
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
