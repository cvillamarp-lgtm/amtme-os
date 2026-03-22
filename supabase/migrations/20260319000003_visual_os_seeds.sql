-- ─────────────────────────────────────────────────────────────────────────────
-- AMTME Visual OS — Seeds
-- Brand tokens + 15 visual template definitions + copy block rules
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Brand tokens ─────────────────────────────────────────────────────────────
INSERT INTO public.brand_tokens (token_type, token_name, token_value, label) VALUES
  ('color',      'ink',              '#282828',   'INK — Negro editorial'),
  ('color',      'paper',            '#F9F6EF',   'PAPER — Fondo crema'),
  ('color',      'cobalt',           '#193497',   'COBALT — Azul primario'),
  ('color',      'highlighter_green','#EAFF00',   'HIGHLIGHTER GREEN — Microacento'),
  ('color',      'prohibited_1',     '#1400FF',   'PROHIBIDO — Cobalt antiguo'),
  ('color',      'prohibited_2',     '#000000',   'PROHIBIDO como dominante — Negro puro'),
  ('color',      'prohibited_3',     '#FFFFFF',   'PROHIBIDO como dominante — Blanco puro'),
  ('typography', 'font_primary',     'Inter',     'Fuente principal'),
  ('typography', 'weight_headline',  '900',       'Black — Titulares'),
  ('typography', 'weight_support',   '700',       'Bold — Soporte'),
  ('typography', 'weight_body',      '400',       'Regular — Cuerpo'),
  ('rule',       'max_hierarchy',    '3',         'Máximo 3 niveles jerárquicos por pieza'),
  ('rule',       'max_type_styles',  '2',         'Máximo 2 estilos tipográficos por pieza'),
  ('rule',       'green_max',        '1',         'Verde máximo 1 elemento por pieza'),
  ('rule',       'prohibit_italic',  'true',      'Cursivas prohibidas'),
  ('rule',       'prohibit_serif',   'true',      'Serif prohibido'),
  ('rule',       'one_piece_only',   'true',      'Una sola pieza final. Sin variantes.')
ON CONFLICT (token_type, token_name) DO NOTHING;

-- ─── host_assets ──────────────────────────────────────────────────────────────
INSERT INTO public.host_assets (label, asset_url, asset_type, is_primary) VALUES
  ('Christian Villamar — Principal',  'host-imagen01.png', 'photo', true),
  ('Christian Villamar — Alternativa','host-imagen02.png', 'photo', false)
ON CONFLICT DO NOTHING;

-- ─── visual_templates (15 piezas) ────────────────────────────────────────────
INSERT INTO public.visual_templates
  (piece_code, piece_name, width_px, height_px, format,
   safe_zone_top, safe_zone_right, safe_zone_bottom, safe_zone_left,
   production_order, background_color, composition_notes)
