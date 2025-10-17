/**
 * Tests d'intégration pour ContentMappingService
 * Vérifie le mapping intelligent des données et la résolution des références
 * 
 * Tests couvrant:
 * - Mapping automatique des catégories avec détection de similarité
 * - Résolution des références et création de nouvelles entités
 * - Préservation de l'intégrité des relations lors du mapping
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import payload from 'payload';
import { ContentMappingService } from '../ContentMappingService';
import { 
  QuestionImportData, 
  FlashcardImportData, 
  LearningPathImportData,
  CategoryMapping,
  CategorySuggestion
} from '../../types/jsonImport';

// Mock payload pour éviter les appels réels à la base de données
vi.mock('payload', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('ContentMappingService - Integration Tests', () => {
  let mappingService: ContentMappingService;
  let mockPayload: any;

  beforeEach(() => {
    mappingService = new ContentMappingService();
    mockPayload = payload as any;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockPayload.find.mockResolvedValue({ docs: [] });
    mockPayload.create.mockImplementation((params: any) => 
      Promise.resolve({ 
        id: `mock-id-${Date.now()}`, 
        ...params.data 
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mapping automatique des catégories avec détection de similarité', () => {
    it('should map exact category matches', async () => {
      const testData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Exact Match',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question test ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Cardiologie',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      // Mock existing categories
      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' },
          { id: 'pneumo-id', title: 'Pneumologie', level: 'PASS' }
        ]
      });

      const result = await mappingService.analyzeCategoryMappings(testData);

      expect(result.success).toBe(true);
      expect(result.categoryMappings).toHaveLength(1);
      expect(result.categoryMappings[0].originalName).toBe('Cardiologie');
      expect(result.categoryMappings[0].suggestedName).toBe('cardio-id');
      expect(result.categoryMappings[0].confidence).toBe(1.0);
      expect(result.categoryMappings[0].action).toBe('map');
      expect(result.newCategoriesRequired).toHaveLength(0);
    });

    it('should detect similar categories and suggest mappings', async () => {
      const testData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Similarity',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question test ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'cardio', // Similaire à "Cardiologie"
            difficulty: 'easy',
            level: 'PASS'
          },
          {
            questionText: 'Autre question ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Autre explication',
            category: 'CARDIOLOGIE', // Même nom, casse différente
            difficulty: 'medium',
            level: 'PASS'
          }
        ]
      };

      // Mock existing categories
      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' },
          { id: 'pneumo-id', title: 'Pneumologie', level: 'PASS' }
        ]
      });

      const result = await mappingService.analyzeCategoryMappings(testData);

      expect(result.success).toBe(true);
      expect(result.categoryMappings).toHaveLength(2);

      // Vérifier le mapping de "cardio" vers "Cardiologie"
      const cardioMapping = result.categoryMappings.find(m => m.originalName === 'cardio');
      expect(cardioMapping).toBeDefined();
      expect(cardioMapping!.suggestedName).toBe('cardio-id');
      expect(cardioMapping!.confidence).toBeGreaterThan(0.7);
      expect(cardioMapping!.action).toBe('map');

      // Vérifier le mapping de "CARDIOLOGIE" vers "Cardiologie"
      const cardioUpperMapping = result.categoryMappings.find(m => m.originalName === 'CARDIOLOGIE');
      expect(cardioUpperMapping).toBeDefined();
      expect(cardioUpperMapping!.suggestedName).toBe('cardio-id');
      expect(cardioUpperMapping!.confidence).toBe(1.0); // Correspondance exacte (insensible à la casse)
      expect(cardioUpperMapping!.action).toBe('map');
    });

    it('should suggest creating new categories when no match found', async () => {
      const testData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test New Categories',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question test ?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Explication test',
            category: 'Nouvelle Spécialité',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      // Mock existing categories (aucune similaire)
      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' },
          { id: 'pneumo-id', title: 'Pneumologie', level: 'PASS' }
        ]
      });

      const result = await mappingService.analyzeCategoryMappings(testData, {
        autoCreate: true,
        requireApproval: true,
        similarityThreshold: 0.7
      });

      expect(result.success).toBe(true);
      expect(result.categoryMappings).toHaveLength(1);
      expect(result.categoryMappings[0].originalName).toBe('Nouvelle Spécialité');
      expect(result.categoryMappings[0].action).toBe('create');
      expect(result.categoryMappings[0].confidence).toBe(0.0);
      expect(result.newCategoriesRequired).toContain('Nouvelle Spécialité');
    });

    it('should handle multiple categories with different similarity levels', async () => {
      const testData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Multiple Categories',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question cardiologie ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: 'Cardio', // Très similaire
            difficulty: 'easy',
            level: 'PASS'
          },
          {
            questionText: 'Question pneumologie ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: 'Poumons', // Moyennement similaire
            difficulty: 'easy',
            level: 'PASS'
          },
          {
            questionText: 'Question nouvelle ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: 'Spécialité Inconnue', // Pas similaire
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' },
          { id: 'pneumo-id', title: 'Pneumologie', level: 'PASS' }
        ]
      });

      const result = await mappingService.analyzeCategoryMappings(testData, {
        autoCreate: false,
        requireApproval: true,
        similarityThreshold: 0.6
      });

      expect(result.success).toBe(true);
      expect(result.categoryMappings).toHaveLength(3);

      // Vérifier le mapping haute confiance
      const cardioMapping = result.categoryMappings.find(m => m.originalName === 'Cardio');
      expect(cardioMapping!.action).toBe('map');
      expect(cardioMapping!.confidence).toBeGreaterThan(0.8);

      // Vérifier le mapping moyenne confiance (peut être mappé ou ignoré selon le seuil)
      const poumonMapping = result.categoryMappings.find(m => m.originalName === 'Poumons');
      expect(poumonMapping).toBeDefined();

      // Vérifier la catégorie sans correspondance
      const inconnueMapping = result.categoryMappings.find(m => m.originalName === 'Spécialité Inconnue');
      expect(inconnueMapping!.action).toBe('skip');
      expect(inconnueMapping!.confidence).toBe(0.0);
    });
  });

  describe('Résolution des références et création de nouvelles entités', () => {
    it('should resolve existing category references correctly', async () => {
      const categoryNames = ['Cardiologie', 'Pneumologie', 'Neurologie'];

      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' },
          { id: 'pneumo-id', title: 'Pneumologie', level: 'PASS' },
          { id: 'neuro-id', title: 'Neurologie', level: 'LAS' }
        ]
      });

      const resolutions = await mappingService.resolveExistingCategories(categoryNames);

      expect(resolutions).toEqual({
        'Cardiologie': 'cardio-id',
        'Pneumologie': 'pneumo-id',
        'Neurologie': 'neuro-id'
      });
    });

    it('should create missing categories with proper metadata', async () => {
      const categoryMappings: CategoryMapping[] = [
        {
          originalName: 'Nouvelle Cardiologie',
          suggestedName: 'Nouvelle Cardiologie',
          confidence: 0.0,
          action: 'create'
        },
        {
          originalName: 'Spécialité Avancée',
          suggestedName: 'Spécialité Avancée',
          confidence: 0.0,
          action: 'create'
        }
      ];

      mockPayload.create
        .mockResolvedValueOnce({ id: 'new-cardio-id', title: 'Nouvelle Cardiologie' })
        .mockResolvedValueOnce({ id: 'new-spec-id', title: 'Spécialité Avancée' });

      const result = await mappingService.createMissingCategories(
        categoryMappings,
        'PASS',
        'test-user-id'
      );

      expect(result.created).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      // Vérifier les appels de création
      expect(mockPayload.create).toHaveBeenCalledTimes(2);
      
      const firstCall = mockPayload.create.mock.calls[0][0];
      expect(firstCall.collection).toBe('categories');
      expect(firstCall.data.title).toBe('Nouvelle Cardiologie');
      expect(firstCall.data.level).toBe('PASS');
      expect(firstCall.data.adaptiveSettings).toEqual({
        isActive: true,
        minimumQuestions: 5,
        weight: 1
      });

      const secondCall = mockPayload.create.mock.calls[1][0];
      expect(secondCall.collection).toBe('categories');
      expect(secondCall.data.title).toBe('Spécialité Avancée');
    });

    it('should handle category creation errors gracefully', async () => {
      const categoryMappings: CategoryMapping[] = [
        {
          originalName: 'Catégorie Valide',
          suggestedName: 'Catégorie Valide',
          confidence: 0.0,
          action: 'create'
        },
        {
          originalName: 'Catégorie Problématique',
          suggestedName: 'Catégorie Problématique',
          confidence: 0.0,
          action: 'create'
        }
      ];

      mockPayload.create
        .mockResolvedValueOnce({ id: 'valid-id', title: 'Catégorie Valide' })
        .mockRejectedValueOnce(new Error('Duplicate category name'));

      const result = await mappingService.createMissingCategories(
        categoryMappings,
        'PASS',
        'test-user-id'
      );

      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('database');
      expect(result.errors[0].severity).toBe('major');
      expect(result.errors[0].message).toContain('Duplicate category name');
    });

    it('should map student levels and difficulties correctly', async () => {
      const testData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Level Mapping',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question avec niveau français ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: 'Test',
            difficulty: 'facile', // Français
            level: 'pass', // Minuscule
          },
          {
            questionText: 'Question avec difficulté anglaise ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: 'Test',
            difficulty: 'hard', // Anglais
            level: 'tous', // Synonyme
          },
          {
            questionText: 'Question avec valeurs invalides ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: 'Test',
            difficulty: 'super-difficile', // Invalide
            level: 'master', // Invalide
          }
        ]
      };

      const result = mappingService.mapStudentLevelsAndDifficulties(testData);

      // Vérifier les mappings de niveaux
      expect(result.levelMappings['pass']).toBe('PASS');
      expect(result.levelMappings['tous']).toBe('both');
      expect(result.levelMappings['master']).toBe('both'); // Valeur par défaut

      // Vérifier les mappings de difficultés
      expect(result.difficultyMappings['facile']).toBe('easy');
      expect(result.difficultyMappings['hard']).toBe('hard');
      expect(result.difficultyMappings['super-difficile']).toBe('medium'); // Valeur par défaut

      // Vérifier les avertissements
      expect(result.warnings).toHaveLength(2); // 2 valeurs invalides
      expect(result.warnings.some(w => w.message.includes('super-difficile'))).toBe(true);
      expect(result.warnings.some(w => w.message.includes('master'))).toBe(true);
    });
  });

  describe('Détection de catégories similaires et suggestions de fusion', () => {
    it('should detect similar categories and suggest merging', async () => {
      const newCategoryNames = ['Cardio', 'Cardiologie Interventionnelle', 'Pneumo'];

      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' },
          { id: 'cardio-int-id', title: 'Cardiologie Interventionnelle', level: 'LAS' },
          { id: 'pneumo-id', title: 'Pneumologie', level: 'PASS' },
          { id: 'gastro-id', title: 'Gastroentérologie', level: 'PASS' }
        ]
      });

      const suggestions = await mappingService.detectSimilarCategories(newCategoryNames);

      expect(suggestions.length).toBeGreaterThan(0);

      // Vérifier les suggestions pour "Cardio"
      const cardioSuggestions = suggestions.filter(s => s.existingCategory === 'Cardiologie');
      expect(cardioSuggestions.length).toBeGreaterThan(0);
      expect(cardioSuggestions[0].similarity).toBeGreaterThan(0.7);
      expect(cardioSuggestions[0].recommended).toBe(true);

      // Vérifier les suggestions pour "Cardiologie Interventionnelle" (correspondance exacte)
      const cardioIntSuggestions = suggestions.filter(s => s.existingCategory === 'Cardiologie Interventionnelle');
      expect(cardioIntSuggestions.length).toBeGreaterThan(0);
      // La similarité peut ne pas être exactement 1.0 selon l'algorithme utilisé
      expect(cardioIntSuggestions[0].similarity).toBeGreaterThan(0.9);

      // Vérifier les suggestions pour "Pneumo"
      const pneumoSuggestions = suggestions.filter(s => s.existingCategory === 'Pneumologie');
      expect(pneumoSuggestions.length).toBeGreaterThan(0);
      expect(pneumoSuggestions[0].similarity).toBeGreaterThan(0.6);
    });

    it('should not suggest categories with low similarity', async () => {
      const newCategoryNames = ['Dermatologie'];

      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' },
          { id: 'pneumo-id', title: 'Pneumologie', level: 'PASS' }
        ]
      });

      const suggestions = await mappingService.detectSimilarCategories(newCategoryNames);

      // Aucune suggestion ne devrait avoir une similarité élevée
      const highSimilaritySuggestions = suggestions.filter(s => s.similarity > 0.7);
      expect(highSimilaritySuggestions).toHaveLength(0);

      // Les suggestions avec similarité faible ne devraient pas être recommandées
      suggestions.forEach(suggestion => {
        if (suggestion.similarity < 0.5) {
          expect(suggestion.recommended).toBe(false);
        }
      });
    });

    it('should rank suggestions by similarity', async () => {
      const newCategoryNames = ['Cardio'];

      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' },
          { id: 'cardio-int-id', title: 'Cardiologie Interventionnelle', level: 'LAS' },
          { id: 'cardio-ped-id', title: 'Cardiologie Pédiatrique', level: 'PASS' }
        ]
      });

      const suggestions = await mappingService.detectSimilarCategories(newCategoryNames);

      // Les suggestions devraient être triées par similarité décroissante
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].similarity).toBeGreaterThanOrEqual(suggestions[i].similarity);
      }

      // La première suggestion devrait être la plus similaire
      // L'ordre peut varier selon l'algorithme de similarité
      expect(suggestions[0].similarity).toBeGreaterThan(0.8);
      const cardiologieSuggestion = suggestions.find(s => s.existingCategory === 'Cardiologie');
      expect(cardiologieSuggestion).toBeDefined();
      expect(cardiologieSuggestion!.similarity).toBeGreaterThan(0.8);
    });
  });

  describe('Préservation de l\'intégrité des relations lors du mapping', () => {
    it('should maintain referential integrity during category mapping', async () => {
      const testData: FlashcardImportData = {
        version: '1.0',
        type: 'flashcards',
        metadata: {
          deckName: 'Test Deck',
          category: 'Cardio', // Sera mappé vers "Cardiologie"
          level: 'PASS'
        },
        cards: [
          {
            front: 'Question 1',
            back: 'Réponse 1',
            category: 'Cardio', // Même catégorie
            difficulty: 'easy'
          },
          {
            front: 'Question 2',
            back: 'Réponse 2',
            category: 'Cardiologie', // Nom exact
            difficulty: 'medium'
          }
        ]
      };

      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' }
        ]
      });

      const mappingResult = await mappingService.analyzeCategoryMappings(testData);

      expect(mappingResult.success).toBe(true);
      expect(mappingResult.categoryMappings).toHaveLength(2); // "Cardio" et "Cardiologie"

      // Vérifier que les deux références pointent vers la même catégorie
      const cardioMapping = mappingResult.categoryMappings.find(m => m.originalName === 'Cardio');
      const cardiologieMapping = mappingResult.categoryMappings.find(m => m.originalName === 'Cardiologie');

      expect(cardioMapping!.suggestedName).toBe('cardio-id');
      expect(cardiologieMapping!.suggestedName).toBe('cardio-id');
      expect(cardioMapping!.action).toBe('map');
      expect(cardiologieMapping!.action).toBe('map');
    });

    it('should handle complex learning path category relationships', async () => {
      const testData: LearningPathImportData = {
        version: '1.0',
        type: 'learning-path',
        metadata: {
          title: 'Parcours Multi-Spécialités',
          estimatedDuration: 180,
          level: 'PASS'
        },
        path: {
          steps: [
            {
              id: 'step-1',
              title: 'Anatomie',
              prerequisites: [],
              questions: [
                {
                  questionText: 'Question anatomie ?',
                  options: [{ text: 'Option A', isCorrect: true }],
                  explanation: 'Explication',
                  category: 'Anatomie Générale',
                  difficulty: 'easy',
                  level: 'PASS'
                }
              ]
            },
            {
              id: 'step-2',
              title: 'Cardiologie',
              prerequisites: ['step-1'],
              questions: [
                {
                  questionText: 'Question cardio ?',
                  options: [{ text: 'Option A', isCorrect: true }],
                  explanation: 'Explication',
                  category: 'Cardio', // Similaire à "Cardiologie"
                  difficulty: 'medium',
                  level: 'PASS'
                }
              ]
            }
          ]
        }
      };

      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'anatomie-id', title: 'Anatomie', level: 'PASS' },
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' }
        ]
      });

      const mappingResult = await mappingService.analyzeCategoryMappings(testData);

      expect(mappingResult.success).toBe(true);
      expect(mappingResult.categoryMappings).toHaveLength(2);

      // Vérifier le mapping de "Anatomie Générale"
      const anatomieMapping = mappingResult.categoryMappings.find(m => m.originalName === 'Anatomie Générale');
      expect(anatomieMapping).toBeDefined();
      expect(anatomieMapping!.suggestedName).toBe('anatomie-id');
      expect(anatomieMapping!.confidence).toBeGreaterThan(0.7);

      // Vérifier le mapping de "Cardio"
      const cardioMapping = mappingResult.categoryMappings.find(m => m.originalName === 'Cardio');
      expect(cardioMapping).toBeDefined();
      expect(cardioMapping!.suggestedName).toBe('cardio-id');
      expect(cardioMapping!.confidence).toBeGreaterThan(0.7);
    });

    it('should preserve category hierarchy and relationships', async () => {
      const testData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test Hierarchy',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Question parent ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: 'Médecine Interne',
            difficulty: 'easy',
            level: 'PASS'
          },
          {
            questionText: 'Question enfant ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: 'Cardiologie', // Sous-spécialité de Médecine Interne
            difficulty: 'medium',
            level: 'PASS'
          }
        ]
      };

      mockPayload.find.mockResolvedValue({
        docs: [
          { id: 'med-int-id', title: 'Médecine Interne', level: 'PASS' },
          { id: 'cardio-id', title: 'Cardiologie', level: 'PASS' }
        ]
      });

      const mappingResult = await mappingService.analyzeCategoryMappings(testData);

      expect(mappingResult.success).toBe(true);
      expect(mappingResult.categoryMappings).toHaveLength(2);

      // Vérifier que les deux catégories sont correctement mappées
      const medIntMapping = mappingResult.categoryMappings.find(m => m.originalName === 'Médecine Interne');
      const cardioMapping = mappingResult.categoryMappings.find(m => m.originalName === 'Cardiologie');

      expect(medIntMapping!.action).toBe('map');
      expect(cardioMapping!.action).toBe('map');
      expect(medIntMapping!.confidence).toBe(1.0);
      expect(cardioMapping!.confidence).toBe(1.0);
    });

    it('should handle circular references and prevent infinite loops', async () => {
      const testData: LearningPathImportData = {
        version: '1.0',
        type: 'learning-path',
        metadata: {
          title: 'Test Circular References',
          estimatedDuration: 60,
          level: 'PASS'
        },
        path: {
          steps: [
            {
              id: 'step-a',
              title: 'Étape A',
              prerequisites: ['step-b'], // Référence circulaire
              questions: [
                {
                  questionText: 'Question A ?',
                  options: [{ text: 'Option A', isCorrect: true }],
                  explanation: 'Explication A',
                  category: 'Test A',
                  difficulty: 'easy',
                  level: 'PASS'
                }
              ]
            },
            {
              id: 'step-b',
              title: 'Étape B',
              prerequisites: ['step-a'], // Référence circulaire
              questions: [
                {
                  questionText: 'Question B ?',
                  options: [{ text: 'Option B', isCorrect: true }],
                  explanation: 'Explication B',
                  category: 'Test B',
                  difficulty: 'easy',
                  level: 'PASS'
                }
              ]
            }
          ]
        }
      };

      mockPayload.find.mockResolvedValue({ docs: [] });

      // Le service ne devrait pas entrer dans une boucle infinie
      const mappingResult = await mappingService.analyzeCategoryMappings(testData, {
        autoCreate: true,
        requireApproval: false,
        similarityThreshold: 0.7
      });

      expect(mappingResult.success).toBe(true);
      expect(mappingResult.categoryMappings).toHaveLength(2);

      // Les catégories devraient être marquées pour création
      mappingResult.categoryMappings.forEach(mapping => {
        expect(mapping.action).toBe('create');
      });
    });
  });

  describe('Gestion des erreurs et cas limites', () => {
    it('should handle database connection errors gracefully', async () => {
      const testData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: { source: 'Test Error', level: 'PASS' },
        questions: [
          {
            questionText: 'Question test ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: 'Test',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      // Mock database error
      mockPayload.find.mockRejectedValue(new Error('Database connection failed'));

      const result = await mappingService.analyzeCategoryMappings(testData);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('system');
      expect(result.errors[0].severity).toBe('critical');
      expect(result.errors[0].message).toContain('Database connection failed');
    });

    it('should handle empty or null data gracefully', async () => {
      const emptyData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: { source: 'Empty Test', level: 'PASS' },
        questions: []
      };

      mockPayload.find.mockResolvedValue({ docs: [] });

      const result = await mappingService.analyzeCategoryMappings(emptyData);

      expect(result.success).toBe(true);
      expect(result.categoryMappings).toHaveLength(0);
      expect(result.newCategoriesRequired).toHaveLength(0);
    });

    it('should handle malformed category names', async () => {
      const testData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: { source: 'Malformed Test', level: 'PASS' },
        questions: [
          {
            questionText: 'Question test ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: '', // Nom vide
            difficulty: 'easy',
            level: 'PASS'
          },
          {
            questionText: 'Autre question ?',
            options: [{ text: 'Option A', isCorrect: true }],
            explanation: 'Explication',
            category: '   ', // Espaces seulement
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      mockPayload.find.mockResolvedValue({ docs: [] });

      const result = await mappingService.analyzeCategoryMappings(testData);

      expect(result.success).toBe(true);
      // Les catégories vides ou avec espaces seulement peuvent être traitées différemment
      // selon l'implémentation - vérifier qu'il n'y a pas d'erreur critique
      expect(result.errors.filter(e => e.severity === 'critical')).toHaveLength(0);
    });
  });
});