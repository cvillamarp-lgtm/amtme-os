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

    // User-scoped client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { publication_id } = await req.json();
    if (!publication_id) {
      return new Response(JSON.stringify({ error: "publication_id requerido" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch the publication (RLS ensures ownership)
    const { data: pub, error: pubError } = await supabase
      .from("publications")
      .select("*")
      .eq("id", publication_id)
      .single();

    if (pubError || !pub) {
      return new Response(JSON.stringify({ error: "Publicación no encontrada" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const platformBase = (pub.platform as string).split("_")[0]; // "instagram", "tiktok", "youtube"

    // Fetch platform account tokens (service role needed to read sensitive columns)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: account, error: accountError } = await serviceClient
      .from("platform_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", platformBase)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({
        error: `No hay cuenta de ${platformBase} registrada. Ve a Cuentas → Conectar.`,
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (!account.oauth_connected || !account.access_token) {
      return new Response(JSON.stringify({
        error: `Cuenta de ${platformBase} no autorizada vía OAuth. Ve a Cuentas y presiona "Conectar".`,
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (account.token_expiry && new Date(account.token_expiry) < new Date()) {
      return new Response(JSON.stringify({
        error: "Token expirado. Ve a Cuentas y vuelve a conectar tu cuenta.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const accessToken = account.access_token as string;
    let publishedLink: string | null = null;

    // ── Instagram ──────────────────────────────────────────────────────────
    if (platformBase === "instagram") {
      const igUserId = account.account_id;
      if (!igUserId) {
        return new Response(JSON.stringify({ error: "ID de cuenta de Instagram no encontrado. Reconecta la cuenta." }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const meta = (pub as any).metadata || {};
      const imageUrl = meta.image_url as string | undefined;
      if (!imageUrl) {
        return new Response(JSON.stringify({
          error: "Sin imagen para publicar. Agrega una image_url en los metadatos de la publicación.",
        }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const caption = [
        pub.copy_final || "",
        pub.cta_text ? `\n${pub.cta_text}` : "",
        pub.hashtags && pub.hashtags.length > 0 ? `\n\n${pub.hashtags.join(" ")}` : "",
      ].join("").trim();

      // Step 1: Create media container
      const containerRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
      });
      const containerData = await containerRes.json();
      if (containerData.error) {
        throw new Error(`Instagram (crear contenedor): ${containerData.error.message}`);
      }

      // Step 2: Publish the container
      const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
      });
      const publishData = await publishRes.json();
      if (publishData.error) {
        throw new Error(`Instagram (publicar): ${publishData.error.message}`);
      }

      publishedLink = `https://www.instagram.com/p/${publishData.id}`;

    // ── YouTube ────────────────────────────────────────────────────────────
    } else if (platformBase === "youtube") {
      return new Response(JSON.stringify({
        error: "YouTube requiere subir un archivo de video. Usa 'Marcar como publicado' manualmente después de subir en YouTube Studio.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    // ── TikTok ─────────────────────────────────────────────────────────────
    } else if (platformBase === "tiktok") {
      return new Response(JSON.stringify({
        error: "La publicación automática en TikTok requiere un archivo de video. Usa 'Marcar como publicado' manualmente.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    } else {
      return new Response(JSON.stringify({
        error: `Publicación automática en ${platformBase} no disponible. Usa 'Marcar como publicado' manualmente.`,
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Update publication to published
    await supabase.from("publications").update({
      status: "published",
      published_at: new Date().toISOString(),
      link_published: publishedLink,
    }).eq("id", publication_id);

    return new Response(JSON.stringify({ success: true, link: publishedLink }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("post-publication error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
