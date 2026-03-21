import "../_shared/deno-shims.d.ts";

/**
 * AMTME — claude-call Edge Function
 * Wrapper seguro para la Anthropic Claude API.
 * ⚠️ SECURITY: La API key NUNCA se expone al frontend.
 *    Toda llamada a Claude pasa exclusivamente por esta función.
 *
 * Instrucción Maestra §18 — Wrapper Edge Function
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Auth — Bearer JWT requerido
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(cors, "UNAUTHORIZED", "Missing authorization", 401);
    }

    const { systemPrompt, userPrompt, maxTokens = 4096 } = await req.json();

    if (!systemPrompt || !userPrompt) {
      return errorResponse(cors, "VALIDATION_ERROR", "Se requieren systemPrompt y userPrompt", 400);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return errorResponse(cors, "CONFIGURATION_ERROR", "ANTHROPIC_API_KEY no configurada", 500);
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const status = res.status;
      const body = await res.text().catch(() => "");
      console.error(`[claude-call] Anthropic API error ${status}: ${body}`);
      return errorResponse(cors, "AI_ERROR", `Claude API error ${status}`, 502, { upstream_status: status });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[claude-call] Unexpected error:", e);
    return errorResponse(cors, "INTERNAL_ERROR", e instanceof Error ? e.message : "Unknown error", 500);
  }
});
