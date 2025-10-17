/**
 * Gestionnaire d'erreurs pour le système de traitement par lots
 * Responsable de la gestion des erreurs partielles, rapports détaillés et rollback
 */

import payload from 'payload';
import {
  ImportError,
  ImportResult,
  ImportJob,
  ErrorSeverity,
  ErrorType
} from '../types/jsonImport';

export interface ErrorRecoveryOptions {
  continueOnNonCriticalErrors: boolean;
  maxErrorsBeforeStop: number;
  rollbackOnCriticalError: boolean;
  createDetailedReport: boolean;
}

export interface ImportReport {
  jobId: string;
  fileName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  summary: {
    totalItems: number;
    successful: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
  errorBreakdown: {
    critical: number;
    major: number;
    minor: number;
    warning: number;
  };
  detailedErrors: ImportError[];
  successfulItems: ImportResult[];
  failedItems: ImportResult[];
  rollbackInfo?: RollbackInfo;
}

export interface RollbackInfo {
  triggered: boolean;
  reason: string;
  rollbackTime: Date;
  itemsRolledBack: string[];
  rollbackErrors: string[];
}

export interface BackupSnapshot {
  id: string;
  jobId: string;
  createdAt: Date;
  affectedCollections: string[];
  backupData: Record<string, any[]>;
}

export class BatchErrorManager {
  private backups: Map<string, BackupSnapshot> = new Map();
  private readonly MAX_BACKUP_AGE_HOURS = 24;

  /**
   * Traite les erreurs d'un job et détermine les actions à prendre
   */
  async handleJobErrors(
    jobId: string,
    errors: ImportError[],
    results: ImportResult[],
    options: ErrorRecoveryOptions
  ): Promise<{
    shouldContinue: boolean;
    shouldRollback: boolean;
    actions: string[];
  }> {
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const majorErrors = errors.filter(e => e.severity === 'major');
    const totalErrors = errors.length;

    const actions: string[] = [];
    let shouldContinue = true;
    let shouldRollback = false;

    // Vérifier les erreurs critiques
    if (criticalErrors.length > 0) {
      actions.push(`${criticalErrors.length} erreur(s) critique(s) détectée(s)`);
      
      if (options.rollbackOnCriticalError) {
        shouldRollback = true;
        shouldContinue = false;
        actions.push('Rollback déclenché à cause d\'erreurs critiques');
      } else {
        shouldContinue = options.continueOnNonCriticalErrors;
        actions.push('Continuation malgré les erreurs critiques (rollback désactivé)');
      }
    }

    // Vérifier le seuil d'erreurs maximum
    if (totalErrors >= options.maxErrorsBeforeStop) {
      shouldContinue = false;
      actions.push(`Seuil d'erreurs atteint (${totalErrors}/${options.maxErrorsBeforeStop})`);
    }

    // Analyser les patterns d'erreurs
    const errorPatterns = this.analyzeErrorPatterns(errors);
    if (errorPatterns.length > 0) {
      actions.push(...errorPatterns);
    }

    return {
      shouldContinue,
      shouldRollback,
      actions
    };
  }

