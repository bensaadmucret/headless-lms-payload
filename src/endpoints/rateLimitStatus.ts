import type { Endpoint } from 'payload/config'
import { RateLimitService } from '../services/RateLimitService'

/**
 * Endpoint pour vérifier le statut des limitations de taux
 * GET /api/rate-limit/status
 */
export const rateLimitStatusEndpoint: Endpoint = {
  path: '/rate-limit/status',
  method: 'get',
  handler: async (req, res) => {
    try {
      const userId = req.user?.id
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'authentication_required',
            message: 'Authentification requise'
          }
        })
      }

      const rateLimitService = new RateLimitService(req.payload)
      const status = await rateLimitService.checkRateLimit(userId)
      const usageStats = await rateLimitService.getUserUsageStats(userId)

      res.json({
        success: true,
        data: {
          rateLimit: status,
          usage: usageStats,
          message: status.canGenerate 
            ? 'Vous pouvez générer un nouveau quiz adaptatif'
            : rateLimitService.getRateLimitErrorMessage(status)
        }
      })
    } catch (error) {
      console.error('Error checking rate limit status:', error)
      res.status(500).json({
        success: false,
        error: {
          type: 'technical_error',
          message: 'Erreur technique lors de la vérification des limitations'
        }
      })
    }
  }
}

/**
 * Endpoint pour obtenir les statistiques d'utilisation détaillées
 * GET /api/rate-limit/usage-stats
 */
export const usageStatsEndpoint: Endpoint = {
  path: '/rate-limit/usage-stats',
  method: 'get',
  handler: async (req, res) => {
    try {
      const userId = req.user?.id
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            type: 'authentication_required',
            message: 'Authentification requise'
          }
        })
      }

      const rateLimitService = new RateLimitService(req.payload)
      const usageStats = await rateLimitService.getUserUsageStats(userId)

      res.json({
        success: true,
        data: usageStats
      })
    } catch (error) {
      console.error('Error fetching usage stats:', error)
      res.status(500).json({
        success: false,
        error: {
          type: 'technical_error',
          message: 'Erreur technique lors de la récupération des statistiques'
        }
      })
    }
  }
}