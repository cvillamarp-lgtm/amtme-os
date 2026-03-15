// Plantilla Maestra de Producción Visual — AMTME
// Sistema de instrucciones para generación de piezas por episodio

export interface SeccionA {
  numeroEpisodio: string;
  tesisCentral: string;
  frasesClaves: string[];
}

export interface SeccionB {
  portada: { linea1: string; linea2: string };
  lanzamiento: { titular1: string; titular2: string; titular3: string };
  reel: { titular: string; linea2: string };
  story_lanzamiento: { titular: string; linea2: string; linea3: string };
  story_quote: { parte1: string; parte2: string };
  quote_feed: { frase: string; linea2: string; linea3: string };
  slide1: { titular: string; linea2: string };
  slide2: { idea: string; linea2: string };
  slide3: { parteA: string; parteB: string };
  slide4: { impacto: string; concepto: string };
  slide5: { frase: string; linea2: string; linea3: string };
  slide6: { frase: string; linea2: string };
  slide7: { climax: string; linea2: string; linea3: string };
  slide8: Record<string, never>;
  highlight: { numero: string };
}

export interface PiezaMaster {
  id: keyof SeccionB;
  nombre: string;
  formato: string;
  dimensiones: string;
  safeZones: string;
  composicion: string;
  buildCopy: (b: SeccionB, a: SeccionA) => string;
}

const INSTRUCCION_BASE = `
CONTEXTO DE MARCA FIJO
Podcast: A Mi Tampoco Me Explicaron
Host: Christian Villamar · @yosoyvillamar

PALETA ÚNICA PERMITIDA
INK #282828  |  PAPER #F9F6EF  |  COBALT #193497  |  HIGHLIGHTER GREEN #EAFF00

REGLAS DE COLOR
— Prohibido usar cualquier color fuera de esta paleta
— Prohibido negro puro dominante — usar INK
— Prohibido blanco puro dominante — usar PAPER
— Verde solo como microacento (máx. 1 elemento por pieza)
— Prohibido #1400FF

TIPOGRAFÍA
— Sans serif editorial contemporánea (ej: Inter, Neue Haas, Aktiv Grotesk, Helvetica Neue)
— Black / ExtraBold para titulares
— Medium / Regular para soporte
— Máx. 2 estilos tipográficos por pieza
— Máx. 3 niveles jerárquicos
— Prohibido: cursivas, serif, lettering decorativo

HOST
— Hombre real, edad aparente 30–42, expresión sobria y contenida
— Natural, honesto, editorial — no stock, no caricatura, no dramatizado
— Conservar estructura facial, postura tranquila, presencia masculina general

ESTÉTICA OBLIGATORIA
— Editorial · contemporánea · limpia · psicológica · sobria · íntima · memorable

EFECTOS PERMITIDOS
— Grano editorial muy sutil / bloques sólidos / filetes finos / subrayados / cajas limpias

EFECTOS PROHIBIDOS
— Glow / sombras dramáticas / 3D / biseles / stickers / gradientes llamativos / motivacional barato

DEFINICIÓN DE LISTO
— Formato exacto respetado
— Safe zones respetadas
— Solo la paleta indicada
— Host natural y editorial
— Comunica en menos de 2 segundos
— Funciona en miniatura
— Lista para publicar`;

