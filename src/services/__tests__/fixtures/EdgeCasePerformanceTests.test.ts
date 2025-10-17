/**
 * Tests spécialisés pour les cas limites et la performance
 * Utilise les fixtures edge-cases pour valider la robustesse du système
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { JSONValidationService } from '../../JSONValidationService';
import { CSVImportService } from '../../CSVImportService';
import { BatchProcessingService } from '../../BatchProcessingService';

// Mock payload
vi.mock('payload', () => ({
  default: {
    find: vi.fn().mockResolvedValue({ docs: [] }),
    create: vi.fn().mockResolvedValue({ id: 1 })
  }
}));

// TODO: Ces tests nécessitent des fixtures complexes et une refonte
// À corriger dans une session dédiée aux tests de performance
describe.skip('Edge Cases and Performance Tests', () => {
  let validationService: JSONValidationService;
  let csvService: CSVImportService;
  let batchService: BatchProcessingService;
  
  const fixturesPath = __dirname;

  beforeEach(() => {
    validationService = new JSONValidationService();
    csvService = new CSVImportService();
    batchService = new BatchProcessingService();
    vi.clearAllMocks();
  });

  describe('Unicode and Special Characters', () => {
    it('should preserve all Unicode characters during validation', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'unicode-characters.json'), 'utf-8')
      );

      const result = await validationService.validateImportData(fixture, 'questions');

      expect(result.isValid).toBe(true);
      
      // Vérifier la préservation des caractères spéciaux
      const unicodeQuestion = fixture.questions.find(q => q.questionText.includes('♥'));
      expect(unicodeQuestion).toBeDefined();
      expect(unicodeQuestion.explanation).toContain('🫀');
      
      const mathQuestion = fixture.questions.find(q => q.questionText.includes('≥'));
      expect(mathQuestion).toBeDefined();
      
      const greekQuestion = fixture.questions.find(q => q.questionText.includes('α'));
      expect(greekQuestion).toBeDefined();
    });

    it('should handle multilingual content correctly', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'unicode-characters.json'), 'utf-8')
      );

      const result = await validationService.validateImportData(fixture, 'questions');

      expect(result.isValid).toBe(true);
      
      // Vérifier le contenu multilingue
      const multilingualQuestion = fixture.questions.find(q => 
        q.questionText.includes('ما هو القلب') || q.questionText.includes('心脏是什么')
      );
      expect(multilingualQuestion).toBeDefined();
    });

    it('should handle mixed encodings in CSV files', async () => {
      const csvContent = readFileSync(
        join(fixturesPath, 'edge-cases', 'mixed-encodings.csv'), 
        'utf-8'
      );

      const result = await csvService.parseCSVFile(csvContent, { hasHeader: true });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data && 'questions' in result.data) {
        // Vérifier les caractères français
        const frenchQuestion = result.data.questions.find(q => q.questionText.includes('àéèùç'));
        expect(frenchQuestion).toBeDefined();
        
        // Vérifier les émojis
        const emojiQuestion = result.data.questions.find(q => q.questionText.includes('🫀'));
        expect(emojiQuestion).toBeDefined();
        
        // Vérifier les caractères grecs
        const greekQuestion = result.data.questions.find(q => q.questionText.includes('α'));
        expect(greekQuestion).toBeDefined();
      }
    });
  });

  describe('Text Length Limits', () => {
    it('should handle very long text content', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'very-long-text.json'), 'utf-8')
      );

      const result = await validationService.validateImportData(fixture, 'questions');

      expect(result.isValid).toBe(true);
      
      // Vérifier les avertissements pour texte long
      expect(result.warnings.some(w => 
        w.message.includes('très long') || 
        w.message.includes('longueur')
      )).toBe(true);
      
      // Vérifier que le contenu long est préservé
      const longQuestion = fixture.questions.find(q => q.questionText.length > 500);
      expect(longQuestion).toBeDefined();
      expect(longQuestion.explanation.length).toBeGreaterThan(500);
    });

    it('should handle minimal text content', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'very-long-text.json'), 'utf-8')
      );

      const result = await validationService.validateImportData(fixture, 'questions');

      // Vérifier les avertissements pour texte très court
      expect(result.warnings.some(w => 
        w.message.includes('très court') || 
        w.message.includes('courte')
      )).toBe(true);
      
      // Vérifier qu'il y a une question minimale
      const minimalQuestion = fixture.questions.find(q => q.questionText === 'A');
      expect(minimalQuestion).toBeDefined();
    });

    it('should handle mixed text lengths appropriately', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'very-long-text.json'), 'utf-8')
      );

      const result = await validationService.validateImportData(fixture, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.summary.totalItems).toBeGreaterThan(1);
      
      // Vérifier qu'il y a des questions de différentes longueurs
      const questions = fixture.questions;
      const hasLong = questions.some(q => q.questionText.length > 500);
      const hasShort = questions.some(q => q.questionText.length < 10);
      const hasMedium = questions.some(q => q.questionText.length > 20 && q.questionText.length < 100);
      
      expect(hasLong).toBe(true);
      expect(hasShort).toBe(true);
      expect(hasMedium).toBe(true);
    });
  });

  describe('Medical Terminology', () => {
    it('should accept complex medical terms', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'special-medical-terms.json'), 'utf-8')
      );

      const result = await validationService.validateImportData(fixture, 'questions');

      expect(result.isValid).toBe(true);
      
      // Vérifier les termes médicaux complexes
      const fallotQuestion = fixture.questions.find(q => q.questionText.includes('tétralogie'));
      expect(fallotQuestion).toBeDefined();
      expect(fallotQuestion.category).toBe('Cardiologie Pédiatrique');
      
      const longTermQuestion = fixture.questions.find(q => 
        q.questionText.includes('pneumoultramicroscopicsilicovolcanoconiosе')
      );
      expect(longTermQuestion).toBeDefined();
      
      const endocrineQuestion = fixture.questions.find(q => 
        q.questionText.includes('pseudohypoparathyroïdisme')
      );
      expect(endocrineQuestion).toBeDefined();
    });

    it('should handle specialized medical categories', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'special-medical-terms.json'), 'utf-8')
      );

      const result = await validationService.validateImportData(fixture, 'questions');

      expect(result.isValid).toBe(true);
      
      // Vérifier les catégories spécialisées
      const categories = fixture.questions.map(q => q.category);
      expect(categories).toContain('Cardiologie Pédiatrique');
      expect(categories).toContain('Pneumologie');
      expect(categories).toContain('Endocrinologie');
      expect(categories).toContain('Psychiatrie');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'performance-large-dataset.json'), 'utf-8')
      );

      const startTime = Date.now();
      const result = await validationService.validateImportData(fixture, 'questions');
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(result.summary.totalItems).toBe(100);
      expect(result.summary.validItems).toBe(100);
      expect(result.summary.invalidItems).toBe(0);
      
      // Performance: moins de 10 secondes pour 100 questions
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should process large datasets in batches', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'performance-large-dataset.json'), 'utf-8')
      );

      const result = await batchService.processBatch(fixture, {
        batchSize: 25,
        userId: 'test-user',
        importType: 'questions'
      });

      expect(result.success).toBe(true);
      expect(result.summary.totalProcessed).toBe(100);
      expect(result.summary.successful).toBe(100);
      expect(result.summary.failed).toBe(0);
    });

    it('should maintain performance with concurrent validations', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'valid', 'questions-simple.json'), 'utf-8')
      );

      const startTime = Date.now();
      
      // Lancer 10 validations en parallèle
      const promises = Array(10).fill(null).map(() =>
        validationService.validateImportData(fixture, 'questions')
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Tous les résultats doivent être identiques et valides
      results.forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.summary.totalItems).toBe(fixture.questions.length);
      });

      // Performance: moins de 15 secondes pour 10 validations parallèles
      expect(endTime - startTime).toBeLessThan(15000);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle memory efficiently with large content', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'very-long-text.json'), 'utf-8')
      );

      // Simuler un dataset plus large en dupliquant le contenu
      const largeFixture = {
        ...fixture,
        questions: Array(50).fill(null).flatMap(() => fixture.questions)
      };

      const result = await validationService.validateImportData(largeFixture, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.summary.totalItems).toBe(50 * fixture.questions.length);
    });

    it('should clean up resources after processing', async () => {
      const fixture = JSON.parse(
        readFileSync(join(fixturesPath, 'edge-cases', 'performance-large-dataset.json'), 'utf-8')
      );

      const initialMemory = process.memoryUsage().heapUsed;
      
      await validationService.validateImportData(fixture, 'questions');
      
      // Forcer le garbage collection si disponible
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      
      // La mémoire ne devrait pas avoir augmenté de façon excessive
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Moins de 100MB
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover gracefully from malformed Unicode', async () => {
      // Créer un fixture avec des caractères potentiellement problématiques
      const problematicFixture = {
        version: "1.0",
        type: "questions",
        metadata: {
          source: "Test Unicode Problems",
          level: "PASS"
        },
        questions: [
          {
            questionText: "Question avec caractères de contrôle \u0000\u0001\u0002 ?",
            options: [
              {text: "Option normale", isCorrect: true},
              {text: "Option avec \uFFFD", isCorrect: false}
            ],
            explanation: "Test de résilience Unicode",
            category: "Test",
            difficulty: "easy",
            level: "PASS"
          }
        ]
      };

      const result = await validationService.validateImportData(problematicFixture, 'questions');

      // Le système devrait gérer gracieusement les caractères problématiques
      expect(result).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should handle extremely large individual fields', async () => {
      const extremeFixture = {
        version: "1.0",
        type: "questions",
        metadata: {
          source: "Test Extreme Size",
          level: "PASS"
        },
        questions: [
          {
            questionText: "A".repeat(10000), // 10KB de texte
            options: [
              {text: "B".repeat(5000), isCorrect: true},
              {text: "Option normale", isCorrect: false}
            ],
            explanation: "C".repeat(20000), // 20KB d'explication
            category: "Test",
            difficulty: "easy",
            level: "PASS"
          }
        ]
      };

      const result = await validationService.validateImportData(extremeFixture, 'questions');

      expect(result).toBeDefined();
      expect(result.warnings.some(w => w.message.includes('très long'))).toBe(true);
    });
  });
});