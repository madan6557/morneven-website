import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { AuthorRoute } from "@/components/AuthorRoute";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import HomePage from "./pages/HomePage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetail from "./pages/ProjectDetail";
import GalleryPage from "./pages/GalleryPage";
import GalleryDetail from "./pages/GalleryDetail";
import LorePage from "./pages/LorePage";
import CharacterDetail from "./pages/CharacterDetail";
import PlaceDetail from "./pages/PlaceDetail";
import TechDetail from "./pages/TechDetail";
import CreatureDetail from "./pages/CreatureDetail";
import OtherDetail from "./pages/OtherDetail";
import MapPage from "./pages/MapPage";
import PersonnelLevelPage from "./pages/PersonnelLevelPage";
import AuthorDashboard from "./pages/AuthorDashboard";
import PersonnelManagementPage from "./pages/PersonnelManagementPage";
import SettingsPage from "./pages/SettingsPage";
import NewsDetail from "./pages/NewsDetail";
import ManagementPage from "./pages/ManagementPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

import { useEffect } from "react";

function App() {
  // Sync theme on mount
  useEffect(() => {
    const THEME_KEY = "theme";
    const saved = typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    let dark = false;
    if (saved === "dark") dark = true;
    else if (saved === "light") dark = false;
    else if (typeof window !== "undefined") dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SpeedInsights />
      <Analytics />
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route element={<AppLayout />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/gallery/:id" element={<GalleryDetail />} />
                <Route path="/lore" element={<LorePage />} />
                <Route path="/lore/:category" element={<LorePage />} />
                <Route path="/lore/characters/:id" element={<CharacterDetail />} />
                <Route path="/lore/places/:id" element={<PlaceDetail />} />
                <Route path="/lore/tech/:id" element={<TechDetail />} />
                <Route path="/lore/creatures/:id" element={<CreatureDetail />} />
                <Route path="/lore/other/:id" element={<OtherDetail />} />
                <Route path="/lore/personnel" element={<PersonnelLevelPage />} />
                <Route path="/maps" element={<MapPage />} />
                <Route path="/author" element={<AuthorRoute><AuthorDashboard /></AuthorRoute>} />
                <Route path="/personnel" element={<AuthorRoute><PersonnelManagementPage /></AuthorRoute>} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/news/:id" element={<NewsDetail />} />
                <Route path="/management" element={<ManagementPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
