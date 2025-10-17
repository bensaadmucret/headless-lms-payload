/**
 * Tests pour les parcours d'apprentissage complexes avec prérequis
 * Couvre les exigences 4.1, 4.2 - Validation des parcours multi-niveaux avec dépendances
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSONProcessingService } from '../JSONProcessingService';
import { LearningPathPrerequisiteService } from '../LearningPathPrerequisiteService';
import { LearningPathImportData, ImportLearningStep } from '../../types/jsonImport';

// Mock payload
vi.mock('payload', () => ({
    default: {
        create: vi.fn(),
        find: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}));

describe('Complex Learning Path Prerequisites Tests', () => {
    let processingService: JSONProcessingService;
    let prerequisiteService: LearningPathPrerequisiteService;
    let mockPayload: any;

    beforeEach(async () => {
        processingService = new JSONProcessingService();
        prerequisiteService = new LearningPathPrerequisiteService();
        mockPayload = await import('payload');
        vi.clearAllMocks();

        // Default mock responses
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

        vi.mocked(mockPayload.default.create).mockResolvedValue({
            id: Math.floor(Math.random() * 1000),
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Multi-level Dependencies', () => {
        it('should handle complex prerequisite chains with 5+ levels', async () => {
            const complexLearningPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Complex Medical Learning Path',
                    level: 'PASS',
                    estimatedDuration: 300,
                    description: 'Multi-level learning path with complex dependencies'
                },
                path: {
                    steps: [
                        {
                            id: 'foundations',
                            title: 'Medical Foundations',
                            prerequisites: [],
                            questions: [createTestQuestion('Foundation question', 'Foundations')]
                        },
                        {
                            id: 'anatomy-basics',
                            title: 'Basic Anatomy',
                            prerequisites: ['foundations'],
                            questions: [createTestQuestion('Basic anatomy question', 'Anatomy')]
                        },
                        {
                            id: 'physiology-intro',
                            title: 'Introduction to Physiology',
                            prerequisites: ['anatomy-basics'],
                            questions: [createTestQuestion('Physiology intro question', 'Physiology')]
                        },
                        {
                            id: 'cardio-anatomy',
                            title: 'Cardiovascular Anatomy',
                            prerequisites: ['anatomy-basics', 'physiology-intro'],
                            questions: [createTestQuestion('Cardio anatomy question', 'Cardiologie')]
                        },
                        {
                            id: 'cardio-physiology',
                            title: 'Cardiovascular Physiology',
                            prerequisites: ['cardio-anatomy'],
                            questions: [createTestQuestion('Cardio physiology question', 'Cardiologie')]
                        },
                        {
                            id: 'pathophysiology',
                            title: 'Cardiovascular Pathophysiology',
                            prerequisites: ['cardio-physiology'],
                            questions: [createTestQuestion('Pathophysiology question', 'Cardiologie')]
                        },
                        {
                            id: 'clinical-cases',
                            title: 'Clinical Case Studies',
                            prerequisites: ['pathophysiology', 'cardio-physiology'],
                            questions: [createTestQuestion('Clinical case question', 'Cardiologie')]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(complexLearningPath, 'user-1');

            expect(result.success).toBe(true);
            expect(result.summary.totalProcessed).toBe(14); // 7 questions + 7 steps
            expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
            
            // Verify all questions were created
            expect(mockPayload.default.create).toHaveBeenCalledTimes(7);
            
            // Verify no circular dependencies were detected
            expect(result.errors.some(e => e.message.includes('circulaire'))).toBe(false);
        });

        it('should handle branching prerequisites (diamond dependency pattern)', async () => {
            const branchingPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Branching Learning Path',
                    level: 'PASS',
                    estimatedDuration: 200
                },
                path: {
                    steps: [
                        {
                            id: 'root',
                            title: 'Root Concepts',
                            prerequisites: [],
                            questions: [createTestQuestion('Root question', 'Foundations')]
                        },
                        {
                            id: 'branch-a',
                            title: 'Branch A - Anatomy',
                            prerequisites: ['root'],
                            questions: [createTestQuestion('Branch A question', 'Anatomy')]
                        },
                        {
                            id: 'branch-b',
                            title: 'Branch B - Physiology',
                            prerequisites: ['root'],
                            questions: [createTestQuestion('Branch B question', 'Physiology')]
                        },
                        {
                            id: 'convergence',
                            title: 'Convergence - Integration',
                            prerequisites: ['branch-a', 'branch-b'],
                            questions: [createTestQuestion('Integration question', 'Integration')]
                        },
                        {
                            id: 'advanced',
                            title: 'Advanced Applications',
                            prerequisites: ['convergence'],
                            questions: [createTestQuestion('Advanced question', 'Advanced')]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(branchingPath, 'user-1');

            expect(result.success).toBe(true);
            expect(result.summary.successful).toBeGreaterThan(0);
            expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
        });

        it('should validate prerequisite sequence integrity', async () => {
            const steps: ImportLearningStep[] = [
                {
                    id: 'level-1',
                    title: 'Level 1',
                    prerequisites: [],
                    questions: [createTestQuestion('Level 1 question', 'Test')]
                },
                {
                    id: 'level-2a',
                    title: 'Level 2A',
                    prerequisites: ['level-1'],
                    questions: [createTestQuestion('Level 2A question', 'Test')]
                },
                {
                    id: 'level-2b',
                    title: 'Level 2B',
                    prerequisites: ['level-1'],
                    questions: [createTestQuestion('Level 2B question', 'Test')]
                },
                {
                    id: 'level-3',
                    title: 'Level 3',
                    prerequisites: ['level-2a', 'level-2b'],
                    questions: [createTestQuestion('Level 3 question', 'Test')]
                }
            ];

            const validation = await prerequisiteService.validatePrerequisiteReferences(steps);

            expect(validation.isValid).toBe(true);
            expect(validation.circularDependencies).toHaveLength(0);
            expect(validation.missingPrerequisites).toHaveLength(0);
        });
    });

    describe('Circular Dependency Detection', () => {
        it('should detect simple circular dependencies (A → B → A)', async () => {
            const circularPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Circular Learning Path',
                    level: 'PASS',
                    estimatedDuration: 100
                },
                path: {
                    steps: [
                        {
                            id: 'step-a',
                            title: 'Step A',
                            prerequisites: ['step-b'],
                            questions: [createTestQuestion('Question A', 'Test')]
                        },
                        {
                            id: 'step-b',
                            title: 'Step B',
                            prerequisites: ['step-a'],
                            questions: [createTestQuestion('Question B', 'Test')]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(circularPath, 'user-1');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.message.includes('circulaire'))).toBe(true);
            expect(result.errors.some(e => e.severity === 'critical')).toBe(true);
        });

        it('should detect complex circular dependencies (A → B → C → A)', async () => {
            const complexCircularPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Complex Circular Path',
                    level: 'PASS',
                    estimatedDuration: 150
                },
                path: {
                    steps: [
                        {
                            id: 'step-a',
                            title: 'Step A',
                            prerequisites: ['step-c'],
                            questions: [createTestQuestion('Question A', 'Test')]
                        },
                        {
                            id: 'step-b',
                            title: 'Step B',
                            prerequisites: ['step-a'],
                            questions: [createTestQuestion('Question B', 'Test')]
                        },
                        {
                            id: 'step-c',
                            title: 'Step C',
                            prerequisites: ['step-b'],
                            questions: [createTestQuestion('Question C', 'Test')]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(complexCircularPath, 'user-1');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.message.includes('circulaire'))).toBe(true);
        });

        it('should detect self-referencing prerequisites', async () => {
            const selfReferencingPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Self-Referencing Path',
                    level: 'PASS',
                    estimatedDuration: 60
                },
                path: {
                    steps: [
                        {
                            id: 'self-ref',
                            title: 'Self-Referencing Step',
                            prerequisites: ['self-ref'],
                            questions: [createTestQuestion('Self-ref question', 'Test')]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(selfReferencingPath, 'user-1');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.message.includes('circulaire'))).toBe(true);
        });

        it('should handle mixed valid and circular dependencies', async () => {
            const mixedPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Mixed Dependencies Path',
                    level: 'PASS',
                    estimatedDuration: 180
                },
                path: {
                    steps: [
                        {
                            id: 'valid-start',
                            title: 'Valid Start',
                            prerequisites: [],
                            questions: [createTestQuestion('Valid start question', 'Test')]
                        },
                        {
                            id: 'valid-middle',
                            title: 'Valid Middle',
                            prerequisites: ['valid-start'],
                            questions: [createTestQuestion('Valid middle question', 'Test')]
                        },
                        {
                            id: 'circular-a',
                            title: 'Circular A',
                            prerequisites: ['circular-b'],
                            questions: [createTestQuestion('Circular A question', 'Test')]
                        },
                        {
                            id: 'circular-b',
                            title: 'Circular B',
                            prerequisites: ['circular-a'],
                            questions: [createTestQuestion('Circular B question', 'Test')]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(mixedPath, 'user-1');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.message.includes('circulaire'))).toBe(true);
        });
    });

    describe('Database Integrity Verification', () => {
        it('should verify all questions are created with correct relationships', async () => {
            const integrityPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Integrity Test Path',
                    level: 'PASS',
                    estimatedDuration: 120
                },
                path: {
                    steps: [
                        {
                            id: 'step-1',
                            title: 'Step 1',
                            prerequisites: [],
                            questions: [
                                createTestQuestion('Question 1A', 'Category1'),
                                createTestQuestion('Question 1B', 'Category1')
                            ]
                        },
                        {
                            id: 'step-2',
                            title: 'Step 2',
                            prerequisites: ['step-1'],
                            questions: [
                                createTestQuestion('Question 2A', 'Category2'),
                                createTestQuestion('Question 2B', 'Category2')
                            ]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(integrityPath, 'user-1');

            expect(result.success).toBe(true);
            
            // Verify all questions were created (4 questions expected)
            const createCalls = vi.mocked(mockPayload.default.create).mock.calls;
            const questionCalls = createCalls.filter(call => call[0].collection === 'questions');
            expect(questionCalls.length).toBe(4);
            
            // Verify question creation calls had correct data
            expect(questionCalls.every(call => call[0].collection === 'questions')).toBe(true);
            
            // Verify all created IDs are tracked
            expect(result.createdIds.length).toBeGreaterThan(0);
            expect(result.summary.successful).toBeGreaterThan(0);
        });

        it('should handle database errors gracefully during creation', async () => {
            // Mock database error for second question
            let callCount = 0;
            vi.mocked(mockPayload.default.create).mockImplementation(() => {
                callCount++;
                if (callCount === 2) {
                    throw new Error('Database connection error');
                }
                return Promise.resolve({
                    id: callCount,
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                });
            });

            const errorPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Error Test Path',
                    level: 'PASS',
                    estimatedDuration: 60
                },
                path: {
                    steps: [
                        {
                            id: 'step-1',
                            title: 'Step 1',
                            prerequisites: [],
                            questions: [
                                createTestQuestion('Question 1', 'Test'),
                                createTestQuestion('Question 2', 'Test'),
                                createTestQuestion('Question 3', 'Test')
                            ]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(errorPath, 'user-1');

            expect(result.success).toBe(true); // Should continue despite partial failures
            expect(result.summary.failed).toBeGreaterThan(0);
            expect(result.summary.successful).toBeGreaterThan(0);
            expect(result.errors.some(e => e.message.includes('Database connection error'))).toBe(true);
        });

        it('should verify category relationships are maintained', async () => {
            // Mock category lookup to return specific categories
            vi.mocked(mockPayload.default.find).mockImplementation(({ collection, where }) => {
                if (collection === 'categories') {
                    const title = where?.title?.equals;
                    if (title === 'Cardiologie') {
                        return Promise.resolve({
                            docs: [{ id: 'cardio-1', title: 'Cardiologie', level: 'PASS' }],
                            hasNextPage: false,
                            hasPrevPage: false,
                            limit: 10,
                            pagingCounter: 1,
                            totalDocs: 1,
                            totalPages: 1
                        });
                    }
                    if (title === 'Anatomie') {
                        return Promise.resolve({
                            docs: [{ id: 'anatomy-1', title: 'Anatomie', level: 'PASS' }],
                            hasNextPage: false,
                            hasPrevPage: false,
                            limit: 10,
                            pagingCounter: 1,
                            totalDocs: 1,
                            totalPages: 1
                        });
                    }
                }
                return Promise.resolve({
                    docs: [],
                    hasNextPage: false,
                    hasPrevPage: false,
                    limit: 10,
                    pagingCounter: 1,
                    totalDocs: 0,
                    totalPages: 0
                });
            });

            const categoryPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Category Test Path',
                    level: 'PASS',
                    estimatedDuration: 90
                },
                path: {
                    steps: [
                        {
                            id: 'anatomy-step',
                            title: 'Anatomy Step',
                            prerequisites: [],
                            questions: [createTestQuestion('Anatomy question', 'Anatomie')]
                        },
                        {
                            id: 'cardio-step',
                            title: 'Cardiology Step',
                            prerequisites: ['anatomy-step'],
                            questions: [createTestQuestion('Cardio question', 'Cardiologie')]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(categoryPath, 'user-1');

            expect(result.success).toBe(true);
            
            // Verify category lookups were performed
            expect(mockPayload.default.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'categories',
                    where: expect.objectContaining({
                        title: expect.objectContaining({ equals: 'Anatomie' })
                    })
                })
            );
            
            expect(mockPayload.default.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'categories',
                    where: expect.objectContaining({
                        title: expect.objectContaining({ equals: 'Cardiologie' })
                    })
                })
            );
        });
    });

    describe('Edge Cases and Error Scenarios', () => {
        it('should handle empty prerequisite arrays', async () => {
            const emptyPrereqPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Empty Prerequisites Path',
                    level: 'PASS',
                    estimatedDuration: 60
                },
                path: {
                    steps: [
                        {
                            id: 'step-1',
                            title: 'Step 1',
                            prerequisites: [],
                            questions: [createTestQuestion('Question 1', 'Test')]
                        },
                        {
                            id: 'step-2',
                            title: 'Step 2',
                            prerequisites: [],
                            questions: [createTestQuestion('Question 2', 'Test')]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(emptyPrereqPath, 'user-1');

            expect(result.success).toBe(true);
            expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
        });

        it('should handle steps with no questions', async () => {
            const noQuestionsPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'No Questions Path',
                    level: 'PASS',
                    estimatedDuration: 30
                },
                path: {
                    steps: [
                        {
                            id: 'empty-step',
                            title: 'Empty Step',
                            prerequisites: [],
                            questions: []
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(noQuestionsPath, 'user-1');

            expect(result.success).toBe(true);
            expect(result.summary.totalProcessed).toBe(1); // Just the step
        });

        it('should handle very large prerequisite chains (performance test)', async () => {
            // Create a linear chain of 20 steps
            const steps: ImportLearningStep[] = [];
            for (let i = 0; i < 20; i++) {
                steps.push({
                    id: `step-${i}`,
                    title: `Step ${i}`,
                    prerequisites: i === 0 ? [] : [`step-${i-1}`],
                    questions: [createTestQuestion(`Question ${i}`, 'Test')]
                });
            }

            const largePath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Large Linear Path',
                    level: 'PASS',
                    estimatedDuration: 600
                },
                path: { steps }
            };

            const startTime = Date.now();
            const result = await processingService.processLearningPath(largePath, 'user-1');
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(result.summary.totalProcessed).toBe(40); // 20 questions + 20 steps
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle malformed prerequisite references', async () => {
            const malformedPath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Malformed Prerequisites Path',
                    level: 'PASS',
                    estimatedDuration: 60
                },
                path: {
                    steps: [
                        {
                            id: 'step-1',
                            title: 'Step 1',
                            prerequisites: ['', null, undefined, 'valid-step'] as any,
                            questions: [createTestQuestion('Question 1', 'Test')]
                        },
                        {
                            id: 'valid-step',
                            title: 'Valid Step',
                            prerequisites: [],
                            questions: [createTestQuestion('Valid question', 'Test')]
                        }
                    ]
                }
            };

            const result = await processingService.processLearningPath(malformedPath, 'user-1');

            // Should handle malformed prerequisites gracefully
            expect(result.success).toBe(true);
            expect(result.errors.some(e => e.severity === 'critical')).toBe(false);
        });
    });

    // Helper function to create test questions
    function createTestQuestion(text: string, category: string) {
        return {
            questionText: text,
            options: [
                { text: 'Option A', isCorrect: true },
                { text: 'Option B', isCorrect: false },
                { text: 'Option C', isCorrect: false },
                { text: 'Option D', isCorrect: false }
            ],
            explanation: `Explanation for: ${text}`,
            category,
            difficulty: 'medium' as const,
            level: 'PASS' as const,
            tags: ['test', 'automated']
        };
    }
});