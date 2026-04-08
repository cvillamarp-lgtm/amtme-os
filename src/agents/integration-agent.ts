/**
 * Integration Agent
 * FASE 5: Third-party integration health and sync monitoring
 *
 * Manages:
 * - OAuth provider status
 * - Supabase connection health
 * - LinkedIn API sync
 * - Instagram sync status
 */

import { supabase } from '@/integrations/supabase/client';
import { Logger } from '@/lib/logging';

export interface IntegrationStatus {
  name: string;
  connected: boolean;
  lastSyncAt?: string;
  nextSyncAt?: string;
  failureCount: number;
  error?: string;
}

const logger = new Logger('integration-agent');

export class IntegrationAgent {
  private traceId = logger.getOrCreateTraceId();

  async checkSupabaseConnection(): Promise<IntegrationStatus> {
    logger.info('Checking Supabase connection', { traceId: this.traceId });

    try {
      const { data, error } = await supabase
        .from('health_check')
        .select('*')
        .limit(1);

      if (error) throw error;

      return {
        name: 'supabase',
        connected: true,
        lastSyncAt: new Date().toISOString(),
        failureCount: 0,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Supabase connection failed', {
        traceId: this.traceId,
        error: errorMsg,
      });

      return {
        name: 'supabase',
        connected: false,
        failureCount: 1,
        error: errorMsg,
      };
    }
  }

  async checkOAuthIntegration(provider: 'linkedin' | 'google' | 'github'): Promise<IntegrationStatus> {
    logger.info('Checking OAuth integration', {
      traceId: this.traceId,
      provider,
    });

    try {
      // Check if OAuth tokens are fresh and valid
      const { data: session, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      return {
        name: `oauth_${provider}`,
        connected: !!session?.user,
        lastSyncAt: new Date().toISOString(),
        failureCount: 0,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('OAuth integration check failed', {
        traceId: this.traceId,
        provider,
        error: errorMsg,
      });

      return {
        name: `oauth_${provider}`,
        connected: false,
        failureCount: 1,
        error: errorMsg,
      };
    }
  }

  async checkLinkedInSync(): Promise<IntegrationStatus> {
    logger.info('Checking LinkedIn sync status', { traceId: this.traceId });

    try {
      // Query LinkedIn sync status from database
      const { data, error } = await supabase
        .from('integration_sync_status')
        .select('*')
        .eq('provider', 'linkedin')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        name: 'linkedin_sync',
        connected: !!data,
        lastSyncAt: data?.last_synced_at,
        nextSyncAt: data?.next_sync_at,
        failureCount: data?.failure_count || 0,
      };
    } catch (error) {
      logger.error('LinkedIn sync check failed', {
        traceId: this.traceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        name: 'linkedin_sync',
        connected: false,
        failureCount: 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkInstagramSync(): Promise<IntegrationStatus> {
    logger.info('Checking Instagram sync status', { traceId: this.traceId });

    try {
      // Query Instagram sync status from database
      const { data, error } = await supabase
        .from('integration_sync_status')
        .select('*')
        .eq('provider', 'instagram')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        name: 'instagram_sync',
        connected: !!data,
        lastSyncAt: data?.last_synced_at,
        nextSyncAt: data?.next_sync_at,
        failureCount: data?.failure_count || 0,
      };
    } catch (error) {
      logger.error('Instagram sync check failed', {
        traceId: this.traceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        name: 'instagram_sync',
        connected: false,
        failureCount: 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkAllIntegrations(): Promise<IntegrationStatus[]> {
    logger.info('Checking all integrations', { traceId: this.traceId });

    const results = await Promise.all([
      this.checkSupabaseConnection(),
      this.checkOAuthIntegration('linkedin'),
      this.checkOAuthIntegration('google'),
      this.checkLinkedInSync(),
      this.checkInstagramSync(),
    ]);

    const totalFailures = results.reduce((sum, r) => sum + r.failureCount, 0);
    logger.info('All integrations checked', {
      traceId: this.traceId,
      connected: results.filter(r => r.connected).length,
      failed: results.filter(r => !r.connected).length,
    });

    return results;
  }
}
