export interface BrandCard {
  eyebrow: string;
  title: string;
  body: string;
  accent?: boolean;
  dark?: boolean;
}

export interface BrandOption {
  id: string;
  label: string;
  cards: BrandCard[];
  table?: { headers: string[]; rows: string[][] };
  code?: string;
}

export interface BrandSection {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  options: BrandOption[];
}

export const brandSections: BrandSection[] = [
  {
    id: "naming",
    number: ".01",
    eyebrow: "Naming",
    title: "Sistema de Nombre",
    description: "Tres enfoques de naming para construir la identidad verbal de la marca.",
    options: [
      {
        id: "naming-a", label: "A — Nombre completo",
        cards: [
          { eyebrow: "Opción A", title: "A mi tampoco me explicaron", body: "El nombre completo es la identidad primaria. Se usa sin abreviar en todas las plataformas principales.", accent: true },
          { eyebrow: "Abreviatura oficial", title: "AMTME", body: "Usada solo en: handles de redes (@amtme.podcast), URLs (amtme.com), hashtag (#AMTME), watermarks en video." },
          { eyebrow: "Tagline", title: '"El podcast que nadie te dio"', body: "Aparece en: bio de Instagram, descripción de Spotify, firma de email, materiales de prensa." },
        ],
        table: { headers: ["Canal", "Nombre a usar", "Handle/URL"], rows: [["Spotify / Apple Podcasts", "A mi tampoco me explicaron", "—"], ["Instagram", "A mi tampoco me explicaron", "@amtme.podcast"], ["YouTube", "AMTME — Chris Villamar", "@amtme"], ["TikTok", "AMTME", "@amtme"], ["Web", "amtme.com", "amtme.com"]] }
      },
      {
        id: "naming-b", label: "B — Marca corta AMTME",
        cards: [
          { eyebrow: "Opción B", title: "AMTME como identidad primaria", body: "La sigla AMTME se convierte en la marca principal. Bold, corta, memorable.", accent: true },
          { eyebrow: "Jerarquía visual", title: "AMTME · Podcast", body: 'Logo principal: "AMTME" en Montserrat Black. Debajo: "A MI TAMPOCO ME EXPLICARON".' },
          { eyebrow: "Pronunciación", title: "A · M · T · M · E", body: "Deletreado letra por letra en audio. Nunca pronunciado como palabra." },
        ],
        table: { headers: ["Elemento", "Contenido", "Notas"], rows: [["Nombre del show", "AMTME Podcast", "En plataformas de audio"], ["Handle universal", "@amtme", "Todas las redes"], ["Hashtag", "#AMTME", "Hashtag de comunidad principal"], ["Domain", "amtme.com", "Dominio principal"]] }
      },
      {
        id: "naming-c", label: "C — Rebrand tagline-first",
        cards: [
          { eyebrow: "Opción C — Rebrand", title: "Nadie te lo dijo", body: "Nombre más corto, más agresivo. Ideal para escalar a mercados internacionales.", accent: true },
          { eyebrow: "Subtítulo de conexión", title: '"Un podcast de Chris Villamar"', body: "El host se vuelve parte del nombre de la marca." },
          { eyebrow: "Riesgo", title: "Considera antes de cambiar", body: "Si el show ya tiene oyentes fieles bajo el nombre actual, el rebrand puede generar confusión." },
        ]
      },
    ]
  },
  {
    id: "logo",
    number: ".02",
    eyebrow: "Diseño de Logotipo",
    title: "Conceptos de Logo",
    description: "Tres conceptos distintos con sus versiones y reglas de aplicación.",
    options: [
      {
        id: "logo-a", label: "A — Wordmark",
        cards: [
          { eyebrow: "Concepto", title: "Wordmark tipográfico", body: "Nombre completo en Montserrat ExtraBold en 2 líneas. 'tampoco' en Cian #58C8FF." },
          { eyebrow: "Ventaja", title: "Reconocimiento instantáneo", body: "No requiere explicación. La frase ya es la marca. Funciona en cualquier tamaño de más de 80px." },
          { eyebrow: "Versiones", title: "4 variantes de color", body: "1. Blanco sobre azul (principal) · 2. Azul sobre glaciar · 3. Blanco sobre noche · 4. Negro sobre blanco." },
        ]
      },
      {
        id: "logo-b", label: "B — Isotipo AMTME",
        cards: [
          { eyebrow: "Concepto", title: "Bloque de siglas", body: "Las 5 letras en Montserrat Black, tracking ajustado. Alta reducibilidad: funciona desde 32px." },
          { eyebrow: "Uso principal", title: "Avatar, favicon, watermark", body: "Perfecto para: foto de perfil, watermark en videos, favicon, sticker." },
          { eyebrow: "Zona de seguridad", title: "50% del ancho del isotipo", body: "El espacio mínimo alrededor del logo equivale a la mitad del ancho del bloque AMTME." },
        ]
      },
      {
        id: "logo-c", label: "C — Símbolo pregunta",
        cards: [
          { eyebrow: "Concepto", title: "Símbolo de interrogación estilizado", body: "Un signo de interrogación en Montserrat Black con silueta del host. Punto inferior en Cian #58C8FF." },
          { eyebrow: "Fortaleza", title: "Concepto más original", body: "La pregunta '¿por qué nadie me lo explicó?' es el ADN del podcast." },
          { eyebrow: "Cuándo usar", title: "Temporada 2+ en adelante", body: "Requiere que la audiencia ya conozca la marca. No recomendado para lanzamiento." },
        ]
      },
    ]
  },
  {
    id: "color",
    number: ".03",
    eyebrow: "Colorimetría",
    title: "Sistema de Color",
    description: "Tres paletas completas. La Opción A es la identidad actual extraída de la imagen.",
    options: [
      {
        id: "color-a", label: "A — Azul Eléctrico",
        cards: [
          { eyebrow: "Paleta A — Extraída de la imagen", title: "Azul Eléctrico Dominante", body: "Un solo color dominante de alta saturación que ocupa el 80% de las piezas. Todo lo demás es blanco, cian como acento y azul noche como profundidad.", accent: true },
          { eyebrow: "Contraste WCAG", title: "Blanco sobre azul: 7.2:1 ✅ AAA", body: "La combinación principal pasa el nivel AAA de accesibilidad. Cian sobre azul: 3.1:1 ⚠️ solo para texto grande." },
          { eyebrow: "Regla de oro", title: "#1535FF + #FFFFFF es inamovible", body: "El Cian #58C8FF cubre exactamente 1 sola palabra por pieza. El Azul Profundo #0A1ACC solo como borde o línea." },
        ]
      },
      {
        id: "color-b", label: "B — Triada Profunda",
        cards: [
          { eyebrow: "Paleta B — Triada Profunda", title: "Azul Noche como base", body: "El Azul Noche #0B1680 toma el rol dominante. Más oscura, más premium, más misteriosa.", dark: true },
          { eyebrow: "Mood", title: "Premium / Nocturno", body: "Ideal para: plataformas de contenido premium, temporadas temáticas oscuras, ediciones especiales." },
          { eyebrow: "Aplicación", title: "Toda la paleta A + inversión de roles", body: "No se introducen nuevos colores. Solo se intercambian los roles." },
        ]
      },
      {
        id: "color-c", label: "C — Monocromático",
        cards: [
          { eyebrow: "Paleta C — Monocromático Profundo", title: "Una sola familia de azules", body: "Todo el sistema vive en graduaciones del mismo azul. La jerarquía se crea por luminosidad, no por cambio de color.", accent: true },
          { eyebrow: "Cuándo usar", title: "Temporadas o episodios temáticos", body: "Funciona mejor para temporadas especiales o microseries." },
          { eyebrow: "Limitación", title: "Requiere mayor precisión en diseño", body: "Sin colores de acento distintos, la jerarquía depende 100% del peso tipográfico y el tamaño." },
        ]
      },
    ]
  },
  {
    id: "tipo",
    number: ".04",
    eyebrow: "Composición Tipográfica",
    title: "Sistema Tipográfico",
    description: "Tres familias tipográficas distintas con escala completa.",
    options: [
      {
        id: "tipo-a", label: "A — Montserrat",
        cards: [
          { eyebrow: "Montserrat — Recomendada", title: "Geométrica sans-serif", body: "Google Fonts, gratuita. 9 pesos disponibles. La más cercana a la imagen original.", accent: true },
          { eyebrow: "Escala", title: "Ratio 1.333 (cuarta perfecta)", body: "28pt base · 37pt subtítulo sec. · 49pt subtítulo · 64pt título · 86pt hero." },
          { eyebrow: "Pesos a instalar", title: "Regular · SemiBold · ExtraBold · Black", body: "No usar más de 2 pesos por pieza. Montserrat Black solo para el texto HL de acento." },
        ]
      },
      {
        id: "tipo-b", label: "B — Inter",
        cards: [
          { eyebrow: "Inter — Alternativa digital", title: "La tipografía de las apps", body: "Diseñada para pantallas. Extremadamente legible en texto pequeño." },
          { eyebrow: "Mood diferente", title: "Más neutral, menos expresiva", body: "Ideal si el contenido es más técnico-financiero que narrativo-personal." },
          { eyebrow: "Disponibilidad", title: "Google Fonts · Figma nativo", body: "Es la fuente por defecto de Figma. Variable font disponible para web." },
        ]
      },
      {
        id: "tipo-c", label: "C — Raleway",
        cards: [
          { eyebrow: "Raleway — Elegante sans-serif", title: "Personalidad más refinada", body: "Proporciones más elegantes. Diferenciador si los competidores usan Montserrat." },
          { eyebrow: "Cuándo preferirla", title: "Si el público objetivo es 30-45 años", body: "Comunica madurez y criterio." },
          { eyebrow: "Limitación", title: "Menos pesos disponibles", body: "El 'Black' de Raleway es visualmente menos impactante que el de Montserrat." },
        ]
      },
    ]
  },
  {
    id: "icono",
    number: ".05",
    eyebrow: "Iconografía",
    title: "Sistema de Íconos",
    description: "Tres librerías de íconos con filosofías distintas.",
    options: [
      {
        id: "icono-a", label: "A — Phosphor",
        cards: [
          { eyebrow: "Phosphor Icons — Recomendada", title: "6 pesos, 1300+ íconos", body: "Thin, Light, Regular, Bold, Fill, Duotone. Usar siempre Bold para brand.", accent: true },
          { eyebrow: "Íconos de marca", title: "Los 6 íconos del sistema", body: "Microphone · Question · Headphones · ArrowRight · Star · ShareNetwork." },
          { eyebrow: "Reglas de uso", title: "Bold en brand, Regular en docs", body: "Tamaño mínimo: 24px digital / 8mm impresión. Color: blanco sobre fondos azul." },
        ]
      },
      {
        id: "icono-b", label: "B — Lucide",
        cards: [
          { eyebrow: "Lucide Icons", title: "Trazo limpio, 1000+ íconos", body: "Un solo peso (stroke 1.5-2px). Muy limpio y minimalista." },
          { eyebrow: "Carácter visual", title: "Minimalista y técnico", body: "Comunican precisión y claridad. Funcionan mejor en fondos claros." },
          { eyebrow: "Limitación", title: "Sin variantes de peso", body: "Todos los íconos tienen el mismo peso visual, lo que limita la jerarquía." },
        ]
      },
      {
        id: "icono-c", label: "C — Material Symbols",
        cards: [
          { eyebrow: "Material Symbols (Google)", title: "Variable font — 3000+ íconos", body: "Variable font permite ajustar peso, relleno y óptica con CSS." },
          { eyebrow: "Ventaja única", title: "Animatable con CSS", body: "Los íconos pueden animarse fluidamente entre pesos y estados." },
          { eyebrow: "Desventaja", title: "Carácter más 'app de Google'", body: "Estética asociada a Google y Android." },
        ]
      },
    ]
  },
  {
    id: "grid",
    number: ".06",
    eyebrow: "Composición Reticular",
    title: "Sistema de Grid",
    description: "El esqueleto invisible de todas las piezas. Define espaciados, márgenes y proporciones.",
    options: [
      {
        id: "grid-a", label: "A — Módulo 8px",
        cards: [
          { eyebrow: "Grid A — Recomendado", title: "Módulo base 8px", body: "Todo se construye en múltiplos de 8: 8 / 16 / 24 / 32 / 40 / 48 / 64 / 80 / 96px.", accent: true },
          { eyebrow: "Carrusel 1080×1080px", title: "6 col · 64px márgenes · 16px gutter", body: "Zona título: col 1-6, hasta 50% del alto. Zona cuerpo: col 1-5, 50%-85%." },
          { eyebrow: "Story 1080×1920px", title: "4 col · 80px márgenes · 24px gutter", body: "Sin texto en el 15% superior (interfaz IG). Sin texto en el 20% inferior." },
        ],
        table: { headers: ["Formato", "Dimensión", "Columnas", "Márgenes", "Gutter"], rows: [["Carrusel IG", "1080×1080", "6", "64px", "16px"], ["Story / Reel", "1080×1920", "4", "80px lat / 160px top / 240px bot", "24px"], ["YouTube Thumb", "1280×720", "12", "48px", "16px"], ["Cover podcast", "3000×3000", "6", "200px", "40px"]] }
      },
      {
        id: "grid-b", label: "B — 12 Columnas Fluid",
        cards: [
          { eyebrow: "Grid B — 12 Columnas Fluid", title: "El estándar de la web", body: "12 columnas permite dividir en halves, thirds, quarters y combinaciones asimétricas." },
          { eyebrow: "Ventaja", title: "Directamente exportable a CSS Grid", body: "El mismo grid visual se replica en CSS con grid-template-columns: repeat(12, 1fr)." },
          { eyebrow: "Thumb YouTube con grid 12", title: "Col 1-7 texto · Col 8-12 foto", body: "Foto del host ocupa mitad derecha. Texto ocupa mitad izquierda." },
        ]
      },
      {
        id: "grid-c", label: "C — Proporción Áurea",
        cards: [
          { eyebrow: "Grid C — Áurea", title: "Ratio 1.618", body: "Cada zona se divide según la proporción áurea. Ideal para diseño de carátulas, portadas y materiales editoriales." },
          { eyebrow: "Estética", title: "Armonía natural", body: "Las proporciones áureas producen composiciones naturalmente equilibradas y agradables al ojo." },
          { eyebrow: "Limitación", title: "Más difícil de mantener", body: "Requiere herramientas de diseño que soporten guías personalizadas." },
        ]
      },
    ]
  },
  {
    id: "apps",
    number: ".07",
    eyebrow: "Aplicaciones",
    title: "Piezas y Aplicaciones",
    description: "Cómo se aplica el sistema visual a las distintas piezas de comunicación.",
    options: [
      {
        id: "apps-a", label: "A — Digital completo",
        cards: [
          { eyebrow: "Opción A — Producción completa", title: "8 piezas recurrentes", body: "Cover episodio · Story lanzamiento · Carrusel 4 slides · Thumbnail YouTube · Quote card · Audiogram · Newsletter header · Blog hero.", accent: true },
          { eyebrow: "Plantillas Canva", title: "8 templates editables", body: "Cada pieza tiene un template en Canva con todos los elementos en su lugar." },
          { eyebrow: "Ritmo de publicación", title: "3 piezas por episodio mínimo", body: "Cover + Story + Thumbnail son obligatorias. El resto son opcionales según la estrategia de la semana." },
        ]
      },
      {
        id: "apps-b", label: "B — Merchandise",
        cards: [
          { eyebrow: "Opción B — Extensión física", title: "Merch básico", body: "Camiseta · Gorra · Sticker pack · Tote bag. Solo en azul eléctrico + blanco." },
          { eyebrow: "Proveedor", title: "Print-on-demand", body: "Printful o Gooten para cero inventario. Se producen bajo demanda con integración a Shopify." },
          { eyebrow: "Cuándo activar", title: "Al confirmar primer evento en vivo", body: "No producir físicos antes de tener el evento confirmado." },
        ]
      },
      {
        id: "apps-c", label: "C — Minimalista",
        cards: [
          { eyebrow: "Opción C — Máxima austeridad", title: "Minimalista", body: "Solo 3 piezas recurrentes: cover de episodio, story de lanzamiento y thumbnail de YouTube." },
          { eyebrow: "Principio", title: "Menos piezas, más calidad", body: "En lugar de 8 piezas promedio, se producen 3 piezas perfectas." },
          { eyebrow: "Para quién", title: "Equipos unipersonales con poco tiempo", body: "Coherencia visual sin burnout de producción." },
        ]
      },
    ]
  },
  {
    id: "guidelines",
    number: ".08",
    eyebrow: "Brand Guidelines",
    title: "Formato del Manual de Marca",
    description: "Tres formatos de documento para distintos niveles de detalle y audiencia.",
    options: [
      {
        id: "bg-a", label: "A — 1-Pager",
        cards: [
          { eyebrow: "Opción A — Para uso diario", title: "1-Pager A4 imprimible", body: "Una sola página con: logo + paleta con HEX + escala tipográfica + 3 colorways + reglas DO/DON'T.", accent: true },
          { eyebrow: "Contenido exacto", title: "7 secciones en 1 página", body: "1. Logo versiones · 2. Paleta · 3. Tipografía · 4. Escala · 5. Colorways · 6. DO/DON'T · 7. Tokens CSS" },
          { eyebrow: "Formato", title: "PDF A4 · Canva · Figma", body: "Descargable como PDF desde el drive de la marca. Actualizar máximo una vez por trimestre." },
        ]
      },
      {
        id: "bg-b", label: "B — Multi-página",
        cards: [
          { eyebrow: "Opción B — Para equipos", title: "Manual completo 15-20 páginas", body: "Documento extenso para agencias, diseñadores externos y patrocinadores." },
          { eyebrow: "Estructura", title: "10 capítulos", body: "1. Visión y misión · 2. Personalidad · 3. Logo · 4. Color · 5. Tipografía · 6. Fotografía · 7. Tono de voz · 8. Canales · 9. DO/DON'T · 10. Tokens" },
          { eyebrow: "Cuándo crearlo", title: "Al tener primer colaborador externo", body: "No construir antes de tener a alguien que lo necesite." },
        ]
      },
      {
        id: "bg-c", label: "C — Style Tile",
        cards: [
          { eyebrow: "Opción C — Para diseñadores", title: "Style Tile interactivo", body: "Página web o Figma frame que muestra todos los elementos del sistema juntos en contexto." },
          { eyebrow: "Ventaja", title: "Se entiende sin leer", body: "Un diseñador externo entiende el sistema visual en 60 segundos." },
          { eyebrow: "Herramienta", title: "Figma Community o Notion + Canva", body: "Crear en Figma como frame compartible con link." },
        ]
      },
    ]
  },
  {
    id: "strategy",
    number: ".09",
    eyebrow: "Brand Strategy",
    title: "Posicionamiento de Marca",
    description: "Tres territorios estratégicos que definen cómo se presenta Chris y cómo la audiencia percibe el podcast.",
    options: [
      {
        id: "str-a", label: "A — Educativo Cercano",
        cards: [
          { eyebrow: "Estrategia A — Actual", title: "Educativo Cercano", body: '"Aprendo contigo porque nadie nos lo explicó a ninguno." Chris no es el experto, es el compañero.', accent: true },
          { eyebrow: "Tono de voz", title: '1er persona plural — "nosotros"', body: 'Usar "nadie NOS enseñó", "lo que TODOS deberíamos saber". La audiencia es co-protagonista.' },
          { eyebrow: "Pilares de contenido", title: "40% educativo · 30% comunidad · 20% autoridad · 10% conversión", body: "Carruseles de 6 slides, Stories con preguntas, episodios con invitados, CTAs mínimos." },
        ]
      },
      {
        id: "str-b", label: "B — Experto Directo",
        cards: [
          { eyebrow: "Estrategia B — Para escalar", title: "Experto Directo", body: '"Ya lo investigué, te digo cómo es." Chris asume el rol de experto construido.' },
          { eyebrow: "Tono de voz", title: "Asertivo, directo, sin ambigüedades", body: '"Aquí te explico", "Esto es lo que funciona", "Así se hace". Frases declarativas.' },
          { eyebrow: "Riesgo", title: "Pérdida de autenticidad", body: "El cambio a posicionamiento experto puede sentirse como traición al concepto original." },
        ]
      },
      {
        id: "str-c", label: "C — Comunidad Movimiento",
        cards: [
          { eyebrow: "Estrategia C — A largo plazo", title: "Comunidad — Movimiento", body: '"Somos los que aprendemos solos." La marca supera al podcast.' },
          { eyebrow: "Acciones clave", title: "UGC · Hashtag · Comunidad privada", body: "Incentivar que la audiencia use #AMTME. Crear grupo privado. Episodios del oyente." },
          { eyebrow: "Monetización asociada", title: "Membresía · Cursos · Eventos", body: "Membresía mensual, cursos cortos, eventos presenciales, masterminds." },
        ]
      },
    ]
  },
  {
    id: "prompts",
    number: ".10",
    eyebrow: "AI Prompts",
    title: "Generación de Assets con IA",
    description: "Sets de prompts por plataforma para generar imágenes consistentes con la identidad visual.",
    options: [
      {
        id: "pr-a", label: "A — Midjourney",
        cards: [
          { eyebrow: "Midjourney v6", title: "Cover art de episodio", body: "Electric blue minimalist podcast cover art, bold white sans-serif typography, neon glow text effect, single cyan accent word --ar 1:1 --style raw --v 6", accent: true },
          { eyebrow: "Midjourney v6", title: "Fondo textura para slides", body: "Subtle grain texture on electric blue background #1535FF, minimal noise, smooth vignette edges --ar 1:1 --style raw --v 6", accent: true },
          { eyebrow: "Midjourney v6", title: "Thumbnail YouTube conceptual", body: "Bold graphic design thumbnail, dark navy blue background, white bold text layout, cyan accent element --ar 16:9 --v 6", accent: true },
        ]
      },
      {
        id: "pr-b", label: "B — Adobe Firefly",
        cards: [
          { eyebrow: "Adobe Firefly", title: "Cover art episodio", body: "Podcast cover, vivid electric blue background, white bold typography with soft glow, minimal design, square format." },
          { eyebrow: "Adobe Firefly", title: "Fondo abstracto de marca", body: "Abstract brand background, deep blue monochromatic, subtle geometric pattern, professional podcast aesthetic." },
          { eyebrow: "Adobe Firefly", title: "Integración con Photoshop", body: "Usar Generative Fill para extender fotos, eliminar fondos, agregar texturas." },
        ]
      },
      {
        id: "pr-c", label: "C — DALL·E 3",
        cards: [
          { eyebrow: "DALL·E 3 / ChatGPT", title: "Cover art episodio", body: '"Crea una portada para podcast con fondo azul eléctrico vibrante (#1535FF), texto blanco en negrita con efecto glow suave."' },
          { eyebrow: "DALL·E 3 / ChatGPT", title: "Ícono / símbolo de marca", body: '"Diseña un ícono minimalista de signo de interrogación estilizado en Montserrat Black, color azul eléctrico y blanco."' },
          { eyebrow: "Ventaja DALL·E 3", title: "Instrucciones en español", body: "DALL·E 3 entiende instrucciones detalladas en español natural." },
        ]
      },
    ]
  },
  {
    id: "sem",
    number: ".11",
    eyebrow: "SEM Campaign",
    title: "Campaña de Búsqueda Pagada",
    description: "Tres niveles de inversión con estrategias distintas.",
    options: [
      {
        id: "sem-a", label: "A — Starter $500",
        cards: [
          { eyebrow: "Nivel Starter", title: "$500 USD / mes", body: "+200 oyentes nuevos/mes · CPA objetivo $0.80 · 3 plataformas (Google, Meta, Spotify).", accent: true },
          { eyebrow: "Google Ads Search", title: "$150 — Keywords", body: "Campaña 1: Marca (proteger). Campaña 2: Intención educativa." },
          { eyebrow: "Meta Ads (Instagram)", title: "$250 — Conversión", body: "Conversión a Spotify/bio. CPM <$8." },
        ],
        table: { headers: ["Plataforma", "Presupuesto", "Tipo de anuncio", "KPI"], rows: [["Google Ads Search", "$150", "Búsqueda de keywords", "CPC <$0.80"], ["Meta Ads (Instagram)", "$250", "Conversión a Spotify/bio", "CPM <$8"], ["Spotify Ad Studio", "$100", "Audio ad 30s", "CPL <$1.20"]] }
      },
      {
        id: "sem-b", label: "B — Growth $1,500",
        cards: [
          { eyebrow: "Nivel Growth", title: "$1,500 USD / mes", body: "+600 oyentes nuevos/mes · 15% retención 30 días · 5 plataformas.", accent: true },
          { eyebrow: "YouTube TrueView", title: "$300 — Pre-roll", body: "Pre-roll 15-30s. CPV <$0.10." },
          { eyebrow: "TikTok Ads", title: "$150 — In-feed video", body: "CPM <$6. Video nativo en formato TikTok." },
        ],
        table: { headers: ["Plataforma", "Presupuesto", "Tipo", "KPI"], rows: [["Google Ads", "$400", "Search + remarketing", "ROAS >3x"], ["Meta Ads", "$500", "Video + conversión", "CPM <$7"], ["YouTube TrueView", "$300", "Pre-roll 15-30s", "CPV <$0.10"], ["Spotify", "$150", "Audio 30s + banner", "CTR >0.5%"], ["TikTok", "$150", "In-feed video", "CPM <$6"]] }
      },
      {
        id: "sem-c", label: "C — Scale $3,000",
        cards: [
          { eyebrow: "Nivel Scale", title: "$3,000 USD / mes", body: "+1,500 oyentes nuevos/mes · Top 50 Educación ES · 6 plataformas.", accent: true },
          { eyebrow: "Full funnel", title: "Google + Meta + YouTube", body: "Google $700 (Search + Display + YouTube Search). Meta $900 (Prospecting + retargeting + lookalike)." },
          { eyebrow: "Escalado inteligente", title: "Solo escalar lo que funciona", body: "Medir por 30 días. Si CPA baja, duplicar. Si no, pivotar." },
        ]
      },
    ]
  },
  {
    id: "geo",
    number: ".12",
    eyebrow: "GEO Strategy",
    title: "Generative Engine Optimization",
    description: "Optimización para aparecer en resultados de ChatGPT, Perplexity, Gemini y Google AI Overview.",
    options: [
      {
        id: "geo-a", label: "A — Content-first",
        cards: [
          { eyebrow: "GEO A — Recomendada", title: "Content-first", body: "Publicar show notes de 800+ palabras por episodio en formato de artículo SEO.", accent: true },
          { eyebrow: "Formato para ser citado", title: "Pregunta → Respuesta directa → Desarrollo", body: "H1 = pregunta. Primer párrafo = respuesta directa. Resto = desarrollo." },
          { eyebrow: "Plataformas objetivo", title: "Podchaser · Listennotes · Blog propio", body: "Reclamar perfiles. Blog con show notes. Schema PodcastSeries implementado." },
        ]
      },
      {
        id: "geo-b", label: "B — Schema-first",
        cards: [
          { eyebrow: "GEO B — Para sitios existentes", title: "Schema-first", body: "Implementar Schema markup completo en el sitio antes de crear nuevo contenido." },
          { eyebrow: "Schemas prioritarios", title: "PodcastSeries · PodcastEpisode · Person · FAQPage", body: "PodcastSeries en la principal. PodcastEpisode en cada show notes. Person para Chris." },
          { eyebrow: "Resultado esperado", title: "Aparecer en AI Overview de Google", body: "Con Schema correcto, Google AI Overview puede incluir AMTME en respuestas generadas." },
        ]
      },
      {
        id: "geo-c", label: "C — Authority-first",
        cards: [
          { eyebrow: "GEO C — A largo plazo", title: "Authority-first", body: "Conseguir que 5-10 medios en español publiquen artículos mencionando AMTME." },
          { eyebrow: "Acciones clave", title: "Prensa · Guest posting · Wikipedia", body: "Notas de prensa a Infobae, El País, Forbes LATAM. Participar en 5+ podcasts similares." },
          { eyebrow: "Métricas GEO", title: "Búsqueda manual semanal", body: "Preguntar a ChatGPT semanalmente si recomienda AMTME." },
        ]
      },
    ]
  },
  {
    id: "seo",
    number: ".13",
    eyebrow: "SEO",
    title: "Posicionamiento Orgánico",
    description: "Tres estrategias SEO para distintos recursos y objetivos de tráfico.",
    options: [
      {
        id: "seo-a", label: "A — Blog + Show Notes",
        cards: [
          { eyebrow: "SEO A — Recomendada", title: "Blog + Show Notes optimizados", body: "Cada episodio = un artículo de 800+ palabras en amtme.com.", accent: true },
          { eyebrow: "Keywords por intención", title: "Informacional · Navegacional · Conversión", body: 'Informacional: "qué es un fondo de inversión". Navegacional: "a mi tampoco me explicaron podcast".' },
          { eyebrow: "Checklist por episodio", title: "8 puntos obligatorios", body: "✓ Título H1 ✓ Meta 155 chars ✓ 800+ palabras ✓ 3-5 links internos ✓ Transcript ✓ Schema ✓ OG Image" },
        ],
        table: { headers: ["Página", "URL", "Keyword objetivo"], rows: [["Home", "amtme.com/", "podcast educativo español"], ["Archivo episodios", "amtme.com/episodios/", "episodios de amtme"], ["Finanzas", "amtme.com/temas/finanzas/", "podcast finanzas personales"], ["Sobre Chris", "amtme.com/sobre-chris/", "chris villamar podcast"]] }
      },
      {
        id: "seo-b", label: "B — Video SEO",
        cards: [
          { eyebrow: "SEO B — YouTube + búsqueda", title: "Video SEO", body: "Optimizar títulos, descripciones y tags de cada video para YouTube y Google Video." },
          { eyebrow: "Optimización de videos", title: "Título · Descripción · Chapters · Tags", body: "Título: keyword en primeras 5 palabras. Descripción: 500+ palabras con chapters." },
          { eyebrow: "YouTube Shorts para SEO", title: "Clips de 60s con keyword", body: "Extraer el momento más buscable de cada episodio. Keyword en el título del Short." },
        ]
      },
      {
        id: "seo-c", label: "C — Topic Clusters",
        cards: [
          { eyebrow: "SEO C — Estrategia avanzada", title: "Topic Clusters", body: "Crear 'pillar pages' por tema que agrupan todos los episodios relacionados." },
          { eyebrow: "Estructura", title: "1 Pillar → N Cluster pages", body: 'Pillar: "Guía completa de finanzas personales para latinoamericanos" (3000+ palabras).' },
          { eyebrow: "Tiempo para resultados", title: "90-180 días para posicionar", body: "Estrategia de 6+ meses. Más sostenibles pero requieren mayor inversión inicial." },
        ]
      },
    ]
  },
  {
    id: "medios",
    number: ".14",
    eyebrow: "Medios e Inversión",
    title: "Estrategia de Medios",
    description: "Tres planes de inversión publicitaria con mezcla de canales distinta para cada etapa.",
    options: [
      {
        id: "med-a", label: "A — Solo Digital",
        cards: [
          { eyebrow: "Plan A — Para comenzar ahora", title: "100% Digital", body: "Todo el presupuesto en canales digitales medibles. Máximo control sobre el gasto.", accent: true },
          { eyebrow: "Distribución de presupuesto", title: "60% Meta · 25% Google · 15% Experimentación", body: "60% donde ya está la audiencia. 25% para captura. 15% para probar canales nuevos." },
          { eyebrow: "Métricas de control", title: "Dashboard semanal de 6 KPIs", body: "Nuevos oyentes · CPC promedio · CPM Instagram · Posición keyword · Escuchas totales · Retención 30 días" },
        ]
      },
      {
        id: "med-b", label: "B — Digital + Audio",
        cards: [
          { eyebrow: "Plan B — Con Spotify + iHeart", title: "Digital + Audio", body: "Se agregan spots de audio en Spotify Ad Studio e iHeartRadio LATAM." },
          { eyebrow: "Audio ads", title: "Spot de 30s propio · Anuncio host-read", body: "Producir un spot de audio de 30s con la voz de Chris. Máximo impacto por ser auténtico." },
          { eyebrow: "Newsletters de nicho", title: "Mención patrocinada en newsletters LATAM", body: "3-5 newsletters de finanzas con 10K+ suscriptores. $100-300 USD por envío." },
        ]
      },
      {
        id: "med-c", label: "C — Omnicanal",
        cards: [
          { eyebrow: "Plan C — Expansión total", title: "Omnicanal", body: "Todos los canales incluyendo medios tradicionales: prensa, eventos, out-of-home." },
          { eyebrow: "Medios tradicionales", title: "Prensa digital · Eventos · OOH digital", body: "Nota de prensa a Infobae, Forbes LATAM. Stand en eventos. Pantallas en coworkings." },
          { eyebrow: "Regla de activación", title: "Solo con 10K oyentes/episodio base", body: "La inversión omnicanal solo tiene ROI con base de oyentes que refuerce con boca a boca." },
        ]
      },
    ]
  },
];
