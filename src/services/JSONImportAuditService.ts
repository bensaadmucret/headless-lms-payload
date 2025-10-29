/**
 * Service d'audit spécialisé pour les imports JSON
 * Utilise la collection AuditLogs existante avec des données enrichies pour les imports
 */

import { Payload } from 'payload';
import { ImportData, ImportType, ImportFormat, ImportOptions } from '../types/jsonImport';

export interface ImportAuditData {
  user: number;
  action: 'import_started' | 'import_completed' | 'import_failed' | 'import_cancelled' | 'validation_performed' | 'rollback_executed';
  collection: 'json-imports';
  documentId: string; // jobId
  diff?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    importSummary?: ImportSummary;
    rollbackDetails?: {
      reason: string;
      success: boolean;
      timestamp: string;
    };
  };
  timestamp: string;
}

export interface ImportSummary {
  fileName: string;
  format: ImportFormat;
  importType: ImportType;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  duration?: number; // en secondes
  options: ImportOptions;
  errors?: Array<{
    type: string;
    message: string;
    itemIndex?: number;
  }>;
  warnings?: string[];
  createdEntities?: Array<{
    collection: string;
    id: string;
    type: string;
  }>;
}

export class JSONImportAuditService {
  private payload: Payload;

  constructor(payload: Payload) {
    this.payload = payload;
  }

  /**
   * Enregistre le début d'un import
   */
  async logImportStarted(
    userId: number,
    jobId: string,
    fileName: string,
    format: ImportFormat,
    importType: ImportType,
    totalItems: number,
    options: ImportOptions
  ): Promise<void> {
    try {
      const auditData: ImportAuditData = {
        user: userId,
        action: 'import_started',
        collection: 'json-imports',
        documentId: jobId,
        diff: {
          importSummary: {
            fileName,
            format,
            importType,
            totalItems,
            processedItems: 0,
            successfulItems: 0,
            failedItems: 0,
            skippedItems: 0,
            options
          }
        },
        timestamp: new Date().toISOString()
      };

      await this.payload.create({
        collection: 'auditlogs',
        data: auditData
      });

      console.log(`📝 Audit: Import démarré - Job ${jobId} par utilisateur ${userId}`);
    } catch (error) {
      console.error('❌ Erreur lors du logging d\'audit (import started):', error);
      // Ne pas bloquer l'import si l'audit échoue
    }
  }

  /**
   * Enregistre la completion d'un import avec résumé détaillé
   */
  async logImportCompleted(
    userId: number,
    jobId: string,
    summary: ImportSummary,
    createdEntities: Array<{ collection: string; id: string; type: string }>
  ): Promise<void> {
    try {
      const auditData: ImportAuditData = {
        user: userId,
        action: 'import_completed',
        collection: 'json-imports',
        documentId: jobId,
        diff: {
          importSummary: {
            ...summary,
            createdEntities
          }
        },
        timestamp: new Date().toISOString()
      };

      await this.payload.create({
        collection: 'auditlogs',
        data: auditData
      });

      console.log(`✅ Audit: Import terminé - Job ${jobId}, ${summary.successfulItems}/${summary.totalItems} éléments créés`);
    } catch (error) {
      console.error('❌ Erreur lors du logging d\'audit (import completed):', error);
    }
  }

  /**
   * Enregistre l'échec d'un import avec détails des erreurs
   */
  async logImportFailed(
    userId: number,
    jobId: string,
    summary: ImportSummary,
    criticalError?: string
  ): Promise<void> {
    try {
      const auditData: ImportAuditData = {
        user: userId,
        action: 'import_failed',
        collection: 'json-imports',
        documentId: jobId,
        diff: {
          importSummary: {
            ...summary,
            errors: summary.errors || [],
            ...(criticalError && { criticalError })
          }
        },
        timestamp: new Date().toISOString()
      };

      await this.payload.create({
        collection: 'auditlogs',
        data: auditData
      });

      console.log(`❌ Audit: Import échoué - Job ${jobId}, erreur: ${criticalError || 'Erreurs multiples'}`);
    } catch (error) {
      console.error('❌ Erreur lors du logging d\'audit (import failed):', error);
    }
  }

