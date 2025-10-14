import type { Payload } from 'payload'

export interface AuditLogEntry {
  action: string
  resource: string
  resourceId: string
  userId?: string
  userEmail?: string
  userRole?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  success: boolean
  errorMessage?: string
}

export type AuditAction = 
  | 'adaptive_quiz_generated'
  | 'adaptive_quiz_submitted'
  | 'adaptive_quiz_results_viewed'
  | 'session_created'
  | 'session_expired'
  | 'session_abandoned'
  | 'rate_limit_exceeded'
  | 'unauthorized_access_attempt'
  | 'validation_failed'
  | 'security_violation'

// Type pour la collection auditlogs existante
interface ExistingAuditLog {
  user: { relationTo: 'users'; value: number } | null
  action: string
  collection: string
  documentId: string
  diff?: Record<string, any>
  timestamp: Date
}

/**
 * Service d'audit logging pour les opérations sensibles des quiz adaptatifs
 */
export class AuditLogService {
  constructor(private payload: Payload) {}

  /**
   * Enregistre une entrée d'audit
   */
  async logAction(entry: Partial<AuditLogEntry> & { action: AuditAction; resource: string }): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId || '',
        userId: entry.userId,
        userEmail: entry.userEmail,
        userRole: entry.userRole,
        details: entry.details || {},
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: new Date(),
        success: entry.success !== false, // Par défaut true sauf si explicitement false
        errorMessage: entry.errorMessage
      }

      // Adapter au format de la collection auditlogs existante
      const auditData: ExistingAuditLog = {
        user: auditEntry.userId ? { relationTo: 'users', value: Number(auditEntry.userId) } : null,
        action: `${auditEntry.action}${auditEntry.success ? '' : '_failed'}`,
        collection: auditEntry.resource,
        documentId: auditEntry.resourceId,
        diff: {
          details: auditEntry.details,
          ipAddress: auditEntry.ipAddress,
          userAgent: auditEntry.userAgent,
          userEmail: auditEntry.userEmail,
          userRole: auditEntry.userRole,
          success: auditEntry.success,
          errorMessage: auditEntry.errorMessage
        },
        timestamp: auditEntry.timestamp
      }

      // Enregistrer dans la collection auditlogs avec type assertion
      await (this.payload as any).create({
        collection: 'auditlogs',
        data: auditData
      })

      // Log également dans la console pour le développement
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] ${auditEntry.action} - ${auditEntry.resource}:${auditEntry.resourceId} by ${auditEntry.userEmail || auditEntry.userId || 'anonymous'}`)
      }
    } catch (error) {
      // Ne pas faire échouer l'opération principale si l'audit échoue
      console.error('Failed to log audit entry:', error)
    }
  }

  /**
   * Log la génération d'un quiz adaptatif
   */
  async logQuizGeneration(req: any, sessionId: string, success: boolean, errorMessage?: string): Promise<void> {
    await this.logAction({
      action: 'adaptive_quiz_generated',
      resource: 'adaptiveQuizSession',
      resourceId: sessionId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers?.['user-agent'],
      success,
      errorMessage,
      details: {
        sessionId,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log la soumission de résultats
   */
  async logQuizSubmission(req: any, sessionId: string, answersCount: number, success: boolean, errorMessage?: string): Promise<void> {
    await this.logAction({
      action: 'adaptive_quiz_submitted',
      resource: 'adaptiveQuizResult',
      resourceId: sessionId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers?.['user-agent'],
      success,
      errorMessage,
      details: {
        sessionId,
        answersCount,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log la consultation de résultats
   */
  async logResultsViewed(req: any, sessionId: string, success: boolean, errorMessage?: string): Promise<void> {
    await this.logAction({
      action: 'adaptive_quiz_results_viewed',
      resource: 'adaptiveQuizResult',
      resourceId: sessionId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers?.['user-agent'],
      success,
      errorMessage,
      details: {
        sessionId,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log les tentatives d'accès non autorisé
   */
  async logUnauthorizedAccess(req: any, resource: string, resourceId: string, reason: string): Promise<void> {
    await this.logAction({
      action: 'unauthorized_access_attempt',
      resource,
      resourceId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers?.['user-agent'],
      success: false,
      errorMessage: reason,
      details: {
        attemptedResource: resource,
        attemptedResourceId: resourceId,
        reason,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log les violations de limite de taux
   */
  async logRateLimitViolation(req: any, limitType: 'daily' | 'cooldown', currentCount?: number): Promise<void> {
    await this.logAction({
      action: 'rate_limit_exceeded',
      resource: 'rateLimit',
      resourceId: req.user?.id || 'anonymous',
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers?.['user-agent'],
      success: false,
      errorMessage: `Rate limit exceeded: ${limitType}`,
      details: {
        limitType,
        currentCount,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log les échecs de validation
   */
  async logValidationFailure(req: any, resource: string, validationErrors: any[]): Promise<void> {
    await this.logAction({
      action: 'validation_failed',
      resource,
      resourceId: req.user?.id || 'anonymous',
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers?.['user-agent'],
      success: false,
      errorMessage: 'Validation failed',
      details: {
        validationErrors,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Log les violations de sécurité
   */
  async logSecurityViolation(req: any, violationType: string, details: Record<string, any>): Promise<void> {
    await this.logAction({
      action: 'security_violation',
      resource: 'security',
      resourceId: req.user?.id || 'anonymous',
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers?.['user-agent'],
      success: false,
      errorMessage: `Security violation: ${violationType}`,
      details: {
        violationType,
        ...details,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Obtient l'adresse IP du client
   */
  private getClientIP(req: any): string {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.headers?.['x-forwarded-for']?.split(',')[0] || 
           'unknown'
  }

  /**
   * Recherche dans les logs d'audit
   */
  async searchAuditLogs(filters: {
    action?: AuditAction
    resource?: string
    userId?: string
    success?: boolean
    startDate?: Date
    endDate?: Date
    limit?: number
  }) {
    const where: any = {}

    if (filters.action) {
      where.action = { contains: filters.action }
    }

    if (filters.resource) {
      where.collection = { equals: filters.resource }
    }

    if (filters.userId) {
      where.user = { equals: filters.userId }
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) {
        where.timestamp.greater_than_equal = filters.startDate
      }
      if (filters.endDate) {
        where.timestamp.less_than_equal = filters.endDate
      }
    }

    return await (this.payload as any).find({
      collection: 'auditlogs',
      where,
      sort: '-timestamp',
      limit: filters.limit || 100
    })
  }

  /**
   * Obtient les statistiques d'audit
   */
  async getAuditStats(timeframe: 'day' | 'week' | 'month' = 'day') {
    const now = new Date()
    const startDate = new Date()

    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
    }

    const logs = await (this.payload as any).find({
      collection: 'auditlogs',
      where: {
        timestamp: { greater_than: startDate }
      },
      limit: 1000
    })

    const stats = {
      total: logs.totalDocs,
      successful: 0,
      failed: 0,
      byAction: {} as Record<string, number>,
      byResource: {} as Record<string, number>
    }

    logs.docs.forEach((log: any) => {
      const isSuccessful = !log.action.includes('_failed')
      if (isSuccessful) {
        stats.successful++
      } else {
        stats.failed++
      }

      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1
      stats.byResource[log.collection] = (stats.byResource[log.collection] || 0) + 1
    })

    return stats
  }
}