import type { PayloadRequest } from 'payload';
import { AIQuizAuditService } from '../services/AIQuizAuditService';

export const generationMetricsEndpoint = {
  path: '/generation-metrics',
  method: 'get' as const,
  handler: async (req: PayloadRequest) => {
    try {
      // Vérifier les permissions
      if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
        return Response.json(
          { error: 'Accès non autorisé' },
          { status: 403 }
        );
      }

      const auditService = new AIQuizAuditService(req.payload);
      
      // Récupérer les paramètres de requête
      const timeframe = (req.query?.timeframe as 'hour' | 'day' | 'week' | 'month') || 'day';
      const userId = req.query?.userId as string;
      const action = req.query?.action as string;
      const status = req.query?.status as string;

      // Construire les filtres
      const filters: any = {};
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (status) filters.status = status;

      // Obtenir les métriques
      const metrics = await auditService.getGenerationMetrics(timeframe, filters);
      
      // Obtenir les statistiques d'erreurs
      const errorStats = await auditService.getErrorStats(timeframe);
      
      // Obtenir les statistiques de performance
      const performanceStats = await auditService.getPerformanceStats(timeframe);

      return Response.json({
        success: true,
        data: {
          metrics,
          errorStats,
          performanceStats,
          timeframe,
          filters,
        },
      });

    } catch (error: any) {
      console.error('Erreur récupération métriques génération:', error);
      return Response.json(
        { 
          success: false, 
          error: 'Erreur lors de la récupération des métriques',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  },
};

export const generationLogsEndpoint = {
  path: '/generation-logs',
  method: 'get' as const,
  handler: async (req: PayloadRequest) => {
    try {
      // Vérifier les permissions
      if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
        return Response.json(
          { error: 'Accès non autorisé' },
          { status: 403 }
        );
      }

      const auditService = new AIQuizAuditService(req.payload);
      
      // Récupérer les paramètres de requête
      const filters = {
        userId: req.query?.userId as string,
        action: req.query?.action as string,
        status: req.query?.status as string,
        startDate: req.query?.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query?.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query?.limit ? parseInt(req.query.limit as string) : 50,
        page: req.query?.page ? parseInt(req.query.page as string) : 1,
      };

      // Nettoyer les filtres undefined
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      // Obtenir les logs
      const logs = await auditService.getGenerationLogs(filters);

      return Response.json({
        success: true,
        data: logs,
        filters,
      });

    } catch (error: any) {
      console.error('Erreur récupération logs génération:', error);
      return Response.json(
        { 
          success: false, 
          error: 'Erreur lors de la récupération des logs',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  },
};

export const cleanupOldLogsEndpoint = {
  path: '/cleanup-generation-logs',
  method: 'post' as const,
  handler: async (req: PayloadRequest) => {
    try {
      // Vérifier les permissions (seuls les superadmins peuvent nettoyer)
      if (!req.user || req.user.role !== 'superadmin') {
        return Response.json(
          { error: 'Accès non autorisé. Seuls les superadmins peuvent nettoyer les logs.' },
          { status: 403 }
        );
      }

      const auditService = new AIQuizAuditService(req.payload);
      
      // Récupérer les paramètres
      const retentionDays = req.body?.retentionDays || 90;
      
      if (retentionDays < 7) {
        return Response.json(
          { error: 'La rétention doit être d\'au moins 7 jours' },
          { status: 400 }
        );
      }

      // Nettoyer les anciens logs
      const deletedCount = await auditService.cleanupOldLogs(retentionDays);

      return Response.json({
        success: true,
        message: `${deletedCount} anciens logs supprimés`,
        deletedCount,
        retentionDays,
      });

    } catch (error: any) {
      console.error('Erreur nettoyage logs génération:', error);
      return Response.json(
        { 
          success: false, 
          error: 'Erreur lors du nettoyage des logs',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  },
};