  /**
   * Enregistre l'annulation d'un import
   */
  async logImportCancelled(
    userId: number,
    jobId: string,
    summary: ImportSummary,
    reason?: string
  ): Promise<void> {
    try {
      const auditData: ImportAuditData = {
        user: userId,
        action: 'import_cancelled',
        collection: 'json-imports',
        documentId: jobId,
        diff: {
          importSummary: {
            ...summary,
            ...(reason && { cancellationReason: reason })
          }
        },
        timestamp: new Date().toISOString()
      };

      await this.payload.create({
        collection: 'auditlogs',
        data: auditData
      });

      console.log(`⏹️ Audit: Import annulé - Job ${jobId}, raison: ${reason || 'Non spécifiée'}`);
    } catch (error) {
      console.error('❌ Erreur lors du logging d\'audit (import cancelled):', error);
    }
  }

  /**
   * Enregistre une validation de fichier
   */
  async logValidationPerformed(
    userId: number,
    fileName: string,
    format: ImportFormat,
    importType: ImportType,
    validationResult: {
      isValid: boolean;
      errors: Array<{ type: string; message: string; }>;
      warnings: string[];
      totalItems: number;
    }
  ): Promise<void> {
    try {
      const auditData: ImportAuditData = {
        user: userId,
        action: 'validation_performed',
        collection: 'json-imports',
        documentId: `validation-${Date.now()}`, // ID unique pour la validation
        diff: {
          importSummary: {
            fileName,
            format,
            importType,
            totalItems: validationResult.totalItems,
            processedItems: 0,
            successfulItems: 0,
            failedItems: 0,
            skippedItems: 0,
            options: {} as ImportOptions,
            errors: validationResult.errors,
            warnings: validationResult.warnings
          }
        },
        timestamp: new Date().toISOString()
      };

      await this.payload.create({
        collection: 'auditlogs',
        data: auditData
      });

      console.log(`🔍 Audit: Validation effectuée - ${fileName}, résultat: ${validationResult.isValid ? 'Valide' : 'Invalide'}`);
    } catch (error) {
      console.error('❌ Erreur lors du logging d\'audit (validation):', error);
    }
  }

