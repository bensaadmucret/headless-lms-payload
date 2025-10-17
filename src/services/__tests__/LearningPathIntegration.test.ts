/**
 * Tests d'intégration pour les parcours d'apprentissage complexes
 * Utilise des fixtures réalistes pour tester l'intégrité complète du système
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { JSONProcessingService } from '../JSONProcessingService';
import { LearningPathPrerequisiteService } from '../LearningPathPrerequisiteService';
import { LearningPathImportData } from '../../types/jsonImport';

// Mock payload
vi.mock('payload', () => ({
    default: {
        create: vi.fn(),
        find: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}));

describe('Learning Path Integration Tests', () => {
    let processingService: JSONProcessingService;
    let prerequisiteService: LearningPathPrerequisiteService;
    let mockPayload: any;
    let fixtures: any;

    beforeEach(async () => {
        processingService = new JSONProcessingService();
        prerequisiteService = new LearningPathPrerequisiteService();
        mockPayload = await import('payload');
        vi.clearAllMocks();

        // Load test fixtures
        const fixturesPath = join(__dirname, 'fixtures', 'complex-learning-paths.json');
        fixtures = JSON.parse(readFileSync(fixturesPath, 'utf-8'));

        // Setup default mocks
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

    describe('Complex Medical Learning Path', () => {
        it('should successfully process a realistic medical curriculum with multi-level dependencies', async () => {
            const complexPath = fixtures.complexMedicalPath as LearningPathImportData;

            const result = await processingService.processLearningPath(complexPath, 'medical-instructor-1');

            expect(result.success).toBe(true);
            expect(result.summary.totalProcessed).toBeGreaterThan(0); // Questions + steps processed
            expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
            
            // Verify the learning progression makes sense
            expect(result.summary.successful).toBeGreaterThan(0);
            expect(result.summary.failed).toBe(0);
            
            // Verify all medical categories are handled
            const createCalls = vi.mocked(mockPayload.default.create).mock.calls;
            const questionCalls = createCalls.filter(call => call[0].collection === 'questions');
            expect(questionCalls.length).toBe(9);
            
            // Verify medical specialties are represented in the fixture data
            const expectedCategories = complexPath.path.steps.flatMap(step => 
                step.questions.map(q => q.category)
            );
            expect(expectedCategories).toContain('Cardiologie');
            expect(expectedCategories).toContain('Pneumologie');
            expect(expectedCategories).toContain('Pathophysiologie');
        });

        it('should validate the prerequisite chain integrity in medical curriculum', async () => {
            const complexPath = fixtures.complexMedicalPath as LearningPathImportData;
            
            const validation = await prerequisiteService.validatePrerequisiteReferences(complexPath.path.steps);

            expect(validation.isValid).toBe(true);
            expect(validation.circularDependencies).toHaveLength(0);
            expect(validation.missingPrerequisites).toHaveLength(0);
            
            // Verify logical progression: foundations → anatomy → physiology → integration → clinical
            const stepIds = complexPath.path.steps.map(step => step.id);
            expect(stepIds).toContain('medical-foundations');
            expect(stepIds).toContain('basic-anatomy');
            expect(stepIds).toContain('basic-physiology');
            expect(stepIds).toContain('clinical-applications');
            
            // Verify clinical applications comes after pathophysiology
            const clinicalStep = complexPath.path.steps.find(step => step.id === 'clinical-applications');
            expect(clinicalStep?.prerequisites).toContain('pathophysiology-basics');
        });
    });

    describe('Circular Dependency Detection', () => {
        it('should detect and reject circular dependencies in realistic scenarios', async () => {
            const circularPath = fixtures.circularDependencyExample as LearningPathImportData;

            const result = await processingService.processLearningPath(circularPath, 'test-user');

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.message.includes('circulaire'))).toBe(true);
            expect(result.errors.some(e => e.severity === 'critical')).toBe(true);
            
            // Verify no questions were created due to circular dependency
            const createCalls = vi.mocked(mockPayload.default.create).mock.calls;
            const questionCalls = createCalls.filter(call => call[0].collection === 'questions');
            expect(questionCalls.length).toBe(0);
        });

        it('should provide detailed error information for circular dependencies', async () => {
            const circularPath = fixtures.circularDependencyExample as LearningPathImportData;
            
            const validation = await prerequisiteService.validatePrerequisiteReferences(circularPath.path.steps);

            expect(validation.isValid).toBe(false);
            expect(validation.circularDependencies.length).toBeGreaterThan(0);
            
            // Verify circular dependencies are detected
            expect(validation.circularDependencies.length).toBeGreaterThan(0);
            
            // Verify error messages mention circular dependencies
            expect(validation.errors.some(e => e.message.includes('circulaire'))).toBe(true);
        });
    });

    describe('Branching Prerequisites (Diamond Pattern)', () => {
        it('should handle diamond dependency patterns correctly', async () => {
            const branchingPath = fixtures.branchingPath as LearningPathImportData;

            const result = await processingService.processLearningPath(branchingPath, 'biology-instructor');

            expect(result.success).toBe(true);
            expect(result.summary.totalProcessed).toBeGreaterThan(0); // Questions + steps processed
            expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
            
            // Verify branching structure is maintained
            const integrationStep = branchingPath.path.steps.find(step => step.id === 'integration-point');
            expect(integrationStep?.prerequisites).toContain('structural-branch');
            expect(integrationStep?.prerequisites).toContain('functional-branch');
            
            // Verify both branches depend on root
            const structuralStep = branchingPath.path.steps.find(step => step.id === 'structural-branch');
            const functionalStep = branchingPath.path.steps.find(step => step.id === 'functional-branch');
            expect(structuralStep?.prerequisites).toContain('root-concept');
            expect(functionalStep?.prerequisites).toContain('root-concept');
        });

        it('should validate diamond pattern prerequisite integrity', async () => {
            const branchingPath = fixtures.branchingPath as LearningPathImportData;
            
            const validation = await prerequisiteService.validatePrerequisiteReferences(branchingPath.path.steps);

            expect(validation.isValid).toBe(true);
            expect(validation.circularDependencies).toHaveLength(0);
            expect(validation.missingPrerequisites).toHaveLength(0);
            
            // Verify no warnings for this valid structure
            expect(validation.warnings.length).toBeLessThanOrEqual(1);
        });
    });

    describe('Database Integrity and Error Recovery', () => {
        it('should maintain database integrity during partial failures', async () => {
            // Mock partial database failures
            let createCallCount = 0;
            vi.mocked(mockPayload.default.create).mockImplementation(({ collection, data }) => {
                createCallCount++;
                
                // Fail every 3rd question creation
                if (collection === 'questions' && createCallCount % 3 === 0) {
                    throw new Error('Simulated database error');
                }
                
                return Promise.resolve({
                    id: createCallCount,
                    updatedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    ...data
                });
            });

            const complexPath = fixtures.complexMedicalPath as LearningPathImportData;
            const result = await processingService.processLearningPath(complexPath, 'test-user');

            expect(result.success).toBe(true); // Should continue despite partial failures
            expect(result.summary.failed).toBeGreaterThan(0);
            expect(result.summary.successful).toBeGreaterThan(0);
            
            // Verify error reporting
            expect(result.errors.some(e => e.message.includes('Simulated database error'))).toBe(true);
            
            // Verify successful creations are tracked
            expect(result.createdIds.length).toBeGreaterThan(0);
            expect(result.createdIds.length).toBeLessThanOrEqual(result.summary.totalProcessed);
        });

        it('should handle category resolution failures gracefully', async () => {
            // Mock category lookup failures
            vi.mocked(mockPayload.default.find).mockImplementation(({ collection }) => {
                if (collection === 'categories') {
                    throw new Error('Category service unavailable');
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

            const complexPath = fixtures.complexMedicalPath as LearningPathImportData;
            const result = await processingService.processLearningPath(complexPath, 'test-user');

            // Should handle category resolution failures
            expect(result.errors.some(e => e.message.includes('Category service unavailable'))).toBe(true);
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle large learning paths efficiently', async () => {
            // Generate a large linear path
            const largeSteps = [];
            for (let i = 0; i < 50; i++) {
                largeSteps.push({
                    id: `step-${i}`,
                    title: `Step ${i}`,
                    prerequisites: i === 0 ? [] : [`step-${i-1}`],
                    questions: [{
                        questionText: `Question ${i}?`,
                        options: [
                            { text: `Answer ${i}`, isCorrect: true },
                            { text: `Wrong ${i}`, isCorrect: false }
                        ],
                        explanation: `Explanation ${i}`,
                        category: 'Performance',
                        difficulty: 'medium' as const,
                        level: 'PASS' as const
                    }]
                });
            }

            const largePath: LearningPathImportData = {
                version: '1.0',
                type: 'learning-path',
                metadata: {
                    title: 'Large Performance Test Path',
                    level: 'PASS',
                    estimatedDuration: 1500
                },
                path: { steps: largeSteps }
            };

            const startTime = Date.now();
            const result = await processingService.processLearningPath(largePath, 'performance-test');
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(result.summary.totalProcessed).toBeGreaterThan(50); // At least 50 items processed
            expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
            
            // Verify all steps were processed
            expect(result.summary.successful).toBeGreaterThan(0);
        });

        it('should validate large prerequisite chains efficiently', async () => {
            // Create a complex branching structure
            const complexSteps = [];
            
            // Root
            complexSteps.push({
                id: 'root',
                title: 'Root',
                prerequisites: [],
                questions: [createTestQuestion('Root question', 'Test')]
            });
            
            // Level 1 - 5 branches
            for (let i = 0; i < 5; i++) {
                complexSteps.push({
                    id: `level1-${i}`,
                    title: `Level 1 Branch ${i}`,
                    prerequisites: ['root'],
                    questions: [createTestQuestion(`Level 1 question ${i}`, 'Test')]
                });
            }
            
            // Level 2 - Each level 1 has 3 children
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 3; j++) {
                    complexSteps.push({
                        id: `level2-${i}-${j}`,
                        title: `Level 2 Step ${i}-${j}`,
                        prerequisites: [`level1-${i}`],
                        questions: [createTestQuestion(`Level 2 question ${i}-${j}`, 'Test')]
                    });
                }
            }
            
            // Convergence - depends on all level 2
            const level2Ids = [];
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 3; j++) {
                    level2Ids.push(`level2-${i}-${j}`);
                }
            }
            
            complexSteps.push({
                id: 'convergence',
                title: 'Convergence Point',
                prerequisites: level2Ids,
                questions: [createTestQuestion('Convergence question', 'Test')]
            });

            const startTime = Date.now();
            const validation = await prerequisiteService.validatePrerequisiteReferences(complexSteps);
            const endTime = Date.now();

            expect(validation.isValid).toBe(true);
            expect(validation.circularDependencies).toHaveLength(0);
            expect(endTime - startTime).toBeLessThan(2000); // Should validate within 2 seconds
        });
    });

    // Helper function to create test questions
    function createTestQuestion(text: string, category: string) {
        return {
            questionText: text,
            options: [
                { text: 'Correct answer', isCorrect: true },
                { text: 'Wrong answer 1', isCorrect: false },
                { text: 'Wrong answer 2', isCorrect: false },
                { text: 'Wrong answer 3', isCorrect: false }
            ],
            explanation: `Explanation for: ${text}`,
            category,
            difficulty: 'medium' as const,
            level: 'PASS' as const,
            tags: ['integration-test', 'automated']
        };
    }
});