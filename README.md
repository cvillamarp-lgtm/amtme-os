# AMTME — Script Engine + Visual OS

Script Engine + Visual OS 
 
Instrucción Maestra de Implementación
Sistema Operativo de Contenido Editorial · Podcast A Mí Tampoco Me Explicaron
 
 
Podcast
A Mí Tampoco Me Explicaron
Host
Christian Villamar · @yosoyvillamar
Versión
1.0 — Final
Stack
React · Vite · Tailwind · Supabase · Claude API
Deploy
Vercel · GitHub

## 1. Visión y Objetivo

Construir una web app interna de uso profesional que opera como el sistema central de producción de contenido editorial del podcast AMTME. La app recibe un guion o transcripción cruda y lo transforma, en un flujo asistido por IA, en todos los assets editoriales, visuales y de distribución necesarios para el lanzamiento de un episodio.

### Dos motores integrados

El sistema tiene dos motores que comparten base de datos, autenticación y estado:

- **Script Engine** — transforma texto en contenido estructurado: limpieza → análisis semántico → generación de 10 tipos de outputs editoriales
- **Visual OS** — convierte el contenido aprobado en assets visuales: formulario → preview → validación → exportación
 
### Regla fundamental e innegociable

La app no inventa contenido. Todo output deriva exclusivamente del texto real pegado por el usuario. Claude extrae, estructura y reformula — nunca fabrica. Si el texto no contiene un elemento, el campo queda vacío con advertencia visible.

## 2. Identidad del Podcast

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | A Mí Tampoco Me Explicaron (AMTME) |
| **Host** | Christian Villamar · @yosoyvillamar |
| **Tono** | Íntimo, emocional, editorial, humano, claro, sobrio |
| **Universo** | Duelo, relaciones, pérdida, ansiedad, autoconocimiento, tarot como herramienta interna |
| **Nunca es** | Coaching, motivacional vacío, corporativo, moralista, sobreexplicado |
| **Promesa** | "A mí tampoco me explicaron esto" — solidaridad radical desde el mismo nivel que el oyente |

## 3. Stack Técnico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Storage) |
| **IA** | Anthropic Claude — claude-sonnet-4-20250514 vía Supabase Edge Functions |
| **Estado global** | Zustand |
| **Deploy** | Vercel |
| **Repositorio** | GitHub |
| **Integraciones futuras** | Google Drive · Google Sheets · Google Calendar · OpenAI Images API |

### Regla de seguridad — obligatoria

No se expone ninguna API key en el frontend. La integración con Anthropic Claude se ejecuta exclusivamente mediante Supabase Edge Functions o backend serverless seguro. Nunca llamadas directas desde el navegador.

### Diseño de la app — estilo Apple

Espaciado generoso, tipografía clara, interfaces que respiran, sin decoración innecesaria. Cada pantalla tiene una sola función principal visible. El sistema operativo es el producto — no la decoración.

## 4. Arquitectura de Módulos

```
AMTME App
├── Auth (Supabase Auth — email/password)
├── Dashboard (listado de episodios + estados)
│
├── SCRIPT ENGINE
│   ├── 01 Ingesta
│   ├── 02 Limpieza automática
│   ├── 03 Mapa semántico
│   ├── 04 Outputs generados (10 tipos)
│   ├── 05 Validación pre-exportación
│   └── 06 Exportación
│
└── VISUAL OS
   ├── Editor de assets (formulario + preview + validaciones)
   ├── Sistema de paletas (4 predefinidas + paleta libre P5)
   ├── Sistema de figura humana (REF_1 / REF_2 + sugerencia IA)
   ├── Sistema de plantillas parametrizables
   ├── Historial de versiones
   └── Registro de cambios
```

## 5. Sistema de Color — Paleta Principal

El azul noche #020B18 tiene la misma profundidad semántica que el contenido del podcast: lo que está debajo, lo que no se nombra, lo que se siente antes de poder hablar. El lima #E4F542 es la luz que aparece después — exactamente la promesa de cada episodio.

### Tokens oficiales — Paleta 1 (Principal)

| Token | Hex | Rol | % canvas |
|-------|-----|-----|----------|
| --bg | #020B18 | Fondo principal | 60% |
| --accent | #E4F542 | Lima · keyword + CTA + subrayado | 15% |
| --text | #F0EEE6 | Blanco cálido · texto principal | 20% |
| --surface | #071428 | Azul marino · cards / surfaces | — |
| --surface2 | #0D2545 | Azul medio · hovers | — |
| --accent-deep | #B8C82E | Lima profundo · subrayado fondo claro | — |

### Contraste — ratios WCAG

