import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const cors = getCorsHeaders(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  const appUrl = Deno.env.get("APP_URL") || "https://amtme-os.lovable.app";

  // OAuth provider returned an error
  if (oauthError || !code || !stateRaw) {
    const msg = errorDesc || oauthError || "Parámetros faltantes en la respuesta";
    return Response.redirect(`${appUrl}/accounts?oauth_error=${encodeURIComponent(msg)}`);
  }

  // Decode state
  let state: { user_id: string; platform: string };
  try {
    state = JSON.parse(atob(stateRaw));
  } catch {
    return Response.redirect(`${appUrl}/accounts?oauth_error=invalid_state`);
  }

  const { user_id, platform } = state;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const callbackUrl = `${supabaseUrl}/functions/v1/oauth-callback`;

  try {
    let accessToken: string;
    let refreshToken: string | null = null;
    let tokenExpiry: string | null = null;
    let accountId: string | null = null;
    let accountName: string | null = null;

    // ── Instagram / Meta ─────────────────────────────────────────────────
    if (platform === "instagram") {
      // 1. Exchange auth code for short-lived user token
      const shortRes = await fetch(
        "https://graph.facebook.com/v18.0/oauth/access_token?" +
          new URLSearchParams({
            client_id: Deno.env.get("INSTAGRAM_CLIENT_ID")!,
            client_secret: Deno.env.get("INSTAGRAM_CLIENT_SECRET")!,
            redirect_uri: callbackUrl,
            code,
          })
      );
      const shortData = await shortRes.json();
      if (shortData.error) throw new Error(`FB token: ${shortData.error.message}`);

      // 2. Exchange for long-lived token (~60 days)
      const longRes = await fetch(
        "https://graph.facebook.com/v18.0/oauth/access_token?" +
          new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: Deno.env.get("INSTAGRAM_CLIENT_ID")!,
            client_secret: Deno.env.get("INSTAGRAM_CLIENT_SECRET")!,
            fb_exchange_token: shortData.access_token,
          })
      );
      const longData = await longRes.json();
      if (longData.error) throw new Error(`FB long token: ${longData.error.message}`);

      accessToken = longData.access_token;
      tokenExpiry = longData.expires_in
        ? new Date(Date.now() + longData.expires_in * 1000).toISOString()
        : null;

      // 3. Find connected Instagram Business Account via FB Pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?` +
          new URLSearchParams({
            access_token: accessToken,
            fields: "instagram_business_account,name",
          })
      );
      const pagesData = await pagesRes.json();

      if (pagesData.data?.length > 0) {
        const page = pagesData.data.find((p: any) => p.instagram_business_account);
        if (page) {
          const igId = page.instagram_business_account.id;
          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/${igId}?` +
              new URLSearchParams({ fields: "username,name", access_token: accessToken })
          );
          const igData = await igRes.json();
          accountId = igId;
          accountName = igData.username || igData.name || "Instagram";
        }
      }

    // ── YouTube / Google ──────────────────────────────────────────────────
    } else if (platform === "youtube") {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("YOUTUBE_CLIENT_ID")!,
          client_secret: Deno.env.get("YOUTUBE_CLIENT_SECRET")!,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
          code,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || null;
      tokenExpiry = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null;

      // Get channel info
      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const channelData = await channelRes.json();
      if (channelData.items?.length > 0) {
        accountId = channelData.items[0].id;
        accountName = channelData.items[0].snippet.title;
      }

    // ── TikTok ────────────────────────────────────────────────────────────
    } else if (platform === "tiktok") {
      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: Deno.env.get("TIKTOK_CLIENT_ID")!,
          client_secret: Deno.env.get("TIKTOK_CLIENT_SECRET")!,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
          code,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      accessToken = tokenData.data?.access_token || tokenData.access_token;
      refreshToken = tokenData.data?.refresh_token || tokenData.refresh_token || null;
      tokenExpiry = tokenData.data?.expires_in
        ? new Date(Date.now() + tokenData.data.expires_in * 1000).toISOString()
        : null;

      // Get user info
      const userRes = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userData = await userRes.json();
      if (userData.data?.user) {
        accountId = userData.data.user.open_id;
        accountName = userData.data.user.username || userData.data.user.display_name;
      }

    } else {
      return Response.redirect(`${appUrl}/accounts?oauth_error=unsupported_platform`);
    }

    // ── Store tokens (service role bypasses RLS) ──────────────────────────
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { error: upsertError } = await supabase.from("platform_accounts").upsert(
      {
        user_id,
        platform,
        account_name: accountName || platform,
        account_id: accountId || null,
        is_active: true,
        oauth_connected: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: tokenExpiry,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform" }
    );

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
      return Response.redirect(`${appUrl}/accounts?oauth_error=${encodeURIComponent(upsertError.message)}`);
    }

    return Response.redirect(`${appUrl}/accounts?oauth_success=${platform}`);
  } catch (e) {
    console.error("oauth-callback error:", e);
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return Response.redirect(`${appUrl}/accounts?oauth_error=${encodeURIComponent(msg)}`);
  }
});
