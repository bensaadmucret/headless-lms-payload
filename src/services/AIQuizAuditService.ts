import type { Payload } from 'payload';

export interface GenerationLogEntry {
  user: string | number;
  action: 'ai_quiz_generation' | 'ai_questions_generation' | 'ai_content_validation' | 'auto_quiz_creation' | 'generation_retry' | 'generation_failure';
  status: 'started' | 'in_progress' | 'success' | 'failed' | 'cancelled' | 'timeout';
  generationConfig?: {
    subject?: string;
    categoryId?: string;
    categoryName?: string;
    studentLevel?: 'PASS' | 'LAS' | 'both';
    questionCount?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    medicalDomain?: string;
    includeExplanations?: boolean;
    customInstructions?: string;
  };
  result?: {
    quizId?: string;
    questionIds?: string[];
    questionsCreated?: number;
    validationScore?: number;
    aiModel?: string;
    tokensUsed?: number;
  };
  error?: {
    type?: 'ai_api_error' | 'validation_failed' | 'database_error' | 'rate_limit_exceeded' | 'invalid_config' | 'timeout' | 'unknown_error';
    message?: string;
    details?: any;
    stackTrace?: string;
  };
  performance?: {
    duration?: number;
    aiResponseTime?: number;
    validationTime?: number;
    databaseTime?: number;
    retryCount?: number;
    promptLength?: number;
    responseLength?: number;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    environment?: string;
    version?: string;
  };
  createdAt?: string;
  completedAt?: string;
}

export interface GenerationMetrics {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  successRate: number;
  averageDuration: number;
  averageValidationScore: number;
  totalQuestionsGenerated: number;
  totalTokensUsed: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  byErrorType: Record<string, number>;
  byStudentLevel: Record<string, number>;
  byDifficulty: Record<string, number>;
  performanceStats: {
    minDuration: number;
    maxDuration: number;
    avgAiResponseTime: number;
    avgValidationTime: number;
    avgDatabaseTime: number;
  };
}

/**
 * Service d'audit spécialisé pour les générations de quiz IA
 * Fournit un logging détaillé et des métriques de performance
 */
export class AIQuizAuditService {
  constructor(private payload: Payload) {}

  /**
   * Démarre un log de génération
   */
  async startGenerationLog(
    userId: string | number,
    action: GenerationLogEntry['action'],
    config: GenerationLogEntry['generationConfig'],
    metadata?: GenerationLogEntry['metadata']
  ): Promise<string> {
    try {
      const logEntry: Partial<GenerationLogEntry> = {
        user: userId,
        action,
        status: 'started',
        generationConfig: config,
        metadata: {
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
          ...metadata,
        },
        createdAt: new Date().toISOString(),
      };

      const result = await this.payload.create({
        collection: 'generationlogs' as any,
        data: logEntry as any,
      });

      console.log(`[AUDIT] Génération démarrée - ID: ${result.id}, Action: ${action}`);
      return result.id.toString();
    } catch (error) {
      console.error('Erreur création log de génération:', error);
      throw error;
    }
  }

  /**
   * Met à jour le statut d'un log de génération
   */
  async updateGenerationStatus(
    logId: string,
    status: GenerationLogEntry['status'],
    updates?: Partial<GenerationLogEntry>
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        ...updates,
      };

      // Auto-définir completedAt pour les statuts finaux
      if (['success', 'failed', 'cancelled', 'timeout'].includes(status)) {
        updateData.completedAt = new Date().toISOString();
      }

      await this.payload.update({
        collection: 'generationlogs' as any,
        id: logId,
        data: updateData as any,
      });

