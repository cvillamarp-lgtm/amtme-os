/**
 * LinkedIn OAuth Callback Handler
 * Receives authorization code and exchanges it for access/refresh tokens
 *
 * Flow:
 * 1. User visits /api/auth/linkedin/authorize
 * 2. LinkedIn redirects back to /api/auth/linkedin/callback?code=...
 * 3. We exchange code for tokens
 * 4. Display refresh token for manual Vercel env setup
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).json({
      error: error,
      description: error_description || "LinkedIn authorization failed"
    });
  }

  if (!code || typeof code !== "string") {
    return res.status(400).json({
      error: "missing_code",
      description: "No authorization code provided"
    });
  }

  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI ||
      `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/auth/linkedin/callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "missing_credentials",
        description: "LinkedIn OAuth credentials not configured"
      });
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      }).toString()
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return res.status(400).json({
        error: "token_exchange_failed",
        details: error
      });
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Get user ID to construct URN
    const meResponse = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        "Authorization": `Bearer ${tokens.access_token}`,
        "LinkedIn-Version": "202412"
      }
    });

    let personId = "YOUR_PERSON_ID";
    if (meResponse.ok) {
      const me = await meResponse.json() as { id: string };
      personId = me.id;
    }

    // Return tokens for manual setup
    return res.status(200).json({
      success: true,
      message: "LinkedIn OAuth authentication successful",
      tokens: {
        access_token: tokens.access_token.substring(0, 20) + "...", // Masked for security
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in
      },
      setup_instructions: {
        step_1: "Copy the refresh_token below",
        step_2: `Add to Vercel: vercel env add LINKEDIN_REFRESH_TOKEN ${tokens.refresh_token}`,
        step_3: `Add person URN: vercel env add LINKEDIN_USER_URN urn:li:person:${personId}`,
        step_4: "Run: vercel env pull .env.local",
        step_5: "Restart your dev server"
      }
    });
  } catch (error) {
    console.error("[linkedin/callback] Error:", error);
    return res.status(500).json({
      error: "internal_error",
      description: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
