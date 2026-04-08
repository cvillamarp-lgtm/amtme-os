/**
 * Cron Agent
 * FASE 5: Cron job scheduling and execution monitoring
 *
 * Manages:
 * - Cron job status tracking
 * - Execution history
 * - Failure detection and alerts
 * - Automatic retry coordination
 */

import { supabase } from '@/integrations/supabase/client';
import { Logger } from '@/lib/logging';

export interface CronJobStatus {
  jobId: string;
  name: string;
  nextExecution: string;
  lastExecution?: string;
  lastStatus: 'success' | 'failure' | 'pending';
  consecutiveFailures: number;
  enabled: boolean;
}

export interface CronExecutionLog {
  jobId: string;
  executedAt: string;
  duration: number;
  status: 'success' | 'failure';
  error?: string;
}

const logger = new Logger('cron-agent');

export class CronAgent {
  private traceId = logger.getOrCreateTraceId();

  async getJobStatus(jobId: string): Promise<CronJobStatus> {
    logger.info('Fetching cron job status', {
      traceId: this.traceId,
      jobId,
    });

    try {
      const { data, error } = await supabase
        .from('cron_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      return {
        jobId: data.id,
        name: data.name,
        nextExecution: data.next_execution,
        lastExecution: data.last_execution,
        lastStatus: data.last_status,
        consecutiveFailures: data.consecutive_failures,
        enabled: data.enabled,
      };
    } catch (error) {
      logger.error('Failed to fetch job status', {
        traceId: this.traceId,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getAllJobStatus(): Promise<CronJobStatus[]> {
    logger.info('Fetching all cron job statuses', { traceId: this.traceId });

    try {
      const { data, error } = await supabase
        .from('cron_jobs')
        .select('*')
        .eq('enabled', true);

      if (error) throw error;

      return data.map(job => ({
        jobId: job.id,
        name: job.name,
        nextExecution: job.next_execution,
        lastExecution: job.last_execution,
        lastStatus: job.last_status,
        consecutiveFailures: job.consecutive_failures,
        enabled: job.enabled,
      }));
    } catch (error) {
      logger.error('Failed to fetch all job statuses', {
        traceId: this.traceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async logExecution(log: CronExecutionLog): Promise<void> {
    logger.info('Logging cron execution', {
      traceId: this.traceId,
      jobId: log.jobId,
      status: log.status,
    });

    try {
      const { error } = await supabase.from('cron_execution_logs').insert({
        job_id: log.jobId,
        executed_at: log.executedAt,
        duration: log.duration,
        status: log.status,
        error: log.error,
      });

      if (error) throw error;

      // Update job's last execution status
      await supabase
        .from('cron_jobs')
        .update({
          last_execution: log.executedAt,
          last_status: log.status,
          consecutive_failures:
            log.status === 'failure' ? supabase.raw('consecutive_failures + 1') : 0,
        })
        .eq('id', log.jobId);
    } catch (error) {
      logger.error('Failed to log execution', {
        traceId: this.traceId,
        jobId: log.jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async retryFailedJob(jobId: string): Promise<boolean> {
    logger.info('Retrying failed cron job', {
      traceId: this.traceId,
      jobId,
    });

    try {
      const { error } = await supabase
        .from('cron_jobs')
        .update({ retry_requested: true })
        .eq('id', jobId);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Failed to request job retry', {
        traceId: this.traceId,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}
