import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url("VITE_SUPABASE_URL must be a valid URL")
    .default("https://vudvgfdoeciurejtbzbw.supabase.co"),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "VITE_SUPABASE_ANON_KEY is required")
    .default("sb_publishable_jL_FhH11B2KrVj7mXcJZEw_5ICdxTQG"),
});

function parseEnv() {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL:
      import.meta.env.VITE_SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_ANON_KEY:
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`❌ Invalid environment variables:\n${formatted}`);
  }

  return result.data;
}

export const env = parseEnv();
