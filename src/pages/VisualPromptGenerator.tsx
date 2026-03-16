import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Copy, Check, ChevronDown, ChevronUp, Layers,
  Sparkles, Download, Image as ImageIcon, Loader2, Zap, History, Trash2, Link2, Palette,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import { useAuth } from "@/hooks/useAuth";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface EpisodeData {
  numero: string;
  tesis: string;
  copy_portada: string;
  copy_lanzamiento: string;
  copy_reel: string;
  copy_story_lanzamiento: string;
  copy_story_quote: string;
  copy_quote_feed: string;
  copy_slide1: string;
  copy_slide2: string;
  copy_slide3: string;
  copy_slide4: string;
  copy_slide5: string;
  copy_slide6: string;
  copy_slide7: string;
  copy_slide8: string;
  copy_highlight: string;
}

interface Pieza {
  id: string;
  nombre: string;
  formato: string;
  px: string;
  safeZone: string;
  composicion: string;
  copyKey: keyof EpisodeData;
  hostRef: "imagen01" | "imagen02";
}

// ─── SISTEMA FIJO DE PIEZAS ───────────────────────────────────────────────────

const PIEZAS: Pieza[] = [
  {
    id: "portada",
    nombre: "Portada Episodio",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 90–990 px (margen 90 px en los 4 lados — zona activa 900×900 px)",
    composicion:
      "Portada autónoma legible en miniatura. Jerarquía: (1) frase principal, (2) host, (3) EP.XX / nombre del podcast. Host con presencia editorial limpia, centrado ±20px. Espacio negativo generoso.\n\nCOORDENADAS EXACTAS 1080×1080:\nHost centrado ±20px · figura completa Y:100–950px · Ojos host Y:220–280px, X:500–700px\nNivel 1 (dominante #F2C84B): Y:420–580px · X:90px · máx 2 líneas\nNivel 2 (contexto #F5F0E8): Y:260–350px · X:90px\nGrupos Gestalt: G1-encabezado Y:100–150px · G2-titular Y:260–580px · G3-subtítulo+CTA Y:620–750px · G4-logos+firma Y:800–950px\nZona tipográfica principal: X:90–500px · El host NO puede invadir esta zona\nMínimo 40px de separación entre grupos · El texto dominante NO puede tapar el rostro del host",
    copyKey: "copy_portada",
  },
  {
    id: "lanzamiento",
    nombre: "Lanzamiento Principal",
    formato: "Feed 4:5",
    px: "1080×1350 px",
    hostRef: "imagen02",
    safeZone: "x: 90–990 px · y: 120–1230 px (zona activa 900×1110 px — riesgo de corte en franjas Y:0–120 e Y:1230–1350)",
    composicion:
      "Pieza de anuncio principal. Jerarquía: (1) titular dominante, (2) host, (3) señal de lanzamiento, (4) EP.XX / Instagram. Host ocupa zona derecha sin competir con titular. Verde como acento mínimo en 'NUEVO EPISODIO'. Seria, editorial, muy clara.\n\nCOORDENADAS EXACTAS 1080×1350:\nHost desplazado levemente a la derecha · X-centroide: 580–640px · Figura Y:140–1150px · Ojos Y:280–360px, X:560–700px\nNivel 6B (metadatos AMTME): Y:150–190px · X:90px\nNivel 2 (contexto): Y:330–420px · X:90px\nNivel 1 (dominante #F2C84B): Y:470–630px · X:90px · máx 2 líneas\nNivel 3 (complemento): Y:660–730px · X:90px\nNivel 4 (subtítulo): Y:800–880px · X:90px\nNivel 5 (CTA): Y:950px · X:90px\nNivel 6 (logos Spotify+Apple): Y:1010–1060px · X:90px\nNivel 6C (firma CHRISTIAN VILLAMAR): Y:1180–1220px · X:90px\nGrupos Gestalt: G1-metadatos Y:150–190 · G2-titular Y:330–730 · G3-subtítulo+CTA Y:800–980 · G4-logos+firma Y:1010–1220\nZona tipográfica: X:90–480px · Zona host: X:440–990px · El texto dominante NO puede tapar el rostro del host",
    copyKey: "copy_lanzamiento",
  },
  {
    id: "reel",
    nombre: "Reel Cover",
    formato: "9:16",
    px: "1080×1920 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 250–1670 px. Rostro y titular dentro del área central compatible con recorte 4:5.",
    composicion:
      "Portada vertical limpia, contundente, legible tanto en story como en crop de feed. Jerarquía: (1) titular corto, (2) host, (3) EP.XX / marca. Encuadre editorial vertical. Evitar texto largo. Título debe leerse instantáneamente.",
    copyKey: "copy_reel",
  },
  {
    id: "story_lanzamiento",
    nombre: "Story de Lanzamiento",
    formato: "9:16",
    px: "1080×1920 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 250–1670 px (Laterales: 90 px · Superior: 250 px · Inferior: 250 px)",
    composicion:
      "Lectura en segundos. Jerarquía: (1) titular, (2) CTA, (3) host, (4) EP.XX / usuario. Verde solo para CTA o 'NUEVO EPISODIO'. No saturar. Mucho espacio negativo.",
    copyKey: "copy_story_lanzamiento",
  },
  {
    id: "story_quote",
    nombre: "Story Quote",
    formato: "9:16",
    px: "1080×1920 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 250–1670 px (Laterales: 90 px · Superior: 250 px · Inferior: 250 px)",
    composicion:
      "Pieza centrada en la frase. Host secundario o como recorte sutil. Prioridad: lectura emocional del quote. Mucha contención visual. Puede usarse línea fina, caja o acento mínimo en verde.",
    copyKey: "copy_story_quote",
  },
  {
    id: "quote_feed",
    nombre: "Quote Feed",
    formato: "Feed 4:5",
    px: "1080×1350 px",
    hostRef: "imagen02",
    safeZone: "x: 90–990 px · y: 120–1230 px (zona activa 900×1110 px — riesgo de corte en franjas Y:0–120 e Y:1230–1350)",
    composicion:
      "Frase dominante. Marca pequeña. Host muy sutil o ausente si la pieza funciona mejor tipográfica. Sensación editorial guardable y compartible. Zona tipográfica principal: X:90–480px.",
    copyKey: "copy_quote_feed",
  },
  {
    id: "slide1",
    nombre: "Carrusel — Slide 1 (Portada)",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 90–990 px (margen 90 px en los 4 lados)",
    composicion:
      "Portada autónoma del carrusel. Jerarquía: (1) titular, (2) host, (3) numeración / episodio.",
    copyKey: "copy_slide1",
  },
  {
    id: "slide2",
    nombre: "Carrusel — Slide 2",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 90–990 px (margen 90 px en los 4 lados)",
    composicion: "Una sola idea visual. Máxima contundencia. Puede ser muy tipográfico.",
    copyKey: "copy_slide2",
  },
  {
    id: "slide3",
    nombre: "Carrusel — Slide 3",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 90–990 px (margen 90 px en los 4 lados)",
    composicion:
      "Organizar el texto para expresar tensión y loop. Usar separación de bloques para reforzar distancia entre ideas.",
    copyKey: "copy_slide3",
  },
  {
    id: "slide4",
    nombre: "Carrusel — Slide 4",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 90–990 px (margen 90 px en los 4 lados)",
    composicion:
      "Dar protagonismo a la frase de impacto central. Acento en amarillo #F2C84B solo si ayuda a memorabilidad.",
    copyKey: "copy_slide4",
  },
  {
    id: "slide5",
    nombre: "Carrusel — Slide 5",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 90–990 px (margen 90 px en los 4 lados)",
    composicion: "Muy tipográfico. Sobrio. Directo.",
    copyKey: "copy_slide5",
  },
  {
    id: "slide6",
    nombre: "Carrusel — Slide 6",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 90–990 px (margen 90 px en los 4 lados)",
    composicion: "Bloques tipográficos tensos. Alta legibilidad.",
    copyKey: "copy_slide6",
  },
  {
    id: "slide7",
    nombre: "Carrusel — Slide 7",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 90–990 px (margen 90 px en los 4 lados)",
    composicion:
      "Clímax emocional del carrusel. Más espacio negativo. Máxima contención.",
    copyKey: "copy_slide7",
  },
  {
    id: "slide8",
    nombre: "Carrusel — Slide 8 (CTA Final)",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "x: 90–990 px · y: 90–990 px (margen 90 px en los 4 lados)",
    composicion:
      "Cierre claro. CTA directo. Acento en amarillo #F2C84B solo en elemento de cierre.",
    copyKey: "copy_slide8",
  },
  {
    id: "highlight",
    nombre: "Highlight Cover",
    formato: "Feed 1:1",
    px: "1080×1080 px",
    hostRef: "imagen01",
    safeZone: "Elemento principal centrado dentro de zona circular segura — x: 90–990 · y: 90–990 px",
    composicion:
      "Sin texto largo. Solo número del episodio o 'EP'. Diseño mínimo reconocible en miniatura. Fondo COBALT #1A1AE6 o NEGRO #0A0A0A. Sin host.",
    copyKey: "copy_highlight",
  },
];

