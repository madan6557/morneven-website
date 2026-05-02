import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Trash2, AlertTriangle, Info, Settings as SettingsIcon, AtSign, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  listNotifications,
  listNotificationsRemote,
  unreadCount,
  unreadCountRemote,
  markRead,
  markAllRead,
  clearAll,
  subscribeNotifications,
  type AppNotification,
} from "@/services/notificationsApi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const KIND_ICON = {
  warning: AlertTriangle,
  info: Info,
  system: SettingsIcon,
  mention: AtSign,
  request: ClipboardList,
} as const;

const KIND_COLOR: Record<AppNotification["kind"], string> = {
  warning: "text-destructive",
  info: "text-primary",
  system: "text-muted-foreground",
  mention: "text-accent-yellow",
  request: "text-accent-orange",
};

export default function NotificationBell() {
  const { username, isAuthenticated } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const refresh = () => {
      setItems(listNotifications(username));
      setCount(unreadCount(username));
      listNotificationsRemote(username).then(setItems).catch(() => undefined);
      unreadCountRemote(username).then(setCount).catch(() => undefined);
    };
    refresh();
    return subscribeNotifications(refresh);
  }, [username, isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative h-9 w-9 flex items-center justify-center rounded-md border border-border bg-card hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-foreground" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-display flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 max-h-[28rem] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="font-heading text-xs tracking-wider uppercase text-foreground">Notifications</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => markAllRead(username)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Mark all read"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => clearAll(username)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Clear all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body italic p-4 text-center">
              No notifications.
            </p>
          ) : (
            items.slice(0, 30).map((n) => {
              const Icon = KIND_ICON[n.kind] ?? Info;
              const color = KIND_COLOR[n.kind] ?? "text-muted-foreground";
              const inner = (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex items-start gap-2 px-3 py-2 border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-heading text-foreground truncate">{n.title}</p>
                    {n.body && <p className="text-[11px] text-muted-foreground font-body line-clamp-2 mt-0.5">{n.body}</p>}
                    <p className="text-[9px] font-display tracking-wider text-muted-foreground/70 uppercase mt-0.5">
                      {new Date(n.createdAt).toLocaleString()} · {n.sender ?? "system"}
                    </p>
                  </div>
                  {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                </div>
              );
              return n.link ? (
                <Link key={n.id} to={n.link} onClick={() => markRead(n.id)}>
                  {inner}
                </Link>
              ) : (
                inner
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
