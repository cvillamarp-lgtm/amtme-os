/**
 * API Agent
 * FASE 5: API endpoint validation and monitoring
 *
 * Manages:
 * - Endpoint health checks
 * - Response time monitoring
 * - Error rate tracking
 * - Rate limit validation
 */

import { Logger } from '@/lib/logging';

export interface ApiEndpointStatus {
  endpoint: string;
  healthy: boolean;
  responseTimeMs: number;
  errorRate: number;
  lastChecked: string;
  issues: string[];
}

export interface ApiHealthReport {
  totalEndpoints: number;
  healthyEndpoints: number;
  avgResponseTime: number;
  avgErrorRate: number;
  timestamp: string;
}

const logger = new Logger('api-agent');

export class ApiAgent {
  private traceId = logger.getOrCreateTraceId();

  async checkEndpointHealth(endpoint: string): Promise<ApiEndpointStatus> {
    logger.info('Checking endpoint health', {
      traceId: this.traceId,
      endpoint,
    });

    const startTime = Date.now();
    const issues: string[] = [];
    let healthy = false;
    let errorRate = 0;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        timeout: 5000,
      });

      const responseTimeMs = Date.now() - startTime;
      healthy = response.ok;

      if (!response.ok) {
        issues.push(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Calculate error rate from response codes
      errorRate = healthy ? 0 : 100;

      return {
        endpoint,
        healthy,
        responseTimeMs,
        errorRate,
        lastChecked: new Date().toISOString(),
        issues,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      issues.push(errorMsg);
      logger.error('Endpoint health check failed', {
        traceId: this.traceId,
        endpoint,
        error: errorMsg,
      });

      return {
        endpoint,
        healthy: false,
        responseTimeMs: Date.now() - startTime,
        errorRate: 100,
        lastChecked: new Date().toISOString(),
        issues,
      };
    }
  }

  async monitorEndpoints(endpoints: string[]): Promise<ApiHealthReport> {
    logger.info('Monitoring API endpoints', {
      traceId: this.traceId,
      endpointCount: endpoints.length,
    });

    const results = await Promise.all(
      endpoints.map(endpoint => this.checkEndpointHealth(endpoint))
    );

    const healthyEndpoints = results.filter(r => r.healthy).length;
    const avgResponseTime =
      results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;
    const avgErrorRate =
      results.reduce((sum, r) => sum + r.errorRate, 0) / results.length;

    const report: ApiHealthReport = {
      totalEndpoints: endpoints.length,
      healthyEndpoints,
      avgResponseTime,
      avgErrorRate,
      timestamp: new Date().toISOString(),
    };

    logger.info('API monitoring completed', {
      traceId: this.traceId,
      healthyEndpoints,
      avgResponseTime: Math.round(avgResponseTime),
    });

    return report;
  }

  async validateRateLimit(endpoint: string): Promise<{ limited: boolean; details: string }> {
    logger.info('Validating rate limit', {
      traceId: this.traceId,
      endpoint,
    });

    try {
      // Make test request and check rate limit headers
      const response = await fetch(endpoint, { method: 'GET' });
      const remaining = response.headers.get('x-ratelimit-remaining');
      const limit = response.headers.get('x-ratelimit-limit');

      const limited = remaining ? parseInt(remaining) === 0 : false;
      const details = `${remaining || 'unknown'}/${limit || 'unknown'} requests remaining`;

      return { limited, details };
    } catch (error) {
      logger.error('Rate limit validation failed', {
        traceId: this.traceId,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        limited: false,
        details: 'Could not determine rate limit status',
      };
    }
  }
}
