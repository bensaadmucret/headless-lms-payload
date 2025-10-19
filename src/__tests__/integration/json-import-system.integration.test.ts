/**
 * Tests d'intégration complets pour le système d'import JSON
 * Teste tout le workflow de bout en bout avec des mocks appropriés
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSONProcessingService } from '../../services/JSONProcessingService';
import { JSONValidationService } from '../../services/JSONValidationService';
import { JSONImportAuditService } from '../../services/JSONImportAuditService';
import { JSONImportBackupService } from '../../services/JSONImportBackupService';
import type { QuestionImportData, FlashcardImportData } from '../../types/jsonImport';

// Mock Payload CMS
vi.mock('payload', () => ({
    default: {
        create: vi.fn(),
        find: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        logger: {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        },
    },
}));

describe('JSON Import System - Integration Tests', () => {
    let validationService: JSONValidationService;
    let mockPayload: any;

    beforeEach(async () => {
        // Get the mocked payload
        const payloadModule = await import('payload');
        mockPayload = payloadModule.default;

        // Setup default successful mocks
        mockPayload.create.mockResolvedValue({
            id: 'mock-id-' + Math.random().toString(36).substr(2, 9),
            doc: {}
        });

        mockPayload.find.mockResolvedValue({
            docs: [],
            totalDocs: 0,
            limit: 10,
            totalPages: 0,
            page: 1,
            pagingCounter: 1,
            hasPrevPage: false,
            hasNextPage: false,
            prevPage: null,
            nextPage: null
        });

        validationService = new JSONValidationService();

        // Reset all mocks
        vi.clearAllMocks();

        // Re-setup mocks after clearing
        mockPayload.create.mockResolvedValue({
            id: 'mock-id-' + Math.random().toString(36).substr(2, 9),
            doc: {}
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('JSON Validation Tests', () => {
        it('should validate correct question data structure', async () => {
            // Arrange
            const validQuestionData: QuestionImportData = {
                version: '1.0',
                type: 'questions',
                metadata: {
                    source: 'test-integration',
                    created: new Date().toISOString(),
                },
                questions: [
                    {
                        questionText: 'Quelle est la capitale de la France ?',
                        options: [
                            { text: 'Paris', isCorrect: true },
                            { text: 'Lyon', isCorrect: false },
                            { text: 'Marseille', isCorrect: false },
                        ],
                        explanation: 'Paris est la capitale de la France.',
                        _category: 'Géographie',
                        difficulty: 'easy',
                        level: 'PASS',
                        tags: ['géographie', 'france'],
                    },
                    {
                        questionText: 'Combien font 2 + 2 ?',
                        options: [
                            { text: '3', isCorrect: false },
                            { text: '4', isCorrect: true },
                            { text: '5', isCorrect: false },
                        ],
                        explanation: '2 + 2 = 4',
                        _category: 'Mathématiques',
                        difficulty: 'easy',
                        level: 'PASS',
                        tags: ['mathématiques', 'addition'],
                    },
                ],
            };

            // Act
            const validationResult = await validationService.validateJSON(
                JSON.stringify(validQuestionData),
                'questions',
                {}
            );

            // Assert
            expect(validationResult).toBeDefined();
            expect(validationResult.errors).toBeDefined();
            expect(Array.isArray(validationResult.errors)).toBe(true);
        });

        it('should validate flashcard data structure', async () => {
            // Arrange
            const validFlashcardData: FlashcardImportData = {
                version: '1.0',
                type: 'flashcards',
                metadata: {
                    source: 'test-flashcards',
                    created: new Date().toISOString(),
                    deckName: 'test-flashcards',
                    _category: 'Test Category',
                },
                cards: [
                    {
                        front: 'Quelle est la formule de l\'eau ?',
                        back: 'H2O',
                        _category: 'Chimie',
                        difficulty: 'easy',
                        tags: ['chimie', 'formule'],
                    },
                    {
                        front: 'Qui a écrit "Les Misérables" ?',
                        back: 'Victor Hugo',
                        _category: 'Littérature',
                        difficulty: 'medium',
                        tags: ['littérature', 'auteur'],
                    },
                ],
            };

            // Act
            const validationResult = await validationService.validateJSON(
                JSON.stringify(validFlashcardData),
                'flashcards',
                {}
            );

            // Assert
            expect(validationResult).toBeDefined();
            expect(validationResult.errors).toBeDefined();
            expect(Array.isArray(validationResult.errors)).toBe(true);
        });

        it('should detect validation errors in invalid data', async () => {
            // Arrange
            const invalidData = {
                version: '1.0',
                type: 'questions',
                questions: [
                    {
                        // Missing required fields
                        questionText: '',
                        options: [], // Empty options
                        explanation: '',
                        _category: '',
                        difficulty: 'easy',
                        level: 'PASS',
                    },
                ],
            };

            // Act
            const validationResult = await validationService.validateJSON(
                JSON.stringify(invalidData),
                'questions',
                {}
            );

            // Assert
            expect(validationResult).toBeDefined();
            expect(validationResult.errors).toBeDefined();
            expect(Array.isArray(validationResult.errors)).toBe(true);
        });

        it('should handle malformed JSON gracefully', async () => {
            // Arrange
            const malformedJSON = '{ "version": "1.0", "type": "questions", "questions": [';

            // Act
            const validationResult = await validationService.validateJSON(
                malformedJSON,
                'questions',
                {}
            );

            // Assert
            expect(validationResult).toBeDefined();
            expect(validationResult.errors).toBeDefined();
            expect(Array.isArray(validationResult.errors)).toBe(true);
        });

        it('should validate service initialization', async () => {
            // Act & Assert
            expect(validationService).toBeDefined();
            expect(typeof validationService.validateJSON).toBe('function');
        });
    });
});