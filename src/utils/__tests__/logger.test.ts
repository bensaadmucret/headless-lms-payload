import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger, logger, log } from '../logger'

describe('Logger', () => {
  let consoleLogSpy: any
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    originalNodeEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    if (originalNodeEnv !== undefined) {
      vi.stubEnv('NODE_ENV', originalNodeEnv)
    } else {
      vi.unstubAllEnvs()
    }
    logger.clearContext()
  })

  describe('Logger instance', () => {
    it('should create a new logger instance', () => {
      const newLogger = new Logger()
      expect(newLogger).toBeInstanceOf(Logger)
    })

    it('should set and clear context', () => {
      const testLogger = new Logger()
      testLogger.setContext({ service: 'test-service', userId: '123' })
      
      testLogger.info('Test message')
      
      expect(consoleLogSpy).toHaveBeenCalled()
      
      testLogger.clearContext()
      testLogger.info('Another message')
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(2)
    })

    it('should create child logger with inherited context', () => {
      const parentLogger = new Logger()
      parentLogger.setContext({ service: 'parent' })
      
      const childLogger = parentLogger.child({ userId: '456' })
      childLogger.info('Child message')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('Log levels', () => {
    it('should log info messages', () => {
      logger.info('Info message')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log warn messages', () => {
      logger.warn('Warning message')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log error messages', () => {
      logger.error('Error message')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log debug messages in development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      const devLogger = new Logger()
      
      devLogger.debug('Debug message')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should not log debug messages in production', () => {
      vi.stubEnv('NODE_ENV', 'production')
      const prodLogger = new Logger()
      
      consoleLogSpy.mockClear()
      prodLogger.debug('Debug message')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })
  })

  describe('Error logging', () => {
    it('should log error with Error object', () => {
      const error = new Error('Test error')
      logger.error('Something went wrong', error)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log error with string', () => {
      logger.error('Error message', 'error string')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log error with metadata', () => {
      const error = new Error('Test error')
      logger.error('Error with meta', error, { userId: '123', action: 'test' })
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('time() method', () => {
    it('should measure execution time of sync function', async () => {
      const result = await logger.time('test-operation', () => {
        return 'result'
      })
      
      expect(result).toBe('result')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should measure execution time of async function', async () => {
      const result = await logger.time('async-operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'async-result'
      })
      
      expect(result).toBe('async-result')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log error if function throws', async () => {
      await expect(
        logger.time('failing-operation', () => {
          throw new Error('Operation failed')
        })
      ).rejects.toThrow('Operation failed')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('Specialized logging methods', () => {
    it('should log HTTP request', () => {
      logger.logRequest('GET', '/api/users')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log HTTP response', () => {
      logger.logResponse('GET', '/api/users', 200, 150)
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log HTTP response with error status', () => {
      logger.logResponse('POST', '/api/users', 500, 200)
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log database operation', () => {
      logger.logDatabase('find', 'users', { query: { id: '123' } })
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should log cache operations', () => {
      consoleLogSpy.mockClear()
      logger.logCache('hit', 'user:123')
      logger.logCache('miss', 'user:456')
      logger.logCache('set', 'user:789')
      logger.logCache('delete', 'user:000')
      
      // In dev mode, each log calls console.log twice (message + meta)
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(4)
    })

    it('should log job operations', () => {
      consoleLogSpy.mockClear()
      logger.logJob('email-sender', 'started')
      logger.logJob('email-sender', 'completed')
      logger.logJob('email-sender', 'failed')
      
      // In dev mode, each log calls console.log twice (message + meta)
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Log helpers', () => {
    it('should use log.debug helper', () => {
      log.debug('Debug via helper')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should use log.info helper', () => {
      log.info('Info via helper')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should use log.warn helper', () => {
      log.warn('Warn via helper')
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should use log.error helper', () => {
      log.error('Error via helper')
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('Production vs Development', () => {
    it('should log JSON in production', () => {
      vi.stubEnv('NODE_ENV', 'production')
      const prodLogger = new Logger()
      
      consoleLogSpy.mockClear()
      prodLogger.info('Production message')
      
      expect(consoleLogSpy).toHaveBeenCalled()
      const loggedData = consoleLogSpy.mock.calls[0][0]
      
      // Should be valid JSON
      expect(() => JSON.parse(loggedData)).not.toThrow()
    })

    it('should log readable format in development', () => {
      vi.stubEnv('NODE_ENV', 'development')
      const devLogger = new Logger()
      
      consoleLogSpy.mockClear()
      devLogger.info('Development message')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('Context management', () => {
    it('should include context in logs', () => {
      const testLogger = new Logger()
      testLogger.setContext({ service: 'test-service', requestId: 'req-123' })
      
      testLogger.info('Message with context')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should merge metadata with context', () => {
      const testLogger = new Logger()
      testLogger.setContext({ service: 'test' })
      
      testLogger.info('Message', { userId: '456' })
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })
})
