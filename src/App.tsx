import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { AuthorRoute } from "@/components/AuthorRoute";
import { Analytics } from '@vercel/analytics/next';
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
import AuthorDashboard from "./pages/AuthorDashboard";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Analytics>
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
                  <Route path="/author" element={<AuthorRoute><AuthorDashboard /></AuthorRoute>} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </Analytics>
    </QueryClientProvider>
  );
}

export default App;
