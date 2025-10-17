/**
 * Tests pour LearningPathPrerequisiteService
 */

import { LearningPathPrerequisiteService } from '../LearningPathPrerequisiteService';
import { ImportLearningStep } from '../../types/jsonImport';

describe('LearningPathPrerequisiteService', () => {
  let service: LearningPathPrerequisiteService;

  beforeEach(() => {
    service = new LearningPathPrerequisiteService();
  });

  describe('validatePrerequisiteReferences', () => {
    it('should validate valid prerequisites', async () => {
      const steps: ImportLearningStep[] = [
        {
          id: 'step-1',
          title: 'Introduction',
          prerequisites: [],
          questions: [{
            questionText: 'Test question',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Test explanation',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }]
        },
        {
          id: 'step-2',
          title: 'Advanced',
          prerequisites: ['step-1'],
          questions: [{
            questionText: 'Advanced question',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Advanced explanation',
            category: 'Test',
            difficulty: 'medium',
            level: 'PASS'
          }]
        }
      ];

      const result = await service.validatePrerequisiteReferences(steps);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.missingPrerequisites).toHaveLength(0);
      expect(result.circularDependencies).toHaveLength(0);
    });

    it('should detect missing prerequisites', async () => {
      const steps: ImportLearningStep[] = [
        {
          id: 'step-1',
          title: 'Introduction',
          prerequisites: ['missing-step'],
          questions: [{
            questionText: 'Test question',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Test explanation',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }]
        }
      ];

      const result = await service.validatePrerequisiteReferences(steps);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.missingPrerequisites).toContain('missing-step');
    });

    it('should detect circular dependencies', async () => {
      const steps: ImportLearningStep[] = [
        {
          id: 'step-1',
          title: 'Step 1',
          prerequisites: ['step-2'],
          questions: [{
            questionText: 'Test question 1',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Test explanation',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }]
        },
        {
          id: 'step-2',
          title: 'Step 2',
          prerequisites: ['step-1'],
          questions: [{
            questionText: 'Test question 2',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Test explanation',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }]
        }
      ];

      const result = await service.validatePrerequisiteReferences(steps);

      expect(result.isValid).toBe(false);
      expect(result.circularDependencies.length).toBeGreaterThan(0);
    });

    it('should validate learning sequences', async () => {
      const steps: ImportLearningStep[] = [
        {
          id: 'basics',
          title: 'Basics',
          prerequisites: [],
          questions: [{
            questionText: 'Basic question',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Basic explanation',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }]
        },
        {
          id: 'intermediate',
          title: 'Intermediate',
          prerequisites: ['basics'],
          questions: [{
            questionText: 'Intermediate question',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Intermediate explanation',
            category: 'Test',
            difficulty: 'medium',
            level: 'PASS'
          }]
        },
        {
          id: 'advanced',
          title: 'Advanced',
          prerequisites: ['intermediate'],
          questions: [{
            questionText: 'Advanced question',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Advanced explanation',
            category: 'Test',
            difficulty: 'hard',
            level: 'PASS'
          }]
        }
      ];

      const result = await service.validatePrerequisiteReferences(steps);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeLessThanOrEqual(2); // Peut avoir des avertissements mineurs
    });
  });

  describe('createSubstitutionRecords', () => {
    it('should create substitution records for missing prerequisites', async () => {
      const missingPrerequisites = ['missing-1', 'missing-2'];
      const substitutionSuggestions = [
        {
          originalId: 'missing-1',
          suggestedId: 'existing-1',
          reason: 'Similarité de nom',
          confidence: 0.8
        }
      ];

      const result = await service.createSubstitutionRecords(missingPrerequisites, substitutionSuggestions);

      expect(result).toHaveLength(2);
      expect(result[0].originalId).toBe('missing-1');
      expect(result[0].substitutionId).toBe('existing-1');
      expect(result[0].created).toBe(false);
      
      expect(result[1].originalId).toBe('missing-2');
      expect(result[1].created).toBe(true);
    });
  });
});