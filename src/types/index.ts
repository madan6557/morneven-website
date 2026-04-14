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
  status: "Planning" | "On Progress" | "On Hold" | "Canceled";
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

export interface Character {
  id: string;
  name: string;
  race: string;
  height: string;
  traits: string[];
  likes: string[];
  dislikes: string[];
  accentColor: string;
  thumbnail: string;
  shortDesc: string;
  fullDesc: string;
  stats: CharacterStats;
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
}

export interface NewsItem {
  id: string;
  text: string;
  date: string;
}

export type UserRole = "author" | "viewer" | "guest";
