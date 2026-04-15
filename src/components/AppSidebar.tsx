import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  FolderKanban,
  Image,
  BookOpen,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Shield,
  LogOut,
  ChevronRight,
  User,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import logoColor from "@/assets/logo-color.png";

export type SidebarState = "expanded" | "minimized" | "collapsed";

const navItems = [
  { title: "Command Center", url: "/home", icon: Home },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Gallery", url: "/gallery", icon: Image },
  { title: "Lore / Wiki", url: "/lore", icon: BookOpen },
  { title: "Author Panel", url: "/author", icon: Shield, authorOnly: true },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  state: SidebarState;
  onStateChange: (state: SidebarState) => void;
}

export function AppSidebar({ state, onStateChange }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, username, logout } = useAuth();
  const isActive = (path: string) => location.pathname.startsWith(path);

  const cycleState = () => {
    const next: Record<SidebarState, SidebarState> = {
      expanded: "minimized",
      minimized: "collapsed",
      collapsed: "expanded",
    };
    onStateChange(next[state]);
  };

  const width = state === "expanded" ? 256 : state === "minimized" ? 64 : 0;

  const filteredNav = navItems.filter((item) => {
    if (item.authorOnly && role !== "author") return false;
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <AnimatePresence>
        {state === "collapsed" && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => onStateChange("expanded")}
            className="fixed top-4 left-4 z-50 p-2 rounded-md bg-card border border-border hover:bg-muted transition-colors"
          >
            <PanelLeft className="h-5 w-5 text-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="h-screen sticky top-0 flex-shrink-0 overflow-hidden border-r border-border bg-sidebar z-40"
      >
        <div className="flex flex-col h-full" style={{ width: state === "expanded" ? 256 : 64 }}>
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-3 border-b border-border">
            {state === "expanded" && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-display text-xs tracking-[0.2em] text-primary uppercase truncate"
              >
                Morneven
              </motion.span>
            )}
            <button
              onClick={cycleState}
              className="p-1.5 rounded-md hover:bg-muted transition-colors ml-auto"
            >
              {state === "expanded" ? (
                <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>

          <div className="mecha-line" />

          {/* User info */}
          {state === "expanded" && (
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
                  {state === "expanded" && (
                    <span className="font-heading text-sm tracking-wide truncate">
                      {item.title}
                    </span>
                  )}
                </Link>
              );

              if (state === "minimized") {
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
            {state === "expanded" ? (
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
      </motion.aside>
    </>
  );
}
