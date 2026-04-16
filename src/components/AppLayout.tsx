import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function AppLayout() {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Default: minimized on tablet/phone, expanded on desktop
  useEffect(() => {
    setExpanded(!isMobile);
    setMobileOpen(false);
  }, [isMobile]);

  return (
    <TooltipProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          expanded={expanded}
          onToggleExpand={() => setExpanded((e) => !e)}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          isMobile={isMobile}
        />
        <main className="flex-1 min-w-0">
          {/* Mobile header with hamburger */}
          {isMobile && (
            <div className="sticky top-0 z-30 h-12 flex items-center px-4 border-b border-border bg-background/80 backdrop-blur-sm">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-md hover:bg-muted transition-colors"
              >
                <Menu className="h-5 w-5 text-foreground" />
              </button>
              <span className="ml-2 font-display text-xs tracking-[0.2em] text-primary uppercase">
                Morneven
              </span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
