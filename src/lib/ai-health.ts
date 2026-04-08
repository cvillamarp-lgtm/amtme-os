/**
 * AI Provider Health Check & Fallback
 * FASE 4: Skill - AI Health & Fallback Strategy
 *
 * Validates configured AI providers, provides fallback chain,
 * enforces timeouts on all AI requests.
 */

import { Logger } from './logging';

export interface AIProviderHealth {
  provider: 'gemini' | 'anthropic' | 'groq' | 'grok' | 'openai';
  configured: boolean;
  timeout: number;
  priority: number;
}

export interface AIHealthStatus {
  configured: AIProviderHealth[];
  primary: AIProviderHealth | null;
  fallbacks: AIProviderHealth[];
  allHealthy: boolean;
}

const logger = new Logger(undefined, 'ai-health');

/**
 * Get AI provider health status
 */
export function getAIHealthStatus(): AIHealthStatus {
  const providers: AIProviderHealth[] = [];

  // Check frontend env vars
  if (typeof window !== 'undefined') {
    if (import.meta.env.VITE_GEMINI_API_KEY) {
      providers.push({
        provider: 'gemini',
        configured: true,
        timeout: 30000, // 30s
        priority: 1,
      });
    }

    if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
      providers.push({
        provider: 'anthropic',
        configured: true,
        timeout: 60000, // 60s
        priority: 2,
      });
    }

    if (import.meta.env.VITE_GROQ_API_KEY) {
      providers.push({
        provider: 'groq',
        configured: true,
        timeout: 20000, // 20s
        priority: 3,
      });
    }

    if (import.meta.env.VITE_OPENAI_API_KEY) {
      providers.push({
        provider: 'openai',
        configured: true,
        timeout: 45000, // 45s
        priority: 4,
      });
    }
  }

  // Sort by priority
  providers.sort((a, b) => a.priority - b.priority);

  const primary = providers[0] || null;
  const fallbacks = providers.slice(1);

  if (!primary) {
    logger.error('No AI providers configured', new Error('At least one AI provider required'));
  }

  return {
    configured: providers,
    primary,
    fallbacks,
    allHealthy: providers.length > 0,
  };
}

/**
 * Get next available provider in fallback chain
 */
export function getNextProvider(
  current: AIProviderHealth | null,
  health: AIHealthStatus,
): AIProviderHealth | null {
  if (!current) return health.primary;

  const allProviders = [health.primary, ...health.fallbacks].filter(Boolean) as AIProviderHealth[];
  const currentIndex = allProviders.findIndex((p) => p.provider === current.provider);

  if (currentIndex === -1 || currentIndex === allProviders.length - 1) {
    return null; // No more fallbacks
  }

  return allProviders[currentIndex + 1];
}

/**
 * Wrap AI request with timeout and error handling
 */
export async function withAITimeout<T>(
  provider: AIProviderHealth,
  request: () => Promise<T>,
): Promise<T> {
  return Promise.race([
    request(),
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        reject(new Error(`AI provider ${provider.provider} timeout after ${provider.timeout}ms`));
      }, provider.timeout),
    ),
  ]);
}

/**
 * Execute AI request with fallback chain
 */
export async function executeWithFallback<T>(
  execute: (provider: AIProviderHealth) => Promise<T>,
  health?: AIHealthStatus,
): Promise<T> {
  const status = health || getAIHealthStatus();

  if (!status.primary) {
    throw new Error('No AI providers configured. Please set at least one AI API key.');
  }

  const allProviders = [status.primary, ...status.fallbacks];
  const errors: Record<string, Error> = {};

  for (const provider of allProviders) {
    try {
      logger.debug(`Trying AI provider: ${provider.provider}`);
      const result = await withAITimeout(provider, () => execute(provider));
      logger.info(`Success with ${provider.provider}`);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors[provider.provider] = err;
      logger.warn(`${provider.provider} failed`, { error: err.message });
    }
  }

  // All providers exhausted
  const errorSummary = Object.entries(errors)
    .map(([provider, error]) => `${provider}: ${error.message}`)
    .join('; ');

  logger.error('All AI providers failed', new Error(errorSummary));
  throw new Error(`All AI providers failed: ${errorSummary}`);
}
