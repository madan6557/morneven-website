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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import logoColor from "@/assets/logo-color.png";

const navItems = [
  { title: "Command Center", url: "/home", icon: Home },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Gallery", url: "/gallery", icon: Image },
  { title: "Lore / Wiki", url: "/lore", icon: BookOpen },
  { title: "Author Panel", url: "/author", icon: Shield, authorOnly: true },
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
  const { role, username, logout } = useAuth();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const filteredNav = navItems.filter((item) => {
    if (item.authorOnly && role !== "author") return false;
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNavClick = () => {
    if (isMobile) onClose();
  };

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
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-heading text-foreground truncate">{username}</p>
              <p className="text-[10px] font-display tracking-wider text-muted-foreground uppercase">{role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto">
        {filteredNav.map((item) => {
          const active = isActive(item.url);
          const link = (
            <Link
              to={item.url}
              onClick={handleNavClick}
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
      {/* Chevron button on the edge of the sidebar — sticky inside aside so it stays visible while scrolling */}
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