| Par de colores | Ratio | Nivel |
|---|---|---|
| Lima #E4F542 sobre Azul noche #020B18 | 16.8:1 | AAA ✓ |
| Blanco #F0EEE6 sobre Azul noche #020B18 | 15.2:1 | AAA ✓ |
| Azul noche #020B18 sobre Lima #E4F542 | 16.8:1 | AAA ✓ |

### Reglas de uso del color

- Lima máximo 15% del canvas — keyword principal + CTA + subrayado únicamente. La escasez es el poder.
- Prohibido #000000 puro en ningún campo. El negro más oscuro del sistema es #020B18.
- Máximo 2 colores por pieza — fondo + acento. El blanco #F0EEE6 es neutral.
- El lima va en una sola palabra por headline — la de mayor carga emocional.
- 50% del canvas debe ser espacio vacío — el aire es parte del diseño, no un error.

## 6. Sistema de Paletas Alternativas

Cada episodio tiene una paleta base asignada (por defecto Paleta 1). El editor puede hacer override por pieza individual en el Visual OS. El sistema muestra advertencia visual si el contraste baja de 4.5:1 — pero nunca bloquea.

| # | Nombre | Tokens (bg / accent / text) | Uso |
|---|--------|-----------|-----|
| P1 | Principal | #020B18 / #E4F542 / #F0EEE6 | Lanzamiento, portadas, reels, CTA — Default |
| P2 | Naranja | #0F0500 / #FF6B35 / #FFF0E8 | Alta intensidad emocional — duelo, ruptura, crisis |
| P3 | Invertida | #F0EEE6 / #B8C82E / #020B18 | Quotes emocionales profundas, piezas educativas |
| P4 | Negro abs. | #000510 / #E4F542 / #FFFFFF | Reel covers, highlights, máximo impacto |
| P5 | Libre | Editor define bg / accent / text | Paleta personalizada con validación de contraste |

### Paleta 5 — Libre

El editor ingresa 3 valores hex: bg, accent y text. El sistema calcula automáticamente surface, surface2 y accent-deep. La validación de contraste se ejecuta en tiempo real en el panel derecho del Visual OS.

- Contraste accent/bg < 4.5:1 → advertencia naranja: "Contraste bajo — el acento puede no verse en miniatura"
- Contraste text/bg < 4.5:1 → advertencia roja: "Texto ilegible — contraste insuficiente"
- El sistema nunca bloquea al usar Paleta 5 — el editor decide siempre.
 
### Asignación por episodio y override por pieza

En el Dashboard, al crear un episodio, se asigna la paleta base del episodio completo. Todos los assets heredan esa paleta por defecto. En el Visual OS, el selector de paleta en el panel izquierdo permite override individual mostrando [Heredada del episodio: P1] o [Override: P2].

## 7. Sistema Visual — Filosofía y Principios

### Una idea, mucho aire

Cada pieza tiene una sola idea principal. Un headline, una keyword en lima, un CTA o ninguno. Si hay foto de Christian, no hay texto fantasma de fondo. Si hay headline grande, la foto es soporte. Si hay texto grande, no hay decoración adicional.

### Principios Gestalt aplicados

| Principio | Aplicación en el sistema |
|-----------|--------|
| Figura-fondo | Christian no es foto sobre fondo. Es figura en el mismo plano que el texto. El cerebro detecta caras en <150ms. |
| Cierre | Tipografía puede sangrar fuera del canvas. El ojo completa la palabra. Solo en headlines de 1–2 palabras. |
| Proximidad | Subrayado inmediatamente bajo la keyword. Distancia máxima: 4px. Crea unidad visual. |
| Contraste de jerarquía | La keyword ocupa 60–75% del ancho. Todo lo demás existe a escala mínima como contexto. |

### Tipografía del sistema

| Nivel | Fuente | Peso | Uso |
|-------|--------|------|-----|
| Display / Keyword | Montserrat | 900 | Palabra clave, headline principal |
| Headline | Montserrat | 700 | Título del episodio |
| Quote emocional | Playfair Display | 700 | Citas del podcast (solo en piezas visuales) |
| UI / Labels | Inter | 400–600 | Metadatos, labels, descripciones, UI de la app |

### El subrayado como elemento de tensión

Va bajo una sola palabra — la de mayor carga emocional del headline. Nunca bajo toda la frase.

- Grosor: 3–4px
- Border-radius: 2px
- Color oscuro: #E4F542 (fondos P1, P2, P4)
- Color claro: #B8C82E (fondo P3)
- Gap: 2–4px entre texto y línea
- Ancho: igual al ancho exacto de la palabra

## 8. Sistema de Figura Humana

### Las dos referencias

