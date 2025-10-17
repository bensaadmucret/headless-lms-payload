/**
 * Service de sauvegarde et rollback pour les imports JSON
 * Gère les sauvegardes automatiques avant modifications et les opérations de rollback
 */

import { Payload } from 'payload';
import { JSONImportAuditService } from './JSONImportAuditService';

export interface BackupSnapshot {
  id: string;
  jobId: string;
  userId: number;
  timestamp: Date;
  description: string;
  affectedCollections: string[];
  backupData: {
    [collection: string]: Array<{
      id: string;
      data: Record<string, unknown>;
      operation: 'create' | 'update' | 'delete';
      originalData?: Record<string, unknown>; // Pour les updates
    }>;
  };
  metadata: {
    totalEntities: number;
    estimatedSize: number; // en bytes
    importType: string;
    fileName: string;
  };
}

export interface RollbackOptions {
  reason: string;
  dryRun?: boolean;
  preserveRelations?: boolean;
  confirmationRequired?: boolean;
}

export interface RollbackResult {
  success: boolean;
  entitiesRemoved: Array<{ collection: string; id: string; type: string }>;
  entitiesRestored: Array<{ collection: string; id: string; type: string }>;
  errors: Array<{ collection: string; id: string; error: string }>;
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    duration: number; // en millisecondes
  };
}

export class JSONImportBackupService {
  private payload: Payload;
  private auditService: JSONImportAuditService;
  private backups: Map<string, BackupSnapshot> = new Map();

  constructor(payload: Payload) {
    this.payload = payload;
    this.auditService = new JSONImportAuditService(payload);
  }

  /**
   * Crée une sauvegarde automatique avant un import
   */
  async createPreImportBackup(
    jobId: string,
    userId: number,
    importType: string,
    fileName: string,
    affectedCollections: string[]
  ): Promise<string> {
    try {
      const backupId = `backup-${jobId}-${Date.now()}`;
      const timestamp = new Date();

      console.log(`💾 Création de la sauvegarde pré-import: ${backupId}`);

      // Créer le snapshot initial
      const snapshot: BackupSnapshot = {
        id: backupId,
        jobId,
        userId,
        timestamp,
        description: `Sauvegarde automatique avant import ${importType} - ${fileName}`,
        affectedCollections,
        backupData: {},
        metadata: {
          totalEntities: 0,
          estimatedSize: 0,
          importType,
          fileName
        }
      };

      // Pour l'instant, on crée juste le snapshot vide
      // Les données seront sauvegardées au fur et à mesure des modifications
      this.backups.set(backupId, snapshot);

      console.log(`✅ Sauvegarde créée: ${backupId}`);
      return backupId;

    } catch (error) {
      console.error('❌ Erreur lors de la création de la sauvegarde:', error);
      throw new Error(`Impossible de créer la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Sauvegarde une entité avant sa modification/suppression
   */
  async backupEntity(
    backupId: string,
    collection: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    currentData?: Record<string, unknown>,
    originalData?: Record<string, unknown>
  ): Promise<void> {
    try {
      const snapshot = this.backups.get(backupId);
      if (!snapshot) {
        console.warn(`⚠️ Sauvegarde ${backupId} non trouvée, création d'une nouvelle`);
        return;
      }

      // Initialiser la collection si nécessaire
      if (!snapshot.backupData[collection]) {
        snapshot.backupData[collection] = [];
      }

      // Récupérer les données actuelles si nécessaire
      let dataToBackup = currentData;
      if (!dataToBackup && (operation === 'update' || operation === 'delete')) {
        try {
          const existingEntity = await this.payload.findByID({
            collection: collection as any,
            id: entityId
          });
          dataToBackup = existingEntity;
        } catch (error) {
          console.warn(`⚠️ Impossible de récupérer l'entité ${entityId} de ${collection}:`, error);
        }
      }

      // Ajouter l'entité à la sauvegarde
      snapshot.backupData[collection].push({
        id: entityId,
        data: dataToBackup || {},
        operation,
        originalData
      });

      // Mettre à jour les métadonnées
      snapshot.metadata.totalEntities++;
      snapshot.metadata.estimatedSize += JSON.stringify(dataToBackup || {}).length;

      console.log(`💾 Entité sauvegardée: ${collection}/${entityId} (${operation})`);

    } catch (error) {
      console.error(`❌ Erreur lors de la sauvegarde de l'entité ${collection}/${entityId}:`, error);
      // Ne pas bloquer l'import si la sauvegarde échoue
    }
  }

