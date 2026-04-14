import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar, SidebarState } from "./AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppLayout() {
  const [sidebarState, setSidebarState] = useState<SidebarState>("expanded");

  return (
    <TooltipProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar state={sidebarState} onStateChange={setSidebarState} />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
