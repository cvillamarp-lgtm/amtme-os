/**
 * LinkedIn OAuth Authorization Endpoint
 * Redirects user to LinkedIn login to authorize the app
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI ||
    `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/auth/linkedin/callback`;

  if (!clientId) {
    return res.status(500).json({
      error: "missing_credentials",
      description: "LINKEDIN_CLIENT_ID not configured"
    });
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "w_member_social",
    state: Math.random().toString(36).substring(7) // CSRF protection
  });

  const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

  return res.redirect(linkedInAuthUrl);
}
