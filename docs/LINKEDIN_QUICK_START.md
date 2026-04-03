# LinkedIn OAuth - Quick Start

## 3-Step Setup

### Step 1: Create LinkedIn App

1. Go to https://www.linkedin.com/developers/apps
2. Click "Create app"
   - App name: `skillspodcast-atomizer`
   - LinkedIn Page: Your podcast company page
   - App logo: Upload SkillsPodcast logo
   - App owner email: Your email
3. Accept terms and create
4. Go to "Auth" tab and **note your Client ID and Client Secret**

### Step 2: Add Redirect URI

In app settings → "Authorized redirect URLs", add:
```
https://amtmeos.vercel.app/api/auth/linkedin/callback
https://localhost:3000/api/auth/linkedin/callback
```

### Step 3: Get Refresh Token

1. Add temporary env vars to Vercel:
   ```bash
   vercel env add LINKEDIN_CLIENT_ID <your_client_id>
   vercel env add LINKEDIN_CLIENT_SECRET <your_client_secret>
   ```

2. Run this once to get your refresh token:
   ```bash
   https://amtmeos.vercel.app/api/auth/linkedin/authorize
   ```

3. You'll be redirected back with your refresh token in JSON
4. Copy the refresh token and add permanently:
   ```bash
   vercel env add LINKEDIN_REFRESH_TOKEN <refresh_token_from_response>
   vercel env add LINKEDIN_USER_URN urn:li:person:<id_from_response>
   ```

5. Sync locally:
   ```bash
   vercel env pull .env.local
   ```

6. Restart dev server

Done! LinkedIn posts will now publish automatically.

## Test It

After setup, any atomic content piece with `linkedin` in platforms will publish within 30 minutes (Vercel Cron every 30min).

Check the **Distribution Dashboard** at `/dashboard` to see publication status and performance.

---

**Troubleshooting:**
- `LINKEDIN_REFRESH_TOKEN not configured` → Run step 3 again
- Post not appearing → Check `/api/cron/publish-atomic-content` in Vercel logs
- Authorization fails → Verify Client ID/Secret are correct
