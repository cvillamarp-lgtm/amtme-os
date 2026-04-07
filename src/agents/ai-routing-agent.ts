/**
 * AI Routing Agent
 * FASE 5: Intelligent AI provider routing and fallback management
 *
 * Manages:
 * - Provider selection based on cost/performance/capability
 * - Automatic fallback on timeout
 * - Load balancing across providers
 * - Provider capability matching
 */

import { getAIHealthStatus, getNextProvider, executeWithFallback } from '@/lib/ai-health';
import { Logger } from '@/lib/logging';

export interface RoutingDecision {
  selectedProvider: string;
  reason: string;
  fallbackChain: string[];
  estimatedCost: number;
}

export interface ProviderCapability {
  provider: string;
  maxTokens: number;
  supportsVision: boolean;
  supportsStreaming: boolean;
  costPer1kTokens: number;
}

const logger = new Logger('ai-routing-agent');

export class AIRoutingAgent {
  private traceId = logger.getOrCreateTraceId();

  async selectProvider(requirements: {
    requireVision?: boolean;
    requireStreaming?: boolean;
    maxCost?: number;
    preferredProvider?: string;
  }): Promise<RoutingDecision> {
    logger.info('Selecting AI provider', {
      traceId: this.traceId,
      requireVision: requirements.requireVision,
      requireStreaming: requirements.requireStreaming,
    });

    const healthStatus = getAIHealthStatus();
    const healthyProviders = healthStatus.filter(p => p.healthy);

    if (healthyProviders.length === 0) {
      throw new Error('No healthy AI providers available');
    }

    // Filter by capability requirements
    let candidates = healthyProviders.filter(provider => {
      const capability = this.getProviderCapability(provider.name);
      if (requirements.requireVision && !capability.supportsVision) return false;
      if (requirements.requireStreaming && !capability.supportsStreaming) return false;
      if (requirements.maxCost && capability.costPer1kTokens > requirements.maxCost)
        return false;
      return true;
    });

    if (candidates.length === 0) {
      throw new Error(
        `No providers match requirements: vision=${requirements.requireVision}, streaming=${requirements.requireStreaming}`
      );
    }

    // Prefer specified provider if available
    if (requirements.preferredProvider) {
      const preferred = candidates.find(p => p.name === requirements.preferredProvider);
      if (preferred) {
        const fallbackChain = candidates.map(p => p.name).filter(p => p !== preferred.name);
        return {
          selectedProvider: preferred.name,
          reason: 'User preferred provider',
          fallbackChain,
          estimatedCost: this.getProviderCapability(preferred.name).costPer1kTokens,
        };
      }
    }

    // Default to cheapest provider
    const selected = candidates.reduce((cheapest, current) => {
      const cheapestCap = this.getProviderCapability(cheapest.name);
      const currentCap = this.getProviderCapability(current.name);
      return currentCap.costPer1kTokens < cheapestCap.costPer1kTokens ? current : cheapest;
    });

    const fallbackChain = candidates.map(p => p.name).filter(p => p !== selected.name);

    return {
      selectedProvider: selected.name,
      reason: 'Optimal cost/performance balance',
      fallbackChain,
      estimatedCost: this.getProviderCapability(selected.name).costPer1kTokens,
    };
  }

  async executeWithFallback<T>(
    fn: (provider: string) => Promise<T>,
    requirements?: { requireVision?: boolean; requireStreaming?: boolean }
  ): Promise<T> {
    logger.info('Executing with fallback chain', {
      traceId: this.traceId,
      requirements,
    });

    return executeWithFallback(fn);
  }

  async getLoadBalancingStats(): Promise<{
    providerUsage: Record<string, number>;
    averageResponseTime: Record<string, number>;
    errorRates: Record<string, number>;
  }> {
    logger.info('Calculating load balancing stats', { traceId: this.traceId });

    // Placeholder - actual implementation would query usage metrics
    return {
      providerUsage: {},
      averageResponseTime: {},
      errorRates: {},
    };
  }

  private getProviderCapability(provider: string): ProviderCapability {
    const capabilities: Record<string, ProviderCapability> = {
      'google-gemini': {
        provider: 'google-gemini',
        maxTokens: 1000000,
        supportsVision: true,
        supportsStreaming: true,
        costPer1kTokens: 0.00075,
      },
      'openai': {
        provider: 'openai',
        maxTokens: 128000,
        supportsVision: true,
        supportsStreaming: true,
        costPer1kTokens: 0.003,
      },
      'anthropic': {
        provider: 'anthropic',
        maxTokens: 200000,
        supportsVision: true,
        supportsStreaming: true,
        costPer1kTokens: 0.003,
      },
      'groq': {
        provider: 'groq',
        maxTokens: 8192,
        supportsVision: false,
        supportsStreaming: true,
        costPer1kTokens: 0.00005,
      },
    };

    return capabilities[provider] || capabilities['google-gemini'];
  }
}