| Ref. | Descripción | Mood | Uso principal |
|------|-------------|------|--------------|
| REF_1 | Christian sentado en el suelo · camiseta azul AMTME · pose abierta | Íntimo, reflexivo, vulnerable | Quotes emocionales · duelo · introspección · stories íntimas |
| REF_2 | Christian sentado en silla · camiseta blanca AMTME · brazos cruzados | Directo, presente, seguro | Portadas · lanzamiento · CTA directo · reel covers |

### Sugerencia automática del sistema

Basada en el dominant_emotional_tone del mapa semántico:

```javascript
function suggestHostImage(tone, intensity) {
 const intimate = ["melancólico","reflexivo","íntimo","vulnerable","nostálgico"];
 const direct   = ["confrontacional","directo","urgente","empoderado","claro"];
 if (intimate.some(t => tone.includes(t))) return "REF_1";
 if (direct.some(t => tone.includes(t)))   return "REF_2";
 if (intensity === "Alto")                  return "REF_2";
 return "REF_1"; // Default: íntimo
}
```

### Eliminación del fondo negro

Ambas fotos tienen fondo negro original. El sistema lo elimina para integrar la figura sobre la paleta del episodio:

- Piezas oscuras (P1, P2, P4): mix-blend-mode: screen en Canvas
- Piezas claras (P3): eliminación por luminancia — píxeles con luminancia < 20 → opacity 0
 
### Sombra larga proyectada — obligatoria con figura humana

Proyectada hacia abajo. Simbolismo: peso emocional, conexión con la tierra, presencia anclada. Siempre presente cuando hay foto de Christian. Color calculado como fondo −35% luminosidad.

## 9. Sistema de Fondos — Anti-Fatiga Visual

El cerebro se adapta al patrón visual en 3–4 posts consecutivos. La variación fuerza el re-engagement. Regla: nunca dos piezas del mismo fondo consecutivas en el feed.

| Variación | Color | Pieza principal | Paleta recomendada |
|-----------|-------|-----------------|------------------|
| V1 Azul noche | #020B18 | Portada · lanzamiento de episodio | P1 |
| V2 Azul marino | #071428 | Carrusel · stories | P1 |
| V3 Blanco arena | #F0EEE6 | Quotes emocionales profundas | P3 |
| V4 Negro absoluto | #000510 | Reel cover · highlight cover | P4 |

## 10. Pipeline del Script Engine

### Fase 1 — Ingesta

#### UI requerida

- Campo título del episodio (obligatorio — bloquea procesamiento si vacío)
- Número de episodio y temporada
- Selector de tipo: guion · transcripción · notas
- Textarea grande (altura mínima 400px)
- Contador de palabras en tiempo real
- Contador de caracteres en tiempo real
- Estimación de duración hablada
- Botón principal "Procesar guion"
 
#### El textarea acepta sin restricciones

Timestamps · marcas técnicas · muletillas · repeticiones · errores de puntuación · párrafos mal cortados · mayúsculas inconsistentes · ruido conversacional.

#### Rangos del contador de palabras — Ingesta

| Estado | Rango | Acción |
|--------|-------|--------|
| 🔴 Rojo | < 300 palabras | "El texto es muy corto para procesar" |
| 🟡 Amarillo | Cerca del límite | Advertencia visual sin bloqueo |
| 🟢 Verde | 300 – 15,000 palabras | Rango ideal — procesamiento habilitado |
| 🟠 Naranja | > 15,000 palabras | "Texto muy largo, puede afectar calidad" |

#### Metadata a guardar en Supabase — tabla raw_inputs

```sql
title                    TEXT NOT NULL
season                   INTEGER
episode_number           INTEGER
source_type              TEXT  -- guion | transcripcion | notas
raw_text                 TEXT NOT NULL
raw_word_count           INTEGER NOT NULL DEFAULT 0
raw_character_count      INTEGER NOT NULL DEFAULT 0
estimated_duration_secs  INTEGER
created_by               UUID REFERENCES auth.users(id)
created_at               TIMESTAMPTZ DEFAULT now()
```

### Fase 2 — Limpieza Automática

#### Prompt de sistema para Claude

```
Eres un editor profesional. Limpia este texto eliminando timestamps, marcas técnicas irrelevantes, 
exceso de muletillas, repeticiones innecesarias y errores básicos de puntuación. 
Reconstruye párrafos legibles. Conserva el tono emocional, íntimo y humano del hablante. 
No resumas. No inventes. No expliques. Devuelve únicamente el texto limpio.
```

#### Interfaz — Split view

- Panel izquierdo: texto original en gris tenue · contador de palabras
- Panel derecho: texto limpio · contador de palabras · porcentaje de reducción
- Resumen entre paneles: Original: [N] | Limpio: [N] | Reducción: [X%]
- Botón "Aprobar texto limpio" — bloqueado hasta cumplir condiciones
- Botón "Volver a limpiar" — regenera sin perder el original
 
