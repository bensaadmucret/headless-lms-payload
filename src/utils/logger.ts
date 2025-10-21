/**
 * Service de logging centralisé pour remplacer console.log
 * Utilise les loggers natifs de Payload CMS pour une meilleure intégration
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  service?: string;
  userId?: string | number;
  requestId?: string;
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};
  private isDevelopment = process.env.NODE_ENV !== 'production';

  /**
   * Définit le contexte global pour tous les logs suivants
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Efface le contexte
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Crée un logger avec un contexte spécifique
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Log de niveau debug (seulement en développement)
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      this.log('debug', message, meta);
    }
  }

  /**
   * Log de niveau info
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  /**
   * Log de niveau warning
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  /**
   * Log de niveau error
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta = error instanceof Error
      ? {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          ...meta,
        }
      : { error, ...meta };

    this.log('error', message, errorMeta);
  }

  /**
   * Méthode interne de logging
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...this.context,
      ...meta,
    };

    // En développement, afficher dans la console de manière lisible
    if (this.isDevelopment) {
      const prefix = this.getColoredPrefix(level);
      const contextStr = Object.keys(this.context).length > 0
        ? ` [${JSON.stringify(this.context)}]`
        : '';
      
      console.log(`${prefix} ${timestamp}${contextStr} - ${message}`);
      
      if (meta && Object.keys(meta).length > 0) {
        console.log('  Meta:', meta);
      }
    } else {
      // En production, log structuré en JSON
      console.log(JSON.stringify(logData));
    }
  }

  /**
   * Retourne un préfixe coloré selon le niveau de log (pour le développement)
   */
  private getColoredPrefix(level: LogLevel): string {
    const colors = {
      debug: '\x1b[36m[DEBUG]\x1b[0m', // Cyan
      info: '\x1b[32m[INFO]\x1b[0m',   // Green
      warn: '\x1b[33m[WARN]\x1b[0m',   // Yellow
      error: '\x1b[31m[ERROR]\x1b[0m', // Red
    };
    return colors[level];
  }

  /**
   * Mesure le temps d'exécution d'une fonction
   */
  async time<T>(
    label: string,
    fn: () => Promise<T> | T,
    meta?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    this.debug(`[${label}] Started`, meta);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`[${label}] Completed in ${duration}ms`, { ...meta, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`[${label}] Failed after ${duration}ms`, error, { ...meta, duration });
      throw error;
    }
  }

  /**
   * Log une requête HTTP
   */
  logRequest(method: string, path: string, meta?: Record<string, unknown>): void {
    this.info(`${method} ${path}`, { type: 'http_request', method, path, ...meta });
  }

  /**
   * Log une réponse HTTP
   */
  logResponse(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, unknown>
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${path} ${statusCode} - ${duration}ms`, {
      type: 'http_response',
      method,
      path,
      statusCode,
      duration,
      ...meta,
    });
  }

  /**
   * Log une opération de base de données
   */
  logDatabase(operation: string, collection: string, meta?: Record<string, unknown>): void {
    this.debug(`DB: ${operation} on ${collection}`, {
      type: 'database',
      operation,
      collection,
      ...meta,
    });
  }

  /**
   * Log une opération de cache
   */
  logCache(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, meta?: Record<string, unknown>): void {
    this.debug(`Cache ${operation}: ${key}`, {
      type: 'cache',
      operation,
      key,
      ...meta,
    });
  }

  /**
   * Log une opération de queue/job
   */
  logJob(jobName: string, status: 'started' | 'completed' | 'failed', meta?: Record<string, unknown>): void {
    const level = status === 'failed' ? 'error' : 'info';
    this.log(level, `Job ${jobName} ${status}`, {
      type: 'job',
      jobName,
      status,
      ...meta,
    });
  }
}

// Instance singleton du logger
export const logger = new Logger();

// Export de la classe pour créer des instances personnalisées
export { Logger };

// Helpers pour une migration facile depuis console.log
export const log = {
  debug: (message: string, ...args: unknown[]) => logger.debug(message, { args }),
  info: (message: string, ...args: unknown[]) => logger.info(message, { args }),
  warn: (message: string, ...args: unknown[]) => logger.warn(message, { args }),
  error: (message: string, ...args: unknown[]) => logger.error(message, undefined, { args }),
};

/**
 * Middleware pour logger les requêtes HTTP
 */
export function createRequestLogger(serviceName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const requestLogger = logger.child({ service: serviceName });

    requestLogger.logRequest(req.method, req.path, {
      userId: req.user?.id,
      ip: req.ip,
    });

    // Intercepter la réponse
    const originalSend = res.send;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.send = function (data: any) {
      const duration = Date.now() - start;
      requestLogger.logResponse(req.method, req.path, res.statusCode, duration);
      return originalSend.call(this, data);
    };

    next();
  };
}
