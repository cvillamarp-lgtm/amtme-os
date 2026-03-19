# AUDIT REPORT — AMTME OS
**Fecha:** 2026-03-19  
**Auditor:** GitHub Copilot Coding Agent  
**Rama:** `copilot/fix-ghost-routes-sidebar`

---

## Resumen ejecutivo

Auditoría completa del sistema AMTME OS (Frontend React/Vite + Supabase Backend). Se identificaron y corrigieron los siguientes hallazgos en esta PR.

---

## Hallazgos por categoría

### FRONTEND

| ID | Severidad | Hallazgo | Fix aplicado | Verificación |
|----|-----------|----------|--------------|--------------|
| F1 | P0 | Todas las rutas del sidebar ya existían en `App.tsx` | Sin cambios necesarios | `grep` de rutas confirmó todas presentes |
| F2 | P1 | Mensaje de error 401 genérico sin CTA claro | `edgeFunctionErrors.ts` → case 401 actualizado a `"Sesión expirada — haz clic en 'Iniciar sesión'"` | Revisar toast al expirar sesión |

### STORAGE / BUCKETS

| ID | Severidad | Hallazgo | Fix aplicado | Verificación |
|----|-----------|----------|--------------|--------------|
| S1 | P0 | Buckets `generated-images`, `episode-covers`, `audio-uploads`, `exports` no tenían migración formal | Nueva migración `20260319000001_storage_buckets_and_policies.sql` crea buckets con RLS completo | `supabase db push` + verificar en Dashboard > Storage |
| S2 | P0 | Sin políticas RLS en buckets de storage | Migración crea 15 políticas cubiendo SELECT/INSERT/UPDATE/DELETE por bucket con scope correcto | Verificar en Supabase Dashboard > Storage > Policies |

### EDGE FUNCTIONS / IA

| ID | Severidad | Hallazgo | Fix aplicado | Verificación |
|----|-----------|----------|--------------|--------------|
| E1 | P1 | `PromptBuilder.tsx` llamaba `generate-image` sin `timeoutMs` (default ~30s) | Añadido `{ timeoutMs: 90_000 }` | Generar imagen desde /prompt-builder sin timeout |
| E2 | P1 | `ContentPipeline.tsx` llamaba `generate-image` sin `timeoutMs` | Añadido `{ timeoutMs: 90_000 }` | Generar imagen desde /pipeline sin timeout |
| E3 | ✅ OK | `useContentProduction.ts` ya tenía `timeoutMs: 120_000` | Sin cambios | — |

### DEPLOY / CI

| ID | Severidad | Hallazgo | Fix aplicado | Verificación |
|----|-----------|----------|--------------|--------------|
| D1 | P1 | `.env.example` incompleto — faltaban variables de IA | Reemplazado con versión completa incluyendo `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY` | Revisar `.env.example` |
| D2 | P2 | `AUDIT_REPORT.md` era un placeholder vacío | Reemplazado por este reporte real | — |

---

## Variables de entorno requeridas

### Vercel (Frontend)
| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | ✅ Sí |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key de Supabase | ✅ Sí |
| `VITE_SUPABASE_PROJECT_ID` | Project ID de Supabase | ✅ Sí |

### Supabase Edge Functions (Dashboard > Settings > Edge Functions > Secrets)
| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `SUPABASE_URL` | Auto-inyectado por Supabase | ✅ Auto |
| `SUPABASE_ANON_KEY` | Auto-inyectado por Supabase | ✅ Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-inyectado por Supabase | ✅ Auto |
| `GEMINI_API_KEY` | Google AI Studio — gratis en aistudio.google.com/apikey | ✅ Para imágenes |
| `OPENAI_API_KEY` | OpenAI — fallback imágenes (DALL-E 3) | Opcional |
| `GROQ_API_KEY` | Groq — texto rápido (guiones, captions) | Opcional |

---

## Checklist READY-TO-RUN

### 1. Aplicar migración de storage
```bash
# Desde la raíz del proyecto
supabase db push --project-ref <PROJECT_REF>
```
Verificar en Supabase Dashboard → Storage → Buckets que existen:
- `generated-images` (público)
- `episode-covers` (público)
- `audio-uploads` (privado)
- `exports` (privado)

### 2. Verificar variables de entorno en Vercel
- `VITE_SUPABASE_URL` ✅
- `VITE_SUPABASE_PUBLISHABLE_KEY` ✅
- `VITE_SUPABASE_PROJECT_ID` ✅

### 3. Verificar secrets en Supabase Edge Functions
- `GEMINI_API_KEY` debe estar configurado

### 4. Deploy edge function generate-image
```bash
supabase functions deploy generate-image --project-ref <PROJECT_REF>
```

### 5. Pruebas funcionales
| Acción | Resultado esperado |
|--------|--------------------|
| Navegar a `/factory` | Carga sin error |
| Navegar a `/prompt-builder` | Carga sin error |
| Navegar a `/design` | Carga sin error |
| Generar imagen en `/factory` | Imagen generada en < 90s, guardada en `generated-images` |
| Generar imagen en `/prompt-builder` | Imagen generada en < 90s |
| Sesión expirada durante IA | Toast único con CTA "Iniciar sesión" (no loop) |
| Guardar episodio con edge caída | Episodio guarda igual, solo log en consola |

---

## Riesgos restantes

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `GEMINI_API_KEY` no configurado | 🔴 Sin generación de imágenes | Configurar en Supabase Dashboard > Secrets |
| Imágenes de referencia del host no subidas a storage | 🟡 Imágenes sin rasgos del host | Subir `host-imagen01.png`, `host-imagen02.png` a bucket `generated-images` |
| Modelo Gemini `gemini-2.0-flash-preview-image-generation` deprecado | 🟡 Fallas silenciosas | Monitorear logs de Edge Function |
| RLS en storage puede bloquear service_role en edge functions | 🟡 Edge function no puede subir imágenes | Verificar que las políticas permitan `service_role` |
