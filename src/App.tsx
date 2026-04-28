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
import { lazy, Suspense } from "react";

const queryClient = new QueryClient();

import { useEffect } from "react";

const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const GalleryDetail = lazy(() => import("./pages/GalleryDetail"));
const LorePage = lazy(() => import("./pages/LorePage"));
const CharacterDetail = lazy(() => import("./pages/CharacterDetail"));
const PlaceDetail = lazy(() => import("./pages/PlaceDetail"));
const TechDetail = lazy(() => import("./pages/TechDetail"));
const CreatureDetail = lazy(() => import("./pages/CreatureDetail"));
const OtherDetail = lazy(() => import("./pages/OtherDetail"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const MapPage = lazy(() => import("./pages/MapPage"));
const PersonnelLevelPage = lazy(() => import("./pages/PersonnelLevelPage"));
const AuthorDashboard = lazy(() => import("./pages/AuthorDashboard"));
const PersonnelManagementPage = lazy(() => import("./pages/PersonnelManagementPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const ManagementPage = lazy(() => import("./pages/ManagementPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center font-body text-sm text-muted-foreground">
      Loading page...
    </div>
  );
}

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
            <Suspense fallback={<RouteFallback />}>
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
                  <Route path="/lore/events/:id" element={<EventDetail />} />
                  <Route path="/lore/personnel" element={<PersonnelLevelPage />} />
                  <Route path="/maps" element={<MapPage />} />
                  <Route path="/author" element={<AuthorRoute><AuthorDashboard /></AuthorRoute>} />
                  <Route path="/personnel" element={<AuthorRoute><PersonnelManagementPage /></AuthorRoute>} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/news/:id" element={<NewsDetail />} />
                  <Route path="/management" element={<ManagementPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
