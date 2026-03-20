import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { Suspense, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { retryAutomation as retryAutomationFn } from "@/services/automation/retryAutomation";
import { RecoveryAgentProvider, RouteErrorBoundary, lazyWithRecovery } from "@/recovery";
import type { RecoveryEntityContext } from "@/recovery";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Eager load auth (small, critical path)
import Auth from "./pages/Auth";

// ── Lazy pages (with chunk-error recovery) ────────────────────────────────────
const Index            = lazyWithRecovery(() => import("./pages/Index"));
const Episodes         = lazyWithRecovery(() => import("./pages/Episodes"));
const EpisodeWorkspace = lazyWithRecovery(() => import("./pages/EpisodeWorkspace"));
const ContentFactory   = lazyWithRecovery(() => import("./pages/ContentFactory"));
const Library          = lazyWithRecovery(() => import("./pages/Library"));
const Templates        = lazyWithRecovery(() => import("./pages/Templates"));
const MetricsPage      = lazyWithRecovery(() => import("./pages/Metrics"));
const Tasks            = lazyWithRecovery(() => import("./pages/Tasks"));
const SystemPage       = lazyWithRecovery(() => import("./pages/System"));
const Resources        = lazyWithRecovery(() => import("./pages/Resources"));
const ImportPage       = lazyWithRecovery(() => import("./pages/Import"));
const Ideas            = lazyWithRecovery(() => import("./pages/Ideas"));
const Briefs           = lazyWithRecovery(() => import("./pages/Briefs"));
const Publications     = lazyWithRecovery(() => import("./pages/Publications"));
const Insights         = lazyWithRecovery(() => import("./pages/Insights"));
const QuoteCandidates  = lazyWithRecovery(() => import("./pages/QuoteCandidates"));
const PlatformAccounts = lazyWithRecovery(() => import("./pages/PlatformAccounts"));
const Notes            = lazyWithRecovery(() => import("./pages/Notes"));
const Seasons          = lazyWithRecovery(() => import("./pages/Seasons"));
const Sponsors         = lazyWithRecovery(() => import("./pages/Sponsors"));
const NotFound         = lazyWithRecovery(() => import("./pages/NotFound"));

// Archived routes (still accessible but not in main nav)
const Audience              = lazyWithRecovery(() => import("./pages/Audience"));
const Guests                = lazyWithRecovery(() => import("./pages/Guests"));
const Mentions              = lazyWithRecovery(() => import("./pages/Mentions"));
const Scorecard             = lazyWithRecovery(() => import("./pages/Scorecard"));
const EditorialCalendar     = lazyWithRecovery(() => import("./pages/EditorialCalendar"));
const BrandStudio           = lazyWithRecovery(() => import("./pages/BrandStudio"));
const ContentPipeline       = lazyWithRecovery(() => import("./pages/ContentPipeline"));
const DesignStudio          = lazyWithRecovery(() => import("./pages/DesignStudio"));
const EpisodeDetail         = lazyWithRecovery(() => import("./pages/EpisodeDetail"));
const ScriptGenerator       = lazyWithRecovery(() => import("./pages/ScriptGenerator"));
const PromptBuilder         = lazyWithRecovery(() => import("./pages/PromptBuilder"));
const VisualPromptGenerator = lazyWithRecovery(() => import("./pages/VisualPromptGenerator"));
const AudioStudio           = lazyWithRecovery(() => import("./pages/AudioStudio"));
const Episode360            = lazyWithRecovery(() => import("./pages/Episode360"));
const KnowledgeBase         = lazyWithRecovery(() => import("./pages/KnowledgeBase"));

// ── Visual OS ─────────────────────────────────────────────────────────────────
const VisualOS        = lazyWithRecovery(() => import("./pages/visual-os/VisualOS"));
const VisualEpisode   = lazyWithRecovery(() => import("./pages/visual-os/VisualEpisode"));
const VisualPiece     = lazyWithRecovery(() => import("./pages/visual-os/VisualPiece"));
const VisualTemplates = lazyWithRecovery(() => import("./pages/visual-os/VisualTemplates"));
const VisualOSEditor  = lazyWithRecovery(() => import("./pages/VisualOSEditorPage"));

// ── Script Engine ─────────────────────────────────────────────────────────────
const ScriptEngineIngesta  = lazyWithRecovery(() => import("./pages/ScriptEngineIngesta"));
const ScriptEngineClean    = lazyWithRecovery(() => import("./pages/ScriptEngineClean"));
const ScriptEngineSemantico = lazyWithRecovery(() => import("./pages/ScriptEngineSemantico"));
const ScriptEngineOutputs  = lazyWithRecovery(() => import("./pages/ScriptEngineOutputs"));

// ── QueryClient ───────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2,
    },
  },
});

