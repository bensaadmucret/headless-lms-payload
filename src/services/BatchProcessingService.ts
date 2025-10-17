/**
 * Service de traitement par lots pour le système d'import JSON
 * Responsable du traitement par chunks, suivi de progression et gestion pause/reprise
 */

import { EventEmitter } from 'events';
import {
  ImportData,
  ImportJob,
  ImportProgress,
  ImportResult,
  ImportError,
  ImportOptions,
  ImportType,
  ImportFormat
} from '../types/jsonImport';
import { JSONProcessingService, ProcessingResult } from './JSONProcessingService';
import { JSONValidationService } from './JSONValidationService';
import { BatchErrorManager, ErrorRecoveryOptions, ImportReport } from './BatchErrorManager';
import { JSONImportAuditService, ImportSummary } from './JSONImportAuditService';
import { JSONImportBackupService } from './JSONImportBackupService';

export interface BatchProcessingOptions extends ImportOptions {
  chunkSize?: number;
  maxConcurrency?: number;
  pauseOnError?: boolean;
  enableProgressTracking?: boolean;
  errorRecovery?: ErrorRecoveryOptions;
}

export interface BatchProcessingResult extends ProcessingResult {
  jobId: string;
  totalChunks: number;
  processedChunks: number;
  estimatedTimeRemaining?: number;
}

export interface BatchJob {
  id: string;
  userId: string;
  fileName: string;
  importType: ImportType;
  format: ImportFormat;
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: ImportProgress;
  options: BatchProcessingOptions;
  data: ImportData;
  chunks: any[][];
  currentChunkIndex: number;
  results: ImportResult[];
  errors: ImportError[];
  createdIds: string[];
  backupId?: string;
  createdAt: Date;
  startedAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
}

export class BatchProcessingService extends EventEmitter {
  private jobs: Map<string, BatchJob> = new Map();
  private processingService: JSONProcessingService;
  private validationService: JSONValidationService;
  private errorManager: BatchErrorManager;
  private auditService: JSONImportAuditService | null = null;
  private backupService: JSONImportBackupService | null = null;
  private readonly DEFAULT_CHUNK_SIZE = 50;
  private readonly DEFAULT_MAX_CONCURRENCY = 3;

  constructor() {
    super();
    this.processingService = new JSONProcessingService();
    this.validationService = new JSONValidationService();
    this.errorManager = new BatchErrorManager();
  }

  /**
   * Initialise les services d'audit et de backup avec l'instance Payload
   */
  initializeServices(payload: any): void {
    this.auditService = new JSONImportAuditService(payload);
    this.backupService = new JSONImportBackupService(payload);
  }

  /**
   * Démarre un traitement par lots
   */
  async startBatchProcessing(
    data: ImportData,
    userId: string,
    fileName: string,
    format: ImportFormat,
    options: BatchProcessingOptions = {}
  ): Promise<string> {
    // Générer un ID unique pour le job
    const jobId = this.generateJobId();

    // Valider les données avant de commencer
    const validation = await this.validationService.validateImportData(data, data.type);
    if (!validation.isValid && validation.errors.some(e => e.severity === 'critical')) {
      throw new Error(`Validation échouée: ${validation.errors[0]?.message}`);
    }

    // Créer les chunks de données
    const chunks = this.createDataChunks(data, options.chunkSize || this.DEFAULT_CHUNK_SIZE);

    // Créer une sauvegarde si nécessaire
    let backupId: string | undefined;
    if (options.errorRecovery?.rollbackOnCriticalError && this.backupService) {
      try {
        backupId = await this.backupService.createPreImportBackup(
          jobId,
          parseInt(userId),
          data.type,
          fileName,
          ['questions', 'categories', 'quizzes']
        );
      } catch (error) {
        console.warn('Impossible de créer une sauvegarde:', error);
      }
    }

    // Créer le job
    const job: BatchJob = {
      id: jobId,
      userId,
      fileName,
      importType: data.type,
      format,
      status: 'queued',
      progress: {
        total: this.getTotalItemCount(data),
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0
      },
      options,
      data,
      chunks,
      currentChunkIndex: 0,
      results: [],
      errors: validation.errors,
      createdIds: [],
      backupId,
      createdAt: new Date()
    };

    // Stocker le job
    this.jobs.set(jobId, job);

    // Logger l'audit du début d'import
    if (this.auditService) {
      await this.auditService.logImportStarted(
        parseInt(userId),
        jobId,
        fileName,
        format,
        data.type,
        job.progress.total,
        options
      );
    }

    // Démarrer le traitement asynchrone
    this.processJobAsync(jobId);

    return jobId;
  }

