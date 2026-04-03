# Instagram Reels Integration

## Credentials (Already Set)

✅ **Instagram Business Account ID**: `143642230942089`
✅ **Access Token**: `EAAgHzdRCUhYBRKihZATCYjgca2pyjzvbszr1hbpX0eGPUNS3NW77URovb9Mvg9M6EA07xUt3MERMglIVZC5ZAx7iZBx8HB5pNcxA6ty27ghtkXgkWgfZAbEYlWkZA4SdSAUTqh4Mq1gFOAyi9tuei83usU4JDttf5ahq5XXpadHLFZBpIMoveRN4Lkv9an5I7arcIibOMEO3NwyxZArW2JExmnK08WIR77yiQuyD9DXxvAnSG8yQudDMtx6jodDg0ktX9O4Bfk25o8osDsNFDnoo07xfNAZD`

## Setup (1 Step)

Add to Vercel environment variables:

```bash
vercel env add INSTAGRAM_BUSINESS_ACCOUNT_ID 143642230942089
vercel env add INSTAGRAM_ACCESS_TOKEN EAAgHzdRCUhYBRKihZATCYjgca2pyjzvbszr1hbpX0eGPUNS3NW77URovb9Mvg9M6EA07xUt3MERMglIVZC5ZAx7iZBx8HB5pNcxA6ty27ghtkXgkWgfZAbEYlWkZA4SdSAUTqh4Mq1gFOAyi9tuei83usU4JDttf5ahq5XXpadHLFZBpIMoveRN4Lkv9an5I7arcIibOMEO3NwyxZArW2JExmnK08WIR77yiQuyD9DXxvAnSG8yQudDMtx6jodDg0ktX9O4Bfk25o8osDsNFDnoo07xfNAZD
```

Sync locally:
```bash
vercel env pull .env.local
```

Done! Reels will publish daily at 12pm UTC.

---

## How It Works

### Video Reels
When an atomic piece has:
- Platform: `instagram_reel`
- `video_url`: URL to MP4 video (must be accessible via HTTPS)

The system will:
1. Register video with Instagram Graph API
2. Create Reel container with headline + body + CTA as caption
3. Publish to your Instagram Business account
4. Store published URL and media ID

### Feed Posts
When an atomic piece has:
- Platform: `instagram_feed`
- `image_url`: URL to JPG/PNG image

The system will:
1. Create carousel/feed post
2. Use image as cover + caption
3. Publish to feed

### Metrics
Every 3pm UTC, the system fetches:
- Impressions (views)
- Engagement (likes, comments)
- Shares
- Reach

Updates `atomic_content.performance_metrics`

---

## Capabilities

✅ **Reels** - Short video posts (15-90 seconds)
✅ **Feed Posts** - Image carousel + text
✅ **Captions** - Auto-generates from headline + body + CTA
✅ **Metrics** - Real-time engagement tracking
✅ **Scheduling** - Publish daily at 12pm UTC
✅ **Retry Logic** - Auto-retry failed publishes

---

## API Limits

- **30 Reels per day** per Instagram Business account
- **Reel video must be**:
  - MP4 format
  - 15 seconds - 90 seconds duration
  - 1080x1920px (vertical)
  - Accessible via public HTTPS URL

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 Unauthorized | Access token expired, generate new one in Meta Developers |
| Video upload failed | Ensure video is MP4, vertical (1080x1920), 15-90 seconds |
| Media not found | Check video_url is publicly accessible |
| Rate limit | Daily limit is 30 Reels, wait until next day |

---

## Next Steps

1. ✅ Set environment variables (this guide)
2. Create an episode with video files
3. System auto-generates atomic Reels
4. Watch Distribution Dashboard for publication
5. Track performance metrics in real-time

---

**Status**: Instagram Reels integration is LIVE and ready to use.
