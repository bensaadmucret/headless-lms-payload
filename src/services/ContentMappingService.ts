/**
 * Service de mapping de contenu pour le système d'import JSON
 * Responsable de la résolution des références et du mapping intelligent des données
 */

import payload from 'payload';
import { 
  CategoryMapping, 
  CategorySuggestion, 
  ImportError,
  ImportData,
  QuestionImportData,
  FlashcardImportData,
  LearningPathImportData
} from '../types/jsonImport';

export interface MappingResult {
  success: boolean;
  categoryMappings: CategoryMapping[];
  errors: ImportError[];
  warnings: ImportError[];
  newCategoriesRequired: string[];
}

export interface CategoryResolutionOptions {
  autoCreate: boolean;
  requireApproval: boolean;
  similarityThreshold: number; // 0-1, seuil de similarité pour suggestions
}

export class ContentMappingService {
  private readonly DEFAULT_SIMILARITY_THRESHOLD = 0.7;

  /**
   * Analyse et mappe les catégories référencées dans les données d'import
   */
  async analyzeCategoryMappings(
    data: ImportData, 
    options: CategoryResolutionOptions = {
      autoCreate: false,
      requireApproval: true,
      similarityThreshold: this.DEFAULT_SIMILARITY_THRESHOLD
    }
  ): Promise<MappingResult> {
    try {
      // Extraire toutes les catégories référencées
      const referencedCategories = this.extractReferencedCategories(data);
      
      // Obtenir les catégories existantes
      const existingCategories = await this.getExistingCategories();
      
      // Analyser les mappings nécessaires
      const mappings = await this.generateCategoryMappings(
        referencedCategories, 
        existingCategories, 
        options
      );

      // Identifier les nouvelles catégories à créer
      const newCategoriesRequired = mappings
        .filter(m => m.action === 'create')
        .map(m => m.originalName);

      return {
        success: true,
        categoryMappings: mappings,
        errors: [],
        warnings: this.generateMappingWarnings(mappings),
        newCategoriesRequired
      };

    } catch (error) {
      return {
        success: false,
        categoryMappings: [],
        errors: [{
          type: 'system',
          severity: 'critical',
          message: `Erreur lors de l'analyse des mappings: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez la connectivité à la base de données'
        }],
        warnings: [],
        newCategoriesRequired: []
      };
    }
  }

  /**
   * Résout automatiquement les références de catégories existantes
   */
  async resolveExistingCategories(categoryNames: string[]): Promise<Record<string, string>> {
    const resolutions: Record<string, string> = {};
    
    try {
      const existingCategories = await this.getExistingCategories();
      
      for (const categoryName of categoryNames) {
        // Recherche exacte d'abord
        const exactMatch = existingCategories.find(
          cat => cat.title.toLowerCase() === categoryName.toLowerCase()
        );
        
        if (exactMatch) {
          resolutions[categoryName] = exactMatch.id;
          continue;
        }

        // Recherche par similarité
        const similarCategory = this.findMostSimilarCategory(categoryName, existingCategories);
        if (similarCategory && similarCategory.similarity >= this.DEFAULT_SIMILARITY_THRESHOLD) {
          resolutions[categoryName] = similarCategory.category.id;
        }
      }

      return resolutions;

    } catch (error) {
      throw new Error(`Erreur lors de la résolution des catégories: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Crée les catégories manquantes avec validation utilisateur
   */
  async createMissingCategories(
    categoryMappings: CategoryMapping[], 
    defaultLevel: 'PASS' | 'LAS' | 'both' = 'both',
    userId?: string
  ): Promise<{ created: string[]; errors: ImportError[] }> {
    const created: string[] = [];
    const errors: ImportError[] = [];

    const categoriesToCreate = categoryMappings.filter(m => m.action === 'create');

    for (const mapping of categoriesToCreate) {
      try {
        const newCategory = await payload.create({
          collection: 'categories',
          data: {
            title: mapping.originalName,
            level: defaultLevel,
            adaptiveSettings: {
              isActive: true,
              minimumQuestions: 5,
              weight: 1
            }
          }
        });

        created.push(String(newCategory.id));

        // Mettre à jour le mapping avec l'ID créé
        mapping.suggestedName = String(newCategory.id);

      } catch (error) {
        errors.push({
          type: 'database',
          severity: 'major',
          message: `Impossible de créer la catégorie "${mapping.originalName}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez les permissions et la validité du nom de catégorie'
        });
      }
    }

    return { created, errors };
  }

  /**
   * Mappe les niveaux d'études et difficultés vers les énumérations système
   */
  mapStudentLevelsAndDifficulties(data: ImportData): {
    levelMappings: Record<string, string>;
    difficultyMappings: Record<string, string>;
    warnings: ImportError[];
  } {
    const levelMappings: Record<string, string> = {};
    const difficultyMappings: Record<string, string> = {};
    const warnings: ImportError[] = [];

    // Mappings des niveaux d'études
    const validLevels = ['PASS', 'LAS', 'both'];
    const levelSynonyms: Record<string, string> = {
      'pass': 'PASS',
      'las': 'LAS',
      'tous': 'both',
      'all': 'both',
      'both': 'both',
      'PASS': 'PASS',
      'LAS': 'LAS'
    };

    // Mappings des difficultés
    const validDifficulties = ['easy', 'medium', 'hard'];
    const difficultySynonyms: Record<string, string> = {
      'facile': 'easy',
      'easy': 'easy',
      'moyen': 'medium',
      'medium': 'medium',
      'difficile': 'hard',
      'hard': 'hard',
      'élevé': 'hard',
      'élevée': 'hard',
      'bas': 'easy',
      'basse': 'easy',
      'normal': 'medium',
      'normale': 'medium'
    };

    // Extraire et mapper les niveaux et difficultés
    const items = this.extractItemsFromData(data);
    
    items.forEach((item, index) => {
      // Mapper le niveau
      if (item.level) {
        const normalizedLevel = item.level.toLowerCase().trim();
        if (levelSynonyms[normalizedLevel]) {
          levelMappings[item.level] = levelSynonyms[normalizedLevel];
        } else {
          levelMappings[item.level] = 'both'; // Valeur par défaut
          warnings.push({
            type: 'mapping',
            severity: 'warning',
            itemIndex: index,
            field: 'level',
            message: `Niveau d'études non reconnu: "${item.level}", mappé vers "both"`,
            suggestion: `Utilisez une des valeurs: ${validLevels.join(', ')}`
          });
        }
      }

      // Mapper la difficulté
      if (item.difficulty) {
        const normalizedDifficulty = item.difficulty.toLowerCase().trim();
        if (difficultySynonyms[normalizedDifficulty]) {
          difficultyMappings[item.difficulty] = difficultySynonyms[normalizedDifficulty];
        } else {
          difficultyMappings[item.difficulty] = 'medium'; // Valeur par défaut
          warnings.push({
            type: 'mapping',
            severity: 'warning',
            itemIndex: index,
            field: 'difficulty',
            message: `Difficulté non reconnue: "${item.difficulty}", mappée vers "medium"`,
            suggestion: `Utilisez une des valeurs: ${validDifficulties.join(', ')}`
          });
        }
      }
    });

    return {
      levelMappings,
      difficultyMappings,
      warnings
    };
  }

  /**
   * Détecte les catégories similaires et suggère des fusions
   */
  async detectSimilarCategories(newCategoryNames: string[]): Promise<CategorySuggestion[]> {
    const suggestions: CategorySuggestion[] = [];
    
    try {
      const existingCategories = await this.getExistingCategories();
      
      for (const newName of newCategoryNames) {
        const similarCategories = existingCategories
          .map(cat => ({
            category: cat,
            similarity: this.calculateSimilarity(newName, cat.title)
          }))
          .filter(result => result.similarity >= 0.5) // Seuil minimum de similarité
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3); // Top 3 suggestions

        for (const similar of similarCategories) {
          suggestions.push({
            existingCategory: similar.category.title,
            similarity: similar.similarity,
            recommended: similar.similarity >= this.DEFAULT_SIMILARITY_THRESHOLD
          });
        }
      }

      return suggestions;

    } catch (error) {
      return [];
    }
  }

  /**
   * Extrait toutes les catégories référencées dans les données d'import
   */
  private extractReferencedCategories(data: ImportData): Set<string> {
    const categories = new Set<string>();

    switch (data.type) {
      case 'questions':
        const questionData = data as QuestionImportData;
        questionData.questions.forEach(q => {
          if (q.category) categories.add(q.category);
        });
        break;

      case 'flashcards':
        const flashcardData = data as FlashcardImportData;
        if (flashcardData.metadata.category) {
          categories.add(flashcardData.metadata.category);
        }
        flashcardData.cards.forEach(c => {
          if (c.category) categories.add(c.category);
        });
        break;

      case 'learning-path':
        const pathData = data as LearningPathImportData;
        pathData.path.steps.forEach(step => {
          step.questions.forEach(q => {
            if (q.category) categories.add(q.category);
          });
        });
        break;
    }

    return categories;
  }

  /**
   * Récupère toutes les catégories existantes
   */
  private async getExistingCategories(): Promise<Array<{ id: string; title: string; level: string }>> {
    try {
      const result = await payload.find({
        collection: 'categories',
        limit: 1000,
        select: {
          id: true,
          title: true,
          level: true
        }
      });

      return result.docs.map(doc => ({
        id: String(doc.id),
        title: doc.title,
        level: doc.level
      }));

    } catch (error) {
      throw new Error(`Erreur lors de la récupération des catégories: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Génère les mappings de catégories nécessaires
   */
  private async generateCategoryMappings(
    referencedCategories: Set<string>,
    existingCategories: Array<{ id: string; title: string; level: string }>,
    options: CategoryResolutionOptions
  ): Promise<CategoryMapping[]> {
    const mappings: CategoryMapping[] = [];

    for (const categoryName of referencedCategories) {
      // Recherche exacte
      const exactMatch = existingCategories.find(
        cat => cat.title.toLowerCase() === categoryName.toLowerCase()
      );

      if (exactMatch) {
        mappings.push({
          originalName: categoryName,
          suggestedName: exactMatch.id,
          confidence: 1.0,
          action: 'map'
        });
        continue;
      }

      // Recherche par similarité
      const similarCategory = this.findMostSimilarCategory(categoryName, existingCategories);
      
      if (similarCategory && similarCategory.similarity >= options.similarityThreshold) {
        mappings.push({
          originalName: categoryName,
          suggestedName: similarCategory.category.id,
          confidence: similarCategory.similarity,
          action: 'map'
        });
      } else if (options.autoCreate) {
        mappings.push({
          originalName: categoryName,
          suggestedName: categoryName,
          confidence: 0.0,
          action: 'create'
        });
      } else {
        mappings.push({
          originalName: categoryName,
          suggestedName: '',
          confidence: 0.0,
          action: 'skip'
        });
      }
    }

    return mappings;
  }

  /**
   * Trouve la catégorie la plus similaire
   */
  private findMostSimilarCategory(
    targetName: string, 
    categories: Array<{ id: string; title: string; level: string }>
  ): { category: { id: string; title: string; level: string }; similarity: number } | null {
    let bestMatch: { category: { id: string; title: string; level: string }; similarity: number } | null = null;

    for (const category of categories) {
      const similarity = this.calculateSimilarity(targetName, category.title);
      
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { category, similarity };
      }
    }

    return bestMatch;
  }

  /**
   * Calcule la similarité entre deux chaînes de caractères
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Correspondance exacte
    if (s1 === s2) return 1.0;

    // Correspondance par inclusion
    if (s1.includes(s2) || s2.includes(s1)) {
      return Math.max(s2.length / s1.length, s1.length / s2.length) * 0.9;
    }

    // Distance de Levenshtein normalisée
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    
    if (maxLength === 0) return 1.0;
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calcule la distance de Levenshtein entre deux chaînes
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1,     // deletion
          matrix[j - 1]![i]! + 1,     // insertion
          matrix[j - 1]![i - 1]! + indicator // substitution
        );
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Génère des avertissements basés sur les mappings
   */
  private generateMappingWarnings(mappings: CategoryMapping[]): ImportError[] {
    const warnings: ImportError[] = [];

    const skippedCategories = mappings.filter(m => m.action === 'skip');
    const lowConfidenceMappings = mappings.filter(m => m.action === 'map' && m.confidence < 0.8);
    const newCategories = mappings.filter(m => m.action === 'create');

    if (skippedCategories.length > 0) {
      warnings.push({
        type: 'mapping',
        severity: 'warning',
        message: `${skippedCategories.length} catégorie(s) ignorée(s): ${skippedCategories.map(c => c.originalName).join(', ')}`,
        suggestion: 'Créez ces catégories manuellement ou ajustez les seuils de similarité'
      });
    }

    if (lowConfidenceMappings.length > 0) {
      warnings.push({
        type: 'mapping',
        severity: 'minor',
        message: `${lowConfidenceMappings.length} mapping(s) avec faible confiance détecté(s)`,
        suggestion: 'Vérifiez les mappings suggérés avant l\'import final'
      });
    }

    if (newCategories.length > 0) {
      warnings.push({
        type: 'mapping',
        severity: 'minor',
        message: `${newCategories.length} nouvelle(s) catégorie(s) sera/seront créée(s): ${newCategories.map(c => c.originalName).join(', ')}`,
        suggestion: 'Vérifiez que ces noms de catégories sont appropriés'
      });
    }

    return warnings;
  }

  /**
   * Extrait les items avec leurs niveaux et difficultés des données d'import
   */
  private extractItemsFromData(data: ImportData): Array<{ level?: string; difficulty?: string }> {
    const items: Array<{ level?: string; difficulty?: string }> = [];

    switch (data.type) {
      case 'questions':
        const questionData = data as QuestionImportData;
        questionData.questions.forEach(q => {
          items.push({ level: q.level, difficulty: q.difficulty });
        });
        break;

      case 'flashcards':
        const flashcardData = data as FlashcardImportData;
        flashcardData.cards.forEach(c => {
          items.push({ 
            level: flashcardData.metadata.level, 
            difficulty: c.difficulty 
          });
        });
        break;

      case 'learning-path':
        const pathData = data as LearningPathImportData;
        pathData.path.steps.forEach(step => {
          step.questions.forEach(q => {
            items.push({ level: q.level, difficulty: q.difficulty });
          });
        });
        break;
    }

    return items;
  }
}