// ─── INSTRUCCIÓN MAESTRA FIJA ─────────────────────────────────────────────────

const INSTRUCCION_FIJA = `
PALETA ÚNICA PERMITIDA (SOLO ESTOS COLORES — cualquier color fuera = ERROR de producción)
COBALT #1A1AE6 · COBALT DARK #1212A0 · CREAM #F5F0E8 · AMARILLO #F2C84B · NEGRO #0A0A0A · BLANCO #FFFFFF · GRIS SECUNDARIO #CCCCCC · GRIS FIRMA #888888

REGLAS DE COLOR
- Máximo 3 colores activos por pieza (fondo + cream + amarillo)
- El amarillo (#F2C84B) SOLO va en el elemento dominante tipográfico (nivel 1)
- El cobalt azul (#1A1AE6) es color estructural y de fondo
- El cream (#F5F0E8) es tipografía por defecto sobre cobalt o negro
- El negro editorial (#0A0A0A) como fondo alternativo
- No usar glow ni sombra de color activo
- Amarillo: saturación −10%, sin glow
- Cobalt fondo: luminosidad −5% para mayor peso visual

ESTÉTICA OBLIGATORIA
Editorial · contemporánea · limpia · psicológica · sobria · íntima · memorable · emocionalmente madura
La pieza debe entenderse en menos de 0.7 segundos en scroll móvil

SISTEMA TIPOGRÁFICO (6 NIVELES)
Nivel 1 — Dominante: 100% (72-88px), Black/ExtraBold, #F2C84B, tracking −10 a 0, interlineado −8% a −10%
Nivel 2 — Secundario: 72% (52-64px), Bold/SemiBold, #F5F0E8, tracking +10
Nivel 3 — Terciario: 60% (44-52px), Medium/Regular, #F5F0E8, tracking +10 a +15
Nivel 4 — Subtítulo: 52% (36-44px), Regular/Light, #CCCCCC, tracking +15
Nivel 5 — CTA: 45% (32-38px), Medium/Condensado, #F5F0E8 opacidad 90%, tracking +20 a +30
Nivel 6 — Firma/Logos: 38% (24-28px), Light, #888888 opacidad 85%, tracking +30 a +40

REGLAS TIPOGRÁFICAS
Sans serif editorial contemporánea. No usar cursivas. No duplicar dominantes. Máx. 2 pesos por bloque. Mayúsculas siempre.

HOST (OBLIGATORIO — usar foto de referencia)
Hombre latino, 35–42 años, barba corta, tatuaje brazo izquierdo visible, cap verde.
Lente 85mm, f/4, ISO 100. Iluminación frontal suave. Expresión natural, íntima, no posada.
Piel realista, sin retoque excesivo. Acabado cinematográfico editorial.
IMAGEN 01: Sentado al revés en silla de madera, camiseta blanca AMTME, fondo negro #0A0A0A.
IMAGEN 02: Sentado en suelo, camiseta azul AMTME, fondo cobalt #1A1AE6 o negro #0A0A0A.

COMPOSICIÓN
Retícula 12 columnas, márgenes 90px, gutter 24px. Un solo dominante claro. Máximo 4 grupos visuales.
Tipografía NO puede tapar la cara del host. Mínimo 40px entre grupos. Espacio negativo activo.
Orden lectura: Dominante → Contexto → Complemento → Subtítulo → CTA → Firma/logos.

SAFE ZONES
1080×1080: X 90–990 / Y 90–990
1080×1350: X 90–990 / Y 120–1230
1080×1920: X 90–990 / Y 250–1670

ELEMENTOS FIJOS
- A MÍ TAMPOCO ME EXPLICARON (siempre mayúsculas)
- Ep. XX — (formato número episodio)
- CHRISTIAN VILLAMAR (firma, #888888, opacidad 85%, tracking +30)
- Logos Spotify + Apple Podcasts (blanco #FFFFFF, escala 90%, alineados, separación 24px)
- PODCAST (tag, tracking +40, mayúsculas)

EFECTOS PERMITIDOS
Grano editorial muy sutil · bloques sólidos · filetes finos · subrayados · cajas limpias · recortes precisos

EFECTOS PROHIBIDOS
Glow · sombras dramáticas · 3D · biseles · stickers · gradientes · motivacional barato · gran angular · saturación excesiva · filtros artificiales · retoque plástico · estética genérica · cursivas

DEFINICIÓN DE LISTO
- Safe zones respetadas · Solo paleta AMTME · Un solo dominante en #F2C84B
- Escala tipográfica correcta · Host en eje áureo · Se entiende en <0.7s
- Nombre, Ep. XX, firma y logos presentes · Sin cursivas · Lista para publicar
`.trim();

