import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIQuizGenerationService, GeneratedQuestion } from '../AIQuizGenerationService';
import { ContentValidatorService } from '../ContentValidatorService';

// Mock de l'API Gemini
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            questionText: "Quelle est la fonction principale du cœur ?",
            options: [
              { optionText: "Réponse A: Pomper le sang", isCorrect: true },
              { optionText: "Réponse B: Respirer", isCorrect: false },
              { optionText: "Réponse C: Digérer", isCorrect: false },
              { optionText: "Réponse D: Penser", isCorrect: false }
            ],
            explanation: "Le cœur pompe le sang dans tout l'organisme.",
            estimatedDifficulty: "easy"
          })
        }
      })
    })
  }))
}));

describe('AIQuizGenerationService', () => {
  let service: AIQuizGenerationService;

  beforeEach(() => {
    // Mock de la variable d'environnement
    process.env.GEMINI_API_KEY = 'test-key';
    service = new AIQuizGenerationService();
  });

  describe('validateGeneratedQuestion', () => {
    it('should validate a correct question', async () => {
      // Utiliser le nouveau format de validation avec ContentValidatorService
      const quizContent = {
        quiz: {
          title: "Quiz de Cardiologie",
          description: "Test sur la fonction cardiaque pour étudiants en médecine",
          estimatedDuration: 10
        },
        questions: [
          {
            questionText: "Quelle est la fonction principale du cœur dans le système cardiovasculaire ?",
            options: [
              { text: "Pomper le sang dans tout l'organisme", isCorrect: true },
              { text: "Respirer et oxygéner le sang", isCorrect: false },
              { text: "Digérer les nutriments", isCorrect: false },
              { text: "Filtrer les toxines", isCorrect: false }
            ],
            explanation: "Le cœur a pour fonction principale de pomper le sang dans tout l'organisme pour assurer la circulation sanguine et l'apport d'oxygène et de nutriments aux tissus."
          }
        ]
      };

      const validator = new ContentValidatorService();
      const validation = await validator.validateAIGeneratedQuizEnhanced(quizContent, 'PASS');

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(70);
      expect(validation.issues.filter(i => i.severity === 'critical')).toHaveLength(0);
    });

    it('should detect invalid question with no correct answer', async () => {
      const quizContent = {
        quiz: {
          title: "Quiz Test Invalide",
          description: "Test avec question sans bonne réponse",
          estimatedDuration: 5
        },
        questions: [
          {
            questionText: "Question de test sans bonne réponse correcte ?",
            options: [
              { text: "Option A incorrecte", isCorrect: false },
              { text: "Option B incorrecte", isCorrect: false },
              { text: "Option C incorrecte", isCorrect: false },
              { text: "Option D incorrecte", isCorrect: false }
            ],
            explanation: "Explication de test suffisamment longue pour passer la validation de longueur minimale"
          }
        ]
      };

      const validator = new ContentValidatorService();
      const validation = await validator.validateAIGeneratedQuizEnhanced(quizContent);

      expect(validation.isValid).toBe(false);
      const criticalIssues = validation.issues.filter(i => i.severity === 'critical');
      expect(criticalIssues.length).toBeGreaterThan(0);
      expect(criticalIssues.some(issue => issue.message.includes('exactement une bonne réponse'))).toBe(true);
    });

    it('should detect question with invalid structure', async () => {
      // Test avec une structure complètement invalide
      const invalidContent = {
        quiz: {
          title: "T", // Trop court
          description: "D", // Trop court
          estimatedDuration: -1 // Invalide
        },
        questions: [] // Pas de questions
      };

      const validator = new ContentValidatorService();
      const validation = await validator.validateAIGeneratedQuizEnhanced(invalidContent);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Service instantiation', () => {
    it('should throw error without API key', () => {
      delete process.env.GEMINI_API_KEY;

      expect(() => new AIQuizGenerationService()).toThrow('GEMINI_API_KEY is not defined');
    });

    it('should instantiate with API key', () => {
      process.env.GEMINI_API_KEY = 'test-key';

      expect(() => new AIQuizGenerationService()).not.toThrow();
    });
  });
});
