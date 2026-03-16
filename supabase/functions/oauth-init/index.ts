import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// OAuth configuration per platform
const PLATFORM_CONFIG: Record<string, {
  authUrl: string;
  clientIdKey: string;
  scope: string;
  extraParams?: Record<string, string>;
}> = {
  instagram: {
    authUrl: "https://www.facebook.com/dialog/oauth",
    clientIdKey: "INSTAGRAM_CLIENT_ID",
    scope: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_insights",
    // auth_type=rerequest forces Facebook to re-show the page-selection dialog
    // even if the user previously authorized without selecting pages
    extraParams: { auth_type: "rerequest" },
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdKey: "YOUTUBE_CLIENT_ID",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    extraParams: { access_type: "offline", prompt: "consent" },
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize",
    clientIdKey: "TIKTOK_CLIENT_ID",
    scope: "user.info.basic,video.upload",
  },
};

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { platform, user_id } = await req.json();

    if (!platform || !user_id) {
      return new Response(JSON.stringify({ error: "Se requiere platform y user_id" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const config = PLATFORM_CONFIG[platform];
    if (!config) {
      return new Response(JSON.stringify({ error: `Plataforma no soportada: ${platform}` }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get(config.clientIdKey);
    if (!clientId) {
      return new Response(JSON.stringify({
        error: `${config.clientIdKey} no configurado. Agrega esta variable en los secretos de Supabase (Settings → Edge Functions → Secrets).`,
      }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/oauth-callback`;
    const state = btoa(JSON.stringify({ user_id, platform }));

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: config.scope,
      state,
      ...(config.extraParams ?? {}),
    });

    const authUrl = `${config.authUrl}?${params}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("oauth-init error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
