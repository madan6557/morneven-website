import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ValidationDialogProvider } from "@/components/ui/validation-dialog";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { AuthorRoute } from "@/components/AuthorRoute";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { applyTheme, resolveInitialTheme } from "@/lib/theme";
import { isDesktopApp, isDesktopPathAllowed } from "@/services/desktop/runtime";
import { DesktopWorkspaceGate } from "@/components/DesktopWorkspaceGate";
import { Navigate, useLocation } from "react-router-dom";

const queryClient = new QueryClient();
const AppRouter = isDesktopApp ? HashRouter : BrowserRouter;

import { useEffect } from "react";

const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const PasswordResetConfirmationPage = lazy(() => import("./pages/PasswordResetConfirmationPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
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
const SecurityPage = lazy(() => import("./pages/SecurityPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const ManagementPage = lazy(() => import("./pages/ManagementPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const BotManagerPage = lazy(() => import("./pages/BotManagerPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center font-body text-sm text-muted-foreground">
      Loading page...
    </div>
  );
}

function DesktopRouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (isDesktopApp && !isDesktopPathAllowed(location.pathname) && location.pathname !== "/") {
    return <Navigate to="/author" replace />;
  }
  return children;
}

function App() {
  useEffect(() => {
    applyTheme(resolveInitialTheme());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {!isDesktopApp ? <SpeedInsights /> : null}
      {!isDesktopApp ? <Analytics /> : null}
      <DesktopWorkspaceGate>
        <AuthProvider>
          <TooltipProvider>
            <ValidationDialogProvider>
              <Toaster />
              <Sonner />
            <AppRouter>
              <DesktopRouteGuard>
                <Suspense fallback={<RouteFallback />}>
                <Routes>
                <Route path="/" element={isDesktopApp ? <Navigate to="/author" replace /> : <Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/password-reset/confirm" element={<PasswordResetConfirmationPage />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route element={<AppLayout />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/activity" element={<ActivityPage />} />
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
                  <Route path="/personnel" element={<PersonnelManagementPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/news/:id" element={<NewsDetail />} />
                  <Route path="/management" element={<ManagementPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/bot-manager" element={<BotManagerPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </DesktopRouteGuard>
            </AppRouter>
            </ValidationDialogProvider>
          </TooltipProvider>
        </AuthProvider>
      </DesktopWorkspaceGate>
    </QueryClientProvider>
  );
}

export default App;
