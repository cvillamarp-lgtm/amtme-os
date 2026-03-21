/**
 * ExportPanel
 * ───────────
 * Handles PNG/JPG/JSON export + records in the exports table.
 * Export is blocked unless all critical validation checks pass.
 */
import { useState } from "react";
import { FileJson, ImageDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildFileName } from "@/lib/visual-os/palette";
import type { VOSValidationResult } from "@/lib/visual-os/validator";
import type { CopyBlock, VisualTemplate } from "@/lib/visual-os/types";

interface ExportPanelProps {
  template:         VisualTemplate;
  episodeNumber:    string;
  previewDataUrl:   string | null;
  copyBlocks:       CopyBlock[];
  currentVersionId: string | null;
  validation:       VOSValidationResult;
  onExportRecorded: (type: "png"|"jpg"|"json", isFinal: boolean) => void;
  className?:       string;
}

export function ExportPanel({
  template,
  episodeNumber,
  previewDataUrl,
  copyBlocks,
  currentVersionId,
  validation,
  onExportRecorded,
  className,
}: ExportPanelProps) {
  const [isFinal, setIsFinal] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const canExport = validation.pass && !!previewDataUrl;
  const epPadded  = episodeNumber.padStart(2, "0");

  const downloadFile = (dataUrl: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  const handleExportPNG = async () => {
    if (!canExport || !previewDataUrl) return;
    setExporting("png");
    try {
      const fileName = buildFileName(episodeNumber, template.piece_code, "png");
      downloadFile(previewDataUrl, fileName);
      onExportRecorded("png", isFinal);
      toast.success(`Exportado: ${fileName}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportJPG = async () => {
    if (!canExport || !previewDataUrl) return;
    setExporting("jpg");
    try {
      // Convert PNG data URL to JPG via canvas
      const img    = new Image();
      img.src      = previewDataUrl;
      await new Promise<void>(res => { img.onload = () => res(); });
      const canvas  = document.createElement("canvas");
      canvas.width  = template.width_px;
      canvas.height = template.height_px;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const jpgUrl  = canvas.toDataURL("image/jpeg", 0.93);
      const fileName = buildFileName(episodeNumber, template.piece_code, "jpg");
      downloadFile(jpgUrl, fileName);
      onExportRecorded("jpg", isFinal);
      toast.success(`Exportado: ${fileName}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportJSON = () => {
    setExporting("json");
    try {
      const metadata = {
        system:       "AMTME Visual OS v1",
        piece_code:   template.piece_code,
        piece_name:   template.piece_name,
        episode:      `EP. ${epPadded}`,
        format:       template.format,
        dimensions:   `${template.width_px}×${template.height_px}`,
        safe_zones: {
          top:    template.safe_zone_top,
          right:  template.safe_zone_right,
          bottom: template.safe_zone_bottom,
          left:   template.safe_zone_left,
        },
        copy_blocks: copyBlocks.reduce<Record<string, string>>((acc, b) => {
          acc[b.block_name] = b.block_value;
          return acc;
        }, {}),
        validation_score:  validation.score,
        validation_passed: validation.pass,
        exported_at:       new Date().toISOString(),
        version_id:        currentVersionId,
      };
      const json     = JSON.stringify(metadata, null, 2);
      const blob     = new Blob([json], { type: "application/json" });
      const url      = URL.createObjectURL(blob);
      const fileName = buildFileName(episodeNumber, template.piece_code, "json");
      downloadFile(url, fileName);
      URL.revokeObjectURL(url);
      onExportRecorded("json", false);
      toast.success(`Metadata: ${fileName}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {!canExport && (
        <div className="flex items-center gap-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          {!previewDataUrl
            ? "Genera el preview antes de exportar"
            : `${validation.criticalFails} error${validation.criticalFails !== 1 ? "es" : ""} crítico${validation.criticalFails !== 1 ? "s" : ""} — corrige antes de exportar`}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs">
        <Checkbox
          id="is-final"
          checked={isFinal}
          onCheckedChange={v => setIsFinal(!!v)}
          disabled={!canExport}
        />
        <Label htmlFor="is-final" className="text-xs cursor-pointer">
          Marcar como exportación final
        </Label>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant={isFinal ? "default" : "outline"}
          className="h-8 text-xs gap-1.5"
          disabled={!canExport || exporting === "png"}
          onClick={handleExportPNG}
        >
          <ImageDown className="h-3.5 w-3.5" />
          PNG
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          disabled={!canExport || exporting === "jpg"}
          onClick={handleExportJPG}
        >
          <ImageDown className="h-3.5 w-3.5" />
          JPG
        </Button>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="w-full h-8 text-xs gap-1.5 text-muted-foreground"
        onClick={handleExportJSON}
      >
        <FileJson className="h-3.5 w-3.5" />
        Metadata JSON
      </Button>

      {currentVersionId && (
        <p className="text-[10px] text-muted-foreground/50 text-center font-mono">
          {buildFileName(episodeNumber, template.piece_code, "png")}
        </p>
      )}
    </div>
  );
}
