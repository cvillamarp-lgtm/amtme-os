import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense, type ComponentType } from "react";

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
const Episode360 = lazy(() => import("./pages/Episode360"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));

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

/**
 * Wraps each lazy-loaded page in its own Suspense + ErrorBoundary.
 *
 * Why: A single top-level Suspense means any one route failing to load
 * (e.g. stale chunk hash after deploy) takes down the entire app shell.
 * Per-route isolation means only the failing page shows the error/reload UI
 * while the rest of the app stays functional.
 */
function R({ C }: { C: ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ErrorBoundary>
        <C />
      </ErrorBoundary>
    </Suspense>
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
                    <Routes>
                      {/* Main routes */}
                      <Route path="/" element={<R C={Index} />} />
                      <Route path="/episodes" element={<R C={Episodes} />} />
                      <Route path="/episodes/:id" element={<R C={EpisodeWorkspace} />} />
                      <Route path="/factory" element={<R C={ContentFactory} />} />
                      <Route path="/library" element={<R C={Library} />} />
                      <Route path="/templates" element={<R C={Templates} />} />
                      <Route path="/metrics" element={<R C={MetricsPage} />} />
                      <Route path="/tasks" element={<R C={Tasks} />} />
                      <Route path="/system" element={<R C={SystemPage} />} />
                      <Route path="/resources" element={<R C={Resources} />} />
                      <Route path="/import" element={<R C={ImportPage} />} />
                      <Route path="/ideas" element={<R C={Ideas} />} />
                      <Route path="/briefs" element={<R C={Briefs} />} />
                      <Route path="/publications" element={<R C={Publications} />} />
                      <Route path="/insights" element={<R C={Insights} />} />
                      <Route path="/quotes" element={<R C={QuoteCandidates} />} />
                      <Route path="/accounts" element={<R C={PlatformAccounts} />} />

                      {/* Archived routes (accessible but not in nav) */}
                      <Route path="/audience" element={<R C={Audience} />} />
                      <Route path="/guests" element={<R C={Guests} />} />
                      <Route path="/mentions" element={<R C={Mentions} />} />
                      <Route path="/scorecard" element={<R C={Scorecard} />} />
                      <Route path="/calendar" element={<R C={EditorialCalendar} />} />
                      <Route path="/brand" element={<R C={BrandStudio} />} />
                      <Route path="/pipeline" element={<R C={ContentPipeline} />} />
                      <Route path="/design" element={<R C={DesignStudio} />} />
                      <Route path="/episodes/:id/detail" element={<R C={EpisodeDetail} />} />
                      <Route path="/script-generator" element={<R C={ScriptGenerator} />} />
                      <Route path="/prompt-builder" element={<R C={PromptBuilder} />} />
                      <Route path="/visual-prompts" element={<R C={VisualPromptGenerator} />} />
                      <Route path="/audio" element={<R C={AudioStudio} />} />
                      <Route path="/episodes/:episodeId/360" element={<R C={Episode360} />} />
                      <Route path="/knowledge" element={<R C={KnowledgeBase} />} />

                      <Route path="*" element={<R C={NotFound} />} />
                    </Routes>
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