// ─── GENERADOR DE PROMPT ──────────────────────────────────────────────────────

function generarPrompt(
  pieza: Pieza,
  data: EpisodeData,
  fondoImg02: "cobalt" | "negro" = "cobalt"
): string {
  const copy = data[pieza.copyKey] || "[COPY PENDIENTE]";

  const fondoSection =
    pieza.hostRef === "imagen02"
      ? `\nFONDO IMAGEN 02 — VERSIÓN SELECCIONADA\n${
          fondoImg02 === "cobalt"
            ? "VERSIÓN A · Cobalt Blue #1A1AE6 (tema identitario / de marca) · Ajuste: luminosidad −5% = #1212A0 para mayor peso emocional · Temperatura +3% cálida para evitar frialdad clínica"
            : "VERSIÓN B · Negro editorial #0A0A0A (tema duro / introspectivo) · Exposición −5% para evitar aplastamiento visual"
        }\n`
      : "";

  const hostSection =
    pieza.hostRef === "imagen01"
      ? "REFERENCIA DE HOST — IMAGEN 01\nSentado al revés en silla de madera · brazos cruzados sobre el respaldo · camiseta blanca AMTME · cap verde · jeans azules · tenis blancos · fondo negro #0A0A0A"
      : "REFERENCIA DE HOST — IMAGEN 02\nSentado en el suelo · piernas abiertas en V · manos sobre rodillas · postura abierta y relajada · camiseta azul navy AMTME (#1A1AE6) · cap verde · jeans azules · tenis blancos visibles al frente · fondo según versión seleccionada arriba";

  return `OBJETIVO
Crear UNA SOLA pieza visual final del episodio ${data.numero} de "A Mi Tampoco Me Explicaron".
No crear variantes. No crear múltiples formatos. No crear sistema completo.
Solo producir la pieza especificada en "PIEZA OBJETIVO".

PIEZA OBJETIVO
${pieza.nombre} — ${pieza.formato}

FORMATO
${pieza.px}

SAFE ZONES OBLIGATORIAS
${pieza.safeZone}

CONTEXTO DE MARCA
Podcast: A Mi Tampoco Me Explicaron
Host: Christian Villamar
Instagram: @yosoyvillamar
Episodio: ${data.numero}

TESIS CENTRAL DEL EPISODIO
"${data.tesis}"
${fondoSection}
${hostSection}

${INSTRUCCION_FIJA}

COPY OBLIGATORIO DE LA PIEZA
${copy}

COMPOSICIÓN Y COORDENADAS
${pieza.composicion}`;
}