  /**
   * Exécute un rollback complet d'un import
   */
  async executeRollback(
    jobId: string,
    userId: number,
    options: RollbackOptions
  ): Promise<RollbackResult> {
    const startTime = Date.now();
    const result: RollbackResult = {
      success: false,
      entitiesRemoved: [],
      entitiesRestored: [],
      errors: [],
      summary: {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        duration: 0
      }
    };

    try {
      console.log(`🔄 Début du rollback pour le job ${jobId}`);

      // Trouver la sauvegarde correspondante
      const backupId = Array.from(this.backups.keys()).find(id => 
        this.backups.get(id)?.jobId === jobId
      );

      if (!backupId) {
        throw new Error(`Aucune sauvegarde trouvée pour le job ${jobId}`);
      }

      const snapshot = this.backups.get(backupId)!;

      // Vérifier les permissions
      if (snapshot.userId !== userId) {
        // Vérifier si l'utilisateur est admin
        const user = await this.payload.findByID({
          collection: 'users',
          id: userId
        });

        if (!['admin', 'superadmin'].includes((user as any).role)) {
          throw new Error('Permissions insuffisantes pour effectuer le rollback');
        }
      }

      // Mode dry-run : simuler le rollback
      if (options.dryRun) {
        return this.simulateRollback(snapshot, options);
      }

      // Exécuter le rollback réel
      for (const [collection, entities] of Object.entries(snapshot.backupData)) {
        for (const entity of entities) {
          result.summary.totalProcessed++;

          try {
            await this.rollbackEntity(collection, entity, options.preserveRelations);
            
            if (entity.operation === 'create') {
              result.entitiesRemoved.push({
                collection,
                id: entity.id,
                type: 'created_entity_removed'
              });
            } else if (entity.operation === 'update' || entity.operation === 'delete') {
              result.entitiesRestored.push({
                collection,
                id: entity.id,
                type: entity.operation === 'update' ? 'entity_restored' : 'deleted_entity_restored'
              });
            }

            result.summary.successful++;

          } catch (error) {
            result.errors.push({
              collection,
              id: entity.id,
              error: error instanceof Error ? error.message : 'Erreur inconnue'
            });
            result.summary.failed++;
            console.error(`❌ Erreur lors du rollback de ${collection}/${entity.id}:`, error);
          }
        }
      }

      result.success = result.summary.failed === 0;
      result.summary.duration = Date.now() - startTime;

      // Logger l'audit du rollback
      await this.auditService.logRollbackExecuted(userId, jobId, {
        reason: options.reason,
        entitiesRemoved: result.entitiesRemoved,
        entitiesRestored: result.entitiesRestored,
        success: result.success
      });

      // Nettoyer la sauvegarde après rollback réussi
      if (result.success) {
        this.backups.delete(backupId);
      }

      console.log(`✅ Rollback terminé: ${result.summary.successful}/${result.summary.totalProcessed} entités traitées`);
      return result;

    } catch (error) {
      result.summary.duration = Date.now() - startTime;
      console.error('❌ Erreur critique lors du rollback:', error);
      
      result.errors.push({
        collection: 'system',
        id: 'rollback',
        error: error instanceof Error ? error.message : 'Erreur critique inconnue'
      });

      return result;
    }
  }

  /**
   * Rollback d'une entité individuelle
   */
  private async rollbackEntity(
    collection: string,
    entity: {
      id: string;
      data: Record<string, unknown>;
      operation: 'create' | 'update' | 'delete';
      originalData?: Record<string, unknown>;
    },
    preserveRelations: boolean = true
  ): Promise<void> {
    switch (entity.operation) {
      case 'create':
        // Supprimer l'entité créée
        await this.payload.delete({
          collection: collection as any,
          id: entity.id
        });
        break;

      case 'update':
        // Restaurer l'état original
        if (entity.originalData) {
          await this.payload.update({
            collection: collection as any,
            id: entity.id,
            data: entity.originalData
          });
        }
        break;

      case 'delete':
        // Recréer l'entité supprimée
        const { id, ...dataWithoutId } = entity.data;
        await this.payload.create({
          collection: collection as any,
          data: {
            ...dataWithoutId,
            id: entity.id
          }
        });
        break;
    }
  }