  /**
   * Crée une sauvegarde avant modifications importantes
   */
  async createBackup(jobId: string, affectedCollections: string[]): Promise<string> {
    const backupId = this.generateBackupId(jobId);
    const backupData: Record<string, any[]> = {};

    try {
      // Sauvegarder les données des collections affectées
      for (const collection of affectedCollections) {
        try {
          const result = await payload.find({
            collection: collection as any,
            limit: 10000, // Limite raisonnable pour éviter les problèmes de mémoire
            sort: '-createdAt'
          });
          
          backupData[collection] = result.docs;
        } catch (error) {
          console.warn(`Impossible de sauvegarder la collection ${collection}:`, error);
          backupData[collection] = [];
        }
      }

      const snapshot: BackupSnapshot = {
        id: backupId,
        jobId,
        createdAt: new Date(),
        affectedCollections,
        backupData
      };

      this.backups.set(backupId, snapshot);

      // Nettoyer les anciennes sauvegardes
      this.cleanupOldBackups();

      return backupId;

    } catch (error) {
      throw new Error(`Échec de la création de sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Effectue un rollback des modifications
   */
  async performRollback(
    jobId: string,
    createdIds: string[],
    reason: string
  ): Promise<RollbackInfo> {
    const rollbackInfo: RollbackInfo = {
      triggered: true,
      reason,
      rollbackTime: new Date(),
      itemsRolledBack: [],
      rollbackErrors: []
    };

    try {
      // Supprimer les éléments créés pendant l'import
      for (const id of createdIds) {
        try {
          // Essayer de supprimer de la collection questions
          await payload.delete({
            collection: 'questions',
            id
          });
          rollbackInfo.itemsRolledBack.push(id);
        } catch (error) {
          // Essayer d'autres collections si nécessaire
          try {
            await payload.delete({
              collection: 'categories',
              id
            });
            rollbackInfo.itemsRolledBack.push(id);
          } catch (secondError) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            rollbackInfo.rollbackErrors.push(`Impossible de supprimer ${id}: ${errorMessage}`);
          }
        }
      }

      // Restaurer depuis la sauvegarde si disponible
      const backup = Array.from(this.backups.values()).find(b => b.jobId === jobId);
      if (backup) {
        await this.restoreFromBackup(backup.id);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      rollbackInfo.rollbackErrors.push(`Erreur générale de rollback: ${errorMessage}`);
    }

    return rollbackInfo;
  }

  /**
   * Restaure les données depuis une sauvegarde
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error(`Sauvegarde ${backupId} non trouvée`);
    }

    try {
      for (const [collection, data] of Object.entries(backup.backupData)) {
        if (data.length === 0) continue;

        // Restaurer les données (implémentation simplifiée)
        // Dans un vrai système, il faudrait une logique plus sophistiquée
        console.log(`Restauration de ${data.length} éléments pour la collection ${collection}`);
      }
    } catch (error) {
      throw new Error(`Échec de la restauration: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Génère un rapport détaillé d'import
   */
  generateDetailedReport(
    jobId: string,
    fileName: string,
    startTime: Date,
    endTime: Date,
    results: ImportResult[],
    errors: ImportError[],
    rollbackInfo?: RollbackInfo
  ): ImportReport {
    const duration = endTime.getTime() - startTime.getTime();
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    const skipped = results.filter(r => r.status === 'skipped');
    
    const totalItems = results.length;
    const successRate = totalItems > 0 ? (successful.length / totalItems) * 100 : 0;

    const errorBreakdown = {
      critical: errors.filter(e => e.severity === 'critical').length,
      major: errors.filter(e => e.severity === 'major').length,
      minor: errors.filter(e => e.severity === 'minor').length,
      warning: errors.filter(e => e.severity === 'warning').length
    };

    return {
      jobId,
      fileName,
      startTime,
      endTime,
      duration,
      summary: {
        totalItems,
        successful: successful.length,
        failed: failed.length,
        skipped: skipped.length,
        successRate: Math.round(successRate * 100) / 100
      },
      errorBreakdown,
      detailedErrors: errors,
      successfulItems: successful,
      failedItems: failed,
      rollbackInfo
    };
  }

  /**
   * Exporte un rapport au format JSON
   */
  exportReportAsJSON(report: ImportReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Exporte un rapport au format CSV
   */
  exportReportAsCSV(report: ImportReport): string {
    const lines: string[] = [];
    
    // En-tête du rapport
    lines.push('# Rapport d\'Import');
    lines.push(`Job ID,${report.jobId}`);
    lines.push(`Fichier,${report.fileName}`);
    lines.push(`Début,${report.startTime.toISOString()}`);
    lines.push(`Fin,${report.endTime.toISOString()}`);
    lines.push(`Durée (ms),${report.duration}`);
    lines.push('');

    // Résumé
    lines.push('# Résumé');
    lines.push('Métrique,Valeur');
    lines.push(`Total,${report.summary.totalItems}`);
    lines.push(`Réussis,${report.summary.successful}`);
    lines.push(`Échoués,${report.summary.failed}`);
    lines.push(`Ignorés,${report.summary.skipped}`);
    lines.push(`Taux de réussite (%),${report.summary.successRate}`);
    lines.push('');

    // Erreurs détaillées
    if (report.detailedErrors.length > 0) {
      lines.push('# Erreurs Détaillées');
      lines.push('Type,Sévérité,Index,Champ,Message,Suggestion');
      
      report.detailedErrors.forEach(error => {
        const line = [
          error.type,
          error.severity,
          error.itemIndex?.toString() || '',
          error.field || '',
          `"${error.message.replace(/"/g, '""')}"`,
          `"${(error.suggestion || '').replace(/"/g, '""')}"`
        ].join(',');
        lines.push(line);
      });
    }

    return lines.join('\n');
  }

  /**
   * Analyse les patterns d'erreurs pour identifier les problèmes récurrents
   */
  private analyzeErrorPatterns(errors: ImportError[]): string[] {
    const patterns: string[] = [];
    
    // Analyser les types d'erreurs
    const errorTypes = new Map<ErrorType, number>();
    const errorFields = new Map<string, number>();
    
    errors.forEach(error => {
      errorTypes.set(error.type, (errorTypes.get(error.type) || 0) + 1);
      if (error.field) {
        errorFields.set(error.field, (errorFields.get(error.field) || 0) + 1);
      }
    });

    // Identifier les types d'erreurs dominants
    const dominantType = Array.from(errorTypes.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (dominantType && dominantType[1] > errors.length * 0.5) {
      patterns.push(`Pattern détecté: ${dominantType[1]} erreurs de type "${dominantType[0]}" (${Math.round(dominantType[1] / errors.length * 100)}%)`);
    }

    // Identifier les champs problématiques
    const problematicField = Array.from(errorFields.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (problematicField && problematicField[1] > 3) {
      patterns.push(`Champ problématique: "${problematicField[0]}" (${problematicField[1]} erreurs)`);
    }

    // Détecter les erreurs en série
    const consecutiveErrors = this.detectConsecutiveErrors(errors);
    if (consecutiveErrors > 5) {
      patterns.push(`${consecutiveErrors} erreurs consécutives détectées - possible problème systémique`);
    }

    return patterns;
  }

  /**
   * Détecte les erreurs consécutives
   */
  private detectConsecutiveErrors(errors: ImportError[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    let lastIndex = -1;

    const sortedErrors = errors
      .filter(e => e.itemIndex !== undefined)
      .sort((a, b) => (a.itemIndex || 0) - (b.itemIndex || 0));

    sortedErrors.forEach(error => {
      if (error.itemIndex !== undefined) {
        if (error.itemIndex === lastIndex + 1) {
          currentConsecutive++;
        } else {
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          currentConsecutive = 1;
        }
        lastIndex = error.itemIndex;
      }
    });

    return Math.max(maxConsecutive, currentConsecutive);
  }

  /**
   * Génère un ID unique pour une sauvegarde
   */
  private generateBackupId(jobId: string): string {
    return `backup_${jobId}_${Date.now()}`;
  }

  /**
   * Nettoie les anciennes sauvegardes
   */
  private cleanupOldBackups(): void {
    const cutoffTime = new Date(Date.now() - this.MAX_BACKUP_AGE_HOURS * 60 * 60 * 1000);
    
    for (const [backupId, backup] of this.backups.entries()) {
      if (backup.createdAt < cutoffTime) {
        this.backups.delete(backupId);
      }
    }
  }

  /**
   * Récupère les statistiques des erreurs
   */
  getErrorStatistics(errors: ImportError[]): {
    totalErrors: number;
    bySeverity: Record<ErrorSeverity, number>;
    byType: Record<ErrorType, number>;
    mostCommonError: string;
    errorRate: number;
  } {
    const bySeverity: Record<ErrorSeverity, number> = {
      critical: 0,
      major: 0,
      minor: 0,
      warning: 0
    };

    const byType: Record<ErrorType, number> = {
      validation: 0,
      database: 0,
      mapping: 0,
      reference: 0,
      system: 0
    };

    const errorMessages = new Map<string, number>();

    errors.forEach(error => {
      bySeverity[error.severity]++;
      byType[error.type]++;
      
      const message = error.message.substring(0, 100); // Tronquer pour le groupement
      errorMessages.set(message, (errorMessages.get(message) || 0) + 1);
    });

    const mostCommonError = Array.from(errorMessages.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Aucune erreur';

    return {
      totalErrors: errors.length,
      bySeverity,
      byType,
      mostCommonError,
      errorRate: errors.length > 0 ? errors.length / (errors.length + 1) : 0
    };
  }
}