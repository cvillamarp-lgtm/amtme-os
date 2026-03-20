/**
 * Visual OS Editor Page
 * Interfaz completa para editar piezas visuales con paletas, imágenes y preview
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Eye,
  RotateCcw,
} from "lucide-react";
import { useVisualOSEditor } from "@/hooks/useVisualOSEditor";
import { PALETTE_SYSTEM } from "@/lib/design-utils";

const PALETTE_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: "#E4F542 → #020B18", // P1: Lima + Azul noche
  2: "#D4C7A8 → #2A1810", // P2: Dorado + Marrón
  3: "#B8D4E8 → #1A3A4A", // P3: Celeste + Azul marino
  4: "#E85D6E → #3D1C2C", // P4: Rosa + Borgoña
};

const HOST_IMAGES = [
  { value: "none", label: "🎯 Sin figura", emoji: "🎯" },
  { value: "REF_1", label: "🪑 Suelo (REF_1)", emoji: "🪑" },
  { value: "REF_2", label: "👥 Directo (REF_2)", emoji: "👥" },
];

export default function VisualOSEditorPage() {
  const { semanticMapId } = useParams<{ semanticMapId: string }>();
  const navigate = useNavigate();
  const {
    state,
    updateContent,
    setPalette,
    setHostImage,
    updateCustomPalette,
    generatePreview,
    validateContrast,
    saveAsset,
  } = useVisualOSEditor();

  const [showPreview, setShowPreview] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<"bg" | "accent" | null>(null);

  useEffect(() => {
    validateContrast();
  }, [state.paletteId, state.customPalette, validateContrast]);

  const handleSave = async () => {
    if (!semanticMapId) {
      alert("No semantic map context");
      return;
    }
    try {
      await saveAsset(semanticMapId);
      navigate(-1);
    } catch {
      // Error is handled in hook state
    }
  };

  const palette =
    state.paletteId === 5 && state.customPalette
      ? state.customPalette
      : PALETTE_SYSTEM[state.paletteId as 1 | 2 | 3 | 4];

  const canPublish = state.validations.errors.length === 0;

  return (
    <div className="page-container animate-fade-in">
      {/* Encabezado */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Visual OS Editor
            </h1>
            <p className="text-muted-foreground mt-2">Edita piezas visuales con paletas AMTME</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Atrás
          </Button>
        </div>
      </div>

      {/* Errores globales */}
      {state.error && (
        <Card className="max-w-6xl mx-auto border-red-500/50 bg-red-950/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-400">Error</p>
              <p className="text-red-300/80">{state.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-8">
        {/* Panel izquierdo: Contenido */}
        <div className="col-span-2 space-y-6">
          {/* Inputs de contenido */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📝 Contenido Visual</CardTitle>
              <CardDescription>Texto y mensajería para la pieza</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Keyword * (Máx 3 palabras)
                </label>
                <Input
                  value={state.content.keyword}
                  onChange={(e) => updateContent({ keyword: e.target.value })}
                  placeholder="ej: Estoicismo"
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {state.content.keyword.length}/30 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Headline * (Máx 80 caracteres)
                </label>
                <Input
                  value={state.content.headline}
                  onChange={(e) => updateContent({ headline: e.target.value })}
                  placeholder="ej: La virtud no desaparece"
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {state.content.headline.length}/80 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subtítulo (Máx 120 caracteres)
                </label>
                <Textarea
                  value={state.content.subheadline || ""}
                  onChange={(e) => updateContent({ subheadline: e.target.value })}
                  placeholder="ej: Marco Aurelio reflexiona sobre la permanencia"
                  className="text-sm h-20 resize-none"
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {(state.content.subheadline || "").length}/120 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Call-to-Action (Máx 30 caracteres)
                </label>
                <Input
                  value={state.content.cta || ""}
                  onChange={(e) => updateContent({ cta: e.target.value })}
                  placeholder="ej: Escucha el episodio"
                  maxLength={30}
                />
              </div>
            </CardContent>
          </Card>

          {/* Selección de paleta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎨 Paleta de Color</CardTitle>
              <CardDescription>Elige una paleta predefinida o crea una personalizada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {(Object.entries(PALETTE_SYSTEM) as Array<[string, any]>).map(([id, pal]) => {
                  const paletteId = parseInt(id) as 1 | 2 | 3 | 4;
                  const isSelected = state.paletteId === paletteId;
                  return (
                    <button
                      key={paletteId}
                      onClick={() => setPalette(paletteId)}
                      className={`p-3 rounded-lg border-2 transition ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30 bg-accent"
                          : "border-border hover:border-primary/30 bg-muted/30"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-foreground">P{paletteId}</div>
                        <div className="flex gap-1">
                          <div
                            className="w-6 h-6 rounded border border-white/30"
                            style={{ backgroundColor: pal.bg }}
                            title={`BG: ${pal.bg}`}
                          />
                          <div
                            className="w-6 h-6 rounded border border-white/30"
                            style={{ backgroundColor: pal.accent }}
                            title={`Accent: ${pal.accent}`}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Paleta libre (P5) */}
              {state.paletteId === 5 && state.customPalette && (
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="text-sm font-semibold text-primary mb-3">
                    Paleta Personalizada (P5)
                  </h4>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Fondo</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="color"
                            value={state.customPalette.bg}
                            onChange={(e) =>
                              updateCustomPalette(
                                e.target.value,
                                state.customPalette.accent,
                                state.customPalette.text
                              )
                            }
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={state.customPalette.bg}
                            onChange={(e) =>
                              updateCustomPalette(
                                e.target.value,
                                state.customPalette.accent,
                                state.customPalette.text
                              )
                            }
                            className="flex-1 px-2 py-1 bg-input border border-border rounded text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Acento</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="color"
                            value={state.customPalette.accent}
                            onChange={(e) =>
                              updateCustomPalette(
                                state.customPalette.bg,
                                e.target.value,
                                state.customPalette.text
                              )
                            }
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={state.customPalette.accent}
                            onChange={(e) =>
                              updateCustomPalette(
                                state.customPalette.bg,
                                e.target.value,
                                state.customPalette.text
                              )
                            }
                            className="flex-1 px-2 py-1 bg-input border border-border rounded text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Validación de contraste */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">Contraste WCAG</span>
                  {state.validations.contrastAccentBg !== null && (
                    <div className="text-xs text-right">
                      <p>
                        Acento:{" "}
                        <span
                          className={
                            state.validations.contrastAccentBg >= 4.5
                              ? "text-green-400 font-bold"
                              : "text-yellow-400 font-bold"
                          }
                        >
                          {state.validations.contrastAccentBg.toFixed(2)}:1
                        </span>
                      </p>
                      <p>
                        Texto:{" "}
                        <span
                          className={
                            state.validations.contrastTextBg >= 4.5
                              ? "text-green-400 font-bold"
                              : "text-red-400 font-bold"
                          }
                        >
                          {state.validations.contrastTextBg.toFixed(2)}:1
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <div
                    className="flex-1 h-12 rounded border-2 border-white/20"
                    style={{ backgroundColor: palette.bg }}
                  />
                  <div
                    className="flex-1 h-12 rounded border-2 border-white/20 flex items-center justify-center"
                    style={{
                      backgroundColor: palette.bg,
                      color: palette.text,
                    }}
                  >
                    <span className="text-sm font-bold">Texto</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selección de imagen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🖼️ Imagen del Host</CardTitle>
              <CardDescription>Elige cómo aparece la figura humana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {HOST_IMAGES.map((img) => (
                  <button
                    key={img.value}
                    onClick={() => setHostImage(img.value as "REF_1" | "REF_2" | "none")}
                    className={`p-4 rounded-lg border-2 transition text-center ${
                      state.hostImage === img.value
                        ? "border-primary ring-2 ring-primary/30 bg-accent"
                        : "border-border hover:border-primary/30 bg-muted/30"
                    }`}
                  >
                    <div className="text-2xl mb-2">{img.emoji}</div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {img.label.split("(")[0].trim()}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho: Validación y acciones */}
        <div className="col-span-1 space-y-6">
          {/* Estado de validaciones */}
          <Card
            className={`border-2 ${
              canPublish
                ? "border-green-500/50 bg-green-950/20"
                : "border-red-500/50 bg-red-950/20"
            }`}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {canPublish ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">Lista para publicar</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">Incompleto</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.validations.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-red-300">Errores:</p>
                  {state.validations.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-300 flex items-start gap-2">
                      <span>•</span>
                      <span>{err}</span>
                    </p>
                  ))}
                </div>
              )}

              {state.validations.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-yellow-300">Advertencias:</p>
                  {state.validations.warnings.map((warn, i) => (
                    <p key={i} className="text-xs text-yellow-300 flex items-start gap-2">
                      <span>•</span>
                      <span>{warn}</span>
                    </p>
                  ))}
                </div>
              )}

              {state.validations.errors.length === 0 &&
                state.validations.warnings.length === 0 && (
                  <p className="text-xs text-green-300">✓ Todas las validaciones pasaron</p>
                )}
            </CardContent>
          </Card>

          {/* Preview */}
          {showPreview && state.canvasPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Vista Previa</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={state.canvasPreview}
                  alt="Canvas preview"
                  className="w-full rounded border border-border"
                />
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="space-y-3">
            <Button
              onClick={() => {
                generatePreview();
                setShowPreview(true);
              }}
              variant="outline"
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-2" />
              Generar Preview
            </Button>

            <Button
              onClick={handleSave}
              disabled={!canPublish || state.loading}
              className="w-full bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700 text-black font-bold"
            >
              {state.loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {state.loading ? "Guardando..." : "Guardar Pieza"}
            </Button>

            <Button
              onClick={() => navigate("/visual-os")}
              variant="outline"
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>

          {/* Info de palette */}
          <Card className="border-border bg-muted/30">
            <CardHeader>
              <CardTitle className="text-xs font-mono">Paleta: P{state.paletteId}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1 font-mono text-muted-foreground">
              <p>
                <span className="text-foreground">BG:</span> {palette.bg}
              </p>
              <p>
                <span className="text-foreground">Accent:</span> {palette.accent}
              </p>
              <p>
                <span className="text-foreground">Text:</span> {palette.text}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
