// Instrucción Maestra de Imagen AMTME — Imagen 01 + Imagen 02
// Sistema SB-01 — Paleta, Colorways y Banco de Hooks validados

/** Sistema de color SB-01 para piezas de Canva/tipográficas */
export const SB01_PALETTE = {
  page:  "#030A0F", // Fondo de página. Negro más profundo.
  navy:  "#083A4F", // Fondo CW-01. Color de identidad principal.
  gold:  "#A58D66", // Etiquetas, handles, líneas separadoras. Handle @yosoyvillamar.
  teal:  "#407E8C", // Fondo CW-04. Slides de pregunta reflexiva y CTA.
  sand:  "#E5E1DD", // Fondo CW-02. Texto principal sobre navy/teal.
  hl:    "#E8FF40", // Barra de resaltado. Exactamente 1 palabra por pieza. Texto encima: navy.
} as const;

/** Colorways del sistema SB-01 */
export const SB01_COLORWAYS = {
  CW01: { bg: SB01_PALETTE.navy, text: SB01_PALETTE.sand,  uso: "Slides de insight, tensión y quote firma. El más usado." },
  CW02: { bg: SB01_PALETTE.sand, text: SB01_PALETTE.navy,  uso: "Slides de hook/cover y evergreen. Temperatura más cálida." },
  CW04: { bg: SB01_PALETTE.teal, text: SB01_PALETTE.navy,  uso: "Slides de pregunta reflexiva y CTA final. Giro visual en carrusel." },
} as const;

/** Banco de 15 hooks validados — primeros 3 segundos del Reel */
export const HOOKS_BANK = [
  { id: 1,  text: "Hay personas que no te quieren. Solo no quieren perderte.",           hlWord: "perderte",      ep: 7  },
  { id: 2,  text: "Hay algo que llamas amor. En realidad es miedo.",                     hlWord: "miedo",         ep: 4  },
  { id: 3,  text: "El rechazo no es un veredicto sobre tu valor.",                       hlWord: "veredicto",     ep: 25 },
  { id: 4,  text: "Nadie te explicó que un corazón roto tiene nombre clínico.",          hlWord: "nombre",        ep: 26 },
  { id: 5,  text: "¿Y si el problema no era la otra persona?",                           hlWord: "problema",      ep: 17 },
  { id: 6,  text: "Llevas años siendo útil. Pero útil no es lo mismo que amado.",        hlWord: "amado",         ep: 20 },
  { id: 7,  text: "Tu cuerpo lo sabe antes que tu mente.",                               hlWord: "cuerpo",        ep: 16 },
  { id: 8,  text: "¿Cuántas versiones de ti mismo creaste para que alguien te quisiera?",hlWord: "versiones",     ep: 2  },
  { id: 9,  text: "La pasión y la dependencia se sienten igual. No son lo mismo.",       hlWord: "dependencia",   ep: 9  },
  { id: 10, text: "Sigues cargando algo que ya terminó.",                                hlWord: "cargando",      ep: 11 },
  { id: 11, text: "Hay personas que ya se fueron sin decírtelo.",                        hlWord: "sin decírtelo", ep: 19 },
  { id: 12, text: "Te exiges tanto que ya olvidaste que puedes equivocarte.",            hlWord: "equivocarte",   ep: 22 },
  { id: 13, text: "El hartazgo funciona distinto a la motivación. Y es más honesto.",   hlWord: "honesto",       ep: 3  },
  { id: 14, text: "A veces no sabes si lo amas o si solo te aterra el vacío.",          hlWord: "vacío",         ep: 8  },
  { id: 15, text: "No necesitas su permiso para cerrar.",                               hlWord: "permiso",       ep: 19 },
] as const;

