/**
 * Tests pour le service de création automatique de quiz
 * Tâche 5: Tests de création automatique des quiz et questions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuizCreationService } from '../QuizCreationService';
import type { AIGeneratedQuiz } from '../ContentValidatorService';

// Mock de Payload
const mockPayload = {
  create: vi.fn(),
  findByID: vi.fn(),
  find: vi.fn(),
  delete: vi.fn()
};

describe('QuizCreationService', () => {
  let service: QuizCreationService;
  let mockAIContent: AIGeneratedQuiz;
  let mockRequest: any;

  beforeEach(() => {
    service = new QuizCreationService(mockPayload as any);
    vi.clearAllMocks();

    mockAIContent = {
      quiz: {
        title: "Quiz Test - Anatomie Cardiaque",
        description: "Quiz de test sur l'anatomie du cœur",
        estimatedDuration: 15
      },
      questions: [
        {
          questionText: "Combien de chambres possède le cœur humain ?",
          options: [
            { text: "2 chambres", isCorrect: false },
            { text: "3 chambres", isCorrect: false },
            { text: "4 chambres", isCorrect: true },
            { text: "5 chambres", isCorrect: false }
          ],
          explanation: "Le cœur humain possède 4 chambres : 2 oreillettes et 2 ventricules.",
          difficulty: "easy",
          tags: ["cardiologie", "anatomie"]
        },
        {
          questionText: "Quel est le rôle principal du ventricule gauche ?",
          options: [
            { text: "Pomper le sang vers les poumons", isCorrect: false },
            { text: "Pomper le sang vers le corps", isCorrect: true },
            { text: "Recevoir le sang des poumons", isCorrect: false },
            { text: "Recevoir le sang du corps", isCorrect: false }
          ],
          explanation: "Le ventricule gauche pompe le sang oxygéné vers tout le corps via l'aorte.",
          difficulty: "medium",
          tags: ["cardiologie", "physiologie"]
        }
      ]
    };

    mockRequest = {
      aiContent: mockAIContent,
      categoryId: 'cat_123',
      categoryName: 'Cardiologie',
      studentLevel: 'PASS' as const,
      userId: 'user_123'
    };
  });

  describe('createQuizFromAIContent', () => {

    it('devrait créer un quiz complet avec succès', async () => {
      // Mock des réponses Payload
      mockPayload.create
        .mockResolvedValueOnce({ id: 1 }) // Première question
        .mockResolvedValueOnce({ id: 2 }) // Deuxième question
        .mockResolvedValueOnce({ id: 123 }); // Quiz

      mockPayload.findByID.mockResolvedValue({
        id: 123,
        questions: [1, 2]
      });

      const result = await service.createQuizFromAIContent(mockRequest);

      expect(result.success).toBe(true);
      expect(result.quizId).toBe('123');
      expect(result.questionIds).toEqual(['1', '2']);
      expect(result.questionsCreated).toBe(2);
      expect(result.metadata.generatedByAI).toBe(true);

      // Vérifier que les questions ont été créées
      expect(mockPayload.create).toHaveBeenCalledTimes(3); // 2 questions + 1 quiz

      // Vérifier la structure des données de question
      const firstQuestionCall = mockPayload.create.mock.calls[0];
      expect(firstQuestionCall).toBeDefined();
      expect(firstQuestionCall![0]).toEqual({
        collection: 'questions',
        data: expect.objectContaining({
          questionType: 'multipleChoice',
          options: expect.arrayContaining([
            expect.objectContaining({
              optionText: '4 chambres',
              isCorrect: true
            })
          ]),
          explanation: expect.stringContaining('4 chambres'),
          category: 'cat_123',
          generatedByAI: true
        })
      });
    });

    it('devrait gérer les erreurs de validation', async () => {
      const invalidRequest = {
        ...mockRequest,
        aiContent: {
          ...mockAIContent,
          quiz: {
            ...mockAIContent.quiz,
            title: '' // Titre vide - invalide
          }
        }
      };

      const result = await service.createQuizFromAIContent(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Titre du quiz manquant ou trop court');
      expect(mockPayload.create).not.toHaveBeenCalled();
    });

    it('devrait nettoyer les questions en cas d\'échec du quiz', async () => {
      // Mock: questions créées avec succès, mais échec du quiz
      mockPayload.create
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 })
        .mockRejectedValueOnce(new Error('Erreur création quiz'));

      const result = await service.createQuizFromAIContent(mockRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Erreur création quiz: Erreur création quiz');

      // Vérifier que les questions ont été supprimées
      expect(mockPayload.delete).toHaveBeenCalledTimes(2);
      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: 'questions',
        id: '1'
      });
      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: 'questions',
        id: '2'
      });
    });

    it('devrait valider les options des questions', async () => {
      const invalidQuestionRequest = {
        ...mockRequest,
        aiContent: {
          ...mockAIContent,
          questions: [
            {
              ...mockAIContent.questions[0]!,
              options: [
                { text: "Option 1", isCorrect: true },
                { text: "Option 2", isCorrect: true }, // Deux bonnes réponses - invalide
                { text: "Option 3", isCorrect: false }
                // Seulement 3 options - invalide
              ]
            }
          ]
        }
      };

      const result = await service.createQuizFromAIContent(invalidQuestionRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Doit avoir exactement 4 options'),
          expect.stringContaining('Doit avoir exactement une bonne réponse')
        ])
      );
    });

    it('devrait générer des tags automatiques', async () => {
      mockPayload.create
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 123 });

      mockPayload.findByID.mockResolvedValue({
        id: 123,
        questions: [1]
      });

      const singleQuestionRequest = {
        ...mockRequest,
        aiContent: {
          ...mockAIContent,
          questions: [mockAIContent.questions[0]!]
        }
      };

      await service.createQuizFromAIContent(singleQuestionRequest);

      const questionCall = mockPayload.create.mock.calls[0];
      expect(questionCall).toBeDefined();
      expect(questionCall![0]).toEqual({
        collection: 'questions',
        data: expect.objectContaining({
          tags: expect.arrayContaining([
            { tag: 'pass' },
            { tag: 'ai-generated' }
          ])
        })
      });
    });

    it('devrait estimer correctement le temps de réponse', async () => {
      mockPayload.create
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 123 });

      mockPayload.findByID.mockResolvedValue({
        id: 123,
        questions: [1]
      });

      const singleQuestionRequest = {
        ...mockRequest,
        aiContent: {
          ...mockAIContent,
          questions: [mockAIContent.questions[0]!]
        }
      };

      await service.createQuizFromAIContent(singleQuestionRequest);

      const questionCall = mockPayload.create.mock.calls[0];
      expect(questionCall).toBeDefined();
      if (questionCall && questionCall[1] && questionCall[1].data) {
        const questionData = questionCall[1].data;
        expect(questionData.adaptiveMetadata.averageTimeSeconds).toBeGreaterThan(30);
        expect(questionData.adaptiveMetadata.averageTimeSeconds).toBeLessThan(120);
      }
    });
  });

  describe('createTestQuiz', () => {
    it('devrait créer un quiz de test', async () => {
      mockPayload.create
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 123 });

      mockPayload.findByID.mockResolvedValue({
        id: 123,
        questions: [1, 2]
      });

      const result = await service.createTestQuiz('cat_test', 'user_test');

      expect(result.success).toBe(true);
      expect(result.quizId).toBe('123');
      expect(result.questionsCreated).toBe(2);

      // Vérifier que le quiz de test a les bonnes propriétés
      const quizCall = mockPayload.create.mock.calls[2];
      expect(quizCall).toBeDefined();
      if (quizCall && quizCall[1] && quizCall[1].data) {
        const quizData = quizCall[1].data;
        expect(quizData.title).toContain('Quiz de Test');
        expect(quizData.published).toBe(false);
      }
    });
  });

  describe('Validation des données', () => {
    it('devrait détecter les options dupliquées', async () => {
      const duplicateOptionsRequest = {
        aiContent: {
          quiz: {
            title: "Quiz Test - Anatomie Cardiaque",
            description: "Quiz de test sur l'anatomie du cœur",
            estimatedDuration: 15
          },
          questions: [
            {
              questionText: "Test question",
              options: [
                { text: "Option identique", isCorrect: false },
                { text: "Option identique", isCorrect: true }, // Doublon
                { text: "Option différente", isCorrect: false },
                { text: "Autre option", isCorrect: false }
              ],
              explanation: "Explication de test pour la validation"
            }
          ]
        },
        categoryId: 'cat_123',
        categoryName: 'Cardiologie',
        studentLevel: 'PASS' as const,
        userId: 'user_123'
      };

      const result = await service.createQuizFromAIContent(duplicateOptionsRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Options dupliquées détectées')
        ])
      );
    });

    it('devrait valider la longueur des explications', async () => {
      const shortExplanationRequest = {
        aiContent: {
          quiz: {
            title: "Quiz Test - Anatomie Cardiaque",
            description: "Quiz de test sur l'anatomie du cœur",
            estimatedDuration: 15
          },
          questions: [
            {
              questionText: "Test question avec explication courte",
              options: [
                { text: "Option A", isCorrect: true },
                { text: "Option B", isCorrect: false },
                { text: "Option C", isCorrect: false },
                { text: "Option D", isCorrect: false }
              ],
              explanation: "Court" // Moins de 20 caractères
            }
          ]
        },
        categoryId: 'cat_123',
        categoryName: 'Cardiologie',
        studentLevel: 'PASS' as const,
        userId: 'user_123'
      };

      const result = await service.createQuizFromAIContent(shortExplanationRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Explication trop courte')
        ])
      );
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de base de données', async () => {
      // Simuler une erreur DB lors de la création du quiz, après création des questions
      mockPayload.create
        .mockResolvedValueOnce({ id: 1 }) // question 1
        .mockResolvedValueOnce({ id: 2 }) // question 2
        .mockRejectedValueOnce(new Error('Erreur DB')); // création du quiz

      const testRequest = {
        aiContent: mockAIContent,
        categoryId: 'cat_123',
        categoryName: 'Cardiologie',
        studentLevel: 'PASS' as const,
        userId: 'user_123'
      };

      const result = await service.createQuizFromAIContent(testRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Erreur DB')
        ])
      );
    });

    it('devrait calculer correctement le temps de traitement', async () => {
      // Mock avec délai pour simuler le traitement
      mockPayload.create.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: 'test' }), 10))
      );

      const result = await service.createQuizFromAIContent({
        ...mockRequest,
        aiContent: {
          ...mockAIContent,
          questions: [mockAIContent.questions[0]!] // Une question pour avoir un traitement réel
        }
      });

      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeLessThan(1000); // Moins d'une seconde
    });
  });
});