VALUES
  ('P01','Portada Episodio — Feed 1:1',
   1080,1080,'1:1', 80,80,80,80, 1,'#193497',
   'Jerarquía 1 frase principal · Jerarquía 2 host centrado · Jerarquía 3 EP/marca · Espacio negativo generoso · Verde solo como microacento en EP o etiqueta · Legible en miniatura'),

  ('P02','Lanzamiento Principal — Feed 4:5',
   1080,1350,'4:5', 90,72,90,72, 2,'#193497',
   'Jerarquía 1 titular dominante · Jerarquía 2 host fuerte sin competir · Jerarquía 3 señal de lanzamiento · Jerarquía 4 EP/Instagram · Verde solo en NUEVO EPISODIO'),

  ('P03','Reel Cover — 9:16',
   1080,1920,'9:16', 250,90,250,90, 3,'#193497',
   'Encuadre editorial vertical · Titular legible en crop 4:5 · Jerarquía 1 titular · Jerarquía 2 host · Jerarquía 3 EP/marca · Evitar texto largo · Lectura instantánea'),

  ('P04','Story de Lanzamiento — 9:16',
   1080,1920,'9:16', 250,90,250,90, 4,'#193497',
   'Jerarquía 1 titular · Jerarquía 2 CTA · Jerarquía 3 host · Jerarquía 4 EP/usuario · Verde solo en CTA o NUEVO EPISODIO · Mucho espacio negativo'),

  ('P05','Story Quote — 9:16',
   1080,1920,'9:16', 250,90,250,90, 5,'#282828',
   'Prioridad absoluta lectura emocional del quote · Host secundario o recorte sutil · Mucha contención visual · Línea fina o caja mínima · Verde solo si clarifica lectura'),

  ('P06','Quote Feed — 4:5',
   1080,1350,'4:5', 90,72,90,72, 6,'#282828',
   'La frase es dominante · Marca queda pequeña · Host sutil o ausente si la pieza funciona mejor tipográfica · Sensación editorial, guardable y compartible'),

  ('P07','Carrusel Slide 1 — Portada',
   1080,1080,'1:1', 80,80,80,80, 7,'#193497',
   'Portada autónoma del carrusel · Jerarquía 1 titular · Jerarquía 2 host · Jerarquía 3 numeración/episodio'),

  ('P08','Carrusel Slide 2',
   1080,1080,'1:1', 80,80,80,80, 8,'#193497',
   'Una sola idea visual · Máxima contundencia · Puede ser muy tipográfico'),

  ('P09','Carrusel Slide 3',
   1080,1080,'1:1', 80,80,80,80, 9,'#193497',
   'Organizar el texto para expresar tensión o loop · Separación de bloques para reforzar distancia o contraste'),

  ('P10','Carrusel Slide 4',
   1080,1080,'1:1', 80,80,80,80, 10,'#193497',
   'Protagonismo al concepto memorable · Verde como acento mínimo si ayuda a memorabilidad'),

  ('P11','Carrusel Slide 5',
   1080,1080,'1:1', 80,80,80,80, 11,'#193497',
   'Muy tipográfico · Sobrio · Directo'),

  ('P12','Carrusel Slide 6',
   1080,1080,'1:1', 80,80,80,80, 12,'#193497',
   'Bloques tipográficos tensos · Alta legibilidad'),

  ('P13','Carrusel Slide 7',
   1080,1080,'1:1', 80,80,80,80, 13,'#193497',
   'Clímax emocional del carrusel · Más espacio negativo · Aquí va la frase más poderosa del episodio'),

  ('P14','Carrusel Slide 8 — CTA Final',
   1080,1080,'1:1', 80,80,80,80, 14,'#193497',
   'Cierre claro · CTA directo · Verde solo como acento puntual en CTA principal'),

  ('P15','Highlight Cover',
   1080,1080,'1:1', 120,120,120,120, 15,'#193497',
   'Sin texto largo · Solo número EP · Diseño mínimo · Reconocible en miniatura · Verde solo si mejora reconocimiento')
ON CONFLICT (piece_code) DO NOTHING;

-- ─── Copy block rules (per template) ──────────────────────────────
INSERT INTO public.visual_template_rules
  (template_id, rule_type, rule_key, rule_value_json, is_required, order_index)
SELECT
  vt.id,
  'copy_block',
  v.rule_key,
  jsonb_build_object('label', v.label, 'default', v.default_value, 'max_chars', 80),
  v.is_required,
  v.order_index
