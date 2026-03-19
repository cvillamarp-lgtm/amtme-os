# AUDIT_REPORT.md — AMTME OS
## Fecha: 2026-03-19
## Auditor: GitHub Copilot

---

## HALLAZGOS

### FRONTEND

| # | Severidad | Hallazgo | Fix | Verificación |
|---|-----------|----------|-----|--------------|
| F1 | P1 | Rutas en sidebar verificadas contra App.tsx | Todas confirmadas en App.tsx — `/calendar`, `/accounts`, `/guests`, `/sponsors`, `/notes`, `/seasons`, `/knowledge`, `/design`, `/brand` ya presentes | Abrir cada ruta sin 404 |
| F2 | P1 | Timeout de generate-image insuficiente (30s) en PromptBuilder y ContentPipeline | Callers pasan `{ timeoutMs: 90_000 }`; useContentProduction y PieceCard ya tenían `120_000` | Generar imagen > 30s sin timeout |
| F3 | P2 | Toast 401 mensaje poco claro y clave de dedupe genérica | Mensaje actualizado a "Sesión expirada — haz clic en 'Iniciar sesión'"; dedupe usa clave fija `"auth-expired"` | Ver toast al expirar sesión |

### STORAGE

| # | Severidad | Hallazgo | Fix | Verificación |
|---|-----------|----------|-----|--------------|
| S1 | P0 | Buckets `episode-covers`, `audio-uploads`, `exports` faltantes | Migración `20260319000001_storage_buckets_and_policies.sql` | Verificar en Supabase Dashboard > Storage |
| S2 | P1 | Policies de `generated-images` no documentadas/verificadas | Policies explícitas en migración con upsert en caso de bucket existente | Subir imagen como usuario autenticado |

### EDGE FUNCTIONS

| # | Severidad | Hallazgo | Fix | Verificación |
|---|-----------|----------|-----|--------------|
| E1 | P0 | Modelos Gemini inexistentes (PR #31 corregido) | `gemini-2.0-flash-preview-image-generation` | Generar imagen en /factory |
| E2 | P0 | Imágenes de referencia no enviadas a Gemini (PR #31 corregido) | inlineData base64 en Gemini body | Imagen generada con rasgos del host |
| E3 | P1 | generate-image timeout 30s insuficiente en algunos callers | PromptBuilder y ContentPipeline usan `{ timeoutMs: 90_000 }` | Generar sin timeout error |

### BASE DE DATOS

| # | Severidad | Hallazgo | Fix | Verificación |
|---|-----------|----------|-----|--------------|
| D1 | P0 | `call_automation_ef` overloads ambiguos (múltiples migraciones) | Migración `20260318000030_fix_call_automation_ef_final.sql` aplicada | `supabase db pull` sin errores |
| D2 | P1 | Triggers de automatización pueden bloquear UPDATEs | EXCEPTION WHEN OTHERS → solo log en todos los triggers | Guardar episodio con edge caída |

### DEPLOY / CI

| # | Severidad | Hallazgo | Fix | Verificación |
|---|-----------|----------|-----|--------------|
| C1 | P1 | `.env.example` incompleto — falta `GEMINI_API_KEY` y sección Vercel | Actualizado `.env.example` con sección "Vercel Secrets"; `README.md` con tabla completa; checklist en `AUDIT_REPORT.md` | Ver variables requeridas documentadas |
| C2 | P2 | No hay gate de `tsc --noEmit` en CI | Documentado en READY-TO-RUN | Correr localmente antes de deploy |

---

## PATRÓN DE GUARDADO DE EPISODIOS (BLOQUE E)

El flujo de creación en `src/pages/Episodes.tsx` ya sigue el patrón correcto:

1. **Guardar en DB primero** — `supabase.from("episodes").insert(...)` se ejecuta y confirma antes de llamar a ninguna edge function.
2. **Automation best-effort** — `invokeEdgeFunction("generate-episode-fields", ...)` está envuelta en `try/catch` que sólo muestra un `toast.warning` y continúa; el episodio ya está creado.
3. **handleSave en EpisodeWorkspace** — sólo llama `updateEpisode.mutateAsync(updates)` (Supabase directo), sin ninguna edge function en el path crítico.

---

## VARIABLES DE ENTORNO REQUERIDAS

### Frontend — Desarrollo local (`.env.local`)
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

### Vercel (Producción)
Configurar en Vercel Dashboard → Project → Settings → Environment Variables:
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

### Supabase Edge Functions (Secrets)
Auto-inyectadas por Supabase — NO configurar manualmente:
```
SUPABASE_URL           ← auto
SUPABASE_ANON_KEY      ← auto
SUPABASE_SERVICE_ROLE_KEY ← auto
```

Configurar en Supabase Dashboard → Settings → Edge Functions → Secrets (**al menos UNA requerida**):
```
GEMINI_API_KEY=<google-ai-studio-key>   # GRATIS ⭐ — requerido para generate-image
OPENAI_API_KEY=<openai-key>             # PAGO — fallback DALL-E 3 + texto
GROQ_API_KEY=<groq-key>                 # texto rápido (guiones, captions)
```

### Checklist de configuración

#### Desarrollo local
- [ ] `VITE_SUPABASE_URL` — URL del proyecto Supabase
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` — Anon key del proyecto
- [ ] `VITE_SUPABASE_PROJECT_ID` — ID del proyecto
- [ ] Al menos una API key de IA en Supabase Secrets (`GEMINI_API_KEY` recomendado)

#### Producción (Vercel + Supabase)
- [ ] `VITE_SUPABASE_URL` configurada en Vercel
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` configurada en Vercel
- [ ] `VITE_SUPABASE_PROJECT_ID` configurada en Vercel
- [ ] `GEMINI_API_KEY` en Supabase Edge Function Secrets (**recomendado**)
- [ ] `OPENAI_API_KEY` o `GROQ_API_KEY` opcionales como fallback

---

## ESTADO FINAL

| Bloque | Estado |
|--------|--------|
| A — Rutas fantasma | ✅ Confirmadas (sin cambios) |
| B — Storage buckets + RLS | ✅ Migración creada |
| C — Timeout generate-image | ✅ Callers actualizados |
| D — Toast sesión expirada | ✅ Mensaje y dedupe key corregidos |
| E — Guardado episodio no bloqueado | ✅ Confirmado (ya correcto) |
| F — Audit Report | ✅ Este documento |
| G — Variables de entorno | ✅ `.env.example`, `README.md` y checklist actualizados (Issue #36) |