#### Bloqueos de limpieza

- No permitir aprobar si el texto limpio tiene menos de 250 palabras
- No permitir aprobar si la reducción supera 35% sin justificación registrada
- No permitir avanzar si el texto limpio está vacío
 
### Fase 3 — Mapa Semántico

A partir del texto limpio aprobado, construir un mapa semántico persistente que funcione como fuente única de verdad para todos los outputs.

#### Prompt de sistema para Claude

```
Eres un analista editorial experto. Analiza el texto y devuelve únicamente JSON válido. 
Extrae exclusivamente lo que exista en el texto. No inventes. Si un campo no tiene datos, 
d devuélvelo vacío. No uses markdown ni explicaciones.
```

#### Estructura JSON del mapa semántico

```json
{
 "episode_metadata": {
   "working_title": "",
   "central_theme": "",
   "central_thesis": "",        // 15–80 palabras
   "episode_promise": "",       // 10–50 palabras
   "central_conflict": "",      // 10–60 palabras
   "main_question": "",
   "dominant_emotional_tone": "",
   "emotional_intensity_level": "",
   "predominant_narrative_stage": "",
   "implicit_cta": "",
   "explicit_cta": "",
   "keywords": [],
   "psychological_concepts": []
 },
 "narrative_arc": {
   "initial_hook": "", "opening": "", "context": "",
   "wound": "", "conflict": "", "break_or_insight": "",
   "central_explanation": "", "example_or_anecdote": "",
   "tool_or_framework": "", "uncomfortable_truth": "",
   "closing": "", "final_cta": ""
 },
 "semantic_blocks": [],
 "key_phrases": [],         // 5–25 palabras c/u
 "short_quotes": [],
 "long_quotes": [],
 "reel_hooks": [],
 "carousel_ideas": [],
 "story_prompts": [],
 "cta_lines": [],
 "memorable_lines": [],
 "shareable_phrases": [],
 "polarizing_concepts": []
}
```

El dominant_emotional_tone del mapa semántico determina automáticamente la paleta sugerida para el episodio y la imagen de Christian recomendada (REF_1 o REF_2).

## 11. Generación de Outputs — 10 Tipos

#### Prompt de sistema compartido para todos los outputs

```
Eres el editor de contenido del podcast "A Mí Tampoco Me Explicaron" conducido por Christian Villamar (@yosoyvillamar). 
Tono: editorial, emocional, íntimo, claro, humano, sobrio. El tarot se usa como autoconocimiento, nunca como predicción. 
La marca no habla desde superioridad; habla desde verdad, conciencia y experiencia humana. 
Nunca generes contenido genérico, motivacional vacío, ni frases de coach. 
Todo debe nacer del mapa semántico proporcionado. 
Devuelve ÚNICAMENTE JSON válido sin markdown ni explicaciones.
```

Las 10 llamadas se ejecutan en paralelo con Promise.all. Guardado inmediato en Supabase al generarse cada una.

| # | Output | Campos principales | Rangos clave |
|---|--------|-------------------|--------------|
| 01 | Resumen editorial | internal_title · central_thesis · central_conflict · promise · summary_lines · key_phrases | Thesis: 20–60 · Lines: 15–35 |
| 02 | Visual copy (15 piezas) | headline · keyword · subheadline · body_copy · cta · suggested_image | Pieza completa: 18–65 |
| 03 | Captions | launch_short · launch_medium · reel · quote_post · carousel · story_frame | Short: 50–100 · Medium: 100–200 |
| 04 | Hooks | short_hooks · emotional · tension · uncomfortable_truth · question | Short: 8–20 · Emotional: 12–25 |
| 05 | Quotes | short_quotes · long_quotes · high_impact · saveable · shareable | Short: 10–30 · Long: 30–80 |
| 06 | Carrusel | carousel_central_idea · 8 slides exactos · emotional_climax · final_cta | Slide: 15–55 |
| 07 | Stories | launch_stories · interaction · quote_stories · response_box · polls | Story: 15–60 |
| 08 | Reels | opening_hook · body_excerpt · closing_line · rationale · impact · duration | Candidato: 50–130 |
| 09 | Descripción | short · medium · long · spotify_apple · editorial_keywords | Long: 200–400 |
| 10 | Distribución | main_launch_copy · summary · primary_cta · alt_cta · hashtags · bullets | Launch: 60–120 |

## 12. Contador de Palabras — Feature Central

El conteo de palabras es una feature de validación editorial — no un detalle de UI. Visible, persistente y funcional en cada módulo.

```javascript
function countWords(text) {
 if (!text || text.trim() === "") return 0;
 return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}
```

### Tabla de rangos obligatorios

