/**
 * API Proxy para Edge Functions
 * Este archivo configura las rutas que actúan como proxy hacia las Edge Functions de Supabase
 * Las tablas usan middleware en App.tsx para redirigir las llamadas
 */

import { supabase } from "@/integrations/supabase/client";

// Construir URLs de Edge Functions dinámicamente desde VITE_SUPABASE_URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const EDGE_FUNCTION_URLS = {
  "clean-text": `${SUPABASE_URL}/functions/v1/clean-text`,
  "semantic-map": `${SUPABASE_URL}/functions/v1/semantic-map`,
  "generate-outputs": `${SUPABASE_URL}/functions/v1/generate-outputs`,
};

export interface ProxyRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

/**
 * Llamar a una Edge Function a través del proxy
 * Usa la autenticación de Supabase existente
 */
export async function callEdgeFunction<T = any>(
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
    const error = await response.text();
    console.error(`Edge Function error: ${functionName}`, error);
    throw new Error(`Edge Function ${functionName} failed: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Clean Text - Limpia texto usando Claude
 */
export async function callCleanText(rawText: string): Promise<{
  cleaned_text: string;
  original_word_count?: number;
  raw_word_count?: number;
  cleaned_word_count: number;
  reduction_percentage: number;
  cleaned_text_id?: string;
}> {
  return callEdgeFunction("clean-text", {
    body: { raw_text: rawText },
  });
}

/**
 * Semantic Map - Genera análisis semántico
 */
export async function callSemanticMap(cleanedText: string): Promise<{
  semantic_json: Record<string, unknown>;
  suggested_palette_id?: number;
  suggested_host_image?: "REF_1" | "REF_2";
  semantic_map_id?: string;
  range_warnings?: string[];
}> {
  return callEdgeFunction("semantic-map", {
    body: { cleaned_text: cleanedText },
  });
}

/**
 * Generate Outputs - Genera 10 tipos de contenido en paralelo
 */
export async function callGenerateOutputs(semanticJson: Record<string, any>): Promise<{
  outputs: Array<{
    output_number?: number;
    type?: string;
    asset_type?: string;
    content: string | Record<string, unknown>;
    word_count?: number;
    word_counts_json?: Record<string, number>;
  }>;
  status?: "pending" | "processing" | "complete" | "partial";
  savedAssets?: Array<{ outputNumber: number; assetId: string }>;
}> {
  return callEdgeFunction("generate-outputs", {
    body: { semantic_json: semanticJson },
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
