-- ============================================================
-- Seed: Knowledge Base — Contenido del AMTME Documento Consolidado
-- Created: 2026-03-18
-- Source: AMTME_Documento_Consolidado_2026-03-05.md
--
-- Inserta bloques de conocimiento operativo del podcast:
-- identidad, producción, distribución, métricas, monetización.
-- Idempotente: usa ON CONFLICT DO NOTHING sobre source_hash.
-- ============================================================

DO $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users LIMIT 1;
  IF _user_id IS NULL THEN
    RAISE NOTICE 'seed_knowledge_blocks: no user found, skipping.';
    RETURN;
  END IF;

  INSERT INTO public.knowledge_blocks (
    user_id,
    source_document,
    source_section,
    source_subsection,
    content_type,
    destination_module,
    title,
    content,
    structured_data,
    import_status,
    source_hash,
    imported_at
  )
  VALUES

  -- ── IDENTIDAD DE MARCA ──────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'I · Identidad de Marca',
    'reference',
    'insights',
    'Identidad de Marca — Declaración Canónica',
    E'AMTME no es un podcast de autoayuda. No es motivación. No es donde alguien que ya lo tiene todo resuelto te dice cómo deberías vivir.\n\nEs una conversación honesta sobre lo que nadie nos explicó: el amor, el apego, la identidad, el miedo. Desde alguien que también va buscando las respuestas — y que decidió compartirlas en voz alta.\n\n**Declaración canónica:**\nAMTME es de los pocos podcasts en español que habla directamente a hombres hispanos de 28-44 años sobre amor, apego e identidad — sin juicio, sin poses, sin el discurso de quien ya lo resolvió todo.\n\n**Datos de identidad:**\n- Nombre oficial: A Mí Tampoco Me Explicaron\n- Sigla: AMTME\n- Host: Christian Villamar (@yosoyvillamar)\n- Categoría: Autoconocimiento / Relaciones / Identidad masculina\n- Idioma: Español (México)\n- Plataforma principal: Spotify\n- Temporada activa: Temporada 1 (continua)\n- Fecha de fundación: Diciembre 2024 (Ep. 1: 18 dic 2024)\n- Episodios publicados: 28 (a febrero 2026)\n- Cadencia: 1 episodio por semana\n- Duración objetivo: 9-11 minutos\n- Audiencia principal: 90.3% masculina · 60-70% entre 28-34 años\n- Geografía principal: México, Argentina, Colombia',
    '{"nombre_oficial":"A Mí Tampoco Me Explicaron","sigla":"AMTME","host":"Christian Villamar","instagram":"@yosoyvillamar","plataforma":"Spotify","cadencia":"1 episodio/semana","duracion_objetivo":"9-11 min","audiencia":"90.3% masculina, 28-44 años","geografia":"México, Argentina, Colombia","episodios_publicados":28}'::jsonb,
    'imported',
    md5('identidad-marca-declaracion-canonica'),
    now()
  ),

  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'I · Identidad de Marca — Valores',
    'reference',
    'insights',
    'Valores de Marca AMTME',
    E'Los 6 valores que definen cómo AMTME se comporta y habla:\n\n1. **Acompañamiento** — No instruimos. No juzgamos. Estamos al lado, no por encima.\n2. **Honestidad radical** — Hablamos desde donde estamos, no desde donde quisiéramos estar.\n3. **Presencia antes que certeza** — Sentir antes de analizar. El cuerpo sabe antes que la mente.\n4. **Humildad del camino** — Nadie tiene todas las respuestas. Todos seguimos buscando.\n5. **Locura creativa** — Actuar antes de tenerlo todo resuelto. Aprender en movimiento.\n6. **La carga compartida** — Lo que cargas no es solo tuyo. Y nombrarlo ya alivia algo.',
    '{"valores":["Acompañamiento","Honestidad radical","Presencia antes que certeza","Humildad del camino","Locura creativa","La carga compartida"]}'::jsonb,
    'imported',
    md5('valores-marca-amtme'),
    now()
  ),

  -- ── MISIÓN VISIÓN PROPÓSITO ─────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'II · Misión, Visión y Propósito',
    'reference',
    'insights',
    'Misión, Visión y Propósito',
    E'**MISIÓN:**\nAcompañar a hombres de 28 a 44 años en sus procesos de autoconocimiento desde un lugar honesto y sin poses — no desde quien ya llegó, sino desde quien sigue en el camino. Cada episodio busca que el oyente se sienta menos solo con lo que siente y más claro sobre lo que le está pasando.\n\n**VISIÓN:**\nQue ningún hombre tenga que atravesar sus procesos emocionales en silencio por falta de un espacio donde se sienta acompañado sin ser juzgado. Que AMTME sea la referencia en español para hombres que quieren entenderse sin que nadie les diga cómo deberían sentirse.\n\n**PROPÓSITO:**\nCompartir las respuestas que nadie nos dio — desde la experiencia real de haberlas buscado. No como manual. No como método. Como conversación entre alguien que también va aprendiendo y otro que está atravesando lo mismo.',
    '{"mision":"Acompañar a hombres 28-44 en autoconocimiento sin poses","vision":"Referencia en español para hombres que quieren entenderse","proposito":"Compartir las respuestas que nadie nos dio"}'::jsonb,
    'imported',
    md5('mision-vision-proposito-amtme'),
    now()
  ),

  -- ── VOZ Y TONO ──────────────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'VII · Voz y Tono',
    'reference',
    'publications',
    'Guía de Voz y Tono por Canal',
    E'**SÍ DECIMOS / NUNCA DECIMOS:**\n✓ "Hablamos de..."\n✓ "¿Alguna vez sentiste...?"\n✓ "Esto no tiene una respuesta fácil."\n✓ "Yo también estoy en eso."\n✓ "Aquí no juzgamos."\n✓ "Escúchalo cuando lo necesites."\n\n✗ "En este episodio te enseño..."\n✗ "Si quieres mejorar tu vida, sigue estos pasos..."\n✗ "La solución es simple..."\n✗ "Ya lo superé y te cuento cómo."\n✗ "Lo correcto es..."\n✗ "¡Tú puedes! Solo proponte."\n\n**Tono por canal:**\n- **Episodio (audio):** Íntimo, reflexivo, primera persona. Como hablar con un amigo que también está en eso. 9-11 min.\n- **Instagram caption:** Directo. Pregunta o tensión en línea 1. CTA visible antes del "ver más". 150-220 palabras.\n- **Instagram story:** Casual, breve. Una sola pregunta o frase. Siempre con sticker de link. 1-2 líneas.\n- **DMs (tarot/consultas):** Cercano, sin poses. Nunca clínico ni distante. Respuesta en 24-48h.\n- **Colaboraciones/prensa:** Profesional pero auténtico. Sin inflar el CV, con datos reales.\n\n**Guía de Crisis y Comentarios Negativos:**\n- Agradecer sin ceder: "Gracias por compartirlo, entiendo que no conecta contigo."\n- Nunca defenderse ni argumentar en público en comentarios.\n- Si la crítica es válida, reconocerla con honestidad.\n- Si el comentario es abusivo, eliminar sin responder.\n- NUNCA: ironía, sarcasmo, respuestas desde el ego o silencio pasivo-agresivo.',
    '{"canales":{"episodio":"íntimo, reflexivo, 9-11 min","ig_caption":"directo, pregunta/tensión L1, 150-220 words","ig_story":"casual, 1-2 líneas, siempre sticker link","dms":"cercano, 24-48h","prensa":"profesional auténtico"}}'::jsonb,
    'imported',
    md5('guia-voz-tono-canales'),
    now()
  ),

  -- ── IDENTIDAD VISUAL ────────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'VIII · Identidad Visual — Paleta Barra de Navidad',
    'reference',
    'publications',
    'Paleta Visual — Barra de Navidad, Jalisco',
    E'La identidad visual nace de la arena de Barra de Navidad, Jalisco. El mar Pacífico con su turquesa suave, el navy profundo del horizonte, y el coral del atardecer como acento decorativo — nunca como texto.\n\n**Paleta oficial:**\n- `#D4B896` Arena de Barra (base) — Color base. Fondos de carruseles, stories y piezas de texto.\n- `#5BA4A0` Turquesa Suave (principal) — Títulos, frases destacadas. NUNCA sobre arena sin ajustar tamaño.\n- `#1B3A5C` Navy Profundo (texto) — Texto principal sobre fondos claros. Fondos de piezas de impacto. Máximo contraste.\n- `#D4634A` Coral Atardecer (⚠️ solo decorativo) — NUNCA como texto. Solo bordes, líneas, separadores.\n- `#F5EFE6` Espuma (fondos secundarios) — Más cálida que el blanco puro.\n- `#8B6F5E` Sombra de Arena (secundario) — Subtítulos, etiquetas, información complementaria.\n\n**REGLA DE ORO:** Texto siempre en Navy (#1B3A5C) sobre fondos claros, o en Turquesa (#5BA4A0) sobre Navy. El Coral nunca es letra.',
    '{"paleta":{"arena":"#D4B896","turquesa":"#5BA4A0","navy":"#1B3A5C","coral":"#D4634A","espuma":"#F5EFE6","sombra":"#8B6F5E"},"regla_oro":"Texto en Navy sobre claro, o Turquesa sobre Navy. Coral nunca es letra."}'::jsonb,
    'imported',
    md5('paleta-visual-barra-navidad'),
    now()
  ),

  -- ── SISTEMA VISUAL SB-01 ────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XI · Sistema Visual SB-01 — La Grieta',
    'reference',
    'publications',
    'Sistema Visual SB-01 — Paleta y Tipografía para IG',
    E'**Paleta SB-01 (Contenido Digital Instagram):**\n- `#030A0F` page — Fondo de página. Negro más profundo.\n- `#083A4F` navy — Fondo CW-01. Color de identidad principal en piezas de contenido.\n- `#A58D66` gold — Etiquetas, handles, líneas separadoras. Handle @yosoyvillamar.\n- `#407E8C` teal — Fondo CW-04. Bandas laterales del sistema.\n- `#E5E1DD` sand — Fondo CW-02. Texto principal sobre navy y teal.\n- `#E8FF40` HL — Barra de resaltado en exactamente 1 palabra del titular por pieza. NUNCA como fondo completo.\n\n**REGLA HL:** La barra #E8FF40 aplica a exactamente 1 palabra del titular por pieza. Texto en esa barra: siempre Navy #083A4F. Nunca más de una palabra por slide. Nunca como fondo completo.\n\n**Colorways del Sistema (CW):**\n- CW-01: Fondo Navy #083A4F → Slides de insight, tensión y quote firma.\n- CW-02: Fondo Sand #E5E1DD → Slides de hook/cover y evergreen.\n- CW-04: Fondo Teal #407E8C → Slides de pregunta reflexiva y CTA final.\n\n**Tipografía:** Inter 800/900 (ExtraBold/Black). Letter-spacing negativo (-1 a -1.5). Subtextos en Inter 300 a opacidad 55%. No mezclar con serif en el mismo slide.',
    '{"paleta_sb01":{"page":"#030A0F","navy":"#083A4F","gold":"#A58D66","teal":"#407E8C","sand":"#E5E1DD","hl":"#E8FF40"},"tipografia":"Inter 800/900, tracking -1 a -1.5","colorways":{"CW-01":"Navy #083A4F","CW-02":"Sand #E5E1DD","CW-04":"Teal #407E8C"}}'::jsonb,
    'imported',
    md5('sistema-visual-sb01-la-grieta'),
    now()
  ),

  -- ── BIOS OFICIALES ──────────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'IX · Bios Oficiales',
    'reference',
    'publications',
    'Bios Oficiales por Plataforma',
    E'**BIO INSTAGRAM (150 car.):**\nChristian Villamar\n🎙 A Mí Tampoco Me Explicaron — el podcast\nAmor, apego y vida adulta sin filtro\n🪞 Tarot como espejo, no como magia\n▶ Escúchame aquí ↓\n[Actualizar con link al episodio más reciente cada lunes]\n\n**BIO SPOTIFY:**\nA Mí Tampoco Me Explicaron es el podcast de Christian Villamar sobre amor, vínculos e identidad — para los que todavía van buscando las respuestas que nadie les dio. Aquí no hay expertos. Solo alguien que también sigue en el camino.\n\n**BIO CORTA (Twitter/Firmas):**\nEl podcast donde nadie juzga. Solo acompañamos. 🎙\n\n**PRESENTACIÓN ORAL (Colaboraciones/Prensa):**\nSoy Christian Villamar, conductor de A Mí Tampoco Me Explicaron, un podcast de autoconocimiento y vínculos dirigido a hombres que todavía están en proceso de entenderse. No hablo desde el lugar de quien ya llegó. Hablo desde el camino — porque es desde ahí de donde viene lo más honesto. 28 episodios, audiencia 90% masculina en México, Argentina y Colombia.\n\n**DESCRIPCIÓN LARGA (Directorios):**\nA Mí Tampoco Me Explicaron es el espacio donde nadie tiene todas las respuestas, pero al menos nos hacemos las preguntas honestas. Soy Christian Villamar — vengo de un pueblo, crecí con mis abuelos, y me pasé años cargando preguntas que nadie se sentó a responder. Sobre el amor. Sobre el apego. Sobre quién se supone que deberíamos ser cuando nadie nos enseñó cómo. En este podcast también uso el tarot — no como predicción, sino como espejo. Aquí no juzgamos. Acompañamos.',
    '{"plataformas":["Instagram","Spotify","Twitter/Firmas","Presentación Oral","Directorios"]}'::jsonb,
    'imported',
    md5('bios-oficiales-plataformas'),
    now()
  ),

  -- ── SISTEMA CONTENIDO IG ────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XII · Sistema de Contenido Instagram',
    'sop',
    'publications',
    'SOP: Carrusel de Autor — Estructura 6 Láminas',
    E'**Estructura del carrusel (formato 1080×1350):**\n\n| Slide | Función | Colorway | Contenido |\n|-------|---------|----------|-----------|\n| 01 | Hook / Cover | CW-02 (Sand) | Título oficial como pregunta. Barra HL en el verbo de dolor. |\n| 02 | Tensión | CW-01 (Navy) | El lector se ve reflejado. Barra HL en la palabra que más duele reconocer. |\n| 03 | Insight | CW-01 (Navy) | La distinción clave del episodio. Vocabulario nuevo de marca. |\n| 04 | Giro | CW-04 (Teal) | Reencuadre. La frase que cambia todo. Barra HL en el giro conceptual. |\n| 05 | Pregunta reflexiva | CW-04 (Teal) | La pregunta que el episodio ayuda a responder. Máximo índice de guardado. |\n| 06 | CTA final | CW-04 (Teal) | Botón HL → Spotify. Handle @yosoyvillamar. Link en bio. |\n\n**Plantillas SVG:**\n- T2_CARRUSEL_S1_COVER.svg — CW-02 Sand, Slide 1 Cover/Hook\n- T3_CARRUSEL_S2-4_CONTENIDO.svg — CW-01 Navy, Slides 2-4 (clonar y cambiar texto)\n- T4_CARRUSEL_S5_INSIGHT.svg — CW-04 Teal, Slide 5 Pregunta reflexiva\n- T5_CARRUSEL_S6_CTA.svg — CW-04 Teal, Slide 6 CTA final\n\n**Flujo Canva (3 pasos):**\n1. Canva → Crear diseño → tamaño correcto → Subir SVG\n2. Arrastrar SVG al lienzo al 100%. Con Pro: doble clic → editar texto. Sin Pro: cuadro de texto encima con Inter 800/900.\n3. Guardar como plantilla: AMTME · [Tipo] · SB-01 · Base. Duplicar por episodio. Exportar PNG 1x.\n\n**Checklist QA antes de publicar:**\n☐ Número de episodio correcto\n☐ Barra HL en 1 sola palabra\n☐ @yosoyvillamar visible en footer\n☐ Link Spotify en CTA actualizado\n☐ Frase extraída del catálogo (no inventada)\n☐ 6 slides completos\n☐ Colorways correctos por slide',
    '{"slides":6,"formato":"1080x1350","colorways":["CW-02","CW-01","CW-01","CW-04","CW-04","CW-04"],"plantillas":["T2","T3","T4","T5"]}'::jsonb,
    'imported',
    md5('sop-carrusel-autor-6-laminas'),
    now()
  ),

  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XII · Sistema de Contenido Instagram — Calendario',
    'sop',
    'publications',
    'SOP: Calendario de Publicación Semanal (7 días)',
    E'**Secuencia semanal de publicación:**\n\n| Día | Tema | Horario (MX) | Piezas |\n|-----|------|-------------|--------|\n| **Domingo** | Publicación Spotify | 12:00-13:00 | Episodio sube a Spotify. Actualizar link en bio inmediatamente. |\n| **Lunes** | Lanzamiento | 19:00-20:00 | Reel portada (CW-01) + Story "Nuevo episodio" con link activo |\n| **Martes** | Quote de tensión | 12:00-13:00 | Post frase estática (T1) + Story "¿Te identificas?" |\n| **Miércoles** | Carrusel de autor | 18:00-19:00 | Carrusel 6 láminas completo (T2–T5) |\n| **Jueves** | Micro-contenido insight | 20:00-21:00 | Quote conceptual (CW-04) + Story distinción en 2 líneas |\n| **Viernes** | Repesca + engagement | 18:30-19:30 | Reel variación CW-02. Mismo ep., ángulo distinto. Cerrar modelo de datos. |\n| **Sábado** | Evergreen | 10:00-11:00 | Repostar quote de ep. anterior (T7) + Story casual |\n\n**Reglas operativas:**\n- El episodio debe estar editado y exportado desde el jueves previo.\n- El Reel debe estar producido antes del domingo.\n- Modelo de datos semanal cerrado antes de las 21:00 del viernes.\n- No publicar el mismo hook dos semanas seguidas.',
    '{"dias":["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],"horarios":{"domingo":"12:00","lunes":"19:00","martes":"12:00","miercoles":"18:00","jueves":"20:00","viernes":"18:30","sabado":"10:00"}}'::jsonb,
    'imported',
    md5('sop-calendario-publicacion-semanal'),
    now()
  ),

  -- ── HOOKS PARA REELS ────────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XII.4 · Banco de Hooks para Reels',
    'reference',
    'publications',
    'Banco de 15 Hooks Validados para Reels',
    E'Hooks para los primeros 0-3 segundos del Reel. Rotar — nunca publicar el mismo hook dos semanas seguidas. Los hooks 01, 03 y 04 (Ep. 7, 25, 26) tienen la mayor probabilidad de conversión orgánica.\n\n| # | Hook | Palabra HL | Episodio fuente |\n|---|------|-----------|----------------|\n| 01 | Hay personas que no te quieren. Solo no quieren perderte. | **perderte** | Ep. 7 |\n| 02 | Hay algo que llamas amor. En realidad es miedo. | **miedo** | Ep. 4 (144 streams) |\n| 03 | El rechazo no es un veredicto sobre tu valor. | **veredicto** | Ep. 25 (126 streams) |\n| 04 | Nadie te explicó que un corazón roto tiene nombre clínico. | **nombre** | Ep. 26 (127 streams) |\n| 05 | ¿Y si el problema no era la otra persona? | **problema** | Ep. 17 |\n| 06 | Llevas años siendo útil. Pero útil no es lo mismo que amado. | **amado** | Ep. 20 |\n| 07 | Tu cuerpo lo sabe antes que tu mente. | **cuerpo** | Ep. 16 |\n| 08 | ¿Cuántas versiones de ti mismo creaste para que alguien te quisiera? | **versiones** | Ep. 2 |\n| 09 | La pasión y la dependencia se sienten igual. No son lo mismo. | **dependencia** | Ep. 9 |\n| 10 | Sigues cargando algo que ya terminó. | **cargando** | Ep. 11 |\n| 11 | Hay personas que ya se fueron sin decírtelo. | **sin decírtelo** | Ep. 19 |\n| 12 | Te exiges tanto que ya olvidaste que puedes equivocarte. | **equivocarte** | Ep. 22 |\n| 13 | El hartazgo funciona distinto a la motivación. Y es más honesto. | **honesto** | Ep. 3 |\n| 14 | A veces no sabes si lo amas o si solo te aterra el vacío. | **vacío** | Ep. 8 |\n| 15 | No necesitas su permiso para cerrar. | **permiso** | Ep. 19 |',
    '{"total_hooks":15,"prioridad_alta":[1,3,4],"regla":"Rotar hooks, nunca repetir en semanas consecutivas"}'::jsonb,
    'imported',
    md5('banco-15-hooks-reels-validados'),
    now()
  ),

  -- ── FLUJO DE PRODUCCIÓN ─────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XIV · Flujo de Producción — Audacity',
    'sop',
    'episodes',
    'SOP: Pipeline Completo — Idea → Publicación',
    E'**Herramientas:** Audacity (grabación/edición) · Spotify for Creators (distribución) · Canva (assets)\n\n| Fase | Paso | Acción | Tiempo est. |\n|------|------|--------|-------------|\n| PRE | 1. Idea | Elige el tema. Valida contra catálogo (evita superposición con Ep. 4 o 8). Anota la pregunta central. | 15 min |\n| PRE | 2. Estructura | Aplica los 8 bloques del episodio. Escribe puntos clave por bloque, no guión completo. | 20-30 min |\n| PRE | 3. Título | Define (1) Título público = pregunta limpia, sin "Ep. N" al inicio, máx. 60 caracteres. (2) Etiqueta interna = "Ep. 29" para assets, Canva, nombre de archivo, CTAs. | 5 min |\n| GRABACIÓN | 4. Setup | Audacity abierto. Sample rate: 44100 Hz. Mono. Micrófono a 15-20 cm. Grabación de prueba 10 seg. | 5 min |\n| GRABACIÓN | 5. Grabar | Una sola toma (o 2-3 si hay error grave). No parar por muletillas — se editan. Hablar como si fuera un solo oyente frente a ti. | 15-20 min |\n| EDICIÓN | 6. Editar | Silenciar respiraciones largas (Effect > Silence Audio). Eliminar errores. Normalizar: Effect > Normalize → -1 dB. Reducir ruido si hay fondo. | 20-30 min |\n| EDICIÓN | 7. Exportar | File > Export > MP3. Bitrate: 128 kbps. Nombre: AMTME_EP##_[slug-titulo].mp3 | 2 min |\n| DISTRIBUCIÓN | 8. Spotify | Subir MP3. Pegar descripción optimizada (200-250 palabras). Pegar título optimizado. Agregar portada. Programar: domingo 12:00-13:00 MX. | 15 min |\n| LANZAMIENTO | 9. Assets | Producir en Canva: Reel (T6/T7), Carrusel 6 slides (T2-T5), Story (T6). Actualizar link en bio. | 30-45 min |\n| LANZAMIENTO | 10. IG | Seguir calendario semanal. Lunes: Reel. Martes: Quote. Miércoles: Carrusel. Jueves: Insight. Viernes: Repesca. | Distribuido en semana |\n\n**Tiempo mínimo grabación → publicación:** 3 días hábiles.\n**Release Protocol:** El episodio debe estar editado y exportado desde el jueves previo.',
    '{"fases":["PRE","GRABACIÓN","EDICIÓN","DISTRIBUCIÓN","LANZAMIENTO"],"herramientas":["Audacity","Spotify for Creators","Canva","Instagram"],"tiempo_minimo_dias":3}'::jsonb,
    'imported',
    md5('sop-pipeline-completo-idea-publicacion'),
    now()
  ),

  -- ── ESTRUCTURA DEL EPISODIO ─────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XIV · Estructura del episodio — 8 Bloques',
    'sop',
    'episodes',
    'SOP: Estructura del Episodio — 8 Bloques',
    E'**Estructura estándar para cada episodio (9-11 min):**\n\n| Bloque | Nombre | Función | Tiempo |\n|--------|--------|---------|--------|\n| 1 | **Gancho** | Pregunta directa al oyente que conecta con el dolor del episodio. Sin presentación larga. Primeras 15-20 segundos. | 0:00-0:20 |\n| 2 | **Contexto personal** | Christian sitúa el tema desde su propia experiencia, no desde el experto. | 0:20-1:30 |\n| 3 | **La distinción** | El concepto central del episodio explicado de forma simple. La diferencia que pocos nombran. | 1:30-3:30 |\n| 4 | **El espejo** | Preguntas que invitan al oyente a verse en lo que se está diciendo. | 3:30-5:00 |\n| 5 | **El giro** | La reencuadración. Lo que cambia cuando ves la situación desde este nuevo ángulo. | 5:00-7:00 |\n| 6 | **Lo concreto** | Una acción, una pregunta, o una observación que el oyente puede llevar a su semana. | 7:00-8:30 |\n| 7 | **Cierre desde el camino** | Christian cierra desde el lugar de quien también sigue aprendiendo. Sin conclusiones grandiosas. | 8:30-9:30 |\n| 8 | **CTA** | Breve y directo: "Si conectó contigo, compártelo. Y si quieres una lectura de tarot como espejo, escríbeme por DM." Sin música larga ni jingle. | 9:30-10:00 |',
    '{"bloques":8,"duracion_objetivo":"9-11 min","estructura":["Gancho","Contexto personal","La distinción","El espejo","El giro","Lo concreto","Cierre desde el camino","CTA"]}'::jsonb,
    'imported',
    md5('sop-estructura-episodio-8-bloques'),
    now()
  ),

  -- ── SPECS DE AUDIO ──────────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XIV · Specs técnicas de audio',
    'reference',
    'audio',
    'Specs Técnicas de Audio — Audacity',
    E'**Parámetros requeridos para exportación:**\n\n| Parámetro | Valor | Por qué |\n|-----------|-------|--------|\n| Sample rate | 44100 Hz | Estándar para distribución en Spotify. No usar 48000 Hz (para video). |\n| Canales | Mono | El podcast es voz sola. Stereo no añade valor y duplica el peso. |\n| Bitrate exportación | 128 kbps MP3 | Suficiente para voz. Reduce tamaño sin pérdida perceptible. |\n| Normalización | -1 dB (pico) | Evita clipping. Spotify normaliza a -14 LUFS pero partir de -1 dB da margen. |\n| Formato final | MP3 | Compatible con todos los distribuidores. |\n| Naming convention | AMTME_EP##_[slug].mp3 | Ejemplo: AMTME_EP29_elegirte-sin-culpa.mp3 |',
    '{"sample_rate":44100,"canales":"mono","bitrate":"128kbps","normalizacion":"-1dB","formato":"MP3","naming":"AMTME_EP##_[slug].mp3"}'::jsonb,
    'imported',
    md5('specs-tecnicas-audio-audacity'),
    now()
  ),

  -- ── KPIs ────────────────────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XV · Métricas y KPIs',
    'reference',
    'metrics',
    'KPIs Primarios y Secundarios — Seguimiento Semanal',
    E'**KPIs Primarios (seguimiento semanal):**\n\n| KPI | Descripción | Frecuencia | Fuente |\n|-----|-------------|------------|--------|\n| Streams totales | Plays del episodio de la semana. Meta: superar media del período anterior. | Semanal (viernes) | Spotify for Creators |\n| Retención Q1 (0-25%) | % que escucha el primer cuarto. Meta: >80% si el gancho funciona. | Por episodio | Spotify for Creators |\n| Retención Q4 (75-100%) | % que escucha hasta el final. Meta: >30%. Si <20%, revisar estructura. | Por episodio | Spotify for Creators |\n| Seguidores Spotify | Seguidores del podcast. Delta semana a semana. | Semanal | Spotify for Creators |\n| Alcance IG (Reel) | Reproducciones del Reel del lunes. Meta: 3x streams del ep. | Por publicación | Instagram Insights |\n| Guardados IG | Posts guardados / alcance total. Meta: >3%. Alta guardabilidad = evergreen. | Semanal | Instagram Insights |\n\n**KPIs Secundarios:**\n- Conversión IG → Spotify: mejora progresiva\n- Ingresos tarot (DM): lecturas × precio ($200-500 MXN)\n- Ingresos Spotify Partner: activar (ver Sección XVI)\n- Tasa de completado: % oyentes que escuchan >6 min. Meta: >45%\n\n**Niveles de Performance por Episodio:**\n- **A — Alto impacto:** 100+ streams → Republicar como Reel en semana 3. Considerar para colaboraciones.\n- **B — Rendimiento normal:** 60-99 streams → Seguir calendario estándar.\n- **C — Bajo rendimiento:** <60 streams → Revisar título y gancho. No borrar — puede crecer orgánico.',
    '{"kpis_primarios":["streams","retencion_q1","retencion_q4","seguidores_spotify","alcance_ig","guardados_ig"],"metas":{"retencion_q1":">80%","retencion_q4":">30%","alcance_ig_reel":"3x streams","guardados":">3%","completado":">45%"},"niveles":{"A":"100+ streams","B":"60-99 streams","C":"<60 streams"}}'::jsonb,
    'imported',
    md5('kpis-primarios-secundarios-semanal'),
    now()
  ),

  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XV · Modelo de Datos Semanal',
    'sop',
    'metrics',
    'SOP: Modelo de Datos — Registro Semanal (completar cada viernes)',
    E'**Completar cada viernes antes de las 21:00 MX:**\n\n| Columna | Tipo | Ejemplo | Fuente |\n|---------|------|---------|--------|\n| Semana | Fecha (lunes) | 2026-03-02 | Manual |\n| Ep_numero | Entero | 29 | Spotify for Creators |\n| Ep_titulo | Texto | ¿Cuánto tiempo llevas esperando? | Spotify for Creators |\n| Streams_acum | Entero | 47 | Spotify for Creators |\n| Delta_streams | Entero (+/-) | +22 | Cálculo: semana actual - anterior |\n| Retencion_Q1 | Porcentaje | 78% | Spotify for Creators > Retención |\n| Retencion_Q4 | Porcentaje | 31% | Spotify for Creators > Retención |\n| Seguidores_Spotify | Entero | 214 | Spotify for Creators |\n| Delta_seguidores | Entero (+/-) | +6 | Cálculo: semana actual - anterior |\n| Reel_reproducciones | Entero | 1840 | Instagram Insights |\n| Post_guardados_max | Entero | 23 | Instagram Insights |\n| Lecturas_tarot_qty | Entero | 3 | Registro propio (DMs) |\n| Lecturas_tarot_MXN | Entero | 1050 | Registro propio (qty × precio) |\n| Ajuste_siguiente | Texto breve | Probar gancho diferente en Reel | Propio |\n\n**Reglas:**\n1. Completar cada viernes antes de las 21:00 MX.\n2. Delta = valor actual menos valor de la semana anterior.\n3. Si Retención Q4 < 20% dos semanas seguidas: revisar estructura del episodio (Bloques 7 y 8).\n4. Si Reel_reproducciones < 3x Streams_acum: revisar hook visual del lunes.',
    '{"frecuencia":"Viernes antes 21:00 MX","columnas":14,"alertas":{"retencion_q4_bajo":"<20% dos semanas seguidas → revisar estructura","reel_bajo":"<3x streams → revisar hook visual"}}'::jsonb,
    'imported',
    md5('sop-modelo-datos-registro-semanal'),
    now()
  ),

  -- ── MONETIZACIÓN ────────────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XVI · Monetización',
    'reference',
    'insights',
    'Roadmap de Monetización — 6 Meses',
    E'**Estado actual de ingresos:**\n- ✅ Lecturas de tarot (DM): ACTIVO — $200-500 MXN por lectura\n- ⏳ Spotify Partner Program: PENDIENTE DE ACTIVAR ($0 → activar inmediatamente)\n- ❌ Talleres/workshops: No existe ($0 — próxima fase)\n- ❌ Patreon/membresía: No existe ($0 — fase posterior)\n- ❌ Colaboraciones de marca: No existe ($0 — cuando audiencia alcance 500+ seguidores Spotify)\n\n**PRIORIDAD 1 — Spotify Partner Program (activar hoy, 20-30 min):**\n1. Abrir creators.spotify.com en desktop\n2. Ir a sección "Monetización" o "Partner Program"\n3. Completar datos fiscales + cuenta bancaria/PayPal\n4. Aceptar términos → esperar confirmación 3-7 días hábiles\nNota: con 1,000-2,000 streams/mes puede generar $5-20 USD/mes.\n\n**PRIORIDAD 2 — Escalar tarot:**\n- Mencionar lecturas en CTA de TODOS los episodios (Bloque 8)\n- Crear post fijo en IG explicando qué es una lectura, precio y cómo pedir\n- Pedir testimonios a 2-3 personas para republicar\n- Precio fijo sugerido: $350 MXN. Límite: máx. 5-8 lecturas/semana\n\n**Roadmap 6 meses:**\n| Mes | Acción | Ingreso esperado |\n|-----|--------|------------------|\n| Mes 1 (feb-mar 2026) | Activar Spotify Partner. Post fijo tarot. Tarot en todos los CTAs. | $200-800 MXN/mes (tarot) + Partner |\n| Mes 2-3 (abr-may 2026) | Taller online: "Amor, apego y los patrones que no elegiste". 90 min, Zoom, $350-500 MXN, 10-15 personas. | $3,500-7,500 MXN por evento |\n| Mes 4-5 (jun-jul 2026) | Segunda edición taller + Patreon básico ($75 MXN/mes): acceso anticipado + 1 pregunta/mes. | $750-2,000 MXN/mes Patreon |\n| Mes 6+ (ago 2026+) | Colaboraciones de marca alineadas (libros, apps meditación, terapia online). Min. $3,000 MXN/$150 USD por mención. | Variable |\n\n**Criterios colaboraciones de marca:**\n✓ Acepto si: cuida salud mental, permite hablar desde experiencia real, no contradice valores AMTME, no compromete libertad editorial.\n✗ Rechazo si: solución rápida al dolor, fingir que uso algo que no uso, cultura de éxito forzado/positividad tóxica/masculinidad performativa, control sobre contenido.',
    '{"fuentes_activas":["tarot_dm"],"fuentes_pendientes":["spotify_partner"],"roadmap_meses":6,"precio_tarot_sugerido":350,"precio_min_colaboracion_mxn":3000}'::jsonb,
    'imported',
    md5('roadmap-monetizacion-6-meses'),
    now()
  ),

  -- ── POSICIONAMIENTO COMPETITIVO ─────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XVII · Posicionamiento Competitivo — vs Entiende Tu Mente',
    'insight',
    'insights',
    'Posicionamiento Competitivo — El Nicho Vacío que AMTME Ocupa',
    E'**AMTME vs Entiende Tu Mente:**\n\n| Dimensión | Entiende Tu Mente | AMTME |\n|-----------|------------------|-------|\n| Formato | Conversacional, múltiples voces, entrevistas + reflexión | Solo Christian. Una voz. Sin entrevistas. |\n| Tono | Divulgativo, psicología accesible, ligeramente académico | Íntimo, confesional, desde el camino (no desde la ciencia) |\n| Audiencia | Amplia, mixta, 18-45+ | 90% masculina, 28-44. Muy específico. |\n| Autoridad | Psicólogos y expertos. Credencial académica. | Experiencia vivida. Sin credencial. La honestidad es la autoridad. |\n| Propuesta de valor | "Te explicamos cómo funciona tu mente." | "Nadie te explicó esto — y yo tampoco lo tengo resuelto, pero lo estamos buscando juntos." |\n| Duración | 30-60 minutos | 9-11 minutos (alta densidad) |\n| Elementos únicos | Alta producción, base científica, comunidad grande | Tarot como herramienta de introspección. Formato masculino en español. Tono sin poses. |\n\n**La diferencia que importa:** Entiende Tu Mente habla desde el conocimiento. AMTME habla desde la experiencia. Son complementarios, no competidores.\n\n**El nicho vacío que AMTME ocupa:**\n- Podcast en español sobre apego/amor/identidad masculina sin poses → No existe con audiencia establecida.\n- Audiencia 90%+ masculina en autoconocimiento → Extremadamente raro en español.\n- Tono de "alguien que también está en eso" (no experto) → Diferenciador único en el espacio.\n- Episodios cortos (9-11 min) en el espacio emocional → La mayoría dura 30-60 min. AMTME respeta el tiempo del oyente.',
    '{"competidor_referente":"Entiende Tu Mente","diferenciadores":["tono íntimo vs académico","solo Christian vs múltiples voces","90% masculina vs audiencia mixta","9-11 min vs 30-60 min","experiencia vivida vs credencial académica"]}'::jsonb,
    'imported',
    md5('posicionamiento-competitivo-nicho-vacio'),
    now()
  ),

  -- ── REGLAS OPERATIVAS OS ────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 1 — AMTME OS 1.0',
    'Reglas Operativas',
    'sop',
    'knowledge',
    'Reglas Operativas del AMTME OS',
    E'**Principio rector:** Si hay duda de dónde va algo: va a 00_INBOX. Se clasifica el lunes. Los MASTER docs son la única fuente de verdad. Nunca borrar: archivar.\n\n**Estructura de carpetas definitiva (desde Downloads):**\n```\nDownloads/\n  00_INBOX/          ← Nuevos sin clasificar. Vaciar cada lunes.\n  01_AMTME/          ← TODO el podcast. 8 subcarpetas.\n  |  01_Episodios/   Guiones, ideas, scripts, CSVs\n  |  02_Produccion/  Audio, GarageBand, PKFs\n  |  03_Arte_y_Diseno/ Covers, identidad visual, Midjourney\n  |  04_Distribucion/ Posts IG, copies, material redes\n  |  05_Metricas/    CSVs Spotify, stats, reportes\n  |  06_Automations/ Prompts, Zapier, Notion, código\n  |  07_Master_Docs/ MASTER docs, INDEX, logs\n  |  99_Archivo/     Versiones antiguas (no tocar)\n  02_Media/          ← Solo media (imágenes, videos, audio)\n  03_Proyectos/      ← Proyectos fuera de AMTME\n  98_Referencias/    ← Tipografías, HTMLs, JSONs, recursos\n  99_Archivo_Global/ ← Exports Notion, ZIPs, duplicados\n```\n\n**Naming convention:**\n| Tipo | Destino | Ejemplo |\n|------|---------|--------|\n| .md guion | 01_Episodios/ | AMTME - EP028 - Autosabotaje - Guion - v1.md |\n| .mp3 final | 02_Produccion/ | AMTME - EP028 - Autosabotaje - FINAL.mp3 |\n| cover .jpg | 03_Arte_y_Diseno/ | AMTME - EP028 - Cover - v1.jpg |\n| copy IG | 04_Distribucion/ | AMTME - EP028 - Copy - IG - v1.txt |\n| .csv métricas | 05_Metricas/ | AMTME - Metrics - Spotify - 2026-02 - v1.csv |\n| prompt .md | 06_Automations/ | AMTME - Prompt - GenerarHook - v1.md |',
    '{"principio_rector":"Si hay duda, va a 00_INBOX","regla_critica":"Nunca borrar: archivar","carpetas_principales":["00_INBOX","01_AMTME","02_Media","03_Proyectos","98_Referencias","99_Archivo_Global"]}'::jsonb,
    'imported',
    md5('reglas-operativas-amtme-os'),
    now()
  ),

  -- ── CATÁLOGO EPISODIOS ──────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'X · Catálogo Completo — 28 Episodios',
    'reference',
    'episodes',
    'Catálogo Completo — 28 Episodios con Performance',
    E'**Episodios de mayor performance (Nivel A — 100+ streams):**\n- Ep. 1 (215 streams) — ¿Estás buscando respuestas que nadie se tomó el tiempo de darte?\n- Ep. 4 (144 streams) — ¿Sabes si lo que sientes es amor o no puedes soltarlo?\n- Ep. 3 (113 streams) — ¿Ya te cansaste de no ser tú?\n- Ep. 26 (127 streams) — ¿Sabes lo que nadie te explicó sobre el corazón roto?\n- Ep. 25 (126 streams) — ¿Todavía te duele que no te eligieron?\n- Ep. 2 (102 streams) — ¿Sigues actuando para ser elegido?\n- Ep. 7 (121 streams) — ¿Te quiere o solo no quiere perderte?\n\n**Nota:** Ep. 26 y Ep. 25 ("corazón roto" y "rechazo") conectan fuerte con oyentes nuevos y son los mejores candidatos para Reels virales. Ep. 1 sigue siendo el mejor punto de entrada para recomendar el podcast.\n\n**Performance total catálogo:**\n- Nivel A (100+ streams): 7 episodios\n- Nivel B (60-99 streams): 2 episodios (Ep. 5, Ep. 27)\n- Nivel C (<60 streams): 19 episodios\n\n**Contenido completo por episodio** (descripciones Spotify, captions IG, carruseles, stories, frases evergreen) disponible en: 25_DE_FEB.docx',
    '{"total_episodios":28,"nivel_a":7,"nivel_b":2,"nivel_c":19,"mejor_punto_entrada":"Ep. 1 (215 streams)","mejores_virales":["Ep. 26","Ep. 25"]}'::jsonb,
    'imported',
    md5('catalogo-completo-28-episodios-performance'),
    now()
  ),

  -- ── HISTORIA DE ORIGEN ──────────────────────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'III-IV · Historia de Origen y Christian Villamar',
    'reference',
    'insights',
    'Historia de Origen — Por qué existe AMTME',
    E'**El momento en que AMTME decidió existir:**\n\nDurante casi un año, Christian Villamar estuvo cargando una pregunta que no encontraba respuesta en ningún lado. Había empezado a darse cuenta de sus propios procesos — el apego, los vínculos que se repetían, el miedo a quedarse solo con uno mismo — y buscó espacios donde alguien hablara de eso con honestidad, sin poses.\n\nNo los encontró. No en español. No para hombres. No desde el lugar donde él estaba parado.\n\nEntonces decidió ser él ese espacio. En diciembre de 2024 publicó el primer episodio. Sin certezas de que funcionaría. Sin red. Haciendo lo que siempre ha hecho: moverse antes de tenerlo todo resuelto.\n\n"No encontré las conversaciones que necesitaba. Así que las empecé yo." — Christian\n\n**Quién hay detrás de la voz:**\n\n| Dimensión | Descripción |\n|-----------|-------------|\n| El loco del pueblo | En casa lo llamaban loco. No porque hiciera cosas irresponsables — sino porque actuaba antes de pensarlo todo. |\n| Raíces humildes | Viene de un pueblo. Familia humilde. Se crió con sus abuelos. No creció con mapas para navegar la vida adulta. |\n| La zona de descarga | Desde siempre ha sido el espacio donde otros descargan. Carga lo suyo, lo de su familia, y lo de todos los que han estado cerca. |\n| El buscador | Ha vivido buscando. Encontrando tinos y desatinos. AMTME es, en parte, la historia de ese camino. |\n\n**El rol del Tarot:**\n"El tarot es tu energía plasmada en un papel. Clarifica lo que tu cuerpo ya sabe. Es una herramienta para empezar a sentir — no solo a pensar." — Christian Villamar\n- LO QUE ES: Una herramienta de introspección. Un espejo de lo que ya sabes pero todavía no te has dicho en voz alta.\n- LO QUE NO ES: No es predicción. No es magia. No es superstición. No es para saber qué va a pasar — sino para entender qué está pasando adentro ahora.',
    '{"fundacion":"Diciembre 2024","primer_episodio":"18 dic 2024","fundador":"Christian Villamar","instagram":"@yosoyvillamar","motivacion":"No encontró espacios en español para hombres hablando de apego/amor sin poses"}'::jsonb,
    'imported',
    md5('historia-origen-christian-villamar'),
    now()
  ),

  -- ── SISTEMA DE CONVERSIÓN IG → SPOTIFY ──────────────────────
  (
    _user_id,
    'AMTME_Documento_Consolidado_2026-03-05',
    'SECCIÓN 2 — AMTME MAESTRO CONSOLIDADO',
    'XII.3 · Sistema de Conversión IG → Spotify',
    'sop',
    'publications',
    'SOP: Sistema de Conversión IG → Spotify (embudo AIDA)',
    E'**Las 4 etapas del embudo de conversión:**\n\n| Etapa | Nombre | Mecanismo |\n|-------|--------|----------|\n| 01 | **Awareness** | Hook tipográfico con barra HL detiene el scroll. Siempre preguntas con la palabra de dolor reconocible. |\n| 02 | **Interés** | Subtítulo hace la promesa de contenido. No describe el episodio: describe el beneficio emocional. Máx. 15 palabras. |\n| 03 | **Deseo** | Caption = continuación de la narrativa. L1: la pregunta. L2: por qué importa. L3-4: el insight. CTA: "Link en bio ↗". |\n| 04 | **Acción** | La pieza visual nombra la plataforma ("Spotify →"). La Story siempre con sticker de link nativo de IG. |\n\n**Regla del caption:**\n- Línea 1: La pregunta del episodio (el gancho que detiene el scroll)\n- Línea 2: Por qué importa ahora\n- Líneas 3-4: El insight central\n- CTA: "Link en bio ↗" — siempre presente, siempre antes del "ver más"',
    '{"modelo":"AIDA","etapas":["Awareness","Interés","Deseo","Acción"],"canal_origen":"Instagram","canal_destino":"Spotify"}'::jsonb,
    'imported',
    md5('sop-sistema-conversion-ig-spotify'),
    now()
  )

  ON CONFLICT (user_id, source_hash)
  WHERE source_hash IS NOT NULL
  DO NOTHING;

  RAISE NOTICE 'seed_knowledge_blocks: completado para user %', _user_id;
END;
$$;
