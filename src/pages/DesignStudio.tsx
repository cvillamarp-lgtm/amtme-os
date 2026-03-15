import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Palette,
  CheckSquare,
  Search,
  Copy,
  Eye,
  Grid3X3,
  Type,
  Layers,
  Download,
  Shield,
  ArrowLeft,
  FileText,
  Ruler,
  AlertTriangle,
} from "lucide-react";
import { calculateContrast, meetsWCAG, determineBackground, generateFilename } from "@/lib/design-utils";
import { usePiezasData } from "@/hooks/usePiezas";
import type { Pieza } from "@/lib/types/pieza";

export default function DesignStudio() {
  const { data, isLoading, error } = usePiezasData();
  const [selectedPiece, setSelectedPiece] = useState<Pieza | null>(null);
  const [search, setSearch] = useState("");
  const [qaChecks, setQaChecks] = useState<Record<string, boolean>>({});
  const [contrastFg, setContrastFg] = useState("#013BD8");
  const [contrastBg, setContrastBg] = useState("#FFFFFF");

  if (isLoading || !data) {
    return (
      <div className="page-container animate-fade-in">
        <h1 className="page-title">Design Studio</h1>
        <div className="surface p-12 text-center">
          <div className="animate-pulse text-muted-foreground">Cargando sistema de diseño...</div>
        </div>
      </div>
    );
  }

  const filteredPieces = data.piezas.filter(
    (p) =>
      !search ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.metadata.tipo.toLowerCase().includes(search.toLowerCase()) ||
      p.contenido?.h1?.texto?.toLowerCase().includes(search.toLowerCase())
  );

  const qaProgress = data.checklistQA.length > 0
    ? (Object.values(qaChecks).filter(Boolean).length / data.checklistQA.length) * 100
    : 0;

  const contrastRatio = calculateContrast(contrastFg, contrastBg);

  if (selectedPiece) {
    return (
      <div className="page-container animate-fade-in">
        <button
          onClick={() => setSelectedPiece(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a galería
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="page-title">{selectedPiece.id}</h1>
            <p className="page-subtitle">{selectedPiece.metadata.tipo}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={selectedPiece.fondo.decision === "BLANCO" ? "secondary" : "default"}>
              Fondo {selectedPiece.fondo.decision}
            </Badge>
            <Badge variant="outline">
              {selectedPiece.qa.score}/{selectedPiece.qa.total} QA
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="metadata" className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="metadata"><FileText className="w-3.5 h-3.5 mr-1.5" />Identificación</TabsTrigger>
            <TabsTrigger value="dimensiones"><Ruler className="w-3.5 h-3.5 mr-1.5" />Dimensiones</TabsTrigger>
            <TabsTrigger value="estructura"><Layers className="w-3.5 h-3.5 mr-1.5" />Estructura</TabsTrigger>
            <TabsTrigger value="tipografia"><Type className="w-3.5 h-3.5 mr-1.5" />Tipografía</TabsTrigger>
            <TabsTrigger value="paleta"><Palette className="w-3.5 h-3.5 mr-1.5" />Paleta</TabsTrigger>
            <TabsTrigger value="export"><Download className="w-3.5 h-3.5 mr-1.5" />Export</TabsTrigger>
          </TabsList>

          <TabsContent value="metadata">
            <div className="surface divide-y divide-border">
              {Object.entries(selectedPiece.metadata).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center px-5 py-3">
                  <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="text-sm text-foreground font-medium">{String(val)}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dimensiones">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="surface p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Dimensiones</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Pixels</span><span className="font-mono text-foreground">{selectedPiece.dimensiones.pixels}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ratio</span><span className="font-mono text-foreground">{selectedPiece.dimensiones.ratio}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Grid</span><span className="text-foreground">{selectedPiece.dimensiones.grid}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Gutters</span><span className="font-mono text-foreground">{selectedPiece.dimensiones.gutters}</span></div>
                </div>
              </div>
              <div className="surface p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Safe Zone
                </h3>
                <p className="text-sm font-mono text-foreground">{selectedPiece.dimensiones.safeZone.label}</p>
                <h4 className="text-xs font-semibold text-muted-foreground mt-4 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> No-Go Zones
                </h4>
                <div className="space-y-1">
                  {selectedPiece.dimensiones.noGoZones.map((z: any, i: number) => (
                    <div key={i} className="text-xs font-mono text-destructive/80 bg-destructive/5 px-2 py-1 rounded">
                      {z.area}: {z.condition}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estructura">
            <div className="space-y-4">
              <div className="surface p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Bloques / Módulos</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPiece.estructura.bloques.map((b: string) => (
                    <Badge key={b} variant="outline" className="font-mono text-xs">{b}</Badge>
                  ))}
                </div>
              </div>
              <div className="surface p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Coordenadas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(selectedPiece.estructura.coordenadas).map(([key, coord]: any) => (
                    <div key={key} className="bg-secondary rounded-lg p-3 text-xs">
                      <div className="font-medium text-foreground mb-1">{coord.label}</div>
                      <div className="font-mono text-muted-foreground">
                        x: {coord.x1}–{coord.x2} · y: {coord.y1}–{coord.y2}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="surface p-5">
                <h3 className="text-sm font-semibold text-foreground mb-2">Composición</h3>
                <p className="text-sm text-muted-foreground">{selectedPiece.estructura.composicion}</p>
                <h4 className="text-xs font-semibold text-muted-foreground mt-3 mb-1">Flujo de lectura</h4>
                <p className="text-sm text-foreground">{selectedPiece.estructura.flujoLectura}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tipografia">
            <div className="surface p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">H1</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Fuente</span><span className="text-foreground">{selectedPiece.tipografia.h1.fuente}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Peso</span><span className="text-foreground">{selectedPiece.tipografia.h1.peso}</span></div>
                {selectedPiece.tipografia.h1.tamano && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Tamaño</span><span className="font-mono text-foreground">{selectedPiece.tipografia.h1.tamano}pt</span></div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: selectedPiece.tipografia.h1.color }} />
                    <span className="font-mono text-foreground">{selectedPiece.tipografia.h1.color}</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Jerarquía</span><span className="text-foreground">{selectedPiece.tipografia.jerarquia}</span></div>
                <div className="flex justify-between text-sm mt-1"><span className="text-muted-foreground">Legibilidad móvil</span><span className="text-foreground">{selectedPiece.tipografia.legibilidadMovil}</span></div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paleta">
            <div className="surface p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Colores usados</h3>
              <div className="flex gap-3">
                {selectedPiece.paleta.coloresUsados.map((c: string) => (
                  <button
                    key={c}
                    onClick={() => { navigator.clipboard.writeText(c); toast.success(`${c} copiado`); }}
                    className="group flex flex-col items-center gap-1"
                  >
                    <div className="w-12 h-12 rounded-lg border border-border group-hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                    <span className="text-[10px] font-mono text-muted-foreground">{c}</span>
                  </button>
                ))}
              </div>
              <div className="pt-3 border-t border-border space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Contraste</span><span className="text-foreground">{String((selectedPiece.paleta.contraste as any)?.ratio ?? "")}:1 ({String((selectedPiece.paleta.contraste as any)?.nivel ?? "")})</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Acentos</span><span className="text-foreground">{selectedPiece.paleta.acentos}</span></div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="export">
            <div className="surface p-5 space-y-3">
              {Object.entries(selectedPiece.export).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="font-mono text-foreground text-xs">{String(val)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-border">
                <h4 className="text-xs text-muted-foreground mb-2">Reglas de no-edición</h4>
                <div className="space-y-1">
                  {selectedPiece.elementos.reglasNoEdicion.map((r: string, i: number) => (
                    <div key={i} className="text-xs text-destructive/80 bg-destructive/5 px-3 py-1.5 rounded">
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      <div>
        <h1 className="page-title">Design Studio</h1>
        <p className="page-subtitle">Sistema de Especificaciones Visuales AMTME — {data.piezas.length} piezas analizadas</p>
      </div>

      <Tabs defaultValue="gallery" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="gallery"><Grid3X3 className="w-3.5 h-3.5 mr-1.5" />Galería</TabsTrigger>
          <TabsTrigger value="colors"><Palette className="w-3.5 h-3.5 mr-1.5" />Paleta</TabsTrigger>
          <TabsTrigger value="qa"><CheckSquare className="w-3.5 h-3.5 mr-1.5" />QA Checker</TabsTrigger>
          <TabsTrigger value="contrast"><Eye className="w-3.5 h-3.5 mr-1.5" />Contraste</TabsTrigger>
          <TabsTrigger value="tipos"><Layers className="w-3.5 h-3.5 mr-1.5" />Tipos</TabsTrigger>
        </TabsList>

        {/* GALLERY */}
        <TabsContent value="gallery" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por ID, tipo o contenido..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>

          {filteredPieces.length === 0 ? (
            <div className="empty-state">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Sin resultados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPieces.map((piece) => (
                <button
                  key={piece.id}
                  onClick={() => setSelectedPiece(piece)}
                  className="surface p-5 text-left surface-hover group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{piece.id}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{piece.metadata.tipo}</p>
                    </div>
                    <Badge
                      variant={piece.fondo.decision === "BLANCO" ? "secondary" : "default"}
                      className="text-[10px]"
                    >
                      {piece.fondo.decision}
                    </Badge>
                  </div>

                  {piece.contenido?.h1 && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2 mb-3">
                      "{piece.contenido.h1.texto.replace(/\n/g, " ")}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono">{piece.dimensiones.pixels}</span>
                    <span>{piece.qa.score}/{piece.qa.total} QA</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* COLORS */}
        <TabsContent value="colors" className="space-y-4">
          <h2 className="text-lg font-display font-semibold text-foreground">{data.paleta.nombre}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.paleta.colores.map((color) => (
              <div key={color.id} className="surface p-4 group">
                <div
                  className="w-full h-20 rounded-lg mb-3 border border-border"
                  style={{ backgroundColor: color.hex }}
                />
                <h3 className="text-sm font-semibold text-foreground">{color.nombre}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{color.hex}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{color.uso}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(color.hex); toast.success(`${color.hex} copiado`); }}
                  className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copiar HEX
                </button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* QA CHECKER */}
        <TabsContent value="qa" className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Checklist QA</h3>
              <span className="text-xs text-muted-foreground">{Math.round(qaProgress)}% completado</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${qaProgress}%` }}
              />
            </div>
            <div className="space-y-2">
              {data.checklistQA.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                >
                  <Checkbox
                    checked={qaChecks[item.id] || false}
                    onCheckedChange={(checked) => setQaChecks({ ...qaChecks, [item.id]: !!checked })}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.descripcion}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto text-[10px] shrink-0">{item.categoria}</Badge>
                </label>
              ))}
            </div>
            {qaProgress === 100 && (
              <div className="mt-4 p-4 rounded-lg bg-[hsl(var(--chart-2)/0.1)] border border-[hsl(var(--chart-2)/0.2)]">
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--chart-2))" }}>✓ Pieza lista para export</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* CONTRAST CHECKER */}
        <TabsContent value="contrast" className="space-y-4">
          <div className="surface p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Validador de Contraste WCAG</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Color de texto (foreground)</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={contrastFg} onChange={(e) => setContrastFg(e.target.value)} className="w-10 h-10 rounded border-0 cursor-pointer" />
                  <Input value={contrastFg} onChange={(e) => setContrastFg(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Color de fondo (background)</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={contrastBg} onChange={(e) => setContrastBg(e.target.value)} className="w-10 h-10 rounded border-0 cursor-pointer" />
                  <Input value={contrastBg} onChange={(e) => setContrastBg(e.target.value)} className="font-mono text-sm" />
                </div>
              </div>
            </div>

            <div className="rounded-xl p-8 text-center border border-border" style={{ backgroundColor: contrastBg }}>
              <p className="text-3xl font-bold font-display" style={{ color: contrastFg }}>
                Texto de ejemplo
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="surface p-4 text-center">
                <div className="text-2xl font-bold font-display text-foreground">{contrastRatio}:1</div>
                <p className="text-xs text-muted-foreground mt-1">Ratio</p>
              </div>
              <div className={`surface p-4 text-center ${meetsWCAG(contrastRatio, "AA") ? "border-[hsl(var(--chart-2)/0.3)]" : "border-destructive/30"}`}>
                <div className={`text-lg font-bold ${meetsWCAG(contrastRatio, "AA") ? "text-[hsl(var(--chart-2))]" : "text-destructive"}`}>
                  {meetsWCAG(contrastRatio, "AA") ? "✓ PASA" : "✗ FALLA"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">WCAG AA (≥4.5)</p>
              </div>
              <div className={`surface p-4 text-center ${meetsWCAG(contrastRatio, "AAA") ? "border-[hsl(var(--chart-2)/0.3)]" : "border-destructive/30"}`}>
                <div className={`text-lg font-bold ${meetsWCAG(contrastRatio, "AAA") ? "text-[hsl(var(--chart-2))]" : "text-destructive"}`}>
                  {meetsWCAG(contrastRatio, "AAA") ? "✓ PASA" : "✗ FALLA"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">WCAG AAA (≥7)</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TIPOS */}
        <TabsContent value="tipos" className="space-y-4">
          {data.tipos.map((tipo) => (
            <div key={tipo.id} className="surface p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{tipo.nombre}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{tipo.descripcion}</p>
                </div>
                <Badge variant={tipo.fondoRegla.decision.includes("BLANCO") ? "secondary" : "default"} className="text-[10px]">
                  {tipo.fondoRegla.decision}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono">{tipo.dimensiones.width}×{tipo.dimensiones.height}</span>
                <span>Ratio: {tipo.dimensiones.ratio}</span>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Casos de uso</h4>
                <div className="flex flex-wrap gap-1.5">
                  {tipo.casosUso.map((c: string) => (
                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">{tipo.fondoRegla.justificacion}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
