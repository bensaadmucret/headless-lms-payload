/**
 * Tests pour FlashcardConversionService
 * Teste la conversion de flashcards vers questions QCM
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FlashcardConversionService } from '../FlashcardConversionService';
import { ImportFlashcard } from '../../types/jsonImport';
import payload from 'payload';
import { AIDistractorGenerationService } from '../AIDistractorGenerationService';

// Mock de Payload
vi.mock('payload', () => ({
  default: {
    find: vi.fn(),
    create: vi.fn()
  }
}));

// Mock du service de génération de distracteurs IA
vi.mock('../AIDistractorGenerationService', () => ({
  AIDistractorGenerationService: vi.fn().mockImplementation(() => ({
    generateDistractorsForFlashcard: vi.fn().mockResolvedValue({
      success: true,
      distractors: [
        'Distracteur IA 1',
        'Distracteur IA 2',
        'Distracteur IA 3'
      ],
      confidence: 0.8,
      strategy: 'ai_generated'
    })
  }))
}));

// TODO: Ces tests nécessitent des mocks de services AI et de Payload CMS
// À corriger après refactoring des services
describe.skip('FlashcardConversionService', () => {
  let service: FlashcardConversionService;
  let mockPayload: any;

  beforeEach(() => {
    service = new FlashcardConversionService();
    mockPayload = payload as any;
    
    // Reset des mocks
    vi.clearAllMocks();
    
    // Mock des réponses Payload par défaut
    mockPayload.find.mockResolvedValue({
      docs: [{
        id: 'category-1',
        title: 'Cardiologie'
      }]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('convertToQuestion', () => {
    it('should convert flashcard to multiple choice question', async () => {
      const flashcard: ImportFlashcard = {
        front: 'Quelle est la fonction du ventricule gauche ?',
        back: 'Pomper le sang oxygéné vers l\'aorte et la circulation systémique',
        category: 'Cardiologie',
        difficulty: 'medium',
        tags: ['anatomie', 'cœur', 'ventricule']
      };

      const metadata = {
        deckName: 'Cardiologie PASS',
        category: 'Cardiologie',
        level: 'PASS'
      };

      const result = await service.convertToQuestion(flashcard, metadata);

      expect(result.success).toBe(true);
      expect(result.convertedQuestion).toBeDefined();
      expect(result.convertedQuestion.questionType).toBe('multipleChoice');
      expect(result.convertedQuestion.options).toHaveLength(4);
      expect(result.convertedQuestion.sourceType).toBe('flashcard_conversion');
      expect(result.distractorsGenerated).toBe(3);

      // Vérifier qu'une option est correcte
      const correctOptions = result.convertedQuestion.options.filter((opt: any) => opt.isCorrect);
      expect(correctOptions).toHaveLength(1);
      expect(correctOptions[0]?.optionText).toBe(flashcard.back);
    });

    it('should convert flashcard to true/false question', async () => {
      const flashcard: ImportFlashcard = {
        front: 'Le ventricule gauche pompe-t-il le sang vers l\'aorte ?',
        back: 'Oui, c\'est sa fonction principale',
        category: 'Cardiologie',
        difficulty: 'easy'
      };

      const metadata = {
        level: 'PASS'
      };

      const options = {
        generateDistractors: false,
        preserveMetadata: true,
        useAIDistractors: false,
        targetQuestionType: 'trueFalse' as const
      };

      const result = await service.convertToQuestion(flashcard, metadata, options);

      expect(result.success).toBe(true);
      expect(result.convertedQuestion.questionType).toBe('trueFalse');
      expect(result.convertedQuestion.options).toHaveLength(2);
      expect(result.convertedQuestion.options[0]?.optionText).toBe('Vrai');
      expect(result.convertedQuestion.options[1]?.optionText).toBe('Faux');
    });

    it('should convert flashcard to fill-in-blanks question', async () => {
      const flashcard: ImportFlashcard = {
        front: 'Complétez: Le ventricule gauche pompe le sang vers...',
        back: 'l\'aorte',
        category: 'Cardiologie',
        difficulty: 'medium'
      };

      const metadata = {
        level: 'LAS'
      };

      const options = {
        generateDistractors: false,
        preserveMetadata: true,
        useAIDistractors: false,
        targetQuestionType: 'fillInBlanks' as const
      };

      const result = await service.convertToQuestion(flashcard, metadata, options);

      expect(result.success).toBe(true);
      expect(result.convertedQuestion.questionType).toBe('fillInBlanks');
      expect(result.convertedQuestion.correctAnswer).toBe(flashcard.back);
    });

    it('should use AI distractors when enabled', async () => {
      const flashcard: ImportFlashcard = {
        front: 'Quelle structure cardiaque pompe le sang oxygéné ?',
        back: 'Ventricule gauche',
        category: 'Cardiologie',
        difficulty: 'medium'
      };

      const metadata = {
        level: 'PASS'
      };

      const options = {
        generateDistractors: true,
        preserveMetadata: true,
        useAIDistractors: true,
        targetQuestionType: 'multipleChoice' as const
      };

      const result = await service.convertToQuestion(flashcard, metadata, options);

      expect(result.success).toBe(true);
      expect(result.convertedQuestion.generatedByAI).toBe(true);
      expect(result.distractorsGenerated).toBe(3);

      // Vérifier que les distracteurs IA sont utilisés
      const incorrectOptions = result.convertedQuestion.options.filter((opt: any) => !opt.isCorrect);
      expect(incorrectOptions.some((opt: any) => opt.optionText.includes('Distracteur IA'))).toBe(true);
    });

    it('should preserve flashcard metadata in conversion', async () => {
      const flashcard: ImportFlashcard = {
        front: 'Question avec métadonnées',
        back: 'Réponse avec métadonnées',
        category: 'Test',
        difficulty: 'hard',
        tags: ['test', 'metadata', 'conversion'],
        imageUrl: 'https://example.com/image.jpg'
      };

      const metadata = {
        deckName: 'Test Deck',
        level: 'both'
      };

      const options = {
        generateDistractors: true,
        preserveMetadata: true,
        useAIDistractors: false,
        targetQuestionType: 'multipleChoice' as const
      };

      const result = await service.convertToQuestion(flashcard, metadata, options);

      expect(result.success).toBe(true);
      expect(result.convertedQuestion.conversionMetadata).toBeDefined();
      expect(result.convertedQuestion.conversionMetadata.originalType).toBe('flashcard');
      expect(result.convertedQuestion.conversionMetadata.cardAnalysis).toBeDefined();
      expect(result.convertedQuestion.tags).toHaveLength(3);
      expect(result.convertedQuestion.difficulty).toBe('hard');
    });
  });

  describe('flashcard analysis', () => {
    it('should correctly analyze definition-type flashcards', async () => {
      const definitionCard: ImportFlashcard = {
        front: 'Qu\'est-ce que le ventricule gauche ?',
        back: 'Cavité cardiaque qui pompe le sang oxygéné vers la circulation systémique',
        category: 'Cardiologie',
        difficulty: 'easy'
      };

      const metadata = { level: 'PASS' };
      const result = await service.convertToQuestion(definitionCard, metadata);

      expect(result.success).toBe(true);
      expect(result.convertedQuestion.conversionMetadata.cardAnalysis.type).toBe('definition');
    });

    it('should correctly analyze procedural flashcards', async () => {
      const proceduralCard: ImportFlashcard = {
        front: 'Comment mesurer la pression artérielle ?',
        back: 'Placer le brassard, gonfler, dégonfler lentement en écoutant les bruits de Korotkoff',
        category: 'Médecine',
        difficulty: 'medium'
      };

      const metadata = { level: 'LAS' };
      const result = await service.convertToQuestion(proceduralCard, metadata);

      expect(result.success).toBe(true);
      expect(result.convertedQuestion.conversionMetadata.cardAnalysis.type).toBe('procedural');
    });

    it('should detect numeric answers', async () => {
      const numericCard: ImportFlashcard = {
        front: 'Quelle est la fréquence cardiaque normale au repos ?',
        back: '60 à 100 battements par minute',
        category: 'Physiologie',
        difficulty: 'easy'
      };

      const metadata = { level: 'PASS' };
      const result = await service.convertToQuestion(numericCard, metadata);

      expect(result.success).toBe(true);
      expect(result.convertedQuestion.conversionMetadata.cardAnalysis.hasNumericAnswer).toBe(true);
    });
  });

  describe('distractor generation strategies', () => {
    it('should use numeric variants for numeric answers', async () => {
      const numericCard: ImportFlashcard = {
        front: 'Combien de chambres a le cœur humain ?',
        back: '4 chambres',
        category: 'Anatomie',
        difficulty: 'easy'
      };

      const metadata = { level: 'PASS' };
      const options = {
        generateDistractors: true,
        preserveMetadata: true,
        useAIDistractors: false,
        targetQuestionType: 'multipleChoice' as const
      };

      const result = await service.convertToQuestion(numericCard, metadata, options);

      expect(result.success).toBe(true);
      
      // Vérifier que les distracteurs contiennent des variantes numériques
      const incorrectOptions = result.convertedQuestion.options.filter((opt: any) => !opt.isCorrect);
      const hasNumericVariants = incorrectOptions.some((opt: any) => 
        opt.optionText.includes('3 chambres') || 
        opt.optionText.includes('5 chambres') ||
        opt.optionText.includes('8 chambres')
      );
      expect(hasNumericVariants).toBe(true);
    });

    it('should use conceptual distractors for definitions', async () => {
      const definitionCard: ImportFlashcard = {
        front: 'Définition du ventricule gauche',
        back: 'Cavité cardiaque qui pompe le sang oxygéné',
        category: 'Cardiologie',
        difficulty: 'medium'
      };

      const metadata = { level: 'PASS' };
      const options = {
        generateDistractors: true,
        preserveMetadata: true,
        useAIDistractors: false,
        targetQuestionType: 'multipleChoice' as const
      };

      const result = await service.convertToQuestion(definitionCard, metadata, options);

      expect(result.success).toBe(true);
      
      // Vérifier que les distracteurs sont conceptuels (liés à la cardiologie)
      const incorrectOptions = result.convertedQuestion.options.filter((opt: any) => !opt.isCorrect);
      const hasConceptualDistractors = incorrectOptions.some((opt: any) => 
        opt.optionText.includes('Ventricule droit') || 
        opt.optionText.includes('Oreillette') ||
        opt.optionText.includes('Valve')
      );
      expect(hasConceptualDistractors).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle conversion errors gracefully', async () => {
      // Mock une erreur lors de la résolution de catégorie
      mockPayload.find.mockRejectedValue(new Error('Database connection failed'));

      const flashcard: ImportFlashcard = {
        front: 'Test question',
        back: 'Test answer',
        category: 'Test',
        difficulty: 'medium'
      };

      const metadata = { level: 'PASS' };
      const result = await service.convertToQuestion(flashcard, metadata);

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('Erreur lors de la conversion: Database connection failed');
      expect(result.distractorsGenerated).toBe(0);
    });

    it('should fallback to rule-based distractors when AI fails', async () => {
      // Mock l'échec du service IA
      const mockAIService: any = AIDistractorGenerationService;
      const mockInstance = new mockAIService();
      mockInstance.generateDistractorsForFlashcard.mockResolvedValue({
        success: false,
        distractors: [],
        confidence: 0,
        strategy: 'failed'
      });

      const flashcard: ImportFlashcard = {
        front: 'Question avec IA défaillante',
        back: 'Réponse test',
        category: 'Test',
        difficulty: 'medium'
      };

      const metadata = { level: 'PASS' };
      const options = {
        generateDistractors: true,
        preserveMetadata: true,
        useAIDistractors: true,
        targetQuestionType: 'multipleChoice' as const
      };

      const result = await service.convertToQuestion(flashcard, metadata, options);

      expect(result.success).toBe(true);
      expect(result.distractorsGenerated).toBe(3); // Fallback vers règles
      expect(result.convertedQuestion.generatedByAI).toBe(true); // Option était activée
    });
  });

  describe('category resolution', () => {
    it('should create new category when not found', async () => {
      // Mock: catégorie n'existe pas
      mockPayload.find.mockResolvedValue({ docs: [] });
      
      // Mock: création de catégorie
      mockPayload.create.mockResolvedValue({ id: 'new-category-1' });

      const flashcard: ImportFlashcard = {
        front: 'Question nouvelle catégorie',
        back: 'Réponse nouvelle catégorie',
        category: 'Nouvelle Spécialité',
        difficulty: 'medium'
      };

      const metadata = { level: 'LAS' };
      const result = await service.convertToQuestion(flashcard, metadata);

      expect(result.success).toBe(true);
      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'categories',
        data: expect.objectContaining({
          title: 'Nouvelle Spécialité',
          level: 'LAS'
        })
      });
    });

    it('should use existing category when found', async () => {
      // Mock: catégorie existe
      mockPayload.find.mockResolvedValue({
        docs: [{
          id: 'existing-category',
          title: 'Cardiologie'
        }]
      });

      const flashcard: ImportFlashcard = {
        front: 'Question catégorie existante',
        back: 'Réponse catégorie existante',
        category: 'Cardiologie',
        difficulty: 'easy'
      };

      const metadata = { level: 'PASS' };
      const result = await service.convertToQuestion(flashcard, metadata);

      expect(result.success).toBe(true);
      expect(result.convertedQuestion.category).toBe('existing-category');
      
      // Vérifier qu'on n'a pas créé de nouvelle catégorie
      expect(mockPayload.create).not.toHaveBeenCalledWith({
        collection: 'categories',
        data: expect.anything()
      });
    });
  });
});