// ─── CAMPOS COPY ──────────────────────────────────────────────────────────────

const EMPTY_DATA: EpisodeData = {
  numero: "",
  tesis: "",
  copy_portada: "",
  copy_lanzamiento: "",
  copy_reel: "",
  copy_story_lanzamiento: "",
  copy_story_quote: "",
  copy_quote_feed: "",
  copy_slide1: "",
  copy_slide2: "",
  copy_slide3: "",
  copy_slide4: "",
  copy_slide5: "",
  copy_slide6: "",
  copy_slide7: "",
  copy_slide8: "",
  copy_highlight: "",
};

const COPY_LABELS: { key: keyof EpisodeData; label: string; placeholder: string }[] = [
  { key: "copy_portada", label: "Copy — Portada 1:1", placeholder: "EL FINAL REAL\nES CUANDO\nEL ANSIOSO\nSE APAGA\n\nEP. XX\nA MI TAMPOCO ME EXPLICARON" },
  { key: "copy_lanzamiento", label: "Copy — Lanzamiento 4:5", placeholder: "EL FINAL REAL\nNO ES CUANDO\nSE VA\n\nES CUANDO\nTÚ TE APAGAS\n\nNUEVO EPISODIO\nEP. XX\n@yosoyvillamar" },
  { key: "copy_reel", label: "Copy — Reel Cover", placeholder: "EL FINAL REAL\nES CUANDO\nTE APAGAS\n\nEP. XX\nA MI TAMPOCO ME EXPLICARON" },
  { key: "copy_story_lanzamiento", label: "Copy — Story Lanzamiento", placeholder: "NUEVO EPISODIO\n\nTITULO CORTO\n\nESCÚCHALO YA\nEP. XX\n@yosoyvillamar" },
  { key: "copy_story_quote", label: "Copy — Story Quote", placeholder: "FRASE EMOCIONAL\nDEL EPISODIO.\n\nEP. XX\nA MI TAMPOCO ME EXPLICARON" },
  { key: "copy_quote_feed", label: "Copy — Quote Feed 4:5", placeholder: "FRASE CORTA\nY CONTUNDENTE\n\nEP. XX\nA MI TAMPOCO ME EXPLICARON" },
  { key: "copy_slide1", label: "Copy — Slide 1 (Portada carrusel)", placeholder: "FRASE DE\nANCLAJE\n\n01\nEP. XX" },
  { key: "copy_slide2", label: "Copy — Slide 2", placeholder: "IDEA\nIMPACTO\n\n02" },
  { key: "copy_slide3", label: "Copy — Slide 3", placeholder: "CUANDO X\nY CUANDO X\nZ\n\n03" },
  { key: "copy_slide4", label: "Copy — Slide 4", placeholder: "FRASE\nDE IMPACTO\n\n04" },
  { key: "copy_slide5", label: "Copy — Slide 5", placeholder: "FRASE\nSOBRIA\n\n05" },
  { key: "copy_slide6", label: "Copy — Slide 6", placeholder: "BLOQUE\nTENSO\n\n06" },
  { key: "copy_slide7", label: "Copy — Slide 7 (Clímax)", placeholder: "FRASE\nFINAL\nEMOCIONAL\n\n07" },
  { key: "copy_slide8", label: "Copy — Slide 8 (CTA)", placeholder: "GUÁRDALO\nCOMPÁRTELO\n\nESCUCHA\nEL EPISODIO XX\n\n@yosoyvillamar\n\n08" },
  { key: "copy_highlight", label: "Copy — Highlight Cover", placeholder: "XX" },
];

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function VisualPromptGenerator() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [data, setData] = useState<EpisodeData>(EMPTY_DATA);
  const [fondoImg02, setFondoImg02] = useState<"cobalt" | "negro">("cobalt");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>("portada");
  const [copiedAll, setCopiedAll] = useState(false);
  const [showCopyForm, setShowCopyForm] = useState(false);

  // ── Episodios disponibles ─────────────────────────────────────────────────
  const [linkedEpisodeId, setLinkedEpisodeId] = useState<string>("");

  const { data: episodes = [] } = useQuery({
    queryKey: ["episodes-for-visual"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("episodes")
        .select("id, title, working_title, number, core_thesis, theme")
        .order("created_at", { ascending: false })
        .limit(50);
      return rows ?? [];
    },
  });

  const loadFromEpisode = (episodeId: string) => {
    const ep = episodes.find((e) => e.id === episodeId);
    if (!ep) return;
    setLinkedEpisodeId(episodeId);
    setData((prev) => ({
      ...prev,
      numero: ep.number ? `EP. ${ep.number}` : prev.numero,
      tesis: ep.core_thesis || ep.theme || prev.tesis,
    }));
    toast.success("Datos del episodio cargados");
  };

  // ── Historial de imágenes ─────────────────────────────────────────────────
  const { data: history = [] } = useQuery({
    queryKey: ["generated-assets"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("generated_assets")
        .select("*")
        .eq("source", "visual_generator")
        .order("created_at", { ascending: false })
        .limit(60);
      return rows ?? [];
    },
  });

  const saveAsset = async (pieza: Pieza, imageUrl: string) => {
    if (!user) return;
    await supabase.from("generated_assets").insert({
      user_id: user.id,
      episode_id: linkedEpisodeId || null,
      piece_id: pieza.id,
      piece_name: pieza.nombre,
      image_url: imageUrl,
      prompt: generarPrompt(pieza, data, fondoImg02),
      episodio_num: data.numero,
      source: "visual_generator",
    });
    qc.invalidateQueries({ queryKey: ["generated-assets"] });
  };

  const deleteAsset = async (id: string) => {
    await supabase.from("generated_assets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["generated-assets"] });
  };

  // ── Generación de copy con IA ─────────────────────────────────────────────
  const [generatingCopy, setGeneratingCopy] = useState(false);

  const generateCopyWithAI = async () => {
    if (!data.numero.trim() || !data.tesis.trim()) {
      toast.error("Completa el número y la tesis del episodio primero");
      return;
    }
    setGeneratingCopy(true);
    setShowCopyForm(true);
    try {
      const result = await invokeEdgeFunction<{ copy?: Record<string, string> }>(
        "generate-visual-copy",
        { episodio: data.numero, tesis: data.tesis },
      );
      if (result?.copy) {
        setData((prev) => ({ ...prev, ...result.copy }));
        toast.success("✨ Copy generado para las 15 piezas");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar copy");
    } finally {
      setGeneratingCopy(false);
    }
  };

  // ── Generación de imágenes ────────────────────────────────────────────────
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [loadingPieces, setLoadingPieces] = useState<Record<string, boolean>>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [allProgress, setAllProgress] = useState(0);

  const update = (key: keyof EpisodeData, value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const copyPrompt = (pieza: Pieza) => {
    const prompt = generarPrompt(pieza, data, fondoImg02);
    navigator.clipboard.writeText(prompt);
    setCopiedId(pieza.id);
    toast.success(`Prompt de "${pieza.nombre}" copiado`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAll = () => {
    const all = PIEZAS.map(
      (p, i) => `${"─".repeat(60)}\nPIEZA ${i + 1} DE 15\n${"─".repeat(60)}\n\n${generarPrompt(p, data, fondoImg02)}`
    ).join("\n\n\n");
    navigator.clipboard.writeText(all);
    setCopiedAll(true);
    toast.success("Los 15 prompts copiados");
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Genera una sola pieza
  const generatePieza = async (pieza: Pieza): Promise<void> => {
    setLoadingPieces((prev) => ({ ...prev, [pieza.id]: true }));
    try {
      const prompt = generarPrompt(pieza, data, fondoImg02);
      const result = await invokeEdgeFunction<{ imageUrl?: string }>(
        "generate-image",
        { prompt, hostReference: pieza.hostRef, mode: "create" },
      );
      if (result?.imageUrl) {
        setGeneratedImages((prev) => ({ ...prev, [pieza.id]: result.imageUrl! }));
        setExpandedId(pieza.id);
        toast.success(`✓ "${pieza.nombre}" generada`);
        await saveAsset(pieza, result.imageUrl);
      }
    } catch (e) {
      toast.error(`Error en "${pieza.nombre}": ${e instanceof Error ? e.message : "Error desconocido"}`);
    } finally {
      setLoadingPieces((prev) => ({ ...prev, [pieza.id]: false }));
    }
  };

  // Genera las 15 piezas en secuencia
  const generateAll = async () => {
    if (generatingAll) return;
    setGeneratingAll(true);
    setAllProgress(0);
    const errors: string[] = [];

    for (let i = 0; i < PIEZAS.length; i++) {
      try {
        await generatePieza(PIEZAS[i]);
      } catch {
        errors.push(PIEZAS[i].nombre);
      }
      setAllProgress(i + 1);
    }

    setGeneratingAll(false);
    if (errors.length === 0) {
      toast.success("🎉 ¡Las 15 imágenes generadas correctamente!");
    } else {
      toast.error(`Completado con ${errors.length} error(es)`);
    }
  };

  const downloadImage = (url: string, nombre: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.numero.replace(/\s/g, "_")}_${nombre.replace(/\s/g, "_")}.png`;
    a.target = "_blank";
    a.click();
  };

  const [zipping, setZipping] = useState(false);

  const downloadAll = async () => {
    const entries = Object.entries(generatedImages);
    if (entries.length === 0) return;

    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder(data.numero.replace(/\s/g, "_") || "amtme_visual");

      await Promise.all(
        entries.map(async ([id, url]) => {
          const pieza = PIEZAS.find((p) => p.id === id);
          if (!pieza) return;
          const res = await fetch(url);
          const blob = await res.blob();
          const fileName = `${String(PIEZAS.findIndex((p) => p.id === id) + 1).padStart(2, "0")}_${pieza.id}.png`;
          folder?.file(fileName, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${data.numero.replace(/\s/g, "_") || "amtme"}_visuales.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`ZIP con ${entries.length} imágenes descargado`);
    } catch (e) {
      toast.error("Error al crear el ZIP");
      console.error(e);
    } finally {
      setZipping(false);
    }
  };

  const isReady = data.numero.trim() && data.tesis.trim();
  const generatedCount = Object.keys(generatedImages).length;
  const anyLoading = generatingAll || Object.values(loadingPieces).some(Boolean);

  return (
    <div className="page-container animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Generador Visual</h1>
          <p className="page-subtitle">
            Completa los datos del episodio y genera las 15 piezas visuales con un clic.
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {PIEZAS.length} piezas
        </Badge>
      </div>

      {/* Paso 1 — Datos base */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">1</span>
            Datos del episodio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de episodio */}
          {episodes.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Cargar desde episodio existente
                <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <Select value={linkedEpisodeId} onValueChange={loadFromEpisode}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecciona un episodio para auto-rellenar..." />
                </SelectTrigger>
                <SelectContent>
                  {episodes.map((ep) => (
                    <SelectItem key={ep.id} value={ep.id}>
                      {ep.number ? `#${ep.number} ` : ""}{ep.working_title || ep.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selector fondo Imagen 02 */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-primary" />
              Fondo — Imagen 02 (4:5)
              <span className="text-muted-foreground font-normal">(Lanzamiento · Quote Feed)</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-all ${fondoImg02 === "cobalt" ? "border-[#1A1AE6] ring-1 ring-[#1A1AE6]" : "border-border hover:border-primary/40"}`}
                onClick={() => setFondoImg02("cobalt")}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-3.5 h-3.5 rounded-sm bg-[#1A1AE6] shrink-0" />
                  <span className="text-foreground">Versión A · Cobalt</span>
                </div>
                <span className="text-[10px] text-muted-foreground pl-5">Temas de identidad / marca</span>
              </button>
              <button
                type="button"
                className={`px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-all ${fondoImg02 === "negro" ? "border-foreground/40 ring-1 ring-foreground/40" : "border-border hover:border-primary/40"}`}
                onClick={() => setFondoImg02("negro")}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-3.5 h-3.5 rounded-sm bg-[#0A0A0A] border border-border shrink-0" />
                  <span className="text-foreground">Versión B · Negro</span>
                </div>
                <span className="text-[10px] text-muted-foreground pl-5">Temas duros / introspectivos</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Número del episodio *</Label>
              <Input
                placeholder="Ej: EP. 14"
                value={data.numero}
                onChange={(e) => update("numero", e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <Label>Tesis central del episodio *</Label>
              <Textarea
                placeholder="Ej: El final real no es cuando se va. Es cuando tú te apagas."
                value={data.tesis}
                onChange={(e) => update("tesis", e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paso 2 — Copy por pieza */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">2</span>
              Copy de cada pieza
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 text-xs"
                disabled={!isReady || generatingCopy}
                onClick={generateCopyWithAI}
              >
                {generatingCopy ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generando copy...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" />Generar copy con IA</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setShowCopyForm((v) => !v)}
              >
                {showCopyForm ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {showCopyForm ? "Ocultar" : "Editar manual"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showCopyForm && (
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Escribe el copy exacto que debe aparecer en cada pieza. Usa saltos de línea para separar bloques.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COPY_LABELS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Textarea
                    placeholder={placeholder}
                    value={data[key]}
                    onChange={(e) => update(key, e.target.value)}
                    rows={4}
                    className="resize-y text-xs font-mono"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Paso 3 — Generar + Prompts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">3</span>
            <span className="text-sm font-semibold text-foreground">Imágenes</span>
            {generatedCount > 0 && (
              <Badge variant="secondary" className="text-xs text-emerald-500">
                {generatedCount}/15 generadas
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {generatedCount > 0 && (
              <Button size="sm" variant="outline" onClick={downloadAll} disabled={zipping} className="gap-1.5 text-xs">
                {zipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {zipping ? "Generando ZIP..." : `Descargar ZIP (${generatedCount})`}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={copyAll}
              disabled={!isReady}
              className="gap-1.5 text-xs"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
              {copiedAll ? "Copiados" : "Copiar los 15 prompts"}
            </Button>
            <Button
              size="sm"
              onClick={generateAll}
              disabled={!isReady || anyLoading}
              className="gap-1.5"
            >
              {generatingAll ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Generando {allProgress}/15...</>
              ) : (
                <><Zap className="w-4 h-4" />Generar las 15</>
              )}
            </Button>
          </div>
        </div>

        {/* Barra de progreso global */}
        {generatingAll && (
          <div className="space-y-1.5">
            <Progress value={(allProgress / PIEZAS.length) * 100} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground text-right">
              {allProgress} de {PIEZAS.length} — {PIEZAS[allProgress]?.nombre ?? "Completado"}
            </p>
          </div>
        )}

        {!isReady && (
          <div className="surface p-4 text-center text-sm text-muted-foreground">
            Completa el número y la tesis del episodio para continuar.
          </div>
        )}

        {isReady && (
          <div className="space-y-2">
            {PIEZAS.map((pieza, idx) => {
              const isExpanded = expandedId === pieza.id;
              const prompt = generarPrompt(pieza, data, fondoImg02);
              const isLoading = loadingPieces[pieza.id] || false;
              const imageUrl = generatedImages[pieza.id];

              return (
                <Card key={pieza.id} className={`overflow-hidden transition-all ${imageUrl ? "border-primary/20" : ""}`}>
                  <button
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/40 transition-colors text-left"
                    onClick={() => setExpandedId(isExpanded ? null : pieza.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-muted-foreground w-6">{String(idx + 1).padStart(2, "0")}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{pieza.nombre}</p>
                          {imageUrl && (
                            <span className="text-[9px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">✓ lista</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{pieza.formato} · {pieza.px}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {/* Botón generar individual */}
                      <Button
                        size="sm"
                        variant={imageUrl ? "outline" : "default"}
                        className="h-7 text-xs gap-1"
                        disabled={isLoading || generatingAll}
                        onClick={() => generatePieza(pieza)}
                      >
                        {isLoading ? (
                          <><Loader2 className="w-3 h-3 animate-spin" />Generando</>
                        ) : imageUrl ? (
                          <><Sparkles className="w-3 h-3" />Regenerar</>
                        ) : (
                          <><Sparkles className="w-3 h-3" />Generar</>
                        )}
                      </Button>

                      {/* Botón copiar prompt */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-muted-foreground"
                        onClick={() => copyPrompt(pieza)}
                      >
                        {copiedId === pieza.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-border space-y-4">
                      {/* Imagen generada */}
                      {isLoading && (
                        <div className="flex items-center justify-center h-40 bg-secondary/30 rounded-xl">
                          <div className="text-center space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                            <p className="text-xs text-muted-foreground">Generando imagen...</p>
                          </div>
                        </div>
                      )}

                      {imageUrl && !isLoading && (
                        <div className="space-y-2">
                          <div className="relative rounded-xl overflow-hidden bg-black">
                            <img
                              src={imageUrl}
                              alt={pieza.nombre}
                              className="w-full object-contain max-h-[480px]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs flex-1"
                              onClick={() => downloadImage(imageUrl, pieza.nombre)}
                            >
                              <Download className="w-3.5 h-3.5" />Descargar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(imageUrl);
                                toast.success("URL copiada");
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" />URL
                            </Button>
                          </div>
                        </div>
                      )}

                      {!imageUrl && !isLoading && (
                        <div
                          className="flex flex-col items-center justify-center h-32 bg-secondary/20 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 hover:bg-secondary/30 transition-all gap-2"
                          onClick={() => generatePieza(pieza)}
                        >
                          <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                          <p className="text-xs text-muted-foreground">Clic para generar esta imagen</p>
                        </div>
                      )}

                      {/* Prompt expandido */}
                      <details className="group">
                        <summary className="text-[11px] text-muted-foreground/60 cursor-pointer hover:text-muted-foreground select-none flex items-center gap-1">
                          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                          Ver prompt completo
                        </summary>
                        <pre className="mt-2 text-xs text-foreground/80 font-mono whitespace-pre-wrap leading-relaxed bg-secondary/30 rounded-lg p-4 overflow-x-auto">
                          {prompt}
                        </pre>
                      </details>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial persistente */}
      <div className="space-y-3">
        <button
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          onClick={() => setShowHistory((v) => !v)}
        >
          <History className="w-4 h-4" />
          Historial de imágenes generadas
          {history.length > 0 && (
            <Badge variant="secondary" className="text-xs">{history.length}</Badge>
          )}
          {showHistory ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>

        {showHistory && (
          history.length === 0 ? (
            <div className="surface rounded-xl p-6 text-center text-sm text-muted-foreground">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aún no hay imágenes guardadas. Genera tu primera pieza arriba.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Agrupar por episodio */}
              {Array.from(new Set(history.map((a) => a.episodio_num ?? "Sin episodio"))).map((epNum) => {
                const episodeAssets = history.filter((a) => (a.episodio_num ?? "Sin episodio") === epNum);
                return (
                  <div key={epNum} className="surface rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground font-mono">{epNum}</p>
                      <span className="text-[10px] text-muted-foreground">{episodeAssets.length} imágenes</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {episodeAssets.map((asset) => (
                        <div key={asset.id} className="group relative rounded-lg overflow-hidden bg-black aspect-square">
                          <img
                            src={asset.image_url}
                            alt={asset.piece_name ?? "Imagen"}
                            className="w-full h-full object-cover"
                          />
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                            <p className="text-[9px] text-white text-center font-medium line-clamp-2">{asset.piece_name}</p>
                            <div className="flex gap-1">
                              <button
                                className="p-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
                                onClick={() => downloadImage(asset.image_url, asset.piece_name ?? "imagen")}
                                title="Descargar"
                              >
                                <Download className="w-3 h-3 text-white" />
                              </button>
                              <button
                                className="p-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
                                onClick={() => {
                                  navigator.clipboard.writeText(asset.image_url);
                                  toast.success("URL copiada");
                                }}
                                title="Copiar URL"
                              >
                                <Copy className="w-3 h-3 text-white" />
                              </button>
                              <button
                                className="p-1 rounded bg-red-500/40 hover:bg-red-500/60 transition-colors"
                                onClick={() => deleteAsset(asset.id)}
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </div>
                          {/* Piece name tag */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                            <p className="text-[8px] text-white/80 truncate">{asset.piece_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
