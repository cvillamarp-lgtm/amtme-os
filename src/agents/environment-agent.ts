/**
 * Environment Agent
 * FASE 5: Environment variable validation and synchronization
 *
 * Manages:
 * - Environment variable validation across all environments
 * - Secrets rotation detection
 * - Environment synchronization
 * - Missing variable detection
 */

import { validateFrontendEnv, validateBackendEnv, validateOAuthEnv } from '@/lib/env-validation';
import { Logger } from '@/lib/logging';

export interface EnvironmentStatus {
  environment: string;
  validated: boolean;
  missingVariables: string[];
  warnings: string[];
  lastChecked: string;
}

const logger = new Logger('environment-agent');

export class EnvironmentAgent {
  private traceId = logger.getOrCreateTraceId();

  async validateAllEnvironments(): Promise<EnvironmentStatus[]> {
    const statuses: EnvironmentStatus[] = [];

    logger.info('Starting environment validation', { traceId: this.traceId });

    // Validate frontend environment
    try {
      validateFrontendEnv();
      statuses.push({
        environment: 'frontend',
        validated: true,
        missingVariables: [],
        warnings: [],
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      statuses.push({
        environment: 'frontend',
        validated: false,
        missingVariables: this.extractMissingVars(errorMsg),
        warnings: [errorMsg],
        lastChecked: new Date().toISOString(),
      });
      logger.error('Frontend environment validation failed', {
        traceId: this.traceId,
        error: errorMsg,
      });
    }

    // Validate backend environment
    try {
      validateBackendEnv();
      statuses.push({
        environment: 'backend',
        validated: true,
        missingVariables: [],
        warnings: [],
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      statuses.push({
        environment: 'backend',
        validated: false,
        missingVariables: this.extractMissingVars(errorMsg),
        warnings: [errorMsg],
        lastChecked: new Date().toISOString(),
      });
      logger.error('Backend environment validation failed', {
        traceId: this.traceId,
        error: errorMsg,
      });
    }

    // Validate OAuth environment
    try {
      validateOAuthEnv();
      statuses.push({
        environment: 'oauth',
        validated: true,
        missingVariables: [],
        warnings: [],
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      statuses.push({
        environment: 'oauth',
        validated: false,
        missingVariables: this.extractMissingVars(errorMsg),
        warnings: [errorMsg],
        lastChecked: new Date().toISOString(),
      });
      logger.warn('OAuth environment validation warning', {
        traceId: this.traceId,
        error: errorMsg,
      });
    }

    const allValid = statuses.every(s => s.validated);
    logger.info('Environment validation completed', {
      traceId: this.traceId,
      allValid,
      totalChecks: statuses.length,
    });

    return statuses;
  }

  private extractMissingVars(errorMsg: string): string[] {
    // Parse error message to extract missing variable names
    const matches = errorMsg.match(/Missing.*?:\s*(.+?)(?:\.|$)/i);
    if (matches && matches[1]) {
      return matches[1].split(',').map(v => v.trim());
    }
    return [];
  }

  async detectSecretsRotation(): Promise<{ rotated: boolean; details: string[] }> {
    logger.info('Checking for secrets rotation', { traceId: this.traceId });

    const details: string[] = [];
    let rotated = false;

    // Check for recent environment variable changes
    // Placeholder - actual implementation would compare with previous snapshot

    logger.info('Secrets rotation check completed', {
      traceId: this.traceId,
      rotated,
    });

    return { rotated, details };
  }
}
