# Script Engine + Visual OS Setup Guide

## 🚀 Overview

AMTME has been updated with a complete Script Engine pipeline (4 phases) and an enhanced Visual OS system with the new palette system (P1–P5).

**Phases:**
1. **Ingesta** (Ingest) — Raw podcast content input
2. **Limpieza** (Clean) — Automatic text cleaning via Claude
3. **Semántico** (Semantic) — Episode metadata extraction + palette/image suggestions
4. **Outputs** — Generate 10 content types in parallel

---

## 📋 Prerequisites

### 1. Environment Variables

Ensure your `.env.local` has:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=your-anthropic-key
```

The proxy layer will use `VITE_SUPABASE_URL` to construct Edge Function URLs automatically.

### 2. Edge Functions in Supabase

Three Edge Functions must be deployed in your Supabase project:

#### 2.1 `clean-text` Function
**Location:** `supabase/functions/clean-text/index.ts`

**Endpoint:** `https://your-project.supabase.co/functions/v1/clean-text`

**Input:**
```json
{
  "raw_text": "Raw podcast content..."
}
```

**Output:**
```json
{
  "cleaned_text": "Cleaned text...",
  "original_word_count": 1500,
  "cleaned_word_count": 1200,
  "reduction_percentage": 20.0
}
```

**Implementation Notes:**
- Use Claude Sonnet 4 (`claude-sonnet-4-20250514`) for text cleaning
- System prompt should preserve meaning while removing filler words
- Validate that reduction ≤ 35% and cleaned text ≥ 250 words

#### 2.2 `semantic-map` Function
**Location:** `supabase/functions/semantic-map/index.ts`

**Endpoint:** `https://your-project.supabase.co/functions/v1/semantic-map`

**Input:**
```json
{
  "cleaned_text": "Cleaned podcast content..."
}
```

**Output:**
```json
{
  "semantic_json": {
    "central_thesis": "Main argument...",
    "central_conflict": "Central tension...",
    "episode_promise": "What listener learns...",
    "dominant_emotional_tone": "vulnerable|duelo|ruptura|nostálgico|alegría|esperanza|confianza",
    "intensity_level": "low|medium|high",
    "word_counts": {
      "central_thesis": 45,
      "central_conflict": 32,
      "episode_promise": 28
    }
  }
}
```

**Implementation Notes:**
- Extract metadata that semantic system can use to auto-suggest palettes
- Emotional tones map to palettes:
  - `duelo/ruptura` → P2 (Dorado + Marrón)
  - `vulnerable/nostálgico` → P3 (Celeste + Azul marino)
  - `alta intensidad` → P4 (Rosa + Borgoña)
  - Default → P1 (Lima + Azul noche)

#### 2.3 `generate-outputs` Function
**Location:** `supabase/functions/generate-outputs/index.ts`

**Endpoint:** `https://your-project.supabase.co/functions/v1/generate-outputs`

**Input:**
```json
{
  "semantic_json": {
    "central_thesis": "...",
    "central_conflict": "...",
    ...
  }
}
```

**Output:**
```json
{
  "outputs": [
    {
      "type": "editorial_summary",
      "content": "Summary text...",
      "word_count": 150
    },
    {
      "type": "visual_copy",
      "content": "...",
      "word_count": 45
    },
    // ... 8 more output types
  ],
  "status": "complete"
}
```

**10 Output Types:**
1. `editorial_summary` — Full episode summary
2. `visual_copy` — Short visual-friendly caption
3. `captions` — Multiple short captions
4. `hooks` — Content hooks for reels/stories
5. `quotes` — Extractable quotes
6. `carousel` — Multi-slide carousel content
7. `stories` — Instagram Stories content
8. `reels` — Vertical video script
9. `descriptions` — Platform-specific descriptions
10. `distribution` — Distribution strategy

**Implementation Notes:**
- Generate all 10 in parallel using Promise.all()
- Use claude-sonnet-4-20250514 with appropriate system prompts
- Ensure outputs match word count constraints per type
- Cache responses if possible (semantic input rarely changes)

---

## 🗄️ Database Schema

A complete migration has been created at:
`supabase/migrations/20260320000001_script_engine_visual_os_complete.sql`

**Key Tables:**

### Script Engine Tables
- `episodes` — Episode metadata (season, number, title)
- `raw_inputs` — Raw podcast content + word counts
- `cleaned_texts` — Cleaned text + reduction %
- `semantic_maps` — Semantic analysis JSON
- `generated_assets` — 10 output types

### Visual OS Tables
- `palette_definitions` — P1–P5 palette colors
- `visual_specs` — Visual composition specs
- `palette_assignments` — Palette ↔ Episode mappings
- `asset_versions` — Canvas render history
- `change_log` — Version control

Run migration:
```sql
-- In Supabase SQL Editor:
-- Copy contents of supabase/migrations/20260320000001_script_engine_visual_os_complete.sql
-- Paste and execute
```

---

## 🎨 Design System Integration

### Palette System (5 Palettes)

Located in: `src/lib/design-utils.ts`

**Predefined Palettes (P1–P4):**
```typescript
PALETTE_SYSTEM = {
  1: { bg: "#020B18", accent: "#E4F542", ... }, // Azul noche + Lima
  2: { bg: "#2A1810", accent: "#D4C7A8", ... }, // Marrón + Dorado
  3: { bg: "#1A3A4A", accent: "#B8D4E8", ... }, // Azul marino + Celeste
  4: { bg: "#3D1C2C", accent: "#E85D6E", ... }, // Borgoña + Rosa
};
```

**Custom Palette (P5):**
- Users can define custom bg + accent colors
- System automatically computes derived colors (text, surface, etc.)
- Uses `computeFreePalette()` function