/** Calendario de publicación semanal */
export const WEEKLY_CALENDAR = [
  { day: "Lunes",    hora: "19:00-20:00", tipo: "Lanzamiento", piezas: ["Reel portada (CW-01)", "Story 'Nuevo episodio' con link activo"] },
  { day: "Martes",   hora: "12:00-13:00", tipo: "Quote tensión", piezas: ["Post frase estática (T1)", "Story '¿Te identificas?'"] },
  { day: "Miércoles",hora: "18:00-19:00", tipo: "Carrusel",     piezas: ["Carrusel 6 láminas completo (T2-T5)"] },
  { day: "Jueves",   hora: "20:00-21:00", tipo: "Insight",      piezas: ["Quote conceptual (CW-04)", "Story distinción en 2 líneas"] },
  { day: "Viernes",  hora: "18:30-19:30", tipo: "Repesca",      piezas: ["Reel variación CW-02. Mismo ep., ángulo distinto."] },
  { day: "Sábado",   hora: "10:00-11:00", tipo: "Evergreen",    piezas: ["Repostear quote de ep. anterior (T7)", "Story casual"] },
  { day: "Domingo",  hora: "12:00-13:00", tipo: "Spotify",      piezas: ["Episodio sube a Spotify. Actualizar link en bio."] },
] as const;

export interface VisualPiece {
  id: number;
  name: string;
  shortName: string;
  format: string;
  width: number;
  height: number;
  safeZones: string;
  copyTemplate: string[];
  compositionNotes: string;
  hostReference: "imagen01" | "imagen02";
  backgroundVersion?: "cobalt" | "negro" | "both";
}

/** Build host reference URL — hardcoded fallback so it's never undefined */
export function getHostReferenceUrl(key: "imagen01" | "imagen02"): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
    ?? "https://vudvgfdoeciurejtbzbw.supabase.co";
  return `${baseUrl}/storage/v1/object/public/generated-images/host-${key}.png`;
}

export const HOST_REFERENCES = {
  get imagen01() { return getHostReferenceUrl("imagen01"); },
  get imagen02() { return getHostReferenceUrl("imagen02"); },
};

