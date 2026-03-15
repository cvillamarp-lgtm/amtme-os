import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense } from "react";

// Eager load auth (small, critical path)
import Auth from "./pages/Auth";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Episodes = lazy(() => import("./pages/Episodes"));
const EpisodeWorkspace = lazy(() => import("./pages/EpisodeWorkspace"));
const ContentFactory = lazy(() => import("./pages/ContentFactory"));
const Library = lazy(() => import("./pages/Library"));
const Templates = lazy(() => import("./pages/Templates"));
const MetricsPage = lazy(() => import("./pages/Metrics"));
const Tasks = lazy(() => import("./pages/Tasks"));
const SystemPage = lazy(() => import("./pages/System"));
const Resources = lazy(() => import("./pages/Resources"));
const ImportPage = lazy(() => import("./pages/Import"));
const Ideas = lazy(() => import("./pages/Ideas"));
const Briefs = lazy(() => import("./pages/Briefs"));
const Publications = lazy(() => import("./pages/Publications"));
const Insights = lazy(() => import("./pages/Insights"));
const QuoteCandidates = lazy(() => import("./pages/QuoteCandidates"));
const PlatformAccounts = lazy(() => import("./pages/PlatformAccounts"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Archived routes (still accessible but not in main nav)
const Audience = lazy(() => import("./pages/Audience"));
const Guests = lazy(() => import("./pages/Guests"));
const Mentions = lazy(() => import("./pages/Mentions"));
const Scorecard = lazy(() => import("./pages/Scorecard"));
const EditorialCalendar = lazy(() => import("./pages/EditorialCalendar"));
const BrandStudio = lazy(() => import("./pages/BrandStudio"));
const ContentPipeline = lazy(() => import("./pages/ContentPipeline"));
const DesignStudio = lazy(() => import("./pages/DesignStudio"));
const EpisodeDetail = lazy(() => import("./pages/EpisodeDetail"));
const ScriptGenerator = lazy(() => import("./pages/ScriptGenerator"));
const PromptBuilder = lazy(() => import("./pages/PromptBuilder"));
const VisualPromptGenerator = lazy(() => import("./pages/VisualPromptGenerator"));
const AudioStudio = lazy(() => import("./pages/AudioStudio"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* Main routes */}
                        <Route path="/" element={<Index />} />
                        <Route path="/episodes" element={<Episodes />} />
                        <Route path="/episodes/:id" element={<EpisodeWorkspace />} />
                        <Route path="/factory" element={<ContentFactory />} />
                        <Route path="/library" element={<Library />} />
                        <Route path="/templates" element={<Templates />} />
                        <Route path="/metrics" element={<MetricsPage />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/system" element={<SystemPage />} />
                        <Route path="/resources" element={<Resources />} />
                        <Route path="/import" element={<ImportPage />} />
                        <Route path="/ideas" element={<Ideas />} />
                        <Route path="/briefs" element={<Briefs />} />
                        <Route path="/publications" element={<Publications />} />
                        <Route path="/insights" element={<Insights />} />
                        <Route path="/quotes" element={<QuoteCandidates />} />
                        <Route path="/accounts" element={<PlatformAccounts />} />

                        {/* Archived routes (accessible but not in nav) */}
                        <Route path="/audience" element={<Audience />} />
                        <Route path="/guests" element={<Guests />} />
                        <Route path="/mentions" element={<Mentions />} />
                        <Route path="/scorecard" element={<Scorecard />} />
                        <Route path="/calendar" element={<EditorialCalendar />} />
                        <Route path="/brand" element={<BrandStudio />} />
                        <Route path="/pipeline" element={<ContentPipeline />} />
                        <Route path="/design" element={<DesignStudio />} />
                        <Route path="/episodes/:id/detail" element={<EpisodeDetail />} />
                        <Route path="/script-generator" element={<ScriptGenerator />} />
                        <Route path="/prompt-builder" element={<PromptBuilder />} />
                        <Route path="/visual-prompts" element={<VisualPromptGenerator />} />
                        <Route path="/audio" element={<AudioStudio />} />

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
