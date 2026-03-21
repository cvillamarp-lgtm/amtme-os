import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

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
      return errorResponse(cors, "UNAUTHORIZED", "No autorizado", 401);
    }

    const { platform, user_id } = await req.json();

    if (!platform || !user_id) {
      return errorResponse(cors, "VALIDATION_ERROR", "Se requiere platform y user_id", 400);
    }

    const config = PLATFORM_CONFIG[platform];
    if (!config) {
      return errorResponse(cors, "VALIDATION_ERROR", `Plataforma no soportada: ${platform}`, 400);
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
    return errorResponse(cors, "INTERNAL_ERROR", e instanceof Error ? e.message : "Error desconocido", 500);
  }
});
