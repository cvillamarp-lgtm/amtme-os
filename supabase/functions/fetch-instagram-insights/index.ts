import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://amitampocomeexplicaron.com",
  "https://www.amitampocomeexplicaron.com",
  "https://amtmeos.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const GRAPH = "https://graph.facebook.com/v18.0";

// Auto-discover Instagram Business Account ID via Facebook Pages
async function discoverIgAccountId(
  accessToken: string
): Promise<{ igId: string; igUsername: string } | { error: string } | null> {
  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?` +
      new URLSearchParams({ access_token: accessToken, fields: "instagram_business_account,name,access_token" })
  );
  const pagesData = await pagesRes.json();

  // Token error (expired, revoked)
  if (pagesData.error) {
    return { error: `Token de Facebook inválido: ${pagesData.error.message}. Ve a Cuentas y reconecta Instagram.` };
  }

  // No pages returned — user didn't select pages during OAuth
  if (!pagesData.data?.length) {
    return {
      error:
        "No se encontraron Páginas de Facebook asociadas al token. " +
        "Durante el paso de autorización de Facebook debes SELECCIONAR tu página (marcar la casilla). " +
        "Ve a Cuentas → reconecta Instagram → en el diálogo de Facebook selecciona tu Página antes de continuar.",
    };
  }

  // Pages exist but none have Instagram Business linked
  const pagesWithIg = pagesData.data.filter((p: any) => p.instagram_business_account);
  if (pagesWithIg.length === 0) {
    const pageNames = pagesData.data.map((p: any) => p.name).join(", ");
    return {
      error:
        `Se encontraron ${pagesData.data.length} página(s) de Facebook (${pageNames}) pero ninguna tiene una cuenta de Instagram Business vinculada. ` +
        "Ve a tu Página de Facebook → Configuración → Instagram → Vincular cuenta de Instagram. Luego reconecta desde Audio Studio.",
    };
  }

  for (const page of pagesWithIg) {
    const igId = page.instagram_business_account.id;
    const igRes = await fetch(
      `${GRAPH}/${igId}?` + new URLSearchParams({ fields: "username,name,followers_count", access_token: accessToken })
    );
    const igData = await igRes.json();
    if (!igData.error) {
      return { igId, igUsername: igData.username || igData.name || "instagram" };
    }
  }
  return null;
}

// Fetch daily insights for a date range
async function fetchDailyInsights(
  igUserId: string,
  accessToken: string,
  since: number,
  until: number
): Promise<Record<string, Record<string, number>>> {
  const metrics = ["reach", "impressions", "profile_views"];
  const url =
    `${GRAPH}/${igUserId}/insights?` +
    new URLSearchParams({
      metric: metrics.join(","),
      period: "day",
      since: since.toString(),
      until: until.toString(),
      access_token: accessToken,
    });

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) throw new Error(`IG insights: ${data.error.message}`);

  // Build map: { "2026-03-10": { reach: 123, impressions: 456, profile_views: 78 } }
  const byDate: Record<string, Record<string, number>> = {};

  for (const metricObj of (data.data || [])) {
    const metricName = metricObj.name as string;
    for (const point of (metricObj.values || [])) {
      const date = new Date(point.end_time).toISOString().split("T")[0];
      if (!byDate[date]) byDate[date] = {};
      byDate[date][metricName] = point.value || 0;
    }
  }

  return byDate;
}

// Fetch current followers count
async function fetchFollowers(igUserId: string, accessToken: string): Promise<number> {
  const url =
    `${GRAPH}/${igUserId}?` +
    new URLSearchParams({ fields: "followers_count", access_token: accessToken });
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`IG followers: ${data.error.message}`);
  return data.followers_count || 0;
}

// Fetch recent media with basic fields
async function fetchRecentMedia(
  igUserId: string,
  accessToken: string,
  limit = 25
): Promise<any[]> {
  const url =
    `${GRAPH}/${igUserId}/media?` +
    new URLSearchParams({
      fields: "id,caption,media_type,thumbnail_url,media_url,timestamp,permalink,like_count,comments_count",
      limit: limit.toString(),
      access_token: accessToken,
    });
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`IG media: ${data.error.message}`);
  return data.data || [];
}

// Fetch insights for a single media post
async function fetchMediaInsights(
  mediaId: string,
  accessToken: string,
  mediaType: string
): Promise<{ reach: number; impressions: number; saves: number; shares: number }> {
  // Video content uses "video_views" instead of some metrics
  const metrics =
    mediaType === "VIDEO"
      ? "reach,impressions,saved,shares"
      : "reach,impressions,saved,shares";

  const url =
    `${GRAPH}/${mediaId}/insights?` +
    new URLSearchParams({ metric: metrics, access_token: accessToken });

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    // Insights not available for some media types (e.g., stories already expired)
    console.warn(`Media insights unavailable for ${mediaId}: ${data.error.message}`);
    return { reach: 0, impressions: 0, saves: 0, shares: 0 };
  }

  const result: Record<string, number> = {};
  for (const m of (data.data || [])) {
    result[m.name] = m.values?.[0]?.value || 0;
  }

  return {
    reach: result.reach || 0,
    impressions: result.impressions || 0,
    saves: result.saved || 0,
    shares: result.shares || 0,
  };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // User-scoped client for auth verification
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Service role client for reading tokens + writing results
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get Instagram account
    const { data: account, error: accountError } = await serviceClient
      .from("platform_accounts")
      .select("access_token, account_id, token_expiry, account_name")
      .eq("user_id", user.id)
      .eq("platform", "instagram")
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({
        error: "No hay cuenta de Instagram conectada. Ve a Cuentas → Conectar Instagram.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (!account.access_token) {
      return new Response(JSON.stringify({
        error: "Token de Instagram no disponible. Reconecta la cuenta.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (account.token_expiry && new Date(account.token_expiry) < new Date()) {
      return new Response(JSON.stringify({
        error: "Token de Instagram expirado. Ve a Cuentas y reconecta.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const accessToken = account.access_token as string;
    let igUserId = account.account_id as string | null;

    // Auto-discover IG account ID if missing
    if (!igUserId) {
      const discovered = await discoverIgAccountId(accessToken);
      if (!discovered) {
        return new Response(JSON.stringify({
          error: "No se encontró una cuenta de Instagram Business. Reconecta Instagram desde la página de Cuentas.",
        }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
      // Return descriptive error if discovery returned an error object
      if ("error" in discovered) {
        return new Response(JSON.stringify({ error: discovered.error }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
      igUserId = discovered.igId;
      // Persist account_id and account_name for future calls
      await serviceClient.from("platform_accounts").update({
        account_id: discovered.igId,
        account_name: discovered.igUsername,
      }).eq("user_id", user.id).eq("platform", "instagram");
    }

    // ── Fetch data ──────────────────────────────────────────────────────────

    // Date range: last 30 days
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

    // Run parallel fetches
    const [dailyInsights, followers, recentMedia] = await Promise.all([
      fetchDailyInsights(igUserId, accessToken, thirtyDaysAgo, now),
      fetchFollowers(igUserId, accessToken),
      fetchRecentMedia(igUserId, accessToken),
    ]);

    // ── Upsert daily account stats ─────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const accountStatsRows = Object.entries(dailyInsights).map(([fecha, metrics]) => ({
      user_id: user.id,
      fecha,
      followers: fecha === today ? followers : null, // only today gets real followers
      reach: metrics.reach || null,
      impressions: metrics.impressions || null,
      profile_views: metrics.profile_views || null,
    }));

    // Also ensure today's row has the current followers count
    if (!dailyInsights[today]) {
      accountStatsRows.push({ user_id: user.id, fecha: today, followers, reach: null, impressions: null, profile_views: null });
    } else {
      const todayRow = accountStatsRows.find(r => r.fecha === today);
      if (todayRow) todayRow.followers = followers;
    }

    if (accountStatsRows.length > 0) {
      const { error: statsError } = await serviceClient
        .from("instagram_account_stats")
        .upsert(accountStatsRows, { onConflict: "user_id,fecha" });
      if (statsError) console.error("Stats upsert error:", statsError);
    }

    // ── Fetch and upsert media insights ────────────────────────────────────
    const mediaInsightPromises = recentMedia.map(async (post: any) => {
      const insights = await fetchMediaInsights(post.id, accessToken, post.media_type);
      return {
        user_id: user.id,
        ig_media_id: post.id,
        ig_permalink: post.permalink || null,
        caption: post.caption ? post.caption.substring(0, 500) : null,
        media_type: post.media_type || null,
        thumbnail_url: post.thumbnail_url || post.media_url || null,
        posted_at: post.timestamp || null,
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
        reach: insights.reach,
        impressions: insights.impressions,
        saves: insights.saves,
        shares: insights.shares,
        fetched_at: new Date().toISOString(),
      };
    });

    const mediaRows = await Promise.all(mediaInsightPromises);

    if (mediaRows.length > 0) {
      const { error: mediaError } = await serviceClient
        .from("instagram_media_stats")
        .upsert(mediaRows, { onConflict: "user_id,ig_media_id" });
      if (mediaError) console.error("Media upsert error:", mediaError);
    }

    // ── Update platform_accounts with real stats + username ────────────────
    const reachValues = accountStatsRows.filter(r => r.reach != null).map(r => r.reach as number);
    const avgReach = reachValues.length > 0
      ? Math.round(reachValues.reduce((a, b) => a + b, 0) / reachValues.length)
      : 0;

    const totalLikes = mediaRows.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = mediaRows.reduce((sum, p) => sum + (p.comments || 0), 0);
    const totalReach = mediaRows.reduce((sum, p) => sum + (p.reach || 0), 0);
    const avgEngagement = totalReach > 0
      ? parseFloat((((totalLikes + totalComments) / totalReach) * 100).toFixed(2))
      : 0;

    // Get real username from IG API
    const profileRes = await fetch(
      `${GRAPH}/${igUserId}?` +
        new URLSearchParams({ fields: "username,followers_count,follows_count", access_token: accessToken })
    );
    const profileData = await profileRes.json();
    const username = profileData.username || account.account_name || "instagram";
    const followsCount = profileData.follows_count || 0;

    const now = new Date().toISOString();
    await serviceClient.from("platform_accounts").update({
      account_name: username,
      metadata: {
        url: `https://www.instagram.com/${username}/`,
        followers: followers,
        following: followsCount,
        avg_reach: avgReach || null,
        avg_engagement: avgEngagement || null,
      },
      synced_at: now,
      sync_status: "success",
      sync_error: null,
    }).eq("user_id", user.id).eq("platform", "instagram");

    return new Response(
      JSON.stringify({
        success: true,
        days_fetched: accountStatsRows.length,
        posts_fetched: mediaRows.length,
        followers,
        username,
        avg_reach: avgReach,
        avg_engagement: avgEngagement,
        synced_at: now,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-instagram-insights error:", e);
    // Best-effort: mark sync as failed so the UI can show the error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (supabaseUrl) {
        const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        // We don't have user.id here in the catch scope, so skip the DB update
        // The error will be shown via the response
      }
    } catch { /* ignore */ }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
