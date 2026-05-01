// Chat service (demo / localStorage-backed) - wired so a future backend can
// swap each function with a REST/WebSocket call without touching the UI.
//
// Demo capabilities:
//  - DM, manual group, auto team/division, institute-wide channel
//  - Member roles: owner | admin | member
//  - Invite + accept/reject flow (in-app)
//  - Kick / leave / promote / demote
//  - Attachments (stored as data URLs locally; backend will swap to presigned S3)
//  - PL7 auto-join all division groups
//  - Institute group with all active personnel
//
// All mutations dispatch a single `morneven:chat-changed` event so the UI can
// refresh without polling. This mirrors the future WebSocket fan-out events.

import type { PersonnelTrack, PersonnelLevel } from "@/lib/pl";
import type { PersonnelUser } from "@/types";

export type ConversationKind = "dm" | "group" | "team" | "division" | "institute";
export type MemberRole = "owner" | "admin" | "member";
export type MemberStatus = "active" | "invited" | "removed";

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  // Demo: data URL. Backend equivalent: signed download URL + storage_key.
  dataUrl: string;
}

export interface ReplyPreview {
  messageId: string;
  author: string;
  text: string;
  hasAttachments?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  author: string;
  text: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  // System messages render with a neutral style (e.g. "X invited Y").
  system?: boolean;
  // WhatsApp-style quoted reply. Snapshotted so deleting the original
  // message does not break the reply chain.
  replyTo?: ReplyPreview;
}

export interface ConversationMember {
  username: string;
  role: MemberRole;
  status: MemberStatus;
  invitedBy?: string;
  joinedAt: string;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  name: string;
  members: ConversationMember[];
  // For team/division/institute auto-groups, tag the source so we can
  // reconcile membership when personnel transfer or teams change.
  source?: { teamId?: string; track?: PersonnelTrack; institute?: boolean };
  // System-managed conversations cannot be renamed/deleted by users.
  systemManaged?: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ConversationSample {
  id: string;
  name: string;
  kind: ConversationKind;
  memberCount: number;
  unreadCount: number;
  lastReadAt: string;
  lastMessageAt: string;
}

export interface ChatTeamRoster {
  id: string;
  name: string;
  leader: string;
  members: string[];
}

export interface ChatReconciliationReport {
  instituteGroups: number;
  divisionGroups: number;
  teamGroups: number;
  activeMemberships: number;
  removedMemberships: number;
  ranAt: string;
}

const KEY_CONV = "morneven_chat_conversations_v2";
const KEY_MSG = "morneven_chat_messages_v2";
export const CHAT_READ_KEY = "morneven_chat_last_read_v1";
const EVT = "morneven:chat-changed";

export type ChatReadMap = Record<string, string>;

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

// One-time migration from the v1 (members: string[]) shape.
function migrateLegacy() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEY_CONV)) return;
  try {
    const legacyRaw = window.localStorage.getItem("morneven_chat_conversations");
    if (!legacyRaw) return;
    const legacy = JSON.parse(legacyRaw) as Array<{
      id: string;
      kind: ConversationKind;
      name: string;
      members: string[];
      source?: Conversation["source"];
      createdAt: string;
    }>;
    const migrated: Conversation[] = legacy.map((c) => ({
      ...c,
      systemManaged: c.kind !== "dm" && c.kind !== "group",
      createdBy: c.members[0] ?? "system",
      members: c.members.map((u, i) => ({
        username: u,
        role: i === 0 && (c.kind === "group" || c.kind === "dm") ? "owner" : "member",
        status: "active",
        joinedAt: c.createdAt,
      })),
    }));
    window.localStorage.setItem(KEY_CONV, JSON.stringify(migrated));
    const legacyMsg = window.localStorage.getItem("morneven_chat_messages");
    if (legacyMsg) window.localStorage.setItem(KEY_MSG, legacyMsg);
  } catch {
    /* ignore */
  }
}
migrateLegacy();

let conversations: Conversation[] = read<Conversation[]>(KEY_CONV, []);
let messages: ChatMessage[] = read<ChatMessage[]>(KEY_MSG, []);

const todayISO = () => new Date().toISOString();
const uid = (p = "id") => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// -------- Helpers --------------------------------------------------------

function persist() {
  write(KEY_CONV, conversations);
  write(KEY_MSG, messages);
}

