-- Migration: Reprocess all existing episodes
-- Actualiza campos existentes en todos los episodios con contenido

DO $$
DECLARE
  v_episode RECORD;
  v_theme text;
  v_thesis text;
  v_summary text;
  v_hook text;
  v_cta text;
  v_quote text;
  v_content text;
  v_count integer := 0;
BEGIN
  FOR v_episode IN 
    SELECT id, title, script_base, script_generated, summary, user_id
    FROM public.episodes
    WHERE (script_base IS NOT NULL AND trim(script_base) != '')
       OR (script_generated IS NOT NULL AND trim(script_generated) != '')
       OR (summary IS NOT NULL AND trim(summary) != '')
  LOOP
    -- Get content
    v_content := COALESCE(v_episode.script_base, v_episode.script_generated, v_episode.summary, '');
    
    IF trim(v_content) != '' THEN
      -- Extract theme from title
      v_theme := CASE 
        WHEN v_episode.title ILIKE '%soltar%' THEN 'Soltar y Aceptación'
        WHEN v_episode.title ILIKE '%duelo%' THEN 'Duelo'
        WHEN v_episode.title ILIKE '%relaci%' THEN 'Relaciones'
        WHEN v_episode.title ILIKE '%ansiedad%' THEN 'Ansiedad'
        ELSE split_part(v_episode.title, ':', 1)
      END;
      
      v_thesis := left(v_content, 200);
      v_summary := left(v_content, 300);
      v_hook := 'Descubre qué sucede en este episodio';
      v_cta := 'Comparte tu perspectiva';
      v_quote := left(v_content, 150);
      
      -- Update episode with actual column names
      UPDATE public.episodes
      SET 
        theme = v_theme,
        core_thesis = v_thesis,
        summary = v_summary,
        hook = v_hook,
        cta = v_cta,
        quote = v_quote,
        generation_metadata = jsonb_build_object(
          'auto_processed', true,
          'processed_at', now()::text
        ),
        updated_at = now()
      WHERE id = v_episode.id;
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Reprocessed % episodes successfully', v_count;
END $$;

NOTIFY pgrst, 'reload schema';
