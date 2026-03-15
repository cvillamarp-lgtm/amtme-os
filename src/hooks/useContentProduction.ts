import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export function useContentProduction() {
  const qc = useQueryClient();
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [pieceCopy, setPieceCopy] = useState<PieceCopyMap>({});
  const [assets, setAssets] = useState<Record<number, AssetState>>({});
  const [loading, setLoading] = useState(false);
  const [producing, setProducing] = useState(false);
  const [prodStep, setProdStep] = useState("");
  const [prodCurrent, setProdCurrent] = useState(0);
  const [prodTotal, setProdTotal] = useState(0);

  const extractContent = useCallback(async (
    script: string,
    title: string,
    theme: string,
    epNumber: string
  ) => {
    if (!script && !title && !theme) {
      toast.error("Ingresa al menos un guión, título o tema");
      return null;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Debes iniciar sesión");
        return null;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ script, title, theme }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const rawData = await resp.json();
      const parsed = parseExtraction(rawData);
      if (parsed) {
        setExtraction(parsed);
        const merged: PieceCopyMap = {};
        for (const [k, v] of Object.entries(parsed.pieceCopy)) {
          merged[k] = v.map((line: string) =>
            line.replace(/XX/g, epNumber.padStart(2, "0") || "XX")
          );
        }
        setPieceCopy(merged);
        toast.success("Contenido extraído — revisa las 15 piezas");
        return parsed;
      } else {
        throw new Error("Respuesta incompleta de IA");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImageGenerated = useCallback((pieceId: number, imageUrl: string, prompt: string) => {
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Debes iniciar sesión");
        return;
      }

      const pieces = VISUAL_PIECES.map((p) => ({
        id: p.id,
        name: p.shortName,
        copy: (pieceCopy[String(p.id)] || p.copyTemplate).join(" "),
      }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-captions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            pieces,
            episodeTitle: title,
            episodeNumber: epNumber,
            thesis: extraction.thesis,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      if (data.captions && Array.isArray(data.captions)) {
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
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error(msg);
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
    const piecesToProduce = VISUAL_PIECES.filter((p) => selectedPieces.has(p.id));
    setProdTotal(2 + piecesToProduce.length);
    setProdCurrent(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesión expirada");

      // Step 1: Extract content
      setProdStep("Extrayendo contenido...");
      setProdCurrent(1);

      const extractResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ script, title, theme }),
        }
      );

      if (!extractResp.ok) {
        const err = await extractResp.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error || `Error ${extractResp.status}`);
      }

      const rawData = await extractResp.json();
      const parsed = parseExtraction(rawData);
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

      // Step 2: Generate captions
      setProdStep("Generando captions...");
      setProdCurrent(2);

      try {
        const pieces = VISUAL_PIECES.map((p) => ({
          id: p.id,
          name: p.shortName,
          copy: (mergedCopy[String(p.id)] || p.copyTemplate).join(" "),
        }));

        const captionResp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-captions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              pieces,
              episodeTitle: title,
              episodeNumber: epNumber,
              thesis: parsed.thesis,
            }),
          }
        );

        if (captionResp.ok) {
          const captionData = await captionResp.json();
          if (captionData.captions && Array.isArray(captionData.captions)) {
            setAssets((prev) => {
              const next = { ...prev };
              for (const c of captionData.captions) {
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
          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ prompt, hostReference: piece.hostReference }),
            }
          );

          if (resp.ok) {
            const data = await resp.json();
            if (data.imageUrl) {
              handleImageGenerated(piece.id, data.imageUrl, prompt);
            } else {
              failedPieces.push(piece);
            }
          } else {
            failedPieces.push(piece);
          }
        } catch {
          failedPieces.push(piece);
        }

        if (i < piecesToProduce.length - 1) {
          await new Promise((r) => setTimeout(r, 2000));
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
              await new Promise((r) => setTimeout(r, 3000));
              const resp = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ prompt, hostReference: piece.hostReference }),
                }
              );
              if (resp.ok) {
                const data = await resp.json();
                if (data.imageUrl) {
                  handleImageGenerated(piece.id, data.imageUrl, prompt);
                  continue;
                }
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
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error(msg);
    } finally {
      setProducing(false);
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