  /**
   * Simule un rollback sans l'exécuter (dry-run)
   */
  private simulateRollback(
    snapshot: BackupSnapshot,
    options: RollbackOptions
  ): RollbackResult {
    const result: RollbackResult = {
      success: true,
      entitiesRemoved: [],
      entitiesRestored: [],
      errors: [],
      summary: {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        duration: 0
      }
    };

    for (const [collection, entities] of Object.entries(snapshot.backupData)) {
      for (const entity of entities) {
        result.summary.totalProcessed++;
        result.summary.successful++;

        if (entity.operation === 'create') {
          result.entitiesRemoved.push({
            collection,
            id: entity.id,
            type: 'would_be_removed'
          });
        } else {
          result.entitiesRestored.push({
            collection,
            id: entity.id,
            type: 'would_be_restored'
          });
        }
      }
    }

    return result;
  }

  /**
   * Récupère les informations d'une sauvegarde
   */
  getBackupInfo(backupId: string): BackupSnapshot | null {
    return this.backups.get(backupId) || null;
  }

  /**
   * Liste toutes les sauvegardes disponibles pour un utilisateur
   */
  getUserBackups(userId: number): BackupSnapshot[] {
    return Array.from(this.backups.values())
      .filter(backup => backup.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Liste toutes les sauvegardes (admin seulement)
   */
  getAllBackups(): BackupSnapshot[] {
    return Array.from(this.backups.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Nettoie les anciennes sauvegardes (plus de 7 jours)
   */
  async cleanupOldBackups(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [backupId, snapshot] of this.backups.entries()) {
      if (snapshot.timestamp < sevenDaysAgo) {
        this.backups.delete(backupId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 ${cleanedCount} sauvegardes anciennes supprimées`);
    }

    return cleanedCount;
  }

  /**
   * Valide qu'un rollback est possible
   */
  async validateRollbackPossible(jobId: string): Promise<{
    possible: boolean;
    reasons: string[];
    warnings: string[];
  }> {
    const result = {
      possible: true,
      reasons: [] as string[],
      warnings: [] as string[]
    };

    try {
      // Trouver la sauvegarde
      const backupId = Array.from(this.backups.keys()).find(id => 
        this.backups.get(id)?.jobId === jobId
      );

      if (!backupId) {
        result.possible = false;
        result.reasons.push('Aucune sauvegarde trouvée pour ce job');
        return result;
      }

      const snapshot = this.backups.get(backupId)!;

      // Vérifier l'âge de la sauvegarde
      const ageInHours = (Date.now() - snapshot.timestamp.getTime()) / (1000 * 60 * 60);
      if (ageInHours > 24) {
        result.warnings.push(`Sauvegarde ancienne (${Math.round(ageInHours)}h), certaines données peuvent avoir été modifiées`);
      }

      // Vérifier l'existence des entités à rollback
      let entitiesChecked = 0;
      let entitiesNotFound = 0;

      for (const [collection, entities] of Object.entries(snapshot.backupData)) {
        for (const entity of entities.slice(0, 10)) { // Vérifier seulement les 10 premières
          entitiesChecked++;
          try {
            if (entity.operation === 'create') {
              // Vérifier que l'entité créée existe toujours
              await this.payload.findByID({
                collection: collection as any,
                id: entity.id
              });
            }
          } catch (error) {
            entitiesNotFound++;
          }
        }
      }

      if (entitiesNotFound > 0) {
        const percentage = Math.round((entitiesNotFound / entitiesChecked) * 100);
        if (percentage > 50) {
          result.possible = false;
          result.reasons.push(`${percentage}% des entités à rollback sont introuvables`);
        } else {
          result.warnings.push(`${percentage}% des entités vérifiées sont introuvables`);
        }
      }

      return result;

    } catch (error) {
      result.possible = false;
      result.reasons.push(`Erreur lors de la validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return result;
    }
  }
}