| Módulo / Campo | Descripción | Mín | Máx |
|---|---|---|---|
| Ingesta — Texto completo | Input original del usuario | 300 | 15,000 |
| Limpieza — Texto limpio | Output del proceso de limpieza | 250 | 14,000 |
| Mapa — central_thesis | Tesis central del episodio | 15 | 80 |
| Mapa — central_conflict | Conflicto central | 10 | 60 |
| Mapa — episode_promise | Promesa del episodio | 10 | 50 |
| Captions — launch_short | Caption de lanzamiento corto | 50 | 100 |
| Captions — launch_medium | Caption de lanzamiento largo | 100 | 200 |
| Captions — reel_caption | Caption para reel | 30 | 80 |
| Hooks — short_hook | Hook corto | 8 | 20 |
| Hooks — emotional_hook | Hook emocional | 12 | 25 |
| Quotes — short_quote | Cita corta | 10 | 30 |
| Quotes — long_quote | Cita larga | 30 | 80 |
| Reels — candidato | Candidato a reel (total) | 50 | 130 |
| Stories — cada story | Historia individual | 15 | 60 |
| Carrusel — cada slide | Slide de carrusel | 15 | 55 |
| Visual copy — pieza | Bloque de copy visual completo | 18 | 65 |

### Bloqueos hard

- "Aprobar texto limpio" → bloqueado si texto limpio < 250 palabras
- "Guardar mapa aprobado" → bloqueado si thesis, conflict o promise están fuera de rango
- Override disponible solo para admin — queda registrado en change_log

## 13. Visual OS — Editor (3 Paneles)

### Panel izquierdo — Formulario

- Episodio activo (heredado, solo lectura)
- Selector de pieza: P01–P15
- Selector de imagen del host: [REF_1 · Suelo] [REF_2 · Silla] [Ninguna] con badge "IA sugiere REF_2"
- Selector de paleta: [P1] [P2] [P3] [P4] [P5 Libre] con badge [Heredada del episodio] o [Override]
- Si P5: tres inputs hex bg / accent / text + badge de contraste calculado en tiempo real
- Campos de contenido: keyword · headline · subheadline · body · cta
- Contador de palabras por campo con badge de estado
 
### Panel central — Preview Canvas

- Canvas renderizado a escala proporcional exacta de la plantilla
- Overlay de safe zone: línea punteada lima a 20% opacidad (toggle on/off)
- Overlay de grid: 12 columnas lima a 6% opacidad (toggle on/off)
- Figura de Christian renderizada con sombra larga proyectada
- Preview actualizado en tiempo real al cambiar formulario o paleta
 
### Panel derecho — Validaciones (solo advierte, nunca bloquea)

| Validación | Advertencia si falla |
|---|---|
| Contraste fondo/acento ≥ 4.5:1 | Naranja — "Contraste bajo" |
| Contraste fondo/texto ≥ 4.5:1 | Rojo — "Texto ilegible" |
| Keyword en lima presente | Amarillo — "Keyword sin color de acento" |
| Headline presente | Rojo — "Headline obligatorio" |
| Foto del host seleccionada | Info — "Pieza sin figura humana" |
| Safe zone respetada | Naranja — "Elemento fuera de safe zone" |
| Naming convention correcta | Info — "Naming pendiente" |
| Subrayado bajo keyword activo | Info — "Subrayado no configurado" |

### Botones de acción

Guardar draft · Validar · Exportar PNG/JPG · Aprobar

## 14. Plantillas Iniciales

### Imagen 01 — 1080 × 1080 px (1:1)

| Elemento | Posición | Tipografía | Notas |
|----------|----------|-----------|-------|
| Marca AMTME | x 80, y 48 | Inter 600 · 11px | 40% opacidad |
| EP badge | x 940, y 40 | Inter 700 · 10px | Border accent |
| Headline | x 80, y 620 · maxW 520 | Montserrat 900 · 80px | Color text |
| Keyword | x 80, y 700 · maxW 520 | Montserrat 900 · 96px | Color accent + subrayado |
| Subheadline | x 80, y 810 · maxW 500 | Inter 400 · 18px | 80% opacidad |
| CTA | x 80, y 870 | Montserrat 700 · 16–18px | bg accent · text bg |
| Foto host | Columna derecha · 45% · desde bottom | — | REF_1 o REF_2 + sombra |

Naming: AMTME-S{season}-EP{episode}-P01-V{version}.png · Safe zone: 80px todos los lados

### Imagen 02 — 1080 × 1350 px (4:5)

