// Minimal chat service: DMs, manual groups, and auto groups (team/division).
// Persisted to localStorage. A future backend can swap each function for
// a REST/WebSocket call without touching the UI.

import type { PersonnelTrack } from "@/lib/pl";

export type ConversationKind = "dm" | "group" | "team" | "division";

export interface ChatMessage {
  id: string;
  conversationId: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  name: string;
  members: string[]; // usernames
  // For team/division auto-groups, we tag the source so we can reconcile
  // membership when personnel transfer or teams change.
  source?: { teamId?: string; track?: PersonnelTrack };
  createdAt: string;
}

const KEY_CONV = "morneven_chat_conversations";
const KEY_MSG = "morneven_chat_messages";
const EVT = "morneven:chat-changed";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* ignore */
  }
}

let conversations: Conversation[] = read<Conversation[]>(KEY_CONV, []);
let messages: ChatMessage[] = read<ChatMessage[]>(KEY_MSG, []);

const todayISO = () => new Date().toISOString();

export function listConversationsFor(username: string): Conversation[] {
  return conversations
    .filter((c) => c.members.includes(username))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getConversation(id: string): Conversation | undefined {
  return conversations.find((c) => c.id === id);
}

export function listMessages(conversationId: string): ChatMessage[] {
  return messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function sendMessage(conversationId: string, author: string, text: string): ChatMessage {
  const next: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    conversationId,
    author,
    text,
    createdAt: todayISO(),
  };
  messages = [...messages, next];
  write(KEY_MSG, messages);
  return next;
}

export function createDM(a: string, b: string): Conversation {
  const existing = conversations.find(
    (c) => c.kind === "dm" && c.members.length === 2 && c.members.includes(a) && c.members.includes(b),
  );
  if (existing) return existing;
  const next: Conversation = {
    id: `conv-${Date.now()}`,
    kind: "dm",
    name: `DM ${a} & ${b}`,
    members: [a, b],
    createdAt: todayISO(),
  };
  conversations = [next, ...conversations];
  write(KEY_CONV, conversations);
  return next;
}

export function createManualGroup(name: string, creator: string, members: string[]): Conversation {
  const all = Array.from(new Set([creator, ...members]));
  const next: Conversation = {
    id: `conv-${Date.now()}`,
    kind: "group",
    name,
    members: all,
    createdAt: todayISO(),
  };
  conversations = [next, ...conversations];
  write(KEY_CONV, conversations);
  return next;
}

// Idempotent: ensures a team auto-group exists with the right members.
export function syncTeamGroup(
  teamId: string,
  teamName: string,
  members: string[],
): Conversation {
  const existing = conversations.find((c) => c.kind === "team" && c.source?.teamId === teamId);
  if (existing) {
    existing.members = Array.from(new Set([...existing.members, ...members]));
    existing.name = `Team · ${teamName}`;
    write(KEY_CONV, conversations);
    return existing;
  }
  const next: Conversation = {
    id: `conv-team-${teamId}`,
    kind: "team",
    name: `Team · ${teamName}`,
    members: Array.from(new Set(members)),
    source: { teamId },
    createdAt: todayISO(),
  };
  conversations = [next, ...conversations];
  write(KEY_CONV, conversations);
  return next;
}

// Idempotent: ensures one division auto-group per track and adds the user.
export function syncDivisionMembership(username: string, track: PersonnelTrack) {
  // Remove user from any other division groups first
  conversations = conversations.map((c) => {
    if (c.kind === "division" && c.source?.track && c.source.track !== track) {
      return { ...c, members: c.members.filter((m) => m !== username) };
    }
    return c;
  });
  let group = conversations.find((c) => c.kind === "division" && c.source?.track === track);
  if (!group) {
    group = {
      id: `conv-div-${track}`,
      kind: "division",
      name: `Division · ${track.toUpperCase()}`,
      members: [username],
      source: { track },
      createdAt: todayISO(),
    };
    conversations = [group, ...conversations];
  } else if (!group.members.includes(username)) {
    group.members = [...group.members, username];
  }
  write(KEY_CONV, conversations);
  return group;
}

export function subscribeChat(cb: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}
