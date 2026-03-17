# Technical Audit Report

## Date: 2026-03-17

---

## 1. Resumen Ejecutivo

Se auditó la capa de base de datos del proyecto (migraciones Supabase) con foco en
funciones PL/pgSQL, triggers y llamadas HTTP vía `pg_net`. Se encontró **un error
estructural crítico** reproducible: dos funciones utilizaban el path de schema incorrecto
`extensions.pg_net.http_post(...)` para llamar a la extensión `pg_net`. El path correcto
es `net.http_post(...)`, ya que `pg_net` registra sus funciones en el schema `net`,
no en `extensions`. Adicionalmente se auditaron todas las referencias a columnas de las
tablas `episodes`, `asset_candidates`, `content_assets` y `publication_queue`, sin
encontrar referencias a columnas eliminadas o renombradas.

---

## 2. Causa Raíz Exacta

```
ERROR: function extensions.pg_net.http_post(...) does not exist
```

La extensión `pg_net` se instala en el schema `net` (no en `extensions`). Cualquier
llamada a `extensions.pg_net.http_post(...)` falla en tiempo de ejecución del trigger
con un error de función inexistente, bloqueando toda la orquestación automática del
pipeline (script extraction, asset publication, publication events).

---

## 3. Funciones SQL Afectadas

| Función | Archivo de Migración | Línea | Error |
|---|---|---|---|
| `public.call_automation_ef` | `20260316000006_automation_triggers.sql` | 42 | `extensions.pg_net.http_post` |
| `public.call_automation_ef` | `20260316000008_phase5_backend_orchestration.sql` | 64 | `extensions.pg_net.http_post` |

Ambas migraciones definen la misma función (`public.call_automation_ef`) con `CREATE OR
REPLACE`, siendo la segunda (`20260316000008`) la versión activa en producción.

---

## 4. Triggers Afectados

Los siguientes triggers llaman indirectamente a `call_automation_ef` y fallaban en
cascada por el error de schema:

| Trigger | Tabla | Evento |
|---|---|---|
| `trg_episode_script_changed` | `public.episodes` | `AFTER UPDATE` (script_base, script_generated) |
| `trg_asset_approved` | `public.asset_candidates` | `AFTER UPDATE` (status → 'approved') |
| `trg_publication_status_changed` | `public.publication_queue` | `AFTER UPDATE` (status) |
| `trg_episode_fields_changed` | `public.episodes` | `AFTER UPDATE` (working_title, title, theme) |
| `trg_export_package_created` | `public.export_packages` | `AFTER INSERT` |

---

## 5. SQL Corregido Final

```sql
-- Corrección: reemplazar extensions.pg_net.http_post → net.http_post
-- Aplicar en producción si las migraciones 20260316000006/8 ya fueron ejecutadas.

CREATE OR REPLACE FUNCTION public.call_automation_ef(
  function_name TEXT,
  payload       JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _url TEXT := 'https://vudvgfdoeciurejtbzbw.supabase.co';
  _key TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
    WHERE name = 'automation_service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    _key := NULL;
  END;

  IF _key IS NULL OR _key = '' THEN
    _key := current_setting('app.service_role_key', true);
  END IF;

  IF _key IS NULL OR _key = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(                          -- CORRECCION
    url     := _url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body    := payload
  );
END;
$$;
```

---

## 6. Archivos / Migraciones Modificadas

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260316000006_automation_triggers.sql` | `extensions.pg_net.http_post` → `net.http_post` (línea 42) |
| `supabase/migrations/20260316000008_phase5_backend_orchestration.sql` | `extensions.pg_net.http_post` → `net.http_post` (línea 64) |
| `supabase/migrations/20260317000001_fix_net_http_post_schema.sql` | **Nueva migración correctiva** para entornos ya desplegados |

---

## 7. Validación

- Búsqueda exhaustiva con `grep -rn "extensions\.pg_net\|pg_net\.http"` en todo el repo
  confirmó que no quedan referencias incorrectas tras las correcciones.
- Las columnas referenciadas en `OLD`/`NEW` dentro de los triggers fueron verificadas
  contra las definiciones de tabla activas:
  - `episodes`: `script_base`, `script_generated`, `working_title`, `title`, `theme`,
    `core_thesis`, `hook`, `conflicto_central`, `intencion_del_episodio`, `summary`,
    `cta`, `quote`, `script_status`, `health_score`, `nivel_completitud` — todas existen.
  - `asset_candidates`: `id`, `episode_id`, `platform`, `body_text`, `title`, `status` — todas existen.
  - `publication_queue`: `id`, `episode_id`, `platform`, `status` — todas existen.
  - `content_assets`: `user_id`, `episode_id`, `piece_name`, `caption` — todas existen.
- Las firmas de función (`public.call_automation_ef(TEXT, JSONB)`), `SECURITY DEFINER`
  y todos los permisos se preservaron intactos.

---

## 8. Riesgos Reales Pendientes

- **`app.service_role_key`**: Si la clave de servicio no está configurada ni en Vault ni
  como setting de base de datos, los triggers se saltarán silenciosamente sin reportar
  error. Se recomienda configurar al menos el fallback DB setting en todos los entornos.
- **Vault en CI**: El bloque `BEGIN...EXCEPTION WHEN OTHERS THEN` garantiza que la
  ausencia de Vault en entornos de CI no provoca errores, pero sí significa que las
  Edge Functions no serán llamadas en pipelines de prueba sin configuración adicional.
- **`content_assets.piece_name` legacy**: La función
  `auto_create_publication_on_asset_approve` se dispara desde `content_assets` y usa
  `NEW.piece_name` para inferir plataforma. Si en el futuro `piece_name` se elimina de
  `content_assets`, este trigger fallará. Se recomienda añadir una guarda
  `IF NEW.piece_name IS NOT NULL`.
