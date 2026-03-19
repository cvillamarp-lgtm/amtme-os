# AMTME OS — A Mi Tampoco Me Explicaron

Sistema de gestión integral para la producción del podcast **AMTME**.

## Stack tecnológico

- React 18 + TypeScript + Vite
- Supabase (Auth + Base de datos + Edge Functions)
- TailwindCSS + shadcn/ui
- TanStack React Query

## Funcionalidades

- Dashboard con KPIs de producción
- Gestión de episodios, invitados y tareas
- Calendario editorial
- Generador de guiones con IA (streaming)
- Generador de prompts visuales
- Brand Studio y Design Studio
- Métricas, audiencia y menciones
- Scorecard de rendimiento
- Fábrica de contenido visual (15 piezas por episodio)
- Sistema de estados por bloque con dependencias

## Setup local

### 1. Clonar el repositorio

```sh
git clone <repo-url>
cd <repo-dir>
```

### 2. Configurar variables de entorno

```sh
cp .env.example .env
```

Edita `.env` con tus credenciales (ver sección Variables de Entorno).

### 3. Instalar dependencias

```sh
bun install
```

### 4. Iniciar servidor de desarrollo

```sh
bun run dev
```

## Variables de entorno

### Frontend — Desarrollo local (`.env.local`)

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key del proyecto | Sí |
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto Supabase | Sí |

### Vercel (Producción)

Configurar en **Vercel Dashboard → Project → Settings → Environment Variables**:

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key del proyecto | Sí |
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto Supabase | Sí |

### Edge Functions — Auto-inyectadas por Supabase

| Variable | Descripción | Configuración |
|----------|-------------|---------------|
| `SUPABASE_URL` | URL del proyecto | Automático |
| `SUPABASE_ANON_KEY` | Anon key | Automático |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Automático |
| `LOVABLE_API_KEY` | Gateway IA (Lovable Cloud) | Automático (Lovable Cloud) |

> **Nota:** Las variables anteriores son gestionadas automáticamente por la plataforma y **no** requieren configuración manual.

### APIs de IA (Supabase Edge Function Secrets)

Configurar en **Supabase Dashboard → Settings → Edge Functions → Secrets**. Se requiere **al menos una**:

| Variable | Proveedor | Uso | Costo | Prioridad |
|----------|-----------|-----|-------|-----------|
| `GEMINI_API_KEY` | Google AI Studio | Generación de imágenes (`generate-image`) | Gratuito ⭐ | **Recomendado** |
| `OPENAI_API_KEY` | OpenAI | Imágenes (DALL-E 3) + texto (fallback) | Pago | Opcional |
| `GROQ_API_KEY` | Groq | Texto rápido: guiones, captions | Gratuito (con límites) | Opcional |

> **Nota:** `GEMINI_API_KEY` es el recomendado por ser gratuito y necesario para la generación de imágenes. Obtenerlo en [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Edge Functions

| Función | Propósito | Auth | Timeout |
|---------|-----------|------|---------|
| `generate-script` | Genera guiones con streaming SSE | JWT manual | N/A (streaming) |
| `generate-image` | Genera imágenes con IA + almacena en Storage | JWT manual | 90s (120s en batch) |
| `extract-content` | Extrae copy para 15 piezas desde guión | JWT manual | 60s |
| `generate-captions` | Genera captions para redes sociales | JWT manual | 60s |
| `generate-episode-fields` | Genera/regenera campos de episodio | JWT manual | 60s |

Todas las funciones validan JWT internamente via `getClaims()`. El flag `verify_jwt = false` en `config.toml` es intencional (patrón signing-keys de Lovable Cloud).

## Migraciones

Las migraciones son incrementales desde `20260308125507_*`. La migración `001_initial_schema.sql` es un artefacto legacy que puede ser ignorado — el baseline real es la segunda migración.

Para un entorno limpio, las migraciones se ejecutan en orden cronológico automáticamente.

## Seguridad

- Todas las tablas tienen RLS habilitado (`auth.uid() = user_id`)
- Los documentos privados (master-document) se almacenan en tabla `private_documents` con RLS — **nunca en `public/`**
- Edge Functions validan tokens JWT antes de procesar
- `generate-image` usa cliente autenticado para updates de episodios (respeta RLS)
- Las imágenes del host están en Storage público (`generated-images` bucket)

## Storage

| Bucket | Público | Contenido |
|--------|---------|-----------|
| `generated-images` | Sí | Imágenes generadas por IA, referencias del host |

## Despliegue

El proyecto se despliega en [Lovable](https://lovable.dev). Las Edge Functions se despliegan automáticamente.

Para otras plataformas compatibles con Vite (Vercel, Netlify):
1. Configurar variables de entorno del frontend
2. Build: `bun run build`
3. Servir directorio `dist/`

## Archivos sensibles

**NUNCA** colocar en `public/`:
- Documentos maestros del podcast
- Datos de audiencia o métricas privadas
- Cualquier contenido que requiera autenticación

Usar la tabla `private_documents` para contenido privado.