export const BRAND_CONTEXT = {
  podcast: "A MÍ TAMPOCO ME EXPLICARON",
  host: "CHRISTIAN VILLAMAR · @yosoyvillamar",
  palette: {
    cobalt: "#1A1AE6",
    cobaltDark: "#1212A0",
    cream: "#F5F0E8",
    yellow: "#F2C84B",
    black: "#0A0A0A",
    white: "#FFFFFF",
    grayDark: "#2A2A2A",
    grayMid: "#555555",
    grayLight: "#999999",
    graySecondary: "#CCCCCC",
    graySignature: "#888888",
  },
  colorRules: [
    "Solo se usan los colores de la paleta oficial AMTME — cualquier color no autorizado es error de producción",
    "Máximo 3 colores activos por pieza (fondo + cream + amarillo)",
    "El amarillo (#F2C84B) solo va en el elemento dominante tipográfico (nivel 1)",
    "El cobalt azul (#1A1AE6) es el color estructural y de fondo",
    "El cream (#F5F0E8) es el color por defecto de la tipografía sobre cobalt o negro",
    "El negro editorial (#0A0A0A) se usa como fondo alternativo",
    "No usar glow ni sombra de color activo",
    "Amarillo editorial: saturación −10%, sin glow, solo en dominante",
    "Azul cobalt: luminosidad −5% para mayor peso visual emocional",
    "Fondo negro: exposición −5% para evitar aplastamiento visual",
    "Temperatura fondo cobalt: +3% cálida para evitar frialdad clínica",
  ],
  typography: {
    rules: [
      "Sans serif editorial contemporánea (Inter, Neue Haas, Aktiv Grotesk, Helvetica Neue)",
      "Jerarquía de escala: 100% / 72% / 60% / 52% / 45% / 38%",
      "No usar cursivas en ningún elemento de marca AMTME",
      "No mezclar más de 2 pesos en un mismo bloque",
      "No duplicar dominantes: solo un elemento puede ser el dominante",
      "No centrar más de 2 niveles tipográficos en una misma pieza",
      "Máx. 12-16 palabras por línea de texto",
    ],
    levels: [
      {
        level: 1, name: "Dominante emocional", scale: "100%", sizePx: "72–88 px",
        weight: "Black / ExtraBold", color: "#F2C84B", tracking: "−10 a 0",
        lineHeight: "−8% a −10%", style: "Mayúsculas · sin cursiva",
        content: "El golpe emocional central — lo que para el scroll",
      },
      {
        level: 2, name: "Secundario / Pregunta", scale: "72%", sizePx: "52–64 px",
        weight: "Bold / SemiBold", color: "#F5F0E8", tracking: "+10",
        lineHeight: "Estándar +0%", style: "Mayúsculas · sin cursiva",
        content: "Contexto o pregunta que activa curiosidad",
      },
      {
        level: 3, name: "Terciario / Complemento", scale: "60%", sizePx: "44–52 px",
        weight: "Medium / Regular", color: "#F5F0E8", tracking: "+10 a +15",
        lineHeight: "Estándar", style: "Mayúsculas · sin cursiva",
        content: "Cierre del ciclo de intriga",
      },
      {
        level: 4, name: "Subtítulo de apoyo", scale: "52%", sizePx: "36–44 px",
        weight: "Regular / Light", color: "#CCCCCC", tracking: "+15",
        lineHeight: "Estándar", style: "Mayúsculas · sin cursiva · opacidad 90%",
        content: "Descripción de promesa (LO QUE NADIE TE DICE SOBRE...)",
      },
      {
        level: 5, name: "CTA (Call to Action)", scale: "45%", sizePx: "32–38 px",
        weight: "Medium / Condensado", color: "#F5F0E8 opacidad 90%", tracking: "+20 a +30",
        lineHeight: "Estándar", style: "Mayúsculas · no publicitario · conversacional",
        content: "Instrucción clara (ESCÚCHALO HOY)",
      },
      {
        level: 6, name: "Firma / Metadatos / Logos", scale: "38%", sizePx: "24–28 px",
        weight: "Light / Regular", color: "#888888 opacidad 85%", tracking: "+30 a +40",
        lineHeight: "Estándar", style: "Institucional · mínimo",
        content: "A MÍ TAMPOCO ME EXPLICARON · PODCAST · Ep. XX · CHRISTIAN VILLAMAR",
      },
    ],
  },
  hostDescription: {
    imagen01: "Sentado al revés en silla de madera, cuerpo de frente, brazos cruzados sobre el respaldo, relajado. Camiseta blanca con logo AMTME centrado. Cap verde hacia el frente. Jeans azules. Tenis blancos. Mirada directa a cámara, neutra, íntima, no agresiva. Expresión serena, con presencia, no sonrisa forzada. Tatuaje brazo izquierdo visible.",
    imagen02: "Sentado en el suelo, piernas abiertas en V, relajado. Manos descansando sobre las rodillas, postura abierta no defensiva. Camiseta azul navy AMTME (#1A1AE6 aprox), logo AMTME centrado en pecho. Cap verde hacia el frente. Jeans azules. Tenis blancos visibles al frente. Mirada directa a cámara, serena, íntima, con peso emocional. Expresión tranquila, reflexiva, no sonrisa. Tatuaje brazo izquierdo visible.",
    photography: "Lente 85mm, f/4, ISO 100, 1/125s mínimo. Iluminación frontal suave (softbox/ventana difusada) + relleno lateral leve (ratio 3:1 máx). Temperatura 5500-6000K. Sin sombras duras, sin flash directo. Fondo negro puro. Expresión natural, no posada, íntima. Piel realista, textura nítida, sin retoque excesivo. Contraste moderado. Saturación neutra −5% a −10%. Color grading cinematográfico frío-neutro. Acabado nivel revista editorial. Nitidez alta en ojos y rostro.",
  },
  aesthetic: "Editorial · contemporánea · limpia · psicológica · sobria · íntima · memorable. La pieza debe entenderse en menos de 0.7 segundos en scroll móvil.",
  composition: {
    general: [
      "Retícula obligatoria de 12 columnas, márgenes exteriores 90px, gutter 24px",
      "Un solo dominante claro por pieza — no hay competencia de jerarquías",
      "Balance texto-imagen: la tipografía NO puede tapar la cara del host",
      "Máximo 4 grupos visuales por pieza, sin elementos flotantes",
      "Espacio negativo activo: no es vacío, es respiración",
      "Orden de lectura: 1→Dominante emocional 2→Contexto/pregunta 3→Complemento 4→Subtítulo 5→CTA 6→Logos/firma",
      "Mínimo 40px de separación visible entre grupos tipográficos",
      "Aire claro antes del dominante (zona de entrada visual)",
      "Pausa clara antes del subtítulo",
      "Separación mayor antes del CTA — nunca pegado a otro bloque",
    ],
    imagen01: {
      canvas: "1080×1080 px · 1:1 cuadrado",
      safeZones: "X: 90–990 · Y: 90–990 · Zona activa: 900×900 px",
      background: "#0A0A0A negro editorial profundo",
      hostPosition: "Centrada ± 20px. Ojos Y: 220-280px, X: 500-700px. Figura completa visible Y: 100-950px. No invadir zona texto X: 90-500px.",
      textZone: "X: 90–540 px (mitad izquierda)",
      hostZone: "X: 460–990 px (mitad derecha, puede solapar levemente)",
      groups: [
        "Grupo 1: Encabezado/metadatos · Y: 110–160 px",
        "Grupo 2: Titular completo (niveles 1+2+3) · Y: 300–680 px",
        "Grupo 3: Subtítulo + CTA · Y: 720–900 px",
        "Grupo 4: Logos + firma · Y: 910–990 px",
      ],
      fileName: "AMTME_Ep[XX]_Cover_vF.png",
    },
    imagen02: {
      canvas: "1080×1350 px · 4:5 portrait",
      safeZones: "X: 90–990 · Y: 120–1230 · Zona activa: 900×1110 px",
      background: "Versión A: #1A1AE6 Cobalt (temas identitarios) · Versión B: #0A0A0A Negro (temas duros/introspectivos)",
      hostPosition: "Desplazada ligeramente a la derecha, X centroide: 580-640px. Ojos Y: 280-360px, X: 560-700px. Figura Y: 140-1150px. Ajuste: +40px arriba / +20px derecha.",
      textZone: "X: 90–500 px (izquierda del canvas)",
      hostZone: "X: 440–990 px (derecha, puede solapar levemente zona de texto)",
      groups: [
        "Grupo 1: Encabezado/metadatos · Y: 150–190 px",
        "Grupo 2: Titular completo (niveles 1+2+3) · Y: 330–730 px",
        "Grupo 3: Subtítulo + CTA · Y: 800–980 px",
        "Grupo 4: Logos + firma · Y: 1010–1220 px",
      ],
      fileName: "AMTME_Ep[XX]_Feed_vF.png",
    },
  },
  fixedElements: [
    "Nombre del podcast: A MÍ TAMPOCO ME EXPLICARON — siempre en mayúsculas",
    "Número de episodio: formato Ep. XX —",
    "Firma del host: CHRISTIAN VILLAMAR · opacidad 85% · escala mínima · tracking +30",
    "Logos: Spotify + Apple Podcasts · blanco #FFFFFF · escala 90% · alineados · separación 24px",
    "Tag: PODCAST · tracking +40 · mayúsculas · pequeño",
    "Metadatos: color #888888 · opacidad 85% · tracking +30 a +40",
  ],
  allowedEffects: "Grano editorial muy sutil / bloques sólidos / filetes finos / subrayados / cajas limpias / recortes precisos",
  prohibitedEffects: "Glow / sombras dramáticas / 3D / biseles / stickers / gradientes llamativos / motivacional barato / gran angular / saturación excesiva / filtros artificiales / retoque plástico / estética de red social genérica / filtros IG / lentes menores a 50mm / presets genéricos de Lightroom",
  conversionPsychology: {
    speed: "< 0.7 segundos en scroll móvil",
    timeline: [
      "0.5s: El dominante emocional ya activó al usuario",
      "1.0s: El usuario se identifica con el dolor del tema",
      "1.5s: La pregunta o promesa genera curiosidad activa",
      "2.0s: El CTA impulsa decisión de escuchar",
    ],
    triggers: [
      "Espejo emocional: el dominante refleja el dolor del oyente, no describe el contenido",
      "Identificación inmediata: 'esto es para mí' antes del CTA",
      "Tensión sin ansiedad: urgencia emocional, no publicitaria",
      "Proximidad con el host: foto íntima, no marketera",
      "Autoridad silenciosa: el diseño comunica calidad antes de leer",
    ],
    tests: [
      "Reducir pieza a 25%: ¿sigue funcionando?",
      "Brazo extendido: ¿se lee el dominante?",
      "Brillo bajo: ¿hay suficiente contraste?",
      "Scroll 0.5s: ¿algo detiene el dedo?",
    ],
  },
  readyChecklist: [
    "Canvas exacto para formato de destino",
    "Modo RGB · sRGB IEC61966-2.1",
    "Exportado en .PNG sin compresión",
    "Safe zones respetadas — ningún texto fuera de coordenadas",
    "Solo paleta AMTME — sin colores no autorizados",
    "Un solo dominante claro en amarillo #F2C84B",
    "Escala proporcional aplicada (100%/72%/60%/52%/45%/38%)",
    "Host en eje áureo, ojos en tercio superior, figura visible",
    "Lente 85mm, f/4, ISO 100, iluminación frontal suave",
    "Sin cursivas, sin micro-firmas tipo Barra de Navidad",
    "Nombre del podcast, Ep. XX, firma, logos presentes",
    "Se entiende en <0.7s en scroll",
    "Test 25% superado, test brillo bajo superado",
    "CTA visible, claro y no publicitario",
    "Tracking correcto por nivel tipográfico",
    "Grupos con separación mínima 40px",
  ],
};

