-- Migration: Auto-Process Episode Trigger
-- Ejecuta automáticamente el Script Engine cuando se crea/actualiza un episodio
-- si tiene contenido (script_base o summary)

CREATE OR REPLACE FUNCTION public.trigger_auto_process_episode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_content boolean;
  v_request_id uuid;
BEGIN
  -- Verificar si el episodio tiene contenido para procesar
  v_has_content := (
    (NEW.script_base IS NOT NULL AND trim(NEW.script_base) != '') OR
    (NEW.script_generated IS NOT NULL AND trim(NEW.script_generated) != '') OR
    (NEW.summary IS NOT NULL AND trim(NEW.summary) != '')
  );

  -- Si hay contenido y no ha sido procesado automáticamente, ejecutar pipeline
  IF v_has_content THEN
    -- Llamar a la Edge Function de auto-proceso de forma asincrónica
    BEGIN
      SELECT http_post(
        'http://localhost:54321/functions/v1/auto-process-episode',
        jsonb_build_object(
          'episode_id', NEW.id,
          'title', NEW.title,
          'script_base', NEW.script_base,
          'script_generated', NEW.script_generated,
          'user_id', NEW.user_id
        ),
        'application/json'
      ) INTO v_request_id;
    EXCEPTION WHEN OTHERS THEN
      -- Si falla, loguear pero no bloquear la inserción
      RAISE WARNING 'Auto-process episode failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger para INSERT
DROP TRIGGER IF EXISTS trg_auto_process_episode_insert ON public.episodes;
CREATE TRIGGER trg_auto_process_episode_insert
  AFTER INSERT ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_process_episode();

-- Crear trigger para UPDATE (solo si cambia contenido)
DROP TRIGGER IF EXISTS trg_auto_process_episode_update ON public.episodes;
CREATE TRIGGER trg_auto_process_episode_update
  AFTER UPDATE ON public.episodes
  FOR EACH ROW
  WHEN (
    (OLD.script_base IS DISTINCT FROM NEW.script_base) OR
    (OLD.script_generated IS DISTINCT FROM NEW.script_generated) OR
    (OLD.summary IS DISTINCT FROM NEW.summary)
  )
  EXECUTE FUNCTION public.trigger_auto_process_episode();

-- Reload schema
NOTIFY pgrst, 'reload schema';
