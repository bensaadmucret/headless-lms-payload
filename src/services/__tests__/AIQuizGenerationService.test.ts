import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIQuizGenerationService, GeneratedQuestion } from '../AIQuizGenerationService';

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
    it('should validate a correct question', () => {
      const question: GeneratedQuestion = {
        questionText: "Quelle est la fonction principale du cœur ?",
        options: [
          { optionText: "Pomper le sang", isCorrect: true },
          { optionText: "Respirer", isCorrect: false },
          { optionText: "Digérer", isCorrect: false },
          { optionText: "Penser", isCorrect: false }
        ],
        explanation: "Le cœur a pour fonction principale de pomper le sang dans tout l'organisme pour assurer la circulation sanguine.",
        categoryId: 'cat1',
        courseId: 'course1',
        difficultyLevel: 'pass',
        generatedByAI: true,
        aiGenerationPrompt: 'Test prompt',
        medicalDomain: 'cardiologie',
        estimatedDifficulty: 'easy'
      };

      const validation = service.validateGeneratedQuestion(question);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThan(80);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect invalid question with no correct answer', () => {
      const question: GeneratedQuestion = {
        questionText: "Test question",
        options: [
          { optionText: "Option A", isCorrect: false },
          { optionText: "Option B", isCorrect: false },
          { optionText: "Option C", isCorrect: false },
          { optionText: "Option D", isCorrect: false }
        ],
        explanation: "Test explanation",
        difficultyLevel: 'pass',
        generatedByAI: true,
        aiGenerationPrompt: 'Test prompt'
      };

      const validation = service.validateGeneratedQuestion(question);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Doit avoir exactement une bonne réponse');
    });

    it('should detect question with too few options', () => {
      const question: GeneratedQuestion = {
        questionText: "Test question",
        options: [
          { optionText: "Option A", isCorrect: true },
          { optionText: "Option B", isCorrect: false }
        ],
        explanation: "Test explanation",
        difficultyLevel: 'pass',
        generatedByAI: true,
        aiGenerationPrompt: 'Test prompt'
      };

      const validation = service.validateGeneratedQuestion(question);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Doit avoir exactement 4 options');
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