export function readChatReadMap(): ChatReadMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CHAT_READ_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ChatReadMap) : {};
  } catch {
    return {};
  }
}

export function writeChatReadMap(next: ChatReadMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAT_READ_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    /* ignore */
  }
}

function ensureMember(conv: Conversation, username: string, role: MemberRole = "member", invitedBy?: string, status: MemberStatus = "active") {
  const existing = conv.members.find((m) => m.username === username);
  if (existing) {
    existing.role = role;
    existing.status = status;
    existing.invitedBy = invitedBy;
    return existing;
  }
  const m: ConversationMember = { username, role, status, invitedBy, joinedAt: todayISO() };
  conv.members.push(m);
  return m;
}

function activeMembers(conv: Conversation): ConversationMember[] {
  return conv.members.filter((m) => m.status === "active");
}

function pushSystemMessage(conversationId: string, text: string) {
  messages.push({
    id: uid("msg"),
    conversationId,
    author: "system",
    text,
    createdAt: todayISO(),
    system: true,
  });
}

function seedDemoChatData() {
  if (conversations.length > 0 || messages.length > 0) return;
  const base = Date.now();
  const at = (minsAgo: number) => new Date(base - minsAgo * 60_000).toISOString();

  conversations = [
    {
      id: "conv-demo-dm",
      kind: "dm",
      name: "DM · author & j.huang",
      members: [
        { username: "author", role: "owner", status: "active", joinedAt: at(70) },
        { username: "j.huang", role: "owner", status: "active", joinedAt: at(70) },
      ],
      createdBy: "author",
      createdAt: at(70),
    },
    {
      id: "conv-demo-group",
      kind: "group",
      name: "Ops Sample Chat",
      members: [
        { username: "author", role: "owner", status: "active", joinedAt: at(65) },
        { username: "j.huang", role: "member", status: "active", joinedAt: at(65) },
        { username: "s.okafor", role: "member", status: "active", joinedAt: at(65) },
      ],
      createdBy: "author",
      createdAt: at(65),
    },
  ];

  messages = [
    {
      id: "msg-demo-1",
      conversationId: "conv-demo-dm",
      author: "j.huang",
      text: "Morning, author. Please review field log delta-7.",
      createdAt: at(50),
    },
    {
      id: "msg-demo-2",
      conversationId: "conv-demo-dm",
      author: "author",
      text: "Received. I will review after command briefing.",
      createdAt: at(49),
    },
    {
      id: "msg-demo-3",
      conversationId: "conv-demo-group",
      author: "s.okafor",
      text: "Ops sample: drone telemetry uploaded to archive.",
      createdAt: at(12),
    },
    {
      id: "msg-demo-4",
      conversationId: "conv-demo-group",
      author: "j.huang",
      text: "Unread sample message: standby for next instruction.",
      createdAt: at(5),
    },
  ];

  persist();
}
seedDemoChatData();

// -------- Queries --------------------------------------------------------