| Elemento | Posición | Tipografía | Notas |
|----------|----------|-----------|-------|
| Marca AMTME | x 80, y 48 | Inter 600 · 11px | 40% opacidad |
| EP badge | x 940, y 40 | Inter 700 · 10px | Border accent |
| Headline | x 80, y 780 · maxW 560 | Montserrat 900 · 88px | Color text |
| Keyword | x 80, y 880 · maxW 560 | Montserrat 900 · 108px | Color accent + subrayado |
| Subheadline | x 80, y 990 · maxW 540 | Inter 400 · 18px | 80% opacidad |
| CTA | x 80, y 1080 · w 260 | Montserrat 700 · 16–18px | Obligatorio |
| Plataformas | x 80, y 1250 | Inter 600 · 12px | Apple Podcasts + Spotify |
| Foto host | Columna derecha · 46% · desde bottom | — | REF_1 o REF_2 + sombra |

Naming: AMTME-S{season}-EP{episode}-P02-V{version}.png · Safe zone: 80px todos los lados

## 15. Autenticación y Roles

| Acción | admin | editor | reviewer |
|--------|-------|--------|----------|
| Crear episodio | ✓ | ✓ | — |
| Aprobar texto limpio | ✓ | ✓ | — |
| Aprobar mapa semántico | ✓ | ✓ | — |
| Aprobar assets visuales | ✓ | — | ✓ |
| Exportar | ✓ | ✓ | — |
| Crear paleta libre P5 | ✓ | ✓ | — |
| Gestionar plantillas | ✓ | — | — |
| Gestionar paletas predefinidas | ✓ | — | — |
| Override de word count | ✓ | — | — |

## 16. Schema SQL — Supabase

### Script Engine

```sql
CREATE TABLE episodes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 title TEXT NOT NULL,
 season INTEGER,
 episode_number INTEGER,
 status TEXT DEFAULT 'draft',
 created_by UUID REFERENCES auth.users(id),
 created_at TIMESTAMPTZ DEFAULT now(),
 updated_at TIMESTAMPTZ DEFAULT now()
);
 
CREATE TABLE raw_inputs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
 source_type TEXT CHECK (source_type IN ('guion','transcripcion','notas')),
 raw_text TEXT NOT NULL,
 raw_word_count INTEGER NOT NULL DEFAULT 0,
 raw_character_count INTEGER NOT NULL DEFAULT 0,
 estimated_duration_secs INTEGER,
 created_by UUID REFERENCES auth.users(id),
 created_at TIMESTAMPTZ DEFAULT now()
);
 
CREATE TABLE cleaned_texts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 raw_input_id UUID REFERENCES raw_inputs(id) ON DELETE CASCADE,
 cleaned_text TEXT NOT NULL,
 cleaned_word_count INTEGER NOT NULL DEFAULT 0,
 reduction_percentage NUMERIC(5,2),
 approved BOOLEAN DEFAULT false,
 approved_by UUID REFERENCES auth.users(id),
 approved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ DEFAULT now()
);
 
CREATE TABLE semantic_maps (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
 raw_input_id UUID REFERENCES raw_inputs(id),
 cleaned_text_id UUID REFERENCES cleaned_texts(id),
 semantic_json JSONB,
 dominant_emotional_tone TEXT,
 emotional_intensity_level TEXT,
 suggested_palette_id INTEGER DEFAULT 1,
 suggested_host_image TEXT DEFAULT 'REF_2',
 approved BOOLEAN DEFAULT false,
 approved_by UUID REFERENCES auth.users(id),
 approved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ DEFAULT now(),
 updated_at TIMESTAMPTZ DEFAULT now()
);
 
CREATE TABLE generated_assets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 semantic_map_id UUID REFERENCES semantic_maps(id) ON DELETE CASCADE,
 asset_type TEXT NOT NULL,
 asset_key TEXT NOT NULL,
 content_json JSONB NOT NULL,
 word_counts_json JSONB,
 status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected')),
 version INTEGER DEFAULT 1,
 created_at TIMESTAMPTZ DEFAULT now(),
 updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Visual OS

```sql
CREATE TABLE palette_definitions (
 id SERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 bg TEXT NOT NULL,
 accent TEXT NOT NULL,
 text_color TEXT NOT NULL,
 surface TEXT,
 surface2 TEXT,
 accent_deep TEXT,
 is_system BOOLEAN DEFAULT true,
 created_at TIMESTAMPTZ DEFAULT now()
);
 
CREATE TABLE visual_specs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name TEXT NOT NULL,
 width INTEGER NOT NULL,
 height INTEGER NOT NULL,
 safe_zone_px INTEGER DEFAULT 80,
 columns INTEGER DEFAULT 12,
 gutter INTEGER DEFAULT 20,
 typography_levels JSONB,
 block_coordinates JSONB,
 naming_convention TEXT,
 approval_checklist JSONB,
 created_at TIMESTAMPTZ DEFAULT now()
);
 
