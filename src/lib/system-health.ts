/**
 * System Health Monitor
 * FASE 4: Skill - System Health & Monitoring
 *
 * Tracks health of all integrations: Supabase, AI providers,
 * OAuth endpoints, Edge Functions.
 */

import { supabase } from '@/integrations/supabase/client';
import { Logger } from './logging';
import { getAIHealthStatus } from './ai-health';

const logger = new Logger(undefined, 'system-health');

export interface HealthCheckResult {
  service: string;
  healthy: boolean;
  lastCheck: string;
  error?: string;
  latency?: number;
}

export interface SystemHealth {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'down';
  checks: HealthCheckResult[];
}

/**
 * Check Supabase connection
 */
export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  const start = performance.now();
  try {
    const { error } = await supabase.auth.getSession();
    const latency = performance.now() - start;

    return {
      service: 'supabase',
      healthy: !error,
      lastCheck: new Date().toISOString(),
      latency,
      error: error?.message,
    };
  } catch (error) {
    return {
      service: 'supabase',
      healthy: false,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check AI providers health
 */
export function checkAIProvidersHealth(): HealthCheckResult {
  try {
    const health = getAIHealthStatus();

    return {
      service: 'ai-providers',
      healthy: health.allHealthy,
      lastCheck: new Date().toISOString(),
      error: !health.primary ? 'No AI providers configured' : undefined,
    };
  } catch (error) {
    return {
      service: 'ai-providers',
      healthy: false,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if OAuth env vars are configured
 */
function checkOAuthHealth(): HealthCheckResult {
  const linkedinConfigured = !!(
    import.meta.env.VITE_LINKEDIN_CLIENT_ID &&
    import.meta.env.VITE_LINKEDIN_CLIENT_SECRET
  );
  const instagramConfigured = !!import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;

  return {
    service: 'oauth-integrations',
    healthy: linkedinConfigured || instagramConfigured,
    lastCheck: new Date().toISOString(),
    error: !linkedinConfigured && !instagramConfigured ? 'No OAuth providers configured' : undefined,
  };
}

/**
 * Perform comprehensive system health check
 */
export async function performSystemHealthCheck(): Promise<SystemHealth> {
  logger.info('Starting system health check');

  const checks = await Promise.all([
    checkSupabaseHealth(),
    Promise.resolve(checkAIProvidersHealth()),
    Promise.resolve(checkOAuthHealth()),
  ]);

  const unhealthy = checks.filter((c) => !c.healthy);
  const overall: 'healthy' | 'degraded' | 'down' = unhealthy.length === 0 ? 'healthy' : unhealthy.length === checks.length ? 'down' : 'degraded';

  const result: SystemHealth = {
    timestamp: new Date().toISOString(),
    overall,
    checks,
  };

  if (overall === 'down') {
    logger.error('System health check failed - critical services down', new Error(JSON.stringify(unhealthy)));
  } else if (overall === 'degraded') {
    logger.warn('System health check degraded', { services: unhealthy });
  } else {
    logger.debug('System health check passed');
  }

  return result;
}

/**
 * Poll system health periodically
 */
export function startHealthCheckPoller(interval: number = 5 * 60 * 1000): () => void {
  const checkId = setInterval(() => {
    performSystemHealthCheck().catch((error) => {
      logger.error('Health check failed', error as Error);
    });
  }, interval);

  return () => clearInterval(checkId);
}
