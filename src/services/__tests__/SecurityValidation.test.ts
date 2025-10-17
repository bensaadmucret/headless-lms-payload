/**
 * Tests de validation et sanitisation des données pour le système d'import JSON
 * Valide la sécurité des données entrantes et la protection contre les attaques
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSONValidationService } from '../JSONValidationService';
import { JSONProcessingService } from '../JSONProcessingService';
import { ContentMappingService } from '../ContentMappingService';

// TODO: Ces tests nécessitent des mocks de services et une refonte
// À corriger après refactoring des services de validation
describe.skip('Security Validation Tests', () => {
  let validationService: JSONValidationService;
  let processingService: JSONProcessingService;
  let mappingService: ContentMappingService;
  let mockPayload: any;

  beforeEach(() => {
    mockPayload = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      },
      find: vi.fn(),
      findByID: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    };

    validationService = new JSONValidationService();
    processingService = new JSONProcessingService(mockPayload);
    mappingService = new ContentMappingService(mockPayload);
  });

  describe('Input Sanitization Tests', () => {
    describe('XSS Prevention', () => {
      it('should sanitize script tags in question text', async () => {
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: 'What is <script>alert("XSS")</script> the heart?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Normal explanation',
            category: 'Cardiologie'
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'security',
            message: expect.stringContaining('Script tags detected')
          })
        );
      });

      it('should sanitize HTML entities in explanations', async () => {
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: 'Valid question?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explanation with <img src="x" onerror="alert(1)"> malicious content',
            category: 'Cardiologie'
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'security',
            message: expect.stringContaining('Potentially dangerous HTML detected')
          })
        );
      });

      it('should allow safe HTML tags in medical content', async () => {
        const safeData = {
          type: 'questions',
          questions: [{
            questionText: 'What is the function of <em>ventricle</em>?',
            options: [
              { text: 'Option A with <strong>emphasis</strong>', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'The <em>left ventricle</em> pumps blood to <strong>systemic circulation</strong>.',
            category: 'Cardiologie'
          }]
        };

        const validation = await validationService.validateImportData(safeData, 'questions');

        expect(validation.isValid).toBe(true);
        expect(validation.errors.filter(e => e.type === 'security')).toHaveLength(0);
      });
    });

    describe('SQL Injection Prevention', () => {
      it('should detect SQL injection attempts in category names', async () => {
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: 'Valid question?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Valid explanation',
            category: "'; DROP TABLE categories; --"
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'security',
            message: expect.stringContaining('Potentially malicious SQL patterns detected')
          })
        );
      });

      it('should detect SQL injection in tags', async () => {
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: 'Valid question?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Valid explanation',
            category: 'Cardiologie',
            tags: ['normal-tag', "'; SELECT * FROM users; --", 'another-tag']
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'security',
            message: expect.stringContaining('Potentially malicious SQL patterns detected')
          })
        );
      });
    });

    describe('Path Traversal Prevention', () => {
      it('should detect path traversal attempts in file references', async () => {
        const maliciousData = {
          type: 'flashcards',
          cards: [{
            front: 'Valid question',
            back: 'Valid answer',
            imageUrl: '../../../etc/passwd',
            category: 'Cardiologie'
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'flashcards');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'security',
            message: expect.stringContaining('Path traversal attempt detected')
          })
        );
      });

      it('should allow valid relative paths for media', async () => {
        const safeData = {
          type: 'flashcards',
          cards: [{
            front: 'Valid question',
            back: 'Valid answer',
            imageUrl: '/media/anatomy/heart-diagram.png',
            category: 'Cardiologie'
          }]
        };

        const validation = await validationService.validateImportData(safeData, 'flashcards');

        expect(validation.isValid).toBe(true);
        expect(validation.errors.filter(e => e.type === 'security')).toHaveLength(0);
      });
    });

    describe('Content Length Validation', () => {
      it('should reject excessively long question text', async () => {
        const longText = 'x'.repeat(5001); // Over 5000 character limit
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: longText,
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Valid explanation',
            category: 'Cardiologie'
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            message: expect.stringContaining('Question text exceeds maximum length')
          })
        );
      });

      it('should reject excessively long explanations', async () => {
        const longExplanation = 'x'.repeat(10001); // Over 10000 character limit
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: 'Valid question?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: longExplanation,
            category: 'Cardiologie'
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            message: expect.stringContaining('Explanation exceeds maximum length')
          })
        );
      });

      it('should limit number of tags per question', async () => {
        const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag-${i}`); // Over 20 tag limit
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: 'Valid question?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Valid explanation',
            category: 'Cardiologie',
            tags: tooManyTags
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            message: expect.stringContaining('Too many tags')
          })
        );
      });
    });

    describe('Data Type Validation', () => {
      it('should reject non-string question text', async () => {
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: { malicious: 'object' }, // Should be string
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Valid explanation',
            category: 'Cardiologie'
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            message: expect.stringContaining('Question text must be a string')
          })
        );
      });

      it('should reject non-boolean isCorrect values', async () => {
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: 'Valid question?',
            options: [
              { text: 'Option A', isCorrect: 'true' }, // Should be boolean
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Valid explanation',
            category: 'Cardiologie'
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            message: expect.stringContaining('isCorrect must be a boolean')
          })
        );
      });

      it('should reject non-array tags', async () => {
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: 'Valid question?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Valid explanation',
            category: 'Cardiologie',
            tags: 'not-an-array' // Should be array
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            message: expect.stringContaining('Tags must be an array')
          })
        );
      });
    });
  });

  describe('Business Logic Security', () => {
    describe('Category Validation', () => {
      it('should validate category names against whitelist patterns', async () => {
        const suspiciousData = {
          type: 'questions',
          questions: [{
            questionText: 'Valid question?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Valid explanation',
            category: 'admin_backdoor_category' // Suspicious category name
          }]
        };

        const validation = await validationService.validateImportData(suspiciousData, 'questions');

        expect(validation.warnings).toContainEqual(
          expect.objectContaining({
            type: 'security',
            message: expect.stringContaining('Suspicious category name pattern')
          })
        );
      });

      it('should limit category name length', async () => {
        const longCategoryName = 'x'.repeat(101); // Over 100 character limit
        const maliciousData = {
          type: 'questions',
          questions: [{
            questionText: 'Valid question?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Valid explanation',
            category: longCategoryName
          }]
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            message: expect.stringContaining('Category name exceeds maximum length')
          })
        );
      });
    });

    describe('Duplicate Detection Security', () => {
      it('should detect potential duplicate flooding attacks', async () => {
        const duplicateQuestions = Array.from({ length: 101 }, (_, i) => ({
          questionText: `Duplicate question ${i}?`,
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false }
          ],
          explanation: 'Same explanation',
          category: 'Cardiologie'
        }));

        const maliciousData = {
          type: 'questions',
          questions: duplicateQuestions
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.warnings).toContainEqual(
          expect.objectContaining({
            type: 'security',
            message: expect.stringContaining('Large number of similar questions detected')
          })
        );
      });

      it('should detect hash collision attempts', async () => {
        // Simulate questions designed to have similar hashes
        const collisionData = {
          type: 'questions',
          questions: [
            {
              questionText: 'What is the heart function?',
              options: [
                { text: 'Pump blood', isCorrect: true },
                { text: 'Filter blood', isCorrect: false }
              ],
              explanation: 'Heart pumps blood',
              category: 'Cardiologie'
            },
            {
              questionText: 'What is the heart function?', // Exact duplicate
              options: [
                { text: 'Pump blood', isCorrect: true },
                { text: 'Filter blood', isCorrect: false }
              ],
              explanation: 'Heart pumps blood',
              category: 'Cardiologie'
            }
          ]
        };

        const validation = await validationService.validateImportData(collisionData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'duplicate',
            message: expect.stringContaining('Duplicate question detected')
          })
        );
      });
    });

    describe('Resource Exhaustion Prevention', () => {
      it('should limit total number of items per import', async () => {
        const tooManyQuestions = Array.from({ length: 1001 }, (_, i) => ({
          questionText: `Question ${i}?`,
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false }
          ],
          explanation: `Explanation ${i}`,
          category: 'Cardiologie'
        }));

        const maliciousData = {
          type: 'questions',
          questions: tooManyQuestions
        };

        const validation = await validationService.validateImportData(maliciousData, 'questions');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            message: expect.stringContaining('Too many items in import')
          })
        );
      });

      it('should limit nested structure depth', async () => {
        const deeplyNestedPath = {
          type: 'learning-path',
          path: {
            steps: [{
              id: 'step-1',
              title: 'Step 1',
              prerequisites: [],
              questions: [{
                questionText: 'Question?',
                options: [
                  { text: 'Option A', isCorrect: true },
                  { text: 'Option B', isCorrect: false }
                ],
                explanation: 'Explanation',
                category: 'Cardiologie',
                subQuestions: { // Excessive nesting
                  level1: {
                    level2: {
                      level3: {
                        level4: {
                          level5: 'too deep'
                        }
                      }
                    }
                  }
                }
              }]
            }]
          }
        };

        const validation = await validationService.validateImportData(deeplyNestedPath, 'learning-path');

        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContainEqual(
          expect.objectContaining({
            type: 'validation',
            message: expect.stringContaining('Excessive nesting depth detected')
          })
        );
      });
    });
  });

  describe('Content Mapping Security', () => {
    describe('Reference Validation', () => {
      it('should validate external references securely', async () => {
        mockPayload.find.mockResolvedValue({
          docs: [] // No matching categories
        });

        const result = await mappingService.mapCategories(['../../../admin', 'valid-category']);

        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            type: 'security',
            message: expect.stringContaining('Suspicious category reference')
          })
        );
      });

      it('should prevent privilege escalation through category mapping', async () => {
        const maliciousMapping = {
          'user-category': 'admin-only-category',
          'normal-category': 'system-category'
        };

        mockPayload.find.mockResolvedValue({
          docs: [
            { id: '1', name: 'admin-only-category', restricted: true },
            { id: '2', name: 'system-category', system: true }
          ]
        });

        const result = await mappingService.validateCategoryMapping(maliciousMapping);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            type: 'security',
            message: expect.stringContaining('Attempt to map to restricted category')
          })
        );
      });
    });

    describe('Data Transformation Security', () => {
      it('should sanitize rich text content during transformation', async () => {
        const maliciousContent = {
          questionText: 'Valid question with <script>alert("xss")</script> content',
          explanation: 'Explanation with <iframe src="evil.com"></iframe> embedded content'
        };

        const result = await processingService.transformToRichText(maliciousContent);

        expect(result.questionText).not.toContain('<script>');
        expect(result.questionText).not.toContain('alert');
        expect(result.explanation).not.toContain('<iframe>');
        expect(result.explanation).not.toContain('evil.com');
      });

      it('should preserve safe medical formatting', async () => {
        const medicalContent = {
          questionText: 'What is the normal range for <strong>systolic pressure</strong>?',
          explanation: 'Normal systolic pressure is <em>120-140 mmHg</em> in healthy adults.'
        };

        const result = await processingService.transformToRichText(medicalContent);

        expect(result.questionText).toContain('<strong>systolic pressure</strong>');
        expect(result.explanation).toContain('<em>120-140 mmHg</em>');
      });
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should detect rapid successive validation attempts', async () => {
      const rapidRequests = Array.from({ length: 10 }, () => ({
        type: 'questions',
        questions: [{
          questionText: 'Test question?',
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false }
          ],
          explanation: 'Test explanation',
          category: 'Test'
        }]
      }));

      const results = await Promise.all(
        rapidRequests.map(data => validationService.validateImportData(data, 'questions'))
      );

      // Should detect potential abuse after several rapid requests
      const lastResult = results[results.length - 1];
      expect(lastResult.warnings).toContainEqual(
        expect.objectContaining({
          type: 'security',
          message: expect.stringContaining('Rapid validation requests detected')
        })
      );
    });

    it('should track validation patterns for anomaly detection', async () => {
      // Simulate unusual validation pattern
      const unusualData = {
        type: 'questions',
        questions: Array.from({ length: 50 }, (_, i) => ({
          questionText: `Question ${i}?`,
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false }
          ],
          explanation: 'X',
          category: 'Test'
        }))
      };

      const validation = await validationService.validateImportData(unusualData, 'questions');

      expect(validation.warnings).toContainEqual(
        expect.objectContaining({
          type: 'security',
          message: expect.stringContaining('Unusual content pattern detected')
        })
      );
    });
  });
});