import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listPersonnel } from "@/services/personnelApi";
import { pushNotification } from "@/services/notificationsApi";
import {
  listConversationsFor,
  listMessages,
  sendMessage,
  createDM,
  createManualGroup,
  subscribeChat,
  type Conversation,
  type ChatMessage,
} from "@/services/chatApi";
import type { PersonnelUser } from "@/types";
import { Send, Plus, Users, MessageSquare, Hash, Layers } from "lucide-react";

export default function ChatPage() {
  const { username, isAuthenticated } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [personnel, setPersonnel] = useState<PersonnelUser[]>([]);
  const [showNew, setShowNew] = useState<"dm" | "group" | null>(null);
  const [newName, setNewName] = useState("");
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [dmTarget, setDmTarget] = useState("");

  const refresh = () => {
    if (!isAuthenticated) return;
    setConvs(listConversationsFor(username));
    if (active) setMessages(listMessages(active));
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    refresh();
    listPersonnel().then(setPersonnel);
    return subscribeChat(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, active, isAuthenticated]);

  const activeConv = useMemo(() => convs.find((c) => c.id === active) ?? null, [convs, active]);

  if (!isAuthenticated) {
    return <div className="p-8 text-muted-foreground">Login to use chat.</div>;
  }

  function handleSend() {
    if (!active || !input.trim()) return;
    const msg = sendMessage(active, username, input.trim());
    setInput("");
    // Notify other members
    const conv = listConversationsFor(username).find((c) => c.id === active);
    conv?.members.filter((m) => m !== username).forEach((m) => {
      pushNotification({
        kind: "info",
        title: `New message in ${conv.name}`,
        body: `${username}: ${msg.text.slice(0, 80)}`,
        recipient: m,
        sender: username,
        link: "/chat",
      });
    });
    refresh();
  }

  function handleNew() {
    if (showNew === "dm" && dmTarget && dmTarget !== username) {
      const c = createDM(username, dmTarget);
      setActive(c.id);
    } else if (showNew === "group" && newName.trim() && newMembers.length > 0) {
      const c = createManualGroup(newName.trim(), username, newMembers);
      setActive(c.id);
    }
    setShowNew(null);
    setNewName("");
    setNewMembers([]);
    setDmTarget("");
  }

  const kindIcon = (k: Conversation["kind"]) => {
    if (k === "dm") return MessageSquare;
    if (k === "group") return Hash;
    if (k === "team") return Users;
    return Layers; // division
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-2xl tracking-[0.1em] text-primary">CHAT</h1>
        <div className="mecha-line w-32 mt-2" />
        <p className="text-xs font-body text-muted-foreground mt-2">
          Direct messages, manual groups, and auto-synced team / division channels.
        </p>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4 min-h-[60vh]">
        {/* Sidebar */}
        <div className="hud-border bg-card p-3 space-y-2 overflow-y-auto">
          <div className="flex gap-1">
            <button
              onClick={() => setShowNew("dm")}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-display tracking-wider border border-primary text-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="h-3 w-3" /> DM
            </button>
            <button
              onClick={() => setShowNew("group")}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-display tracking-wider border border-primary text-primary rounded-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="h-3 w-3" /> GROUP
            </button>
          </div>

          {showNew === "dm" && (
            <div className="space-y-2 p-2 bg-muted/40 rounded-sm">
              <select value={dmTarget} onChange={(e) => setDmTarget(e.target.value)} className="w-full text-xs px-2 py-1 bg-background border border-border rounded-sm">
                <option value="">Select user</option>
                {personnel.filter((p) => p.username !== username).map((p) => (
                  <option key={p.id} value={p.username}>{p.username}</option>
                ))}
              </select>
              <button onClick={handleNew} className="w-full text-[10px] font-display tracking-wider px-2 py-1 bg-primary text-primary-foreground rounded-sm">START</button>
            </div>
          )}

          {showNew === "group" && (
            <div className="space-y-2 p-2 bg-muted/40 rounded-sm">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Group name" className="w-full text-xs px-2 py-1 bg-background border border-border rounded-sm" />
              <select multiple value={newMembers} onChange={(e) => setNewMembers(Array.from(e.target.selectedOptions).map((o) => o.value))} className="w-full text-xs px-2 py-1 bg-background border border-border rounded-sm h-24">
                {personnel.filter((p) => p.username !== username).map((p) => (
                  <option key={p.id} value={p.username}>{p.username}</option>
                ))}
              </select>
              <button onClick={handleNew} className="w-full text-[10px] font-display tracking-wider px-2 py-1 bg-primary text-primary-foreground rounded-sm">CREATE</button>
            </div>
          )}

          <div className="space-y-1 pt-2">
            {convs.length === 0 && (
              <p className="text-[11px] text-muted-foreground font-body italic px-2">No conversations.</p>
            )}
            {convs.map((c) => {
              const Icon = kindIcon(c.kind);
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-sm transition-colors ${active === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-xs font-heading truncate flex-1">{c.name}</span>
                  <span className="text-[9px] font-display uppercase text-muted-foreground">{c.members.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation */}
        <div className="hud-border bg-card flex flex-col min-h-[60vh]">
          {activeConv ? (
            <>
              <div className="px-4 py-2 border-b border-border">
                <p className="font-heading text-sm text-foreground">{activeConv.name}</p>
                <p className="text-[10px] text-muted-foreground font-body">
                  {activeConv.members.join(", ")}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center">No messages yet.</p>
                ) : messages.map((m) => (
                  <div key={m.id} className={`flex ${m.author === username ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-md px-3 py-1.5 text-xs ${m.author === username ? "bg-primary/15 text-foreground" : "bg-muted text-foreground"}`}>
                      <p className="font-heading text-[10px] tracking-wider text-muted-foreground">
                        {m.author} · {new Date(m.createdAt).toLocaleTimeString()}
                      </p>
                      <p className="font-body whitespace-pre-wrap break-words">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-border flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message..."
                  className="flex-1 text-xs px-3 py-2 bg-background border border-border rounded-sm"
                />
                <button onClick={handleSend} className="px-3 py-2 bg-primary text-primary-foreground rounded-sm">
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
    </div>
  );
}
