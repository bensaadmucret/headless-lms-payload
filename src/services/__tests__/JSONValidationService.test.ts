/**
 * Tests pour JSONValidationService
 * Vérifie la validation des schémas JSON et des règles métier
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSONValidationService } from '../JSONValidationService';
import { QuestionImportData, FlashcardImportData, LearningPathImportData } from '../../types/jsonImport';

describe('JSONValidationService', () => {
  let service: JSONValidationService;

  beforeEach(() => {
    service = new JSONValidationService();
  });

  describe('Validation de base des questions', () => {
    it('should validate a correct question import', async () => {
      const validData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS',
          description: 'Test questions'
        },
        questions: [
          {
            questionText: 'Quelle est la fonction du ventricule gauche ?',
            options: [
              { text: 'Pomper le sang', isCorrect: true },
              { text: 'Recevoir le sang', isCorrect: false }
            ],
            explanation: 'Le ventricule gauche pompe le sang oxygéné vers l\'aorte.',
            category: 'Cardiologie',
            difficulty: 'medium',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(validData, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary?.totalItems).toBe(1);
      expect(result.summary?.validItems).toBe(1);
    });

    it('should detect missing required fields', async () => {
      const invalidData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test'
        },
        questions: [
          {
            questionText: 'Question sans options',
            explanation: 'Explication',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('options') || e.message.includes('requis'))).toBe(true);
    });

    it('should detect multiple correct answers', async () => {
      const invalidData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec plusieurs bonnes réponses',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: true }
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Plusieurs bonnes réponses'))).toBe(true);
    });

    it('should detect no correct answer', async () => {
      const invalidData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question sans bonne réponse',
            options: [
              { text: 'Option A', isCorrect: false },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Aucune bonne réponse'))).toBe(true);
    });

    it('should detect invalid difficulty level', async () => {
      const invalidData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec difficulté invalide',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'invalid' as any,
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Niveau de difficulté invalide'))).toBe(true);
    });

    it('should detect invalid student level', async () => {
      const invalidData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec niveau invalide',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'easy',
            level: 'invalid' as any
          }
        ]
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Niveau d\'études invalide'))).toBe(true);
    });

    it('should warn about similar options', async () => {
      const dataWithSimilarOptions: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec options similaires ?',
            options: [
              { text: 'Même réponse', isCorrect: true },
              { text: 'Même réponse', isCorrect: false },
              { text: 'Autre réponse', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(dataWithSimilarOptions, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Options similaires'))).toBe(true);
    });
  });

  describe('Validation des flashcards', () => {
    it('should validate correct flashcard import', async () => {
      const validData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Test Deck',
          category: 'Cardiologie',
          level: 'PASS',
          description: 'Test flashcards'
        },
        cards: [
          {
            front: 'Question front',
            back: 'Réponse back',
            category: 'Cardiologie',
            difficulty: 'easy'
          }
        ]
      };

      const result = await service.validateImportData(validData, 'flashcards');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary?.totalItems).toBe(1);
    });

    it('should detect missing front or back', async () => {
      const invalidData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Test Deck',
          category: 'Test',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Question'
          }
        ]
      };

      const result = await service.validateImportData(invalidData, 'flashcards');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Verso'))).toBe(true);
    });
  });

  describe('Validation des parcours d\'apprentissage', () => {
    it('should validate correct learning path', async () => {
      const validData: LearningPathImportData = {
        version: '1.0',
        type: 'learning-path',
        metadata: {
          title: 'Cardiologie PASS',
          estimatedDuration: 120,
          level: 'PASS'
        },
        path: {
          steps: [
            {
              id: 'step-1',
              title: 'Anatomie du cœur',
              prerequisites: [],
              questions: [
                {
                  questionText: 'Quelle est la fonction du ventricule gauche ?',
                  options: [
                    { text: 'Pomper le sang', isCorrect: true },
                    { text: 'Recevoir le sang', isCorrect: false }
                  ],
                  explanation: 'Le ventricule gauche pompe le sang oxygéné.',
                  category: 'Cardiologie',
                  difficulty: 'medium',
                  level: 'PASS'
                }
              ]
            }
          ]
        }
      };

      const result = await service.validateImportData(validData, 'learning-paths');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing step ID', async () => {
      const invalidData: LearningPathImportData = {
        version: '1.0',
        type: 'learning-path',
        metadata: {
          title: 'Test Path',
          estimatedDuration: 60,
          level: 'PASS'
        },
        path: {
          steps: [
            {
              id: '',
              title: 'Étape sans ID',
              prerequisites: [],
              questions: []
            } as any
          ]
        }
      };

      const result = await service.validateImportData(invalidData, 'learning-paths');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('ID'))).toBe(true);
    });

    it('should detect missing prerequisite', async () => {
      const invalidData: LearningPathImportData = {
        version: '1.0',
        type: 'learning-path',
        metadata: {
          title: 'Test Path',
          estimatedDuration: 60,
          level: 'PASS'
        },
        path: {
          steps: [
            {
              id: 'step-1',
              title: 'Première étape',
              prerequisites: ['step-inexistant'],
              questions: []
            }
          ]
        }
      };

      const result = await service.validateImportData(invalidData, 'learning-paths');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Prérequis'))).toBe(true);
    });
  });

  describe('Détection des doublons', () => {
    it('should detect duplicate questions', async () => {
      const dataWithDuplicates: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question identique',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          },
          {
            questionText: 'Question identique',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(dataWithDuplicates, 'questions');

      expect(result.warnings.some(w => w.message.includes('doublon'))).toBe(true);
      expect(result.summary?.duplicates).toBe(1);
    });

    it('should not flag different questions as duplicates', async () => {
      const dataWithDifferentQuestions: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Quelle est la fonction du ventricule gauche ?',
            options: [
              { text: 'Pomper le sang', isCorrect: true },
              { text: 'Recevoir le sang', isCorrect: false }
            ],
            explanation: 'Explication 1',
            category: 'Cardiologie',
            difficulty: 'easy',
            level: 'PASS'
          },
          {
            questionText: 'Quelle est la fonction du ventricule droit ?',
            options: [
              { text: 'Pomper le sang', isCorrect: true },
              { text: 'Recevoir le sang', isCorrect: false }
            ],
            explanation: 'Explication 2',
            category: 'Cardiologie',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(dataWithDifferentQuestions, 'questions');

      expect(result.warnings.filter(w => w.message.includes('doublon'))).toHaveLength(0);
      expect(result.summary?.duplicates).toBe(0);
    });
  });

  describe('Validation de structure', () => {
    it('should detect missing version', async () => {
      const invalidData = {
        type: 'questions',
        metadata: {
          source: 'Test'
        },
        questions: []
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.warnings.some(w => w.message.includes('version'))).toBe(true);
    });

    it('should detect missing type', async () => {
      const invalidData = {
        version: '1.0',
        metadata: {
          source: 'Test'
        },
        questions: []
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('type'))).toBe(true);
    });

    it('should handle invalid import type', async () => {
      const result = await service.validateImportData({}, 'invalid-type' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Type d\'import non supporté'))).toBe(true);
    });

    it('should detect empty questions array', async () => {
      const invalidData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: []
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Au moins une question'))).toBe(true);
    });
  });

  describe('Gestion des erreurs', () => {
    it('should handle malformed JSON gracefully', async () => {
      const result = await service.validateImportData(null as any, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate with missing explanation (warning only)', async () => {
      const dataWithoutExplanation: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question sans explication ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: '',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(dataWithoutExplanation, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Explication manquante'))).toBe(true);
    });
  });
});
