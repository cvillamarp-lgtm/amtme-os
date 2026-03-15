import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Upload, FileText, ChevronDown, ChevronRight, CheckCircle2,
  AlertTriangle, XCircle, ArrowRight, Filter, Database,
  Layers, BarChart3, Settings, FileStack, ListTodo, Sparkles
} from "lucide-react";
import { parseDocument, computeStats, DESTINATION_LABELS, CONTENT_TYPE_LABELS, parseRenumberedEpisodes } from "@/lib/document-parser";
import type { ParsedBlock, ImportStats, ParsedEpisode } from "@/lib/document-parser";
import { executeImport, importEpisodes } from "@/lib/import-engine";
import type { ImportSummary, ImportResult } from "@/lib/import-engine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "load" | "preview" | "importing" | "results";

const DEST_ICONS: Record<string, typeof Database> = {
  sistema_brand: Settings,
  sistema_design: Layers,
  sistema_operacion: Settings,
  episodes: FileText,
  templates: FileStack,
  metrics: BarChart3,
  dashboard: BarChart3,
  resources_sop: FileText,
  resources_strategy: FileText,
  tasks: ListTodo,
  knowledge_base: Database,
};

export default function ImportPage() {
  const [step, setStep] = useState<Step>("load");
  const [blocks, setBlocks] = useState<ParsedBlock[]>([]);
  const [episodes, setEpisodes] = useState<ParsedEpisode[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [filterDest, setFilterDest] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [episodeResults, setEpisodeResults] = useState<ImportResult[]>([]);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteContent, setPasteContent] = useState("");

  // Load from private_documents table (authenticated)
  const loadFromDatabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("private_documents")
        .select("content")
        .eq("name", "master-document")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data?.content) {
        toast.error("No se encontró el documento maestro. Sube uno primero.");
        setPasteMode(true);
        setIsLoading(false);
        return;
      }

      processDocument(data.content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload document to private_documents table
  const uploadDocument = useCallback(async (text: string) => {
    if (!text || text.length < 100) {
      toast.error("El contenido es demasiado corto");
      return;
    }
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión");
        return;
      }

      // Upsert: delete old and insert new
      await supabase
        .from("private_documents")
        .delete()
        .eq("name", "master-document")
        .eq("user_id", session.user.id);

      const { error } = await supabase
        .from("private_documents")
        .insert({
          user_id: session.user.id,
          name: "master-document",
          content: text,
        });

      if (error) throw error;

      processDocument(text);
      toast.success("Documento guardado y analizado");
      setPasteMode(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processDocument = (text: string) => {
    const parsed = parseDocument(text);
    const st = computeStats(parsed);
    const eps = parseRenumberedEpisodes(text);

    setBlocks(parsed);
    setStats(st);
    setEpisodes(eps);
    setStep("preview");
    toast.success(`${parsed.length} bloques detectados, ${eps.length} episodios encontrados`);
  };

  const filteredBlocks = useMemo(() => {
    if (!filterDest) return blocks;
    return blocks.filter(b => b.destinationModule === filterDest);
  }, [blocks, filterDest]);

  const toggleExpand = (id: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runImport = useCallback(async () => {
    setStep("importing");
    setProgress(0);
    setProgressTotal(blocks.length + episodes.length);

    try {
      const blockSummary = await executeImport(blocks, (current, total) => {
        setProgress(current);
        setProgressTotal(total + episodes.length);
      });

      const epResults = await importEpisodes(episodes);
      setProgress(blocks.length + episodes.length);

      setSummary({
        ...blockSummary,
        total: blockSummary.total + epResults.length,
        inserted: blockSummary.inserted + epResults.filter(r => r.action === "inserted").length,
        merged: blockSummary.merged + epResults.filter(r => r.action === "merged").length,
        errors: blockSummary.errors + epResults.filter(r => r.action === "error").length,
        results: [...blockSummary.results, ...epResults],
      });
      setEpisodeResults(epResults);
      setStep("results");
      toast.success("Importación completada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error en importación");
      setStep("preview");
    }
  }, [blocks, episodes]);

  return (
    <div className="p-6 lg:p-8 h-full flex flex-col animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Importación semántica</h1>
        <p className="page-subtitle">
          Carga estructurada del documento maestro consolidado
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["load", "preview", "importing", "results"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${
              step === s ? "bg-primary text-primary-foreground" :
              (["load", "preview", "importing", "results"].indexOf(step) > i)
                ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
            }`}>
              {i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s === "load" ? "Cargar" : s === "preview" ? "Preview" : s === "importing" ? "Importando" : "Resultados"}
            </span>
            {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Load */}
      {step === "load" && (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center py-16 space-y-4 w-full max-w-lg">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">Documento maestro consolidado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AMTME_Documento_Consolidado_2026-03-05.md
              </p>
              <p className="text-xs text-muted-foreground mt-3 max-w-md mx-auto">
                El sistema analizará cada sección, clasificará el contenido por tipo y propondrá el destino correcto en la app.
              </p>
            </div>

            {pasteMode ? (
              <div className="space-y-3 text-left">
                <Textarea
                  placeholder="Pega aquí el contenido del documento maestro..."
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  className="min-h-48 font-mono text-xs resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setPasteMode(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => uploadDocument(pasteContent)}
                    disabled={isLoading || pasteContent.length < 100}
                  >
                    {isLoading ? "Guardando..." : "Guardar y analizar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 items-center">
                <Button onClick={loadFromDatabase} disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Cargar documento guardado
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPasteMode(true)}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Subir documento nuevo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && stats && (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total bloques</p>
              <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Episodios</p>
              <p className="text-2xl font-display font-bold text-foreground">{episodes.length}</p>
            </Card>
            {Object.entries(stats.byDestination).slice(0, 4).map(([dest, count]) => (
              <Card key={dest} className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                  {DESTINATION_LABELS[dest] || dest}
                </p>
                <p className="text-2xl font-display font-bold text-foreground">{count}</p>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Button
              variant={filterDest === null ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilterDest(null)}
            >
              Todos ({stats.total})
            </Button>
            {Object.entries(stats.byDestination).map(([dest, count]) => {
              const Icon = DEST_ICONS[dest] || Database;
              return (
                <Button
                  key={dest}
                  variant={filterDest === dest ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => setFilterDest(filterDest === dest ? null : dest)}
                >
                  <Icon className="h-3 w-3" />
                  {DESTINATION_LABELS[dest] || dest} ({count})
                </Button>
              );
            })}
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-1.5 pr-3">
              {filteredBlocks.map((block) => (
                <Collapsible key={block.id} open={expandedBlocks.has(block.id)}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/50 transition-colors"
                        onClick={() => toggleExpand(block.id)}
                      >
                        {expandedBlocks.has(block.id)
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        }
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate max-w-xs">
                              {block.title}
                            </span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {CONTENT_TYPE_LABELS[block.contentType] || block.contentType}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {block.sourceSection}
                            {block.sourceSubsection && ` > ${block.sourceSubsection}`}
                          </p>
                        </div>
                        <Badge className="text-[10px] shrink-0 bg-primary/10 text-primary border-0">
                          {block.destinationLabel}
                        </Badge>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 border-t border-border">
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>{" "}
                            <span className="text-foreground">{block.contentType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Hash:</span>{" "}
                            <span className="text-foreground font-mono">{block.sourceHash}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Líneas:</span>{" "}
                            <span className="text-foreground">{block.lineStart}–{block.lineEnd}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tamaño:</span>{" "}
                            <span className="text-foreground">{block.content.length} chars</span>
                          </div>
                        </div>
                        <div className="mt-2 bg-secondary/50 rounded p-2 max-h-32 overflow-auto">
                          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono">
                            {block.content.substring(0, 500)}
                            {block.content.length > 500 && "..."}
                          </pre>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="text-sm text-muted-foreground">
              {filteredBlocks.length} bloques + {episodes.length} episodios listos para importar
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("load"); setBlocks([]); setStats(null); }}>
                Cancelar
              </Button>
              <Button onClick={runImport}>
                Confirmar importación
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === "importing" && (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center py-16 space-y-6 w-full max-w-md">
            <div className="h-12 w-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-foreground">Importando...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {progress} de {progressTotal} bloques procesados
              </p>
            </div>
            <Progress value={progressTotal > 0 ? (progress / progressTotal) * 100 : 0} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === "results" && summary && (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Total</p>
              <p className="text-2xl font-display font-bold text-foreground">{summary.total}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Insertados</p>
              <p className="text-2xl font-display font-bold text-primary">{summary.inserted}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Fusionados</p>
              <p className="text-2xl font-display font-bold text-accent-foreground">{summary.merged}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Omitidos</p>
              <p className="text-2xl font-display font-bold text-muted-foreground">{summary.skipped}</p>
            </Card>
            <Card className="p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Errores</p>
              <p className={`text-2xl font-display font-bold ${summary.errors > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {summary.errors}
              </p>
            </Card>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-3">
              {summary.results.map((result, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 text-sm">
                  {result.action === "inserted" && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                  {result.action === "merged" && <AlertTriangle className="h-3.5 w-3.5 text-accent-foreground shrink-0" />}
                  {result.action === "error" && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                  {result.action === "skipped" && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <span className="flex-1 truncate text-foreground">{result.title}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {DESTINATION_LABELS[result.destination] || result.destination}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground shrink-0 w-16 text-right">
                    {result.action}
                  </span>
                  {result.error && (
                    <span className="text-[10px] text-destructive shrink-0 max-w-32 truncate">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {episodeResults.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Episodios importados ({episodeResults.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {episodeResults.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.action === "inserted" ? (
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    ) : r.action === "merged" ? (
                      <AlertTriangle className="h-3 w-3 text-accent-foreground" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive" />
                    )}
                    <span className="text-foreground">{r.title}</span>
                    <span className="text-muted-foreground ml-auto">{r.action}</span>
                  </div>
                ))}
                {episodeResults.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    + {episodeResults.length - 10} episodios más
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Trazabilidad completa guardada en knowledge_blocks
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("load"); setBlocks([]); setSummary(null); }}>
                Nueva importación
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
