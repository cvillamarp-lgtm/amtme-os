import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { showEdgeFunctionError } from "@/services/functions/edgeFunctionErrors";
import { setProductionLock } from "./useProductionLock";
import { VISUAL_PIECES, buildPiecePrompt, type EpisodeInput, type VisualPiece } from "@/lib/visual-templates";
import { toast } from "sonner";

type PieceCopyMap = Record<string, string[]>;

interface ExtractionResult {
  thesis: string;
  keyPhrases: string[];
  pieceCopy: PieceCopyMap;
}

interface AssetState {
  imageUrl?: string;
  caption: string;
  hashtags: string;
  status: string;
  promptUsed?: string;
}

// Convert seccionA/seccionB format from extract-content to internal format
function parseExtraction(data: Record<string, unknown>): ExtractionResult | null {
  if (data.seccionA && data.seccionB) {
    const secA = data.seccionA as { tesisCentral?: string; frasesClaves?: string[] };
    const thesis = secA.tesisCentral || "";
    const keyPhrases = secA.frasesClaves || [];
    const pieceCopy: PieceCopyMap = {};

    const secBKeys = [
      "portada", "lanzamiento", "reel", "story_lanzamiento", "story_quote",
      "quote_feed", "slide1", "slide2", "slide3", "slide4",
      "slide5", "slide6", "slide7", "slide8", "highlight",
    ];

    const secB = data.seccionB as Record<string, Record<string, string>>;
    secBKeys.forEach((key, idx) => {
      const pieceData = secB[key];
      if (pieceData && typeof pieceData === "object") {
        const lines = Object.values(pieceData).filter((v): v is string => typeof v === "string" && v.length > 0);
        if (lines.length > 0) {
          pieceCopy[String(idx + 1)] = lines;
        }
      }
    });

    return { thesis, keyPhrases, pieceCopy };
  }

  if (data.thesis && data.pieceCopy) {
    return data as unknown as ExtractionResult;
  }

  return null;
}

