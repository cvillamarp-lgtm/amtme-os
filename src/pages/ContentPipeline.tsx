import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { getEdgeFunctionErrorMessage } from "@/services/functions/edgeFunctionErrors";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  ?? "https://vudvgfdoeciurejtbzbw.supabase.co";
import hostReferencePng from "@/assets/host-reference.png";
import { useContentExtraction } from "@/hooks/useContentExtraction";
import {
  PIEZAS_MASTER,
  PIEZAS_PRIORITARIAS,
  buildInstruction,
  SeccionB,
} from "@/lib/master-template";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Copy,
  Check,
  Sparkles,
  Workflow,
  ImageIcon,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImageResult {
  piezaId: keyof SeccionB;
  imageUrl: string | null;
  status: "idle" | "generating" | "done" | "error";
  error?: string;
}

// ─── Inline mini ScriptGenerator ─────────────────────────────────────────────

function ScriptGeneratorMini({ onScriptGenerated }: { onScriptGenerated: (s: string) => void }) {
  const [theme, setTheme] = useState("");
  const [format, setFormat] = useState("solo");
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState("");

  const generate = async () => {
    if (!theme.trim()) { toast.error("Escribe un tema primero"); return; }
    setIsGenerating(true);
    setPreview("");
    try {
      // F: Single invocation — use fetch directly for SSE streaming
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const url = `${SUPABASE_URL}/functions/v1/generate-script`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
            ?? "sb_publishable_jL_FhH11B2KrVj7mXcJZEw_5ICdxTQG",
        },
        body: JSON.stringify({ theme, format }),
      });

      if (!response.ok || !response.body) throw new Error("Error al generar guión");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            fullText += delta;
            setPreview(fullText);
          } catch { /* skip malformed chunks */ }
        }
      }

      onScriptGenerated(fullText);
      toast.success("Guión generado");
    } catch (e) {
      toast.error(getEdgeFunctionErrorMessage(e));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input
            placeholder="Tema del episodio (ej: apego ansioso, casino emocional...)"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </div>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="solo">Solo</option>
          <option value="entrevista">Entrevista</option>
          <option value="panel">Panel</option>
          <option value="storytelling">Storytelling</option>
          <option value="tutorial">Tutorial</option>
        </select>
        <Button onClick={generate} disabled={isGenerating} className="w-full">
          {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generando...</> : <><Sparkles className="h-4 w-4 mr-2" />Generar guión</>}
        </Button>
      </div>
      {preview && (
        <Textarea
          value={preview}
          readOnly
          className="h-40 font-mono text-xs resize-none"
        />
      )}
    </div>
  );
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <><Check className="h-3 w-3 mr-1" />Copiado</> : <><Copy className="h-3 w-3 mr-1" />{label}</>}
    </Button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContentPipeline() {
  const [scriptText, setScriptText] = useState("");
  const [imageResults, setImageResults] = useState<ImageResult[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const hostBase64Ref = useRef<string | null>(null);

  const { result, editableSeccionB, isExtracting, error, extractContent, updateField } =
    useContentExtraction();

  const priorityPiezas = PIEZAS_MASTER.filter((p) =>
    PIEZAS_PRIORITARIAS.includes(p.id)
  );

  // Load host reference image as base64
  const loadHostBase64 = async (): Promise<string | null> => {
    if (hostBase64Ref.current) return hostBase64Ref.current;
    try {
      const res = await fetch(hostReferencePng);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(",")[1];
          hostBase64Ref.current = b64;
          resolve(b64);
        };
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const generateImage = async (piezaId: keyof SeccionB): Promise<string | null> => {
    if (!result || !editableSeccionB) return null;
    const pieza = PIEZAS_MASTER.find((p) => p.id === piezaId);
    if (!pieza) return null;

    const prompt = buildInstruction(pieza, result.seccionA, editableSeccionB);
    const hostBase64 = await loadHostBase64();
    const referenceImages = hostBase64 ? [hostBase64] : [];

    const result = await invokeEdgeFunction<{ imageUrl?: string }>("generate-image", {
      prompt,
      referenceImages,
    }, { timeoutMs: 90_000 });
    return result?.imageUrl ?? null;
  };

  const handleGenerateSingle = async (piezaId: keyof SeccionB) => {
    setImageResults((prev) => {
      const next = prev.filter((r) => r.piezaId !== piezaId);
      return [...next, { piezaId, imageUrl: null, status: "generating" }];
    });
    try {
      const url = await generateImage(piezaId);
      setImageResults((prev) =>
        prev.map((r) => r.piezaId === piezaId ? { ...r, imageUrl: url, status: "done" } : r)
      );
    } catch (e) {
      setImageResults((prev) =>
        prev.map((r) =>
          r.piezaId === piezaId
            ? { ...r, status: "error", error: getEdgeFunctionErrorMessage(e) }
            : r
        )
      );
      toast.error(`Error generando ${piezaId}`);
    }
  };

  const handleGenerateAll = async () => {
    if (!result || !editableSeccionB) return;
    setIsGeneratingAll(true);

    for (const piezaId of PIEZAS_PRIORITARIAS) {
      await handleGenerateSingle(piezaId);
    }

    // Save extraction to history (non-critical)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("generation_history").insert({
          user_id: session.user.id,
          type: "content_extraction",
          prompt: scriptText.substring(0, 2000),
          result: JSON.stringify(result.seccionA),
          status: "completed",
        });
      }
    } catch { /* non-critical */ }

    setIsGeneratingAll(false);
    toast.success("Todas las piezas generadas");
  };

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const completedCount = imageResults.filter((r) => r.status === "done").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <PageHeader
        title="Pipeline de Contenido"
        subtitle="De guión a contenido visual para redes en un clic"
      />

      {/* ── Step 1: Script Input ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
            Guión del episodio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="paste">
            <TabsList className="mb-3">
              <TabsTrigger value="paste">Pegar guión</TabsTrigger>
              <TabsTrigger value="generate">Generar con IA</TabsTrigger>
            </TabsList>
            <TabsContent value="paste">
              <Textarea
                placeholder="Pega aquí el guión del episodio..."
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                className="min-h-48 font-mono text-sm resize-none"
              />
            </TabsContent>
            <TabsContent value="generate">
              <ScriptGeneratorMini
                onScriptGenerated={(s) => setScriptText((prev) => prev + s)}
              />
            </TabsContent>
          </Tabs>

          <Button
            onClick={() => extractContent(scriptText)}
            disabled={isExtracting || scriptText.trim().length < 50}
            className="w-full"
            size="lg"
          >
            {isExtracting
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analizando guión...</>
              : <><Workflow className="h-4 w-4 mr-2" />Analizar guión → Extraer copy</>}
          </Button>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* ── Step 2: Sección A ── */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
              Datos del episodio detectados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">EP. {result.seccionA.numeroEpisodio}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Tesis central</p>
              <p className="text-sm">{result.seccionA.tesisCentral}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Frases clave</p>
              <div className="flex flex-wrap gap-2">
                {result.seccionA.frasesClaves.map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Piezas queue ── */}
      {result && editableSeccionB && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
              6 piezas listas — edita el copy si quieres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityPiezas.map((pieza) => {
              const imgResult = imageResults.find((r) => r.piezaId === pieza.id);
              const isExpanded = expandedCards.has(pieza.id);
              const copyFields = editableSeccionB[pieza.id] as Record<string, string>;
              const instruction = buildInstruction(pieza, result.seccionA, editableSeccionB);

              return (
                <div key={pieza.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleCard(pieza.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{pieza.nombre}</span>
                      <Badge variant="outline" className="text-xs font-mono">{pieza.dimensiones}</Badge>
                      {imgResult?.status === "generating" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      {imgResult?.status === "done" && <Check className="h-3.5 w-3.5 text-green-500" />}
                      {imgResult?.status === "error" && <span className="text-xs text-destructive">Error</span>}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t bg-muted/20">
                      {/* Editable copy fields */}
                      <div className="space-y-2 pt-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Copy editable</p>
                        {Object.entries(copyFields).map(([field, value]) => (
                          <div key={field} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-20 shrink-0">{field}</span>
                            <Input
                              value={value}
                              onChange={(e) => updateField(pieza.id, field, e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <CopyButton text={instruction} label="Copiar instrucción completa" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateSingle(pieza.id)}
                          disabled={imgResult?.status === "generating" || isGeneratingAll}
                        >
                          {imgResult?.status === "generating"
                            ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Generando...</>
                            : <><ImageIcon className="h-3 w-3 mr-1" />Generar imagen</>}
                        </Button>
                      </div>

                      {/* Image result */}
                      {imgResult?.status === "done" && imgResult.imageUrl && (
                        <div className="space-y-2">
                          <img
                            src={imgResult.imageUrl}
                            alt={pieza.nombre}
                            className="w-full max-w-xs rounded-lg border"
                          />
                          <div className="flex gap-2">
                            <a href={imgResult.imageUrl} download target="_blank" rel="noreferrer">
                              <Button variant="outline" size="sm">
                                <Download className="h-3 w-3 mr-1" />Descargar
                              </Button>
                            </a>
                            <CopyButton text={imgResult.imageUrl} label="Copiar URL" />
                          </div>
                        </div>
                      )}
                      {imgResult?.status === "error" && (
                        <p className="text-xs text-destructive">{imgResult.error}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Generate all ── */}
      {result && editableSeccionB && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
              Generar todas las imágenes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll}
              size="lg"
              className="w-full"
            >
              {isGeneratingAll
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{completedCount} de {PIEZAS_PRIORITARIAS.length} generadas...</>
                : <><ImageIcon className="h-4 w-4 mr-2" />Generar todo (6 imágenes)</>}
            </Button>

            {imageResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imageResults.filter((r) => r.status === "done" && r.imageUrl).map((r) => {
                  const pieza = PIEZAS_MASTER.find((p) => p.id === r.piezaId);
                  return (
                    <div key={r.piezaId} className="space-y-1">
                      <img
                        src={r.imageUrl!}
                        alt={pieza?.nombre}
                        className="w-full rounded-lg border aspect-square object-cover"
                      />
                      <p className="text-xs text-muted-foreground text-center truncate">{pieza?.nombre}</p>
                      <div className="flex gap-1 justify-center">
                        <a href={r.imageUrl!} download target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <Download className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
