# Visual Assets Auto-Generation Setup

## Overview
El sistema genera automáticamente 4 tipos de assets visuales cuando se completa el pipeline de Script Engine:
- **Reel** (1080x1920px vertical)
- **Story** (1080x1920px vertical)
- **Cover** (3000x3000px square)
- **Thumbnail** (1280x720px landscape)

## Configuration

### Option 1: Together AI (Recomendado)
1. Crea cuenta en together.ai
2. Obtén tu API key
3. Configura en Supabase:

```bash
supabase secrets set TOGETHER_API_KEY="your-api-key"
```

## How It Works

1. User crea episodio
2. Script Engine se ejecuta automáticamente
3. Assets se generan en paralelo (4 imágenes)
4. Se almacenan en episode-assets bucket
5. URLs disponibles para usar en Visual OS

## Costs
- Together AI: ~$0.01-0.05 por imagen
- 4 imágenes/episodio = ~$0.04-0.20/episodio

## Troubleshooting
- Verifica TOGETHER_API_KEY en Supabase
- Revisa logs en Functions dashboard
- Asegúrate que bucket episode-assets existe
