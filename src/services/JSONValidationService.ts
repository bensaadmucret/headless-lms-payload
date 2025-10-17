/**
 * Service de validation JSON pour le système d'import
 * Responsable de la validation des schémas JSON et de l'intégrité des données
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { 
  ImportData, 
  ValidationResponse, 
  ImportError, 
  ImportType,
  QuestionImportData,
  FlashcardImportData,
  LearningPathImportData
} from '../types/jsonImport';
import { 
  importSchemas, 
  getSchemaForImportType, 
  businessRules 
} from '../schemas/jsonImportSchemas';
import { ValidationService } from './ValidationService';
import payload from 'payload';

export class JSONValidationService {
  private ajv: Ajv;
  private validationService: ValidationService;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false // Permet plus de flexibilité pour les schémas
    });
    addFormats(this.ajv);
    this.validationService = new ValidationService();
  }

  /**
   * Valide un fichier JSON d'import selon son type
   */
  async validateImportData(data: any, importType: ImportType): Promise<ValidationResponse> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    try {
      // 1. Validation du schéma JSON
      const schemaValidation = this.validateSchema(data, importType);
      if (!schemaValidation.isValid) {
        errors.push(...schemaValidation.errors);
      }

      // 2. Validation des règles métier
      const businessValidation = await this.validateBusinessRules(data, importType);
      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);

      // 3. Validation des références (catégories, etc.)
      const referenceValidation = await this.validateReferences(data, importType);
      errors.push(...referenceValidation.errors);
      warnings.push(...referenceValidation.warnings);

      // 4. Détection des doublons
      const duplicateValidation = this.validateDuplicates(data, importType);
      warnings.push(...duplicateValidation.warnings);

      // 5. Calcul du résumé
      const summary = this.generateValidationSummary(data, importType, errors, duplicateValidation.duplicateCount);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'system',
          severity: 'critical',
          message: `Erreur lors de la validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez le format du fichier JSON'
        }],
        warnings: [],
        summary: {
          totalItems: 0,
          validItems: 0,
          invalidItems: 0,
          duplicates: 0,
          missingCategories: []
        }
      };
    }
  }

  /**
   * Validation du schéma JSON
   */
  private validateSchema(data: any, importType: ImportType): { isValid: boolean; errors: ImportError[] } {
    const schema = getSchemaForImportType(importType);
    if (!schema) {
      return {
        isValid: false,
        errors: [{
          type: 'validation',
          severity: 'critical',
          message: `Type d'import non supporté: ${importType}`,
          suggestion: 'Utilisez un type valide: questions, flashcards, learning-path'
        }]
      };
    }

    const validate = this.ajv.compile(schema);
    const isValid = validate(data);

    if (!isValid && validate.errors && Array.isArray(validate.errors)) {
      const errors: ImportError[] = validate.errors.map((error, index) => ({
        type: 'validation',
        severity: 'major',
        field: error.instancePath || error.schemaPath,
        message: this.formatAjvError(error),
        suggestion: this.getSuggestionForError(error)
      }));

      return { isValid: false, errors };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Validation des règles métier spécifiques
   */
  private async validateBusinessRules(data: ImportData, importType: ImportType): Promise<{ errors: ImportError[]; warnings: ImportError[] }> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    try {
      switch (importType) {
        case 'questions':
          const questionData = data as QuestionImportData;
          if (questionData.questions && Array.isArray(questionData.questions)) {
            questionData.questions.forEach((question, index) => {
              // Validation des options correctes
              const optionValidation = businessRules.validateCorrectOptions(question.options);
              if (!optionValidation.isValid && optionValidation.error) {
                errors.push({
                  type: 'validation',
                  severity: 'major',
                  itemIndex: index,
                  field: 'options',
                  message: optionValidation.error,
                  suggestion: 'Marquez exactement une option comme correcte (isCorrect: true)'
                });
              }

              // Validation de la cohérence des questions
              this.validateQuestionCoherence(question, index, errors, warnings);

              // Validation des formats de champs
              this.validateFieldFormats(question, index, errors, warnings);

              // Validation de la qualité du contenu
              this.validateContentQuality(question, index, warnings);
            });
          }
          break;

        case 'learning-path':
          const pathData = data as LearningPathImportData;
          if (pathData.path && pathData.path.steps && Array.isArray(pathData.path.steps)) {
            // Validation des prérequis
            const prereqValidation = businessRules.validatePrerequisites(pathData.path.steps);
            if (!prereqValidation.isValid) {
              prereqValidation.errors.forEach(error => {
                errors.push({
                  type: 'reference',
                  severity: 'major',
                  message: error,
                  suggestion: 'Vérifiez que tous les prérequis référencent des étapes existantes'
                });
              });
            }

            // Validation des dépendances circulaires
            const circularValidation = businessRules.validateCircularDependencies(pathData.path.steps);
            if (!circularValidation.isValid && circularValidation.error) {
              errors.push({
                type: 'validation',
                severity: 'critical',
                message: circularValidation.error,
                suggestion: 'Réorganisez les prérequis pour éviter les références circulaires'
              });
            }

            // Validation de la cohérence du parcours
            this.validateLearningPathCoherence(pathData, errors, warnings);
          }
          break;

        case 'flashcards':
          const flashcardData = data as FlashcardImportData;
          if (flashcardData.cards && Array.isArray(flashcardData.cards)) {
            flashcardData.cards.forEach((card, index) => {
              // Validation du contenu des flashcards
              this.validateFlashcardContent(card, index, errors, warnings);
            });
          }
          break;
      }
    } catch (error) {
      errors.push({
        type: 'system',
        severity: 'critical',
        message: `Erreur lors de la validation des règles métier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        suggestion: 'Vérifiez la structure des données'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validation des références (catégories, cours, etc.)
   */
  private async validateReferences(data: ImportData, importType: ImportType): Promise<{ errors: ImportError[]; warnings: ImportError[] }> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    try {
      // Collecte des catégories référencées
      const referencedCategories = this.extractReferencedCategories(data, importType);
      
      if (referencedCategories.size > 0) {
        // Vérifier l'existence des catégories dans la base de données
        const existingCategories = await this.getExistingCategories(Array.from(referencedCategories));
        const missingCategories = Array.from(referencedCategories).filter(
          cat => !existingCategories.some(existing => 
            existing.title.toLowerCase() === cat.toLowerCase()
          )
        );

        // Ajouter des avertissements pour les catégories manquantes
        missingCategories.forEach(category => {
          warnings.push({
            type: 'reference',
            severity: 'warning',
            message: `Catégorie "${category}" n'existe pas dans le système`,
            suggestion: 'Cette catégorie sera créée automatiquement lors de l\'import ou mappée vers une catégorie existante'
          });
        });

        // Validation des niveaux d'études pour les catégories existantes
        await this.validateCategoryLevels(data, importType, existingCategories, errors, warnings);
      }
    } catch (error) {
      warnings.push({
        type: 'system',
        severity: 'minor',
        message: `Impossible de vérifier les références: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        suggestion: 'Les références seront vérifiées lors de l\'import'
      });
    }

    return { errors, warnings };
  }

  /**
   * Détection des doublons dans le fichier d'import
   */
  private validateDuplicates(data: ImportData, importType: ImportType): { warnings: ImportError[]; duplicateCount: number } {
    const warnings: ImportError[] = [];
    const seen = new Map<string, number>(); // Map pour stocker la première occurrence
    let duplicateCount = 0;

    switch (importType) {
      case 'questions':
        const questionData = data as QuestionImportData;
        if (questionData.questions && Array.isArray(questionData.questions)) {
          questionData.questions.forEach((question, index) => {
            const key = this.generateQuestionKey(question);
            if (seen.has(key)) {
              const firstIndex = seen.get(key)!;
              duplicateCount++;
              warnings.push({
                type: 'validation',
                severity: 'warning',
                itemIndex: index,
                message: `Question dupliquée (identique à la question ${firstIndex + 1})`,
                suggestion: 'Supprimez cette question ou modifiez-la pour la différencier'
              });
            } else {
              seen.set(key, index);
            }
          });
        }
        break;

      case 'flashcards':
        const flashcardData = data as FlashcardImportData;
        if (flashcardData.cards && Array.isArray(flashcardData.cards)) {
          flashcardData.cards.forEach((card, index) => {
            const key = this.generateFlashcardKey(card);
            if (seen.has(key)) {
              const firstIndex = seen.get(key)!;
              duplicateCount++;
              warnings.push({
                type: 'validation',
                severity: 'warning',
                itemIndex: index,
                message: `Flashcard dupliquée (identique à la flashcard ${firstIndex + 1})`,
                suggestion: 'Supprimez cette flashcard ou modifiez-la pour la différencier'
              });
            } else {
              seen.set(key, index);
            }
          });
        }
        break;

      case 'learning-path':
        const pathData = data as LearningPathImportData;
        if (pathData.path?.steps && Array.isArray(pathData.path.steps)) {
          // Vérifier les doublons d'étapes
          const stepSeen = new Map<string, number>();
          pathData.path.steps.forEach((step, stepIndex) => {
            const stepKey = step.id.toLowerCase().trim();
            if (stepSeen.has(stepKey)) {
              const firstStepIndex = stepSeen.get(stepKey)!;
              warnings.push({
                type: 'validation',
                severity: 'major',
                itemIndex: stepIndex,
                field: 'id',
                message: `ID d'étape dupliqué "${step.id}" (identique à l'étape ${firstStepIndex + 1})`,
                suggestion: 'Changez l\'ID de cette étape pour qu\'il soit unique'
              });
            } else {
              stepSeen.set(stepKey, stepIndex);
            }

            // Vérifier les doublons de questions dans chaque étape
            if (step.questions && Array.isArray(step.questions)) {
              step.questions.forEach((question, questionIndex) => {
                const key = this.generateQuestionKey(question);
                if (seen.has(key)) {
                  const firstIndex = seen.get(key)!;
                  duplicateCount++;
                  warnings.push({
                    type: 'validation',
                    severity: 'warning',
                    itemIndex: stepIndex,
                    message: `Question dupliquée dans l'étape "${step.title}" (identique à une question précédente)`,
                    suggestion: 'Supprimez cette question ou modifiez-la pour la différencier'
                  });
                } else {
                  seen.set(key, stepIndex);
                }
              });
            }
          });
        }
        break;
    }

    return { warnings, duplicateCount };
  }

  /**
   * Génère un résumé de la validation
   */
  private generateValidationSummary(data: ImportData, importType: ImportType, errors: ImportError[], duplicateCount: number = 0) {
    let totalItems = 0;
    let referencedCategories = new Set<string>();

    try {
      referencedCategories = this.extractReferencedCategories(data, importType);

      switch (importType) {
        case 'questions':
          const questionData = data as QuestionImportData;
          totalItems = questionData.questions?.length || 0;
          break;
        case 'flashcards':
          const flashcardData = data as FlashcardImportData;
          totalItems = flashcardData.cards?.length || 0;
          break;
        case 'learning-path':
          const pathData = data as LearningPathImportData;
          if (pathData.path?.steps && Array.isArray(pathData.path.steps)) {
            totalItems = pathData.path.steps.reduce((sum, step) => {
              return sum + (step.questions?.length || 0);
            }, 0);
          }
          break;
      }
    } catch (error) {
      // En cas d'erreur, retourner des valeurs par défaut
      totalItems = 0;
      referencedCategories = new Set<string>();
    }

    const invalidItems = errors.filter(e => e.itemIndex !== undefined).length;
    const validItems = Math.max(0, totalItems - invalidItems);

    return {
      totalItems,
      validItems,
      invalidItems,
      duplicates: duplicateCount,
      missingCategories: Array.from(referencedCategories)
    };
  }

  /**
   * Extrait les catégories référencées dans les données d'import
   */
  private extractReferencedCategories(data: ImportData, importType: ImportType): Set<string> {
    const categories = new Set<string>();

    try {
      switch (importType) {
        case 'questions':
          const questionData = data as QuestionImportData;
          if (questionData.questions && Array.isArray(questionData.questions)) {
            questionData.questions.forEach(q => {
              if (q.category) categories.add(q.category);
            });
          }
          break;
        case 'flashcards':
          const flashcardData = data as FlashcardImportData;
          if (flashcardData.cards && Array.isArray(flashcardData.cards)) {
            flashcardData.cards.forEach(c => {
              if (c.category) categories.add(c.category);
            });
          }
          if (flashcardData.metadata?.category) {
            categories.add(flashcardData.metadata.category);
          }
          break;
        case 'learning-path':
          const pathData = data as LearningPathImportData;
          if (pathData.path?.steps && Array.isArray(pathData.path.steps)) {
            pathData.path.steps.forEach(step => {
              if (step.questions && Array.isArray(step.questions)) {
                step.questions.forEach(q => {
                  if (q.category) categories.add(q.category);
                });
              }
            });
          }
          break;
      }
    } catch (error) {
      // En cas d'erreur, retourner un set vide
    }

    return categories;
  }

  /**
   * Génère une clé unique pour une question (détection de doublons)
   */
  private generateQuestionKey(question: any): string {
    const text = question.questionText?.toLowerCase().trim() || '';
    const options = question.options && Array.isArray(question.options)
      ? question.options
          .map((opt: any) => opt.text?.toLowerCase().trim() || '')
          .sort()
          .join('|')
      : '';
    return `${text}-${options}`;
  }

  /**
   * Génère une clé unique pour une flashcard (détection de doublons)
   */
  private generateFlashcardKey(card: any): string {
    const front = card.front?.toLowerCase().trim() || '';
    const back = card.back?.toLowerCase().trim() || '';
    return `${front}-${back}`;
  }

  /**
   * Formate les erreurs AJV pour un affichage plus convivial
   */
  private formatAjvError(error: any): string {
    try {
      switch (error.keyword) {
      case 'required':
        return `Champ requis manquant: ${error.params?.missingProperty || 'champ inconnu'}`;
      case 'type':
        return `Type incorrect: attendu ${error.params?.type || 'type valide'}`;
      case 'enum':
        return `Valeur non autorisée. Valeurs acceptées: ${error.params?.allowedValues?.join(', ') || 'voir documentation'}`;
      case 'minLength':
        return `Texte trop court (minimum ${error.params?.limit || 0} caractères)`;
      case 'maxLength':
        return `Texte trop long (maximum ${error.params?.limit || 0} caractères)`;
      case 'minItems':
        return `Pas assez d'éléments (minimum ${error.params?.limit || 0})`;
      case 'maxItems':
        return `Trop d'éléments (maximum ${error.params?.limit || 0})`;
      default:
        return error.message || 'Erreur de validation';
      }
    } catch (e) {
      return `Erreur de validation: ${error.message || 'erreur inconnue'}`;
    }
  }

  /**
   * Fournit des suggestions de correction pour les erreurs courantes
   */
  private getSuggestionForError(error: any): string {
    try {
      switch (error.keyword) {
      case 'required':
        return `Ajoutez le champ "${error.params?.missingProperty || 'requis'}" à votre objet`;
      case 'enum':
        return `Utilisez une des valeurs suivantes: ${error.params?.allowedValues?.join(', ') || 'voir documentation'}`;
      case 'minLength':
        return 'Ajoutez plus de contenu à ce champ';
      case 'type':
        return `Changez le type de données vers ${error.params?.type || 'type valide'}`;
      default:
        return 'Consultez la documentation pour le format correct';
      }
    } catch (e) {
      return 'Consultez la documentation pour le format correct';
    }
  }

  /**
   * Récupère les catégories existantes dans la base de données
   */
  private async getExistingCategories(categoryNames: string[]): Promise<Array<{ id: string; title: string; level: string }>> {
    try {
      if (categoryNames.length === 0) return [];

      const result = await payload.find({
        collection: 'categories',
        where: {
          title: {
            in: categoryNames
          }
        },
        limit: 1000, // Limite raisonnable pour éviter les problèmes de performance
        select: {
          id: true,
          title: true,
          level: true
        }
      });

      return result.docs.map(doc => ({
        id: doc.id,
        title: doc.title,
        level: doc.level
      }));
    } catch (error) {
      // En cas d'erreur, retourner un tableau vide
      // L'erreur sera gérée au niveau supérieur
      return [];
    }
  }

  /**
   * Valide la compatibilité des niveaux d'études entre les données importées et les catégories existantes
   */
  private async validateCategoryLevels(
    data: ImportData, 
    importType: ImportType, 
    existingCategories: Array<{ id: string; title: string; level: string }>,
    errors: ImportError[],
    warnings: ImportError[]
  ): Promise<void> {
    try {
      const items = this.getItemsFromData(data, importType);
      
      items.forEach((item, index) => {
        if (item.category && item.level) {
          const existingCategory = existingCategories.find(
            cat => cat.title.toLowerCase() === item.category.toLowerCase()
          );

          if (existingCategory) {
            const isCompatible = this.isLevelCompatible(item.level, existingCategory.level);
            
            if (!isCompatible) {
              warnings.push({
                type: 'reference',
                severity: 'warning',
                itemIndex: index,
                field: 'level',
                message: `Niveau "${item.level}" incompatible avec la catégorie "${item.category}" (niveau: ${existingCategory.level})`,
                suggestion: `Changez le niveau vers "${existingCategory.level}" ou utilisez une catégorie compatible`
              });
            }
          }
        }
      });
    } catch (error) {
      // En cas d'erreur, ajouter un avertissement général
      warnings.push({
        type: 'system',
        severity: 'minor',
        message: 'Impossible de valider la compatibilité des niveaux d\'études',
        suggestion: 'La validation sera effectuée lors de l\'import'
      });
    }
  }

  /**
   * Vérifie si un niveau d'études est compatible avec le niveau d'une catégorie
   */
  private isLevelCompatible(itemLevel: string, categoryLevel: string): boolean {
    // Si la catégorie accepte les deux niveaux, toujours compatible
    if (categoryLevel === 'both') return true;
    
    // Si l'item est pour les deux niveaux, compatible avec toute catégorie
    if (itemLevel === 'both') return true;
    
    // Sinon, les niveaux doivent correspondre exactement
    return itemLevel === categoryLevel;
  }

  /**
   * Extrait les items (questions, flashcards, etc.) des données d'import
   */
  private getItemsFromData(data: ImportData, importType: ImportType): Array<{ category: string; level: string }> {
    const items: Array<{ category: string; level: string }> = [];

    try {
      switch (importType) {
        case 'questions':
          const questionData = data as QuestionImportData;
          if (questionData.questions && Array.isArray(questionData.questions)) {
            questionData.questions.forEach(q => {
              if (q.category && q.level) {
                items.push({ category: q.category, level: q.level });
              }
            });
          }
          break;

        case 'flashcards':
          const flashcardData = data as FlashcardImportData;
          if (flashcardData.cards && Array.isArray(flashcardData.cards)) {
            flashcardData.cards.forEach(c => {
              if (c.category) {
                // Pour les flashcards, utiliser le niveau des métadonnées
                const level = flashcardData.metadata?.level || 'both';
                items.push({ category: c.category, level });
              }
            });
          }
          break;

        case 'learning-path':
          const pathData = data as LearningPathImportData;
          if (pathData.path?.steps && Array.isArray(pathData.path.steps)) {
            pathData.path.steps.forEach(step => {
              if (step.questions && Array.isArray(step.questions)) {
                step.questions.forEach(q => {
                  if (q.category && q.level) {
                    items.push({ category: q.category, level: q.level });
                  }
                });
              }
            });
          }
          break;
      }
    } catch (error) {
      // En cas d'erreur, retourner un tableau vide
    }

    return items;
  }

  /**
   * Valide la cohérence d'une question (options, bonnes réponses, etc.)
   */
  private validateQuestionCoherence(question: any, index: number, errors: ImportError[], warnings: ImportError[]): void {
    try {
      // Vérifier que les options sont distinctes
      if (question.options && Array.isArray(question.options)) {
        const optionTexts = question.options.map((opt: any) => opt.text?.toLowerCase().trim()).filter(Boolean);
        const uniqueOptions = new Set(optionTexts);
        
        if (optionTexts.length !== uniqueOptions.size) {
          warnings.push({
            type: 'validation',
            severity: 'warning',
            itemIndex: index,
            field: 'options',
            message: 'Options similaires ou identiques détectées',
            suggestion: 'Assurez-vous que chaque option est distincte et claire'
          });
        }

        // Vérifier que la bonne réponse n'est pas évidente
        const correctOption = question.options.find((opt: any) => opt.isCorrect);
        if (correctOption && correctOption.text) {
          const correctText = correctOption.text.toLowerCase();
          const obviousWords = ['correct', 'bonne', 'vraie', 'oui', 'exact', 'juste'];
          
          if (obviousWords.some(word => correctText.includes(word))) {
            warnings.push({
              type: 'validation',
              severity: 'minor',
              itemIndex: index,
              field: 'options',
              message: 'La bonne réponse pourrait être trop évidente',
              suggestion: 'Reformulez les options pour éviter les indices évidents'
            });
          }
        }

        // Vérifier la longueur des options
        question.options.forEach((option: any, optIndex: number) => {
          if (option.text && option.text.length > 200) {
            warnings.push({
              type: 'validation',
              severity: 'minor',
              itemIndex: index,
              field: `options[${optIndex}]`,
              message: 'Option très longue, pourrait être difficile à lire',
              suggestion: 'Raccourcissez le texte de l\'option ou divisez la question'
            });
          }
        });
      }

      // Vérifier la cohérence entre question et explication
      if (question.questionText && question.explanation) {
        const questionWords = question.questionText.toLowerCase().split(/\s+/);
        const explanationWords = question.explanation.toLowerCase().split(/\s+/);
        const commonWords = questionWords.filter(word => 
          word.length > 3 && explanationWords.includes(word)
        );

        if (commonWords.length < 2) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: 'explanation',
            message: 'L\'explication semble peu liée à la question',
            suggestion: 'Assurez-vous que l\'explication répond directement à la question'
          });
        }
      }
    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }

  /**
   * Valide les formats des champs (difficulté, niveau étudiant, etc.)
   */
  private validateFieldFormats(question: any, index: number, errors: ImportError[], warnings: ImportError[]): void {
    try {
      // Validation du niveau de difficulté
      if (question.difficulty) {
        const validDifficulties = ['easy', 'medium', 'hard'];
        if (!validDifficulties.includes(question.difficulty)) {
          errors.push({
            type: 'validation',
            severity: 'major',
            itemIndex: index,
            field: 'difficulty',
            message: `Niveau de difficulté invalide: "${question.difficulty}"`,
            suggestion: `Utilisez une des valeurs: ${validDifficulties.join(', ')}`
          });
        }
      }

      // Validation du niveau étudiant
      if (question.level) {
        const validLevels = ['PASS', 'LAS', 'both'];
        if (!validLevels.includes(question.level)) {
          errors.push({
            type: 'validation',
            severity: 'major',
            itemIndex: index,
            field: 'level',
            message: `Niveau étudiant invalide: "${question.level}"`,
            suggestion: `Utilisez une des valeurs: ${validLevels.join(', ')}`
          });
        }
      }

      // Validation des tags
      if (question.tags && Array.isArray(question.tags)) {
        question.tags.forEach((tag: any, tagIndex: number) => {
          if (typeof tag !== 'string' || tag.trim().length === 0) {
            warnings.push({
              type: 'validation',
              severity: 'minor',
              itemIndex: index,
              field: `tags[${tagIndex}]`,
              message: 'Tag vide ou invalide détecté',
              suggestion: 'Supprimez les tags vides ou corrigez leur format'
            });
          } else if (tag.length > 50) {
            warnings.push({
              type: 'validation',
              severity: 'minor',
              itemIndex: index,
              field: `tags[${tagIndex}]`,
              message: 'Tag très long détecté',
              suggestion: 'Raccourcissez le tag ou divisez-le en plusieurs tags'
            });
          }
        });

        // Vérifier les doublons dans les tags
        const uniqueTags = new Set(question.tags.map((tag: string) => tag.toLowerCase().trim()));
        if (question.tags.length !== uniqueTags.size) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: 'tags',
            message: 'Tags dupliqués détectés',
            suggestion: 'Supprimez les tags en double'
          });
        }
      }

      // Validation de la catégorie
      if (question.category) {
        if (typeof question.category !== 'string' || question.category.trim().length === 0) {
          errors.push({
            type: 'validation',
            severity: 'major',
            itemIndex: index,
            field: 'category',
            message: 'Catégorie vide ou invalide',
            suggestion: 'Spécifiez une catégorie valide pour cette question'
          });
        } else if (question.category.length > 100) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: 'category',
            message: 'Nom de catégorie très long',
            suggestion: 'Raccourcissez le nom de la catégorie'
          });
        }
      }
    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }

  /**
   * Valide la qualité du contenu (longueur, clarté, etc.)
   */
  private validateContentQuality(question: any, index: number, warnings: ImportError[]): void {
    try {
      // Validation de la longueur du texte de la question
      if (question.questionText) {
        if (question.questionText.length < 10) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: 'questionText',
            message: 'Question très courte, pourrait manquer de contexte',
            suggestion: 'Considérez ajouter plus de détails à la question'
          });
        } else if (question.questionText.length > 500) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: 'questionText',
            message: 'Question très longue, pourrait être difficile à lire',
            suggestion: 'Raccourcissez la question ou divisez-la en plusieurs parties'
          });
        }

        // Vérifier la présence d'un point d'interrogation
        if (!question.questionText.includes('?')) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: 'questionText',
            message: 'La question ne contient pas de point d\'interrogation',
            suggestion: 'Assurez-vous que la formulation est interrogative'
          });
        }
      }

      // Validation de la longueur de l'explication
      if (question.explanation) {
        if (question.explanation.length < 20) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: 'explanation',
            message: 'Explication très courte',
            suggestion: 'Une explication détaillée améliore l\'apprentissage'
          });
        } else if (question.explanation.length > 1000) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: 'explanation',
            message: 'Explication très longue',
            suggestion: 'Raccourcissez l\'explication pour améliorer la lisibilité'
          });
        }
      }

      // Validation du nombre d'options
      if (question.options && Array.isArray(question.options)) {
        if (question.options.length < 2) {
          warnings.push({
            type: 'validation',
            severity: 'warning',
            itemIndex: index,
            field: 'options',
            message: 'Moins de 2 options disponibles',
            suggestion: 'Ajoutez au moins 2 options pour créer un choix valide'
          });
        } else if (question.options.length > 6) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: 'options',
            message: 'Beaucoup d\'options (plus de 6)',
            suggestion: 'Considérez réduire le nombre d\'options pour améliorer la lisibilité'
          });
        }
      }
    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }

  /**
   * Valide la cohérence d'un parcours d'apprentissage
   */
  private validateLearningPathCoherence(pathData: LearningPathImportData, errors: ImportError[], warnings: ImportError[]): void {
    try {
      if (!pathData.path?.steps || !Array.isArray(pathData.path.steps)) return;

      // Vérifier la progression logique des étapes
      const stepsWithoutPrereq = pathData.path.steps.filter(step => 
        !step.prerequisites || step.prerequisites.length === 0
      );

      if (stepsWithoutPrereq.length === 0) {
        errors.push({
          type: 'validation',
          severity: 'major',
          message: 'Aucune étape de départ trouvée (toutes les étapes ont des prérequis)',
          suggestion: 'Au moins une étape doit être accessible sans prérequis'
        });
      } else if (stepsWithoutPrereq.length > 3) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          message: `Beaucoup d'étapes de départ (${stepsWithoutPrereq.length})`,
          suggestion: 'Considérez organiser les étapes en séquence plus linéaire'
        });
      }

      // Validation avancée des structures de parcours avec prérequis
      this.validateLearningPathStructure(pathData, errors, warnings);

      // Validation des relations entre étapes et questions
      this.validateStepQuestionRelations(pathData, errors, warnings);

      // Vérifier la cohérence des durées estimées
      const totalEstimatedTime = pathData.path.steps.reduce((sum, step) => 
        sum + (step.estimatedTime || 0), 0
      );

      if (pathData.metadata.estimatedDuration && totalEstimatedTime > 0) {
        const difference = Math.abs(pathData.metadata.estimatedDuration - totalEstimatedTime);
        const percentageDiff = (difference / pathData.metadata.estimatedDuration) * 100;

        if (percentageDiff > 20) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            message: `Incohérence dans les durées estimées (${percentageDiff.toFixed(1)}% de différence)`,
            suggestion: 'Vérifiez la cohérence entre la durée totale et la somme des étapes'
          });
        }
      }

      // Vérifier la distribution des questions par étape
      pathData.path.steps.forEach((step, index) => {
        if (!step.questions || step.questions.length === 0) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            message: `Étape "${step.title}" sans questions`,
            suggestion: 'Ajoutez des questions à cette étape ou supprimez-la'
          });
        } else if (step.questions.length > 20) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            message: `Étape "${step.title}" avec beaucoup de questions (${step.questions.length})`,
            suggestion: 'Considérez diviser cette étape en plusieurs parties'
          });
        }
      });
    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }

  /**
   * Validation avancée des structures de parcours avec prérequis
   */
  private validateLearningPathStructure(pathData: LearningPathImportData, errors: ImportError[], warnings: ImportError[]): void {
    try {
      const steps = pathData.path.steps;
      const stepIds = new Set(steps.map(s => s.id));

      // Validation de la profondeur des prérequis (éviter les chaînes trop longues)
      const maxDepth = this.calculateMaxPrerequisiteDepth(steps);
      if (maxDepth > 5) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          message: `Chaîne de prérequis très longue (profondeur: ${maxDepth})`,
          suggestion: 'Considérez simplifier la structure des prérequis pour améliorer l\'expérience utilisateur'
        });
      }

      // Validation des étapes orphelines (sans prérequis et sans être prérequis)
      const prerequisiteSteps = new Set<string>();
      steps.forEach(step => {
        step.prerequisites.forEach(prereq => prerequisiteSteps.add(prereq));
      });

      const orphanSteps = steps.filter(step => 
        step.prerequisites.length === 0 && !prerequisiteSteps.has(step.id)
      );

      if (orphanSteps.length > 1) {
        orphanSteps.forEach((step, index) => {
          if (index > 0) { // Permettre une étape orpheline comme point d'entrée
            warnings.push({
              type: 'validation',
              severity: 'minor',
              itemIndex: steps.indexOf(step),
              message: `Étape "${step.title}" semble isolée (pas de prérequis ni d'étapes dépendantes)`,
              suggestion: 'Vérifiez si cette étape doit être connectée au parcours principal'
            });
          }
        });
      }

      // Validation de la cohérence des niveaux de difficulté dans le parcours
      this.validateDifficultyProgression(steps, warnings);

      // Validation des références de prérequis dans le parcours
      this.validatePrerequisiteReferences(steps, stepIds, errors);

    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }

  /**
   * Validation des relations entre étapes et questions
   */
  private validateStepQuestionRelations(pathData: LearningPathImportData, errors: ImportError[], warnings: ImportError[]): void {
    try {
      const steps = pathData.path.steps;

      steps.forEach((step, stepIndex) => {
        if (!step.questions || step.questions.length === 0) return;

        // Vérifier la cohérence des catégories dans une étape
        const categories = new Set(step.questions.map(q => q.category).filter(Boolean));
        if (categories.size > 3) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: stepIndex,
            message: `Étape "${step.title}" contient beaucoup de catégories différentes (${categories.size})`,
            suggestion: 'Considérez regrouper les questions par catégorie ou diviser l\'étape'
          });
        }

        // Vérifier la progression de difficulté dans l'étape
        const difficulties = step.questions.map(q => q.difficulty);
        const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
        
        let hasProgression = true;
        for (let i = 1; i < difficulties.length; i++) {
          if (difficultyOrder[difficulties[i]] < difficultyOrder[difficulties[i-1]]) {
            hasProgression = false;
            break;
          }
        }

        if (!hasProgression && difficulties.length > 3) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: stepIndex,
            message: `Étape "${step.title}" n'a pas de progression logique de difficulté`,
            suggestion: 'Organisez les questions par ordre croissant de difficulté pour un meilleur apprentissage'
          });
        }

        // Validation des relations entre questions dans l'étape
        this.validateQuestionRelationsInStep(step, stepIndex, warnings);
      });

    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }

  /**
   * Calcule la profondeur maximale des prérequis
   */
  private calculateMaxPrerequisiteDepth(steps: ImportLearningStep[]): number {
    const stepMap = new Map(steps.map(s => [s.id, s]));
    const depthCache = new Map<string, number>();

    const calculateDepth = (stepId: string, visited = new Set<string>()): number => {
      if (depthCache.has(stepId)) return depthCache.get(stepId)!;
      if (visited.has(stepId)) return 0; // Éviter les cycles

      const step = stepMap.get(stepId);
      if (!step || step.prerequisites.length === 0) {
        depthCache.set(stepId, 0);
        return 0;
      }

      visited.add(stepId);
      const maxPrereqDepth = Math.max(
        ...step.prerequisites.map(prereq => calculateDepth(prereq, visited))
      );
      visited.delete(stepId);

      const depth = maxPrereqDepth + 1;
      depthCache.set(stepId, depth);
      return depth;
    };

    return Math.max(...steps.map(step => calculateDepth(step.id)));
  }

  /**
   * Validation de la progression de difficulté dans le parcours
   */
  private validateDifficultyProgression(steps: ImportLearningStep[], warnings: ImportError[]): void {
    try {
      // Analyser la progression générale de difficulté
      const stepDifficulties = steps.map(step => {
        if (!step.questions || step.questions.length === 0) return 'medium';
        
        const difficulties = step.questions.map(q => q.difficulty);
        const counts = { easy: 0, medium: 0, hard: 0 };
        difficulties.forEach(d => counts[d]++);
        
        // Retourner la difficulté dominante
        return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
      });

      // Vérifier s'il y a une progression logique
      const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
      let hasGlobalProgression = true;
      
      for (let i = 1; i < stepDifficulties.length; i++) {
        if (difficultyOrder[stepDifficulties[i]] < difficultyOrder[stepDifficulties[i-1]] - 1) {
          hasGlobalProgression = false;
          break;
        }
      }

      if (!hasGlobalProgression && steps.length > 3) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          message: 'Le parcours ne semble pas avoir de progression logique de difficulté',
          suggestion: 'Organisez les étapes pour une progression graduelle de la difficulté'
        });
      }

    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }

  /**
   * Validation des références de prérequis
   */
  private validatePrerequisiteReferences(steps: ImportLearningStep[], stepIds: Set<string>, errors: ImportError[]): void {
    try {
      steps.forEach((step, index) => {
        step.prerequisites.forEach(prereq => {
          if (!stepIds.has(prereq)) {
            errors.push({
              type: 'reference',
              severity: 'major',
              itemIndex: index,
              field: 'prerequisites',
              message: `Étape "${step.title}" référence un prérequis inexistant: "${prereq}"`,
              suggestion: 'Vérifiez que tous les prérequis référencent des étapes existantes dans le parcours'
            });
          }
        });

        // Vérifier les auto-références
        if (step.prerequisites.includes(step.id)) {
          errors.push({
            type: 'validation',
            severity: 'major',
            itemIndex: index,
            field: 'prerequisites',
            message: `Étape "${step.title}" se référence elle-même comme prérequis`,
            suggestion: 'Supprimez l\'auto-référence des prérequis'
          });
        }
      });

    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }

  /**
   * Validation des relations entre questions dans une étape
   */
  private validateQuestionRelationsInStep(step: ImportLearningStep, stepIndex: number, warnings: ImportError[]): void {
    try {
      if (!step.questions || step.questions.length < 2) return;

      // Vérifier la cohérence thématique des questions
      const questionTexts = step.questions.map(q => q.questionText.toLowerCase());
      const commonWords = this.findCommonWords(questionTexts);
      
      if (commonWords.length < 2 && step.questions.length > 5) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          itemIndex: stepIndex,
          message: `Étape "${step.title}" contient des questions qui semblent peu liées thématiquement`,
          suggestion: 'Vérifiez que toutes les questions de l\'étape traitent du même sujet'
        });
      }

      // Vérifier la diversité des types de questions
      const explanationLengths = step.questions
        .map(q => q.explanation?.length || 0)
        .filter(len => len > 0);
      
      if (explanationLengths.length > 0) {
        const avgLength = explanationLengths.reduce((a, b) => a + b, 0) / explanationLengths.length;
        const hasVariety = explanationLengths.some(len => Math.abs(len - avgLength) > avgLength * 0.5);
        
        if (!hasVariety && step.questions.length > 3) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: stepIndex,
            message: `Étape "${step.title}" a des explications de longueur très similaire`,
            suggestion: 'Variez la profondeur des explications selon la complexité des questions'
          });
        }
      }

    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }

  /**
   * Trouve les mots communs dans une liste de textes
   */
  private findCommonWords(texts: string[]): string[] {
    if (texts.length < 2) return [];

    const wordSets = texts.map(text => 
      new Set(text.split(/\s+/).filter(word => word.length > 3))
    );

    const firstSet = wordSets[0];
    const commonWords: string[] = [];

    firstSet.forEach(word => {
      if (wordSets.every(set => set.has(word))) {
        commonWords.push(word);
      }
    });

    return commonWords;
  }

  /**
   * Valide le contenu d'une flashcard
   */
  private validateFlashcardContent(card: any, index: number, errors: ImportError[], warnings: ImportError[]): void {
    try {
      // Validation de la longueur du contenu
      if (card.front && card.front.length < 5) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          itemIndex: index,
          field: 'front',
          message: 'Contenu recto très court',
          suggestion: 'Assurez-vous que le contenu est suffisamment détaillé'
        });
      }

      if (card.back && card.back.length < 5) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          itemIndex: index,
          field: 'back',
          message: 'Contenu verso très court',
          suggestion: 'Assurez-vous que le contenu est suffisamment détaillé'
        });
      }

      // Vérifier que le recto et le verso ne sont pas identiques
      if (card.front && card.back && card.front.toLowerCase().trim() === card.back.toLowerCase().trim()) {
        errors.push({
          type: 'validation',
          severity: 'major',
          itemIndex: index,
          message: 'Le recto et le verso de la flashcard sont identiques',
          suggestion: 'Le verso doit contenir la réponse ou l\'explication du recto'
        });
      }

      // Validation de l'URL d'image si présente
      if (card.imageUrl) {
        try {
          new URL(card.imageUrl);
        } catch {
          warnings.push({
            type: 'validation',
            severity: 'warning',
            itemIndex: index,
            field: 'imageUrl',
            message: 'URL d\'image invalide',
            suggestion: 'Vérifiez que l\'URL de l\'image est correcte et accessible'
          });
        }
      }

      // Validation des formats de champs (similaire aux questions)
      this.validateFieldFormats(card, index, errors, warnings);
    } catch (error) {
      // En cas d'erreur, ne pas bloquer la validation
    }
  }
}