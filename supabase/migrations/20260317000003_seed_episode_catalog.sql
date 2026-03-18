-- ============================================================
-- Seed: Catálogo histórico AMTME — 28 episodios publicados
-- Created: 2026-03-17
-- Source: AMTME_Documento_Consolidado_2026-03-05.md — Sección 4
--
-- Solo inserta episodios cuyo número NO exista ya para el usuario.
-- Seguro correr múltiples veces (idempotente).
-- ============================================================

DO $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id FROM auth.users LIMIT 1;
  IF _user_id IS NULL THEN
    RAISE NOTICE 'seed_episode_catalog: no user found, skipping.';
    RETURN;
  END IF;

  INSERT INTO public.episodes (
    user_id,
    number,
    title,
    working_title,
    theme,
    status,
    estado_produccion,
    estado_publicacion,
    release_date,
    summary,
    tono,
    nivel_completitud,
    created_at,
    updated_at
  )
  SELECT
    _user_id,
    ep.num,
    ep.title,
    ep.title,
    ep.theme,
    'published',
    'complete',
    'published',
    ep.release_date::date,
    ep.theme,
    'íntimo',
    ep.nivel,
    now(),
    now()
  FROM (VALUES
    ('1',  '¿Estás buscando respuestas que nadie se tomó el tiempo de darte?',
            'El porqué de AMTME. Autoconocimiento sin certezas. El tarot como espejo, no predicción.',
            '2024-12-18', 'A'),
    ('2',  '¿Sigues actuando para ser elegido?',
            'Diferencia entre querer ser amado vs. aceptado. La autenticidad como acto de rebeldía real.',
            '2024-12-18', 'A'),
    ('3',  '¿Ya te cansaste de no ser tú?',
            'El cansancio como activador del cambio real, antes que la motivación.',
            '2024-12-18', 'A'),
    ('4',  '¿Sabes si lo que sientes es amor o no puedes soltarlo?',
            'Diferencia amor vs. apego. Señales concretas del amor real. La intensidad no es profundidad.',
            '2025-01-01', 'A'),
    ('5',  '¿Estás eligiéndote a ti o eligiendo lo que se espera de ti?',
            'El costo real de elegirte. Distinción querer vs. deber.',
            '2025-01-13', 'B'),
    ('6',  '¿Elegirte se siente como abandonar a alguien?',
            'La culpa de priorizarte. Pérdida necesaria vs. huida. Honrarte sin destruir lo que amas.',
            '2025-01-20', 'B'),
    ('7',  '¿Te quiere o solo no quiere perderte?',
            'La zona gris emocional. Diferencia entre no querer perderte y amarte de verdad. La ambigüedad que agota.',
            '2025-01-29', 'A'),
    ('8',  '¿Lo amas o ya no sabes cómo soltarlo?',
            'Amor vs. miedo al vacío. La identidad construida alrededor de otra persona.',
            '2025-02-10', 'C'),
    ('9',  '¿Sabes distinguir lo que es amor de lo que es dependencia?',
            'La dependencia emocional disfrazada de pasión. El sistema nervioso en relaciones caóticas.',
            '2025-02-13', 'C'),
    ('10', '¿Te callas para no perder a alguien o para no perderte a ti?',
            'El silencio como distancia. Las palabras no dichas que pesan. Comunicar sin culpa ni drama.',
            '2025-02-18', 'C'),
    ('11', '¿Sigues cargando un pasado que ya no define quién eres?',
            'El pasado no te persigue, tú lo cargas. Diferencia integrar vs. quedarse atascado.',
            '2025-02-20', 'C'),
    ('12', '¿Tocaste fondo y todavía no sabes qué hacer con eso?',
            'El fondo como punto de partida. La honestidad radical del límite. Caer vs. rendirse.',
            '2025-03-12', 'C'),
    ('13', '¿Sigues buscando afuera lo que solo puedes encontrar adentro?',
            'El vacío que solo se llena desde dentro. El autoconocimiento como condición para todo lo demás.',
            '2025-03-20', 'C'),
    ('14', '¿Lo que sientes es amor o miedo a quedarte solo?',
            'El miedo a la soledad disfrazado de amor. Relaciones que duran por evitar el vacío.',
            '2025-04-07', 'C'),
    ('15', '¿Sientes conexión con alguien que en realidad no te ve?',
            'Proyección vs. conexión real. El dolor silencioso de sentir más de lo que te devuelven.',
            '2025-04-15', 'C'),
    ('16', '¿Sigues en un lugar que ya sabes que te hace daño?',
            'Por qué nos quedamos donde duele. Las señales del cuerpo antes que la mente.',
            '2025-04-25', 'C'),
    ('17', '¿Otra persona, el mismo dolor?',
            'Los patrones viven en nosotros, no en ellos. El otro como espejo de heridas no resueltas.',
            '2025-05-01', 'C'),
    ('18', '¿Sabes cuándo dejar de pedir amor donde no hay?',
            'Seguir pidiendo donde ya demostraron que no hay. Elegir la paz. Olvidar vs. integrar.',
            '2025-05-06', 'C'),
    ('19', '¿Seguiste esperando cuando ya era un adiós?',
            'La persona que ya se fue sin decirlo. El duelo del final sin final. No necesitas permiso para cerrar.',
            '2025-05-17', 'C'),
    ('20', '¿Sigues esperando ser elegido?',
            'Útil vs. amado. Construir vínculos donde eres necesario pero no valorado. Elegirte sin culpa.',
            '2025-05-21', 'C'),
    ('21', '¿Quién eres cuando alguien que amabas se va?',
            'La identidad construida alrededor de alguien. Reconstruirse después de la pérdida. Vivir en presencia.',
            '2025-06-11', 'C'),
    ('22', '¿Te exiges tanto que ya no puedes equivocarte?',
            'La exigencia como castigo. El error no es prueba de insuficiencia.',
            '2025-06-26', 'C'),
    ('23', '¿Usarías el tarot si supieras que no predice el futuro?',
            'El tarot como psicología simbólica. Los arcanos como espejo. No hace falta magia.',
            '2025-07-01', 'C'),
    ('24', '¿Estás eligiendo vínculos o simplemente aguantándolos?',
            'El amor se ve diferente a los 30-40. Diferencia elegir vs. aguantar.',
            '2025-07-09', 'C'),
    ('25', '¿Todavía te duele que no te eligieron?',
            'El rechazo no es un veredicto sobre tu valor. Activa heridas más antiguas. La revancha real: construirte.',
            '2025-07-23', 'A'),
    ('26', '¿Sabes lo que nadie te explicó sobre el corazón roto?',
            'El dolor del desamor no es solo emocional. La ansiedad post-ruptura tiene nombre clínico. No estás roto.',
            '2025-10-06', 'A'),
    ('27', '¿Sigues pidiendo amor donde ya te demostraron que no hay?',
            'Seguir esperando no es fe, es miedo disfrazado. La dignidad de no quedarse donde no te quieren.',
            '2025-11-26', 'B'),
    ('28', '¿Confundes amor con apego?',
            'El apego se siente como miedo por dentro. El dolor no es prueba de amor.',
            '2026-02-04', 'C')
  ) AS ep(num, title, theme, release_date, nivel)  -- theme also used as summary
  WHERE NOT EXISTS (
    SELECT 1 FROM public.episodes e2
    WHERE e2.user_id = _user_id AND e2.number = ep.num
  );

  RAISE NOTICE 'seed_episode_catalog: inserted % episodes.',
    (SELECT count(*) FROM public.episodes WHERE user_id = _user_id AND number ~ '^\d+$' AND number::integer <= 28);
END $$;