      console.log(`[AUDIT] Statut mis à jour - ID: ${logId}, Statut: ${status}`);
    } catch (error) {
      console.error('Erreur mise à jour log de génération:', error);
      // Ne pas faire échouer l'opération principale
    }
  }

  /**
   * Termine un log de génération avec succès
   */
  async completeGenerationLog(
    logId: string,
    result: GenerationLogEntry['result'],
    performance?: GenerationLogEntry['performance']
  ): Promise<void> {
    await this.updateGenerationStatus(logId, 'success', {
      result,
      performance,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Termine un log de génération avec échec
   */
  async failGenerationLog(
    logId: string,
    error: GenerationLogEntry['error'],
    performance?: GenerationLogEntry['performance']
  ): Promise<void> {
    await this.updateGenerationStatus(logId, 'failed', {
      error: {
        ...error,
        stackTrace: process.env.NODE_ENV === 'development' ? error?.stackTrace : undefined,
      },
      performance,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Log une génération complète (méthode de convenance)
   */
  async logGeneration(
    userId: string | number,
    action: GenerationLogEntry['action'],
    config: GenerationLogEntry['generationConfig'],
    result: GenerationLogEntry['result'],
    performance: GenerationLogEntry['performance'],
    metadata?: GenerationLogEntry['metadata']
  ): Promise<string> {
    const logId = await this.startGenerationLog(userId, action, config, metadata);
    await this.completeGenerationLog(logId, result, performance);
    return logId;
  }

  /**
   * Log un échec de génération (méthode de convenance)
   */
  async logGenerationFailure(
    userId: string | number,
    action: GenerationLogEntry['action'],
    config: GenerationLogEntry['generationConfig'],
    error: GenerationLogEntry['error'],
    performance?: GenerationLogEntry['performance'],
    metadata?: GenerationLogEntry['metadata']
  ): Promise<string> {
    const logId = await this.startGenerationLog(userId, action, config, metadata);
    await this.failGenerationLog(logId, error, performance);
    return logId;
  }

  /**
   * Obtient les métriques de génération pour une période donnée
   */
  async getGenerationMetrics(
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day',
    filters?: {
      userId?: string;
      action?: string;
      status?: string;
      studentLevel?: string;
    }
  ): Promise<GenerationMetrics> {
    const now = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'hour':
        startDate.setHours(now.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const where: any = {
      createdAt: { greater_than: startDate },
    };

    if (filters?.userId) {
      where.user = { equals: filters.userId };
    }
    if (filters?.action) {
      where.action = { equals: filters.action };
    }
    if (filters?.status) {
      where.status = { equals: filters.status };
    }
    if (filters?.studentLevel) {
      where['generationConfig.studentLevel'] = { equals: filters.studentLevel };
    }

    const logs = await this.payload.find({
      collection: 'generationlogs' as any,
      where,
      limit: 1000,
      sort: '-createdAt',
    });

    return this.calculateMetrics(logs.docs);
  }

  /**
   * Calcule les métriques à partir des logs
   */
  private calculateMetrics(logs: any[]): GenerationMetrics {
    const metrics: GenerationMetrics = {
      totalGenerations: logs.length,
      successfulGenerations: 0,
      failedGenerations: 0,
      successRate: 0,
      averageDuration: 0,
      averageValidationScore: 0,
      totalQuestionsGenerated: 0,
      totalTokensUsed: 0,
      byAction: {},
      byStatus: {},
      byErrorType: {},
      byStudentLevel: {},
      byDifficulty: {},
      performanceStats: {
        minDuration: Infinity,
        maxDuration: 0,
        avgAiResponseTime: 0,
        avgValidationTime: 0,
        avgDatabaseTime: 0,
      },
    };

    if (logs.length === 0) {
      return metrics;
    }

    let totalDuration = 0;
    let totalValidationScore = 0;
    let validationScoreCount = 0;
    let totalAiResponseTime = 0;
    let totalValidationTime = 0;
    let totalDatabaseTime = 0;
    let performanceCount = 0;

    logs.forEach((log) => {
      // Compteurs de base
      if (log.status === 'success') {
        metrics.successfulGenerations++;
      } else if (log.status === 'failed') {
        metrics.failedGenerations++;
      }

      // Compteurs par catégorie
      metrics.byAction[log.action] = (metrics.byAction[log.action] || 0) + 1;
      metrics.byStatus[log.status] = (metrics.byStatus[log.status] || 0) + 1;

      if (log.error?.type) {
        metrics.byErrorType[log.error.type] = (metrics.byErrorType[log.error.type] || 0) + 1;
      }

      if (log.generationConfig?.studentLevel) {
        metrics.byStudentLevel[log.generationConfig.studentLevel] = 
          (metrics.byStudentLevel[log.generationConfig.studentLevel] || 0) + 1;
      }

      if (log.generationConfig?.difficulty) {
        metrics.byDifficulty[log.generationConfig.difficulty] = 
          (metrics.byDifficulty[log.generationConfig.difficulty] || 0) + 1;
      }

      // Métriques de résultat
      if (log.result?.questionsCreated) {
        metrics.totalQuestionsGenerated += log.result.questionsCreated;
      }

      if (log.result?.tokensUsed) {
        metrics.totalTokensUsed += log.result.tokensUsed;
      }

      if (log.result?.validationScore) {
        totalValidationScore += log.result.validationScore;
        validationScoreCount++;
      }

      // Métriques de performance
      if (log.performance?.duration) {
        totalDuration += log.performance.duration;
        metrics.performanceStats.minDuration = Math.min(
          metrics.performanceStats.minDuration,
          log.performance.duration
        );
        metrics.performanceStats.maxDuration = Math.max(
          metrics.performanceStats.maxDuration,
          log.performance.duration
        );
      }

      if (log.performance?.aiResponseTime) {
        totalAiResponseTime += log.performance.aiResponseTime;
        performanceCount++;
      }

      if (log.performance?.validationTime) {
        totalValidationTime += log.performance.validationTime;
      }

      if (log.performance?.databaseTime) {
        totalDatabaseTime += log.performance.databaseTime;
      }
    });

    // Calculs des moyennes
    metrics.successRate = metrics.totalGenerations > 0 
      ? (metrics.successfulGenerations / metrics.totalGenerations) * 100 
      : 0;

    metrics.averageDuration = metrics.totalGenerations > 0 
      ? totalDuration / metrics.totalGenerations 
      : 0;

    metrics.averageValidationScore = validationScoreCount > 0 
      ? totalValidationScore / validationScoreCount 
      : 0;

    metrics.performanceStats.avgAiResponseTime = performanceCount > 0 
      ? totalAiResponseTime / performanceCount 
      : 0;

    metrics.performanceStats.avgValidationTime = performanceCount > 0 
      ? totalValidationTime / performanceCount 
      : 0;

    metrics.performanceStats.avgDatabaseTime = performanceCount > 0 
      ? totalDatabaseTime / performanceCount 
      : 0;

    // Corriger les valeurs infinies
    if (metrics.performanceStats.minDuration === Infinity) {
      metrics.performanceStats.minDuration = 0;
    }

    return metrics;
  }

  /**
   * Obtient les logs de génération avec filtres
   */
  async getGenerationLogs(filters: {
    userId?: string;
    action?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    page?: number;
  } = {}) {
    const where: any = {};

    if (filters.userId) {
      where.user = { equals: filters.userId };
    }

    if (filters.action) {
      where.action = { equals: filters.action };
    }

    if (filters.status) {
      where.status = { equals: filters.status };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.greater_than_equal = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.less_than_equal = filters.endDate;
      }
    }

    return await this.payload.find({
      collection: 'generationlogs' as any,
      where,
      sort: '-createdAt',
      limit: filters.limit || 50,
      page: filters.page || 1,
    });
  }

  /**
   * Obtient les statistiques d'erreurs
   */
  async getErrorStats(timeframe: 'day' | 'week' | 'month' = 'day') {
    const metrics = await this.getGenerationMetrics(timeframe, { status: 'failed' });
    
    return {
      totalErrors: metrics.failedGenerations,
      errorRate: metrics.totalGenerations > 0 
        ? (metrics.failedGenerations / metrics.totalGenerations) * 100 
        : 0,
      byErrorType: metrics.byErrorType,
      mostCommonError: Object.entries(metrics.byErrorType)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null,
    };
  }

  /**
   * Obtient les statistiques de performance
   */
  async getPerformanceStats(timeframe: 'day' | 'week' | 'month' = 'day') {
    const metrics = await this.getGenerationMetrics(timeframe, { status: 'success' });
    
    return {
      averageDuration: metrics.averageDuration,
      averageValidationScore: metrics.averageValidationScore,
      totalQuestionsGenerated: metrics.totalQuestionsGenerated,
      totalTokensUsed: metrics.totalTokensUsed,
      performanceStats: metrics.performanceStats,
      successRate: metrics.successRate,
    };
  }

  /**
   * Nettoie les anciens logs (à exécuter périodiquement)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldLogs = await this.payload.find({
      collection: 'generationlogs' as any,
      where: {
        createdAt: { less_than: cutoffDate },
      },
      limit: 1000,
    });

    let deletedCount = 0;
    for (const log of oldLogs.docs) {
      try {
        await this.payload.delete({
          collection: 'generationlogs' as any,
          id: log.id,
        });
        deletedCount++;
      } catch (error) {
        console.error(`Erreur suppression log ${log.id}:`, error);
      }
    }

    console.log(`[AUDIT] ${deletedCount} anciens logs supprimés (> ${retentionDays} jours)`);
    return deletedCount;
  }
}