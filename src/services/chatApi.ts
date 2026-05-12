import type { PersonnelTrack } from "@/lib/pl";
import type { PersonnelUser } from "@/types";
import { apiRequest, unwrapPageItems, type BackendPage } from "@/services/restClient";
import { subscribeRealtimeEvents } from "@/services/realtime";
import { invalidateNavigationBadges } from "@/services/navigationBadgesApi";

export type ConversationKind = "dm" | "group" | "team" | "division" | "institute";
export type MemberRole = "owner" | "admin" | "member";
export type MemberStatus = "active" | "invited" | "removed";

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  objectPath?: string;
  proxyUrl?: string;
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
  system?: boolean;
  replyTo?: ReplyPreview;
}

export interface ConversationMember {
  username: string;
  role: MemberRole;
  status: MemberStatus;
  invitedBy?: string;
  joinedAt: string;
  level?: number;
  personnelLevel?: number;
  track?: PersonnelTrack;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  name: string;
  members: ConversationMember[];
  source?: { teamId?: string; track?: PersonnelTrack; institute?: boolean };
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

export const CHAT_READ_KEY = "morneven_chat_last_read_v1";
export type ChatReadMap = Record<string, string>;

const EVT = "morneven:chat-changed";
const REALTIME_EVENTS = [
  "chat.message.created",
  "chat.message.updated",
  "chat.message.deleted",
  "chat.conversation.created",
  "chat.conversation.updated",
  "chat.invite.created",
  "chat.invite.resolved",
  "chat.read.updated",
  "chat.unread.updated",
  "socket.ready",
] as const;

let conversationCache: Conversation[] = [];
let inviteCache: Conversation[] = [];
const messageCache = new Map<string, ChatMessage[]>();
let unreadCountCache: Record<string, number> = {};
let releaseRealtimeBridge: (() => void) | null = null;

const todayISO = () => new Date().toISOString();
const uid = (prefix = "id") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function emitChatChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVT));
}

function ensureRealtimeBridge() {
  if (releaseRealtimeBridge || typeof window === "undefined") return;

  releaseRealtimeBridge = subscribeRealtimeEvents(
    [...REALTIME_EVENTS],
    () => {
      emitChatChanged();
    },
  );
}

function upsertConversationInto(list: Conversation[], conversation: Conversation) {
  const index = list.findIndex((item) => item.id === conversation.id);
  if (index === -1) list.unshift(conversation);
  else list[index] = conversation;
}

function upsertConversation(conversation: Conversation) {
  upsertConversationInto(conversationCache, conversation);
  inviteCache = inviteCache.filter((item) => item.id !== conversation.id);
}

function getConversationFromCache(id: string): Conversation | undefined {
  return [...conversationCache, ...inviteCache].find((conversation) => conversation.id === id);
}

function activeMembers(conversation: Conversation): ConversationMember[] {
  return conversation.members.filter((member) => member.status === "active");
}

function normalizeReconciliationReport(
  payload:
    | Partial<ChatReconciliationReport>
    | { report?: Partial<ChatReconciliationReport>; summary?: Partial<ChatReconciliationReport> }
    | null
    | undefined,
): ChatReconciliationReport {
  const report =
    payload && "report" in payload && payload.report
      ? payload.report
      : payload && "summary" in payload && payload.summary
        ? payload.summary
        : (payload as Partial<ChatReconciliationReport> | null | undefined);

  return {
    instituteGroups: Number(report?.instituteGroups ?? 0),
    divisionGroups: Number(report?.divisionGroups ?? 0),
    teamGroups: Number(report?.teamGroups ?? 0),
    activeMemberships: Number(report?.activeMemberships ?? 0),
    removedMemberships: Number(report?.removedMemberships ?? 0),
    ranAt: report?.ranAt ?? todayISO(),
  };
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
    invalidateNavigationBadges();
    emitChatChanged();
    Object.entries(next).forEach(([conversationId, lastReadAt]) => {
      apiRequest("/chat/read", {
        method: "POST",
        body: { conversationId, lastReadAt },
      }).catch(() => undefined);
    });
  } catch {
    // Ignore storage and sync failures. Chat remains usable with current UI state.
  }
}

export function listConversationsFor(_username: string): Conversation[] {
  return [...conversationCache];
}

export async function listConversationsForRemote(_username: string): Promise<Conversation[]> {
  const conversations = unwrapPageItems(
    await apiRequest<Conversation[] | BackendPage<Conversation>>("/chat/conversations"),
  );
  conversationCache = conversations;
  return conversations;
}

export function listInvitesFor(_username: string): Conversation[] {
  return [...inviteCache];
}