// ── Recovery helpers ──────────────────────────────────────────────────────────

// Track current userId synchronously (updated on auth state changes).
let _currentUserId: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  _currentUserId = session?.user?.id ?? null;
});

// Expose build ID for incident context.
(window as Window & { __APP_BUILD_ID__?: string }).__APP_BUILD_ID__ =
  (import.meta as { env: Record<string, string> }).env.VITE_APP_BUILD_ID ??
  (import.meta as { env: Record<string, string> }).env.MODE;

function getActiveEntity(): RecoveryEntityContext | null {
  const match = window.location.pathname.match(/episodes\/([a-f0-9-]{36})/i);
  if (!match) return null;
  return { type: "episode", id: match[1] };
}

async function getRecentAutomationLogs() {
  const entity = getActiveEntity();
  if (!entity?.id) return [];
  const { data } = await supabase
    .from("automation_logs_view")
    .select("id, event_type, status, error_message, run_id, created_at, metadata")
    .eq("episode_id", entity.id)
    .order("created_at", { ascending: false })
    .limit(5);
  return (data ?? []).map((r) => ({
    id: r.id,
    event_type: r.event_type ?? undefined,
    status: r.status ?? undefined,
    message: r.error_message,
    run_id: r.run_id,
    created_at: r.created_at ?? undefined,
    metadata: r.metadata as Record<string, unknown> | null,
  }));
}

function getEntityQueryKeys(entity: RecoveryEntityContext | null | undefined) {
  if (!entity?.id || entity.type !== "episode") return [];
  return [
    ["episode", entity.id] as const,
    ["automation-logs", entity.id] as const,
    ["episode-metrics-summary", entity.id] as const,
  ];
}

async function resyncEntity(entity: RecoveryEntityContext | null | undefined) {
  if (!entity?.id || entity.type !== "episode") return;
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["episode", entity.id] }),
    queryClient.invalidateQueries({ queryKey: ["automation-logs", entity.id] }),
    queryClient.invalidateQueries({ queryKey: ["episode-metrics-summary", entity.id] }),
  ]);
}

/** Adapter: fetch full log row then call retryAutomation. */
async function retryAutomationById(logId: string): Promise<void> {
  const { data, error } = await supabase
    .from("automation_logs_view")
    .select("*")
    .eq("id", logId)
    .single();
  if (error || !data) throw new Error("Log no encontrado");
  await retryAutomationFn(data as Parameters<typeof retryAutomationFn>[0]);
}

// ── Route error boundary resolvers ────────────────────────────────────────────
const routeResolvers = {
  getRoute: () => ({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  }),
};

// ── Page loader ───────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Per-route wrapper: Suspense + RouteErrorBoundary.
 * RouteErrorBoundary automatically reports render failures to RecoveryAgent.
 */
function R({ C }: { C: ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <RouteErrorBoundary resolvers={routeResolvers}>
        <C />
      </RouteErrorBoundary>
    </Suspense>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <RecoveryAgentProvider
      queryClient={queryClient}
      supabase={supabase}
      retryAutomation={retryAutomationById}
      getEntity={getActiveEntity}
      getUserId={() => _currentUserId}
      getRecentAutomationLogs={getRecentAutomationLogs}
      getEntityQueryKeys={getEntityQueryKeys}
      resyncEntity={resyncEntity}
    >
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                        <Route path="/notes" element={<R C={Notes} />} />
                        <Route path="/seasons" element={<R C={Seasons} />} />
                        <Route path="/sponsors" element={<R C={Sponsors} />} />

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

                        {/* Visual OS */}
                        <Route path="/visual"                                         element={<R C={VisualOS} />} />
                        <Route path="/visual/templates"                               element={<R C={VisualTemplates} />} />
                        <Route path="/visual/episode/:episodeId"                      element={<R C={VisualEpisode} />} />
                        <Route path="/visual/episode/:episodeId/piece/:pieceId"       element={<R C={VisualPiece} />} />
                        <Route path="/visual/editor/:semanticMapId"                   element={<R C={VisualOSEditor} />} />

                        {/* Script Engine */}
                        <Route path="/script-engine/ingesta"                          element={<R C={ScriptEngineIngesta} />} />
                        <Route path="/script-engine/clean/:rawInputId"                element={<R C={ScriptEngineClean} />} />
                        <Route path="/script-engine/semantico/:cleanedTextId"         element={<R C={ScriptEngineSemantico} />} />
                        <Route path="/script-engine/outputs/:semanticMapId"           element={<R C={ScriptEngineOutputs} />} />

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
    </RecoveryAgentProvider>
    <SpeedInsights />
  </QueryClientProvider>
);

export default App;
