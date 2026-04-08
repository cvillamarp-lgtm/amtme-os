/**
 * Centralized Environment Validation
 * FASE 4: Skill - Environment Validation
 *
 * Validates all required environment variables at runtime.
 * Thrown early before any service initialization.
 */

export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
    projectId: string;
  };
  ai: {
    gemini?: string;
    anthropic?: string;
    groq?: string;
    grok?: string;
    openai?: string;
  };
  oauth: {
    linkedinClientId?: string;
    linkedinClientSecret?: string;
    instagramAccessToken?: string;
  };
  vercel: {
    env: string;
    cronSecret?: string;
    oidcToken?: string;
  };
}

/**
 * Validate frontend env vars (VITE_*)
 */
export function validateFrontendEnv(): EnvironmentConfig['supabase'] & EnvironmentConfig['ai'] {
  const errors: string[] = [];

  // Required: Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  if (!supabaseUrl) errors.push('VITE_SUPABASE_URL is required');
  if (!supabaseKey) errors.push('VITE_SUPABASE_ANON_KEY is required');
  if (!supabaseProjectId) errors.push('VITE_SUPABASE_PROJECT_ID is required');

  // At least one AI provider (Gemini preferred)
  const gemini = import.meta.env.VITE_GEMINI_API_KEY;
  const anthropic = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const groq = import.meta.env.VITE_GROQ_API_KEY;
  const grok = import.meta.env.VITE_GROK_API_KEY;
  const openai = import.meta.env.VITE_OPENAI_API_KEY;

  if (!gemini && !anthropic && !groq && !grok && !openai) {
    errors.push('At least one AI provider required: VITE_GEMINI_API_KEY or VITE_ANTHROPIC_API_KEY');
  }

  if (errors.length > 0) {
    const message = `Frontend Environment Validation Failed:\n${errors.join('\n')}`;
    // Validation error thrown immediately - no silent failure
    throw new Error(message);
  }

  return {
    supabase: {
      url: supabaseUrl!,
      anonKey: supabaseKey!,
      projectId: supabaseProjectId!,
    },
    ai: {
      gemini,
      anthropic,
      groq,
      grok,
      openai,
    },
  };
}

/**
 * Validate backend env vars (process.env.*)
 * Used by Edge Functions and Cron jobs
 */
export function validateBackendEnv(): Partial<EnvironmentConfig> {
  const errors: string[] = [];

  // Supabase (required for all backend operations)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) errors.push('SUPABASE_URL is required');
  if (!supabaseAnonKey) errors.push('SUPABASE_ANON_KEY is required');
  if (!supabaseServiceRole) errors.push('SUPABASE_SERVICE_ROLE_KEY is required');

  // AI providers
  const gemini = process.env.GEMINI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const groq = process.env.GROQ_API_KEY;
  const grok = process.env.GROK_API_KEY;

  if (!gemini && !anthropic && !groq && !grok) {
    errors.push('At least one AI provider required: GEMINI_API_KEY or ANTHROPIC_API_KEY');
  }

  if (errors.length > 0) {
    const errorMessage = `Backend Environment Validation Failed:\n${errors.join('\n')}`;
    throw new Error(errorMessage);
  }

  return {
    supabase: {
      url: supabaseUrl!,
      anonKey: supabaseAnonKey!,
      projectId: (supabaseUrl || '').split('.')[0].replace('https://', ''),
    },
    ai: {
      gemini,
      anthropic,
      groq,
      grok,
    },
  };
}

/**
 * Validate OAuth env vars
 */
export function validateOAuthEnv(): Partial<EnvironmentConfig['oauth']> {
  const errors: string[] = [];

  const linkedinId = process.env.LINKEDIN_CLIENT_ID;
  const linkedinSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  // LinkedIn: require both or neither
  if (linkedinId && !linkedinSecret) errors.push('LINKEDIN_CLIENT_SECRET required when LINKEDIN_CLIENT_ID is set');
  if (linkedinSecret && !linkedinId) errors.push('LINKEDIN_CLIENT_ID required when LINKEDIN_CLIENT_SECRET is set');

  if (errors.length > 0) {
    // OAuth configuration warnings - partial OAuth setup may still work
  }

  return {
    linkedinClientId: linkedinId,
    linkedinClientSecret: linkedinSecret,
    instagramAccessToken: instagramToken,
  };
}

/**
 * Validate Vercel cron job env vars
 */
export function validateVercelCronEnv(): Pick<EnvironmentConfig['vercel'], 'cronSecret' | 'env'> {
  const cronSecret = process.env.VERCEL_CRON_SECRET;
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

  if (!cronSecret && env === 'production') {
    throw new Error('VERCEL_CRON_SECRET is required in production');
  }

  return {
    cronSecret,
    env,
  };
}
