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

// ── Platform sync functions ──────────────────────────────────────────────────

async function syncInstagram(account: Record<string, unknown>) {
  const accessToken = account.access_token as string;
  let igUserId = account.account_id as string | null;

  // Discover IG account ID if missing
  if (!igUserId) {
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?` +
        new URLSearchParams({ access_token: accessToken, fields: "instagram_business_account,name" })
    );
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(`Facebook API: ${pagesData.error.message}`);
    if (!pagesData.data?.length) {
      throw new Error(
        "No se encontraron Páginas de Facebook en el token. " +
          "Reconecta Instagram y selecciona tu Página cuando Facebook lo pida."
      );
    }
    for (const page of pagesData.data) {
      if (page.instagram_business_account) {
        igUserId = page.instagram_business_account.id;
        break;
      }
    }
    if (!igUserId) {
      throw new Error(
        "Ninguna de tus Páginas de Facebook tiene una cuenta de Instagram Business vinculada. " +
          "Ve a tu Página → Configuración → Instagram → Vincular cuenta."
      );
    }
  }

  // Fetch profile
  const profileRes = await fetch(
    `${GRAPH}/${igUserId}?` +
      new URLSearchParams({
        fields: "username,followers_count,follows_count,media_count,biography,website",
        access_token: accessToken,
      })
  );
  const profile = await profileRes.json();
  if (profile.error) throw new Error(`Instagram API: ${profile.error.message}`);

  const username = profile.username || "instagram";

  return {
    account_name: username,
    account_id: igUserId,
    metadata: {
      url: `https://www.instagram.com/${username}/`,
      followers: profile.followers_count ?? null,
      following: profile.follows_count ?? null,
      media_count: profile.media_count ?? null,
      biography: profile.biography ?? null,
    },
  };
}

async function syncYouTube(account: Record<string, unknown>) {
  const accessToken = account.access_token as string;

  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (data.error) throw new Error(`YouTube API: ${data.error.message}`);
  if (!data.items?.length) throw new Error("No se encontró canal de YouTube.");

  const ch = data.items[0];
  const stats = ch.statistics;
  const snippet = ch.snippet;

  return {
    account_name: snippet.title as string,
    account_id: ch.id as string,
    metadata: {
      url: `https://www.youtube.com/channel/${ch.id}`,
      followers: stats.subscriberCount ? parseInt(stats.subscriberCount) : null,
      following: null,
      video_count: stats.videoCount ? parseInt(stats.videoCount) : null,
      view_count: stats.viewCount ? parseInt(stats.viewCount) : null,
    },
  };
}

async function syncTikTok(account: Record<string, unknown>) {
  const accessToken = account.access_token as string;

  const res = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,follower_count,following_count,bio_description",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(`TikTok API: ${data.error.message || data.error.code}`);
  }

  const u = data.data?.user;
  if (!u) throw new Error("No se pudo obtener datos de usuario de TikTok.");

  const username = u.username || u.display_name || "tiktok";

  return {
    account_name: username as string,
    account_id: u.open_id as string,
    metadata: {
      url: `https://www.tiktok.com/@${username}`,
      followers: u.follower_count ?? null,
      following: u.following_count ?? null,
    },
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { platform } = await req.json();
    if (!platform) {
      return new Response(JSON.stringify({ error: "Se requiere platform" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch account with token
    const { data: account, error: accountError } = await serviceClient
      .from("platform_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", platform)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: "Cuenta no encontrada." }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!account.access_token) {
      return new Response(JSON.stringify({
        error: "No hay token de acceso. Conecta la cuenta vía OAuth primero.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (account.token_expiry && new Date(account.token_expiry) < new Date()) {
      return new Response(JSON.stringify({
        error: "Token expirado. Ve a Cuentas y reconecta.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Mark as syncing
    await serviceClient.from("platform_accounts").update({
      sync_status: "syncing",
      sync_error: null,
    }).eq("id", account.id);

    // Run sync for the platform
    let syncResult: { account_name: string; account_id: string; metadata: Record<string, unknown> };

    try {
      if (platform === "instagram") {
        syncResult = await syncInstagram(account);
      } else if (platform === "youtube") {
        syncResult = await syncYouTube(account);
      } else if (platform === "tiktok") {
        syncResult = await syncTikTok(account);
      } else {
        throw new Error(`Sincronización no disponible para la plataforma: ${platform}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      await serviceClient.from("platform_accounts").update({
        sync_status: "error",
        sync_error: msg,
        synced_at: new Date().toISOString(),
      }).eq("id", account.id);

      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Merge metadata: preserve existing fields (notes, avg_reach, etc.) and overlay API data
    const existingMeta = (account.metadata && typeof account.metadata === "object" && !Array.isArray(account.metadata))
      ? account.metadata as Record<string, unknown>
      : {};
    const mergedMeta = { ...existingMeta, ...syncResult.metadata };

    // Persist results
    await serviceClient.from("platform_accounts").update({
      account_name: syncResult.account_name,
      account_id: syncResult.account_id,
      metadata: mergedMeta,
      sync_status: "success",
      sync_error: null,
      synced_at: new Date().toISOString(),
    }).eq("id", account.id);

    return new Response(
      JSON.stringify({
        success: true,
        account_name: syncResult.account_name,
        account_id: syncResult.account_id,
        metadata: mergedMeta,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-platform-account error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