FROM public.visual_templates vt
JOIN (
  VALUES
    ('P01','frase_principal_l1','Frase principal (línea 1)','[FRASE PRINCIPAL EPISODIO]',true,1),
    ('P01','frase_principal_l2','Frase principal (línea 2)','[LÍNEA 2]',false,2),
    ('P01','ep_label','Etiqueta episodio','EP. XX',true,3),
    ('P01','nombre_podcast','Nombre podcast','A MI TAMPOCO ME EXPLICARON',false,4),

    ('P02','titular_1','Titular (parte 1)','[TITULAR PARTE 1]',true,1),
    ('P02','titular_2','Titular (parte 2)','[TITULAR PARTE 2]',false,2),
    ('P02','titular_3','Titular (parte 3)','[TITULAR PARTE 3]',false,3),
    ('P02','label_lanzamiento','Etiqueta lanzamiento','NUEVO EPISODIO',false,4),
    ('P02','ep_label','Etiqueta episodio','EP. XX',true,5),
    ('P02','instagram_user','Usuario Instagram','@yosoyvillamar',false,6),

    ('P03','titular_corto_1','Titular corto (línea 1)','[TITULAR CORTO]',true,1),
    ('P03','titular_corto_2','Titular corto (línea 2)','[LÍNEA 2]',false,2),
    ('P03','ep_label','Etiqueta episodio','EP. XX',true,3),
    ('P03','nombre_podcast','Nombre podcast','A MI TAMPOCO ME EXPLICARON',false,4),

    ('P04','label_lanzamiento','Etiqueta lanzamiento','NUEVO EPISODIO',false,1),
    ('P04','titular_1','Titular (parte 1)','[TITULAR]',true,2),
    ('P04','titular_2','Titular (parte 2)','[LÍNEA 2]',false,3),
    ('P04','titular_3','Titular (parte 3)','[LÍNEA 3]',false,4),
    ('P04','cta','CTA','ESCÚCHALO YA',false,5),
    ('P04','ep_label','Etiqueta episodio','EP. XX',true,6),
    ('P04','instagram_user','Usuario Instagram','@yosoyvillamar',false,7),

    ('P05','frase_larga_1','Frase larga (parte 1)','[FRASE LARGA PARTE 1]',true,1),
    ('P05','frase_larga_2','Frase larga (parte 2)','[FRASE LARGA PARTE 2]',false,2),
    ('P05','frase_larga_3','Frase larga (continuación)','[CONTINUACIÓN]',false,3),
    ('P05','ep_label','Etiqueta episodio','EP. XX',true,4),
    ('P05','nombre_podcast','Nombre podcast','A MI TAMPOCO ME EXPLICARON',false,5),

    ('P06','frase_1','Frase (parte 1)','[FRASE CORTA]',true,1),
    ('P06','frase_2','Frase (parte 2)','[LÍNEA 2]',false,2),
    ('P06','frase_3','Frase (parte 3)','[LÍNEA 3]',false,3),
    ('P06','ep_label','Etiqueta episodio','EP. XX',true,4),
    ('P06','nombre_podcast','Nombre podcast','A MI TAMPOCO ME EXPLICARON',false,5),

    ('P07','titular_1','Titular (línea 1)','[TITULAR SLIDE 1]',true,1),
    ('P07','titular_2','Titular (línea 2)','[CONTINUACIÓN]',false,2),
    ('P07','slide_number','Número de slide','01',false,3),
    ('P07','ep_label','Etiqueta episodio','EP. XX',true,4),

    ('P08','idea_1','Idea única (línea 1)','[IDEA ÚNICA]',true,1),
    ('P08','idea_2','Idea única (línea 2)','[LÍNEA 2]',false,2),
    ('P08','slide_number','Número de slide','02',false,3),

    ('P09','tension_a','Tensión — parte A','[FRASE TENSIÓN — PARTE A]',true,1),
    ('P09','tension_b','Tensión — parte B','[FRASE TENSIÓN — PARTE B]',false,2),
    ('P09','slide_number','Número de slide','03',false,3),

    ('P10','frase_impacto','Frase de impacto','[FRASE DE IMPACTO]',true,1),
    ('P10','concepto_memorable','Concepto memorable','[CONCEPTO MEMORABLE]',false,2),
    ('P10','slide_number','Número de slide','04',false,3),

    ('P11','frase_1','Frase clave 2 (línea 1)','[FRASE CLAVE 2]',true,1),
    ('P11','frase_2','Frase clave 2 (línea 2)','[LÍNEA 2]',false,2),
    ('P11','frase_3','Frase clave 2 (línea 3)','[LÍNEA 3]',false,3),
    ('P11','slide_number','Número de slide','05',false,4),

    ('P12','frase_1','Frase clave 3 (línea 1)','[FRASE CLAVE 3]',true,1),
    ('P12','frase_2','Frase clave 3 (línea 2)','[CONTINUACIÓN]',false,2),
    ('P12','slide_number','Número de slide','06',false,3),

    ('P13','climax_1','Clímax emocional (línea 1)','[CLÍMAX EMOCIONAL]',true,1),
    ('P13','climax_2','Clímax emocional (línea 2)','[LÍNEA 2]',false,2),
    ('P13','climax_3','Clímax emocional (línea 3)','[LÍNEA 3]',false,3),
    ('P13','slide_number','Número de slide','07',false,4),

    ('P14','cta_1','CTA (línea 1)','GUÁRDALO',true,1),
    ('P14','cta_2','CTA (línea 2)','COMPÁRTELO',false,2),
    ('P14','escucha_1','Escucha (línea 1)','ESCUCHA',false,3),
    ('P14','escucha_2','Escucha (línea 2)','EL EPISODIO XX',true,4),
    ('P14','instagram_user','Usuario Instagram','@yosoyvillamar',false,5),
    ('P14','slide_number','Número de slide','08',false,6),

    ('P15','episode_number_only','Solo número de episodio','XX',true,1)
) AS v(piece_code, rule_key, label, default_value, is_required, order_index)
  ON vt.piece_code = v.piece_code
ON CONFLICT DO NOTHING;

-- ─── visual_system_settings seed ─────────────────────────────────────────────
INSERT INTO public.visual_system_settings (key, label, value_json) VALUES
  ('global_system_rule',
   'Regla global del sistema',
   '"Crear UNA SOLA pieza visual final. No crear variantes. No crear múltiples formatos. Solo producir la pieza especificada en PIEZA OBJETIVO."'),
  ('host_name',      'Nombre del host',         '"Christian Villamar"'),
  ('host_handle',    'Handle del host',          '"@yosoyvillamar"'),
  ('podcast_name',   'Nombre del podcast',       '"A Mi Tampoco Me Explicaron"'),
  ('production_system', 'Sistema de producción', '"AMTME Visual OS v1"')
ON CONFLICT (key) DO NOTHING;
