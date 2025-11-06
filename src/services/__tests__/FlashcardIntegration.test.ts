/**
 * Test d'intégration pour le système de flashcards
 * Teste le workflow complet d'import et conversion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlashcardImportService } from '../FlashcardImportService';
import { FlashcardConversionService } from '../FlashcardConversionService';
import { FlashcardImportData, ImportFlashcard } from '../../types/jsonImport';

interface MultipleChoiceOption {
  optionText: string;
  isCorrect: boolean;
}

// Mock minimal de Payload
vi.mock('payload', () => ({
  default: {
    find: vi.fn().mockResolvedValue({ docs: [] }),
    create: vi.fn().mockResolvedValue({ id: 'test-id' })
  }
}));

// Mock des services IA
vi.mock('../JSONValidationService', () => ({
  JSONValidationService: vi.fn().mockImplementation(() => ({
    validateImportData: vi.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      summary: { totalItems: 1, validItems: 1, invalidItems: 0, duplicates: 0, missingCategories: [] }
    })
  }))
}));

vi.mock('../AIDistractorGenerationService', () => ({
  AIDistractorGenerationService: vi.fn().mockImplementation(() => ({
    generateDistractorsForFlashcard: vi.fn().mockResolvedValue({
      success: true,
      distractors: ['Distracteur 1', 'Distracteur 2', 'Distracteur 3'],
      confidence: 0.8,
      strategy: 'ai_generated'
    })
  }))
}));

describe('Flashcard Integration Tests', () => {
  let importService: FlashcardImportService;
  let conversionService: FlashcardConversionService;

  beforeEach(() => {
    importService = new FlashcardImportService();
    conversionService = new FlashcardConversionService();
    vi.clearAllMocks();
  });

  it('should complete full flashcard import workflow', async () => {
    // Données de test
    const flashcardData: FlashcardImportData = {
      version: '1.0',
      type: 'flashcards',
      metadata: {
        deckName: 'Test Cardiologie',
        category: 'Cardiologie',
        level: 'PASS',
        description: 'Deck de test pour cardiologie'
      },
      cards: [
        {
          front: 'Quelle est la fonction principale du ventricule gauche ?',
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

    // 1. Validation des flashcards
    const validationResult = await importService.validateFlashcards(flashcardData);
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.summary.totalItems).toBe(2);

    // 2. Traitement et conversion
    const processingResult = await importService.processFlashcards(flashcardData, 'test-user', true);
    expect(processingResult.success).toBe(true);
    expect(processingResult.summary.successful).toBe(2);
    expect(processingResult.summary.converted).toBe(2);
    expect(processingResult.createdIds).toHaveLength(2);
  });

  it('should handle individual flashcard conversion', async () => {
    const flashcard: ImportFlashcard = {
      front: 'Combien de chambres a le cœur humain ?',
      back: '4 chambres (2 oreillettes et 2 ventricules)',
      category: 'Anatomie',
      difficulty: 'easy',
      tags: ['anatomie', 'cœur', 'structure']
    };

    const metadata = {
      deckName: 'Anatomie Basique',
      category: 'Anatomie',
      level: 'PASS'
    };

    // Test conversion en QCM
    const mcqResult = await conversionService.convertToQuestion(flashcard, metadata, {
      generateDistractors: true,
      preserveMetadata: true,
      useAIDistractors: true,
      targetQuestionType: 'multipleChoice'
    });

    expect(mcqResult.success).toBe(true);
    expect(mcqResult.convertedQuestion.questionType).toBe('multipleChoice');
    expect(mcqResult.convertedQuestion.options).toHaveLength(4);
    expect(mcqResult.distractorsGenerated).toBe(3);

    // Vérifier qu'une option est correcte
    const convertedOptions = mcqResult.convertedQuestion.options as MultipleChoiceOption[];
    const correctOptions = convertedOptions.filter(opt => opt.isCorrect);
    expect(correctOptions).toHaveLength(1);
    expect(correctOptions[0]?.optionText).toBe(flashcard.back);

    // Test conversion en vrai/faux
    const tfResult = await conversionService.convertToQuestion(flashcard, metadata, {
      generateDistractors: false,
      preserveMetadata: true,
      useAIDistractors: false,
      targetQuestionType: 'trueFalse'
    });

    expect(tfResult.success).toBe(true);
    expect(tfResult.convertedQuestion.questionType).toBe('trueFalse');
    expect(tfResult.convertedQuestion.options).toHaveLength(2);
  });

  it('should preserve flashcard metadata through conversion', async () => {
    const flashcard: ImportFlashcard = {
      front: 'Question avec métadonnées complètes',
      back: 'Réponse avec métadonnées',
      category: 'Test',
      difficulty: 'hard',
      tags: ['test', 'metadata', 'preservation'],
      imageUrl: 'https://example.com/test-image.jpg'
    };

    const metadata = {
      deckName: 'Test Metadata',
      category: 'Test',
      level: 'LAS',
      description: 'Test de préservation des métadonnées'
    };

    const result = await conversionService.convertToQuestion(flashcard, metadata, {
      generateDistractors: true,
      preserveMetadata: true,
      useAIDistractors: false,
      targetQuestionType: 'multipleChoice'
    });

    expect(result.success).toBe(true);
    
    // Vérifier la préservation des métadonnées
    expect(result.convertedQuestion.difficulty).toBe('hard');
    expect(result.convertedQuestion.studentLevel).toBe('LAS');
    expect(result.convertedQuestion.tags).toHaveLength(3);
    expect(result.convertedQuestion.sourceType).toBe('flashcard_conversion');
    
    // Vérifier les métadonnées de conversion
    expect(result.convertedQuestion.conversionMetadata).toBeDefined();
    expect(result.convertedQuestion.conversionMetadata.originalType).toBe('flashcard');
    expect(result.convertedQuestion.conversionMetadata.cardAnalysis).toBeDefined();
  });

  it('should handle validation errors gracefully', async () => {
    const invalidData: FlashcardImportData = {
      version: '1.0',
      type: 'flashcards',
      metadata: {
        deckName: '', // Nom vide - erreur
        category: '', // Catégorie vide - erreur
        level: 'PASS'
      },
      cards: [
        {
          front: 'A', // Trop court
          back: 'A', // Trop court et identique
          category: '',
          difficulty: 'medium'
        }
      ]
    };

    const validationResult = await importService.validateFlashcards(invalidData);
    
    // Devrait détecter les erreurs
    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.length).toBeGreaterThan(0);
    
    // Vérifier les types d'erreurs détectées
    const hasMetadataError = validationResult.errors.some(e => 
      e.field?.includes('metadata')
    );
    const hasContentError = validationResult.errors.some(e => 
      e.message.includes('identiques')
    );
    
    expect(hasMetadataError || hasContentError).toBe(true);
  });

  it('should detect and report duplicate flashcards', async () => {
    const dataWithDuplicates: FlashcardImportData = {
      version: '1.0',
      type: 'flashcards',
      metadata: {
        deckName: 'Test Duplicates',
        category: 'Test',
        level: 'PASS'
      },
      cards: [
        {
          front: 'Question identique',
          back: 'Réponse identique',
          category: 'Test',
          difficulty: 'easy'
        },
        {
          front: 'Question identique', // Même question
          back: 'Réponse identique', // Même réponse
          category: 'Test',
          difficulty: 'easy'
        },
        {
          front: 'Question différente',
          back: 'Réponse différente',
          category: 'Test',
          difficulty: 'medium'
        }
      ]
    };

    const validationResult = await importService.validateFlashcards(dataWithDuplicates);
    
    expect(validationResult.summary.duplicates).toBe(1);
    
    const duplicateWarning = validationResult.warnings.find(w => 
      w.message.includes('dupliquée')
    );
    expect(duplicateWarning).toBeDefined();
    expect(duplicateWarning?.itemIndex).toBe(1); // Deuxième carte (index 1)
  });
});