export function listConversationsFor(username: string): Conversation[] {
  return conversations
    .filter((c) => c.members.some((m) => m.username === username && m.status === "active"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listInvitesFor(username: string): Conversation[] {
  return conversations.filter((c) => c.members.some((m) => m.username === username && m.status === "invited"));
}

export function getConversation(id: string): Conversation | undefined {
  return conversations.find((c) => c.id === id);
}

export function listMessages(conversationId: string): ChatMessage[] {
  return messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getConversationUnreadCount(username: string, conversationId: string): number {
  const lastReadAt = readChatReadMap()[conversationId];
  return listMessages(conversationId).filter(
    (m) => !m.system && m.author !== username && (!lastReadAt || m.createdAt > lastReadAt),
  ).length;
}

export function getChatUnreadCount(username: string): number {
  return listConversationsFor(username).reduce(
    (total, conversation) => total + getConversationUnreadCount(username, conversation.id),
    0,
  );
}

export function getMemberRole(conv: Conversation, username: string): MemberRole | null {
  const m = conv.members.find((mm) => mm.username === username && mm.status === "active");
  return m?.role ?? null;
}

export function canManage(conv: Conversation, username: string): boolean {
  const role = getMemberRole(conv, username);
  return role === "owner" || role === "admin";
}

// Endpoint handler (demo): static JSON sample for chat conversation data.
// Mirrors a future GET /v1/chat/conversation-samples endpoint contract.


// -------- Messaging ------------------------------------------------------

export function sendMessage(
  conversationId: string,
  author: string,
  text: string,
  attachments?: ChatAttachment[],
  replyTo?: ReplyPreview,
): ChatMessage {
  const next: ChatMessage = {
    id: uid("msg"),
    conversationId,
    author,
    text,
    createdAt: todayISO(),
    attachments,
    replyTo,
  };
  messages = [...messages, next];
  persist();
  return next;
}

// Helper: build a ReplyPreview snapshot from an existing message.
export function buildReplyPreview(msg: ChatMessage): ReplyPreview {
  return {
    messageId: msg.id,
    author: msg.author,
    text: msg.text || (msg.attachments?.length ? `[${msg.attachments.length} attachment${msg.attachments.length > 1 ? "s" : ""}]` : ""),
    hasAttachments: !!msg.attachments?.length,
  };
}

export function deleteMessage(messageId: string, actor: string): boolean {
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return false;
  const msg = messages[idx];
  const conv = getConversation(msg.conversationId);
  if (!conv) return false;
  // Sender can delete own; admin/owner can moderate.
  if (msg.author !== actor && !canManage(conv, actor)) return false;
  messages.splice(idx, 1);
  persist();
  return true;
}

// -------- Conversation creation -----------------------------------------

export function createDM(a: string, b: string): Conversation {
  const existing = conversations.find(
    (c) => c.kind === "dm" && c.members.length === 2 && c.members.every((m) => m.username === a || m.username === b),
  );
  if (existing) return existing;
  const next: Conversation = {
    id: uid("conv"),
    kind: "dm",
    name: `DM ${a} & ${b}`,
    members: [
      { username: a, role: "owner", status: "active", joinedAt: todayISO() },
      { username: b, role: "owner", status: "active", joinedAt: todayISO() },
    ],
    createdBy: a,
    createdAt: todayISO(),
  };
  conversations = [next, ...conversations];
  persist();
  return next;
}

export function createManualGroup(name: string, creator: string, invitees: string[]): Conversation {
  const next: Conversation = {
    id: uid("conv"),
    kind: "group",
    name,
    members: [
      { username: creator, role: "owner", status: "active", joinedAt: todayISO() },
      ...invitees
        .filter((u) => u !== creator)
        .map<ConversationMember>((u) => ({ username: u, role: "member", status: "invited", invitedBy: creator, joinedAt: todayISO() })),
    ],
    createdBy: creator,
    createdAt: todayISO(),
  };
  conversations = [next, ...conversations];
  pushSystemMessage(next.id, `${creator} created group "${name}"`);
  persist();
  return next;
}

// -------- Member management (manual groups) -----------------------------

export function inviteMembers(conversationId: string, actor: string, usernames: string[]): boolean {
  const conv = getConversation(conversationId);
  if (!conv) return false;
  if (conv.systemManaged) return false;
  if (!canManage(conv, actor)) return false;
  for (const u of usernames) {
    if (u === actor) continue;
    const existing = conv.members.find((m) => m.username === u);
    if (existing && existing.status === "active") continue;
    if (existing) {
      existing.status = "invited";
      existing.invitedBy = actor;
    } else {
      conv.members.push({ username: u, role: "member", status: "invited", invitedBy: actor, joinedAt: todayISO() });
    }
    pushSystemMessage(conv.id, `${actor} invited ${u}`);
  }
  persist();
  return true;
}

export function acceptInvite(conversationId: string, username: string): boolean {
  const conv = getConversation(conversationId);
  if (!conv) return false;
  const m = conv.members.find((mm) => mm.username === username && mm.status === "invited");
  if (!m) return false;
  m.status = "active";
  pushSystemMessage(conv.id, `${username} joined the group`);
  persist();
  return true;
}

export function rejectInvite(conversationId: string, username: string): boolean {
  const conv = getConversation(conversationId);
  if (!conv) return false;
  const idx = conv.members.findIndex((mm) => mm.username === username && mm.status === "invited");
  if (idx === -1) return false;
  conv.members.splice(idx, 1);
  persist();
  return true;
}

export function kickMember(conversationId: string, actor: string, target: string): boolean {
  const conv = getConversation(conversationId);
  if (!conv) return false;
  if (conv.systemManaged) return false;
  if (!canManage(conv, actor)) return false;
  const targetMember = conv.members.find((m) => m.username === target);
  if (!targetMember) return false;
  if (targetMember.role === "owner") return false; // can't kick owner
  const actorMember = conv.members.find((m) => m.username === actor);
  if (actorMember?.role === "admin" && targetMember.role === "admin") return false; // admin can't kick admin
  targetMember.status = "removed";
  pushSystemMessage(conv.id, `${actor} removed ${target}`);
  persist();
  return true;
}

export function leaveConversation(conversationId: string, username: string): boolean {
  const conv = getConversation(conversationId);
  if (!conv) return false;
  if (conv.systemManaged) return false;
  const m = conv.members.find((mm) => mm.username === username);
  if (!m) return false;
  m.status = "removed";
  // Owner leaving: promote earliest active admin or member.
  if (m.role === "owner") {
    const successor = activeMembers(conv).find((mm) => mm.role === "admin") ?? activeMembers(conv)[0];
    if (successor) successor.role = "owner";
  }
  pushSystemMessage(conv.id, `${username} left the group`);
  persist();
  return true;
}

export function setMemberRole(conversationId: string, actor: string, target: string, role: MemberRole): boolean {
  const conv = getConversation(conversationId);
  if (!conv) return false;
  if (conv.systemManaged) return false;
  // Only owner can promote/demote.
  if (getMemberRole(conv, actor) !== "owner") return false;
  const m = conv.members.find((mm) => mm.username === target && mm.status === "active");
  if (!m) return false;
  if (role === "owner") {
    // Transfer ownership.
    const actorMember = conv.members.find((mm) => mm.username === actor);
    if (actorMember) actorMember.role = "admin";
  }
  m.role = role;
  pushSystemMessage(conv.id, `${actor} set ${target} as ${role}`);
  persist();
  return true;
}

export function renameConversation(conversationId: string, actor: string, name: string): boolean {
  const conv = getConversation(conversationId);
  if (!conv || conv.systemManaged) return false;
  if (!canManage(conv, actor)) return false;
  conv.name = name;
  persist();
  return true;
}

// -------- Auto-managed groups -------------------------------------------

export function syncTeamGroup(teamId: string, teamName: string, members: string[]): Conversation {
  const existing = conversations.find((c) => c.kind === "team" && c.source?.teamId === teamId);
  const activeRoster = new Set(members.filter(Boolean));
  if (existing) {
    activeRoster.forEach((u) => ensureMember(existing, u, "member"));
    existing.members.forEach((m) => {
      if (!activeRoster.has(m.username)) m.status = "removed";
    });
    existing.name = `Team · ${teamName}`;
    persist();
    return existing;
  }
  const next: Conversation = {
    id: `conv-team-${teamId}`,
    kind: "team",
    name: `Team · ${teamName}`,
    members: [...activeRoster].map<ConversationMember>((u) => ({ username: u, role: "member", status: "active", joinedAt: todayISO() })),
    source: { teamId },
    systemManaged: true,
    createdBy: "system",
    createdAt: todayISO(),
  };
  conversations = [next, ...conversations];
  persist();
  return next;
}

export function syncDivisionMembership(username: string, track: PersonnelTrack) {
  // Remove user from other division groups.
  conversations.forEach((c) => {
    if (c.kind === "division" && c.source?.track && c.source.track !== track) {
      const m = c.members.find((mm) => mm.username === username);
      if (m) m.status = "removed";
    }
  });
  let group = conversations.find((c) => c.kind === "division" && c.source?.track === track);
  if (!group) {
    group = {
      id: `conv-div-${track}`,
      kind: "division",
      name: `Division · ${track.toUpperCase()}`,
      members: [{ username, role: "member", status: "active", joinedAt: todayISO() }],
      source: { track },
      systemManaged: true,
      createdBy: "system",
      createdAt: todayISO(),
    };
    conversations = [group, ...conversations];
  } else {
    ensureMember(group, username, "member");
  }
  persist();
  return group;
}

export function getSystemChatSnapshot(): ChatReconciliationReport {
  const systemConversations = conversations.filter((c) => c.systemManaged);
  return {
    instituteGroups: systemConversations.filter((c) => c.kind === "institute").length,
    divisionGroups: systemConversations.filter((c) => c.kind === "division").length,
    teamGroups: systemConversations.filter((c) => c.kind === "team").length,
    activeMemberships: systemConversations.reduce((sum, c) => sum + c.members.filter((m) => m.status === "active").length, 0),
    removedMemberships: systemConversations.reduce((sum, c) => sum + c.members.filter((m) => m.status === "removed").length, 0),
    ranAt: todayISO(),
  };
}

// Ensures the singleton institute conversation exists.
function ensureInstituteGroup(): Conversation {
  let inst = conversations.find((c) => c.kind === "institute");
  if (!inst) {
    inst = {
      id: "conv-institute",
      kind: "institute",
      name: "Institute · All Personnel",
      members: [],
      source: { institute: true },
      systemManaged: true,
      createdBy: "system",
      createdAt: todayISO(),
    };
    conversations = [inst, ...conversations];
  }
  return inst;
}

function seedInstituteConversationHistory(inst: Conversation, personnel: PersonnelUser[]) {
  const alreadySeeded = messages.some((m) => m.conversationId === inst.id && !m.system);
  if (alreadySeeded) return;

  const roster = personnel
    .map((p) => p.username)
    .filter((u) => u !== "author")
    .slice(0, 6);
  if (roster.length < 2) return;

  const base = Date.now();
  const at = (minsAgo: number) => new Date(base - minsAgo * 60_000).toISOString();
  const sampleLines = [
    "Morning check-in complete. Field route update posted.",
    "Logistics confirms supply batch has arrived at staging.",
    "Mechanic bay reports two units are now operational.",
    "Division lead approved the revised patrol timing.",
    "Ops note: keep comms channel clear during handoff window.",
    "Reminder: submit end-of-shift summary before 20:00 UTC.",
  ];

  const seeded = sampleLines.map((text, idx) => ({
    id: `msg-inst-sample-${idx + 1}`,
    conversationId: inst.id,
    author: roster[idx % roster.length],
    text,
    createdAt: at(180 - idx * 15),
  }));
  messages = [...messages, ...seeded];
}

// Ensures one division group per track exists.
function ensureDivisionGroup(track: PersonnelTrack): Conversation {
  let group = conversations.find((c) => c.kind === "division" && c.source?.track === track);
  if (!group) {
    group = {
      id: `conv-div-${track}`,
      kind: "division",
      name: `Division · ${track.toUpperCase()}`,
      members: [],
      source: { track },
      systemManaged: true,
      createdBy: "system",
      createdAt: todayISO(),
    };
    conversations = [group, ...conversations];
  }
  return group;
}

// Big idempotent reconciler. Mirrors a future backend worker or admin action.
export function reconcileAutoMemberships(personnel: PersonnelUser[], teams: ChatTeamRoster[] = []): ChatReconciliationReport {
  const inst = ensureInstituteGroup();
  const tracks: PersonnelTrack[] = ["executive", "field", "mechanic", "logistics"];
  tracks.forEach(ensureDivisionGroup);

  // 1. Institute: every active personnel is a member.
  const activeUsers = personnel.filter((p) => (p.level as PersonnelLevel) >= 1);
  const activeUsernames = new Set(activeUsers.map((p) => p.username));
  activeUsers.forEach((p) => ensureMember(inst, p.username, "member"));
  // Soft-remove anyone in institute no longer in roster.
  inst.members.forEach((m) => {
    if (!activeUsernames.has(m.username) && m.username !== "system") m.status = "removed";
  });
  seedInstituteConversationHistory(inst, personnel);

  // 2. PL7 auto-join every division group; otherwise stay only in own track.
  for (const p of personnel) {
    const isPL7 = (p.level as PersonnelLevel) >= 7;
    for (const t of tracks) {
      const g = ensureDivisionGroup(t);
      const m = g.members.find((mm) => mm.username === p.username);
      const shouldBeMember = isPL7 || p.track === t;
      if (shouldBeMember) {
        if (!m) g.members.push({ username: p.username, role: isPL7 ? "admin" : "member", status: "active", joinedAt: todayISO() });
        else {
          m.role = isPL7 ? "admin" : "member";
          m.status = "active";
        }
      } else if (m && m.status === "active") {
        m.status = "removed";
      }
    }
  }

  // 3. Team channels follow the current management team roster.
  teams.forEach((team) => {
    const teamMembers = [team.leader, ...team.members].filter((username) => activeUsernames.has(username));
    syncTeamGroup(team.id, team.name, teamMembers);
  });

  persist();
  return getSystemChatSnapshot();
}

// -------- Subscription --------------------------------------------------

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
