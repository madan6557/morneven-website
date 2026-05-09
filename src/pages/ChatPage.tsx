import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listPersonnel, lookupPersonnelByUsernames } from "@/services/personnelApi";
import {
  listConversationsForRemote,
  listInvitesForRemote,
  listMessagesRemote,
  sendMessageRemote,
  editMessageRemote,
  deleteMessageRemote,
  createDMRemote,
  createManualGroupRemote,
  inviteMembersRemote,
  acceptInviteRemote,
  rejectInviteRemote,
  kickMemberRemote,
  leaveConversationRemote,
  setMemberRoleRemote,
  renameConversationRemote,
  canManage,
  getMemberRole,
  getConversationUnreadCount,
  getConversationUnreadCountsRemote,
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
import { apiUpload } from "@/services/api";
import { downloadAuthenticatedFile, openAuthenticatedFile } from "@/services/fileProxyService";
import { AuthenticatedImage } from "@/components/AuthenticatedImage";
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
  Pencil,
  Download,
  Check,
  Reply,
  CornerDownRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  Search,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { PersonnelTrack } from "@/lib/pl";
import { personnelLevelBadgeStyle, personnelLevelPanelStyle } from "@/lib/personnelTone";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
async function fileToAttachmentRemote(file: File): Promise<ChatAttachment> {
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
    objectPath: uploaded.objectPath,
  };
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

function trackShort(track?: PersonnelUser["track"]) {
  if (!track) return "";
  return PERSONNEL_TRACKS.find((item) => item.key === track)?.short ?? track.toUpperCase();
}

function conversationKindLabel(kind: Conversation["kind"]) {
  switch (kind) {
    case "dm":
      return "Direct";
    case "group":
      return "Manual Group";
    case "team":
      return "Team";
    case "division":
      return "Division";
    case "institute":
      return "Institute";
    default:
      return "Channel";
  }
}

function messageThemeFor(person?: ChatAuthorMeta) {
  const level = person?.level ?? 0;
  return personnelLevelPanelStyle(level);
}

function messageBadgeThemeFor(person?: ChatAuthorMeta) {
  const level = person?.level ?? 0;
  return personnelLevelBadgeStyle(level);
}

type ChatAuthorMeta = Pick<PersonnelUser, "username" | "level" | "track" | "note"> & {
  deleted?: boolean;
  originalUsername?: string;
};
type ConversationAttachmentItem = {
  key: string;
  attachment: ChatAttachment;
  author: string;
  createdAt: number;
  messageId: string;
  text: string;
};

function fallbackAuthorMeta(author: string): ChatAuthorMeta {
  const normalized = author.toLowerCase();
  if (normalized === "author" || normalized === "admin") {
    return { username: author, level: 7, track: "executive" };
  }
  return { username: author, level: 0, track: "executive" };
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
  const [profileUser, setProfileUser] = useState<ChatAuthorMeta | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const conversationScrollRootRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const shouldScrollToLatestRef = useRef(false);
  const pendingOpenScrollRef = useRef(false);
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [readMap, setReadMap] = useState<ChatReadMap>(() => readChatReadMap());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [conversationQuery, setConversationQuery] = useState("");
  const deferredConversationQuery = useDeferredValue(conversationQuery);
  const [mobileViewport, setMobileViewport] = useState<"list" | "thread">("list");
  const [activeAttachmentIndex, setActiveAttachmentIndex] = useState<number | null>(null);
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

  const conversationAttachments = useMemo<ConversationAttachmentItem[]>(
    () =>
      messages.flatMap((message) =>
        (message.attachments ?? []).map((attachment, index) => ({
          key: `${message.id}:${attachment.id}:${index}`,
          attachment,
          author: message.author,
          createdAt: message.createdAt,
          messageId: message.id,
          text: message.text,
        })),
      ),
    [messages],
  );

  const activeAttachmentItem =
    activeAttachmentIndex === null ? null : conversationAttachments[activeAttachmentIndex] ?? null;

  const openAttachmentViewer = (messageId: string, attachmentId: string) => {
    const index = conversationAttachments.findIndex(
      (item) => item.messageId === messageId && item.attachment.id === attachmentId,
    );
    if (index >= 0) {
      setActiveAttachmentIndex(index);
    }
  };

  const closeAttachmentViewer = () => setActiveAttachmentIndex(null);

  const showPreviousAttachment = () => {
    if (conversationAttachments.length <= 1) return;
    setActiveAttachmentIndex((current) => {
      if (current === null) return current;
      return (current - 1 + conversationAttachments.length) % conversationAttachments.length;
    });
  };

  const showNextAttachment = () => {
    if (conversationAttachments.length <= 1) return;
    setActiveAttachmentIndex((current) => {
      if (current === null) return current;
      return (current + 1) % conversationAttachments.length;
    });
  };

  useEffect(() => {
    if (activeAttachmentIndex === null) return;
    if (conversationAttachments.length === 0) {
      setActiveAttachmentIndex(null);
      return;
    }
    if (activeAttachmentIndex >= conversationAttachments.length) {
      setActiveAttachmentIndex(conversationAttachments.length - 1);
    }
  }, [activeAttachmentIndex, conversationAttachments.length]);

  useEffect(() => {
    if (activeAttachmentIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (conversationAttachments.length <= 1) return;
      if (event.key === "ArrowLeft") {
        setActiveAttachmentIndex((current) => {
          if (current === null) return current;
          return (current - 1 + conversationAttachments.length) % conversationAttachments.length;
        });
      }
      if (event.key === "ArrowRight") {
        setActiveAttachmentIndex((current) => {
          if (current === null) return current;
          return (current + 1) % conversationAttachments.length;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeAttachmentIndex, conversationAttachments.length]);

  // Boot: reconcile PL7 + institute auto memberships once personnel loads.
  useEffect(() => {
    listPersonnel().then((roster) => {
      setPersonnel(roster);
    });
  }, []);

  useEffect(() => {
    const usernames = [
      ...convs.flatMap((conversation) => conversation.members.map((member) => member.username)),
      ...messages.map((message) => message.author),
    ];
    if (usernames.length === 0) return;
    lookupPersonnelByUsernames(usernames)
      .then((items) => {
        if (items.length === 0) return;
        setPersonnel((current) => {
          const map = new Map(current.map((item) => [item.username.toLowerCase(), item]));
          items.forEach((item) => map.set(item.username.toLowerCase(), item));
          return [...map.values()];
        });
      })
      .catch(() => undefined);
  }, [convs, messages]);

  const refresh = () => {
    if (!isAuthenticated) return;

    listInvitesForRemote(username).then(setInvites).catch(() => undefined);
    getConversationUnreadCountsRemote().then(setUnreadCounts).catch(() => undefined);
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
  const filteredConvs = useMemo(() => {
    const query = deferredConversationQuery.trim().toLowerCase();
    if (!query) return convs;
    return convs.filter((conversation) => {
      const haystack = [
        conversation.name,
        conversation.kind,
        ...conversation.members.map((member) => member.username),
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [convs, deferredConversationQuery]);
  const activeMemberCount = activeConv?.members.filter((member) => member.status === "active").length ?? 0;
  const myRole: MemberRole | null = activeConv ? getMemberRole(activeConv, username) : null;
  const iCanManage = activeConv ? canManage(activeConv, username) : false;
  const personnelByUsername = useMemo(
    () => new Map(personnel.map((person) => [person.username.toLowerCase(), person])),
    [personnel],
  );
  const getAuthorMeta = (author: string): ChatAuthorMeta => {
    const fromPersonnel = personnelByUsername.get(author.toLowerCase());
    if (fromPersonnel) return fromPersonnel;

    const fromConversation = activeConv?.members.find((member) => member.username === author) as
      | (Conversation["members"][number] & { level?: number; personnelLevel?: number; track?: PersonnelTrack })
      | undefined;
    if (fromConversation) {
      const level = fromConversation.level ?? fromConversation.personnelLevel;
      if (typeof level === "number" && fromConversation.track) {
        return {
          username: author,
          level: Math.max(0, Math.min(7, level)) as ChatAuthorMeta["level"],
          track: fromConversation.track,
        };
      }
    }

    if (author.toLowerCase() === username.toLowerCase()) {
      return role === "guest"
        ? { username: author, level: 0, track: "executive", note: "Guest access" }
        : { username: author, level: 1, track: "executive" };
    }

    const fallback = fallbackAuthorMeta(author);
    return {
      ...fallback,
      username: "Deleted User",
      note: "This message was sent by a user account that has been removed.",
      deleted: true,
      originalUsername: author,
    };
  };
  const openAuthorProfile = (author: string) => {
    const meta = getAuthorMeta(author);
    if (meta.deleted) return;
    setProfileUser(meta);
  };

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "0px";
    composer.style.height = `${Math.min(composer.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    if (!editingMessageId) return;
    composerRef.current?.focus();
  }, [editingMessageId]);

  useEffect(() => {
    if (!active) {
      setMobileViewport("list");
    }
  }, [active]);

  const conversationListPanel = (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="space-y-4 border-b border-border/70 p-4">
        <div className="space-y-1">
          <p className="font-heading text-xs tracking-[0.14em] text-foreground uppercase">Conversations</p>
          <p className="text-xs leading-5 text-muted-foreground">
            {convs.length} channel{convs.length === 1 ? "" : "s"} active
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDialog("dm")}
            className="flex items-center justify-center gap-1 rounded-sm border border-primary/65 bg-background/50 px-3 py-2 text-[10px] font-display tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> DM
          </button>
          <button
            onClick={() => setDialog("group")}
            className="flex items-center justify-center gap-1 rounded-sm border border-primary/65 bg-background/50 px-3 py-2 text-[10px] font-display tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> GROUP
          </button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={conversationQuery}
            onChange={(event) => setConversationQuery(event.target.value)}
            placeholder="Search channels or members"
            className="h-10 border-border/70 bg-background/40 pl-9 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 p-3 pr-2">
          {filteredConvs.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border bg-background/35 px-3 py-6 text-center">
              <p className="text-sm italic text-muted-foreground">
                {conversationQuery.trim() ? "No conversations match this search." : "No conversations yet."}
              </p>
            </div>
          ) : filteredConvs.map((c) => {
            const Icon = KIND_ICON[c.kind];
            const activeCount = c.members.filter((m) => m.status === "active").length;
            const unreadCount = getUnreadCount(c.id);
            return (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`w-full rounded-sm border px-3 py-2.5 text-left transition-colors ${
                  active === c.id
                    ? "border-primary/55 bg-primary/10 text-primary shadow-[inset_3px_0_0_hsl(var(--primary))]"
                    : "border-border/70 bg-background/30 text-foreground hover:bg-muted/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-sm border p-1.5 ${active === c.id ? "border-primary/45 bg-primary/10" : "border-border/70 bg-background/50"}`}>
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate font-heading text-sm">{c.name}</span>
                      {unreadCount > 0 ? (
                        <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-display text-destructive-foreground">
                          {unreadCount}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[9px] text-muted-foreground">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-display tracking-wider text-muted-foreground uppercase">
                      <span>{conversationKindLabel(c.kind)}</span>
                      <span>{activeCount} active</span>
                      {c.systemManaged ? <span className="text-primary">Auto</span> : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

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
    if (editingMessageId) {
      const target = messages.find((message) => message.id === editingMessageId);
      const nextText = input.trim();
      if (!target) {
        setEditingMessageId(null);
        return;
      }
      if (!nextText && (target.attachments?.length ?? 0) === 0) return;
      if (nextText === target.text) {
        setEditingMessageId(null);
        setInput("");
        return;
      }
      await editMessageRemote(editingMessageId, nextText);
      setEditingMessageId(null);
      setInput("");
      refresh();
      return;
    }

    if (!input.trim() && pendingFiles.length === 0) return;

    let attachments: ChatAttachment[] | undefined;
    try {
      if (pendingFiles.length) {
        attachments = await Promise.all(pendingFiles.map(fileToAttachmentRemote));
      }
    } catch (error) {
      toast({
        title: "Attachment upload failed",
        description: error instanceof Error ? error.message : "Backend rejected one of the selected files.",
        variant: "destructive",
      });
      return;
    }
    await sendMessageRemote(active, input.trim(), attachments, replyTo ?? undefined);
    shouldScrollToLatestRef.current = true;
    setInput("");
    setPendingFiles([]);
    setReplyTo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    refresh();
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const valid: File[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > MAX_FILE_BYTES) {
        toast({ title: "File too large", description: `${f.name} exceeds the 5 MB upload limit.`, variant: "destructive" });
        return;
      }
      valid.push(f);
    });
    setPendingFiles((prev) => [...prev, ...valid]);
  }

  async function handleCreate() {
    if (dialog === "dm" && dmTarget && dmTarget !== username) {
      const c = await createDMRemote(dmTarget);
      setActive(c.id);
    } else if (dialog === "group" && newName.trim() && newMembers.length > 0) {
      const c = await createManualGroupRemote(newName.trim(), newMembers);
      setActive(c.id);
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
    await inviteMembersRemote(activeConv.id, inviteSelection);
    setInviteSelection([]);
    refresh();
  }

  async function handleRename() {
    if (!activeConv || !renameValue.trim()) return;
    await renameConversationRemote(activeConv.id, renameValue.trim());
    setRenameValue("");
    refresh();
  }

  async function handleAcceptInvite(id: string) {
    const accepted = await acceptInviteRemote(id);
    if (accepted) {
      setActive(id);
      setDialog(null);
    }
  }
  async function handleRejectInvite(id: string) {
    await rejectInviteRemote(id);
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
    setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
    setReadMap((prev) => {
      if (prev[conversationId] === latestSeen) return prev;
      const next = { ...prev, [conversationId]: latestSeen };
      writeChatReadMap(next);
      return next;
    });
  };
  function getUnreadCount(conversationId: string) {
    return unreadCounts[conversationId] ?? getConversationUnreadCount(username, conversationId);
  }

  function startEditingMessage(message: ChatMessage) {
    setEditingMessageId(message.id);
    setInput(message.text);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setReplyTo(null);
  }

  function cancelEditingMessage() {
    setEditingMessageId(null);
    setInput("");
  }
  const markActiveConversationRead = () => {
    if (!active) return;
    markConversationRead(active, messages);
  };
  function selectConversation(conversationId: string) {
    setActive(conversationId);
    setMobileViewport("thread");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-0 p-0 md:space-y-4 md:p-6">
      <div className="hidden flex-wrap items-end justify-between gap-4 xl:flex">
        <div className="space-y-2">
          <h1 className="font-display text-2xl tracking-[0.1em] text-primary">CHAT</h1>
          <div className="mecha-line w-32" />
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Direct messages, manual groups, auto-synced team and division channels, plus the institute-wide channel.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialog("invites")}
          className="gap-1 font-display text-[10px] tracking-wider"
        >
          <Inbox className="h-3.5 w-3.5" /> INVITES
          {invites.length > 0 && (
            <span className="ml-1 px-1.5 rounded-full bg-primary text-primary-foreground text-[9px]">{invites.length}</span>
          )}
        </Button>
      </div>

      <div className="grid h-[calc(100dvh-3.5rem)] min-h-0 gap-0 md:h-[76vh] md:min-h-[660px] md:gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className={`xl:hidden ${!activeConv || mobileViewport === "list" ? "flex" : "hidden"} min-h-0 flex-col overflow-hidden bg-card md:hud-border`}>
          <div className="border-b border-border/70 bg-background/35 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-display text-xl tracking-[0.1em] text-primary">CHAT</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {convs.length} channel{convs.length === 1 ? "" : "s"} active
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialog("invites")}
                className="gap-1 font-display text-[10px] tracking-wider"
              >
                <Inbox className="h-3.5 w-3.5" /> INVITES
                {invites.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 text-[9px] text-primary-foreground">{invites.length}</span>
                )}
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {conversationListPanel}
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden xl:flex xl:h-full xl:flex-col xl:overflow-hidden xl:bg-card xl:hud-border">
          {conversationListPanel}
        </div>

        {/* Conversation */}
        <div className={`${!activeConv || mobileViewport === "list" ? "hidden xl:flex" : "flex"} hud-border relative h-full min-h-0 flex-col overflow-hidden bg-card`}>
          {activeConv ? (
            <>
              <div className="border-b border-border/70 bg-background/35 px-4 py-3">
                <div className="mb-3 flex items-center justify-between gap-2 xl:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 px-3 text-[10px] font-display tracking-wider"
                    onClick={() => setMobileViewport("list")}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> CHANNELS
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDialog("settings")} className="h-9 shrink-0 px-2.5">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="truncate font-heading text-base text-foreground">{activeConv.name}</p>
                      <div className="hidden sm:flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-primary/30 bg-background/50 text-[9px] font-display tracking-wider text-muted-foreground">
                          {conversationKindLabel(activeConv.kind).toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] font-display tracking-wider">
                          {activeMemberCount} ACTIVE
                        </Badge>
                        {activeConv.systemManaged && (
                          <Badge variant="outline" className="text-[9px] font-display tracking-wider">AUTO</Badge>
                        )}
                        {myRole && (
                          <Badge className="gap-1 text-[9px] font-display tracking-wider">
                            {myRole === "owner" ? <Crown className="h-2.5 w-2.5" /> : myRole === "admin" ? <Shield className="h-2.5 w-2.5" /> : null}
                            {myRole.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="hidden sm:block truncate text-sm text-muted-foreground">
                      {activeConv.members
                        .filter((m) => m.status === "active")
                        .map((m) => m.username)
                        .join(", ")}
                    </p>
                </div>
                  <Button variant="ghost" size="sm" onClick={() => setDialog("settings")} className="mt-0.5 hidden h-9 shrink-0 px-2.5 xl:inline-flex">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
                </div>
              </div>

              <div className="relative flex-1 min-h-0">
              <ScrollArea ref={conversationScrollRootRef} className="h-full">
                <div className="space-y-4 p-4 md:p-5">
                  {messages.length === 0 ? (
                    <div className="flex min-h-[220px] items-center justify-center rounded-sm border border-dashed border-border bg-background/35 px-4 text-center">
                      <p className="text-sm italic text-muted-foreground">No messages yet. Start the conversation from the composer below.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                    if (m.system) {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <span className="rounded-full border border-border/60 bg-background/50 px-3 py-1 text-[10px] font-display italic tracking-wider text-muted-foreground">
                            {m.text}
                          </span>
                        </div>
                      );
                    }
                    const mine = m.author === username;
                    const canDelete = mine || iCanManage;
                    const canEdit = mine || iCanManage;
                    const isHighlighted = highlightId === m.id;
                    const authorPersonnel = getAuthorMeta(m.author);
                    const authorLevel = authorPersonnel.level;
                    const authorTrack = authorPersonnel.deleted
                      ? "DELETED"
                      : authorLevel === 0
                        ? "GUEST"
                        : trackShort(authorPersonnel.track);
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
                          className={`w-fit max-w-[88%] rounded-md border px-3 py-2.5 text-sm text-foreground transition-shadow md:max-w-[78%] ${mine ? "shadow-[inset_3px_0_0_hsl(var(--primary)/0.55)]" : ""} ${isHighlighted ? "ring-2 ring-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]" : ""}`}
                          style={bubbleTheme}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openAuthorProfile(m.author)}
                                disabled={authorPersonnel.deleted}
                                title={authorPersonnel.deleted ? authorPersonnel.originalUsername : undefined}
                                className={`font-heading text-[10px] leading-4 tracking-wider text-foreground ${authorPersonnel.deleted ? "cursor-default opacity-80" : "hover:text-primary"}`}
                              >
                                {authorPersonnel.username}
                              </button>
                              {authorLevel !== null && authorLevel !== undefined && (
                                <span
                                  className="rounded-sm border px-1 py-0 text-[8px] leading-4 font-display tracking-wider"
                                  style={badgeTheme}
                                >
                                  PL{authorLevel}
                                </span>
                              )}
                              {authorTrack && (
                                <span
                                  className="rounded-sm border px-1 py-0 text-[8px] leading-4 font-display tracking-wider"
                                  style={badgeTheme}
                                >
                                  {authorTrack}
                                </span>
                              )}
                              <span className="text-[8px] leading-4 font-display tracking-wider text-muted-foreground">
                                {new Date(m.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            {!mine && (
                              <span className={`text-[8px] leading-4 font-display tracking-wider ${messageIsUnread ? "text-destructive" : "text-muted-foreground"}`}>
                                {messageIsUnread ? "UNREAD" : "READ"}
                              </span>
                            )}
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                              <button
                                onClick={() => setReplyTo(buildReplyPreview(m))}
                                disabled={editingMessageId === m.id}
                                className="text-muted-foreground hover:text-primary"
                                aria-label="Reply to message"
                                title="Reply"
                              >
                                <Reply className="h-3 w-3" />
                              </button>
                              {canEdit && !m.system && (
                                <button
                                  onClick={() => startEditingMessage(m)}
                                  className="text-muted-foreground hover:text-primary"
                                  aria-label="Edit message"
                                  title="Edit"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={async () => {
                                    await deleteMessageRemote(m.id);
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
                            <div className="mt-2 space-y-2">
                              {m.attachments.map((a) => {
                                const isImg = a.mimeType.startsWith("image/");
                                const isVideo = a.mimeType.startsWith("video/");
                                const visualLabel = `${a.name} attachment`;
                                return (
                                  <div
                                    key={a.id}
                                    className="overflow-hidden rounded-sm border border-border/60 bg-background/45"
                                  >
                                    {isImg ? (
                                      <button
                                        type="button"
                                        onClick={() => openAttachmentViewer(m.id, a.id)}
                                        className="block w-full bg-background/15 p-2 text-left transition-colors hover:bg-background/30"
                                      >
                                        <div className="flex min-h-[180px] items-center justify-center rounded-sm border border-border/50 bg-black/20 p-2">
                                          <AuthenticatedImage
                                            src={a.dataUrl}
                                            alt={visualLabel}
                                            className="mx-auto max-h-64 w-auto max-w-full rounded-sm object-contain"
                                          />
                                        </div>
                                      </button>
                                    ) : null}
                                    {isVideo ? (
                                      <div className="bg-background/15 p-2">
                                        <div className="relative flex min-h-[180px] items-center justify-center rounded-sm border border-border/50 bg-black/35 p-2">
                                          <video
                                            src={a.dataUrl}
                                            controls
                                            preload="metadata"
                                            className="mx-auto max-h-72 w-full rounded-sm bg-black object-contain"
                                          />
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openAttachmentViewer(m.id, a.id)}
                                            className="absolute right-3 top-3 h-8 px-2 text-[10px] font-display tracking-wider"
                                          >
                                            Inspect
                                          </Button>
                                        </div>
                                      </div>
                                    ) : null}
                                    {!isImg && !isVideo ? (
                                      <button
                                        type="button"
                                        onClick={() => openAttachmentViewer(m.id, a.id)}
                                        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-background/25"
                                      >
                                        <div className="flex min-w-0 items-center gap-3">
                                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border/60 bg-background/55">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                          <div className="min-w-0 space-y-0.5">
                                            <p className="break-all text-xs font-body text-foreground">{a.name}</p>
                                            <p className="text-[10px] font-display tracking-wider text-muted-foreground">
                                              {formatBytes(a.size)} • Inspect attachment
                                            </p>
                                          </div>
                                        </div>
                                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                                      </button>
                                    ) : null}
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
                  className="absolute bottom-3 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background/80 transition-opacity hover:opacity-90"
                  aria-label="Scroll to latest message"
                  title="Jump to latest"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
              </div>

              {/* Pending attachments preview */}
              {pendingFiles.length > 0 && (
                <div className="border-t border-border/70 bg-background/25 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">Pending Attachments</p>
                    <p className="text-[10px] text-muted-foreground">{pendingFiles.length} item{pendingFiles.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                  {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-sm border border-border/70 bg-background/60 px-2 py-1 text-[10px] font-body">
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
                </div>
              )}

              {/* Pending reply banner (WhatsApp-style) */}
              {replyTo && (
                <div className="flex items-start gap-2 border-t border-border/70 bg-muted/35 px-4 py-3">
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

              {editingMessageId && (
                <div className="flex items-start gap-2 border-t border-border/70 bg-primary/10 px-4 py-3">
                  <Pencil className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
                    <p className="text-xs font-display tracking-wider text-primary">
                      Editing message
                    </p>
                    <p className="text-xs font-body text-muted-foreground line-clamp-2">
                      Attachments stay unchanged. Only text will be updated.
                    </p>
                  </div>
                  <button
                    onClick={cancelEditingMessage}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                    aria-label="Cancel edit"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="border-t border-border/70 bg-background/45 p-3 md:p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <div className="space-y-3 rounded-sm border border-border/70 bg-card/80 p-3">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={editingMessageId !== null}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 shrink-0 border border-border/70 px-2.5"
                      aria-label="Attach files"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <textarea
                      ref={composerRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
                      rows={1}
                      className="min-h-[44px] flex-1 resize-none rounded-sm border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground/75 focus:border-primary"
                    />
                    <Button
                      onClick={() => void handleSend()}
                      className="h-10 shrink-0 px-3 sm:px-4"
                      aria-label={editingMessageId ? "Save edit" : "Send"}
                    >
                      {editingMessageId ? <Pencil className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{editingMessageId ? "Save" : "Send"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="max-w-md space-y-3 rounded-sm border border-dashed border-border bg-background/35 px-6 py-8 text-center">
                <p className="font-heading text-sm tracking-[0.14em] text-foreground uppercase">No conversation selected</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Pick an existing channel from the left, or start a new direct message or group.
                </p>
                <div className="flex justify-center xl:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-[10px] font-display tracking-wider"
                    onClick={() => setMobileViewport("list")}
                  >
                    <PanelLeft className="h-3.5 w-3.5" /> OPEN CHANNELS
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={activeAttachmentItem !== null} onOpenChange={(open) => !open && closeAttachmentViewer()}>
        <DialogContent className="max-h-[92vh] w-[min(1100px,calc(100vw-20px))] max-w-none gap-0 overflow-hidden border-border bg-background p-0 sm:rounded-sm">
          {activeAttachmentItem && (
            <div className="grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)_auto]">
              <div className="border-b border-border bg-card px-4 py-3 pr-12">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <DialogTitle className="font-display text-sm tracking-wider">
                      ATTACHMENT INSPECTOR
                    </DialogTitle>
                    <DialogDescription className="space-y-1 text-xs">
                      <span className="block truncate">
                        {activeAttachmentItem.attachment.name || "Untitled attachment"}
                      </span>
                      <span className="block text-muted-foreground">
                        {activeAttachmentIndex! + 1} of {conversationAttachments.length} • {activeAttachmentItem.author} •{" "}
                        {new Date(activeAttachmentItem.createdAt).toLocaleString()}
                      </span>
                    </DialogDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void openAuthenticatedFile(activeAttachmentItem.attachment.dataUrl)}
                    >
                      <ExternalLink className="h-4 w-4" /> Inspect
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void downloadAuthenticatedFile(
                          activeAttachmentItem.attachment.dataUrl,
                          activeAttachmentItem.attachment.name,
                        )
                      }
                    >
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </div>
                </div>
              </div>

              <div className="relative min-h-0 bg-muted/30 p-3 md:p-5">
                <div className="flex h-full min-h-[320px] items-center justify-center overflow-hidden rounded-sm border border-border bg-background/90 p-3">
                  {activeAttachmentItem.attachment.mimeType.startsWith("image/") ? (
                    <AuthenticatedImage
                      src={activeAttachmentItem.attachment.dataUrl}
                      alt={activeAttachmentItem.attachment.name}
                      className="max-h-[72vh] w-full object-contain"
                    />
                  ) : activeAttachmentItem.attachment.mimeType.startsWith("video/") ? (
                    <video
                      src={activeAttachmentItem.attachment.dataUrl}
                      controls
                      preload="metadata"
                      className="max-h-[72vh] w-full rounded-sm bg-black object-contain"
                    />
                  ) : (
                    <div className="flex max-w-xl flex-col items-center justify-center gap-4 rounded-sm border border-border/70 bg-card/70 px-6 py-8 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-background/70">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="break-all text-sm font-body text-foreground">
                          {activeAttachmentItem.attachment.name}
                        </p>
                        <p className="text-xs font-display tracking-wider text-muted-foreground">
                          {formatBytes(activeAttachmentItem.attachment.size)} •{" "}
                          {activeAttachmentItem.attachment.mimeType || "FILE"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void openAuthenticatedFile(activeAttachmentItem.attachment.dataUrl)}
                        >
                          <ExternalLink className="h-4 w-4" /> Open
                        </Button>
                        <Button
                          type="button"
                          onClick={() =>
                            void downloadAuthenticatedFile(
                              activeAttachmentItem.attachment.dataUrl,
                              activeAttachmentItem.attachment.name,
                            )
                          }
                        >
                          <Download className="h-4 w-4" /> Download
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {conversationAttachments.length > 1 && (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={showPreviousAttachment}
                      className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/92"
                      aria-label="Previous attachment"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={showNextAttachment}
                      className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/92"
                      aria-label="Next attachment"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              <div className="border-t border-border bg-card/80 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-display tracking-wider text-muted-foreground">
                    {activeAttachmentItem.attachment.mimeType.startsWith("image/") ? (
                      <ImageIcon className="h-3.5 w-3.5" />
                    ) : activeAttachmentItem.attachment.mimeType.startsWith("video/") ? (
                      <Play className="h-3.5 w-3.5" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    <span>{activeAttachmentItem.attachment.mimeType || "FILE"}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {activeAttachmentItem.text
                      ? activeAttachmentItem.text
                      : "This attachment was sent without additional message text."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                                        await setMemberRoleRemote(activeConv.id, m.username, "admin");
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
                                        await setMemberRoleRemote(activeConv.id, m.username, "member");
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
                                    await kickMemberRemote(activeConv.id, m.username);
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
                      void leaveConversationRemote(activeConv.id);
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

      <Dialog open={!!profileUser} onOpenChange={(open) => { if (!open) setProfileUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">USER INFO</DialogTitle>
            <DialogDescription>Public personnel metadata for chat identity.</DialogDescription>
          </DialogHeader>
          {profileUser && (
            <div className="space-y-3 text-sm">
              <InfoRow label="Username" value={profileUser.username} />
              <InfoRow label="PL" value={`PL${profileUser.level}`} />
              <InfoRow
                label="Track"
                value={profileUser.level === 0
                  ? "GUEST"
                  : `${trackShort(profileUser.track)} - ${PERSONNEL_TRACKS.find((item) => item.key === profileUser.track)?.label ?? profileUser.track}`}
              />
              <div className="space-y-1">
                <p className="font-heading text-[10px] uppercase tracking-wider text-muted-foreground">Note</p>
                <p className="rounded-sm border border-border bg-background/60 p-2 text-sm text-foreground">
                  {profileUser.note || "No public note."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-heading text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right text-sm text-foreground">{value}</span>
    </div>
  );
}
