type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogMeta {
  [key: string]: unknown
}

export class Logger {
  private context: LogContext

  constructor(initialContext: LogContext = {}) {
    this.context = { ...initialContext }
  }

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context }
  }

  clearContext(): void {
    this.context = {}
  }

  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context })
  }

  private shouldLogDebug(): boolean {
    return process.env.NODE_ENV !== 'production'
  }

  private buildPayload(level: LogLevel, message: string, meta?: LogMeta, error?: unknown): LogMeta {
    const base: LogMeta = {
      level,
      message,
      timestamp: new Date().toISOString(),
    }

    let errorMeta: LogMeta | undefined

    if (error instanceof Error) {
      errorMeta = {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
      }
    } else if (error !== undefined) {
      errorMeta = { error }
    }

    return {
      ...this.context,
      ...base,
      ...(meta ?? {}),
      ...(errorMeta ?? {}),
    }
  }

  private logInternal(level: LogLevel, message: string, errorOrMeta?: unknown, maybeMeta?: LogMeta): void {
    let error: unknown
    let meta: LogMeta | undefined

    if (errorOrMeta instanceof Error) {
      error = errorOrMeta
      meta = maybeMeta
    } else if (errorOrMeta && typeof errorOrMeta === 'object') {
      meta = errorOrMeta as LogMeta
    }

    if (level === 'debug' && !this.shouldLogDebug()) {
      return
    }

    const payload = this.buildPayload(level, message, meta, error)

    if (process.env.NODE_ENV === 'production') {
      // En production, on logue un JSON parsable (attendu par les tests)
      console.log(JSON.stringify(payload))
    } else {
      // En développement, format lisible + payload complet
      console.log(`[${level.toUpperCase()}] ${message}`, payload)
    }
  }

  debug(message: string, meta?: LogMeta): void {
    this.logInternal('debug', message, meta)
  }

  info(message: string, meta?: LogMeta): void {
    this.logInternal('info', message, meta)
  }

  warn(message: string, meta?: LogMeta): void {
    this.logInternal('warn', message, meta)
  }

  error(message: string, errorOrMeta?: unknown, meta?: LogMeta): void {
    this.logInternal('error', message, errorOrMeta, meta)
  }

  async time<T>(operation: string, fn: () => T | Promise<T>): Promise<T> {
    const start = Date.now()

    try {
      const result = await fn()
      const durationMs = Date.now() - start

      this.info(`Operation ${operation} completed`, { durationMs })

      return result
    } catch (error) {
      const durationMs = Date.now() - start

      this.error(`Operation ${operation} failed`, error, { durationMs })

      throw error
    }
  }

  logRequest(method: string, path: string, meta?: LogMeta): void {
    this.info(`HTTP ${method} ${path}`, {
      type: 'http_request',
      method,
      path,
      ...meta,
    })
  }

  logResponse(method: string, path: string, status: number, durationMs?: number, meta?: LogMeta): void {
    this.info(`HTTP ${method} ${path} -> ${status}`, {
      type: 'http_response',
      method,
      path,
      status,
      durationMs,
      ...meta,
    })
  }

  logDatabase(operation: string, collection: string, meta?: LogMeta): void {
    this.info(`DB ${operation} on ${collection}`, {
      type: 'db',
      operation,
      collection,
      ...meta,
    })
  }

  logCache(action: 'hit' | 'miss' | 'set' | 'delete' | string, key: string, meta?: LogMeta): void {
    this.debug(`Cache ${action} ${key}`, {
      type: 'cache',
      action,
      key,
      ...meta,
    })
  }

  logJob(jobName: string, state: 'started' | 'completed' | 'failed' | string, meta?: LogMeta): void {
    this.info(`Job ${jobName} ${state}`, {
      type: 'job',
      job: jobName,
      state,
      ...meta,
    })
  }
}

export const logger = new Logger()

export const log = {
  debug(message: string, meta?: LogMeta): void {
    logger.debug(message, meta)
  },
  info(message: string, meta?: LogMeta): void {
    logger.info(message, meta)
  },
  warn(message: string, meta?: LogMeta): void {
    logger.warn(message, meta)
  },
  error(message: string, errorOrMeta?: unknown, meta?: LogMeta): void {
    logger.error(message, errorOrMeta, meta)
  },
}