CREATE TABLE palette_assignments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 episode_id UUID REFERENCES episodes(id),
 asset_version_id UUID REFERENCES asset_versions(id),
 palette_id INTEGER REFERENCES palette_definitions(id) DEFAULT 1,
 custom_bg TEXT,
 custom_accent TEXT,
 custom_text TEXT,
 scope TEXT DEFAULT 'episode' CHECK (scope IN ('episode','piece')),
 created_by UUID REFERENCES auth.users(id),
 created_at TIMESTAMPTZ DEFAULT now()
);
 
CREATE TABLE asset_versions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 episode_id UUID REFERENCES episodes(id),
 visual_spec_id UUID REFERENCES visual_specs(id),
 palette_assignment_id UUID REFERENCES palette_assignments(id),
 host_image TEXT DEFAULT 'REF_2' CHECK (host_image IN ('REF_1','REF_2','none')),
 content_json JSONB NOT NULL,
 status TEXT DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected')),
 version INTEGER DEFAULT 1,
 created_by UUID REFERENCES auth.users(id),
 approved_by UUID REFERENCES auth.users(id),
 approved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ DEFAULT now()
);
 
CREATE TABLE change_log (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 entity_type TEXT NOT NULL,
 entity_id UUID NOT NULL,
 action_type TEXT NOT NULL,
 changed_by UUID REFERENCES auth.users(id),
 change_summary TEXT,
 word_count_before INTEGER,
 word_count_after INTEGER,
 created_at TIMESTAMPTZ DEFAULT now()
);
```

## 17. Seed — Datos Iniciales

### Paletas del sistema

```sql
INSERT INTO palette_definitions (id, name, bg, accent, text_color, surface, surface2, accent_deep)
VALUES
(1, 'Principal — Azul noche + Lima',
   '#020B18','#E4F542','#F0EEE6','#071428','#0D2545','#B8C82E'),
(2, 'Naranja — Emocional urgente',
   '#0F0500','#FF6B35','#FFF0E8','#1A0A00','#2D1500','#CC5520'),
(3, 'Invertida — Quotes íntimas',
   '#F0EEE6','#B8C82E','#020B18','#E5E2D8','#D8D4C8','#8A9620'),
(4, 'Negro absoluto — Minimalista',
   '#000510','#E4F542','#FFFFFF','#020B18','#071428','#B8C82E');
```

### Plantilla P01 — 1080×1080

```sql
INSERT INTO visual_specs (name, width, height, safe_zone_px, columns, gutter,
 typography_levels, block_coordinates, naming_convention, approval_checklist)
VALUES (
 'Imagen 01 · 1:1', 1080, 1080, 80, 12, 20,
 '{"display":{"size":96,"weight":900,"font":"Montserrat"},
   "headline":{"size":80,"weight":900,"font":"Montserrat"},
   "body":{"size":18,"weight":400,"font":"Inter"},
   "ui":{"size":11,"weight":600,"font":"Inter"}}',
 '{"keyword":{"x":80,"y":700,"maxW":520},
   "headline":{"x":80,"y":620,"maxW":520},
   "subheadline":{"x":80,"y":810,"maxW":500},
   "cta":{"x":80,"y":870,"w":220},
   "photo":{"x":540,"y":0,"w":540,"h":1080},
   "brand":{"x":80,"y":48},
   "ep_badge":{"x":940,"y":40}}',
 'AMTME-S{season}-EP{episode}-P01-V{version}.png · Safe zone: 80px todos los lados'
);
```

### Imagen 02 — 1080 × 1350 px (4:5)

```sql
INSERT INTO visual_specs (name, width, height, safe_zone_px, columns, gutter,
 typography_levels, block_coordinates, naming_convention, approval_checklist)
