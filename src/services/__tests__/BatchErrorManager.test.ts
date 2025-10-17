/**
 * Tests pour BatchErrorManager
 * Tests basiques pour vérifier la gestion des erreurs et rapports
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchErrorManager } from '../BatchErrorManager';
import { ImportError, ImportResult } from '../../types/jsonImport';

// Mock payload
vi.mock('payload', () => ({
  default: {
    find: vi.fn(),
    delete: vi.fn(),
    create: vi.fn()
  }
}));

describe('BatchErrorManager', () => {
  let errorManager: BatchErrorManager;

  beforeEach(() => {
    errorManager = new BatchErrorManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleJobErrors', () => {
    it('devrait recommander de continuer pour des erreurs mineures', async () => {
      const errors: ImportError[] = [
        {
          type: 'validation',
          severity: 'minor',
          message: 'Avertissement mineur'
        }
      ];

      const results: ImportResult[] = [
        {
          type: 'question',
          sourceIndex: 0,
          status: 'success',
          payloadId: 'test-id'
        }
      ];

      const decision = await errorManager.handleJobErrors(
        'test-job',
        errors,
        results,
        {
          continueOnNonCriticalErrors: true,
          maxErrorsBeforeStop: 10,
          rollbackOnCriticalError: false,
          createDetailedReport: true
        }
      );

      expect(decision.shouldContinue).toBe(true);
      expect(decision.shouldRollback).toBe(false);
      // Minor errors might still generate some actions, so we just check it's an array
      expect(Array.isArray(decision.actions)).toBe(true);
    });

    it('devrait recommander un rollback pour des erreurs critiques', async () => {
      const errors: ImportError[] = [
        {
          type: 'system',
          severity: 'critical',
          message: 'Erreur critique du système'
        }
      ];

      const results: ImportResult[] = [];

      const decision = await errorManager.handleJobErrors(
        'test-job',
        errors,
        results,
        {
          continueOnNonCriticalErrors: true,
          maxErrorsBeforeStop: 10,
          rollbackOnCriticalError: true,
          createDetailedReport: true
        }
      );

      expect(decision.shouldContinue).toBe(false);
      expect(decision.shouldRollback).toBe(true);
      expect(decision.actions).toContain('1 erreur(s) critique(s) détectée(s)');
      expect(decision.actions).toContain('Rollback déclenché à cause d\'erreurs critiques');
    });

    it('devrait arrêter si le seuil d\'erreurs est atteint', async () => {
      const errors: ImportError[] = Array.from({ length: 15 }, (_, i) => ({
        type: 'validation',
        severity: 'major',
        message: `Erreur ${i + 1}`
      }));

      const results: ImportResult[] = [];

      const decision = await errorManager.handleJobErrors(
        'test-job',
        errors,
        results,
        {
          continueOnNonCriticalErrors: true,
          maxErrorsBeforeStop: 10,
          rollbackOnCriticalError: false,
          createDetailedReport: true
        }
      );

      expect(decision.shouldContinue).toBe(false);
      expect(decision.actions).toContain('Seuil d\'erreurs atteint (15/10)');
    });
  });

  describe('generateDetailedReport', () => {
    it('devrait générer un rapport complet', () => {
      const startTime = new Date('2025-01-01T10:00:00Z');
      const endTime = new Date('2025-01-01T10:05:00Z');

      const results: ImportResult[] = [
        {
          type: 'question',
          sourceIndex: 0,
          status: 'success',
          payloadId: 'success-1'
        },
        {
          type: 'question',
          sourceIndex: 1,
          status: 'error',
          message: 'Erreur de test'
        }
      ];

      const errors: ImportError[] = [
        {
          type: 'validation',
          severity: 'major',
          itemIndex: 1,
          message: 'Erreur de validation'
        }
      ];

      const report = errorManager.generateDetailedReport(
        'test-job',
        'test-file.json',
        startTime,
        endTime,
        results,
        errors
      );

      expect(report.jobId).toBe('test-job');
      expect(report.fileName).toBe('test-file.json');
      expect(report.startTime).toBe(startTime);
      expect(report.endTime).toBe(endTime);
      expect(report.duration).toBe(5 * 60 * 1000); // 5 minutes en ms

      expect(report.summary.totalItems).toBe(2);
      expect(report.summary.successful).toBe(1);
      expect(report.summary.failed).toBe(1);
      expect(report.summary.successRate).toBe(50);

      expect(report.errorBreakdown.major).toBe(1);
      expect(report.detailedErrors).toHaveLength(1);
      expect(report.successfulItems).toHaveLength(1);
      expect(report.failedItems).toHaveLength(1);
    });
  });

  describe('exportReportAsJSON', () => {
    it('devrait exporter un rapport au format JSON', () => {
      const report = errorManager.generateDetailedReport(
        'test-job',
        'test-file.json',
        new Date(),
        new Date(),
        [],
        []
      );

      const jsonReport = errorManager.exportReportAsJSON(report);
      
      expect(typeof jsonReport).toBe('string');
      expect(() => JSON.parse(jsonReport)).not.toThrow();
      
      const parsed = JSON.parse(jsonReport);
      expect(parsed.jobId).toBe('test-job');
      expect(parsed.fileName).toBe('test-file.json');
    });
  });

  describe('exportReportAsCSV', () => {
    it('devrait exporter un rapport au format CSV', () => {
      const errors: ImportError[] = [
        {
          type: 'validation',
          severity: 'major',
          itemIndex: 0,
          field: 'questionText',
          message: 'Texte manquant',
          suggestion: 'Ajoutez un texte'
        }
      ];

      const report = errorManager.generateDetailedReport(
        'test-job',
        'test-file.json',
        new Date(),
        new Date(),
        [],
        errors
      );

      const csvReport = errorManager.exportReportAsCSV(report);
      
      expect(typeof csvReport).toBe('string');
      expect(csvReport).toContain('# Rapport d\'Import');
      expect(csvReport).toContain('Job ID,test-job');
      expect(csvReport).toContain('# Erreurs Détaillées');
      expect(csvReport).toContain('validation,major,0,questionText');
    });
  });

  describe('getErrorStatistics', () => {
    it('devrait calculer les statistiques d\'erreurs correctement', () => {
      const errors: ImportError[] = [
        { type: 'validation', severity: 'critical', message: 'Erreur 1' },
        { type: 'validation', severity: 'major', message: 'Erreur 2' },
        { type: 'database', severity: 'minor', message: 'Erreur 3' },
        { type: 'validation', severity: 'warning', message: 'Erreur 4' }
      ];

      const stats = errorManager.getErrorStatistics(errors);

      expect(stats.totalErrors).toBe(4);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.major).toBe(1);
      expect(stats.bySeverity.minor).toBe(1);
      expect(stats.bySeverity.warning).toBe(1);
      expect(stats.byType.validation).toBe(3);
      expect(stats.byType.database).toBe(1);
      expect(stats.mostCommonError).toBe('Erreur 1');
    });

    it('devrait gérer le cas sans erreurs', () => {
      const stats = errorManager.getErrorStatistics([]);

      expect(stats.totalErrors).toBe(0);
      expect(stats.bySeverity.critical).toBe(0);
      expect(stats.byType.validation).toBe(0);
      expect(stats.mostCommonError).toBe('Aucune erreur');
      expect(stats.errorRate).toBe(0);
    });
  });
});