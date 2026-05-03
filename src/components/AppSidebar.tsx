import { useEffect, useRef, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  FolderKanban,
  Image,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  User,
  Map,
  Users,
  ClipboardList,
  MessageCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import {
  PERSONNEL_LEVELS,
  PERSONNEL_TRACKS,
  PL_FULL_AUTHORITY,
  canManagePersonnel,
  canEnterAuthorPanel,
  type PersonnelLevel,
  type PersonnelTrack,
} from "@/lib/pl";
import { subscribeChat } from "@/services/chatApi";
import { subscribeManagement } from "@/services/managementApi";
import { getNavigationBadges } from "@/services/navigationBadgesApi";
import logoColor from "@/assets/logo-color.png";

interface NavItem {
  title: string;
  url: string;
  icon: typeof Home;
  badge?: "chat" | "management";
  // Visibility predicate; receives current PL + track + role.
  // Default: visible to everyone.
  visible?: (ctx: { role: string; level: PersonnelLevel; track: PersonnelTrack }) => boolean;
}

const navItems: NavItem[] = [
  { title: "Command Center", url: "/home", icon: Home },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Gallery", url: "/gallery", icon: Image },
  { title: "Lore / Wiki", url: "/lore", icon: BookOpen },
  { title: "Maps", url: "/maps", icon: Map },
  {
    title: "Management",
    url: "/management",
    icon: ClipboardList,
    badge: "management",
    visible: ({ role }) => role !== "guest",
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageCircle,
    badge: "chat",
    visible: ({ role }) => role !== "guest",
  },
  {
    title: "Author Panel",
    url: "/author",
    icon: Shield,
    visible: ({ role, level, track }) => role === "author" || canEnterAuthorPanel(level, track),
  },
  {
    title: "Personnel",
    url: "/personnel",
    icon: Users,
    visible: ({ level }) => canManagePersonnel(level),
  },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  expanded: boolean;
  onToggleExpand: () => void;
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function AppSidebar({ expanded, onToggleExpand, open, onClose, isMobile }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mobileSidebarRef = useRef<HTMLElement | null>(null);
  const { role, username, logout, personnelLevel, track, setPersonnelLevel, setTrack } = useAuth();
  const [chatBadgeCount, setChatBadgeCount] = useState(0);
  const [managementBadgeCount, setManagementBadgeCount] = useState(0);
  const isActive = (path: string) => location.pathname.startsWith(path);

  const filteredNav = navItems.filter((item) =>
    item.visible ? item.visible({ role, level: personnelLevel, track }) : true,
  );

  // Authors can preview every tier including the hidden L7 (Full Authority).
  // Everyone else stops at the public ladder (L0–L6).
  const selectableLevels: PersonnelLevel[] =
    role === "author" ? [...PERSONNEL_LEVELS, PL_FULL_AUTHORITY] : PERSONNEL_LEVELS;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const refreshBadges = () => {
      if (role === "guest") {
        setChatBadgeCount(0);
        setManagementBadgeCount(0);
        return;
      }

      getNavigationBadges({ level: personnelLevel, track, username })
        .then((badges) => {
          setChatBadgeCount(badges.chat.unreadTotal);
          setManagementBadgeCount(badges.management.pendingRequests);
        })
        .catch(() => {
          setChatBadgeCount(0);
          setManagementBadgeCount(0);
        });
    };

    refreshBadges();
    const unsubscribeChat = subscribeChat(refreshBadges);
    const unsubscribeManagement = subscribeManagement(refreshBadges);
    return () => {
      unsubscribeChat();
      unsubscribeManagement();
    };
  }, [personnelLevel, role, track, username]);

  const badgeCountFor = (item: NavItem) => {
    if (item.badge === "chat") return chatBadgeCount;
    if (item.badge === "management") return managementBadgeCount;
    return 0;
  };

  useEffect(() => {
    if (!isMobile || !open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const sidebarNode = mobileSidebarRef.current;
      if (!sidebarNode) return;
      const target = event.target;
      if (target instanceof Node && !sidebarNode.contains(target)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isMobile, open, onClose]);

  const isExpanded = isMobile ? true : expanded;
  const sidebarWidth = isExpanded ? 256 : 64;

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ width: sidebarWidth }}>
      {/* Header */}
      <div className="h-14 flex items-center px-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0 w-full justify-center">
          <img src={logoColor} alt="Morneven" className="h-7 w-7 flex-shrink-0" />
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display text-xs tracking-[0.2em] text-primary uppercase truncate"
            >
              Morneven
            </motion.span>
          )}
        </div>
      </div>

      <div className="mecha-line" />

      {/* User info */}
      {isExpanded && (
        <div className="px-4 py-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-heading text-foreground truncate">{username}</p>
              <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">{role}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="pl-switch" className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">
              Clearance
            </label>
            {role === "author" ? (
              <select
                id="pl-switch"
                value={personnelLevel}
                onChange={(e) => setPersonnelLevel(Number(e.target.value) as PersonnelLevel)}
                className="text-[10px] font-display tracking-wider bg-card border border-border rounded-sm px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Personnel Level clearance switcher"
              >
                {selectableLevels.map((l) => (
                  <option key={l} value={l}>
                    L{l}{l === PL_FULL_AUTHORITY ? " · Full" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] font-display tracking-wider bg-muted border border-border/50 rounded-sm px-1.5 py-0.5 text-muted-foreground cursor-not-allowed">
                    L{personnelLevel}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-heading text-xs">
                  Clearance assigned by Personnel Management
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="track-switch" className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">
              Track
            </label>
            {personnelLevel >= PL_FULL_AUTHORITY ? (
              <select
                id="track-switch"
                value={track}
                onChange={(e) => setTrack(e.target.value as PersonnelTrack)}
                className="text-[10px] font-display tracking-wider bg-card border border-border rounded-sm px-1.5 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Personnel Track switcher"
              >
                {PERSONNEL_TRACKS.map((t) => (
                  <option key={t.key} value={t.key}>{t.short}</option>
                ))}
              </select>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] font-display tracking-wider bg-muted border border-border/50 rounded-sm px-1.5 py-0.5 text-muted-foreground cursor-not-allowed">
                    {PERSONNEL_TRACKS.find((t) => t.key === track)?.short}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-heading text-xs">
                  Track assigned by Personnel Management
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Nav items */}
      <ScrollArea className="flex-1">
        <nav className="py-3 space-y-1 px-2">
          {filteredNav.map((item) => {
            const active = isActive(item.url);
            const badgeCount = badgeCountFor(item);
            const link = (
              <Link
                to={item.url}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all group relative
                  ${active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
                )}
                <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                {isExpanded && (
                  <span className="font-heading text-sm tracking-wide truncate">
                    {item.title}
                  </span>
                )}
                {badgeCount > 0 && (
                  isExpanded ? (
                    <span className="ml-auto h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-display flex items-center justify-center">
                      {badgeCount > 9 ? "9+" : badgeCount}
                    </span>
                  ) : (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                  )
                )}
              </Link>
            );

            if (!isExpanded) {
              return (
                <Tooltip key={item.title} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="font-heading">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.title}>{link}</div>;
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1">
        {isExpanded ? (
          <>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-heading text-sm tracking-wide">Logout</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground font-heading tracking-wide">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-yellow animate-pulse-glow" />
              SYSTEM ONLINE
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button onClick={handleLogout} className="flex justify-center w-full py-2 text-muted-foreground hover:text-foreground transition-colors">
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-heading">Logout</TooltipContent>
            </Tooltip>
            <div className="flex justify-center py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-accent-yellow animate-pulse-glow" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile: overlay sidebar
  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              ref={mobileSidebarRef}
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed top-0 left-0 h-screen w-64 border-r border-border bg-sidebar z-50 overflow-hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: static sidebar with external chevron toggle
  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="h-screen sticky top-0 border-r border-border bg-sidebar z-40 flex-shrink-0"
      style={{ overflow: "visible" }}
    >
      <div className="h-full overflow-hidden">
        {sidebarContent}
      </div>
      {/* Chevron button on the edge of the sidebar - sticky inside aside so it stays visible while scrolling */}
      <button
        onClick={onToggleExpand}
        className="absolute top-7 -right-3 z-50 h-6 w-6 rounded-full border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
        aria-label={expanded ? "Minimize sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
    </motion.aside>
  );
}
