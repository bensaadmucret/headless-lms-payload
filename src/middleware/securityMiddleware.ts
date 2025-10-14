import type { Request, Response, NextFunction } from 'express'
import { ValidationService } from '../services/ValidationService'
import { SecurityService } from '../services/SecurityService'
import { AuditLogService } from '../services/AuditLogService'

/**
 * Middleware de validation de sécurité pour les endpoints des quiz adaptatifs
 */
export function createSecurityMiddleware(payload: any) {
  const validationService = new ValidationService(payload)
  const securityService = new SecurityService(payload)
  const auditService = new AuditLogService(payload)

  return {
    /**
     * Middleware d'authentification et validation utilisateur
     */
    validateAuthentication: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authResult = securityService.validateUserAuthentication(req)
        
        if (!authResult.isAuthenticated) {
          await auditService.logUnauthorizedAccess(
            req, 
            'authentication', 
            'unknown', 
            authResult.error || 'Authentication failed'
          )
          
          return res.status(401).json({
            success: false,
            error: {
              type: 'authentication_required',
              message: authResult.error || 'Authentification requise'
            }
          })
        }

        // Valider le profil utilisateur
        const profileResult = await securityService.validateUserProfile(authResult.user.id)
        if (!profileResult.isValid) {
          return res.status(400).json({
            success: false,
            error: {
              type: 'profile_incomplete',
              message: profileResult.error || 'Profil utilisateur incomplet'
            }
          })
        }

        req.user = authResult.user
        next()
      } catch (error) {
        console.error('Authentication middleware error:', error)
        res.status(500).json({
          success: false,
          error: {
            type: 'technical_error',
            message: 'Erreur technique lors de l\'authentification'
          }
        })
      }
    },

    /**
     * Middleware de validation des paramètres de génération
     */
    validateGenerationParams: (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitiser les paramètres
        req.body = validationService.sanitizeParams(req.body)
        
        // Valider les paramètres
        const validationResult = validationService.validateGenerationParams(req.body)
        
        if (!validationResult.isValid) {
          auditService.logValidationFailure(req, 'generation_params', validationResult.errors)
          
          return res.status(400).json({
            success: false,
            error: {
              type: 'validation_failed',
              message: 'Paramètres de génération invalides',
              details: validationResult.errors
            }
          })
        }

        // Valider les limites de données
        const limitsResult = validationService.validateDataLimits(req.body)
        if (!limitsResult.isValid) {
          auditService.logValidationFailure(req, 'data_limits', limitsResult.errors)
          
          return res.status(400).json({
            success: false,
            error: {
              type: 'data_limits_exceeded',
              message: 'Limites de données dépassées',
              details: limitsResult.errors
            }
          })
        }

        next()
      } catch (error) {
        console.error('Generation params validation error:', error)
        res.status(500).json({
          success: false,
          error: {
            type: 'technical_error',
            message: 'Erreur technique lors de la validation'
          }
        })
      }
    },

    /**
     * Middleware de validation des paramètres de soumission
     */
    validateSubmissionParams: (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitiser les paramètres
        req.body = validationService.sanitizeParams(req.body)
        
        // Valider les paramètres
        const validationResult = validationService.validateSubmissionParams(req.body)
        
        if (!validationResult.isValid) {
          auditService.logValidationFailure(req, 'submission_params', validationResult.errors)
          
          return res.status(400).json({
            success: false,
            error: {
              type: 'validation_failed',
              message: 'Paramètres de soumission invalides',
              details: validationResult.errors
            }
          })
        }

        // Valider les limites de données
        const limitsResult = validationService.validateDataLimits(req.body)
        if (!limitsResult.isValid) {
          auditService.logValidationFailure(req, 'data_limits', limitsResult.errors)
          
          return res.status(400).json({
            success: false,
            error: {
              type: 'data_limits_exceeded',
              message: 'Limites de données dépassées',
              details: limitsResult.errors
            }
          })
        }

        next()
      } catch (error) {
        console.error('Submission params validation error:', error)
        res.status(500).json({
          success: false,
          error: {
            type: 'technical_error',
            message: 'Erreur technique lors de la validation'
          }
        })
      }
    },

    /**
     * Middleware de validation de propriété de session
     */
    validateSessionOwnership: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sessionId = req.params.sessionId || req.body.sessionId
        const userId = req.user?.id

        if (!sessionId) {
          return res.status(400).json({
            success: false,
            error: {
              type: 'missing_session_id',
              message: 'ID de session requis'
            }
          })
        }

        // Valider le format du sessionId
        if (!validationService.validateSessionIdFormat(sessionId)) {
          await auditService.logSecurityViolation(req, 'invalid_session_id_format', { sessionId })
          
          return res.status(400).json({
            success: false,
            error: {
              type: 'invalid_session_id',
              message: 'Format d\'ID de session invalide'
            }
          })
        }

        // Vérifier la propriété
        const ownershipResult = await securityService.validateSessionOwnership(sessionId, userId)
        
        if (!ownershipResult.isOwner) {
          await auditService.logUnauthorizedAccess(
            req, 
            'adaptiveQuizSession', 
            sessionId, 
            ownershipResult.error || 'Session ownership validation failed'
          )
          
          return res.status(403).json({
            success: false,
            error: {
              type: 'access_denied',
              message: ownershipResult.error || 'Accès non autorisé à cette session'
            }
          })
        }

        // Vérifier la validité de la session
        const validityResult = await securityService.validateSessionValidity(sessionId)
        
        if (!validityResult.isValid) {
          return res.status(400).json({
            success: false,
            error: {
              type: 'invalid_session',
              message: validityResult.error || 'Session invalide',
              reason: validityResult.reason
            }
          })
        }

        // Ajouter la session aux données de la requête
        req.session = validityResult.session
        next()
      } catch (error) {
        console.error('Session ownership validation error:', error)
        res.status(500).json({
          success: false,
          error: {
            type: 'technical_error',
            message: 'Erreur technique lors de la validation de session'
          }
        })
      }
    },

    /**
     * Middleware de nettoyage automatique des sessions expirées
     */
    cleanupExpiredSessions: async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Exécuter le nettoyage en arrière-plan (ne pas bloquer la requête)
        setImmediate(async () => {
          try {
            await securityService.cleanupExpiredSessions()
          } catch (error) {
            console.error('Background session cleanup failed:', error)
          }
        })
        
        next()
      } catch (error) {
        // Ne pas faire échouer la requête si le nettoyage échoue
        console.error('Session cleanup middleware error:', error)
        next()
      }
    },

    /**
     * Middleware de validation d'intégrité de session
     */
    validateSessionIntegrity: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sessionId = req.params.sessionId || req.body.sessionId
        
        if (sessionId) {
          const integrityResult = await securityService.validateSessionIntegrity(sessionId)
          
          if (!integrityResult.isValid) {
            await auditService.logSecurityViolation(req, 'session_integrity_violation', {
              sessionId,
              issues: integrityResult.issues
            })
            
            return res.status(400).json({
              success: false,
              error: {
                type: 'session_integrity_error',
                message: 'Intégrité de session compromise',
                details: integrityResult.issues
              }
            })
          }
        }
        
        next()
      } catch (error) {
        console.error('Session integrity validation error:', error)
        res.status(500).json({
          success: false,
          error: {
            type: 'technical_error',
            message: 'Erreur technique lors de la validation d\'intégrité'
          }
        })
      }
    }
  }
}

/**
 * Middleware de gestion d'erreurs pour les endpoints des quiz adaptatifs
 */
export function errorHandlingMiddleware(payload: any) {
  const auditService = new AuditLogService(payload)

  return async (error: any, req: Request, res: Response, next: NextFunction) => {
    // Logger l'erreur pour audit
    await auditService.logAction({
      action: 'security_violation',
      resource: 'error_handler',
      resourceId: req.user?.id || 'anonymous',
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      success: false,
      errorMessage: error.message,
      details: {
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      }
    })

    // Réponse d'erreur standardisée
    res.status(500).json({
      success: false,
      error: {
        type: 'technical_error',
        message: 'Une erreur technique est survenue'
      }
    })
  }
}