  /**
   * Met en pause un job de traitement
   */
  async pauseJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} non trouvé`);
    }

    if (job.status !== 'processing') {
      throw new Error(`Job ${jobId} ne peut pas être mis en pause (statut: ${job.status})`);
    }

    job.status = 'paused';
    job.pausedAt = new Date();

    this.emit('jobPaused', { jobId, job });
    return true;
  }

  /**
   * Reprend un job mis en pause
   */
  async resumeJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} non trouvé`);
    }

    if (job.status !== 'paused') {
      throw new Error(`Job ${jobId} ne peut pas être repris (statut: ${job.status})`);
    }

    job.status = 'processing';
    job.pausedAt = undefined;

    // Reprendre le traitement
    this.processJobAsync(jobId);

    this.emit('jobResumed', { jobId, job });
    return true;
  }

  /**
   * Annule un job de traitement
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} non trouvé`);
    }

    if (job.status === 'completed') {
      throw new Error(`Job ${jobId} déjà terminé`);
    }

    job.status = 'cancelled';
    job.completedAt = new Date();

    // Logger l'audit d'annulation
    if (this.auditService) {
      const summary = this.createImportSummary(job);
      await this.auditService.logImportCancelled(
        parseInt(job.userId),
        jobId,
        summary,
        'Annulé par l\'utilisateur'
      );
    }

    this.emit('jobCancelled', { jobId, job });
    return true;
  }

  /**
   * Récupère le statut d'un job
   */
  getJobStatus(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Récupère tous les jobs d'un utilisateur
   */
  getUserJobs(userId: string): BatchJob[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  /**
   * Supprime un job terminé
   */
  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'processing') {
      throw new Error(`Impossible de supprimer un job en cours de traitement`);
    }

    this.jobs.delete(jobId);
    this.emit('jobDeleted', { jobId });
    return true;
  }

  /**
   * Traite un job de manière asynchrone
   */
  private async processJobAsync(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.startedAt = new Date();

      this.emit('jobStarted', { jobId, job });

      // Traiter les chunks un par un
      while (job.currentChunkIndex < job.chunks.length && job.status === 'processing') {
        const startTime = Date.now();
        
        // Traiter le chunk actuel
        await this.processChunk(job, job.currentChunkIndex);
        
        // Vérifier les erreurs et décider des actions
        if (job.options.errorRecovery) {
          const errorDecision = await this.errorManager.handleJobErrors(
            jobId,
            job.errors,
            job.results,
            job.options.errorRecovery
          );

          if (errorDecision.shouldRollback) {
            await this.performJobRollback(job, 'Erreurs critiques détectées');
            break;
          }

          if (!errorDecision.shouldContinue) {
            job.status = 'failed';
            this.emit('jobFailed', { jobId, job, reason: 'Trop d\'erreurs détectées' });
            break;
          }
        }
        
        // Calculer le temps estimé restant
        const chunkProcessingTime = Date.now() - startTime;
        const remainingChunks = job.chunks.length - job.currentChunkIndex - 1;
        job.estimatedTimeRemaining = remainingChunks * chunkProcessingTime;

        // Passer au chunk suivant
        job.currentChunkIndex++;

        // Émettre la progression
        this.updateProgress(job);
        this.emit('progressUpdate', { jobId, job });

        // Vérifier si le job a été mis en pause
        if ((job.status as string) === 'paused') {
          break;
        }

        // Pause courte pour éviter la surcharge
        await this.sleep(100);
      }

      // Finaliser le job si terminé
      if (job.currentChunkIndex >= job.chunks.length && job.status === 'processing') {
        job.status = 'completed';
        job.completedAt = new Date();
        job.estimatedTimeRemaining = 0;
        
        // Logger l'audit de completion
        if (this.auditService) {
          const summary = this.createImportSummary(job);
          const createdEntities = job.createdIds.map(id => ({
            collection: 'questions', // TODO: Améliorer pour détecter le type
            id,
            type: job.importType
          }));
          
          await this.auditService.logImportCompleted(
            parseInt(job.userId),
            jobId,
            summary,
            createdEntities
          );
        }
        
        this.emit('jobCompleted', { jobId, job });
      }

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      job.errors.push({
        type: 'system',
        severity: 'critical',
        message: `Échec du traitement par lots: ${errorMessage}`,
        suggestion: 'Vérifiez les logs et réessayez'
      });

      // Logger l'audit d'échec
      if (this.auditService) {
        const summary = this.createImportSummary(job);
        await this.auditService.logImportFailed(
          parseInt(job.userId),
          jobId,
          summary,
          errorMessage
        );
      }

      this.emit('jobFailed', { jobId, job, error });
    }
  }

  /**
   * Traite un chunk de données
   */
  private async processChunk(job: BatchJob, chunkIndex: number): Promise<void> {
    const chunk = job.chunks[chunkIndex];
    if (!chunk) return;

    try {
      // Créer les données pour ce chunk
      const chunkData = this.createChunkData(job.data, chunk);

      // Traiter le chunk
      const result = await this.processingService.processImportData(chunkData, job.userId);

      // Ajouter les résultats au job
      job.results.push(...result.results);
      job.errors.push(...result.errors);

      // Tracker les IDs créés pour le rollback
      job.createdIds.push(...result.createdIds);

      // Mettre à jour les compteurs
      job.progress.successful += result.summary.successful;
      job.progress.failed += result.summary.failed;
      job.progress.processed += result.summary.totalProcessed;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      job.errors.push({
        type: 'system',
        severity: 'major',
        message: `Erreur lors du traitement du chunk ${chunkIndex + 1}: ${errorMessage}`,
        suggestion: 'Ce chunk sera ignoré, le traitement continue'
      });

      // Marquer tous les items du chunk comme échoués
      chunk.forEach((_, itemIndex: number) => {
        job.results.push({
          type: job.importType as any,
          sourceIndex: itemIndex,
          status: 'error',
          message: `Échec du traitement: ${errorMessage}`
        });
        job.progress.failed++;
        job.progress.processed++;
      });

      // Arrêter si l'option pauseOnError est activée
      if (job.options.pauseOnError) {
        job.status = 'paused';
      }
    }
  }

  /**
   * Crée les chunks de données pour le traitement par lots
   */
  private createDataChunks(data: ImportData, chunkSize: number): any[][] {
    const chunks: any[][] = [];
    let items: any[] = [];

    // Extraire les items selon le type
    switch (data.type) {
      case 'questions':
        items = (data as any).questions || [];
        break;
      case 'flashcards':
        items = (data as any).cards || [];
        break;
      case 'learning-path':
        // Pour les parcours, on traite toutes les questions de toutes les étapes
        items = (data as any).path?.steps?.flatMap((step: any) => step.questions || []) || [];
        break;
    }

    // Créer les chunks
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * Crée les données pour un chunk spécifique
   */
  private createChunkData(originalData: ImportData, chunk: any[]): ImportData {
    const chunkData = { ...originalData };

    switch (originalData.type) {
      case 'questions':
        (chunkData as any).questions = chunk;
        break;
      case 'flashcards':
        (chunkData as any).cards = chunk;
        break;
      case 'learning-path':
        // Pour les parcours, créer une étape temporaire avec les questions du chunk
        (chunkData as any).path = {
          steps: [{
            id: 'temp-chunk',
            title: 'Chunk temporaire',
            prerequisites: [],
            questions: chunk
          }]
        };
        break;
    }

    return chunkData;
  }

  /**
   * Compte le nombre total d'items dans les données
   */
  private getTotalItemCount(data: ImportData): number {
    switch (data.type) {
      case 'questions':
        return (data as any).questions?.length || 0;
      case 'flashcards':
        return (data as any).cards?.length || 0;
      case 'learning-path':
        return (data as any).path?.steps?.reduce((sum: number, step: any) => 
          sum + (step.questions?.length || 0), 0) || 0;
      default:
        return 0;
    }
  }

  /**
   * Met à jour la progression d'un job
   */
  private updateProgress(job: BatchJob): void {
    if (job.progress.total > 0) {
      job.progress.percentage = Math.round((job.progress.processed / job.progress.total) * 100);
    }
  }

  /**
   * Génère un ID unique pour un job
   */
  private generateJobId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utilitaire pour créer une pause
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Nettoie les jobs anciens (plus de 24h et terminés)
   */
  cleanupOldJobs(): number {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < oneDayAgo && 
          ['completed', 'failed', 'cancelled'].includes(job.status)) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Effectue un rollback d'un job
   */
  private async performJobRollback(job: BatchJob, reason: string): Promise<void> {
    try {
      const rollbackInfo = await this.errorManager.performRollback(
        job.id,
        job.createdIds,
        reason
      );

      job.status = 'failed';
      job.completedAt = new Date();

      // Ajouter les informations de rollback aux erreurs
      job.errors.push({
        type: 'system',
        severity: 'critical',
        message: `Rollback effectué: ${reason}`,
        suggestion: `${rollbackInfo.itemsRolledBack.length} éléments supprimés, ${rollbackInfo.rollbackErrors.length} erreurs de rollback`
      });

      this.emit('jobRolledBack', { jobId: job.id, job, rollbackInfo });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      job.errors.push({
        type: 'system',
        severity: 'critical',
        message: `Échec du rollback: ${errorMessage}`,
        suggestion: 'Intervention manuelle requise'
      });
    }
  }

  /**
   * Génère un rapport détaillé pour un job
   */
  generateJobReport(jobId: string): ImportReport | null {
    const job = this.jobs.get(jobId);
    if (!job || !job.startedAt) return null;

    const endTime = job.completedAt || new Date();

    return this.errorManager.generateDetailedReport(
      job.id,
      job.fileName,
      job.startedAt,
      endTime,
      job.results,
      job.errors
    );
  }

  /**
   * Exporte un rapport au format JSON
   */
  exportJobReportAsJSON(jobId: string): string | null {
    const report = this.generateJobReport(jobId);
    if (!report) return null;

    return this.errorManager.exportReportAsJSON(report);
  }

  /**
   * Exporte un rapport au format CSV
   */
  exportJobReportAsCSV(jobId: string): string | null {
    const report = this.generateJobReport(jobId);
    if (!report) return null;

    return this.errorManager.exportReportAsCSV(report);
  }

  /**
   * Récupère les statistiques d'erreurs pour un job
   */
  getJobErrorStatistics(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return this.errorManager.getErrorStatistics(job.errors);
  }

  /**
   * Récupère les statistiques globales
   */
  getGlobalStats(): {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalItemsProcessed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => ['queued', 'processing'].includes(j.status)).length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      totalItemsProcessed: jobs.reduce((sum, j) => sum + j.progress.processed, 0)
    };
  }

  /**
   * Crée un résumé d'import pour l'audit
   */
  private createImportSummary(job: BatchJob): ImportSummary {
    const duration = job.startedAt && job.completedAt ? 
      Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000) : 
      undefined;

    return {
      fileName: job.fileName,
      format: job.format,
      importType: job.importType,
      totalItems: job.progress.total,
      processedItems: job.progress.processed,
      successfulItems: job.progress.successful,
      failedItems: job.progress.failed,
      skippedItems: job.progress.total - job.progress.processed,
      duration,
      options: job.options,
      errors: job.errors.map(error => ({
        type: error.type,
        message: error.message
      })),
      warnings: job.errors
        .filter(error => error.severity === 'minor')
        .map(error => error.message)
    };
  }

  /**
   * Récupère le service d'audit (pour les tests ou usage externe)
   */
  getAuditService(): JSONImportAuditService | null {
    return this.auditService;
  }

  /**
   * Récupère le service de backup (pour les tests ou usage externe)
   */
  getBackupService(): JSONImportBackupService | null {
    return this.backupService;
  }
}