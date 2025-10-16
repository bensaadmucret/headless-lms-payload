import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateAIQuizEndpoint } from '../generateAIQuiz';

// Mock the AI service
vi.mock('../../services/AIQuizGenerationService', () => ({
    AIQuizGenerationService: vi.fn().mockImplementation(() => ({
        generateQuestions: vi.fn().mockResolvedValue([
            {
                questionText: 'Test question about cardiovascular anatomy?',
                options: [
                    { optionText: 'Option A', isCorrect: true },
                    { optionText: 'Option B', isCorrect: false },
                    { optionText: 'Option C', isCorrect: false },
                    { optionText: 'Option D', isCorrect: false },
                ],
                explanation: 'This is the correct answer because...',
                estimatedDifficulty: 'medium',
                generatedByAI: true,
                aiGenerationPrompt: 'Test prompt',
            }
        ]),
        validateGeneratedQuestion: vi.fn().mockReturnValue({
            isValid: true,
            issues: [],
            score: 95,
        }),
    })),
}));

describe('generateAIQuizEndpoint', () => {
    let mockReq: any;
    let mockPayload: any;

    beforeEach(() => {
        mockPayload = {
            logger: {
                info: vi.fn(),
                error: vi.fn(),
            },
            findByID: vi.fn().mockResolvedValue({
                id: '1',
                title: 'Test Category',
            }),
            create: vi.fn().mockImplementation(({ collection }) => {
                if (collection === 'quizzes') {
                    return Promise.resolve({ id: 'quiz-123' });
                }
                if (collection === 'questions') {
                    return Promise.resolve({ id: 'question-123' });
                }
                return Promise.resolve({ id: 'test-id' });
            }),
            update: vi.fn().mockResolvedValue({ id: 'quiz-123' }),
        };

        mockReq = {
            user: { id: 'user-123', role: 'admin' },
            payload: mockPayload,
            json: vi.fn().mockResolvedValue({
                subject: 'Anatomie cardiovasculaire',
                categoryId: '1',
                studentLevel: 'PASS',
                questionCount: 5,
                difficulty: 'medium',
                includeExplanations: true,
            }),
        };
    });

    it('should validate admin permissions', async () => {
        const unauthorizedReq = { ...mockReq, user: null };

        const response = await generateAIQuizEndpoint.handler(unauthorizedReq as any);
        const result = await response.json();

        expect(response.status).toBe(403);
        expect(result.error).toBe('Admin permissions required.');
    });

    it('should validate configuration parameters', async () => {
        mockReq.json.mockResolvedValue({
            subject: 'Too short', // Less than 10 characters
            categoryId: '',
            studentLevel: 'INVALID',
            questionCount: 25, // More than 20
        });

        const response = await generateAIQuizEndpoint.handler(mockReq);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result.error).toBe('Configuration invalide');
        expect(result.details).toContain('Le sujet doit contenir entre 10 et 200 caractères');
    });

    it('should generate quiz successfully with valid configuration', async () => {
        const response = await generateAIQuizEndpoint.handler(mockReq);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.quiz).toBeDefined();
        expect(result.quiz.id).toBe('quiz-123');
        expect(result.quiz.questionsCreated).toBe(1);
        expect(result.validationScore).toBeGreaterThan(0);
    });

    it('should handle category not found', async () => {
        mockPayload.findByID.mockResolvedValue(null);

        const response = await generateAIQuizEndpoint.handler(mockReq);
        const result = await response.json();

        expect(response.status).toBe(404);
        expect(result.error).toBe('Catégorie non trouvée');
    });

    it('should handle AI generation errors', async () => {
        const { AIQuizGenerationService } = await import('../../services/AIQuizGenerationService');
        vi.mocked(AIQuizGenerationService).mockImplementation(() => ({
            generateQuestions: vi.fn().mockRejectedValue(new Error('AI service error')),
            validateGeneratedQuestion: vi.fn(),
        } as any));

        const response = await generateAIQuizEndpoint.handler(mockReq);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result.error).toBe('Erreur lors de la génération du quiz IA.');
    });
});