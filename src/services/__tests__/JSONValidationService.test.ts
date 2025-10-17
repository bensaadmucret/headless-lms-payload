/**
 * Tests pour JSONValidationService
 * Vérifie la validation des schémas JSON et des règles métier
 * 
 * Tests couvrant:
 * - Validation avec données valides et invalides
 * - Détection des doublons et références manquantes
 * - Messages d'erreur et suggestions de correction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSONValidationService } from '../JSONValidationService';
import { QuestionImportData, FlashcardImportData, LearningPathImportData } from '../../types/jsonImport';

describe('JSONValidationService', () => {
  let service: JSONValidationService;

  beforeEach(() => {
    service = new JSONValidationService();
    // Mock payload pour éviter les appels à la base de données
    vi.mock('payload', () => ({
      default: {
        find: vi.fn().mockResolvedValue({ docs: [] })
      }
    }));
  });

  describe('validateImportData', () => {
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
      expect(result.summary.totalItems).toBe(1);
      expect(result.summary.validItems).toBe(1);
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
            // options manquantes
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
      expect(result.errors.some(e => e.message.includes('options') || e.message.includes('required'))).toBe(true);
    });

    it('should detect incorrect answer options', async () => {
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
              { text: 'Option B', isCorrect: true } // Erreur: deux bonnes réponses
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
      expect(result.errors.some(e => e.message.includes('Une seule option'))).toBe(true);
    });

    it('should validate flashcard import correctly', async () => {
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
      expect(result.summary.totalItems).toBe(1);
    });

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

      expect(result.warnings.some(w => w.message.includes('dupliquée'))).toBe(true);
    });

    it('should handle invalid import type', async () => {
      const result = await service.validateImportData({}, 'invalid-type' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Type d\'import non supporté'))).toBe(true);
    });

    it('should validate field formats correctly', async () => {
      const invalidData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec formats invalides',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'invalid-difficulty' as any, // Format invalide
            level: 'invalid-level' as any // Format invalide
          }
        ]
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Niveau de difficulté invalide'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('Niveau étudiant invalide'))).toBe(true);
    });

    it('should detect content quality issues', async () => {
      const poorQualityData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Court', // Très court
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Court', // Très court
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(poorQualityData, 'questions');

      expect(result.warnings.some(w => w.message.includes('Question très courte'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Explication très courte'))).toBe(true);
    });

    it('should validate flashcard content properly', async () => {
      const invalidFlashcardData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Test Deck',
          category: 'Test',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Test', // Contenu identique
            back: 'Test', // Contenu identique
            category: 'Test',
            difficulty: 'easy'
          }
        ]
      };

      const result = await service.validateImportData(invalidFlashcardData, 'flashcards');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('recto et le verso de la flashcard sont identiques'))).toBe(true);
    });
  });

  describe('Validation avec données valides et invalides', () => {
    it('should validate valid learning path data', async () => {
      const validLearningPath: LearningPathImportData = {
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

      const result = await service.validateImportData(validLearningPath, 'learning-path' as any);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalItems).toBe(1);
    });

    it('should reject data with invalid JSON structure', async () => {
      const invalidData = {
        // Missing required fields
        type: 'questions',
        questions: []
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('version') || e.message.includes('metadata'))).toBe(true);
    });

    it('should validate questions with various invalid formats', async () => {
      const invalidQuestionData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: '', // Texte vide
            options: [
              { text: 'Option A', isCorrect: true }
              // Pas assez d'options
            ],
            explanation: '', // Explication vide
            category: '', // Catégorie vide
            difficulty: 'invalid' as any, // Difficulté invalide
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(invalidQuestionData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field?.includes('questionText'))).toBe(true);
      expect(result.errors.some(e => e.field?.includes('options'))).toBe(true);
      expect(result.errors.some(e => e.field?.includes('explanation'))).toBe(true);
      expect(result.errors.some(e => e.field?.includes('category'))).toBe(true);
      expect(result.errors.some(e => e.field?.includes('difficulty'))).toBe(true);
    });

    it('should validate flashcards with missing required fields', async () => {
      const invalidFlashcardData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Test Deck'
          // Missing category
        },
        cards: [
          {
            front: 'Question',
            // Missing back, category, difficulty
          }
        ]
      };

      const result = await service.validateImportData(invalidFlashcardData, 'flashcards');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Détection des doublons', () => {
    it('should detect duplicate questions in same import', async () => {
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

      expect(result.warnings.some(w => w.message.includes('dupliquée'))).toBe(true);
      expect(result.summary.duplicates).toBe(1);
    });

    it('should detect duplicate flashcards', async () => {
      const dataWithDuplicates: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Test Deck',
          category: 'Test',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Question front',
            back: 'Réponse back',
            category: 'Test',
            difficulty: 'easy'
          },
          {
            front: 'Question front',
            back: 'Réponse back',
            category: 'Test',
            difficulty: 'easy'
          }
        ]
      };

      const result = await service.validateImportData(dataWithDuplicates, 'flashcards');

      expect(result.warnings.some(w => w.message.includes('dupliquée'))).toBe(true);
      expect(result.summary.duplicates).toBe(1);
    });

    it('should detect duplicate step IDs in learning paths', async () => {
      const dataWithDuplicateSteps: LearningPathImportData = {
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
              prerequisites: [],
              questions: [
                {
                  questionText: 'Question test ?',
                  options: [
                    { text: 'Option A', isCorrect: true },
                    { text: 'Option B', isCorrect: false }
                  ],
                  explanation: 'Explication test',
                  category: 'Test',
                  difficulty: 'easy',
                  level: 'PASS'
                }
              ]
            },
            {
              id: 'step-1', // ID dupliqué
              title: 'Deuxième étape',
              prerequisites: [],
              questions: [
                {
                  questionText: 'Autre question test ?',
                  options: [
                    { text: 'Option A', isCorrect: true },
                    { text: 'Option B', isCorrect: false }
                  ],
                  explanation: 'Autre explication test',
                  category: 'Test',
                  difficulty: 'easy',
                  level: 'PASS'
                }
              ]
            }
          ]
        }
      };

      const result = await service.validateImportData(dataWithDuplicateSteps, 'learning-path' as any);

      expect(result.warnings.some(w => w.message.includes('ID d\'étape dupliqué'))).toBe(true);
    });

    it('should not flag similar but different questions as duplicates', async () => {
      const dataWithSimilarQuestions: QuestionImportData = {
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
            questionText: 'Quelle est la fonction du ventricule droit ?', // Question différente
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

      const result = await service.validateImportData(dataWithSimilarQuestions, 'questions');

      expect(result.warnings.filter(w => w.message.includes('dupliquée'))).toHaveLength(0);
      expect(result.summary.duplicates).toBe(0);
    });
  });

  describe('Validation des références manquantes', () => {
    it('should detect missing category references', async () => {
      const dataWithMissingCategories: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec catégorie inexistante ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Catégorie Inexistante',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(dataWithMissingCategories, 'questions');

      expect(result.warnings.some(w => w.message.includes('n\'existe pas dans le système'))).toBe(true);
      expect(result.summary.missingCategories).toContain('Catégorie Inexistante');
    });

    it('should detect missing prerequisites in learning paths', async () => {
      const dataWithMissingPrereqs: LearningPathImportData = {
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
              prerequisites: ['step-inexistant'], // Prérequis inexistant
              questions: [
                {
                  questionText: 'Question test ?',
                  options: [
                    { text: 'Option A', isCorrect: true },
                    { text: 'Option B', isCorrect: false }
                  ],
                  explanation: 'Explication test',
                  category: 'Test',
                  difficulty: 'easy',
                  level: 'PASS'
                }
              ]
            }
          ]
        }
      };

      const result = await service.validateImportData(dataWithMissingPrereqs, 'learning-path' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('prérequis "step-inexistant" introuvable'))).toBe(true);
    });

    it('should detect circular dependencies in learning paths', async () => {
      const dataWithCircularDeps: LearningPathImportData = {
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
              prerequisites: ['step-2'], // Dépend de step-2
              questions: [
                {
                  questionText: 'Question 1 ?',
                  options: [
                    { text: 'Option A', isCorrect: true },
                    { text: 'Option B', isCorrect: false }
                  ],
                  explanation: 'Explication 1',
                  category: 'Test',
                  difficulty: 'easy',
                  level: 'PASS'
                }
              ]
            },
            {
              id: 'step-2',
              title: 'Deuxième étape',
              prerequisites: ['step-1'], // Dépend de step-1 -> Circulaire !
              questions: [
                {
                  questionText: 'Question 2 ?',
                  options: [
                    { text: 'Option A', isCorrect: true },
                    { text: 'Option B', isCorrect: false }
                  ],
                  explanation: 'Explication 2',
                  category: 'Test',
                  difficulty: 'easy',
                  level: 'PASS'
                }
              ]
            }
          ]
        }
      };

      const result = await service.validateImportData(dataWithCircularDeps, 'learning-path' as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Dépendance circulaire détectée'))).toBe(true);
    });
  });

  describe('Messages d\'erreur et suggestions de correction', () => {
    it('should provide helpful error messages for schema validation', async () => {
      const invalidData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test'
          // Missing required level
        },
        questions: [
          {
            questionText: 'Test', // Trop court
            options: [
              { text: 'Option A', isCorrect: true }
              // Pas assez d'options
            ],
            explanation: 'Test', // Trop court
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(invalidData, 'questions');

      expect(result.isValid).toBe(false);

      // Vérifier que les messages d'erreur sont informatifs
      result.errors.forEach(error => {
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(10);
        if (error.suggestion) {
          expect(error.suggestion.length).toBeGreaterThan(10);
        }
      });

      // Vérifier des messages spécifiques
      expect(result.errors.some(e => e.message.includes('Texte trop court'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('Pas assez d\'éléments'))).toBe(true);
    });

    it('should provide suggestions for common validation errors', async () => {
      const dataWithCommonErrors: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question sans point d\'interrogation',
            options: [
              { text: 'Option A', isCorrect: false },
              { text: 'Option B', isCorrect: false }
              // Aucune option correcte
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(dataWithCommonErrors, 'questions');

      expect(result.isValid).toBe(false);

      // Vérifier les suggestions spécifiques
      const noCorrectAnswerError = result.errors.find(e => e.message.includes('Au moins une option'));
      if (noCorrectAnswerError?.suggestion) {
        expect(noCorrectAnswerError.suggestion).toContain('isCorrect: true');
      }

      const noQuestionMarkWarning = result.warnings.find(w => w.message.includes('point d\'interrogation'));
      if (noQuestionMarkWarning?.suggestion) {
        expect(noQuestionMarkWarning.suggestion).toContain('interrogative');
      }
    });

    it('should provide contextual suggestions for different error types', async () => {
      const dataWithVariousErrors: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec tags dupliqués ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS',
            tags: ['tag1', 'tag1', 'tag2'] // Tags dupliqués
          }
        ]
      };

      const result = await service.validateImportData(dataWithVariousErrors, 'questions');

      const duplicateTagsWarning = result.warnings.find(w => w.message.includes('Tags dupliqués'));
      expect(duplicateTagsWarning?.suggestion).toContain('Supprimez les tags en double');
    });

    it('should handle system errors gracefully with helpful messages', async () => {
      // Simuler une erreur système en passant des données corrompues
      const corruptedData = null;

      const result = await service.validateImportData(corruptedData as any, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      if (result.errors[0]) {
        expect(result.errors[0].type).toBe('system');
        expect(result.errors[0].severity).toBe('critical');
        expect(result.errors[0].message).toContain('Erreur lors de la validation');
        expect(result.errors[0].suggestion).toContain('Vérifiez le format du fichier JSON');
      }
    });

    it('should provide quality warnings with actionable suggestions', async () => {
      const poorQualityData: QuestionImportData = {
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
              { text: 'Pomper le sang vers l\'aorte', isCorrect: true },
              { text: 'Pomper le sang vers l\'aorte', isCorrect: false }, // Option identique
              { text: 'Recevoir le sang', isCorrect: false }
            ],
            explanation: 'Explication très courte',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(poorQualityData, 'questions');

      const similarOptionsWarning = result.warnings.find(w => w.message.includes('Options similaires'));
      expect(similarOptionsWarning?.suggestion).toContain('Assurez-vous que chaque option est distincte');

      const shortExplanationWarning = result.warnings.find(w => w.message.includes('Explication très courte'));
      if (shortExplanationWarning) {
        expect(shortExplanationWarning.suggestion).toContain('explication détaillée améliore l\'apprentissage');
      }
    });
  });

  describe('Tests de validation avancés', () => {
    it('should validate questions with edge case content', async () => {
      const edgeCaseData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Edge Cases',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec caractères spéciaux: àéèùç, œ, ñ ?',
            options: [
              { text: 'Réponse avec accents: médecine générale', isCorrect: true },
              { text: 'Option avec symboles: ≥ 50%', isCorrect: false },
              { text: 'Option avec chiffres: 2.5 mg/kg', isCorrect: false }
            ],
            explanation: 'Explication avec termes médicaux: tachycardie, bradycardie, arythmie.',
            category: 'Cardiologie',
            difficulty: 'medium',
            level: 'PASS',
            tags: ['médecine', 'cœur', 'rythme-cardiaque']
          }
        ]
      };

      const result = await service.validateImportData(edgeCaseData, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalItems).toBe(1);
      expect(result.summary.validItems).toBe(1);
    });

    it('should handle very long content appropriately', async () => {
      const longContentData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Long Content',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'A'.repeat(600), // Très long
            options: [
              { text: 'B'.repeat(250), isCorrect: true }, // Option très longue
              { text: 'Option normale', isCorrect: false }
            ],
            explanation: 'C'.repeat(1100), // Explication très longue
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS',
            tags: ['D'.repeat(60)] // Tag très long
          }
        ]
      };

      const result = await service.validateImportData(longContentData, 'questions');

      expect(result.isValid).toBe(true); // Doit rester valide
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('très longue'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('Tag très long'))).toBe(true);
    });

    it('should validate questions with minimal valid content', async () => {
      const minimalData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Minimal',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question ?', // Longueur minimale
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: false }
            ],
            explanation: 'Explication.', // Longueur minimale
            category: 'T',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(minimalData, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('très courte'))).toBe(true);
    });

    it('should detect questions with obvious correct answers', async () => {
      const obviousAnswerData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Obvious',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Quelle est la bonne réponse ?',
            options: [
              { text: 'La bonne réponse correcte', isCorrect: true }, // Évident
              { text: 'Mauvaise réponse', isCorrect: false },
              { text: 'Réponse incorrecte', isCorrect: false }
            ],
            explanation: 'Explication de la question.',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(obviousAnswerData, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.message.includes('trop évidente'))).toBe(true);
    });

    it('should validate flashcards with media references', async () => {
      const flashcardWithMedia: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Deck avec médias',
          category: 'Anatomie',
          level: 'PASS'
        },
        cards: [
          {
            front: 'Identifiez cette structure anatomique',
            back: 'Ventricule gauche du cœur',
            category: 'Anatomie',
            difficulty: 'medium',
            imageUrl: 'https://example.com/heart-diagram.jpg'
          },
          {
            front: 'Structure avec URL invalide',
            back: 'Réponse test',
            category: 'Anatomie',
            difficulty: 'easy',
            imageUrl: 'url-invalide-pas-http'
          }
        ]
      };

      const result = await service.validateImportData(flashcardWithMedia, 'flashcards');

      // Le résultat peut être valide ou invalide selon la validation de l'URL
      // Vérifier qu'il y a au moins un avertissement pour l'URL invalide
      expect(result.warnings.some(w => w.message.includes('URL d\'image invalide'))).toBe(true);
    });

    it('should handle complex learning paths with multiple validation issues', async () => {
      const complexLearningPath: LearningPathImportData = {
        version: '1.0',
        type: 'learning-path',
        metadata: {
          title: 'Parcours complexe avec problèmes',
          estimatedDuration: 60, // Durée incohérente avec les étapes
          level: 'PASS'
        },
        path: {
          steps: [
            {
              id: 'step-1',
              title: 'Étape sans prérequis',
              prerequisites: [],
              estimatedTime: 30,
              questions: [] // Pas de questions
            },
            {
              id: 'step-2',
              title: 'Étape avec beaucoup de questions',
              prerequisites: ['step-1'],
              estimatedTime: 120, // Durée très longue
              questions: Array(25).fill(null).map((_, i) => ({ // 25 questions
                questionText: `Question ${i + 1} de l'étape 2 ?`,
                options: [
                  { text: 'Option A', isCorrect: true },
                  { text: 'Option B', isCorrect: false }
                ],
                explanation: `Explication ${i + 1}`,
                category: 'Test',
                difficulty: 'easy',
                level: 'PASS'
              }))
            }
          ]
        }
      };

      const result = await service.validateImportData(complexLearningPath, 'learning-path' as any);

      // Le résultat peut être invalide à cause des étapes sans questions
      // Vérifier qu'il y a des avertissements appropriés
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('sans questions'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('beaucoup de questions'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('durées estimées'))).toBe(true);
    });
  });

  describe('Tests de robustesse et cas limites', () => {
    it('should handle malformed JSON gracefully', async () => {
      const malformedData = {
        version: '1.0',
        type: 'questions',
        metadata: null, // Métadonnées nulles
        questions: [
          {
            questionText: null, // Champ null
            options: 'not-an-array', // Type incorrect
            explanation: undefined, // Champ undefined
            category: '',
            difficulty: 'invalid-difficulty',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(malformedData as any, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.type === 'validation')).toBe(true);
    });

    it('should validate empty arrays and objects', async () => {
      const emptyData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Empty',
          level: 'PASS'
        },
        questions: [] // Tableau vide
      };

      const result = await service.validateImportData(emptyData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e =>
        e.message.includes('minItems') ||
        e.message.includes('au moins') ||
        e.message.includes('Pas assez d\'éléments')
      )).toBe(true);
    });

    it('should handle questions with no correct answers', async () => {
      const noCorrectAnswerData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test No Correct',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question sans bonne réponse ?',
            options: [
              { text: 'Option A', isCorrect: false },
              { text: 'Option B', isCorrect: false },
              { text: 'Option C', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(noCorrectAnswerData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Au moins une option'))).toBe(true);
    });

    it('should handle questions with multiple correct answers', async () => {
      const multipleCorrectData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Multiple Correct',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec plusieurs bonnes réponses ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: true }, // Deuxième bonne réponse
              { text: 'Option C', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(multipleCorrectData, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Une seule option'))).toBe(true);
    });

    it('should validate unicode and special characters properly', async () => {
      const unicodeData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Unicode',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec émojis 🫀 et symboles ∞ ≤ ≥ ?',
            options: [
              { text: 'Réponse avec α, β, γ', isCorrect: true },
              { text: 'Option avec ℃, ℉, °', isCorrect: false },
              { text: 'Texte avec 中文 et العربية', isCorrect: false }
            ],
            explanation: 'Explication avec caractères spéciaux: µg/mL, ≈ 2.5×10⁻³',
            category: 'Unicode Test',
            difficulty: 'medium',
            level: 'PASS',
            tags: ['unicode', 'spéciaux', '测试']
          }
        ]
      };

      const result = await service.validateImportData(unicodeData, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.summary.totalItems).toBe(1);
      expect(result.summary.validItems).toBe(1);
    });

    it('should handle concurrent validation calls', async () => {
      const testData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Concurrent Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question pour test concurrent ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test concurrent',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      // Lancer plusieurs validations en parallèle
      const promises = Array(5).fill(null).map(() =>
        service.validateImportData(testData, 'questions')
      );

      const results = await Promise.all(promises);

      // Tous les résultats doivent être identiques
      results.forEach(result => {
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.summary.totalItems).toBe(1);
      });
    });
  });

  describe('Tests de performance et limites', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Large Dataset Test',
          level: 'PASS'
        },
        questions: Array(100).fill(null).map((_, i) => ({
          questionText: `Question ${i + 1} pour test de performance ?`,
          options: [
            { text: `Option A ${i + 1}`, isCorrect: true },
            { text: `Option B ${i + 1}`, isCorrect: false },
            { text: `Option C ${i + 1}`, isCorrect: false },
            { text: `Option D ${i + 1}`, isCorrect: false }
          ],
          explanation: `Explication détaillée pour la question ${i + 1}`,
          category: `Catégorie ${(i % 5) + 1}`,
          difficulty: ['easy', 'medium', 'hard'][i % 3] as 'easy' | 'medium' | 'hard',
          level: 'PASS' as const,
          tags: [`tag${i}`, `performance`, `test`]
        }))
      };

      const startTime = Date.now();
      const result = await service.validateImportData(largeDataset, 'questions');
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(result.summary.totalItems).toBe(100);
      expect(result.summary.validItems).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Moins de 5 secondes
    });

    it('should detect duplicates in large datasets', async () => {
      const dataWithManyDuplicates: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Duplicate Test',
          level: 'PASS'
        },
        questions: [
          // Question originale
          {
            questionText: 'Question dupliquée ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          },
          // 5 duplicatas
          ...Array(5).fill(null).map(() => ({
            questionText: 'Question dupliquée ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication',
            category: 'Test',
            difficulty: 'easy' as const,
            level: 'PASS' as const
          }))
        ]
      };

      const result = await service.validateImportData(dataWithManyDuplicates, 'questions');

      expect(result.summary.duplicates).toBe(5);
      expect(result.warnings.filter(w => w.message.includes('dupliquée'))).toHaveLength(5);
    });

    it('should validate maximum allowed items', async () => {
      const maxItemsData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Max Items Test',
          level: 'PASS'
        },
        questions: Array(1000).fill(null).map((_, i) => ({ // Limite maximale
          questionText: `Question ${i + 1} ?`,
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false }
          ],
          explanation: 'Explication',
          category: 'Test',
          difficulty: 'easy',
          level: 'PASS'
        }))
      };

      const result = await service.validateImportData(maxItemsData, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.summary.totalItems).toBe(1000);
    });

    it('should reject datasets exceeding maximum items', async () => {
      const tooManyItemsData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Too Many Items Test',
          level: 'PASS'
        },
        questions: Array(1001).fill(null).map((_, i) => ({ // Dépasse la limite
          questionText: `Question ${i + 1} ?`,
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false }
          ],
          explanation: 'Explication',
          category: 'Test',
          difficulty: 'easy',
          level: 'PASS'
        }))
      };

      const result = await service.validateImportData(tooManyItemsData as any, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('maxItems') || e.message.includes('maximum'))).toBe(true);
    });
  });

  describe('Tests de suggestions et messages d\'erreur', () => {
    it('should provide specific suggestions for each error type', async () => {
      const errorProneData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Error Suggestions Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question sans point d\'interrogation',
            options: [
              { text: 'Option A', isCorrect: false },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Courte',
            category: '',
            difficulty: 'invalid' as any,
            level: 'PASS',
            tags: ['tag1', 'tag1', ''] // Tags dupliqués et vides
          }
        ]
      };

      const result = await service.validateImportData(errorProneData, 'questions');

      expect(result.isValid).toBe(false);

      // Vérifier que chaque erreur a une suggestion
      result.errors.forEach(error => {
        expect(error.suggestion).toBeTruthy();
        expect(error.suggestion!.length).toBeGreaterThan(10);
      });

      result.warnings.forEach(warning => {
        if (warning.suggestion) {
          expect(warning.suggestion.length).toBeGreaterThan(10);
        }
      });

      // Vérifier des suggestions spécifiques
      expect(result.errors.some(e =>
        e.field?.includes('difficulty') &&
        e.suggestion?.includes('easy, medium, hard')
      )).toBe(true);

      expect(result.warnings.some(w =>
        w.message.includes('point d\'interrogation') &&
        w.suggestion?.includes('interrogative')
      )).toBe(true);
    });

    it('should provide contextual error messages based on field type', async () => {
      const contextualErrorData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Contextual Errors',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 123, // Type incorrect
            options: 'not-array', // Type incorrect
            explanation: true, // Type incorrect
            category: null, // Valeur null
            difficulty: 'facile', // Valeur non autorisée
            level: 'L1' // Valeur non autorisée
          }
        ]
      };

      const result = await service.validateImportData(contextualErrorData as any, 'questions');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Vérifier qu'il y a des erreurs système ou de validation
      const hasSystemOrValidationErrors = result.errors.some(e =>
        e.type === 'system' ||
        e.type === 'validation' ||
        e.message.includes('Erreur lors de la validation') ||
        e.message.includes('Type incorrect') ||
        e.message.includes('type') ||
        e.message.includes('attendu') ||
        e.message.includes('Valeur non autorisée') ||
        e.message.includes('enum') ||
        e.message.includes('allowedValues')
      );
      expect(hasSystemOrValidationErrors).toBe(true);
    });

    it('should provide helpful suggestions for common mistakes', async () => {
      const commonMistakesData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Common Mistakes',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec options identiques ?',
            options: [
              { text: 'Même réponse', isCorrect: true },
              { text: 'Même réponse', isCorrect: false }, // Identique
              { text: 'Autre réponse', isCorrect: false }
            ],
            explanation: 'Explication qui ne correspond pas du tout à la question posée sur un sujet complètement différent',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const result = await service.validateImportData(commonMistakesData, 'questions');

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);

      const similarOptionsWarning = result.warnings.find(w => w.message.includes('Options similaires'));
      expect(similarOptionsWarning?.suggestion).toContain('distincte');

      const incoherentExplanationWarning = result.warnings.find(w => w.message.includes('peu liée'));
      expect(incoherentExplanationWarning?.suggestion).toContain('répond directement');
    });
  });
});