/**
 * Structured Logging with Trace IDs
 * FASE 4: Skill - Distributed Logging
 *
 * All log messages include trace IDs for request correlation.
 * Eliminates console.log in favor of structured logging.
 */

export interface LogContext {
  traceId: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  timestamp: string;
  environment: 'browser' | 'edge' | 'node';
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Generate unique trace ID
 */
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get trace ID from window (browser) or from request (edge/node)
 */
function getOrCreateTraceId(): string {
  if (typeof window !== 'undefined') {
    // Browser: store in sessionStorage
    let traceId = sessionStorage.getItem('_trace_id');
    if (!traceId) {
      traceId = generateTraceId();
      sessionStorage.setItem('_trace_id', traceId);
    }
    return traceId;
  }
  // Edge/Node: use global context or generate
  return (globalThis as any)._trace_id || generateTraceId();
}

/**
 * Logger instance with context
 */
export class Logger {
  private context: LogContext;

  constructor(
    userId?: string,
    entityType?: string,
    entityId?: string,
  ) {
    this.context = {
      traceId: getOrCreateTraceId(),
      userId,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      environment: typeof window !== 'undefined' ? 'browser' : process.env.VERCEL_ENV ? 'edge' : 'node',
    };
  }

  private format(entry: LogEntry): string {
    const prefix = `[${entry.context.traceId}] ${entry.level.toUpperCase()}`;
    const parts = [prefix, entry.message];

    if (entry.error) {
      parts.push(`Error: ${entry.error.name} - ${entry.error.message}`);
      if (entry.error.stack && process.env.NODE_ENV === 'development') {
        parts.push(entry.error.stack);
      }
    }

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(JSON.stringify(entry.metadata, null, 2));
    }

    return parts.join('\n');
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = { level: 'debug', message, context: this.context, metadata };
    if (process.env.NODE_ENV === 'development') {
      console.log(this.format(entry));
    }
  }

  info(message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = { level: 'info', message, context: this.context, metadata };
    console.log(this.format(entry));
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = { level: 'warn', message, context: this.context, metadata };
    console.warn(this.format(entry));
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'error',
      message,
      context: this.context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      metadata,
    };
    console.error(this.format(entry));
  }

  fatal(message: string, error?: Error, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'fatal',
      message,
      context: this.context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      metadata,
    };
    console.error(this.format(entry));
    // Send to monitoring service
    if (typeof window === 'undefined') {
      // Backend: alert immediately
      process.stderr.write(this.format(entry) + '\n');
    }
  }

  setContext(key: keyof LogContext, value: any) {
    if (key !== 'traceId' && key !== 'environment') {
      this.context[key] = value;
    }
  }

  getTraceId(): string {
    return this.context.traceId;
  }
}

/**
 * Global logger factory
 */
export const createLogger = (userId?: string, entityType?: string, entityId?: string) => {
  return new Logger(userId, entityType, entityId);
};