### Contrast Validation

All palettes validate WCAG 2.1 AA (4.5:1 contrast ratio):

```typescript
const contrast = calculateContrastRatio(fgColor, bgColor);
if (contrast < 4.5) {
  // Show warning: "Contrast too low — may not visible in thumbnail"
}
```

---

## 📱 Frontend Integration

### Routes Added

Four new pages with automatic navigation:

```
/script-engine/ingesta
  └─> Fills form with episode metadata + raw text
      └─> Navigates to /script-engine/clean/:rawInputId

/script-engine/clean/:rawInputId
  └─> Split view (original vs cleaned)
      └─> Navigates to /script-engine/semantico/:cleanedTextId

/script-engine/semantico/:cleanedTextId
  └─> Shows semantic analysis + auto-suggested palette/image
      └─> Navigates to /script-engine/outputs/:semanticMapId

/script-engine/outputs/:semanticMapId
  └─> Tab interface for 10 output types
      └─> Navigates to /visual/editor/:semanticMapId
```

### Hooks

Four hooks manage state per phase:

- `useScriptEngineIngesta()` — Phase 1
- `useScriptEngineClean()` — Phase 2
- `useScriptEngineSemantico()` — Phase 3
- `useScriptEngineOutputs()` — Phase 4

Example usage:
```typescript
const { state, createEpisode, updateRawText, saveRawInput } = useScriptEngineIngesta();

const handleSave = async () => {
  await saveRawInput(state.episodeId);
  // Raw input persisted, ready for cleaning
};
```

### Edge Function Proxy

Located in: `src/lib/edge-function-proxy.ts`

Three helper functions abstract away authentication:

```typescript
// Automatically uses Supabase auth token
const result = await callCleanText(rawText);
const result = await callSemanticMap(cleanedText);
const result = await callGenerateOutputs(semanticJson);
```

---

## 🖼️ Visual OS Updates

### Enhanced Editor

New page: `VisualOSEditorPage` with:

1. **Palette Picker**
   - Visual preview of P1–P5
   - Color input fields for P5 (custom)
   - Real-time contrast validation

2. **Host Image Selector**
   - 3 options: none, REF_1 (intimate), REF_2 (direct)
   - Shows emoji labels (🎯 🪑 👥)

3. **Canvas Preview**
   - Real-time rendering
   - Safe zone overlay (90% width)
   - Grid overlay (12 columns)

4. **Validation Panel**
   - ✅ Green for publication-ready
   - 🔴 Red for blockers
   - ⚠️ Orange for warnings

### Canvas Rendering

Located in: `src/lib/canvas-text-overlay.ts`

Main function:
```typescript
renderCanvas(ctx, config, width, height): void
```

Renders in order:
1. Background (palette bg color)
2. Host image (REF_1/REF_2 with background removal)
3. Long shadow (symbolic weight)
4. Keyword + headline text
5. Underline accent
6. CTA button
7. Episode badge

---

## 🔧 Configuration

### Required Settings

In `vercel.json` (if using Vercel):
```json
{
  "functions": {
    "api/**": {
      "memory": 3008,
      "maxDuration": 60
    }
  }
}
```

In Supabase Edge Functions settings:
- Enable CORS for your domain
- Ensure Claude API key is set as secret `ANTHROPIC_API_KEY`

### Optional Settings

For Sentry error tracking:
```env
VITE_SENTRY_DSN=https://...
```

---

## ✅ Testing Checklist

- [ ] Edge Functions deployed and responding
- [ ] `callCleanText()` returns cleaned text with word counts
- [ ] `callSemanticMap()` extracts metadata and suggests palette correctly
- [ ] `callGenerateOutputs()` generates 10 output types in < 30 seconds
- [ ] Script Engine Ingesta page creates episodes successfully
- [ ] Navigation between phases works (rawInputId → cleanedTextId → semanticMapId)
- [ ] Visual OS Editor loads with correct palette colors
- [ ] Canvas preview renders with safe zone overlay
- [ ] Export PNG/JPG functionality works (filename uses convention)
- [ ] RLS policies allow only episode creators to view/edit their assets

---

## 🚨 Troubleshooting

### Edge Function not found (404)
- Verify URL: `https://your-project.supabase.co/functions/v1/clean-text`
- Check Supabase dashboard > Functions > Deployments
- Ensure environment variables (ANTHROPIC_API_KEY) are set

### Auth token not passed
- Check if user is authenticated in Supabase
- Verify `supabase.auth.getSession()` returns a session
- Check Authorization header in network tab

### Contrast warning persists
- Ensure palette colors are valid hex codes
- Check `calculateContrastRatio()` is using the right colors
- Try adjusting accent color (should be high visibility on background)

### Canvas not rendering
- Verify `PALETTE_SYSTEM` has the correct palette ID
- Check canvas width/height (should be 1080×1920 or scaled)
- Ensure host image file exists if REF_1/REF_2 is selected

---

## 📚 Related Documentation

- **Instrucción Maestra v1.0** — Original architecture specification
- **DESIGN_SYSTEM.md** — Color tokens, typography, spacing
- **EDGE_FUNCTIONS.md** — Detailed Edge Function implementations
- **DATABASE.md** — Schema documentation

---

## 🎯 Next Steps

1. Deploy Edge Functions to Supabase
2. Run database migration
3. Test Script Engine Ingesta → Limpieza → Semántico → Outputs flow
4. Verify Visual OS Editor opens from Outputs page
5. Export first visual asset (PNG/JPG)
6. Share podcast episode with podcast team for feedback

---

**Last Updated:** March 20, 2025  
**Maintained by:** AMTME Engineering