export async function listInvitesForRemote(_username: string): Promise<Conversation[]> {
  const invites = unwrapPageItems(
    await apiRequest<Conversation[] | BackendPage<Conversation>>("/chat/invites"),
  );
  inviteCache = invites;
  return invites;
}

export async function getConversationUnreadCountsRemote(): Promise<Record<string, number>> {
  const counts = await apiRequest<Record<string, number>>("/chat/unread-counts");
  unreadCountCache = counts ?? {};
  return unreadCountCache;
}

export function getConversation(id: string): Conversation | undefined {
  return getConversationFromCache(id);
}

export function listMessages(conversationId: string): ChatMessage[] {
  return [...(messageCache.get(conversationId) ?? [])];
}

export async function listMessagesRemote(conversationId: string): Promise<ChatMessage[]> {
  const messages = unwrapPageItems(
    await apiRequest<ChatMessage[] | BackendPage<ChatMessage>>(
      `/chat/conversations/${conversationId}/messages?page=1&pageSize=200`,
    ),
  ).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  messageCache.set(conversationId, messages);
  return messages;
}

export function getConversationUnreadCount(username: string, conversationId: string): number {
  if (typeof unreadCountCache[conversationId] === "number") {
    return unreadCountCache[conversationId];
  }

  const lastReadAt = readChatReadMap()[conversationId];
  return listMessages(conversationId).filter(
    (message) => !message.system && message.author !== username && (!lastReadAt || message.createdAt > lastReadAt),
  ).length;
}

export function getChatUnreadCount(username: string): number {
  return listConversationsFor(username).reduce(
    (total, conversation) => total + getConversationUnreadCount(username, conversation.id),
    0,
  );
}

export function getMemberRole(conversation: Conversation, username: string): MemberRole | null {
  const member = conversation.members.find(
    (item) => item.username === username && item.status === "active",
  );
  return member?.role ?? null;
}

export function canManage(conversation: Conversation, username: string): boolean {
  const role = getMemberRole(conversation, username);
  return role === "owner" || role === "admin";
}

export function sendMessage(
  conversationId: string,
  author: string,
  text: string,
  attachments?: ChatAttachment[],
  replyTo?: ReplyPreview,
): ChatMessage {
  const message: ChatMessage = {
    id: uid("msg"),
    conversationId,
    author,
    text,
    createdAt: todayISO(),
    attachments,
    replyTo,
  };
  const current = messageCache.get(conversationId) ?? [];
  messageCache.set(conversationId, [...current, message]);
  emitChatChanged();
  return message;
}

