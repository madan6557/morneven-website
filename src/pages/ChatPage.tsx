import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listPersonnel } from "@/services/personnelApi";
import { pushNotification } from "@/services/notificationsApi";
import {
  listConversationsFor,
  listConversationsForRemote,
  listInvitesFor,
  listInvitesForRemote,
  listMessages,
  listMessagesRemote,
  sendMessage,
  sendMessageRemote,
  deleteMessage,
  deleteMessageRemote,
  createDM,
  createDMRemote,
  createManualGroup,
  createManualGroupRemote,
  inviteMembers,
  inviteMembersRemote,
  acceptInvite,
  acceptInviteRemote,
  rejectInvite,
  rejectInviteRemote,
  kickMember,
  kickMemberRemote,
  leaveConversation,
  leaveConversationRemote,
  setMemberRole,
  setMemberRoleRemote,
  renameConversation,
  renameConversationRemote,
  reconcileAutoMemberships,
  canManage,
  getMemberRole,
  getConversationUnreadCount,
  readChatReadMap,
  subscribeChat,
  buildReplyPreview,
  writeChatReadMap,
  type Conversation,
  type ChatMessage,
  type ChatAttachment,
  type ChatReadMap,
  type MemberRole,
  type ReplyPreview,
} from "@/services/chatApi";
import { apiUpload, isDemoFallbackEnabled } from "@/services/api";
import type { PersonnelUser } from "@/types";
import {
  Send,
  Plus,
  Users,
  MessageSquare,
  Hash,
  Layers,
  Building2,
  Paperclip,
  X,
  Settings,
  Crown,
  Shield,
  UserMinus,
  LogOut,
  Inbox,
  Trash2,
  Download,
  Check,
  Reply,
  CornerDownRight,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { PERSONNEL_TRACKS } from "@/lib/pl";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB demo cap
function fileToAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: String(reader.result),
      });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fileToAttachmentRemote(file: File): Promise<ChatAttachment> {
  try {
    const uploaded = await apiUpload<{
      url?: string;
      objectPath?: string;
      contentType?: string;
      size?: number;
    }>(`/files/upload?folder=chat`, file);

    return {
      id: uploaded.objectPath ?? `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      mimeType: uploaded.contentType ?? file.type ?? "application/octet-stream",
      size: uploaded.size ?? file.size,
      dataUrl: uploaded.url ?? "",
    };
  } catch {
    return fileToAttachment(file);
  }
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const KIND_ICON: Record<Conversation["kind"], typeof MessageSquare> = {
  dm: MessageSquare,
  group: Hash,
  team: Users,
  division: Layers,
  institute: Building2,
};

const MESSAGE_THEME_BY_LEVEL: Record<number, string> = {
  0: "bg-zinc-500/10 border-zinc-500/25",
  1: "bg-sky-500/10 border-sky-500/25",
  2: "bg-emerald-500/10 border-emerald-500/25",
  3: "bg-cyan-500/10 border-cyan-500/25",
  4: "bg-amber-500/10 border-amber-500/30",
  5: "bg-orange-500/10 border-orange-500/30",
  6: "bg-rose-500/10 border-rose-500/30",
  7: "bg-primary/15 border-primary/35",
};

const MESSAGE_ACCENT_BY_LEVEL: Record<number, string> = {
  0: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
  1: "text-sky-400 border-sky-500/30 bg-sky-500/10",
  2: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  3: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  4: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  5: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  6: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  7: "text-primary border-primary/40 bg-primary/10",
};

function trackShort(track?: PersonnelUser["track"]) {
  return PERSONNEL_TRACKS.find((item) => item.key === track)?.short ?? track?.toUpperCase() ?? "UNK";
}

function messageThemeFor(person?: PersonnelUser) {
  const level = person?.level ?? 0;
  return MESSAGE_THEME_BY_LEVEL[level] ?? MESSAGE_THEME_BY_LEVEL[0];
}

function messageBadgeThemeFor(person?: PersonnelUser) {
  const level = person?.level ?? 0;
  return MESSAGE_ACCENT_BY_LEVEL[level] ?? MESSAGE_ACCENT_BY_LEVEL[0];
}

export default function ChatPage() {
  const { username, isAuthenticated, role } = useAuth();

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [invites, setInvites] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelUser[]>([]);

  // Dialogs
  const [dialog, setDialog] = useState<"dm" | "group" | "settings" | "invites" | null>(null);
  const [newName, setNewName] = useState("");
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [dmTarget, setDmTarget] = useState("");
  const [inviteSelection, setInviteSelection] = useState<string[]>([]);
  const [renameValue, setRenameValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationScrollRootRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const shouldScrollToLatestRef = useRef(false);
  const pendingOpenScrollRef = useRef(false);
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [readMap, setReadMap] = useState<ChatReadMap>(() => readChatReadMap());
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const nearBottomRef = useRef(true);
  const lastMessagesLenRef = useRef(0);
  const lastActiveRef = useRef<string | null>(null);
  const SCROLL_POS_KEY = "chat:scrollPositions";
  const NEAR_BOTTOM_THRESHOLD = 120;

  const readScrollPositions = (): Record<string, number> => {
    try {
      return JSON.parse(localStorage.getItem(SCROLL_POS_KEY) || "{}");
    } catch {
      return {};
    }
  };
  const writeScrollPosition = (convId: string, top: number) => {
    try {
      const map = readScrollPositions();
      map[convId] = top;
      localStorage.setItem(SCROLL_POS_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  };

  const getConversationViewport = () =>
    conversationScrollRootRef.current?.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]") ?? null;

  const scrollConversationToBottom = (behavior: ScrollBehavior = "smooth") => {
    const viewport = getConversationViewport();
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  };

  const scrollMessageIntoView = (id: string, block: "center" | "start" = "center") => {
    const viewport = getConversationViewport();
    const el = messageRefs.current[id];
    if (!viewport || !el) return false;
    const viewportRect = viewport.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offsetWithinViewport = elRect.top - viewportRect.top;
    const centeredTop =
      viewport.scrollTop + offsetWithinViewport - viewport.clientHeight / 2 + el.clientHeight / 2;
    const startTop = viewport.scrollTop + offsetWithinViewport;
    viewport.scrollTo({
      top: block === "center" ? centeredTop : startTop,
      behavior: "smooth",
    });
    return true;
  };

  // Boot: reconcile PL7 + institute auto memberships once personnel loads.
  useEffect(() => {
    listPersonnel().then((roster) => {
      setPersonnel(roster);
      reconcileAutoMemberships(roster);
    });
  }, []);

  const refresh = () => {
    if (!isAuthenticated) return;

    if (isDemoFallbackEnabled()) {
      const visibleConvs = listConversationsFor(username);
      setConvs(visibleConvs);
      setInvites(listInvitesFor(username));
      if (active) {
        setMessages(listMessages(active));
      } else if (visibleConvs.length > 0) {
        const firstId = visibleConvs[0].id;
        setActive((prev) => prev ?? firstId);
        setMessages(listMessages(firstId));
      } else {
        setMessages([]);
      }
    }

    listInvitesForRemote(username).then(setInvites).catch(() => undefined);
    listConversationsForRemote(username)
      .then((remoteConvs) => {
        setConvs(remoteConvs);
        const targetId = active ?? remoteConvs[0]?.id;
        if (!targetId) {
          setMessages([]);
          return;
        }
        setActive((prev) => prev ?? targetId);
        listMessagesRemote(targetId).then(setMessages).catch(() => undefined);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    refresh();
    return subscribeChat(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, active, isAuthenticated]);

  // Clear pending reply when switching conversations.
  useEffect(() => {
    setReplyTo(null);
    pendingOpenScrollRef.current = !!active;
  }, [active]);

  // Scroll behavior:
  // 1) after sending -> scroll to latest
  // 2) when opening conversation -> restore saved position, else oldest unread, else bottom
  // 3) on new incoming messages -> auto-scroll only if user is near the bottom
  useEffect(() => {
    if (!active || messages.length === 0) return;

    const isNewConversation = lastActiveRef.current !== active;
    const prevLen = lastMessagesLenRef.current;
    lastMessagesLenRef.current = messages.length;
    lastActiveRef.current = active;

    if (shouldScrollToLatestRef.current) {
      scrollConversationToBottom("smooth");
      shouldScrollToLatestRef.current = false;
      nearBottomRef.current = true;
      markConversationRead(active, messages);
      return;
    }

    if (pendingOpenScrollRef.current || isNewConversation) {
      const saved = readScrollPositions()[active];
      const viewport = getConversationViewport();

      if (typeof saved === "number" && viewport) {
        // Restore previously saved scroll position.
        requestAnimationFrame(() => {
          viewport.scrollTo({ top: saved, behavior: "auto" });
          const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
          nearBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
          setShowJumpToLatest(distanceFromBottom > NEAR_BOTTOM_THRESHOLD);
        });
      } else {
        const lastReadAt = readMap[active];
        const oldestUnread = messages.find(
          (m) => !m.system && m.author !== username && (!lastReadAt || m.createdAt > lastReadAt),
        );

        if (oldestUnread) {
          const didScroll = scrollMessageIntoView(oldestUnread.id, "center");
          if (didScroll) {
            setHighlightId(oldestUnread.id);
            window.setTimeout(
              () => setHighlightId((cur) => (cur === oldestUnread.id ? null : cur)),
              1600,
            );
          }
        } else {
          scrollConversationToBottom("auto");
          nearBottomRef.current = true;
        }
      }

      pendingOpenScrollRef.current = false;
      return;
    }

    // New messages arrived in the same conversation.
    if (messages.length > prevLen && nearBottomRef.current) {
      scrollConversationToBottom("smooth");
      markConversationRead(active, messages);
    }
  }, [active, messages, readMap, username]);

  // Track scroll position to show "jump to latest" button + persist position.
  useEffect(() => {
    const viewport = getConversationViewport();
    if (!viewport || !active) return;
    const onScroll = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      const near = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
      nearBottomRef.current = near;
      setShowJumpToLatest(!near);
      writeScrollPosition(active, viewport.scrollTop);
    };
    onScroll();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [active, messages.length]);

  const activeConv = useMemo(() => convs.find((c) => c.id === active) ?? null, [convs, active]);
  const myRole: MemberRole | null = activeConv ? getMemberRole(activeConv, username) : null;
  const iCanManage = activeConv ? canManage(activeConv, username) : false;
  const personnelByUsername = useMemo(
    () => new Map(personnel.map((person) => [person.username, person])),
    [personnel],
  );

  // Demo helper: for institute channel, pre-mark roughly half history as read
  // on first open so unread auto-scroll behavior is easy to verify.
  useEffect(() => {
    if (!activeConv || activeConv.kind !== "institute") return;
    if (readMap[activeConv.id]) return;
    const peerMessages = messages.filter((m) => !m.system && m.author !== username);
    if (peerMessages.length < 2) return;
    const midpoint = Math.floor(peerMessages.length / 2) - 1;
    const pivot = peerMessages[Math.max(0, midpoint)];
    if (!pivot) return;
    const next = { ...readMap, [activeConv.id]: pivot.createdAt };
    writeChatReadMap(next);
    setReadMap(next);
  }, [activeConv, messages, readMap, username]);

  if (!isAuthenticated) {
    return <div className="p-8 text-muted-foreground">Login to use chat.</div>;
  }

  if (role === "guest") {
    return (
      <div className="p-8 space-y-3">
        <h1 className="font-display text-xl tracking-[0.1em] text-primary">CHAT</h1>
        <p className="text-sm text-muted-foreground">Guest accounts cannot access Chat.</p>
      </div>
    );
  }

  // -------- Handlers ----------------------------------------------------

  async function handleSend() {
    if (!active) return;
    if (!input.trim() && pendingFiles.length === 0) return;

    let attachments: ChatAttachment[] | undefined;
    if (pendingFiles.length) {
      attachments = await Promise.all(pendingFiles.map(fileToAttachmentRemote));
    }
    const msg = isDemoFallbackEnabled()
      ? sendMessage(active, username, input.trim(), attachments, replyTo ?? undefined)
      : await sendMessageRemote(active, input.trim(), attachments, replyTo ?? undefined);
    shouldScrollToLatestRef.current = true;
    setInput("");
    setPendingFiles([]);
    setReplyTo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const conv = activeConv ?? listConversationsFor(username).find((c) => c.id === active);
    conv?.members
      .filter((m) => m.username !== username && m.status === "active")
      .forEach((m) =>
        pushNotification({
          kind: "info",
          title: `New message in ${conv.name}`,
          body: `${username}: ${msg.text.slice(0, 80) || "[attachment]"}`,
          recipient: m.username,
          sender: username,
          link: "/chat",
        }),
      );
    refresh();
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const valid: File[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > MAX_FILE_BYTES) {
        toast({ title: "File too large", description: `${f.name} exceeds 5 MB demo cap.`, variant: "destructive" });
        return;
      }
      valid.push(f);
    });
    setPendingFiles((prev) => [...prev, ...valid]);
  }

  async function handleCreate() {
    if (dialog === "dm" && dmTarget && dmTarget !== username) {
      const c = isDemoFallbackEnabled() ? createDM(username, dmTarget) : await createDMRemote(dmTarget);
      setActive(c.id);
    } else if (dialog === "group" && newName.trim() && newMembers.length > 0) {
      const c = isDemoFallbackEnabled()
        ? createManualGroup(newName.trim(), username, newMembers)
        : await createManualGroupRemote(newName.trim(), newMembers);
      setActive(c.id);
      newMembers.forEach((m) =>
        pushNotification({
          kind: "request",
          title: `Group invite: ${newName.trim()}`,
          body: `${username} invited you to a group.`,
          recipient: m,
          sender: username,
          link: "/chat",
        }),
      );
    }
    closeDialog();
  }

  function closeDialog() {
    setDialog(null);
    setNewName("");
    setNewMembers([]);
    setDmTarget("");
    setInviteSelection([]);
    setRenameValue("");
  }

  async function handleInviteMore() {
    if (!activeConv || inviteSelection.length === 0) return;
    if (isDemoFallbackEnabled()) inviteMembers(activeConv.id, username, inviteSelection);
    else await inviteMembersRemote(activeConv.id, inviteSelection);
    inviteSelection.forEach((m) =>
      pushNotification({
        kind: "request",
        title: `Invite: ${activeConv.name}`,
        body: `${username} invited you to ${activeConv.name}.`,
        recipient: m,
        sender: username,
        link: "/chat",
      }),
    );
    setInviteSelection([]);
    refresh();
  }

  async function handleRename() {
    if (!activeConv || !renameValue.trim()) return;
    if (isDemoFallbackEnabled()) renameConversation(activeConv.id, username, renameValue.trim());
    else await renameConversationRemote(activeConv.id, renameValue.trim());
    setRenameValue("");
    refresh();
  }

  async function handleAcceptInvite(id: string) {
    const accepted = isDemoFallbackEnabled() ? acceptInvite(id, username) : await acceptInviteRemote(id);
    if (accepted) {
      setActive(id);
      setDialog(null);
    }
  }
  async function handleRejectInvite(id: string) {
    if (isDemoFallbackEnabled()) rejectInvite(id, username);
    else await rejectInviteRemote(id);
    refresh();
  }

  // Scroll to a quoted message and briefly highlight it.
  function jumpToMessage(id: string) {
    const didScroll = scrollMessageIntoView(id, "center");
    if (!didScroll) return;
    setHighlightId(id);
    window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1600);
  }

  // -------- Render ------------------------------------------------------

  const eligibleToInvite = personnel
    .filter((p) => p.username !== username)
    .filter((p) => !activeConv?.members.some((m) => m.username === p.username && m.status !== "removed"));
  const markConversationRead = (conversationId: string, source: ChatMessage[]) => {
    const latestSeen = source[source.length - 1]?.createdAt;
    if (!latestSeen) return;
    setReadMap((prev) => {
      if (prev[conversationId] === latestSeen) return prev;
      const next = { ...prev, [conversationId]: latestSeen };
      writeChatReadMap(next);
      return next;
    });
  };
  const getUnreadCount = (conversationId: string) => {
    return getConversationUnreadCount(username, conversationId);
  };
  const markActiveConversationRead = () => {
    if (!active) return;
    const currentMessages = messages.length > 0 ? messages : listMessages(active);
    markConversationRead(active, currentMessages);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl tracking-[0.1em] text-primary">CHAT</h1>
          <div className="mecha-line w-32 mt-2" />
          <p className="text-xs font-body text-muted-foreground mt-2">
            Direct messages, manual groups, auto-synced team / division channels, and the institute-wide channel.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialog("invites")}
          className="font-display tracking-wider text-[10px] gap-1"
        >
          <Inbox className="h-3.5 w-3.5" /> INVITES
          {invites.length > 0 && (
            <span className="ml-1 px-1.5 rounded-full bg-primary text-primary-foreground text-[9px]">{invites.length}</span>
          )}
        </Button>
      </div>

      <div className="grid grid-rows-[180px_minmax(0,1fr)] md:grid-rows-1 md:grid-cols-[300px_minmax(0,1fr)] gap-4 h-[calc(100dvh-6.5rem)] min-h-0 md:h-[72vh] md:min-h-[620px] max-h-[900px]">
        {/* Sidebar */}
        <div className="hud-border bg-card p-3 space-y-3 h-full flex flex-col">
          <div className="flex gap-1">
            <button
              onClick={() => setDialog("dm")}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-display tracking-wider border border-primary text-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="h-3 w-3" /> DM
            </button>
            <button
              onClick={() => setDialog("group")}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-display tracking-wider border border-primary text-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="h-3 w-3" /> GROUP
            </button>
          </div>

          <ScrollArea className="flex-1 min-h-0 pt-2">
            <div className="space-y-1 pr-2">
              {convs.length === 0 && (
                <p className="text-[11px] text-muted-foreground font-body italic px-2">No conversations.</p>
              )}
              {convs.map((c) => {
                const Icon = KIND_ICON[c.kind];
                const activeCount = c.members.filter((m) => m.status === "active").length;
                const unreadCount = getUnreadCount(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setActive(c.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-sm transition-colors ${
                      active === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-sm font-heading truncate flex-1">{c.name}</span>
                    {unreadCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-display">
                        {unreadCount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[9px] text-muted-foreground">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                    <span className="text-[9px] font-display uppercase text-muted-foreground">{activeCount}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Conversation */}
        <div className="hud-border bg-card flex flex-col h-full overflow-hidden relative">
          {activeConv ? (
            <>
              <div className="px-4 py-2 border-b border-border flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-base text-foreground truncate">{activeConv.name}</p>
                    {activeConv.systemManaged && (
                      <Badge variant="outline" className="text-[9px] font-display tracking-wider">AUTO</Badge>
                    )}
                    {myRole && (
                      <Badge className="text-[9px] font-display tracking-wider gap-1">
                        {myRole === "owner" ? <Crown className="h-2.5 w-2.5" /> : myRole === "admin" ? <Shield className="h-2.5 w-2.5" /> : null}
                        {myRole.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-body truncate">
                    {activeConv.members
                      .filter((m) => m.status === "active")
                      .map((m) => m.username)
                      .join(", ")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDialog("settings")} className="h-8">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </div>

              <ScrollArea ref={conversationScrollRootRef} className="flex-1 min-h-0">
                <div className="p-4 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center">No messages yet.</p>
                  ) : (
                    messages.map((m) => {
                    if (m.system) {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <span className="text-[10px] font-display tracking-wider text-muted-foreground italic px-2">
                            {m.text}
                          </span>
                        </div>
                      );
                    }
                    const mine = m.author === username;
                    const canDelete = mine || iCanManage;
                    const isHighlighted = highlightId === m.id;
                    const authorPersonnel = personnelByUsername.get(m.author);
                    const authorLevel = authorPersonnel?.level ?? 0;
                    const authorTrack = trackShort(authorPersonnel?.track);
                    const bubbleTheme = messageThemeFor(authorPersonnel);
                    const badgeTheme = messageBadgeThemeFor(authorPersonnel);
                    const messageIsUnread =
                      !m.system &&
                      m.author !== username &&
                      activeConv &&
                      (!readMap[activeConv.id] || m.createdAt > readMap[activeConv.id]);
                    return (
                      <div
                        key={m.id}
                        ref={(el) => { messageRefs.current[m.id] = el; }}
                        className={`flex group ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`w-fit max-w-[85%] md:max-w-[80%] rounded-md border px-3 py-2 text-sm text-foreground transition-shadow ${bubbleTheme} ${mine ? "shadow-[inset_3px_0_0_hsl(var(--primary)/0.55)]" : ""} ${isHighlighted ? "ring-2 ring-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-1">
                              <p className="font-heading text-[10px] leading-4 tracking-wider text-foreground">{m.author}</p>
                              <span className={`rounded-sm border px-1 py-0 text-[8px] leading-4 font-display tracking-wider ${badgeTheme}`}>
                                PL{authorLevel}
                              </span>
                              <span className={`rounded-sm border px-1 py-0 text-[8px] leading-4 font-display tracking-wider ${badgeTheme}`}>
                                {authorTrack}
                              </span>
                              <span className="text-[8px] leading-4 font-display tracking-wider text-muted-foreground">
                                {new Date(m.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            {!mine && (
                              <span className={`text-[8px] leading-4 font-display tracking-wider ${messageIsUnread ? "text-destructive" : "text-muted-foreground"}`}>
                                {messageIsUnread ? "UNREAD" : "READ"}
                              </span>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <button
                                onClick={() => setReplyTo(buildReplyPreview(m))}
                                className="text-muted-foreground hover:text-primary"
                                aria-label="Reply to message"
                                title="Reply"
                              >
                                <Reply className="h-3 w-3" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={async () => {
                                    if (isDemoFallbackEnabled()) deleteMessage(m.id, username);
                                    else await deleteMessageRemote(m.id);
                                    refresh();
                                  }}
                                  className="text-muted-foreground hover:text-destructive"
                                  aria-label="Delete message"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          {m.replyTo && (
                            <button
                              type="button"
                              onClick={() => jumpToMessage(m.replyTo!.messageId)}
                              className="w-full text-left mb-1 border-l-2 border-primary/70 bg-background/40 hover:bg-background/60 transition-colors rounded-sm px-2 py-1"
                            >
                              <p className="text-xs font-display tracking-wider text-primary truncate">
                                ↳ {m.replyTo.author}
                              </p>
                              <p className="text-xs font-body text-muted-foreground line-clamp-2">
                                {m.replyTo.text || (m.replyTo.hasAttachments ? "[attachment]" : "")}
                              </p>
                            </button>
                          )}
                          {m.text && <p className="font-body whitespace-pre-wrap break-words">{m.text}</p>}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                              {m.attachments.map((a) => {
                                const isImg = a.mimeType.startsWith("image/");
                                return (
                                  <div key={a.id} className="border border-border/60 rounded-sm bg-background/40 p-1.5">
                                    {isImg ? (
                                      <img src={a.dataUrl} alt={a.name} className="max-h-48 rounded-sm" />
                                    ) : null}
                                    <div className="flex items-start justify-between gap-2 mt-1">
                                      <span className="flex-1 min-w-0 pr-1 text-xs font-body break-all whitespace-normal">
                                        {a.name} <span className="text-muted-foreground">({formatBytes(a.size)})</span>
                                      </span>
                                      <a
                                        href={a.dataUrl}
                                        download={a.name}
                                        className="text-primary hover:text-primary/80 flex-shrink-0"
                                      >
                                        <Download className="h-3 w-3" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    })
                  )}
                </div>
              </ScrollArea>

              {showJumpToLatest && (
                <button
                  type="button"
                  onClick={() => {
                    scrollConversationToBottom("smooth");
                    if (active) markConversationRead(active, messages);
                  }}
                  className="absolute right-4 bottom-24 z-10 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90"
                  aria-label="Scroll to latest message"
                  title="Jump to latest"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}

              {/* Pending attachments preview */}
              {pendingFiles.length > 0 && (
                <div className="px-3 py-2 border-t border-border flex flex-wrap gap-1.5">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-sm text-[10px] font-body">
                      <Paperclip className="h-3 w-3" />
                      <span className="max-w-[160px] truncate">{f.name}</span>
                      <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                      <button
                        onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending reply banner (WhatsApp-style) */}
              {replyTo && (
                <div className="px-3 py-2 border-t border-border flex items-start gap-2 bg-muted/40">
                  <CornerDownRight className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
                    <p className="text-xs font-display tracking-wider text-primary">
                      Replying to {replyTo.author}
                    </p>
                    <p className="text-xs font-body text-muted-foreground line-clamp-2">
                      {replyTo.text || (replyTo.hasAttachments ? "[attachment]" : "")}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                    aria-label="Cancel reply"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="p-2 border-t border-border flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-2"
                  aria-label="Attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 text-sm px-3 py-2 bg-background border border-border rounded-sm"
                />
                <button
                  onClick={handleSend}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-sm hover:opacity-90"
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              Select or start a conversation.
            </div>
          )}
        </div>
      </div>

      {/* DM dialog */}
      <Dialog open={dialog === "dm"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">START DIRECT MESSAGE</DialogTitle>
          </DialogHeader>
          <select
            value={dmTarget}
            onChange={(e) => setDmTarget(e.target.value)}
            className="w-full text-sm px-3 py-2 bg-background border border-border rounded-sm"
          >
            <option value="">Select a user…</option>
            {personnel.filter((p) => p.username !== username).map((p) => (
              <option key={p.id} value={p.username}>
                {p.username} - {p.role} (PL{p.level} {p.track})
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!dmTarget}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group dialog */}
      <Dialog open={dialog === "group"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">CREATE GROUP</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Group name"
            />
            <div>
              <p className="text-[10px] font-display tracking-wider text-muted-foreground mb-1">INVITE PERSONNEL</p>
              <ScrollArea className="h-48 border border-border rounded-sm p-2">
                <div className="space-y-1">
                  {personnel.filter((p) => p.username !== username).map((p) => {
                    const checked = newMembers.includes(p.username);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setNewMembers((prev) =>
                            prev.includes(p.username) ? prev.filter((u) => u !== p.username) : [...prev, p.username],
                          )
                        }
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs ${
                          checked ? "bg-primary/15 text-primary" : "hover:bg-muted"
                        }`}
                      >
                        <span>
                          {p.username} <span className="text-muted-foreground">- PL{p.level} {p.track}</span>
                        </span>
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || newMembers.length === 0}>
              Create & Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invites inbox */}
      <Dialog open={dialog === "invites"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">PENDING INVITES</DialogTitle>
          </DialogHeader>
          {invites.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No pending invites.</p>
          ) : (
            <div className="space-y-2">
              {invites.map((c) => {
                const inviter = c.members.find((m) => m.username === username)?.invitedBy;
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-2 border border-border rounded-sm">
                    <div className="min-w-0">
                      <p className="text-sm font-heading truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">Invited by {inviter ?? "system"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleAcceptInvite(c.id)}>Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRejectInvite(c.id)}>Reject</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings / member management */}
      <Dialog open={dialog === "settings"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">CONVERSATION SETTINGS</DialogTitle>
          </DialogHeader>
          {activeConv && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-display tracking-wider text-muted-foreground mb-1">NAME</p>
                {activeConv.systemManaged ? (
                  <p className="text-sm">{activeConv.name} <Badge variant="outline" className="ml-2 text-[9px]">SYSTEM</Badge></p>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={renameValue || activeConv.name}
                      onChange={(e) => setRenameValue(e.target.value)}
                      disabled={!iCanManage}
                    />
                    <Button onClick={handleRename} disabled={!iCanManage || !renameValue.trim()}>Rename</Button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-display tracking-wider text-muted-foreground mb-1">
                  MEMBERS ({activeConv.members.filter((m) => m.status === "active").length})
                </p>
                <ScrollArea className="h-56 border border-border rounded-sm">
                  <div className="p-2 space-y-1">
                    {activeConv.members
                      .filter((m) => m.status !== "removed")
                      .map((m) => (
                        <div key={m.username} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            {m.role === "owner" ? (
                              <Crown className="h-3 w-3 text-primary" />
                            ) : m.role === "admin" ? (
                              <Shield className="h-3 w-3 text-primary" />
                            ) : (
                              <span className="w-3" />
                            )}
                            <span className="truncate font-heading">{m.username}</span>
                            <Badge variant="outline" className="text-[9px]">{m.role}</Badge>
                            {m.status === "invited" && <Badge className="text-[9px]">INVITED</Badge>}
                          </div>
                          {!activeConv.systemManaged && m.username !== username && (
                            <div className="flex gap-1">
                              {myRole === "owner" && m.role !== "owner" && m.status === "active" && (
                                <>
                                  {m.role === "member" ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={async () => {
                                        if (isDemoFallbackEnabled()) setMemberRole(activeConv.id, username, m.username, "admin");
                                        else await setMemberRoleRemote(activeConv.id, m.username, "admin");
                                        refresh();
                                      }}
                                    >
                                      <Shield className="h-3 w-3 mr-1" /> Promote
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-[10px]"
                                      onClick={async () => {
                                        if (isDemoFallbackEnabled()) setMemberRole(activeConv.id, username, m.username, "member");
                                        else await setMemberRoleRemote(activeConv.id, m.username, "member");
                                        refresh();
                                      }}
                                    >
                                      Demote
                                    </Button>
                                  )}
                                </>
                              )}
                              {iCanManage && m.role !== "owner" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[10px] text-destructive hover:text-destructive"
                                  onClick={async () => {
                                    if (isDemoFallbackEnabled()) kickMember(activeConv.id, username, m.username);
                                    else await kickMemberRemote(activeConv.id, m.username);
                                    refresh();
                                  }}
                                >
                                  <UserMinus className="h-3 w-3 mr-1" /> Kick
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>

              {!activeConv.systemManaged && iCanManage && eligibleToInvite.length > 0 && (
                <div>
                  <p className="text-[10px] font-display tracking-wider text-muted-foreground mb-1">INVITE MORE</p>
                  <ScrollArea className="h-32 border border-border rounded-sm p-2">
                    <div className="space-y-1">
                      {eligibleToInvite.map((p) => {
                        const checked = inviteSelection.includes(p.username);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              setInviteSelection((prev) =>
                                prev.includes(p.username) ? prev.filter((u) => u !== p.username) : [...prev, p.username],
                              )
                            }
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-sm text-xs ${checked ? "bg-primary/15 text-primary" : "hover:bg-muted"}`}
                          >
                            <span>{p.username} <span className="text-muted-foreground">- PL{p.level} {p.track}</span></span>
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <Button size="sm" className="mt-2" onClick={handleInviteMore} disabled={inviteSelection.length === 0}>
                    Invite Selected
                  </Button>
                </div>
              )}

              {!activeConv.systemManaged && (
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isDemoFallbackEnabled()) leaveConversation(activeConv.id, username);
                      else void leaveConversationRemote(activeConv.id);
                      setActive(null);
                      closeDialog();
                    }}
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" /> Leave Conversation
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
