/**
 * Tests d'intégration pour le traitement des parcours d'apprentissage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSONProcessingService } from '../JSONProcessingService';
import { LearningPathImportData } from '../../types/jsonImport';

// Mock payload
vi.mock('payload', () => ({
    default: {
        create: vi.fn(),
        find: vi.fn()
    }
}));

describe('JSONProcessingService - Learning Paths', () => {
    let service: JSONProcessingService;

    beforeEach(() => {
        service = new JSONProcessingService();
        vi.clearAllMocks();
    });

    describe('processLearningPath', () => {
        it('should process a valid learning path with prerequisites', async () => {
            const mockPayload = await import('payload');

            // Mock category resolution
            vi.mocked(mockPayload.default.find).mockResolvedValue({
                docs: [{
                    id: 1,
                    title: 'Test Category',
                    level: 'PASS',
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                }],
                hasNextPage: false,
                hasPrevPage: false,
                limit: 10,
                pagingCounter: 1,
                totalDocs: 1,
                totalPages: 1
            });

            // Mock question creation
            vi.mocked(mockPayload.default.create).mockResolvedValue({
                id: 1,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });

            const learningPathData: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Test Learning Path',
                    level: 'PASS',
                    estimatedDuration: 60,
                    description: 'A test learning path'
                },
                path: {
                    steps: [
                        {
                            id: 'step-1',
                            title: 'Introduction',
                            prerequisites: [],
                            questions: [{
                                questionText: 'What is the basic concept?',
                                options: [
                                    { text: 'Option A', isCorrect: true },
                                    { text: 'Option B', isCorrect: false }
                                ],
                                explanation: 'This is the correct answer',
                                category: 'Test Category',
                                difficulty: 'easy',
                                level: 'PASS'
                            }]
                        },
                        {
                            id: 'step-2',
                            title: 'Advanced Concepts',
                            prerequisites: ['step-1'],
                            questions: [{
                                questionText: 'What is the advanced concept?',
                                options: [
                                    { text: 'Advanced A', isCorrect: true },
                                    { text: 'Advanced B', isCorrect: false }
                                ],
                                explanation: 'This is the advanced answer',
                                category: 'Test Category',
                                difficulty: 'medium',
                                level: 'PASS'
                            }]
                        }
                    ]
                }
            };

            const result = await service.processLearningPath(learningPathData, 'user-1');

            expect(result.success).toBe(true);
            expect(result.summary.totalProcessed).toBe(4); // 2 questions + 2 steps
            expect(result.summary.successful).toBeGreaterThan(0);
            expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
            expect(mockPayload.default.create).toHaveBeenCalledTimes(2); // 2 questions created
        });

        it('should handle missing prerequisites with substitutions', async () => {
            const mockPayload = await import('payload');

            // Mock category resolution
            vi.mocked(mockPayload.default.find).mockResolvedValue({
                docs: [{
                    id: 2,
                    title: 'Test Category',
                    level: 'PASS',
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                }],
                hasNextPage: false,
                hasPrevPage: false,
                limit: 10,
                pagingCounter: 1,
                totalDocs: 1,
                totalPages: 1
            });

            // Mock question creation
            vi.mocked(mockPayload.default.create).mockResolvedValue({
                id: 2,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });

            const learningPathData: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Test Learning Path with Missing Prerequisites',
                    level: 'PASS',
                    estimatedDuration: 60
                },
                path: {
                    steps: [
                        {
                            id: 'step-1',
                            title: 'Introduction',
                            prerequisites: ['missing-step'], // This prerequisite doesn't exist
                            questions: [{
                                questionText: 'What is the basic concept?',
                                options: [
                                    { text: 'Option A', isCorrect: true },
                                    { text: 'Option B', isCorrect: false }
                                ],
                                explanation: 'This is the correct answer',
                                category: 'Test Category',
                                difficulty: 'easy',
                                level: 'PASS'
                            }]
                        }
                    ]
                }
            };

            const result = await service.processLearningPath(learningPathData, 'user-1');

            // Should fail due to missing prerequisites and no entry point
            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.message.includes('introuvable'))).toBe(true);
            expect(result.errors.some(e => e.message.includes('point d\'entrée'))).toBe(true);
        });

        it('should reject learning paths with circular dependencies', async () => {
            const learningPathData: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Circular Learning Path',
                    level: 'PASS',
                    estimatedDuration: 60
                },
                path: {
                    steps: [
                        {
                            id: 'step-1',
                            title: 'Step 1',
                            prerequisites: ['step-2'],
                            questions: [{
                                questionText: 'Question 1',
                                options: [
                                    { text: 'Option A', isCorrect: true },
                                    { text: 'Option B', isCorrect: false }
                                ],
                                explanation: 'Answer 1',
                                category: 'Test Category',
                                difficulty: 'easy',
                                level: 'PASS'
                            }]
                        },
                        {
                            id: 'step-2',
                            title: 'Step 2',
                            prerequisites: ['step-1'],
                            questions: [{
                                questionText: 'Question 2',
                                options: [
                                    { text: 'Option A', isCorrect: true },
                                    { text: 'Option B', isCorrect: false }
                                ],
                                explanation: 'Answer 2',
                                category: 'Test Category',
                                difficulty: 'easy',
                                level: 'PASS'
                            }]
                        }
                    ]
                }
            };

            const result = await service.processLearningPath(learningPathData, 'user-1');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.message.includes('circulaire'))).toBe(true);
        });
    });
});