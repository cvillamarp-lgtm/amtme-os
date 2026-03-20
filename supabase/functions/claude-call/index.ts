/// <reference path="../_shared/deno-shims.d.ts" />

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

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Auth — Bearer JWT requerido
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { systemPrompt, userPrompt, maxTokens = 4096 } = await req.json();

    if (!systemPrompt || !userPrompt) {
      return new Response(JSON.stringify({ error: "Se requieren systemPrompt y userPrompt" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
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
      return new Response(
        JSON.stringify({ error: `Claude API error ${status}` }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[claude-call] Unexpected error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