export const VISUAL_PIECES: VisualPiece[] = [
  {
    id: 1,
    name: "Cover Spotify / Feed IG Cuadrado (IMAGEN 01)",
    shortName: "Cover 1:1",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "X: 90–990 · Y: 90–990 · Zona activa: 900×900 px",
    hostReference: "imagen01",
    backgroundVersion: "negro",
    copyTemplate: [
      "[DOMINANTE EMOCIONAL — AMARILLO #F2C84B]",
      "[SECUNDARIO — CREAM #F5F0E8]",
      "[TERCIARIO — CREAM]",
      "",
      "EP. XX",
      "A MÍ TAMPOCO ME EXPLICARON",
      "CHRISTIAN VILLAMAR",
    ],
    compositionNotes: `IMAGEN 01 — Cover Spotify / Feed IG 1:1
Fondo: #0A0A0A negro editorial.
Host: sentado al revés en silla de madera, brazos cruzados, camiseta blanca AMTME, cap verde, fondo negro puro.
Zona texto: X: 90-540px (mitad izquierda). Zona host: X: 460-990px (mitad derecha).
Grupos: G1 Metadatos Y:110-160 / G2 Titular Y:300-680 / G3 Subtítulo+CTA Y:720-900 / G4 Logos+firma Y:910-990.
Dominante (nivel 1) en amarillo #F2C84B, Y: 420-580px. Secundario en cream #F5F0E8, Y: 300-400px.
Texto dominante NO puede tapar rostro del host. Ojos del host en Y: 220-280px.`,
  },
  {
    id: 2,
    name: "Feed IG Portrait / Portada Episodio (IMAGEN 02)",
    shortName: "Feed 4:5",
    format: "4:5",
    width: 1080,
    height: 1350,
    safeZones: "X: 90–990 · Y: 120–1230 · Zona activa: 900×1110 px",
    hostReference: "imagen02",
    backgroundVersion: "both",
    copyTemplate: [
      "[DOMINANTE EMOCIONAL — AMARILLO #F2C84B]",
      "[SECUNDARIO — CREAM #F5F0E8]",
      "[TERCIARIO — CREAM]",
      "",
      "ESCÚCHALO HOY",
      "EP. XX",
      "A MÍ TAMPOCO ME EXPLICARON",
      "CHRISTIAN VILLAMAR",
    ],
    compositionNotes: `IMAGEN 02 — Feed IG Portrait 4:5
Fondo: Versión A #1A1AE6 Cobalt (temas identitarios) o Versión B #0A0A0A Negro (temas duros).
Host: sentado en suelo, relajado, camiseta azul AMTME, cap verde, fondo negro o cobalt.
Zona texto: X: 90-500px (izquierda). Zona host: X: 440-990px (derecha, levemente desplazada).
Grupos: G1 Metadatos Y:150-190 / G2 Titular Y:330-730 / G3 Subtítulo+CTA Y:800-980 / G4 Logos+firma Y:1010-1220.
Dominante (nivel 1) en amarillo #F2C84B, Y: 470-630px. Secundario en cream #F5F0E8, Y: 330-420px.
Postura host en suelo comunica vulnerabilidad controlada. Formato 4:5 domina más espacio en feed IG.`,
  },
  {
    id: 3,
    name: "Reel Cover",
    shortName: "Reel",
    format: "9:16",
    width: 1080,
    height: 1920,
    safeZones: "X: 90–990 · Y: 250–1670",
    hostReference: "imagen02",
    copyTemplate: [
      "[TITULAR CORTO — AMARILLO]",
      "[LÍNEA 2 — CREAM]",
      "",
      "EP. XX",
      "A MÍ TAMPOCO ME EXPLICARON",
    ],
    compositionNotes: "Encuadre editorial vertical. Titular legible en crop 4:5 de feed. Jerarquía: 1) titular 2) host 3) EP. XX / marca. Evitar texto largo. El título se lee instantáneamente. Host con referencia imagen02.",
  },
  {
    id: 4,
    name: "Story de Lanzamiento",
    shortName: "Story Launch",
    format: "9:16",
    width: 1080,
    height: 1920,
    safeZones: "Laterales: 90px · Superior: 250px · Inferior: 250px",
    hostReference: "imagen01",
    copyTemplate: [
      "NUEVO EPISODIO",
      "",
      "[TITULAR — AMARILLO]",
      "[LÍNEA 2 — CREAM]",
      "",
      "ESCÚCHALO YA",
      "EP. XX",
      "@yosoyvillamar",
    ],
    compositionNotes: "Jerarquía: 1) titular 2) CTA 3) host 4) EP. XX / usuario. Amarillo solo en CTA o 'NUEVO EPISODIO'. No saturar. Mucho espacio negativo. Lectura en segundos.",
  },
  {
    id: 5,
    name: "Story Quote",
    shortName: "Story Quote",
    format: "9:16",
    width: 1080,
    height: 1920,
    safeZones: "Laterales: 90px · Superior: 250px · Inferior: 250px",
    hostReference: "imagen02",
    copyTemplate: [
      "[FRASE EMOCIONAL — AMARILLO]",
      "",
      "[CONTINUACIÓN — CREAM]",
      "",
      "EP. XX",
      "A MÍ TAMPOCO ME EXPLICARON",
    ],
    compositionNotes: "Pieza centrada en la frase. Prioridad es la lectura emocional del quote. Host puede aparecer de forma secundaria o como recorte sutil. Mucha contención visual.",
  },
  {
    id: 6,
    name: "Quote Feed",
    shortName: "Quote Feed",
    format: "4:5",
    width: 1080,
    height: 1350,
    safeZones: "X: 90–990 · Y: 120–1230",
    hostReference: "imagen01",
    copyTemplate: [
      "[FRASE CORTA — AMARILLO]",
      "[LÍNEA 2 — CREAM]",
      "",
      "EP. XX",
      "A MÍ TAMPOCO ME EXPLICARON",
    ],
    compositionNotes: "La frase es dominante. La marca queda pequeña. Host puede ir muy sutil o no aparecer si la pieza funciona mejor tipográfica. Sensación editorial, guardable y compartible.",
  },
  {
    id: 7,
    name: "Carrusel Slide 1 — Portada",
    shortName: "Carrusel 1",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "X: 90–990 · Y: 90–990",
    hostReference: "imagen01",
    copyTemplate: ["[TITULAR SLIDE 1 — AMARILLO]", "[CONTINUACIÓN — CREAM]", "", "01", "EP. XX"],
    compositionNotes: "Portada autónoma del carrusel. Jerarquía: 1) titular 2) host 3) numeración / episodio.",
  },
  {
    id: 8,
    name: "Carrusel Slide 2",
    shortName: "Carrusel 2",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "X: 90–990 · Y: 90–990",
    hostReference: "imagen02",
    copyTemplate: ["[IDEA ÚNICA — AMARILLO]", "[LÍNEA 2 — CREAM]", "", "02"],
    compositionNotes: "Una sola idea visual. Máxima contundencia. Puede ser muy tipográfico. Fondo cobalt o negro.",
  },
  {
    id: 9,
    name: "Carrusel Slide 3",
    shortName: "Carrusel 3",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "X: 90–990 · Y: 90–990",
    hostReference: "imagen01",
    copyTemplate: ["[FRASE TENSIÓN A — AMARILLO]", "", "[FRASE TENSIÓN B — CREAM]", "", "03"],
    compositionNotes: "Organizar el texto para expresar tensión o loop. Separación de bloques para reforzar distancia o contraste.",
  },
  {
    id: 10,
    name: "Carrusel Slide 4",
    shortName: "Carrusel 4",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "X: 90–990 · Y: 90–990",
    hostReference: "imagen02",
    copyTemplate: ["[FRASE DE IMPACTO — AMARILLO]", "[CONCEPTO — CREAM]", "", "04"],
    compositionNotes: "Dar protagonismo al concepto memorable. Amarillo como acento mínimo si ayuda a memorabilidad.",
  },
  {
    id: 11,
    name: "Carrusel Slide 5",
    shortName: "Carrusel 5",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "X: 90–990 · Y: 90–990",
    hostReference: "imagen01",
    copyTemplate: ["[FRASE CLAVE — AMARILLO]", "[LÍNEA 2 — CREAM]", "", "05"],
    compositionNotes: "Muy tipográfico. Sobrio. Directo.",
  },
  {
    id: 12,
    name: "Carrusel Slide 6",
    shortName: "Carrusel 6",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "X: 90–990 · Y: 90–990",
    hostReference: "imagen02",
    copyTemplate: ["[FRASE CLAVE 3 — AMARILLO]", "[CONTINUACIÓN — CREAM]", "", "06"],
    compositionNotes: "Bloques tipográficos tensos. Alta legibilidad.",
  },
  {
    id: 13,
    name: "Carrusel Slide 7",
    shortName: "Carrusel 7",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "X: 90–990 · Y: 90–990",
    hostReference: "imagen01",
    copyTemplate: ["[CLÍMAX EMOCIONAL — AMARILLO]", "[LÍNEA 2 — CREAM]", "", "07"],
    compositionNotes: "Clímax emocional del carrusel. Más espacio negativo. La frase más poderosa del episodio va aquí.",
  },
  {
    id: 14,
    name: "Carrusel Slide 8 — CTA Final",
    shortName: "Carrusel CTA",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "X: 90–990 · Y: 90–990",
    hostReference: "imagen02",
    copyTemplate: [
      "GUÁRDALO",
      "COMPÁRTELO",
      "",
      "ESCUCHA EL EPISODIO XX",
      "@yosoyvillamar",
      "08",
    ],
    compositionNotes: "Cierre claro. CTA directo. Amarillo solo como acento puntual en el CTA principal.",
  },
  {
    id: 15,
    name: "Highlight Cover",
    shortName: "Highlight",
    format: "1:1",
    width: 1080,
    height: 1080,
    safeZones: "Elemento principal centrado en zona circular segura amplia",
    hostReference: "imagen01",
    copyTemplate: ["XX"],
    compositionNotes: "Sin texto largo. Solo número o 'EP'. Diseño mínimo, reconocible en miniatura. Fondo COBALT #1A1AE6 o NEGRO #0A0A0A.",
  },
];

