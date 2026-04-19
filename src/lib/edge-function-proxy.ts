/**
 * API Proxy para Edge Functions
 * Este archivo configura las rutas que actúan como proxy hacia las Edge Functions de Supabase
 * Las tablas usan middleware en App.tsx para redirigir las llamadas
 */

import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/services/functions/invokeEdgeFunction";
import type {
  EdgeFunctionApiError,
  CleanTextResponse,
  SemanticMapResponse,
  GenerateOutputsResponse,
} from "@/integrations/supabase/edge-function-types";

// Construir URLs de Edge Functions dinámicamente desde VITE_SUPABASE_URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Only used for health-check GET requests (invokeEdgeFunction only does POST)
const EDGE_FUNCTION_URLS = {
  "clean-text": `${SUPABASE_URL}/functions/v1/clean-text`,
  "semantic-map": `${SUPABASE_URL}/functions/v1/semantic-map`,
  "generate-outputs": `${SUPABASE_URL}/functions/v1/generate-outputs`,
};

export interface ProxyRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Llamar a una Edge Function a través del proxy
 * Usa la autenticación de Supabase existente
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  options: ProxyRequestOptions = {}
): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  if (!token) {
    throw new Error("No authentication token found");
  }

  const url = EDGE_FUNCTION_URLS[functionName as keyof typeof EDGE_FUNCTION_URLS];
  if (!url) {
    throw new Error(`Unknown function: ${functionName}`);
  }

  const response = await fetch(url, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errBody = await response.json() as EdgeFunctionApiError & { error?: string };
      if (errBody?.message) errorMessage = errBody.message;
      else if (errBody?.error) errorMessage = errBody.error;
    } catch {
      // Not JSON — keep statusText
    }
    // Edge Function error logged - thrown as Error for caller handling
    throw new Error(`${functionName} failed: ${errorMessage}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Clean Text - Limpia texto usando Claude
 * Uses the canonical invokeEdgeFunction client (token refresh + retry).
 */
export async function callCleanText(rawText: string): Promise<CleanTextResponse> {
  return invokeEdgeFunction<CleanTextResponse>("clean-text", { raw_text: rawText });
}

/**
 * Semantic Map - Genera análisis semántico
 * Uses the canonical invokeEdgeFunction client (token refresh + retry).
 */
export async function callSemanticMap(cleanedText: string): Promise<SemanticMapResponse> {
  return invokeEdgeFunction<SemanticMapResponse>("semantic-map", { cleaned_text: cleanedText });
}

/**
 * Generate Outputs - Genera 10 tipos de contenido en paralelo
 * Uses the canonical invokeEdgeFunction client (token refresh + retry).
 */
export async function callGenerateOutputs(semanticMapId: string, semanticJson: Record<string, unknown>): Promise<GenerateOutputsResponse> {
  return invokeEdgeFunction<GenerateOutputsResponse>("generate-outputs", {
    semantic_map_id: semanticMapId,
    semantic_json: semanticJson,
  });
}

/**
 * Health check para verificar que las Edge Functions están disponibles
 */
export async function healthCheckEdgeFunctions(): Promise<boolean> {
  try {
    const functions = Object.keys(EDGE_FUNCTION_URLS) as Array<keyof typeof EDGE_FUNCTION_URLS>;
    const checks = await Promise.all(
      functions.map(async (fn) => {
        try {
          await callEdgeFunction(fn, { method: "GET" });
          return true;
        } catch {
          return false;
        }
      })
    );
    return checks.every((c) => c);
  } catch {
    return false;
  }
}
