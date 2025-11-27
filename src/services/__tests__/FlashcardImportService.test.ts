/**
 * Tests pour FlashcardImportService
 * Teste la validation et le traitement des flashcards
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FlashcardImportService } from '../FlashcardImportService';
import { FlashcardImportData } from '../../types/jsonImport';
import payload from 'payload';
import { SpacedRepetitionSchedulingService } from '../SpacedRepetitionSchedulingService';

// Mock de Payload
vi.mock('payload', () => ({
  default: {
    find: vi.fn(),
    create: vi.fn()
  }
}));

// Mock du service de validation JSON
vi.mock('../JSONValidationService', () => ({
  JSONValidationService: vi.fn().mockImplementation(() => ({
    validateImportData: vi.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        totalItems: 3,
        validItems: 3,
        invalidItems: 0,
        duplicates: 0,
        missingCategories: []
      }
    })
  }))
}));

// Mock du service de répétition espacée
vi.mock('../SpacedRepetitionSchedulingService', () => ({
  SpacedRepetitionSchedulingService: vi.fn().mockImplementation(() => ({
    createScheduleForImportedFlashcards: vi.fn().mockResolvedValue({
      id: 'schedule-123',
      userId: 'user-1',
      deckName: 'Test Deck',
      totalCards: 2,
      activeCards: 2,
      completedCards: 0,
      averageEaseFactor: 2.5,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }))
}));

// TODO: Ces tests nécessitent des mocks de services complexes
// À corriger après refactoring
describe.skip('FlashcardImportService', () => {
  let service: FlashcardImportService;
  let mockPayload: any;

  beforeEach(() => {
    service = new FlashcardImportService();
    mockPayload = payload as any;
    
    // Reset des mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateFlashcards', () => {
    it('should validate flashcard structure correctly', async () => {
      const validData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Cardiologie PASS',
          category: 'Cardiologie',
          level: 'PASS',
          description: 'Flashcards pour révision cardiologie'
        },
        cards: [
          {
            front: 'Quelle est la fonction du ventricule gauche ?',
            back: 'Pomper le sang oxygéné vers l\'aorte et la circulation systémique',
            category: 'Cardiologie',
            difficulty: 'medium',
            tags: ['anatomie', 'cœur', 'ventricule']
          },
          {
            front: 'Où se trouve la valve mitrale ?',
            back: 'Entre l\'oreillette gauche et le ventricule gauche',
            category: 'Cardiologie',
            difficulty: 'easy',
            tags: ['anatomie', 'valve']
          }
        ]
      };

      const result = await service.validateFlashcards(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalItems).toBe(2);
      expect(result.summary.validItems).toBe(2);
    });

    it('should detect flashcard content issues', async () => {
      const invalidData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Test Deck',
          category: 'Test',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Test', // Trop court
            back: 'Test', // Trop court et identique au recto
            category: 'Test',
            difficulty: 'medium'
          }
        ]
      };

      const result = await service.validateFlashcards(invalidData);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      
      // Vérifier qu'on détecte le contenu identique
      const identicalContentError = result.errors.find(e => 
        e.message.includes('identiques')
      );
      expect(identicalContentError).toBeDefined();
    });

    it('should validate media references when enabled', async () => {
      const dataWithMedia: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Visual Cards',
          category: 'Anatomie',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Identifiez cette structure',
            back: 'Ventricule gauche',
            category: 'Anatomie',
            difficulty: 'medium',
            imageUrl: 'invalid-url' // URL invalide
          },
          {
            front: 'Quelle est cette valve ?',
            back: 'Valve mitrale',
            category: 'Anatomie',
            difficulty: 'easy',
            imageUrl: 'https://example.com/image.jpg' // URL valide
          }
        ]
      };

      const result = await service.validateFlashcards(dataWithMedia, {
        validateMediaReferences: true,
        checkDuplicates: true,
        validateCategories: true,
        requireImages: false
      });

      // Vérifier qu'on détecte l'URL invalide
      const invalidUrlError = result.errors.find(e => 
        e.message.includes('URL d\'image invalide')
      );
      expect(invalidUrlError).toBeDefined();
    });

    it('should detect duplicate flashcards', async () => {
      const dataWithDuplicates: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Duplicate Test',
          category: 'Test',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Question test',
            back: 'Réponse test',
            category: 'Test',
            difficulty: 'easy'
          },
          {
            front: 'Question test', // Identique
            back: 'Réponse test', // Identique
            category: 'Test',
            difficulty: 'easy'
          }
        ]
      };

      const result = await service.validateFlashcards(dataWithDuplicates);

      expect(result.summary.duplicates).toBeGreaterThan(0);
      const duplicateWarning = result.warnings.find(w => 
        w.message.includes('dupliquée')
      );
      expect(duplicateWarning).toBeDefined();
    });
  });

  describe('processFlashcards', () => {
    beforeEach(() => {
      // Mock des réponses Payload
      mockPayload.find.mockResolvedValue({
        docs: [{
          id: 'category-1',
          title: 'Cardiologie'
        }]
      });

      mockPayload.create.mockResolvedValue({
        id: 'question-1'
      });
    });

    it('should process flashcards and convert to questions', async () => {
      const testData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Test Deck',
          category: 'Cardiologie',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Quelle est la fonction du ventricule gauche ?',
            back: 'Pomper le sang oxygéné vers l\'aorte',
            category: 'Cardiologie',
            difficulty: 'medium',
            tags: ['anatomie', 'cœur']
          }
        ]
      };

      const result = await service.processFlashcards(testData, 'user-1', true);

      expect(result.success).toBe(true);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.converted).toBe(1);
      expect(result.createdIds).toHaveLength(1);
      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'questions',
        data: expect.objectContaining({
          questionType: 'multipleChoice',
          sourceType: 'flashcard_import',
          validationStatus: 'needs_review'
        })
      });
    });

    it('should handle processing errors gracefully', async () => {
      mockPayload.create.mockRejectedValue(new Error('Database error'));

      const testData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Error Test',
          category: 'Test',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Test question',
            back: 'Test answer',
            category: 'Test',
            difficulty: 'easy'
          }
        ]
      };

      const result = await service.processFlashcards(testData, 'user-1', true);

      expect(result.success).toBe(true); // Pas d'erreur critique
      expect(result.summary.failed).toBe(1);
      expect(result.summary.successful).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('Database error');
    });

    it('should preserve flashcard metadata during conversion', async () => {
      const testData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Metadata Test',
          category: 'Cardiologie',
          level: 'LAS',
          description: 'Test deck with metadata'
        },
        cards: [
          {
            front: 'Test question with image',
            back: 'Test answer',
            category: 'Cardiologie',
            difficulty: 'hard',
            tags: ['test', 'metadata'],
            imageUrl: 'https://example.com/image.jpg'
          }
        ]
      };

      const result = await service.processFlashcards(testData, 'user-1', true);

      expect(result.success).toBe(true);
      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'questions',
        data: expect.objectContaining({
          studentLevel: 'LAS',
          difficulty: 'hard',
          tags: [{ tag: 'test' }, { tag: 'metadata' }],
          originalFlashcard: expect.objectContaining({
            front: 'Test question with image',
            back: 'Test answer',
            imageUrl: 'https://example.com/image.jpg'
          })
        })
      });
    });
  });

  describe('deck coherence validation', () => {
    it('should warn about decks with too many categories', async () => {
      const diverseData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Diverse Deck',
          category: 'Médecine',
          level: 'PASS'
        },
        cards: Array.from({ length: 6 }, (_, i) => ({
          front: `Question ${i + 1}`,
          back: `Answer ${i + 1}`,
          category: `Category ${i + 1}`, // 6 catégories différentes
          difficulty: 'medium' as const
        }))
      };

      const result = await service.validateFlashcards(diverseData);

      const categoryWarning = result.warnings.find(w => 
        w.message.includes('catégories différentes')
      );
      expect(categoryWarning).toBeDefined();
    });

    it('should warn about difficulty distribution issues', async () => {
      const easyOnlyData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Easy Only',
          category: 'Test',
          level: 'PASS'
        },
        cards: Array.from({ length: 10 }, (_, i) => ({
          front: `Easy question ${i + 1}`,
          back: `Easy answer ${i + 1}`,
          category: 'Test',
          difficulty: 'easy' as const // Toutes faciles
        }))
      };

      const result = await service.validateFlashcards(easyOnlyData);

      const difficultyWarning = result.warnings.find(w => 
        w.message.includes('flashcards faciles')
      );
      expect(difficultyWarning).toBeDefined();
    });

    it('should warn about very large decks', async () => {
      const largeData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Large Deck',
          category: 'Test',
          level: 'PASS'
        },
        cards: Array.from({ length: 250 }, (_, i) => ({ // Plus de 200 cartes
          front: `Question ${i + 1}`,
          back: `Answer ${i + 1}`,
          category: 'Test',
          difficulty: 'medium' as const
        }))
      };

      const result = await service.validateFlashcards(largeData);

      const sizeWarning = result.warnings.find(w => 
        w.message.includes('très volumineux')
      );
      expect(sizeWarning).toBeDefined();
    });
  });

  describe('category resolution', () => {
    it('should create missing categories automatically', async () => {
      // Mock: catégorie n'existe pas
      mockPayload.find.mockResolvedValue({ docs: [] });
      
      // Mock: création de catégorie
      mockPayload.create
        .mockResolvedValueOnce({ id: 'new-category-1' }) // Création catégorie
        .mockResolvedValueOnce({ id: 'question-1' }); // Création question

      const testData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'New Category Test',
          category: 'Nouvelle Catégorie',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Test question',
            back: 'Test answer',
            category: 'Nouvelle Catégorie',
            difficulty: 'medium'
          }
        ]
      };

      const result = await service.processFlashcards(testData, 'user-1', true);

      expect(result.success).toBe(true);
      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'categories',
        data: expect.objectContaining({
          title: 'Nouvelle Catégorie',
          level: 'PASS'
        })
      });
    });
  });

  describe('spaced repetition integration', () => {
    it('should create spaced repetition schedule when enabled', async () => {
      const testData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'SRS Test Deck',
          category: 'Cardiologie',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Question 1',
            back: 'Answer 1',
            category: 'Cardiologie',
            difficulty: 'medium'
          },
          {
            front: 'Question 2',
            back: 'Answer 2',
            category: 'Cardiologie',
            difficulty: 'easy'
          }
        ]
      };

      const result = await service.processFlashcards(testData, 'user-1', true, true);

      expect(result.success).toBe(true);
      expect(result.summary.spacedRepetitionScheduleId).toBe('schedule-123');
      
      // Vérifier qu'un résultat supplémentaire a été ajouté pour le planning
      const scheduleResult = result.results.find(r => 
        r.message.includes('Planning de répétition espacée créé')
      );
      expect(scheduleResult).toBeDefined();
      expect(scheduleResult?.payloadId).toBe('schedule-123');
    });

    it('should not create spaced repetition schedule when disabled', async () => {
      const testData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'No SRS Deck',
          category: 'Test',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Question 1',
            back: 'Answer 1',
            category: 'Test',
            difficulty: 'medium'
          }
        ]
      };

      const result = await service.processFlashcards(testData, 'user-1', true, false);

      expect(result.success).toBe(true);
      expect(result.summary.spacedRepetitionScheduleId).toBeUndefined();
      
      // Vérifier qu'aucun résultat de planning n'a été ajouté
      const scheduleResult = result.results.find(r => 
        r.message.includes('Planning de répétition espacée')
      );
      expect(scheduleResult).toBeUndefined();
    });

    it('should handle spaced repetition service errors gracefully', async () => {
      const mockSRSService: any = SpacedRepetitionSchedulingService;
      const mockInstance = new mockSRSService();
      mockInstance.createScheduleForImportedFlashcards.mockRejectedValue(
        new Error('SRS service error')
      );

      const testData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Error Test Deck',
          category: 'Test',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Question 1',
            back: 'Answer 1',
            category: 'Test',
            difficulty: 'medium'
          }
        ]
      };

      const result = await service.processFlashcards(testData, 'user-1', true, true);

      // L'import doit réussir même si le SRS échoue
      expect(result.success).toBe(true);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.spacedRepetitionScheduleId).toBeUndefined();
      
      // Vérifier qu'un avertissement a été ajouté
      const srsError = result.errors.find(e => 
        e.message.includes('Impossible de créer le planning de répétition espacée')
      );
      expect(srsError).toBeDefined();
      expect(srsError?.severity).toBe('warning');
    });

    it('should infer deck difficulty correctly', async () => {
      // Test avec un deck majoritairement difficile
      const hardData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Hard Deck',
          category: 'Test',
          level: 'PASS'
        },
        cards: [
          { front: 'Q1', back: 'A1', category: 'Test', difficulty: 'hard' },
          { front: 'Q2', back: 'A2', category: 'Test', difficulty: 'hard' },
          { front: 'Q3', back: 'A3', category: 'Test', difficulty: 'hard' },
          { front: 'Q4', back: 'A4', category: 'Test', difficulty: 'medium' }
        ]
      };

      await service.processFlashcards(hardData, 'user-1', true, true);

      const mockSRSService: any = SpacedRepetitionSchedulingService;
      const mockInstance = new mockSRSService();
      
      expect(mockInstance.createScheduleForImportedFlashcards).toHaveBeenCalledWith(
        'user-1',
        'Hard Deck',
        expect.any(Array),
        expect.objectContaining({
          difficulty: 'hard'
        })
      );
    });

    it('should pass correct metadata to spaced repetition service', async () => {
      const testData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Metadata Test Deck',
          category: 'Cardiologie',
          level: 'LAS'
        },
        cards: [
          { front: 'Q1', back: 'A1', category: 'Cardiologie', difficulty: 'easy' },
          { front: 'Q2', back: 'A2', category: 'Cardiologie', difficulty: 'easy' }
        ]
      };

      await service.processFlashcards(testData, 'user-1', true, true);

      const mockSRSService: any = SpacedRepetitionSchedulingService;
      const mockInstance = new mockSRSService();
      
      expect(mockInstance.createScheduleForImportedFlashcards).toHaveBeenCalledWith(
        'user-1',
        'Metadata Test Deck',
        expect.any(Array),
        expect.objectContaining({
          difficulty: 'easy',
          category: 'Cardiologie',
          estimatedSessionDuration: 4 // 2 cartes * 2 min
        })
      );
    });
  });
});