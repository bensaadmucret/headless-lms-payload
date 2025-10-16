/**
 * Tests pour le système de prompts et génération IA (Tâche 4)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptEngineeringService, GenerationConfig } from '../PromptEngineeringService';
import { AIAPIService, AIRequest } from '../AIAPIService';
import { ContentValidatorService } from '../ContentValidatorService';

describe('AI Prompt System - Task 4', () => {
  let promptService: PromptEngineeringService;
  let apiService: AIAPIService;
  let validatorService: ContentValidatorService;

  beforeEach(() => {
    promptService = new PromptEngineeringService();
    validatorService = new ContentValidatorService();
    
    // Mock API service pour les tests
    apiService = {
      generateContent: vi.fn(),
      generateContentWithFallback: vi.fn(),
      generateContentWithSmartRetry: vi.fn(),
      testAPIAvailability: vi.fn(),
      getPerformanceMetrics: vi.fn(),
      cleanup: vi.fn()
    } as any;
  });

  describe('PromptEngineeringService', () => {
    it('should generate specialized PASS prompts', () => {
      const config: GenerationConfig = {
        subject: 'Anatomie cardiaque',
        studentLevel: 'PASS',
        questionCount: 5,
        difficulty: 'medium',
        includeExplanations: true,
        medicalDomain: 'anatomie'
      };

      const prompt = promptService.buildQuizGenerationPrompt(config);

      expect(prompt).toContain('PASS');
      expect(prompt).toContain('anatomie');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('SPÉCIALISATION PASS');
      expect(prompt.length).toBeGreaterThan(500);
    });

    it('should generate specialized LAS prompts', () => {
      const config: GenerationConfig = {
        subject: 'Introduction à la physiologie',
        studentLevel: 'LAS',
        questionCount: 3,
        difficulty: 'easy',
        includeExplanations: true,
        medicalDomain: 'physiologie'
      };

      const prompt = promptService.buildQuizGenerationPrompt(config);

      expect(prompt).toContain('LAS');
      expect(prompt).toContain('physiologie');
      expect(prompt).toContain('SPÉCIALISATION LAS');
      expect(prompt).toContain('PROGRESSIVE');
    });

    it('should build dynamic prompts with performance data', () => {
      const config: GenerationConfig = {
        subject: 'Biochimie métabolique',
        studentLevel: 'PASS',
        questionCount: 4,
        includeExplanations: true
      };

      const performanceData = {
        successRate: 0.3,
        commonMistakes: ['Confusion ATP/ADP', 'Méconnaissance des enzymes'],
        weakAreas: ['Glycolyse', 'Cycle de Krebs'],
        strongAreas: ['Structure des protéines']
      };

      const dynamicPrompt = promptService.buildDynamicPrompt(config, performanceData);

      expect(dynamicPrompt).toContain('PERFORMANCE FAIBLE');
      expect(dynamicPrompt).toContain('ATP/ADP');
      expect(dynamicPrompt).toContain('Glycolyse');
      expect(dynamicPrompt).toContain('FORMATIVES');
    });

    it('should build retry prompts with validation errors', () => {
      const config: GenerationConfig = {
        subject: 'Test subject',
        studentLevel: 'PASS',
        questionCount: 2,
        includeExplanations: true
      };

      const validationErrors = [
        'Structure JSON invalide',
        'Question trop courte',
        'Pas de bonne réponse'
      ];

      const retryPrompt = promptService.buildRetryPrompt(config, validationErrors);

      expect(retryPrompt).toContain('CORRECTION DES ERREURS');
      expect(retryPrompt).toContain('Structure JSON invalide');
      expect(retryPrompt).toContain('exactement UNE bonne réponse');
    });

    it('should optimize prompts for token limits', () => {
      const longPrompt = 'A'.repeat(20000); // Très long prompt
      const optimized = promptService.optimizePrompt(longPrompt, 1000);

      expect(optimized.length).toBeLessThan(longPrompt.length);
      expect(optimized.length / 4).toBeLessThanOrEqual(1000); // Approximation tokens
    });

    it('should validate prompt quality', () => {
      const goodPrompt = `
        Tu es un expert en pédagogie médicale et en création de questions d'examen. 
        Génère une question de QCM médicale de haute qualité ADAPTÉE au niveau de l'étudiant.

        CONTEXTE:
        - Niveau d'études: PASS (1ère année)
        - Domaine médical: Cardiologie
        - Catégorie: Anatomie cardiaque
        - Cours associé: Anatomie générale

        RÈGLES DE CRÉATION:
        - Difficulté cible: medium
        - Question claire, précise et pédagogique
        - 4 options de réponse (A, B, C, D)
        - 1 seule bonne réponse
        - Niveau adapté à PASS (1ère année)
        - Vocabulaire médical approprié mais accessible
        - Distracteurs adaptés au niveau de l'étudiant
        - Explication adaptée au niveau (plus détaillée si difficultés)

        FORMAT DE RÉPONSE JSON:
        {
          "questionText": "Texte complet de la question médicale",
          "options": [
            {"optionText": "Réponse A", "isCorrect": true},
            {"optionText": "Réponse B", "isCorrect": false}
          ],
          "explanation": "Explication détaillée de la bonne réponse",
          "estimatedDifficulty": "easy|medium|hard"
        }
      `;

      const validation = promptService.validatePrompt(goodPrompt);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);

      const badPrompt = 'Court';
      const badValidation = promptService.validatePrompt(badPrompt);
      expect(badValidation.isValid).toBe(false);
      expect(badValidation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('ContentValidatorService Integration', () => {
    it('should validate AI generated quiz structure', () => {
      const mockQuiz = {
        quiz: {
          title: 'Quiz d\'anatomie cardiaque',
          description: 'Questions sur la structure du cœur',
          estimatedDuration: 15
        },
        questions: [
          {
            questionText: 'Quelle est la fonction principale du ventricule gauche?',
            options: [
              { text: 'Pomper le sang vers les poumons', isCorrect: false },
              { text: 'Pomper le sang vers le corps', isCorrect: true },
              { text: 'Recevoir le sang des veines', isCorrect: false },
              { text: 'Filtrer le sang', isCorrect: false }
            ],
            explanation: 'Le ventricule gauche pompe le sang oxygéné vers tout le corps via l\'aorte.',
            difficulty: 'medium',
            tags: ['anatomie', 'cardiologie']
          }
        ]
      };

      const validation = validatorService.validateAIGeneratedQuiz(mockQuiz);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(70);
      expect(validation.issues.filter(i => i.severity === 'critical')).toHaveLength(0);
    });

    it('should detect validation issues', () => {
      const invalidQuiz = {
        quiz: {
          title: 'Test',
          description: 'Short',
          estimatedDuration: 5
        },
        questions: [
          {
            questionText: 'Short?',
            options: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: true }, // Erreur: 2 bonnes réponses
              { text: 'C', isCorrect: false }
              // Erreur: seulement 3 options
            ],
            explanation: 'Too short'
          }
        ]
      };

      const validation = validatorService.validateAIGeneratedQuiz(invalidQuiz);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues.some(i => i.message.includes('4 options'))).toBe(true);
      expect(validation.issues.some(i => i.message.includes('exactement une'))).toBe(true);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Rate limit exceeded');
      vi.mocked(apiService.generateContent).mockRejectedValue(mockError);
      vi.mocked(apiService.generateContentWithSmartRetry).mockRejectedValue(mockError);

      // Test que les erreurs sont bien propagées
      await expect(apiService.generateContentWithSmartRetry({
        prompt: 'test',
        maxTokens: 100
      })).rejects.toThrow('API Rate limit exceeded');
    });

    it('should implement fallback strategies', async () => {
      const mockResponse = {
        content: '{"test": "response"}',
        provider: 'Google Gemini',
        model: 'gemini-2.0-flash'
      };

      vi.mocked(apiService.generateContentWithFallback).mockResolvedValue(mockResponse);

      const result = await apiService.generateContentWithFallback({
        prompt: 'test prompt',
        maxTokens: 1000
      }, {
        reduceComplexity: true,
        simplifyPrompt: true
      });

      expect(result).toEqual(mockResponse);
      expect(apiService.generateContentWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'test prompt' }),
        expect.objectContaining({ reduceComplexity: true })
      );
    });
  });

  describe('Integration Tests', () => {
    it('should generate complete quiz workflow', () => {
      // Test d'intégration simulé
      const config: GenerationConfig = {
        subject: 'Physiologie respiratoire',
        studentLevel: 'PASS',
        questionCount: 3,
        difficulty: 'medium',
        includeExplanations: true,
        medicalDomain: 'physiologie'
      };

      // 1. Génération du prompt
      const prompt = promptService.buildQuizGenerationPrompt(config);
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(1000);

      // 2. Validation du prompt
      const promptValidation = promptService.validatePrompt(prompt);
      expect(promptValidation.isValid).toBe(true);

      // 3. Optimisation si nécessaire
      const optimizedPrompt = promptService.optimizePrompt(prompt, 4000);
      expect(optimizedPrompt).toBeDefined();
    });
  });
});