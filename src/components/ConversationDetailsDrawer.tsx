import { Bot, Crown, MessageCircle, Settings, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/services/chatApi";

type Props = {
  conversation: Conversation | null;
  myRole?: string | null;
  onSettings: () => void;
};

export function ConversationDetailsDrawer({ conversation, myRole, onSettings }: Props) {
  if (!conversation) {
    return <aside className="hidden xl:flex h-full flex-col border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground"><p className="font-heading text-xs uppercase tracking-[0.14em] text-foreground">Details</p><p className="mt-4 leading-6">Select a conversation to inspect members and chat controls.</p></aside>;
  }
  const activeMembers = conversation.members.filter((member) => member.status === "active");
  const policy = conversation.botPolicy;
  return (
    <aside className="hidden xl:flex h-full min-h-0 flex-col overflow-hidden border border-border/70 bg-card/70">
      <div className="border-b border-border/70 bg-background/35 p-4">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-heading truncate text-sm text-foreground">{conversation.name}</p><p className="mt-1 text-[10px] font-display uppercase tracking-wider text-muted-foreground">Conversation details</p></div><Button type="button" variant="ghost" size="sm" onClick={onSettings} className="h-8 px-2" aria-label="Open conversation settings"><Settings className="h-3.5 w-3.5" /></Button></div>
        <div className="mt-3 flex flex-wrap gap-1.5"><Badge variant="outline" className="text-[9px] font-display tracking-wider">{conversation.kind.toUpperCase()}</Badge>{myRole && <Badge className="gap-1 text-[9px] font-display tracking-wider">{myRole === "owner" ? <Crown className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}{myRole.toUpperCase()}</Badge>}</div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="rounded-sm border border-border/70 bg-background/35 p-3"><div className="flex items-center gap-2 text-primary"><Users className="h-3.5 w-3.5" /><p className="font-display text-[10px] uppercase tracking-wider">Members {activeMembers.length}</p></div><div className="mt-3 space-y-2">{activeMembers.map((member) => <div key={member.username} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-foreground">{member.username}</span><span className="text-[9px] uppercase tracking-wider text-muted-foreground">{member.role}</span></div>)}</div></section>
        <section className="rounded-sm border border-border/70 bg-background/35 p-3"><div className="flex items-center gap-2 text-primary"><Bot className="h-3.5 w-3.5" /><p className="font-display text-[10px] uppercase tracking-wider">Bot policy</p></div><div className="mt-3 space-y-2 text-xs"><div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Mode</span><span className="font-display uppercase text-foreground">{policy?.mode ?? "disabled"}</span></div><div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Bot-to-bot</span><span className={policy?.allowBotToBot ? "text-primary" : "text-muted-foreground"}>{policy?.allowBotToBot ? "Allowed" : "Off"}</span></div><div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Allowed bots</span><span className="font-display text-foreground">{policy?.allowedIdentityIds?.length ?? 0}</span></div></div></section>
        <div className="flex items-center gap-2 text-[10px] leading-5 text-muted-foreground"><MessageCircle className="h-3.5 w-3.5 shrink-0 text-primary" /> Messages are retained according to Morneven chat policy.</div>
      </div>
    </aside>
  );
}
