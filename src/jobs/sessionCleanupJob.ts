import type { Payload } from 'payload'
import { SecurityService } from '../services/SecurityService'
import { AuditLogService } from '../services/AuditLogService'

/**
 * Job de nettoyage automatique des sessions expirées
 * Doit être exécuté périodiquement (par exemple toutes les heures)
 */
export class SessionCleanupJob {
  constructor(private payload: Payload) {}

  /**
   * Exécute le nettoyage des sessions expirées
   */
  async execute(): Promise<{ success: boolean; cleaned: number; errors: string[] }> {
    const securityService = new SecurityService(this.payload)
    const auditService = new AuditLogService(this.payload)

    try {
      console.log('[SessionCleanup] Starting session cleanup job...')

      // Nettoyer les sessions expirées
      const cleanupResult = await securityService.cleanupExpiredSessions()

      // Logger l'activité de nettoyage
      if (cleanupResult.cleaned > 0) {
        await auditService.logAction({
          action: 'session_expired',
          resource: 'sessionCleanup',
          resourceId: 'batch',
          details: {
            cleanedSessions: cleanupResult.cleaned,
            errors: cleanupResult.errors,
            timestamp: new Date().toISOString()
          },
          success: cleanupResult.errors.length === 0
        })
      }

      console.log(`[SessionCleanup] Cleaned ${cleanupResult.cleaned} expired sessions`)
      
      if (cleanupResult.errors.length > 0) {
        console.warn('[SessionCleanup] Errors during cleanup:', cleanupResult.errors)
      }

      return {
        success: cleanupResult.errors.length === 0,
        cleaned: cleanupResult.cleaned,
        errors: cleanupResult.errors
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[SessionCleanup] Job failed:', errorMessage)

      // Logger l'échec du job
      await auditService.logAction({
        action: 'security_violation',
        resource: 'sessionCleanup',
        resourceId: 'job',
        details: {
          error: errorMessage,
          timestamp: new Date().toISOString()
        },
        success: false,
        errorMessage
      })

      return {
        success: false,
        cleaned: 0,
        errors: [errorMessage]
      }
    }
  }

  /**
   * Nettoie également les anciens logs d'audit (optionnel)
   */
  async cleanupOldAuditLogs(daysToKeep: number = 90): Promise<{ success: boolean; deleted: number }> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const oldLogs = await (this.payload as any).find({
        collection: 'auditlogs',
        where: {
          timestamp: { less_than: cutoffDate }
        },
        limit: 1000 // Traiter par lots
      })

      let deleted = 0
      for (const log of oldLogs.docs) {
        try {
          await (this.payload as any).delete({
            collection: 'auditlogs',
            id: log.id
          })
          deleted++
        } catch (error) {
          console.error(`Failed to delete audit log ${log.id}:`, error)
        }
      }

      console.log(`[SessionCleanup] Deleted ${deleted} old audit logs (older than ${daysToKeep} days)`)

      return { success: true, deleted }
    } catch (error) {
      console.error('[SessionCleanup] Failed to cleanup old audit logs:', error)
      return { success: false, deleted: 0 }
    }
  }

  /**
   * Statistiques de nettoyage
   */
  async getCleanupStats(): Promise<{
    expiredSessions: number
    activeSessions: number
    oldAuditLogs: number
  }> {
    try {
      const now = new Date()

      // Compter les sessions expirées
      const expiredSessions = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          and: [
            { expiresAt: { less_than: now } },
            { status: { not_equals: 'expired' } }
          ]
        },
        limit: 1
      })

      // Compter les sessions actives
      const activeSessions = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          status: { equals: 'active' }
        },
        limit: 1
      })

      // Compter les anciens logs d'audit (plus de 90 jours)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 90)

      const oldAuditLogs = await (this.payload as any).find({
        collection: 'auditlogs',
        where: {
          timestamp: { less_than: cutoffDate }
        },
        limit: 1
      })

      return {
        expiredSessions: expiredSessions.totalDocs,
        activeSessions: activeSessions.totalDocs,
        oldAuditLogs: oldAuditLogs.totalDocs
      }
    } catch (error) {
      console.error('[SessionCleanup] Failed to get cleanup stats:', error)
      return {
        expiredSessions: 0,
        activeSessions: 0,
        oldAuditLogs: 0
      }
    }
  }
}

/**
 * Fonction utilitaire pour démarrer le job de nettoyage périodique
 */
export function startSessionCleanupScheduler(payload: Payload, intervalMinutes: number = 60) {
  const cleanupJob = new SessionCleanupJob(payload)

  // Exécuter immédiatement
  cleanupJob.execute()

  // Programmer l'exécution périodique
  const intervalMs = intervalMinutes * 60 * 1000
  
  setInterval(async () => {
    try {
      await cleanupJob.execute()
    } catch (error) {
      console.error('[SessionCleanup] Scheduled job failed:', error)
    }
  }, intervalMs)

  console.log(`[SessionCleanup] Scheduler started - running every ${intervalMinutes} minutes`)
}

/**
 * Endpoint pour déclencher manuellement le nettoyage (admin seulement)
 */
export const manualCleanupEndpoint = {
  path: '/admin/cleanup-sessions',
  method: 'post',
  handler: async (req: any, res: any) => {
    try {
      // Vérifier les permissions admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        })
      }

      const cleanupJob = new SessionCleanupJob(req.payload)
      const result = await cleanupJob.execute()

      // Optionnellement nettoyer aussi les anciens logs
      const auditCleanup = await cleanupJob.cleanupOldAuditLogs()

      res.json({
        success: result.success,
        data: {
          sessionCleanup: result,
          auditLogCleanup: auditCleanup,
          stats: await cleanupJob.getCleanupStats()
        }
      })
    } catch (error) {
      console.error('Manual cleanup endpoint error:', error)
      res.status(500).json({
        success: false,
        error: 'Cleanup failed'
      })
    }
  }
}