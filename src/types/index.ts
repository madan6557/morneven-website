export interface SkillRestriction {
  key: string;
  value: string;
}

export const SKILL_FEATURE_CATEGORIES = ["general", "passive", "active"] as const;
export type SkillFeatureCategory = (typeof SKILL_FEATURE_CATEGORIES)[number];

export interface Skill {
  id: string;
  name: string;
  category: SkillFeatureCategory | string;
  restriction?: SkillRestriction;
  description: string;
  icon?: string;
  color?: string;
}

export interface Feature {
  id: string;
  title: string;
  category?: SkillFeatureCategory | string;
  summary: string;
  details?: string;
  restriction?: SkillRestriction;
  icon?: string;
  color?: string;
  tags?: string[];
}

export interface ProjectPatch {
  version: string;
  date: string;
  notes: string;
}

export interface ContentMetrics {
  views: number;
  likes?: number;
  dislikes?: number;
  stars?: number;
}

export interface DocItem {
  type: "image" | "video" | "file";
  url: string;
  thumbnail?: string;
  caption: string;
  date?: string;
}

export interface LoreFieldNote {
  id: string;
  title: string;
  body: string;
  date?: string;
}

export interface LoreMetaPatch {
  version: string;
  date: string;
  notes: string;
}

export interface LoreMeta {
  creator?: string;
  owner?: string;
  designer?: string;
  collaborators?: string[];
  team?: string | string[];
  projectName?: string;
  startedAt?: string;
  completedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  patchNotes?: LoreMetaPatch[];
  license?: string;
  sourceUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  status: "Planning" | "On Progress" | "On Hold" | "Completed" | "Canceled";
  thumbnail: string;
  headerImage?: string;
  shortDesc: string;
  fullDesc: string;
  patches: ProjectPatch[];
  docs: DocItem[];
  archived?: boolean;
  features?: Feature[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
}

export interface CharacterStats {
  combat: number;
  intelligence: number;
  charisma: number;
  stealth: number;
  perception: number;
  detail?: {
    combat?: {
      strength: number;
      defense: number;
      agility: number;
      endurance: number;
      adaptation: number;
    };
    intelligence?: {
      iq: number;
      eq: number;
      sq: number;
    };
    charisma?: {
      persuasion: number;
      intimidation: number;
      manipulation: number;
    };
    stealth?: {
      presenceControl: number;
      silence: number;
      environmentControl: number;
      visualMasking: number;
    };
    perception?: {
      acuity: number;
      focus: number;
      intuition: number;
    };
  };
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
  headerImage?: string;
  shortDesc: string;
  fullDesc: string;
  stats: CharacterStats;
  docs: DocItem[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  contributions?: CharacterContribution[];
  skills?: Skill[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
  views?: number;
  stars?: number;
  viewerStarred?: boolean;
}

export type CreatureClassification =
  | "Amorphous"
  | "Crystalline"
  | "Metamorphic"
  | "Catalyst"
  | "Singularity"
  | "Zero-State";

export type CreatureDangerLevel = 1 | 2 | 3 | 4 | 5;

export interface CreatureStats {
  combat: number;
  cognition: number;
  predation: number;
  senses: number;
  ferocity: number;
  detail?: {
    combat?: {
      strength: number;
      defense: number;
      agility: number;
      endurance: number;
      adaptation: number;
    };
    cognition?: {
      problemSolving: number;
      memory: number;
      instinct: number;
    };
    predation?: {
      ambush: number;
      camouflage: number;
      quietude: number;
      trapping: number;
    };
    senses?: {
      tracking: number;
      detection: number;
      awareness: number;
    };
    ferocity?: {
      intimidation: number;
      dominance: number;
      hostility: number;
    };
  };
}

export interface Creature {
  id: string;
  name: string;
  classification: CreatureClassification;
  dangerLevel: CreatureDangerLevel;
  habitat: string;
  thumbnail: string;
  headerImage?: string;
  accentColor: string;
  shortDesc: string;
  fullDesc: string;
  stats?: CreatureStats;
  docs: DocItem[];
  traits?: string[];
  instincts?: string[];
  aversions?: string[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  skills?: Skill[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
  views?: number;
  stars?: number;
  viewerStarred?: boolean;
}

export interface OtherLore {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  headerImage?: string;
  shortDesc: string;
  fullDesc: string;
  docs: DocItem[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  features?: Feature[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
  views?: number;
  stars?: number;
  viewerStarred?: boolean;
}

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
  era?: string;
  dateLabel?: string;
  scope?: string;
  impactLevel?: string;
  thumbnail: string;
  headerImage?: string;
  shortDesc: string;
  fullDesc: string;
  consequences?: string[];
  relatedLinks?: EventRelatedLink[];
  docs: DocItem[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  features?: Feature[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
  views?: number;
  stars?: number;
  viewerStarred?: boolean;
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
  headerImage?: string;
  shortDesc: string;
  fullDesc: string;
  docs: DocItem[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  features?: Feature[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
  views?: number;
  stars?: number;
  viewerStarred?: boolean;
}

export interface Technology {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  headerImage?: string;
  shortDesc: string;
  fullDesc: string;
  docs: DocItem[];
  fieldNotes?: LoreFieldNote[];
  observations?: LoreFieldNote[];
  features?: Feature[];
  discussions?: DiscussionComment[];
  contributor?: string;
  meta?: LoreMeta;
  views?: number;
  stars?: number;
  viewerStarred?: boolean;
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
  mediaUrl?: string;
  videoUrl?: string;
  caption: string;
  tags: string[];
  date: string;
  comments: GalleryComment[];
  uploadedBy?: string;
  views?: number;
  likes?: number;
  dislikes?: number;
  viewerReaction?: "like" | "dislike" | null;
}

export interface NewsAttachment {
  type: "image" | "video" | "link";
  url: string;
  caption?: string;
}

export interface NewsItem {
  id: string;
  text: string;
  date: string;
  body?: string;
  thumbnail?: string;
  attachments?: NewsAttachment[];
  hasDetail?: boolean;
}

export type MapZoneStatus = "safe" | "caution" | "danger" | "restricted" | "mission";

export interface MapMarker {
  id: string;
  name: string;
  status: MapZoneStatus;
  x: number;
  y: number;
  description: string;
  loreLink?: string;
}

export type UserRole = "author" | "admin" | "security" | "personel" | "guest";

export type PersonnelAccountStatus =
  | "active"
  | "suspended"
  | "banned"
  | "deleted";

export type PersonnelStatusSeverity = "info" | "warning" | "critical";

export interface PersonnelStatusSummary {
  key: PersonnelAccountStatus | string;
  label?: string;
  reason?: string;
  detail?: string;
  severity?: PersonnelStatusSeverity;
  active?: boolean;
  permanent?: boolean;
  imposedBy?: string;
  imposedAt?: string;
  expiresAt?: string;
}

export interface PersonnelReportSummary {
  open?: number;
  resolved?: number;
  latestAt?: string;
}

export type PersonnelReportCategory =
  | "abuse"
  | "harassment"
  | "impersonation"
  | "spam"
  | "security"
  | "other"
  | string;

export type PersonnelReportStatus =
  | "open"
  | "confirmed"
  | "dismissed"
  | string;

export type PersonnelReviewDecision = "confirmed" | "dismissed";

export type PersonnelReviewAction = "none" | "suspend" | "demote" | "ban" | "auto-demote" | "auto-ban";

export interface PersonnelReport {
  id: string;
  targetUserId?: string;
  targetUsername: string;
  targetEmail?: string;
  reporterUsername?: string;
  category: PersonnelReportCategory;
  reason: string;
  detail?: string;
  evidence?: string;
  status: PersonnelReportStatus;
  priority?: "low" | "normal" | "high" | "critical" | string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewerUsername?: string;
  reviewNote?: string;
  resolution?: string;
  targetStatus?: PersonnelStatusSummary;
}

export interface PersonnelUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  track: "executive" | "field" | "mechanic" | "logistics";
  note?: string;
  updatedAt?: string;
  online?: boolean;
  lastSeenAt?: string;
  status?: PersonnelAccountStatus | string;
  statusLabel?: string;
  statusReason?: string;
  statusDetail?: string;
  statusSeverity?: PersonnelStatusSeverity;
  statusActive?: boolean;
  statusPermanent?: boolean;
  statusUpdatedAt?: string;
  statusExpiresAt?: string;
  archived?: boolean;
  archivedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  originalUsername?: string;
  moderationNote?: string;
  reportsOpen?: number;
  reportsResolved?: number;
  reportSummary?: PersonnelReportSummary;
  accountStatus?: PersonnelStatusSummary;
  banReason?: string;
  banExpiresAt?: string;
}
