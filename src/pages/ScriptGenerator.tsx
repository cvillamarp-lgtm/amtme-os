import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Check, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  ?? "https://vudvgfdoeciurejtbzbw.supabase.co";

export default function ScriptGenerator() {
  const [theme, setTheme] = useState("");
  const [title, setTitle] = useState("");
  const [epFormat, setEpFormat] = useState("solo");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!theme && !title) {
      toast.error("Ingresa al menos un tema o título");
      return;
    }
    setLoading(true);
    setScript("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Debes iniciar sesión");
        return;
      }

      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-script`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ theme, title, format: epFormat }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setScript(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyScript = () => {
    if (!script) return;
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success("Guión copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container animate-fade-in">
      <div>
        <h1 className="page-title">Generador de Guiones</h1>
        <p className="page-subtitle">Genera guiones para tus episodios con IA</p>
      </div>

      {/* Informational banner */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <span>Para episodios activos, genera el guión directamente desde el Workspace del episodio.</span>
        <Link to="/episodes" className="ml-auto text-primary text-xs hover:underline shrink-0">
          Ir a episodios →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input panel */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-sm">Parámetros</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Título del episodio</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: El poder de decir no" /></div>
            <div><Label>Tema principal *</Label><Textarea value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="¿De qué quieres hablar?" rows={3} /></div>
            <div><Label>Formato</Label>
              <Select value={epFormat} onValueChange={setEpFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Episodio solo</SelectItem>
                  <SelectItem value="entrevista">Entrevista</SelectItem>
                  <SelectItem value="panel">Panel / Mesa redonda</SelectItem>
                  <SelectItem value="storytelling">Storytelling</SelectItem>
                  <SelectItem value="tutorial">Tutorial / How-to</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {loading ? "Generando..." : "Generar guión"}
            </Button>
          </CardContent>
        </Card>

        {/* Output panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Guión generado
              </CardTitle>
              {script && (
                <Button size="sm" variant="outline" onClick={copyScript}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!script && !loading ? (
              <div className="empty-state py-20">
                <Sparkles className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">Ingresa un tema y genera tu guión</p>
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-lg p-4 min-h-[300px]">
                <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-body leading-relaxed">
                  {script}
                  {loading && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