export const PIEZAS_MASTER: PiezaMaster[] = [
  {
    id: "portada",
    nombre: "Portada Episodio",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "80 px todos los lados",
    composicion: "Jerarquía: 1) frase principal  2) host  3) EP. XX / nombre del podcast\nHost con presencia editorial limpia. Centrado o ligeramente desplazado.\nEspacio negativo generoso. Verde solo como microacento en EP. XX o etiqueta.\nLegible en miniatura de Spotify y feed.",
    buildCopy: (b, a) =>
      `${b.portada.linea1}\n${b.portada.linea2}\n\nEP. ${a.numeroEpisodio}\nA MI TAMPOCO ME EXPLICARON`,
  },
  {
    id: "lanzamiento",
    nombre: "Lanzamiento Principal",
    formato: "Feed 4:5",
    dimensiones: "1080 × 1350 px",
    safeZones: "x: 72–1008  ·  y: 90–1260",
    composicion: "Jerarquía: 1) titular dominante  2) host  3) señal lanzamiento  4) EP. XX / Instagram\nHost fuerte pero sin competir con el titular.\nVerde solo en 'NUEVO EPISODIO' o barra/etiqueta.\nSeria, editorial, muy clara.",
    buildCopy: (b, a) =>
      `${b.lanzamiento.titular1}\n${b.lanzamiento.titular2}\n${b.lanzamiento.titular3}\n\nNUEVO EPISODIO\nEP. ${a.numeroEpisodio}\n@yosoyvillamar`,
  },
  {
    id: "reel",
    nombre: "Reel Cover",
    formato: "9:16",
    dimensiones: "1080 × 1920 px",
    safeZones: "x: 90–990  ·  y: 250–1670",
    composicion: "Encuadre editorial vertical. Titular legible en crop 4:5 de feed.\nJerarquía: 1) titular  2) host  3) EP. XX / marca\nEvitar texto largo. El título se lee instantáneamente.",
    buildCopy: (b, a) =>
      `${b.reel.titular}\n${b.reel.linea2}\n\nEP. ${a.numeroEpisodio}\nA MI TAMPOCO ME EXPLICARON`,
  },
  {
    id: "story_lanzamiento",
    nombre: "Story de Lanzamiento",
    formato: "9:16",
    dimensiones: "1080 × 1920 px",
    safeZones: "Laterales: 90 px  ·  Superior: 250 px  ·  Inferior: 250 px",
    composicion: "Jerarquía: 1) titular  2) CTA  3) host  4) EP. XX / usuario\nVerde solo en CTA o 'NUEVO EPISODIO'.\nNo saturar. Mucho espacio negativo. Lee en segundos.",
    buildCopy: (b, a) =>
      `NUEVO EPISODIO\n\n${b.story_lanzamiento.titular}\n${b.story_lanzamiento.linea2}\n${b.story_lanzamiento.linea3}\n\nESCÚCHALO YA\nEP. ${a.numeroEpisodio}\n@yosoyvillamar`,
  },
  {
    id: "story_quote",
    nombre: "Story Quote",
    formato: "9:16",
    dimensiones: "1080 × 1920 px",
    safeZones: "Laterales: 90 px  ·  Superior: 250 px  ·  Inferior: 250 px",
    composicion: "Pieza centrada en la frase. Prioridad es la lectura emocional del quote.\nHost puede aparecer de forma secundaria o como recorte sutil.\nMucha contención visual. Línea fina, caja o acento mínimo en verde.",
    buildCopy: (b, a) =>
      `${b.story_quote.parte1}\n\n${b.story_quote.parte2}\n\nEP. ${a.numeroEpisodio}\nA MI TAMPOCO ME EXPLICARON`,
  },
  {
    id: "quote_feed",
    nombre: "Quote Feed",
    formato: "Feed 4:5",
    dimensiones: "1080 × 1350 px",
    safeZones: "x: 72–1008  ·  y: 90–1260",
    composicion: "La frase es dominante. La marca queda pequeña.\nHost puede ir muy sutil o no aparecer si la pieza funciona mejor tipográfica.\nSensación editorial, guardable y compartible.",
    buildCopy: (b, a) =>
      `${b.quote_feed.frase}\n${b.quote_feed.linea2}\n${b.quote_feed.linea3}\n\nEP. ${a.numeroEpisodio}\nA MI TAMPOCO ME EXPLICARON`,
  },
  {
    id: "slide1",
    nombre: "Carrusel Slide 1 — Portada",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "80 px todos los lados",
    composicion: "Portada autónoma del carrusel.\nJerarquía: 1) titular  2) host  3) numeración / episodio",
    buildCopy: (b, a) =>
      `${b.slide1.titular}\n${b.slide1.linea2}\n\n01\nEP. ${a.numeroEpisodio}`,
  },
  {
    id: "slide2",
    nombre: "Carrusel Slide 2",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "80 px todos los lados",
    composicion: "Una sola idea visual. Máxima contundencia. Puede ser muy tipográfico.",
    buildCopy: (b) => `${b.slide2.idea}\n${b.slide2.linea2}\n\n02`,
  },
  {
    id: "slide3",
    nombre: "Carrusel Slide 3",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "80 px todos los lados",
    composicion: "Organizar el texto para expresar tensión o loop.\nSeparación de bloques para reforzar distancia o contraste.",
    buildCopy: (b) => `${b.slide3.parteA}\n\n${b.slide3.parteB}\n\n03`,
  },
  {
    id: "slide4",
    nombre: "Carrusel Slide 4",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "80 px todos los lados",
    composicion: "Dar protagonismo al concepto memorable.\nVerde como acento mínimo si ayuda a memorabilidad.",
    buildCopy: (b) => `${b.slide4.impacto}\n${b.slide4.concepto}\n\n04`,
  },
  {
    id: "slide5",
    nombre: "Carrusel Slide 5",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "80 px todos los lados",
    composicion: "Muy tipográfico. Sobrio. Directo.",
    buildCopy: (b) => `${b.slide5.frase}\n${b.slide5.linea2}\n${b.slide5.linea3}\n\n05`,
  },
  {
    id: "slide6",
    nombre: "Carrusel Slide 6",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "80 px todos los lados",
    composicion: "Bloques tipográficos tensos. Alta legibilidad.",
    buildCopy: (b) => `${b.slide6.frase}\n${b.slide6.linea2}\n\n06`,
  },
  {
    id: "slide7",
    nombre: "Carrusel Slide 7 — Clímax",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "80 px todos los lados",
    composicion: "Clímax emocional del carrusel. Más espacio negativo.\nLa frase más poderosa del episodio va aquí.",
    buildCopy: (b) => `${b.slide7.climax}\n${b.slide7.linea2}\n${b.slide7.linea3}\n\n07`,
  },
  {
    id: "slide8",
    nombre: "Carrusel Slide 8 — CTA Final",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "80 px todos los lados",
    composicion: "Cierre claro. CTA directo.\nVerde solo como acento puntual en el CTA principal.",
    buildCopy: (_b, a) =>
      `GUÁRDALO\nCOMPÁRTELO\n\nESCUCHA\nEL EPISODIO ${a.numeroEpisodio}\n\n@yosoyvillamar\n08`,
  },
  {
    id: "highlight",
    nombre: "Highlight Cover",
    formato: "Feed 1:1",
    dimensiones: "1080 × 1080 px",
    safeZones: "Elemento principal centrado en zona circular segura amplia",
    composicion: "Sin texto largo. Solo número o 'EP'.\nDiseño mínimo, reconocible en miniatura.\nFondo COBALT o PAPER. Verde solo si mejora reconocimiento.",
    buildCopy: (b) => `${b.highlight.numero}`,
  },
];

export function buildInstruction(pieza: PiezaMaster, seccionA: SeccionA, seccionB: SeccionB): string {
  const copy = pieza.buildCopy(seccionB, seccionA);
  return `Crear UNA SOLA pieza visual final. No crear variantes. No crear múltiples formatos. Solo producir la pieza especificada en PIEZA OBJETIVO.

PIEZA OBJETIVO — ${pieza.nombre.toUpperCase()} — ${pieza.formato.toUpperCase()}
${pieza.dimensiones}  ·  Safe zones: ${pieza.safeZones}

COPY OBLIGATORIO
${copy}

COMPOSICIÓN
${pieza.composicion}
${INSTRUCCION_BASE}`;
}

export const PIEZAS_PRIORITARIAS: Array<keyof SeccionB> = [
  "portada",
  "lanzamiento",
  "reel",
  "story_quote",
  "quote_feed",
  "slide1",
];