export async function sendMessageRemote(
  conversationId: string,
  text: string,
  attachments?: ChatAttachment[],
  replyTo?: ReplyPreview,
): Promise<ChatMessage> {
  const message = await apiRequest<ChatMessage>("/chat/messages", {
    method: "POST",
    body: {
      conversationId,
      text,
      attachments: attachments ?? [],
      ...(replyTo ? { replyTo } : {}),
    },
  });
  const current = messageCache.get(conversationId) ?? [];
  messageCache.set(conversationId, [...current, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  unreadCountCache[conversationId] = 0;
  emitChatChanged();
  return message;
}

export function updateMessage(
  messageId: string,
  updater: (message: ChatMessage) => ChatMessage,
): ChatMessage | null {
  for (const [conversationId, messages] of messageCache.entries()) {
    const index = messages.findIndex((message) => message.id === messageId);
    if (index === -1) continue;
    const next = [...messages];
    next[index] = updater(next[index]);
    messageCache.set(conversationId, next);
    emitChatChanged();
    return next[index];
  }
  return null;
}

export async function editMessageRemote(messageId: string, text: string): Promise<ChatMessage> {
  const message = await apiRequest<ChatMessage>(`/chat/messages/${messageId}`, {
    method: "PUT",
    body: { text },
  });
  updateMessage(messageId, () => message);
  return message;
}

export function buildReplyPreview(message: ChatMessage): ReplyPreview {
  return {
    messageId: message.id,
    author: message.author,
    text: message.text,
    hasAttachments: Boolean(message.attachments?.length),
  };
}

export function deleteMessage(messageId: string, _actor: string): boolean {
  for (const [conversationId, messages] of messageCache.entries()) {
    const next = messages.filter((message) => message.id !== messageId);
    if (next.length !== messages.length) {
      messageCache.set(conversationId, next);
      emitChatChanged();
      return true;
    }
  }
  return false;
}

export async function deleteMessageRemote(messageId: string): Promise<boolean> {
  await apiRequest(`/chat/messages/${messageId}`, { method: "DELETE" });
  deleteMessage(messageId, "system");
  return true;
}

export function createDM(a: string, b: string): Conversation {
  const conversation: Conversation = {
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
  upsertConversation(conversation);
  emitChatChanged();
  return conversation;
}

export function createDMRemote(username: string): Promise<Conversation> {
  return apiRequest<Conversation>("/chat/dm", {
    method: "POST",
    body: { username },
  }).then((conversation) => {
    upsertConversation(conversation);
    emitChatChanged();
    return conversation;
  });
}

export function createManualGroup(name: string, creator: string, invitees: string[]): Conversation {
  const conversation: Conversation = {
    id: uid("conv"),
    kind: "group",
    name,
    members: [
      { username: creator, role: "owner", status: "active", joinedAt: todayISO() },
      ...invitees.map((username) => ({
        username,
        role: "member" as MemberRole,
        status: "invited" as MemberStatus,
        invitedBy: creator,
        joinedAt: todayISO(),
      })),
    ],
    createdBy: creator,
    createdAt: todayISO(),
  };
  upsertConversationInto(inviteCache, conversation);
  emitChatChanged();
  return conversation;
}

export function createManualGroupRemote(name: string, invitees: string[]): Promise<Conversation> {
  return apiRequest<Conversation>("/chat/groups", {
    method: "POST",
    body: { name, invitees },
  }).then((conversation) => {
    upsertConversation(conversation);
    emitChatChanged();
    return conversation;
  });
}

export function inviteMembers(conversationId: string, actor: string, usernames: string[]): boolean {
  const conversation = getConversationFromCache(conversationId);
  if (!conversation) return false;
  const existing = new Map(conversation.members.map((member) => [member.username, member]));
  usernames.forEach((username) => {
    existing.set(username, {
      username,
      role: existing.get(username)?.role ?? "member",
      status: "invited",
      invitedBy: actor,
      joinedAt: existing.get(username)?.joinedAt ?? todayISO(),
      track: existing.get(username)?.track,
      level: existing.get(username)?.level,
      personnelLevel: existing.get(username)?.personnelLevel,
    });
  });
  conversation.members = [...existing.values()];
  upsertConversationInto(inviteCache, conversation);
  emitChatChanged();
  return true;
}

export async function inviteMembersRemote(conversationId: string, usernames: string[]): Promise<boolean> {
  const updated = await apiRequest<Conversation>(`/chat/conversations/${conversationId}/invites`, {
    method: "POST",
    body: { usernames },
  });
  upsertConversation(updated);
  emitChatChanged();
  return true;
}

export function acceptInvite(conversationId: string, username: string): boolean {
  const conversation = inviteCache.find((item) => item.id === conversationId);
  if (!conversation) return false;
  conversation.members = conversation.members.map((member) =>
    member.username === username ? { ...member, status: "active" } : member,
  );
  upsertConversation(conversation);
  inviteCache = inviteCache.filter((item) => item.id !== conversationId);
  emitChatChanged();
  return true;
}

export async function acceptInviteRemote(conversationId: string): Promise<boolean> {
  const updated = await apiRequest<Conversation>(`/chat/conversations/${conversationId}/invites/accept`, {
    method: "POST",
  });
  upsertConversation(updated);
  inviteCache = inviteCache.filter((item) => item.id !== conversationId);
  emitChatChanged();
  return true;
}

export function rejectInvite(conversationId: string, username: string): boolean {
  const conversation = inviteCache.find((item) => item.id === conversationId);
  if (!conversation) return false;
  conversation.members = conversation.members.map((member) =>
    member.username === username ? { ...member, status: "removed" } : member,
  );
  inviteCache = inviteCache.filter((item) => item.id !== conversationId);
  emitChatChanged();
  return true;
}

export async function rejectInviteRemote(conversationId: string): Promise<boolean> {
  await apiRequest(`/chat/conversations/${conversationId}/invites/reject`, {
    method: "POST",
  });
  inviteCache = inviteCache.filter((item) => item.id !== conversationId);
  emitChatChanged();
  return true;
}

export function kickMember(conversationId: string, _actor: string, target: string): boolean {
  const conversation = getConversationFromCache(conversationId);
  if (!conversation) return false;
  conversation.members = conversation.members.map((member) =>
    member.username === target ? { ...member, status: "removed" } : member,
  );
  upsertConversation(conversation);
  emitChatChanged();
  return true;
}

export async function kickMemberRemote(conversationId: string, target: string): Promise<boolean> {
  const updated = await apiRequest<Conversation>(`/chat/conversations/${conversationId}/kick`, {
    method: "POST",
    body: { username: target },
  });
  upsertConversation(updated);
  emitChatChanged();
  return true;
}

export function leaveConversation(conversationId: string, username: string): boolean {
  const conversation = getConversationFromCache(conversationId);
  if (!conversation) return false;
  conversation.members = conversation.members.map((member) =>
    member.username === username ? { ...member, status: "removed" } : member,
  );
  conversationCache = conversationCache.filter((item) => item.id !== conversationId);
  emitChatChanged();
  return true;
}

export async function leaveConversationRemote(conversationId: string): Promise<boolean> {
  await apiRequest(`/chat/conversations/${conversationId}/leave`, {
    method: "POST",
  });
  conversationCache = conversationCache.filter((item) => item.id !== conversationId);
  messageCache.delete(conversationId);
  delete unreadCountCache[conversationId];
  invalidateNavigationBadges();
  emitChatChanged();
  return true;
}

export function setMemberRole(
  conversationId: string,
  _actor: string,
  target: string,
  role: MemberRole,
): boolean {
  const conversation = getConversationFromCache(conversationId);
  if (!conversation) return false;
  conversation.members = conversation.members.map((member) =>
    member.username === target ? { ...member, role } : member,
  );
  upsertConversation(conversation);
  emitChatChanged();
  return true;
}

export async function setMemberRoleRemote(
  conversationId: string,
  target: string,
  role: MemberRole,
): Promise<boolean> {
  const updated = await apiRequest<Conversation>(`/chat/conversations/${conversationId}/member-role`, {
    method: "PUT",
    body: { username: target, role },
  });
  upsertConversation(updated);
  emitChatChanged();
  return true;
}

export function renameConversation(conversationId: string, _actor: string, name: string): boolean {
  const conversation = getConversationFromCache(conversationId);
  if (!conversation) return false;
  conversation.name = name;
  upsertConversation(conversation);
  emitChatChanged();
  return true;
}

export async function renameConversationRemote(conversationId: string, name: string): Promise<boolean> {
  const updated = await apiRequest<Conversation>(`/chat/conversations/${conversationId}/name`, {
    method: "PUT",
    body: { name },
  });
  upsertConversation(updated);
  emitChatChanged();
  return true;
}

export function syncTeamGroup(teamId: string, teamName: string, members: string[]): Conversation {
  const existing = getConversationFromCache(`conv-team-${teamId}`);
  const conversation: Conversation = {
    id: `conv-team-${teamId}`,
    kind: "team",
    name: `Team - ${teamName}`,
    source: { teamId },
    systemManaged: true,
    createdBy: existing?.createdBy ?? "system",
    createdAt: existing?.createdAt ?? todayISO(),
    members: members.map((username) => ({
      username,
      role: "member",
      status: "active",
      joinedAt: todayISO(),
    })),
  };
  upsertConversation(conversation);
  emitChatChanged();
  return conversation;
}

export function syncDivisionMembership(_username: string, _track: PersonnelTrack) {
  emitChatChanged();
}

export function getSystemChatSnapshot(): ChatReconciliationReport {
  return getSystemChatSnapshotFromConversations(conversationCache);
}

export function getSystemChatSnapshotFromConversations(source: Conversation[]): ChatReconciliationReport {
  return {
    instituteGroups: source.filter((conversation) => conversation.systemManaged && conversation.kind === "institute").length,
    divisionGroups: source.filter((conversation) => conversation.systemManaged && conversation.kind === "division").length,
    teamGroups: source.filter((conversation) => conversation.systemManaged && conversation.kind === "team").length,
    activeMemberships: source.reduce((total, conversation) => total + activeMembers(conversation).length, 0),
    removedMemberships: source.reduce(
      (total, conversation) => total + conversation.members.filter((member) => member.status === "removed").length,
      0,
    ),
    ranAt: todayISO(),
  };
}

export async function getSystemChatSnapshotRemote(): Promise<ChatReconciliationReport> {
  return apiRequest<Partial<ChatReconciliationReport>>("/chat/reconcile/status")
    .then((data) => normalizeReconciliationReport(data))
    .catch(() => getSystemChatSnapshot());
}

export function reconcileSystemChatGroupsRemote(): Promise<ChatReconciliationReport> {
  return apiRequest<Partial<ChatReconciliationReport>>("/chat/reconcile", { method: "POST" })
    .then((data) => normalizeReconciliationReport(data));
}

export function reconcileAutoMemberships(
  _personnel: PersonnelUser[],
  _teams: ChatTeamRoster[] = [],
): ChatReconciliationReport {
  return getSystemChatSnapshot();
}

export function subscribeChat(cb: () => void): () => void {
  ensureRealtimeBridge();
  if (typeof window === "undefined") return () => undefined;
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  window.addEventListener("focus", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener("focus", handler);
  };
}
