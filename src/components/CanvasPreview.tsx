/**
 * CanvasPreview
 * Componente que renderiza una previa del asset visual con validaciones en tiempo real
 */

import { useEffect, useRef } from "react";
import {
  renderCanvas,
  CanvasRenderConfig,
  drawGridOverlay,
  drawSafeZoneOverlay,
} from "@/lib/canvas-text-overlay";
import { AlertCircle } from "lucide-react";

export interface CanvasPreviewProps {
  config: CanvasRenderConfig;
  showGrid?: boolean;
  showSafeZone?: boolean;
  contrastWarnings?: string[];
  containerClass?: string;
}

export function CanvasPreview({
  config,
  showGrid = false,
  showSafeZone = true,
  contrastWarnings = [],
  containerClass = "w-full max-w-2xl",
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const width = containerRef.current.offsetWidth;
    const height = Math.round(width * 1.778); // 16:9 aspect ratio

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render main canvas
    renderCanvas(ctx, config, width, height);

    // Overlay optional guides
    if (showSafeZone) {
      drawSafeZoneOverlay(ctx, width, height, "rgba(59, 130, 246, 0.3)");
    }
    if (showGrid) {
      drawGridOverlay(ctx, width, height, 12, "rgba(156, 163, 175, 0.1)");
    }
  }, [config, showGrid, showSafeZone]);

  return (
    <div ref={containerRef} className={containerClass}>
      <div className="space-y-3">
        {/* Canvas */}
        <div className="rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-900">
          <canvas
            ref={canvasRef}
            className="w-full h-auto block"
          />
        </div>

        {/* Warnings */}
        {contrastWarnings.length > 0 && (
          <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-700/50 space-y-2">
            {contrastWarnings.map((warn, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-300/90">{warn}</p>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-slate-400 space-y-1">
          <p>Paleta: <span className="font-mono text-slate-300">{config.paletteId}</span></p>
          <p>Dimensiones: <span className="font-mono text-slate-300">16:9 (Instagram Reels/TikTok)</span></p>
          {showSafeZone && <p>📍 Línea azul: zona de contenido seguro (90% del ancho)</p>}
          {showGrid && <p>📏 Cuadrícula: 12 columnas para alineación</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * CanvasPreviewStandalone
 * Versión simplificada para embeber en páginas sin estar dentro de editor
 */
export function CanvasPreviewStandalone({
  keyword,
  headline,
  paletteId,
  hostImage,
  className = "",
}: {
  keyword: string;
  headline: string;
  paletteId: 1 | 2 | 3 | 4 | 5;
  hostImage: "REF_1" | "REF_2" | "none";
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = 1080;
    const height = 1920;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config: CanvasRenderConfig = {
      keyword,
      headline,
      paletteId: paletteId as 1 | 2 | 3 | 4,
      hostImage,
    };

    renderCanvas(ctx, config, width, height);
  }, [keyword, headline, paletteId, hostImage]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-auto rounded-lg border border-slate-700 ${className}`}
      style={{ aspectRatio: "9/16" }}
    />
  );
}