VALUES (
 'Imagen 02 · 4:5', 1080, 1350, 80, 12, 20,
 '{"display":{"size":96,"weight":900,"font":"Montserrat"},
   "headline":{"size":80,"weight":900,"font":"Montserrat"},
   "body":{"size":18,"weight":400,"font":"Inter"},
   "ui":{"size":11,"weight":600,"font":"Inter"}}',
 '{"keyword":{"x":80,"y":880,"maxW":560},
   "headline":{"x":80,"y":780,"maxW":560},
   "subheadline":{"x":80,"y":990,"maxW":540},
   "cta":{"x":80,"y":1080,"w":260},
   "photo":{"x":540,"y":0,"w":540,"h":1350},
   "brand":{"x":80,"y":48},
   "ep_badge":{"x":940,"y":40}}',
 'AMTME-S{season}-EP{episode}-P02-V{version}.png · Safe zone: 80px todos los lados'
);
```

## 20. Variables de Entorno y Deploy

### Variables requeridas

| Variable | Entorno | Descripción |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Frontend | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Anon/publishable key de Supabase |
| `VITE_SUPABASE_PROJECT_ID` | Frontend | ID del proyecto Supabase |
| `ANTHROPIC_API_KEY` | Edge Functions | API key de Claude — requerido para Script Engine |
| `GEMINI_API_KEY` | Edge Functions | API key de Gemini — requerido para imágenes (gratuito en aistudio.google.com) |
| `OPENAI_API_KEY` | Edge Functions | Opcional — fallback imágenes DALL-E 3 |
| `GROQ_API_KEY` | Edge Functions | Opcional — texto rápido |

### Dónde configurarlas

- **Desarrollo local:** Copia `.env.example` como `.env.local` y rellena los valores reales.
  ```bash
  cp .env.example .env.local
  ```
- **Producción (Vercel):** Vercel Dashboard → Project → Settings → Environment Variables.
- **Edge Functions (Supabase):** Supabase Dashboard → Project → Settings → Edge Functions → Secrets.

### ⛔ Prohibición absoluta de commit de `.env`

**Nunca** se debe commitear un archivo `.env` con valores reales al repositorio.

- El archivo `.gitignore` ignora explícitamente `.env` y `.env.*` (excepción: `.env.example`).
- Solo existe `.env.example` en el repo, con placeholders únicamente — este sí puede commitearse.
- Si accidentalmente se commitea un `.env` real, rotar **inmediatamente** todas las credenciales expuestas.
- El checklist de release incluye un gate explícito que bloquea cualquier release si existe un `.env` real en el repo o en el paquete distribuible.

### vercel.json

```json
{
 "buildCommand": "npm run build",
 "outputDirectory": "dist",
 "framework": "vite"
}
```

## 21. Orden de Implementación

1. Schema SQL en Supabase + datos seed (paletas, brand tokens, plantillas)
2. Auth + roles Supabase + RLS policies
3. Store Zustand (episodeStore)
4. WordCounter + colorUtils + canvasRenderer (componentes base)
5. Dashboard + listado de episodios
6. Módulo Ingesta con contador en tiempo real
7. Supabase Edge Function: limpieza de texto
8. Pipeline Limpieza (Edge Function + split view)
9. Supabase Edge Function: mapa semántico
10. Pipeline Semántico (mapa + cálculo paleta + imagen sugerida)
11. Edge Functions: 10 outputs en paralelo
12. Pestañas de revisión con contadores
13. PaletteSelector — P1–P4 predefinidas + P5 libre con validación contraste
14. HostImageSelector — REF_1/REF_2 + badge sugerencia IA + toggle ninguna
15. Visual OS Editor — formulario + Canvas preview en tiempo real
16. Eliminación fondo negro fotos + sombra larga proyectada
17. Panel de validaciones (advertencias, sin bloqueos)
18. Exportación PNG/JPG con naming_convention
19. Módulo Validación pre-exportación Script Engine
20. Módulo Exportación (6 formatos + word_counts en metadata)
21. Deploy Vercel

## 22. Criterio de Éxito del MVP

El sistema está completo cuando se cumplan todos estos puntos:

- [ ] Se puede pegar un guion real y procesarlo en menos de 60 segundos
- [ ] El contador de palabras es visible desde el primer campo de ingesta
- [ ] El texto se limpia automáticamente via Edge Function y muestra split view
- [ ] El texto limpio puede aprobarse cumpliendo los rangos mínimos
- [ ] Se genera un mapa semántico estructurado con sugerencia de paleta e imagen
- [ ] Los 10 outputs se generan en paralelo con contadores por ítem
- [ ] El sistema bloquea aprobaciones cuando campos críticos están fuera de rango
- [ ] El Visual OS recibe copy automáticamente desde el mapa semántico aprobado
- [ ] El selector de paletas P1–P5 funciona con validación de contraste en tiempo real
- [ ] El override de paleta por pieza individual es operativo
- [ ] El Canvas preview muestra la pieza en tiempo real con sombra de Christian
- [ ] El fondo negro de las fotos se elimina correctamente en todas las paletas
- [ ] El subrayado aparece bajo la keyword única en cada pieza
- [ ] Las validaciones en el panel derecho son visibles sin bloqueos
- [ ] La exportación PNG/JPG usa la naming convention correcta
- [ ] Todo queda guardado en Supabase con trazabilidad por usuario y fecha
- [ ] La API key de Claude nunca está expuesta en el frontend
- [ ] La app funciona con estilo Apple: un panel, una función, mucho espacio
- [ ] El proyecto está listo para deploy en Vercel con GitHub conectado

---

**AMTME — Script Engine + Visual OS**  
**A Mí Tampoco Me Explicaron · @yosoyvillamar · Versión 1.0**