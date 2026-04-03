# LinkedIn OAuth Integration - Status & Setup

## ✅ What's Deployed

**Production URL**: https://amtmeos.vercel.app

### Core Components
1. **LinkedIn helper** (`supabase/functions/_shared/linkedin.ts`)
   - OAuth token refresh
   - Text post publishing
   - Image post publishing (with asset registration)

2. **OAuth endpoints** (`api/auth/linkedin/`)
   - `/api/auth/linkedin/authorize` - Initiates OAuth flow
   - `/api/auth/linkedin/callback` - Handles callback, returns refresh token

3. **Updated publish function** (`supabase/functions/publish-atomic-content/index.ts`)
   - Calls LinkedIn helper to publish pending items
   - Stores published URLs in distribution_queue
   - Scheduled daily at 12pm UTC (Vercel Cron)

4. **Cron Schedule** (Updated for Vercel Hobby)
   - 9am UTC: Process atomization queue → create atomic pieces
   - 12pm UTC: Publish atomic content to LinkedIn
   - 3pm UTC: Track distribution metrics

---

## 🔧 Required Setup (3 Steps)

### 1️⃣ LinkedIn Developer Credentials

Create app at https://www.linkedin.com/developers/apps
```
Client ID: [Copy from app settings]
Client Secret: [Copy from app settings]
```

Add redirect URI:
```
https://amtmeos.vercel.app/api/auth/linkedin/callback
https://localhost:3000/api/auth/linkedin/callback
```

### 2️⃣ Initial OAuth Setup

Add temporary env vars:
```bash
vercel env add LINKEDIN_CLIENT_ID <your_client_id>
vercel env add LINKEDIN_CLIENT_SECRET <your_client_secret>
```

Authorize once at:
```
https://amtmeos.vercel.app/api/auth/linkedin/authorize
```

You'll get JSON with refresh_token and person ID.

### 3️⃣ Permanent Env Setup

Add to Vercel:
```bash
vercel env add LINKEDIN_REFRESH_TOKEN <refresh_token_from_step_2>
vercel env add LINKEDIN_USER_URN urn:li:person:<person_id_from_step_2>
vercel env add LINKEDIN_REDIRECT_URI https://amtmeos.vercel.app/api/auth/linkedin/callback
```

Sync locally:
```bash
vercel env pull .env.local
```

---

## 📊 How It Works

```
Episode Reaches "assets_ready"
     ↓
Trigger fires → Insert into atomization_queue
     ↓
[9am UTC] Cron: process-atomization-queue
     ↓
Edge Function: atomize-episode-content (Claude extracts 10-15 pieces)
     ↓
Insert into atomic_content + distribution_queue
     ↓
[12pm UTC] Cron: publish-atomic-content
     ↓
For each piece with "linkedin" in platforms:
   - publishToLinkedInHandler()
   - LinkedIn API creates post
   - Save URL to published_urls
     ↓
[3pm UTC] Cron: track-distribution-metrics
     ↓
Fetch views/engagement from LinkedIn (placeholder for now)
     ↓
Update atomic_content.performance_metrics
     ↓
Dashboard shows real-time stats
```

---

## 🚀 Testing After Setup

1. Check env vars are set:
   ```bash
   vercel env ls
   ```

2. Manually trigger atomization (Edge Function):
   ```bash
   curl -X POST https://amtmeos.vercel.app/api/cron/process-atomization-queue \
     -H "Authorization: Bearer $VERCEL_CRON_SECRET"
   ```

3. Check Vercel logs:
   ```bash
   vercel logs --tail
   ```

4. Look for LinkedIn posts in your feed (personal profile)

5. Watch Distribution Dashboard:
   ```
   https://amtmeos.vercel.app/dashboard
   ```

---

## 📝 Files Modified/Created

**New Files:**
- `supabase/functions/_shared/linkedin.ts` - LinkedIn OAuth & API helper
- `api/auth/linkedin/authorize.ts` - OAuth initiation
- `api/auth/linkedin/callback.ts` - OAuth callback handler
- `docs/LINKEDIN_OAUTH_SETUP.md` - Detailed setup guide
- `docs/LINKEDIN_QUICK_START.md` - Quick reference

**Modified Files:**
- `supabase/functions/publish-atomic-content/index.ts` - Now calls LinkedIn helper
- `vercel.json` - Updated cron schedules for Hobby plan limits

---

## 🔍 Troubleshooting

| Issue | Fix |
|-------|-----|
| `LINKEDIN_CLIENT_ID not configured` | Run Step 2 OAuth setup |
| `LINKEDIN_REFRESH_TOKEN not configured` | Add to Vercel after OAuth callback |
| 401 Unauthorized | Refresh token expired, re-run OAuth |
| Posts not appearing | Check Vercel logs at 12pm UTC |
| Dashboard shows 0 views | Metrics refresh not yet implemented (coming next) |

---

## ⏭️ Next Steps

1. **Set up OAuth credentials** (this guide)
2. **Test with 1 episode** (create atomic pieces manually)
3. **Monitor Dashboard** for publication
4. **Implement metrics APIs** (LinkedIn, YouTube, TikTok)
5. **Implement email distribution**
6. **Scale to full automation**

---

**Status**: LinkedIn OAuth is LIVE and ready for configuration. After setup, atomic content will auto-publish to LinkedIn daily at 12pm UTC.
