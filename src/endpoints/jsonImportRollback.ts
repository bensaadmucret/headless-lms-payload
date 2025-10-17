/**
 * Endpoints pour la gestion des rollbacks d'imports JSON
 * Permet aux administrateurs de revenir en arrière sur les imports
 */

import { JSONImportBackupService } from '../services/JSONImportBackupService';

// Instance globale du service de backup
let backupService: JSONImportBackupService;

/**
 * Initialise le service de backup avec l'instance Payload
 */
export const initializeBackupService = (payload: any) => {
  backupService = new JSONImportBackupService(payload);
};

/**
 * Endpoint pour lister les sauvegardes disponibles
 */
export const jsonImportBackupsEndpoint = {
  path: '/json-import/backups',
  method: 'get',
  handler: async (req: any) => {
    try {
      // Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // Vérifier les permissions admin
      const userRole = req.user.role;
      const hasAdminRole = ['admin', 'superadmin'].includes(userRole);

      if (!hasAdminRole) {
        return Response.json({
          success: false,
          error: 'Permissions administrateur requises'
        }, { status: 403 });
      }

      // Récupérer les sauvegardes
      const backups = hasAdminRole && userRole === 'superadmin' ? 
        backupService.getAllBackups() : 
        backupService.getUserBackups(req.user.id);

      // Formater les sauvegardes pour la réponse
      const formattedBackups = backups.map(backup => ({
        id: backup.id,
        jobId: backup.jobId,
        userId: backup.userId,
        timestamp: backup.timestamp,
        description: backup.description,
        affectedCollections: backup.affectedCollections,
        metadata: backup.metadata,
        canRollback: true // TODO: Ajouter validation plus sophistiquée
      }));

      return Response.json({
        success: true,
        data: {
          backups: formattedBackups,
          total: formattedBackups.length
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération des sauvegardes:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour valider qu'un rollback est possible
 */
export const jsonImportValidateRollbackEndpoint = {
  path: '/json-import/rollback/:jobId/validate',
  method: 'get',
  handler: async (req: any) => {
    try {
      // Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      const jobId = req.routeParams?.jobId;

      if (!jobId) {
        return Response.json({
          success: false,
          error: 'JobId requis'
        }, { status: 400 });
      }

      // Vérifier les permissions admin
      const userRole = req.user.role;
      if (!['admin', 'superadmin'].includes(userRole)) {
        return Response.json({
          success: false,
          error: 'Permissions administrateur requises pour le rollback'
        }, { status: 403 });
      }

      // Valider le rollback
      const validation = await backupService.validateRollbackPossible(jobId);

      return Response.json({
        success: true,
        data: {
          jobId,
          rollbackPossible: validation.possible,
          reasons: validation.reasons,
          warnings: validation.warnings,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la validation du rollback:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour exécuter un rollback
 */
export const jsonImportExecuteRollbackEndpoint = {
  path: '/json-import/rollback/:jobId',
  method: 'post',
  handler: async (req: any) => {
    try {
      // Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      const jobId = req.routeParams?.jobId;

      if (!jobId) {
        return Response.json({
          success: false,
          error: 'JobId requis'
        }, { status: 400 });
      }

      // Vérifier les permissions admin
      const userRole = req.user.role;
      if (!['admin', 'superadmin'].includes(userRole)) {
        return Response.json({
          success: false,
          error: 'Permissions administrateur requises pour le rollback'
        }, { status: 403 });
      }

      // Parser les options du rollback
      const body = await req.json().catch(() => ({}));
      const options = {
        reason: body.reason || 'Rollback demandé par l\'administrateur',
        dryRun: body.dryRun === true,
        preserveRelations: body.preserveRelations !== false, // true par défaut
        confirmationRequired: body.confirmationRequired !== false // true par défaut
      };

      // Validation des paramètres
      if (!options.reason || options.reason.trim().length < 10) {
        return Response.json({
          success: false,
          error: 'Une raison détaillée (minimum 10 caractères) est requise pour le rollback'
        }, { status: 400 });
      }

      // Vérifier la confirmation si requise
      if (options.confirmationRequired && !body.confirmed) {
        return Response.json({
          success: false,
          error: 'Confirmation explicite requise pour le rollback',
          data: {
            requiresConfirmation: true,
            message: 'Cette opération va supprimer/modifier des données. Confirmez avec confirmed: true'
          }
        }, { status: 400 });
      }

      console.log(`🔄 Début du rollback pour le job ${jobId} par l'utilisateur ${req.user.id}`);
      console.log(`📝 Raison: ${options.reason}`);
      console.log(`🧪 Mode dry-run: ${options.dryRun}`);

      // Exécuter le rollback
      const result = await backupService.executeRollback(
        jobId,
        req.user.id,
        options
      );

      // Construire la réponse
      const response = {
        success: result.success,
        message: options.dryRun ? 
          'Simulation de rollback terminée' : 
          result.success ? 'Rollback exécuté avec succès' : 'Rollback partiellement échoué',
        data: {
          jobId,
          rollbackResult: result,
          options,
          timestamp: new Date().toISOString(),
          nextSteps: options.dryRun ? [
            'Vérifiez les entités qui seraient affectées',
            'Relancez sans dryRun pour exécuter le rollback',
            'Assurez-vous d\'avoir une justification détaillée'
          ] : result.success ? [
            'Rollback terminé avec succès',
            'Vérifiez que les données sont dans l\'état attendu',
            'Le rollback a été enregistré dans les logs d\'audit'
          ] : [
            'Rollback partiellement échoué',
            'Consultez les erreurs détaillées',
            'Contactez l\'administrateur système si nécessaire'
          ]
        }
      };

      const statusCode = result.success ? 200 : 207; // 207 Multi-Status pour succès partiel

      return Response.json(response, { status: statusCode });

    } catch (error) {
      console.error('💥 Erreur critique lors du rollback:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour obtenir les détails d'une sauvegarde
 */
export const jsonImportBackupDetailsEndpoint = {
  path: '/json-import/backup/:backupId',
  method: 'get',
  handler: async (req: any) => {
    try {
      // Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      const backupId = req.routeParams?.backupId;

      if (!backupId) {
        return Response.json({
          success: false,
          error: 'BackupId requis'
        }, { status: 400 });
      }

      // Vérifier les permissions admin
      const userRole = req.user.role;
      if (!['admin', 'superadmin'].includes(userRole)) {
        return Response.json({
          success: false,
          error: 'Permissions administrateur requises'
        }, { status: 403 });
      }

      // Récupérer les détails de la sauvegarde
      const backup = backupService.getBackupInfo(backupId);

      if (!backup) {
        return Response.json({
          success: false,
          error: `Sauvegarde ${backupId} non trouvée`
        }, { status: 404 });
      }

      // Vérifier les permissions (propriétaire ou superadmin)
      if (backup.userId !== req.user.id && userRole !== 'superadmin') {
        return Response.json({
          success: false,
          error: 'Permissions insuffisantes pour consulter cette sauvegarde'
        }, { status: 403 });
      }

      // Calculer des statistiques détaillées
      const stats = {
        totalEntitiesByCollection: {} as Record<string, number>,
        operationsByType: { create: 0, update: 0, delete: 0 },
        estimatedRollbackTime: 0
      };

      for (const [collection, entities] of Object.entries(backup.backupData)) {
        stats.totalEntitiesByCollection[collection] = entities.length;
        
        for (const entity of entities) {
          stats.operationsByType[entity.operation]++;
        }
      }

      // Estimation du temps de rollback (0.5s par entité)
      stats.estimatedRollbackTime = backup.metadata.totalEntities * 0.5;

      return Response.json({
        success: true,
        data: {
          backup: {
            ...backup,
            // Ne pas exposer toutes les données de sauvegarde pour éviter les réponses trop lourdes
            backupData: Object.keys(backup.backupData).reduce((acc, collection) => {
              acc[collection] = {
                count: backup.backupData[collection].length,
                sample: backup.backupData[collection].slice(0, 3).map(entity => ({
                  id: entity.id,
                  operation: entity.operation
                }))
              };
              return acc;
            }, {} as any)
          },
          statistics: stats
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération des détails de sauvegarde:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour nettoyer les anciennes sauvegardes
 */
export const jsonImportCleanupBackupsEndpoint = {
  path: '/json-import/backups/cleanup',
  method: 'post',
  handler: async (req: any) => {
    try {
      // Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // Vérifier les permissions superadmin
      const userRole = req.user.role;
      if (userRole !== 'superadmin') {
        return Response.json({
          success: false,
          error: 'Permissions superadmin requises pour le nettoyage'
        }, { status: 403 });
      }

      // Nettoyer les anciennes sauvegardes
      const cleanedCount = await backupService.cleanupOldBackups();

      return Response.json({
        success: true,
        message: `${cleanedCount} sauvegardes anciennes supprimées`,
        data: {
          cleanedCount,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors du nettoyage des sauvegardes:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};