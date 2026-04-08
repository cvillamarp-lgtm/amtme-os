/**
 * Config Agent
 * FASE 5: Configuration validation and management
 *
 * Manages:
 * - Feature flags validation
 * - Configuration schema compliance
 * - Runtime config updates
 * - Config hot-reloading
 */

import { Logger } from '@/lib/logging';

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'json';
    required: boolean;
    default?: any;
    validation?: (value: any) => boolean;
  };
}

export interface ConfigStatus {
  valid: boolean;
  missingKeys: string[];
  invalidKeys: string[];
  warnings: string[];
}

const logger = new Logger('config-agent');

export class ConfigAgent {
  private traceId = logger.getOrCreateTraceId();

  private appConfigSchema: ConfigSchema = {
    VITE_SUPABASE_URL: {
      type: 'string',
      required: true,
      validation: (v) => typeof v === 'string' && v.startsWith('https://'),
    },
    VITE_SUPABASE_ANON_KEY: {
      type: 'string',
      required: true,
    },
    VITE_SUPABASE_PROJECT_ID: {
      type: 'string',
      required: true,
    },
    VITE_AI_PRIMARY_PROVIDER: {
      type: 'string',
      required: false,
      default: 'google-gemini',
    },
    FEATURE_AI_ENABLED: {
      type: 'boolean',
      required: false,
      default: true,
    },
    FEATURE_MODAL_RECOVERY: {
      type: 'boolean',
      required: false,
      default: true,
    },
  };

  async validateConfiguration(config: Record<string, any>): Promise<ConfigStatus> {
    logger.info('Validating configuration', { traceId: this.traceId });

    const missingKeys: string[] = [];
    const invalidKeys: string[] = [];
    const warnings: string[] = [];

    for (const [key, schema] of Object.entries(this.appConfigSchema)) {
      const value = config[key];

      // Check if required key exists
      if (schema.required && value === undefined) {
        missingKeys.push(key);
        continue;
      }

      // Skip validation if not required and not present
      if (!schema.required && value === undefined) {
        continue;
      }

      // Validate type
      const actualType = typeof value;
      if (actualType !== schema.type) {
        invalidKeys.push(`${key}: expected ${schema.type}, got ${actualType}`);
        continue;
      }

      // Run custom validation if provided
      if (schema.validation && !schema.validation(value)) {
        invalidKeys.push(`${key}: failed custom validation`);
      }
    }

    const valid = missingKeys.length === 0 && invalidKeys.length === 0;

    logger.info('Configuration validation completed', {
      traceId: this.traceId,
      valid,
      missingKeys: missingKeys.length,
      invalidKeys: invalidKeys.length,
    });

    return {
      valid,
      missingKeys,
      invalidKeys,
      warnings,
    };
  }

  async getFeatureFlags(): Promise<Record<string, boolean>> {
    logger.info('Fetching feature flags', { traceId: this.traceId });

    const flags: Record<string, boolean> = {
      aiEnabled: this.getConfigValue('FEATURE_AI_ENABLED', true),
      modalRecovery: this.getConfigValue('FEATURE_MODAL_RECOVERY', true),
      distributionQueue: this.getConfigValue('FEATURE_DISTRIBUTION_QUEUE', true),
      advancedAnalytics: this.getConfigValue('FEATURE_ADVANCED_ANALYTICS', false),
    };

    logger.info('Feature flags loaded', {
      traceId: this.traceId,
      flags: Object.keys(flags),
    });

    return flags;
  }

  async updateFeatureFlag(flagName: string, value: boolean): Promise<void> {
    logger.info('Updating feature flag', {
      traceId: this.traceId,
      flag: flagName,
      value,
    });

    try {
      // Placeholder - actual implementation updates config service
      // Could use PostHog, LaunchDarkly, or custom config service

      logger.info('Feature flag updated', {
        traceId: this.traceId,
        flag: flagName,
      });
    } catch (error) {
      logger.error('Failed to update feature flag', {
        traceId: this.traceId,
        flag: flagName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async hotReloadConfiguration(): Promise<void> {
    logger.info('Hot-reloading configuration', { traceId: this.traceId });

    try {
      // Reload configuration from environment/config service
      // Placeholder - actual implementation refreshes config

      logger.info('Configuration reloaded', { traceId: this.traceId });
    } catch (error) {
      logger.error('Failed to reload configuration', {
        traceId: this.traceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private getConfigValue(key: string, defaultValue: any): any {
    // Try to get from environment
    if (typeof process !== 'undefined' && process.env) {
      const envValue = process.env[key];
      if (envValue !== undefined) {
        // Parse boolean strings
        if (typeof defaultValue === 'boolean') {
          return envValue === 'true' || envValue === '1';
        }
        return envValue;
      }
    }

    // Try to get from Vite env (client-side)
    if (typeof window !== 'undefined' && (import.meta as any).env) {
      const viteValue = (import.meta as any).env[key];
      if (viteValue !== undefined) {
        if (typeof defaultValue === 'boolean') {
          return viteValue === 'true' || viteValue === '1';
        }
        return viteValue;
      }
    }

    return defaultValue;
  }
}
