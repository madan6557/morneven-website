import { Building2, Hash, Layers, MessageSquare, Plus, Search, Users, Check, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Conversation } from "@/services/chatApi";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  unreadCounts: Record<string, number>;
  query: string;
  mobile?: boolean;
  invitesCount?: number;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onCreateDm: () => void;
  onCreateGroup: () => void;
  onOpenInvites?: () => void;
};

const icons: Record<Conversation["kind"], typeof MessageSquare> = {
  dm: MessageSquare,
  group: Hash,
  team: Users,
  division: Layers,
  institute: Building2,
};

function kindLabel(kind: Conversation["kind"]) {
  if (kind === "dm") return "Direct";
  if (kind === "group") return "Manual Group";
  if (kind === "team") return "Team";
  if (kind === "division") return "Division";
  if (kind === "institute") return "Institute";
  return "Channel";
}

export function ConversationSidebar({
  conversations,
  activeId,
  unreadCounts,
  query,
  mobile = false,
  invitesCount = 0,
  onQueryChange,
  onSelect,
  onCreateDm,
  onCreateGroup,
  onOpenInvites,
}: Props) {
  const filtered = conversations.filter((conversation) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return conversation.name.toLowerCase().includes(needle) || conversation.members.some((member) => member.username.toLowerCase().includes(needle));
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className={cn("border-b border-border/70", mobile ? "space-y-3 p-3" : "space-y-4 p-4")}>
        {!mobile && (
          <div className="space-y-1">
            <p className="font-heading text-xs uppercase tracking-[0.14em] text-foreground">Conversations</p>
            <p className="text-xs leading-5 text-muted-foreground">{conversations.length} channel{conversations.length === 1 ? "" : "s"} active</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onCreateDm} className="gap-1 border-primary/65 bg-background/50 px-3 py-2 text-[10px] font-display tracking-wider text-primary hover:bg-primary hover:text-primary-foreground">
            <Plus className="h-3 w-3" /> DM
          </Button>
          <Button type="button" variant="outline" onClick={onCreateGroup} className="gap-1 border-primary/65 bg-background/50 px-3 py-2 text-[10px] font-display tracking-wider text-primary hover:bg-primary hover:text-primary-foreground">
            <Plus className="h-3 w-3" /> GROUP
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={mobile ? "Search channels" : "Search channels or members"} className={cn("border-border/70 bg-background/40 pl-9", mobile ? "h-9 text-sm" : "h-10 text-sm")} />
        </div>
        {mobile && onOpenInvites && (
          <Button type="button" variant="ghost" onClick={onOpenInvites} className="h-8 w-full justify-start gap-2 px-2 text-[10px] font-display tracking-wider">
            <Inbox className="h-3.5 w-3.5" /> INVITES {invitesCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[9px] text-primary-foreground">{invitesCount}</span>}
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("space-y-2", mobile ? "p-2.5 pr-2" : "p-3 pr-2")}>
          {filtered.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border bg-background/35 px-3 py-6 text-center"><p className="text-sm italic text-muted-foreground">{query.trim() ? "No conversations match this search." : "No conversations yet."}</p></div>
          ) : filtered.map((conversation) => {
            const Icon = icons[conversation.kind];
            const unread = unreadCounts[conversation.id] ?? 0;
            const activeCount = conversation.members.filter((member) => member.status === "active").length;
            return (
              <button key={conversation.id} type="button" onClick={() => onSelect(conversation.id)} className={cn("w-full rounded-sm border px-3 py-2.5 text-left transition-colors", activeId === conversation.id ? "border-primary/55 bg-primary/10 text-primary shadow-[inset_3px_0_0_hsl(var(--primary))]" : "border-border/70 bg-background/30 text-foreground hover:bg-muted/60")}>
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 rounded-sm border p-1.5", activeId === conversation.id ? "border-primary/45 bg-primary/10" : "border-border/70 bg-background/50")}><Icon className="h-3.5 w-3.5" /></div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2"><span className={cn("truncate font-heading", mobile ? "text-[13px]" : "text-sm")}>{conversation.name}</span>{unread > 0 ? <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-display text-destructive-foreground">{unread}</span> : <span className="inline-flex items-center text-[9px] text-muted-foreground"><Check className="h-2.5 w-2.5" /></span>}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-display uppercase tracking-wider text-muted-foreground"><span>{kindLabel(conversation.kind)}</span>{!mobile && <span>{activeCount} active</span>}{!mobile && conversation.systemManaged ? <span className="text-primary">Auto</span> : null}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
