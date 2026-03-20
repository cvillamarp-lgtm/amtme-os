/**
 * PiecePreviewCanvas
 * ──────────────────
 * Renders a live preview of an AMTME visual piece using buildLocalComposite.
 * Shows safe zone overlay + grid when technicalMode is true.
 */
import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildLocalComposite } from "@/lib/canvas-text-overlay";
import { toCanvasPiece } from "@/lib/visual-os/types";
import { env } from "@/lib/env";
import type { VisualTemplate, CopyBlock } from "@/lib/visual-os/types";

interface PiecePreviewCanvasProps {
  template:      VisualTemplate;
  copyBlocks:    CopyBlock[];
  episodeNumber: string;
  technicalMode?: boolean;
  showGrid?:      boolean;
  className?:     string;
  onPreviewReady?: (dataUrl: string) => void;
}

export function PiecePreviewCanvas({
  template,
  copyBlocks,
  episodeNumber,
  technicalMode = false,
  showGrid = false,
  className,
  onPreviewReady,
}: PiecePreviewCanvasProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!template || !copyBlocks.length) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const piece  = toCanvasPiece(template, copyBlocks);
        const lines  = copyBlocks
          .sort((a, b) => a.order_index - b.order_index)
          .map(b => b.block_value);
        const url = await buildLocalComposite(
          piece as any,
          lines,
          episodeNumber,
          env.VITE_SUPABASE_URL,
        );
        setPreviewUrl(url);
        onPreviewReady?.(url);
      } catch (e) {
        setError("No se pudo generar el preview");
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [template.id, copyBlocks, episodeNumber]);

  const aspectRatio = template.width_px / template.height_px;

  // Safe zone overlay measurements (scaled to container)
  const safeOverlay = technicalMode ? {
    top:    `${(template.safe_zone_top    / template.height_px) * 100}%`,
    right:  `${(template.safe_zone_right  / template.width_px)  * 100}%`,
    bottom: `${(template.safe_zone_bottom / template.height_px) * 100}%`,
    left:   `${(template.safe_zone_left   / template.width_px)  * 100}%`,
  } : null;

  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-black", className)}
      style={{ aspectRatio }}
    >
      {/* Image */}
      {previewUrl && (
        <img
          src={previewUrl}
          alt={template.piece_name}
          className="w-full h-full object-cover"
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Placeholder when no preview yet */}
      {!previewUrl && !loading && !error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ backgroundColor: template.background_color }}
        >
          <p className="text-white/40 text-xs font-mono">{template.piece_code}</p>
          <p className="text-white/20 text-[10px]">
            {template.width_px}×{template.height_px}
          </p>
        </div>
      )}

      {/* Technical mode: safe zone lines */}
      {technicalMode && safeOverlay && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 1px rgba(234,255,0,0.5)`,
            margin: `${safeOverlay.top} ${safeOverlay.right} ${safeOverlay.bottom} ${safeOverlay.left}`,
          }}
        />
      )}

      {/* Technical mode: corner labels */}
      {technicalMode && (
        <>
          <div className="absolute top-1 left-1 text-[8px] font-mono text-[#EAFF00]/70 leading-none">
            {template.safe_zone_left}px
          </div>
          <div className="absolute top-1 right-1 text-[8px] font-mono text-[#EAFF00]/70 leading-none">
            {template.width_px}×{template.height_px}
          </div>
          <div className="absolute bottom-1 left-1 text-[8px] font-mono text-[#EAFF00]/70 leading-none">
            {template.format}
          </div>
        </>
      )}

      {/* Grid overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: "linear-gradient(to right, #EAFF00 1px, transparent 1px), linear-gradient(to bottom, #EAFF00 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />
      )}
    </div>
  );
}
