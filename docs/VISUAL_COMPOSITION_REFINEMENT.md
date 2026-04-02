# Visual Composition Refinement with AI

## Overview

The Visual Composition Refinement feature allows you to optimize editorial compositions using Claude Vision AI analysis and image generation. The system analyzes visual hierarchy, Gestalt principles, and design quality while **absolutely protecting the human subject**.

## How It Works

### 1. **Host Protection (Critical)**
- Claude Vision detects the human subject in the image
- Creates a bounding box around the host
- Marks all host pixels as "untouchable"
- Restricts all refinements to ONLY areas outside the host

### 2. **Analysis Phase**
Claude Vision analyzes:
- Background quality and depth
- Visual hierarchy and compositional balance
- Contrast and figure-ground separation
- Negative space and breathing room
- Gestalt principles (proximity, similarity, continuity, closure)
- Editorial refinement opportunities

### 3. **Optimization Phase**
FLUX.1-pro generates a refined version:
- Improved background textures
- Better compositional balance
- Enhanced visual separation
- Premium editorial feel
- Maintained subject integrity

### 4. **Comparison & Control**
- Split-view original vs. optimized
- Apply, save as variant, or discard
- Full version history in database

## Usage

### In Visual OS:

```
1. Open any piece in Visual OS
2. Click "Optimizar con IA" button
3. Choose:
   - Intensity: Sutil | Media | Alta
   - Focus: Fondo | Composición | Legibilidad | Acabado | Integral
4. Wait for analysis and refinement (~2-3 minutes)
5. Review side-by-side comparison
6. Choose:
   - Apply changes
   - Save as variant
   - Discard
```

## Intensity Levels

| Level | Effect | Use Case |
|-------|--------|----------|
| **Sutil** | 30% optimization | Minor tweaks, conservative approach |
| **Media** | 60% optimization | Standard refinement, recommended |
| **Alta** | 90% optimization | Maximum enhancement, dramatic changes |

## Focus Modes

| Mode | Target | Result |
|------|--------|--------|
| **Fondo** | Background optimization | Improved depth, texture, context |
| **Composición** | Layout & balance | Better visual hierarchy, distribution |
| **Legibilidad** | Text & readability | Enhanced contrast, breathing room |
| **Acabado** | Premium refinement | Editorial quality, polish |
| **Integral** | All aspects | Complete optimization |

## Host Protection Rules

### What's Protected ✅
- Face and facial features
- Body and anatomical proportions
- Pose and positioning
- Expression and emotion
- Clothing and accessories
- Hand positions and gestures
- Overall subject enclosure
- Subject location in frame

### What Can Change 🎨
- Background scenery
- Lighting and shadows (outside subject)
- Color grading and mood
- Texture and depth
- Contrast and separation
- Compositional support elements
- Visual emphasis outside subject
- Atmospheric effects

## Technical Architecture

### Edge Function: `refine-visual-composition`

```
Input:
- imageUrl: string (from canvas)
- intensity: "sutil" | "media" | "alta"
- focus: "fondo" | "composicion" | "legibilidad" | "acabado" | "integral"
- episodeId: uuid

Process:
1. Send to Claude Vision with host-protection prompts
2. Receive analysis with host bounds and improvement suggestions
3. Generate FLUX.1-pro prompt with host restrictions
4. Generate refined image
5. Save refinement record
6. Return original + refined URLs

Output:
{
  "original": "url",
  "refined": "url",
  "analysis": {
    "hostDetected": boolean,
    "hostBounds": { x, y, width, height },
    "improvements": ["improvement 1", ...],
    "restrictions": ["restriction 1", ...]
  }
}
```

### React Component: `VisualCompositionRefiner`

```tsx
<VisualCompositionRefiner
  episodeId={episodeId}
  canvasImageUrl={imageUrl}
  pieceId="reel"
  onApply={(refinedUrl) => {
    // Update canvas with refined image
  }}
/>
```

### Hook: `useVisualRefinement`

```tsx
const { isProcessing, result, refine } = useVisualRefinement();

await refine({
  imageUrl,
  intensity: "media",
  focus: "integral",
  episodeId,
});
```

## Database Schema

### `visual_refinements` Table

```sql
- id: uuid (primary key)
- episode_id: uuid (foreign key)
- original_image_url: text
- refined_image_url: text
- intensity: text ('sutil', 'media', 'alta')
- focus: text ('fondo', 'composicion', 'legibilidad', 'acabado', 'integral')
- analysis: jsonb (host bounds, improvements, restrictions)
- status: text ('completed', 'failed')
- created_at: timestamp
- updated_at: timestamp
```

## Principles Applied

### Gestalt Theory
- Proximity: Elements grouped by visual distance
- Similarity: Consistent shapes, colors, sizes
- Continuity: Smooth visual flow
- Closure: Complete incomplete shapes
- Figure-Ground: Clear subject separation
- Pregnance: Simplicity and distinctiveness

### Visual Hierarchy
- Clear primary focus
- Correct visual path
- Balanced element weights
- Intentional emphasis

### Editorial Design
- Professional quality
- Intimate aesthetic
- Psychological impact
- Premium feel
- Memorable without noise

## Environment Variables Required

```
TOGETHER_API_KEY    # For image generation
ANTHROPIC_API_KEY   # For Claude Vision analysis
```

## Cost Estimate

Per refinement:
- Claude Vision analysis: ~$0.001-0.005
- FLUX.1-pro generation: ~$0.01-0.05
- **Total: ~$0.015-0.055 per refinement**

## Troubleshooting

**Issue**: Host detected as background
**Solution**: Ensure subject is clearly visible and contrasted with background

**Issue**: Over-optimization despite "Sutil" setting
**Solution**: Check if focus is set to "integral" (try "fondo" instead)

**Issue**: Refinement looks too different
**Solution**: Try lower intensity level or specific focus mode

**Issue**: Takes too long
**Solution**: FLUX.1-pro typically takes 2-3 minutes; this is normal

## Future Enhancements

- [ ] Batch refinement for multiple pieces
- [ ] Custom refinement presets
- [ ] A/B testing interface
- [ ] Refinement history browsing
- [ ] Undo refinement to original
- [ ] Refine specific areas only (masking)
- [ ] Custom intensity curves