export const PRODUCTION_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export interface EpisodeInput {
  number: string;
  thesis: string;
  keyPhrases: string[];
}

/**
 * Build a full prompt for a single piece, replacing variables.
 */
export function buildPiecePrompt(piece: VisualPiece, input: EpisodeInput, copyLines: string[]): string {
  const epNum = input.number.padStart(2, "0");
  const copy = copyLines.map((l) => l.replace(/XX/g, epNum)).join("\n");
  const hostRef = piece.hostReference;
  const hostDesc = BRAND_CONTEXT.hostDescription[hostRef];
  const comp = piece.id <= 2
    ? (piece.id === 1 ? BRAND_CONTEXT.composition.imagen01 : BRAND_CONTEXT.composition.imagen02)
    : null;

  return `Crear UNA SOLA pieza visual final. No crear variantes. No crear múltiples formatos. Solo producir la pieza especificada.

PIEZA OBJETIVO: ${String(piece.id).padStart(2, "0")} — ${piece.name} — ${piece.format}
${piece.width} × ${piece.height} px  ·  Safe zones: ${piece.safeZones}

COPY:
${copy}

COMPOSICIÓN
${piece.compositionNotes}
${BRAND_CONTEXT.composition.general.map((c) => `— ${c}`).join("\n")}
${comp ? `\nCOORDENADAS ESPECÍFICAS:\n— Canvas: ${comp.canvas}\n— Safe zones: ${comp.safeZones}\n— Fondo: ${comp.background}\n— Zona texto: ${comp.textZone}\n— Zona host: ${comp.hostZone}\n— Host: ${comp.hostPosition}\n${comp.groups.map((g) => `— ${g}`).join("\n")}` : ""}

CONTEXTO DE MARCA FIJO
Podcast: ${BRAND_CONTEXT.podcast}
Host: ${BRAND_CONTEXT.host}

PALETA ÚNICA PERMITIDA (SOLO ESTOS COLORES)
COBALT ${BRAND_CONTEXT.palette.cobalt} | COBALT DARK ${BRAND_CONTEXT.palette.cobaltDark} | CREAM ${BRAND_CONTEXT.palette.cream} | AMARILLO ${BRAND_CONTEXT.palette.yellow} | NEGRO ${BRAND_CONTEXT.palette.black} | BLANCO ${BRAND_CONTEXT.palette.white} | GRIS SECUNDARIO ${BRAND_CONTEXT.palette.graySecondary} | GRIS FIRMA ${BRAND_CONTEXT.palette.graySignature}

REGLAS DE COLOR
${BRAND_CONTEXT.colorRules.map((r) => `— ${r}`).join("\n")}

SISTEMA TIPOGRÁFICO (6 NIVELES)
${BRAND_CONTEXT.typography.levels.map((l) => `— Nivel ${l.level} (${l.name}): ${l.scale} · ${l.sizePx} · ${l.weight} · Color: ${l.color} · Tracking: ${l.tracking} · ${l.style}`).join("\n")}

${BRAND_CONTEXT.typography.rules.map((t) => `— ${t}`).join("\n")}

HOST (OBLIGATORIO — usar foto de referencia adjunta: ${hostRef})
— ${hostDesc}
— FOTOGRAFÍA: ${BRAND_CONTEXT.hostDescription.photography}

ELEMENTOS FIJOS
${BRAND_CONTEXT.fixedElements.map((e) => `— ${e}`).join("\n")}

ESTÉTICA OBLIGATORIA
— ${BRAND_CONTEXT.aesthetic}

EFECTOS PERMITIDOS
— ${BRAND_CONTEXT.allowedEffects}

EFECTOS PROHIBIDOS
— ${BRAND_CONTEXT.prohibitedEffects}

PSICOLOGÍA DE CONVERSIÓN
${BRAND_CONTEXT.conversionPsychology.timeline.map((t) => `— ${t}`).join("\n")}
${BRAND_CONTEXT.conversionPsychology.triggers.map((t) => `— ${t}`).join("\n")}

DEFINICIÓN DE LISTO
${BRAND_CONTEXT.readyChecklist.map((c) => `— ${c}`).join("\n")}`;
}
