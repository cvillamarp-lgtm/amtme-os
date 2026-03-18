-- PR 2: Preserve user's explicit nivel_completitud override
-- P1-5 / P1-8: trg_auto_episode_states was unconditionally overwriting
-- nivel_completitud even when the user explicitly changed it in WorkspaceDataForm.
-- Fix: only auto-calculate when the user did NOT change nivel_completitud in the
-- same UPDATE statement (i.e., NEW = OLD for that column).

create or replace function public.auto_update_episode_states()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_script_status text;
  v_new_conflicto text;
  v_new_intencion text;
  v_score int := 0;
begin
  -- Resolve script status
  v_script_status := CASE
    WHEN NEW.script_generated IS NOT NULL AND trim(NEW.script_generated) != '' THEN 'generated'
    WHEN NEW.script_base      IS NOT NULL AND trim(NEW.script_base)      != '' THEN 'manual'
    ELSE 'none'
  END;

  -- Resolve renamed / aliased columns
  v_new_conflicto := COALESCE(
    NULLIF(trim(NEW.conflicto_central::text), ''),
    NULL
  );
  v_new_intencion := COALESCE(
    NULLIF(trim(NEW.intencion_del_episodio::text), ''),
    NULL
  );

  -- Update episode_state
  NEW.episode_state := CASE
    WHEN v_script_status IN ('manual','generated')          THEN 'scripted'
    WHEN NEW.working_title IS NOT NULL
      AND trim(NEW.working_title) != ''
      AND v_new_conflicto IS NOT NULL                       THEN 'structured'
    WHEN NEW.working_title IS NOT NULL
      AND trim(NEW.working_title) != ''                     THEN 'drafted'
    ELSE 'ideated'
  END;

  -- Calculate completeness score
  IF NEW.working_title  IS NOT NULL AND trim(NEW.working_title)  != '' THEN v_score := v_score + 1; END IF;
  IF NEW.theme          IS NOT NULL AND trim(NEW.theme)          != '' THEN v_score := v_score + 1; END IF;
  IF NEW.core_thesis    IS NOT NULL AND trim(NEW.core_thesis)    != '' THEN v_score := v_score + 1; END IF;
  IF NEW.hook           IS NOT NULL AND trim(NEW.hook)           != '' THEN v_score := v_score + 1; END IF;
  IF v_new_conflicto    IS NOT NULL AND trim(v_new_conflicto)    != '' THEN v_score := v_score + 1; END IF;
  IF v_new_intencion    IS NOT NULL AND trim(v_new_intencion)    != '' THEN v_score := v_score + 1; END IF;
  IF NEW.summary        IS NOT NULL AND trim(NEW.summary)        != '' THEN v_score := v_score + 1; END IF;
  IF NEW.cta            IS NOT NULL AND trim(NEW.cta)            != '' THEN v_score := v_score + 1; END IF;
  IF v_script_status IN ('manual', 'generated')                        THEN v_score := v_score + 1; END IF;
  IF NEW.quote          IS NOT NULL AND trim(NEW.quote)          != '' THEN v_score := v_score + 1; END IF;

  NEW.health_score := v_score * 10;

  -- Only auto-calculate nivel_completitud if the user did NOT explicitly change it.
  -- If user changed it (NEW != OLD), respect their choice.
  IF NEW.nivel_completitud IS NOT DISTINCT FROM OLD.nivel_completitud THEN
    NEW.nivel_completitud := CASE
      WHEN v_score >= 9 THEN 'A'
      WHEN v_score >= 7 THEN 'B'
      WHEN v_score >= 5 THEN 'C'
      WHEN v_score >= 3 THEN 'D'
      ELSE                   'F'
    END;
  END IF;

  RETURN NEW;
END;
$$;