export function useContentProduction(episodeId?: string | null) {
  const qc = useQueryClient();
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [pieceCopy, setPieceCopy] = useState<PieceCopyMap>({});
  const [assets, setAssets] = useState<Record<number, AssetState>>({});

  // On mount: restore assets + copy from content_assets.
  // Falls back to episodes.derived_copies_json (legacy) and migrates automatically.
  useEffect(() => {
    if (!episodeId) return;

    const restore = async () => {
      const [{ data: rows }, { data: ep }] = await Promise.all([
        supabase
          .from("content_assets")
          .select("piece_id, image_url, caption, hashtags, prompt_used, status, copy_json")
          .eq("episode_id", episodeId)
          .order("piece_id", { ascending: true }),
        supabase
          .from("episodes")
          .select("core_thesis, derived_copies_json")
          .eq("id", episodeId)
          .single(),
      ]);

      const loadedAssets: Record<number, AssetState> = {};
      const loadedCopy: PieceCopyMap = {};

      // 1 — Try new system: content_assets.copy_json
      for (const row of rows ?? []) {
        const copyLines = (row as { copy_json?: unknown }).copy_json;
        if (row.image_url || row.caption) {
          loadedAssets[row.piece_id] = {
            imageUrl: row.image_url ?? undefined,
            caption: row.caption ?? "",
            hashtags: row.hashtags ?? "",
            status: row.status ?? "pending",
            promptUsed: row.prompt_used ?? undefined,
          };
        }
        if (Array.isArray(copyLines) && copyLines.length > 0) {
          loadedCopy[String(row.piece_id)] = copyLines as string[];
        }
      }

      // 2 — Fallback: episodes.derived_copies_json (legacy format — migrate automatically)
  const legacyCopy = (ep as { derived_copies_json?: PieceCopyMap | null })?.derived_copies_json ?? null;
  const thesis = (ep as { core_thesis?: string | null })?.core_thesis ?? "";

      if (Object.keys(loadedCopy).length === 0 && legacyCopy && Object.keys(legacyCopy).length > 0) {
        // Migrate legacy copy into content_assets.copy_json silently
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const migrateRows = VISUAL_PIECES.map((p) => ({
            user_id: session.user.id,
            piece_id: p.id,
            piece_name: p.shortName,
            copy_json: legacyCopy[String(p.id)] ?? p.copyTemplate,
            status: "pending",
            episode_id: episodeId,
          }));
          await supabase
            .from("content_assets")
            .upsert(migrateRows, { onConflict: "user_id,piece_id,episode_id" });
        }
        Object.assign(loadedCopy, legacyCopy);
      }

      // Apply restored state
      if (Object.keys(loadedAssets).length > 0) setAssets(loadedAssets);
      if (Object.keys(loadedCopy).length > 0) {
        setPieceCopy(loadedCopy);
        setExtraction({ thesis, keyPhrases: [], pieceCopy: loadedCopy });
        toast.info("Piezas restauradas — continúa sin volver a extraer");
      }
    };

    restore().catch((e) => console.error("[restore]", e));
  }, [episodeId]);
  const [loading, setLoading] = useState(false);
  const [producing, setProducing] = useState(false);
  const [prodStep, setProdStep] = useState("");
  const [prodCurrent, setProdCurrent] = useState(0);
  const [prodTotal, setProdTotal] = useState(0);

  // Auto-save extraction — copy_json per piece in content_assets (single source of truth)
  const autoSaveExtraction = useCallback(async (
    parsed: ExtractionResult,
    mergedCopy: PieceCopyMap,
    epId: string | null,
  ) => {
    if (!epId) return; // only persist when linked to an episode
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Save thesis to episode (lightweight — just one field)
      await supabase
        .from("episodes")
        .update({ core_thesis: parsed.thesis } as object)
        .eq("id", epId);

      // Upsert all 15 pieces with copy_json — existing images/captions preserved via merge
      const rows = VISUAL_PIECES.map((p) => ({
        user_id: session.user.id,
        piece_id: p.id,
        piece_name: p.shortName,
        copy_json: mergedCopy[String(p.id)] ?? p.copyTemplate,
        status: "pending",
        episode_id: epId,
      }));

      await supabase
        .from("content_assets")
        .upsert(rows, { onConflict: "user_id,piece_id,episode_id" });
    } catch (e) {
      console.error("[autoSaveExtraction]", e);
    }
  }, []);

  const extractContent = useCallback(async (
    script: string,
    title: string,
    theme: string,
    epNumber: string,
    episodeId?: string | null,
  ) => {
    if (!script && !title && !theme) {
      toast.error("Ingresa al menos un guión, título o tema");
      return null;
    }
    setLoading(true);
    try {
      const rawData = await invokeEdgeFunction("extract-content", { script, title, theme }, { timeoutMs: 60_000 });
      const parsed = parseExtraction(rawData as Record<string, unknown>);
      if (parsed) {
        setExtraction(parsed);
        const merged: PieceCopyMap = {};
        for (const [k, v] of Object.entries(parsed.pieceCopy)) {
          merged[k] = v.map((line: string) =>
            line.replace(/XX/g, epNumber.padStart(2, "0") || "XX")
          );
        }
        setPieceCopy(merged);
        // Auto-save so the user can resume without re-paying
        await autoSaveExtraction(parsed, merged, episodeId ?? null);
        toast.success("Contenido extraído y guardado — revisa las 15 piezas");
        return parsed;
      } else {
        throw new Error("Respuesta incompleta de IA");
      }
    } catch (e: unknown) {
      showEdgeFunctionError(e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [autoSaveExtraction]);

  const handleImageGenerated = useCallback(async (
    pieceId: number,
    imageUrl: string,
    prompt: string,
    episodeId?: string | null,
  ) => {
    // Update local state immediately
    setAssets((prev) => ({
      ...prev,
      [pieceId]: {
        ...prev[pieceId],
        imageUrl,
        status: "generated",
        promptUsed: prompt,
        caption: prev[pieceId]?.caption || "",
        hashtags: prev[pieceId]?.hashtags || "",
      },
    }));

    // Auto-persist to DB so the image survives page refreshes
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const piece = VISUAL_PIECES.find((p) => p.id === pieceId);
      if (!piece) return;

      await supabase.from("content_assets").upsert(
        {
          user_id: session.user.id,
          piece_id: pieceId,
          piece_name: piece.shortName,
          image_url: imageUrl,
          prompt_used: prompt,
          status: "generated",
          episode_id: episodeId ?? null,
        },
        { onConflict: "user_id,piece_id,episode_id" },
      );
    } catch (e) {
      console.error("[handleImageGenerated] auto-save failed:", e);
    }
  }, []);

  const updatePieceCopy = useCallback((pieceId: number, lineIndex: number, value: string) => {
    setPieceCopy((prev) => {
      const piece = VISUAL_PIECES.find((p) => p.id === pieceId)!;
      const current = [...(prev[String(pieceId)] || piece.copyTemplate)];
      current[lineIndex] = value;
      return { ...prev, [String(pieceId)]: current };
    });
  }, []);

  const handleCaptionChange = useCallback((pieceId: number, field: "caption" | "hashtags", value: string) => {
    setAssets((prev) => ({
      ...prev,
      [pieceId]: {
        ...prev[pieceId],
        [field]: value,
        status: prev[pieceId]?.status || "pending",
        caption: field === "caption" ? value : (prev[pieceId]?.caption || ""),
        hashtags: field === "hashtags" ? value : (prev[pieceId]?.hashtags || ""),
      },
    }));
  }, []);

  const approveAsset = useCallback((pieceId: number) => {
    setAssets((prev) => ({
      ...prev,
      [pieceId]: { ...prev[pieceId], status: "approved", caption: prev[pieceId]?.caption || "", hashtags: prev[pieceId]?.hashtags || "" },
    }));
    toast.success("Pieza aprobada");
  }, []);

  const deleteAsset = useCallback((pieceId: number) => {
    setAssets((prev) => {
      const next = { ...prev };
      delete next[pieceId];
      return next;
    });
    toast.success("Asset eliminado");
  }, []);

  const generateCaptions = useCallback(async (
    title: string,
    epNumber: string,
  ) => {
    if (!extraction) {
      toast.error("Primero extrae el contenido del guión");
      return;
    }
    setLoading(true);
    try {
      const pieces = VISUAL_PIECES.map((p) => ({
        id: p.id,
        name: p.shortName,
        copy: (pieceCopy[String(p.id)] || p.copyTemplate).join(" "),
      }));

      const data = await invokeEdgeFunction<{ captions?: Array<{ pieceId: number; caption: string; hashtags: string }> }>(
        "generate-captions",
        { pieces, episodeTitle: title, episodeNumber: epNumber, thesis: extraction.thesis },
        { timeoutMs: 60_000 }
      );
      if (data?.captions && Array.isArray(data.captions)) {
        setAssets((prev) => {
          const next = { ...prev };
          for (const c of data.captions) {
            next[c.pieceId] = {
              ...next[c.pieceId],
              caption: c.caption || "",
              hashtags: c.hashtags || "",
              status: next[c.pieceId]?.status || "pending",
            };
          }
          return next;
        });
        toast.success("Captions generados para las 15 piezas");
      }
    } catch (e: unknown) {
      showEdgeFunctionError(e);
    } finally {
      setLoading(false);
    }
  }, [extraction, pieceCopy]);

  const saveToDatabase = useCallback(async (episodeId: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión");
        return;
      }

      const rows = Object.entries(assets)
        .filter(([_, a]) => a.imageUrl || a.caption)
        .map(([pieceId, a]) => {
          const piece = VISUAL_PIECES.find((p) => p.id === Number(pieceId))!;
          return {
            user_id: session.user.id,
            piece_id: Number(pieceId),
            piece_name: piece.shortName,
            image_url: a.imageUrl || null,
            caption: a.caption || null,
            hashtags: a.hashtags || null,
            prompt_used: a.promptUsed || null,
            status: a.status,
            episode_id: episodeId || null,
          };
        });

      if (rows.length === 0) {
        toast.error("No hay assets para guardar");
        return;
      }

      const { error } = await supabase
        .from("content_assets")
        .upsert(rows, { onConflict: "user_id,piece_id,episode_id" });
      if (error) throw error;

      toast.success(`${rows.length} assets guardados`);
      if (episodeId) {
        qc.invalidateQueries({ queryKey: ["episode-assets", episodeId] });
      }
      qc.invalidateQueries({ queryKey: ["library-assets"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error(msg);
    }
  }, [assets, qc]);

  const produceAll = useCallback(async (
    script: string,
    title: string,
    theme: string,
    epNumber: string,
    episodeId: string | null,
    selectedPieces: Set<number>,
  ) => {
    if (!script && !title) {
      toast.error("Ingresa al menos un guión o título");
      return;
    }
    if (selectedPieces.size === 0) {
      toast.error("Selecciona al menos una pieza");
      return;
    }
    setProducing(true);
    setProductionLock(true);
    const piecesToProduce = VISUAL_PIECES.filter((p) => selectedPieces.has(p.id));
    setProdTotal(2 + piecesToProduce.length);
    setProdCurrent(0);

    try {
      // Step 1: Extract content
      setProdStep("Extrayendo contenido...");
      setProdCurrent(1);

      const rawData = await invokeEdgeFunction("extract-content", { script, title, theme }, { timeoutMs: 60_000 });
      const parsed = parseExtraction(rawData as Record<string, unknown>);
      if (!parsed) throw new Error("Respuesta incompleta de IA");

      setExtraction(parsed);
      const epNum = epNumber.padStart(2, "0") || "XX";
      const mergedCopy: PieceCopyMap = {};
      for (const [k, v] of Object.entries(parsed.pieceCopy)) {
        mergedCopy[k] = v.map((line: string) => line.replace(/XX/g, epNum));
      }
      setPieceCopy(mergedCopy);

      const localEpisodeInput: EpisodeInput = {
        number: epNumber || "XX",
        thesis: parsed.thesis,
        keyPhrases: parsed.keyPhrases,
      };

      // Step 2: Generate captions (best-effort — don't fail the whole run)
      setProdStep("Generando captions...");
      setProdCurrent(2);

      try {
        const pieces = VISUAL_PIECES.map((p) => ({
          id: p.id,
          name: p.shortName,
          copy: (mergedCopy[String(p.id)] || p.copyTemplate).join(" "),
        }));

        const captionData = await invokeEdgeFunction<{
          captions?: Array<{ pieceId: number; caption: string; hashtags: string }>;
        }>("generate-captions", {
          pieces,
          episodeTitle: title,
          episodeNumber: epNumber,
          thesis: parsed.thesis,
        }, { timeoutMs: 60_000 });

        if (captionData?.captions && Array.isArray(captionData.captions)) {
          setAssets((prev) => {
            const next = { ...prev };
            for (const c of captionData.captions!) {
              next[c.pieceId] = {
                ...next[c.pieceId],
                caption: c.caption || "",
                hashtags: c.hashtags || "",
                status: next[c.pieceId]?.status || "pending",
              };
            }
            return next;
          });
        }
      } catch (e) {
        console.error("Caption generation error:", e);
      }

      // Step 3: Generate images with retry queue
      const failedPieces: VisualPiece[] = [];

      for (let i = 0; i < piecesToProduce.length; i++) {
        const piece = piecesToProduce[i];
        setProdStep(`Generando imagen ${i + 1}/${piecesToProduce.length}: ${piece.shortName}`);
        setProdCurrent(3 + i);

        const copy = mergedCopy[String(piece.id)] || piece.copyTemplate;
        const prompt = buildPiecePrompt(piece, localEpisodeInput, copy);

        try {
              const imgData = await invokeEdgeFunction<{ imageUrl?: string }>(
                "generate-image",
                { prompt, hostReference: piece.hostReference, episodeId, pieceId: piece.id },
                { timeoutMs: 120_000, maxRetries: 0 }
              );
          if (imgData?.imageUrl) {
            handleImageGenerated(piece.id, imgData.imageUrl, prompt, episodeId);
          } else {
            failedPieces.push(piece);
          }
        } catch {
          failedPieces.push(piece);
        }

        if (i < piecesToProduce.length - 1) {
          await new Promise((r) => setTimeout(r, 4500)); // 15 RPM limit → 4s min
        }
      }

      // Step 4: Retry failed pieces
      if (failedPieces.length > 0) {
        setProdStep(`Reintentando ${failedPieces.length} piezas fallidas...`);
        let remaining = [...failedPieces];
        for (let retry = 0; retry < 2; retry++) {
          const stillFailing: VisualPiece[] = [];
          for (const piece of remaining) {
            const copy = mergedCopy[String(piece.id)] || piece.copyTemplate;
            const prompt = buildPiecePrompt(piece, localEpisodeInput, copy);
            try {
              await new Promise((r) => setTimeout(r, 5000)); // extra buffer on retries
              const imgData = await invokeEdgeFunction<{ imageUrl?: string }>(
                "generate-image",
                { prompt, hostReference: piece.hostReference, episodeId, pieceId: piece.id },
                { timeoutMs: 120_000, maxRetries: 0 }
              );
              if (imgData?.imageUrl) {
                handleImageGenerated(piece.id, imgData.imageUrl, prompt, episodeId);
                continue;
              }
              stillFailing.push(piece);
            } catch {
              stillFailing.push(piece);
            }
          }
          if (stillFailing.length === 0) break;
          remaining = stillFailing;
        }
        if (remaining.length > 0) {
          toast.error(`${remaining.length} piezas no pudieron generarse: ${remaining.map(p => p.shortName).join(", ")}`);
        }
      }

      // Save all
      setProdStep("Guardando assets...");
      setProdCurrent(2 + piecesToProduce.length);
      await new Promise((r) => setTimeout(r, 500));
      // saveToDatabase will be called externally after produceAll
    } catch (e: unknown) {
      showEdgeFunctionError(e);
    } finally {
      setProducing(false);
      setProductionLock(false);
    }
  }, [handleImageGenerated]);

  return {
    extraction,
    pieceCopy,
    assets,
    loading,
    producing,
    prodStep,
    prodCurrent,
    prodTotal,
    extractContent,
    handleImageGenerated,
    updatePieceCopy,
    handleCaptionChange,
    approveAsset,
    deleteAsset,
    generateCaptions,
    saveToDatabase,
    produceAll,
    setExtraction,
    setPieceCopy,
    setAssets,
  };
}
