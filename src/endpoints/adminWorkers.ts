import { getAllQueueStats, cleanAllQueues } from '../jobs/queue'
import type { PayloadRequest } from 'payload'
import type { Response, NextFunction } from 'express'

// Extension du type PayloadRequest pour inclure les params Express
interface PayloadRequestWithParams<P = any> extends PayloadRequest {
  params: P
}

// Types pour les endpoints Payload CMS
type Endpoint = {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  handler: (req: PayloadRequest | PayloadRequestWithParams, res: Response, next: NextFunction) => Promise<void> | void;
};

/**
 * Endpoint pour obtenir le statut des workers et des queues
 */
export const getWorkersStatusEndpoint: Endpoint = {
  path: '/admin/workers/status',
  method: 'get',
  handler: async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentification requise' })
        return
      }

      // Statut des queues Bull
      const queueStats = await getAllQueueStats()
      
      const totalWaiting = queueStats.reduce((sum, q) => sum + q.waiting, 0)
      const totalActive = queueStats.reduce((sum, q) => sum + q.active, 0)
      const totalCompleted = queueStats.reduce((sum, q) => sum + q.completed, 0)
      const totalFailed = queueStats.reduce((sum, q) => sum + q.failed, 0)

      res.json({
        success: true,
        data: {
          workers: {
            isRunning: true, // Simplifié pour l'instant
            description: 'Workers Bull classiques',
          },
          queues: {
            stats: queueStats,
            summary: {
              totalWaiting,
              totalActive, 
              totalCompleted,
              totalFailed,
            },
            health: {
              redis: 'connected',
              totalJobs: totalWaiting + totalActive + totalCompleted,
              activeProcessing: totalActive,
              queueBacklog: totalWaiting,
            }
          },
          system: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
          }
        }
      })

    } catch (error) {
      console.error('Erreur récupération statut workers:', error)
      res.status(500).json({
        error: 'Erreur interne',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  },
}

/**
 * Endpoint pour redémarrer les workers (simplifié)
 */
export const restartWorkersEndpoint: Endpoint = {
  path: '/admin/workers/restart',
  method: 'post',
  handler: async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentification requise' })
        return
      }

      console.log('🔄 Redémarrage simulé par un administrateur')
      
      res.json({
        success: true,
        message: 'Fonctionnalité de redémarrage temporairement désactivée',
        data: {
          requestedAt: new Date().toISOString(),
          requestedBy: req.user.email,
        }
      })

    } catch (error) {
      console.error('Erreur redémarrage workers:', error)
      res.status(500).json({
        error: 'Erreur lors du redémarrage',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  },
}

/**
 * Endpoint pour nettoyer manuellement les anciennes jobs
 */
export const cleanOldJobsEndpoint: Endpoint = {
  path: '/admin/workers/cleanup',
  method: 'post',
  handler: async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentification requise' })
        return
      }

      // Use the imported cleanAllQueues function directly
      
      console.log('🧹 Nettoyage des jobs initié par un administrateur')
      
      await cleanAllQueues()

      res.json({
        success: true,
        message: 'Nettoyage des anciennes jobs terminé',
        data: {
          cleanedAt: new Date().toISOString(),
          cleanedBy: req.user.email,
        }
      })

    } catch (error) {
      console.error('Erreur nettoyage jobs:', error)
      res.status(500).json({
        error: 'Erreur lors du nettoyage',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  },
}

/**
 * Endpoint pour obtenir les détails d'une queue spécifique (simplifié)
 */
export const getQueueDetailsEndpoint: Endpoint = {
  path: '/admin/queues/:queueName',
  method: 'get',
  handler: async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentification requise' })
        return
      }

      // Vérifier que params existe (type guard)
      if (!('params' in req) || !req.params?.queueName) {
        res.status(400).json({ error: 'Paramètre queueName manquant' })
        return
      }

      const { queueName } = req.params
      
      // Simplifié pour l'instant
      const validQueues = ['document-extraction', 'nlp-processing', 'ai-enrichment', 'validation-check']
      if (!validQueues.includes(queueName)) {
        res.status(404).json({ 
          error: `Queue '${queueName}' non trouvée`,
          availableQueues: validQueues
        })
        return
      }

      res.json({
        success: true,
        message: 'Détails des queues temporairement simplifiés',
        data: {
          queueName,
          status: 'running',
          description: `Queue ${queueName} avec système Bull classique`,
        }
      })

    } catch (error) {
      const queueNameForLog = ('params' in req && (req as PayloadRequestWithParams<{ queueName: string }>).params?.queueName) 
        ? (req as PayloadRequestWithParams<{ queueName: string }>).params.queueName 
        : 'unknown'
      console.error(`Erreur récupération détails queue ${queueNameForLog}:`, error)
      res.status(500).json({
        error: 'Erreur interne',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  },
}