  /**
   * Enregistre l'exécution d'un rollback
   */
  async logRollbackExecuted(
    userId: number,
    jobId: string,
    rollbackData: {
      reason: string;
      entitiesRemoved: Array<{ collection: string; id: string; type: string }>;
      entitiesRestored?: Array<{ collection: string; id: string; type: string }>;
      success: boolean;
    }
  ): Promise<void> {
    try {
      const auditData: ImportAuditData = {
        user: userId,
        action: 'rollback_executed',
        collection: 'json-imports',
        documentId: jobId,
        diff: {
          before: {
            entitiesCreated: rollbackData.entitiesRemoved
          },
          after: rollbackData.success ? {
            entitiesRemoved: rollbackData.entitiesRemoved,
            entitiesRestored: rollbackData.entitiesRestored || []
          } : undefined,
          rollbackDetails: {
            reason: rollbackData.reason,
            success: rollbackData.success,
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      };

      await this.payload.create({
        collection: 'auditlogs',
        data: auditData
      });

      console.log(`🔄 Audit: Rollback exécuté - Job ${jobId}, ${rollbackData.entitiesRemoved.length} entités supprimées`);
    } catch (error) {
      console.error('❌ Erreur lors du logging d\'audit (rollback):', error);
    }
  }

  /**
   * Génère un rapport d'activité pour les administrateurs
   */
  async generateActivityReport(
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<{
    totalImports: number;
    successfulImports: number;
    failedImports: number;
    cancelledImports: number;
    totalItemsProcessed: number;
    totalItemsCreated: number;
    mostActiveUsers: Array<{ userId: number; importCount: number; }>;
    errorSummary: Array<{ errorType: string; count: number; }>;
    importsByType: Record<ImportType, number>;
    importsByFormat: Record<ImportFormat, number>;
  }> {
    try {
      // Récupérer tous les logs d'audit d'import dans la période
      const auditLogs = await this.payload.find({
        collection: 'auditlogs',
        where: {
          and: [
            {
              collection: {
                equals: 'json-imports'
              }
            },
            {
              timestamp: {
                greater_than_equal: startDate
              }
            },
            {
              timestamp: {
                less_than_equal: endDate
              }
            },
            ...(userId ? [{
              'user.value': {
                equals: userId
              }
            }] : [])
          ]
        },
        limit: 1000,
        sort: '-timestamp'
      });

      // Analyser les données
      const stats = {
        totalImports: 0,
        successfulImports: 0,
        failedImports: 0,
        cancelledImports: 0,
        totalItemsProcessed: 0,
        totalItemsCreated: 0,
        mostActiveUsers: [] as Array<{ userId: number; importCount: number; }>,
        errorSummary: [] as Array<{ errorType: string; count: number; }>,
        importsByType: {} as Record<ImportType, number>,
        importsByFormat: {} as Record<ImportFormat, number>
      };

      const userActivity = new Map<number, number>();
      const errorCounts = new Map<string, number>();

      type AuditLogDocument = ImportAuditData & {
        user?: ImportAuditData['user'] | { value?: number; id?: number } | null;
      };

      for (const log of auditLogs.docs) {
        const logData = log as AuditLogDocument;
        const summary = logData.diff?.importSummary;

        if (!summary) continue;

        // Compter les activités par utilisateur
        const userField = logData.user as AuditLogDocument['user'];
        const extractedUserId = typeof userField === 'object' && userField !== null
          ? (userField as { value?: number; id?: number }).value ?? (userField as { id?: number }).id ?? null
          : userField;

        if (typeof extractedUserId === 'number') {
          userActivity.set(extractedUserId, (userActivity.get(extractedUserId) || 0) + 1);
        }

        // Analyser selon l'action
        switch (logData.action) {
          case 'import_started':
            stats.totalImports++;
            break;

          case 'import_completed':
            stats.successfulImports++;
            stats.totalItemsProcessed += summary.processedItems || 0;
            stats.totalItemsCreated += summary.successfulItems || 0;
            break;

          case 'import_failed':
            stats.failedImports++;
            // Compter les types d'erreurs
            if (summary.errors) {
              for (const error of summary.errors) {
                errorCounts.set(error.type, (errorCounts.get(error.type) || 0) + 1);
              }
            }
            break;

          case 'import_cancelled':
            stats.cancelledImports++;
            break;
        }

        // Compter par type et format
        if (summary.importType) {
          stats.importsByType[summary.importType] = (stats.importsByType[summary.importType] || 0) + 1;
        }
        if (summary.format) {
          stats.importsByFormat[summary.format] = (stats.importsByFormat[summary.format] || 0) + 1;
        }
      }

      // Trier les utilisateurs les plus actifs
      stats.mostActiveUsers = Array.from(userActivity.entries())
        .map(([userId, count]) => ({ userId, importCount: count }))
        .sort((a, b) => b.importCount - a.importCount)
        .slice(0, 10);

      // Trier les erreurs par fréquence
      stats.errorSummary = Array.from(errorCounts.entries())
        .map(([errorType, count]) => ({ errorType, count }))
        .sort((a, b) => b.count - a.count);

      return stats;

    } catch (error) {
      console.error('❌ Erreur lors de la génération du rapport d\'activité:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique d'audit pour un job spécifique
   */
  async getJobAuditHistory(jobId: string): Promise<Array<{
    action: string;
    timestamp: string;
    user: any;
    details: any;
  }>> {
    try {
      const auditLogs = await this.payload.find({
        collection: 'auditlogs',
        where: {
          and: [
            {
              collection: {
                equals: 'json-imports'
              }
            },
            {
              documentId: {
                equals: jobId
              }
            }
          ]
        },
        sort: 'timestamp',
        depth: 1
      });

      return auditLogs.docs.map((log: any) => ({
        action: log.action,
        timestamp: log.timestamp,
        user: log.user,
        details: log.diff
      }));

    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'historique d\'audit:', error);
      throw error;
    }
  }
}