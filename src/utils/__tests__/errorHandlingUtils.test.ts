import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getHttpStatusForError,
  checkAuthentication,
  createSuccessResponse,
  createSimpleErrorResponse,
  validateRequiredParams,
  extractUrlParams,
} from '../errorHandlingUtils'
import { ADAPTIVE_QUIZ_ERRORS } from '../../services/ErrorHandlingService'
import type { PayloadRequest } from 'payload'

describe('errorHandlingUtils', () => {
  describe('getHttpStatusForError', () => {
    it('should return 401 for AUTHENTICATION_REQUIRED', () => {
      expect(getHttpStatusForError(ADAPTIVE_QUIZ_ERRORS.AUTHENTICATION_REQUIRED)).toBe(401)
    })

    it('should return 403 for UNAUTHORIZED_ACCESS', () => {
      expect(getHttpStatusForError(ADAPTIVE_QUIZ_ERRORS.UNAUTHORIZED_ACCESS)).toBe(403)
    })

    it('should return 404 for SESSION_NOT_FOUND', () => {
      expect(getHttpStatusForError(ADAPTIVE_QUIZ_ERRORS.SESSION_NOT_FOUND)).toBe(404)
    })

    it('should return 400 for VALIDATION_ERROR', () => {
      expect(getHttpStatusForError(ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR)).toBe(400)
    })

    it('should return 429 for DAILY_LIMIT_EXCEEDED', () => {
      expect(getHttpStatusForError(ADAPTIVE_QUIZ_ERRORS.DAILY_LIMIT_EXCEEDED)).toBe(429)
    })

    it('should return 500 for DATABASE_ERROR', () => {
      expect(getHttpStatusForError(ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR)).toBe(500)
    })

    it('should return 500 for unknown error types', () => {
      expect(getHttpStatusForError('UNKNOWN_ERROR')).toBe(500)
    })
  })

  describe('checkAuthentication', () => {
    it('should return null when user is authenticated', () => {
      const mockReq = {
        user: { id: '123', email: 'test@example.com' },
      } as PayloadRequest

      const result = checkAuthentication(mockReq)
      expect(result).toBeNull()
    })

    it('should return 401 Response when user is not authenticated', async () => {
      const mockReq = {
        user: null,
      } as PayloadRequest

      const result = checkAuthentication(mockReq)
      expect(result).not.toBeNull()
      
      if (result) {
        expect(result.status).toBe(401)
        const json = await result.json()
        expect(json.success).toBe(false)
        expect(json.error.type).toBe(ADAPTIVE_QUIZ_ERRORS.AUTHENTICATION_REQUIRED)
      }
    })
  })

  describe('createSuccessResponse', () => {
    it('should create a success response with default status 200', async () => {
      const data = { message: 'Success', value: 42 }
      const response = createSuccessResponse(data)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual(data)
    })

    it('should create a success response with custom status code', async () => {
      const data = { id: '123' }
      const response = createSuccessResponse(data, 201)

      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.success).toBe(true)
      expect(json.data).toEqual(data)
    })
  })

  describe('createSimpleErrorResponse', () => {
    it('should create an error response with default values', async () => {
      const message = 'Something went wrong'
      const response = createSimpleErrorResponse(message)

      expect(response.status).toBe(500)
      const json = await response.json()
      expect(json.success).toBe(false)
      expect(json.error.message).toBe(message)
      expect(json.error.type).toBe(ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR)
      expect(json.canRetry).toBe(false)
    })

    it('should create an error response with custom values', async () => {
      const message = 'Invalid input'
      const response = createSimpleErrorResponse(
        message,
        ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR,
        400
      )

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.success).toBe(false)
      expect(json.error.message).toBe(message)
      expect(json.error.type).toBe(ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR)
    })
  })

  describe('validateRequiredParams', () => {
    it('should return null when all required params are present', () => {
      const params = {
        name: 'John',
        email: 'john@example.com',
        age: 30,
      }
      const requiredFields = ['name', 'email']

      const result = validateRequiredParams(params, requiredFields)
      expect(result).toBeNull()
    })

    it('should return error response when params are missing', async () => {
      const params = {
        name: 'John',
      }
      const requiredFields = ['name', 'email', 'age']

      const result = validateRequiredParams(params, requiredFields)
      expect(result).not.toBeNull()

      if (result) {
        expect(result.status).toBe(400)
        const json = await result.json()
        expect(json.success).toBe(false)
        expect(json.error.message).toContain('email')
        expect(json.error.message).toContain('age')
      }
    })

    it('should return error when params are null or empty string', async () => {
      const params = {
        name: '',
        email: null,
        age: undefined,
      }
      const requiredFields = ['name', 'email', 'age']

      const result = validateRequiredParams(params, requiredFields)
      expect(result).not.toBeNull()

      if (result) {
        const json = await result.json()
        expect(json.error.type).toBe(ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR)
      }
    })

    it('should handle zero as valid value', () => {
      const params = {
        count: 0,
        name: 'Test',
      }
      const requiredFields = ['count', 'name']

      const result = validateRequiredParams(params, requiredFields)
      expect(result).toBeNull()
    })
  })

  describe('extractUrlParams', () => {
    it('should extract sessionId from URL', () => {
      const mockReq = {
        url: 'http://localhost:3000/api/adaptive-quiz/sessions/abc123/results',
      } as PayloadRequest

      const params = extractUrlParams(mockReq)
      expect(params.sessionId).toBe('abc123')
    })

    it('should extract MongoDB ObjectId from URL', () => {
      const mockReq = {
        url: 'http://localhost:3000/api/items/507f1f77bcf86cd799439011',
      } as PayloadRequest

      const params = extractUrlParams(mockReq)
      expect(params.id).toBe('507f1f77bcf86cd799439011')
    })

    it('should return empty object when no params in URL', () => {
      const mockReq = {
        url: 'http://localhost:3000/api/health',
      } as PayloadRequest

      const params = extractUrlParams(mockReq)
      expect(Object.keys(params).length).toBe(0)
    })

    it('should handle URL without protocol', () => {
      const mockReq = {
        url: '/api/sessions/test123/data',
      } as PayloadRequest

      const params = extractUrlParams(mockReq)
      expect(params.sessionId).toBe('test123')
    })
  })
})
