# LinkedIn OAuth Setup

## Prerequisites

1. LinkedIn Developer Account - https://www.linkedin.com/developers/
2. Create a LinkedIn App in the LinkedIn Developer Portal
3. Request access to Marketing Developer Platform (for Share API)

## Environment Variables

Add these to your `.env.local` and Vercel deployment:

```env
# LinkedIn OAuth Credentials
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REFRESH_TOKEN=your_refresh_token
LINKEDIN_USER_URN=urn:li:person:YOUR_PERSON_ID
```

## Getting Your Credentials

### 1. LinkedIn App Creation

1. Go to https://www.linkedin.com/developers/apps
2. Create a new app:
   - App name: "SkillsPodcast Atomizer"
   - App owner: Your LinkedIn company page
   - Legal agreement: Accept
3. Generate OAuth credentials:
   - Go to "Auth" tab
   - Note your **Client ID** and **Client Secret**

### 2. Authorized Redirect URIs

Add to your app settings:
```
https://your-domain.com/api/auth/linkedin/callback
https://localhost:3000/api/auth/linkedin/callback (for development)
```

### 3. Get Your Person URN

Your LinkedIn Person ID (used in LINKEDIN_USER_URN):

```bash
# After OAuth authorization, make this request:
curl -X GET 'https://api.linkedin.com/v2/me' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'LinkedIn-Version: 202412'
```

Response:
```json
{
  "id": "YOUR_PERSON_ID"
}
```

Your URN is: `urn:li:person:YOUR_PERSON_ID`

### 4. Get Initial Refresh Token

First-time setup requires manual OAuth flow:

1. Direct user to:
```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=https://your-domain.com/api/auth/linkedin/callback&scope=w_member_social
```

2. User authorizes → receives authorization code
3. Exchange code for access token:
```bash
curl -X POST 'https://www.linkedin.com/oauth/v2/accessToken' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=authorization_code&code=AUTHORIZATION_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=https://your-domain.com/api/auth/linkedin/callback'
```

Response includes:
- `access_token` (short-lived, ~1 hour)
- `refresh_token` (long-lived, use this in LINKEDIN_REFRESH_TOKEN)

## Required Scopes

The system uses this scope for publishing:
- `w_member_social` - Write to member's social feed

## Testing

Once configured, test with cURL:

```bash
# Test post (text only)
curl -X POST 'https://api.linkedin.com/v2/ugcPosts' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'LinkedIn-Version: 202412' \
  -d '{
    "owner": "urn:li:person:YOUR_PERSON_ID",
    "text": {
      "content": "Test post from SkillsPodcast Atomizer"
    },
    "distribution": {
      "feedDistribution": "MAIN_FEED",
      "targetEntities": [],
      "thirdPartyDistributionChannels": []
    }
  }'
```

## Troubleshooting

### "LINKEDIN_REFRESH_TOKEN not configured"
- Add `LINKEDIN_REFRESH_TOKEN` to Vercel environment variables
- Run `vercel env pull .env.local` to sync locally

### 401 Unauthorized
- Refresh token may have expired
- Re-run OAuth flow to get new refresh token

### 400 Bad Request
- Check your LINKEDIN_USER_URN format: `urn:li:person:XXXXXXXX`
- Verify all required env vars are set

### Text too long
- LinkedIn has 3000 character limit for post content
- Atomizer automatically truncates if needed

## Monitoring

Check published posts:
```bash
# Get recent posts
curl -X GET 'https://api.linkedin.com/v2/ugcPosts?q=authors&authors[0]=urn:li:person:YOUR_PERSON_ID&count=10' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'LinkedIn-Version: 202412'
```

## Rate Limiting

LinkedIn API limits:
- 30 posts per day per user
- 300 requests per minute
- Monitor `/api/cron/publish-atomic-content` logs for rate limit errors

---

**Status**: LinkedIn OAuth integration is LIVE. Text posts work immediately. Image posts require asset registration (implemented).
