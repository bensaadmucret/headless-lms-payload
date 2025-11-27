/**
 * Service de traitement JSON pour le système d'import
 * Responsable de la transformation des données JSON vers les structures Payload CMS
 */

import payload from 'payload';
import {
  ImportData,
  QuestionImportData,
  FlashcardImportData,
  LearningPathImportData,
  ImportQuestion,
  ImportFlashcard,
  ImportLearningStep,
  ImportResult,
  ImportError
} from '../types/jsonImport';
import { LearningPathPrerequisiteService } from './LearningPathPrerequisiteService';
import { FlashcardImportService } from './FlashcardImportService';

export interface ProcessingResult {
  success: boolean;
  results: ImportResult[];
  errors: ImportError[];
  createdIds: string[];
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

export class JSONProcessingService {
  private prerequisiteService: LearningPathPrerequisiteService;
  private flashcardService: FlashcardImportService;

  constructor() {
    this.prerequisiteService = new LearningPathPrerequisiteService();
    this.flashcardService = new FlashcardImportService();
  }

  /**
   * Traite les données d'import selon leur type
   */
  async processImportData(data: ImportData, userId: string): Promise<ProcessingResult> {
    try {
      switch (data.type) {
        case 'questions':
          return await this.processQuestions(data as QuestionImportData, userId);
        case 'flashcards':
          return await this.processFlashcards(data as FlashcardImportData, userId);
        case 'learning-path':
          return await this.processLearningPath(data as LearningPathImportData, userId);
        default:
          throw new Error(`Type d'import non supporté: ${(data as any).type}`);
      }
    } catch (error) {
      return {
        success: false,
        results: [],
        errors: [{
          type: 'system',
          severity: 'critical',
          message: `Erreur lors du traitement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez la structure des données et réessayez'
        }],
        createdIds: [],
        summary: {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          skipped: 0
        }
      };
    }
  }

  /**
   * Traite l'import de questions
   */
  async processQuestions(data: QuestionImportData, userId: string): Promise<ProcessingResult> {
    const results: ImportResult[] = [];
    const errors: ImportError[] = [];
    const createdIds: string[] = [];
    let successful = 0;
    let failed = 0;
    const skipped = 0;

    for (let i = 0; i < data.questions.length; i++) {
      const question = data.questions[i];
      if (!question) continue;

      try {
        // Mapper la question vers la structure Payload
        const mappedQuestion = await this.mapQuestionToPayload(question, userId);

        // Créer la question en base de données
        const createdQuestion = await payload.create({
          collection: 'questions',
          data: mappedQuestion
        });

        results.push({
          type: 'question',
          sourceIndex: i,
          payloadId: String(createdQuestion.id),
          status: 'success',
          message: 'Question créée avec succès'
        });

        createdIds.push(String(createdQuestion.id));
        successful++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

        results.push({
          type: 'question',
          sourceIndex: i,
          status: 'error',
          message: `Échec de création: ${errorMessage}`
        });

        errors.push({
          type: 'database',
          severity: 'major',
          itemIndex: i,
          message: `Erreur lors de la création de la question ${i + 1}: ${errorMessage}`,
          suggestion: 'Vérifiez les données et les relations'
        });

        failed++;
      }
    }

    return {
      success: errors.filter(e => e.severity === 'critical').length === 0,
      results,
      errors,
      createdIds,
      summary: {
        totalProcessed: data.questions.length,
        successful,
        failed,
        skipped
      }
    };
  }

  /**
   * Traite l'import de flashcards
   */
  async processFlashcards(data: FlashcardImportData, userId: string): Promise<ProcessingResult> {
    try {
      // Utiliser le service spécialisé pour les flashcards
      const flashcardResult = await this.flashcardService.processFlashcards(data, userId, true);

      // Convertir le résultat au format ProcessingResult
      return {
        success: flashcardResult.success,
        results: flashcardResult.results,
        errors: flashcardResult.errors,
        createdIds: flashcardResult.createdIds,
        summary: {
          totalProcessed: flashcardResult.summary.totalProcessed,
          successful: flashcardResult.summary.successful,
          failed: flashcardResult.summary.failed,
          skipped: 0
        }
      };

    } catch (error) {
      return {
        success: false,
        results: [],
        errors: [{
          type: 'system',
          severity: 'critical',
          message: `Erreur lors du traitement des flashcards: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez la structure des données et réessayez'
        }],
        createdIds: [],
        summary: {
          totalProcessed: 0,
          successful: 0,
          failed: 1,
          skipped: 0
        }
      };
    }
  }

  /**
   * Traite l'import de parcours d'apprentissage
   */
  async processLearningPath(data: LearningPathImportData, userId: string): Promise<ProcessingResult> {
    const results: ImportResult[] = [];
    const errors: ImportError[] = [];
    const createdIds: string[] = [];
    let successful = 0;
    let failed = 0;
    const skipped = 0;

    try {
      // Étape 1: Valider les prérequis et créer les substitutions si nécessaire
      const prerequisiteValidation = await this.prerequisiteService.validatePrerequisiteReferences(data.path.steps);
      
      if (!prerequisiteValidation.isValid) {
        // Ajouter les erreurs de prérequis aux erreurs générales
        errors.push(...prerequisiteValidation.errors);
        
        // Si il y a des erreurs critiques, arrêter le traitement
        const criticalErrors = prerequisiteValidation.errors.filter(e => e.severity === 'critical');
        if (criticalErrors.length > 0) {
          return {
            success: false,
            results,
            errors,
            createdIds,
            summary: {
              totalProcessed: 0,
              successful: 0,
              failed: 1,
              skipped: 0
            }
          };
        }
      }

      // Créer les substitutions pour les prérequis manquants
      let substitutionRecords: Array<{ originalId: string; substitutionId: string; created: boolean }> = [];
      if (prerequisiteValidation.missingPrerequisites.length > 0) {
        substitutionRecords = await this.prerequisiteService.createSubstitutionRecords(
          prerequisiteValidation.missingPrerequisites,
          prerequisiteValidation.substitutionSuggestions
        );

        // Ajouter les avertissements sur les substitutions
        substitutionRecords.forEach(sub => {
          results.push({
            type: 'learning-path',
            sourceIndex: -1,
            status: 'success',
            message: sub.created 
              ? `Substitution créée pour le prérequis manquant "${sub.originalId}"`
              : `Prérequis "${sub.originalId}" mappé vers "${sub.substitutionId}"`,
            warnings: sub.created ? ['Prérequis générique créé - révision recommandée'] : []
          });
        });
      }

      // Étape 2: Créer toutes les questions des étapes
      const stepQuestionIds = await this.createLearningPathQuestions(data, userId, results, errors);
      
      // Étape 3: Créer les relations entre étapes et questions avec prérequis validés
      const stepRelations = await this.createStepQuestionRelations(data, stepQuestionIds, results, errors, substitutionRecords);
      
      // Étape 4: Valider et créer la structure du parcours d'apprentissage
      const learningPathResult = await this.createLearningPathStructure(data, stepRelations, userId, results, errors);

      // Compter les succès et échecs
      successful = results.filter(r => r.status === 'success').length;
      failed = results.filter(r => r.status === 'error').length;
      
      // Collecter tous les IDs créés
      results.forEach(result => {
        if (result.payloadId) {
          createdIds.push(result.payloadId);
        }
      });

      return {
        success: errors.filter(e => e.severity === 'critical').length === 0,
        results,
        errors,
        createdIds,
        summary: {
          totalProcessed: data.path.steps.reduce((sum, step) => sum + step.questions.length, 0) + data.path.steps.length,
          successful,
          failed,
          skipped
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      errors.push({
        type: 'system',
        severity: 'critical',
        message: `Erreur lors du traitement du parcours d'apprentissage: ${errorMessage}`,
        suggestion: 'Vérifiez la structure des données et réessayez'
      });

      return {
        success: false,
        results,
        errors,
        createdIds,
        summary: {
          totalProcessed: 0,
          successful: 0,
          failed: 1,
          skipped: 0
        }
      };
    }
  }

  /**
   * Crée toutes les questions des étapes du parcours d'apprentissage
   */
  private async createLearningPathQuestions(
    data: LearningPathImportData, 
    userId: string, 
    results: ImportResult[], 
    errors: ImportError[]
  ): Promise<Record<string, string[]>> {
    const stepQuestionIds: Record<string, string[]> = {};

    for (let stepIndex = 0; stepIndex < data.path.steps.length; stepIndex++) {
      const step = data.path.steps[stepIndex];
      if (!step) continue;

      stepQuestionIds[step.id] = [];

      for (let questionIndex = 0; questionIndex < step.questions.length; questionIndex++) {
        const question = step.questions[questionIndex];
        if (!question) continue;

        try {
          // Mapper la question vers la structure Payload avec métadonnées du parcours
          const mappedQuestion = await this.mapQuestionToPayload(question, userId);
          
          // Ajouter des métadonnées spécifiques au parcours
          mappedQuestion.learningPathMetadata = {
            pathTitle: data.metadata.title,
            stepId: step.id,
            stepTitle: step.title,
            stepOrder: stepIndex,
            questionOrder: questionIndex
          };

          // Créer la question en base de données
          const createdQuestion = await payload.create({
            collection: 'questions',
            data: mappedQuestion
          });

          stepQuestionIds[step.id]?.push(String(createdQuestion.id));

          results.push({
            type: 'question',
            sourceIndex: stepIndex * 1000 + questionIndex, // Index unique
            payloadId: String(createdQuestion.id),
            status: 'success',
            message: `Question créée pour l'étape "${step.title}"`
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

          results.push({
            type: 'question',
            sourceIndex: stepIndex * 1000 + questionIndex,
            status: 'error',
            message: `Échec de création: ${errorMessage}`
          });

          errors.push({
            type: 'database',
            severity: 'major',
            itemIndex: stepIndex,
            message: `Erreur lors de la création de la question ${questionIndex + 1} de l'étape "${step.title}": ${errorMessage}`,
            suggestion: 'Vérifiez les données de la question'
          });
        }
      }
    }

    return stepQuestionIds;
  }

  /**
   * Crée les relations entre étapes et questions
   */
  private async createStepQuestionRelations(
    data: LearningPathImportData,
    stepQuestionIds: Record<string, string[]>,
    results: ImportResult[],
    errors: ImportError[],
    substitutionRecords: Array<{ originalId: string; substitutionId: string; created: boolean }> = []
  ): Promise<Array<{ stepId: string; stepData: any; questionIds: string[] }>> {
    const stepRelations: Array<{ stepId: string; stepData: any; questionIds: string[] }> = [];

    for (let stepIndex = 0; stepIndex < data.path.steps.length; stepIndex++) {
      const step = data.path.steps[stepIndex];
      if (!step) continue;

      try {
        // Appliquer les substitutions de prérequis
        const resolvedPrerequisites = this.applyPrerequisiteSubstitutions(step.prerequisites, substitutionRecords);
        
        // Valider que les prérequis résolus existent
        const validPrerequisites = await this.validateResolvedPrerequisites(resolvedPrerequisites, data.path.steps, substitutionRecords);
        
        if (!validPrerequisites.isValid) {
          errors.push({
            type: 'reference',
            severity: 'major',
            itemIndex: stepIndex,
            message: `Prérequis invalides pour l'étape "${step.title}": ${validPrerequisites.error}`,
            suggestion: 'Vérifiez que tous les prérequis référencent des étapes existantes'
          });
          continue;
        }

        // Créer les données de l'étape avec relations et prérequis résolus
        const stepData = {
          id: step.id,
          title: step.title,
          description: step.description,
          prerequisites: resolvedPrerequisites,
          originalPrerequisites: step.prerequisites, // Garder trace des prérequis originaux
          estimatedTime: step.estimatedTime,
          order: stepIndex,
          questionIds: stepQuestionIds[step.id] || [],
          substitutions: substitutionRecords.filter(sub => step.prerequisites.includes(sub.originalId))
        };

        stepRelations.push({
          stepId: step.id,
          stepData,
          questionIds: stepQuestionIds[step.id] || []
        });

        results.push({
          type: 'learning-path',
          sourceIndex: stepIndex,
          status: 'success',
          message: `Relations créées pour l'étape "${step.title}" (${stepQuestionIds[step.id]?.length || 0} questions)`
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

        results.push({
          type: 'learning-path',
          sourceIndex: stepIndex,
          status: 'error',
          message: `Échec de création des relations: ${errorMessage}`
        });

        errors.push({
          type: 'mapping',
          severity: 'major',
          itemIndex: stepIndex,
          message: `Erreur lors de la création des relations pour l'étape "${step.title}": ${errorMessage}`,
          suggestion: 'Vérifiez la structure des prérequis et des questions'
        });
      }
    }

    return stepRelations;
  }

  /**
   * Crée la structure principale du parcours d'apprentissage
   */
  private async createLearningPathStructure(
    data: LearningPathImportData,
    stepRelations: Array<{ stepId: string; stepData: any; questionIds: string[] }>,
    userId: string,
    results: ImportResult[],
    errors: ImportError[]
  ): Promise<string | null> {
    try {
      // Pour l'instant, nous stockons les métadonnées du parcours
      // TODO: Créer une collection dédiée aux parcours d'apprentissage quand elle sera définie
      
      const learningPathMetadata = {
        title: data.metadata.title,
        description: data.metadata.description,
        level: data.metadata.level,
        estimatedDuration: data.metadata.estimatedDuration,
        steps: stepRelations.map(rel => rel.stepData),
        totalQuestions: stepRelations.reduce((sum, rel) => sum + rel.questionIds.length, 0),
        createdBy: userId,
        createdAt: new Date(),
        source: data.metadata.source || 'JSON Import'
      };

      // Temporairement, nous pourrions créer un quiz qui représente le parcours
      // ou attendre qu'une collection spécifique soit créée
      
      results.push({
        type: 'learning-path',
        sourceIndex: 0,
        status: 'success',
        message: `Parcours d'apprentissage "${data.metadata.title}" structuré avec ${stepRelations.length} étapes`
      });

      return 'learning-path-created'; // ID temporaire

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      results.push({
        type: 'learning-path',
        sourceIndex: 0,
        status: 'error',
        message: `Échec de création du parcours: ${errorMessage}`
      });

      errors.push({
        type: 'database',
        severity: 'critical',
        message: `Erreur lors de la création du parcours d'apprentissage: ${errorMessage}`,
        suggestion: 'Vérifiez la structure des données et les permissions'
      });

      return null;
    }
  }

  /**
   * Applique les substitutions de prérequis
   */
  private applyPrerequisiteSubstitutions(
    originalPrerequisites: string[],
    substitutionRecords: Array<{ originalId: string; substitutionId: string; created: boolean }>
  ): string[] {
    return originalPrerequisites.map(prereq => {
      const substitution = substitutionRecords.find(sub => sub.originalId === prereq);
      return substitution ? substitution.substitutionId : prereq;
    });
  }

  /**
   * Valide que les prérequis résolus existent
   */
  private async validateResolvedPrerequisites(
    resolvedPrerequisites: string[],
    allSteps: ImportLearningStep[],
    substitutionRecords: Array<{ originalId: string; substitutionId: string; created: boolean }>
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const stepIds = new Set(allSteps.map(s => s.id));
      const substitutionIds = new Set(substitutionRecords.map(sub => sub.substitutionId));
      const allValidIds = new Set([...stepIds, ...substitutionIds]);

      for (const prereq of resolvedPrerequisites) {
        if (!allValidIds.has(prereq)) {
          return {
            isValid: false,
            error: `Prérequis résolu "${prereq}" introuvable`
          };
        }
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        error: `Erreur lors de la validation des prérequis résolus: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Valide que les prérequis d'une étape existent dans le parcours (méthode legacy)
   */
  private async validateStepPrerequisites(
    step: ImportLearningStep, 
    allSteps: ImportLearningStep[]
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const stepIds = new Set(allSteps.map(s => s.id));

      for (const prereq of step.prerequisites) {
        if (!stepIds.has(prereq)) {
          return {
            isValid: false,
            error: `Prérequis "${prereq}" introuvable dans le parcours`
          };
        }
      }

      // Vérifier les dépendances circulaires
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const hasCycle = (stepId: string): boolean => {
        if (recursionStack.has(stepId)) return true;
        if (visited.has(stepId)) return false;

        visited.add(stepId);
        recursionStack.add(stepId);

        const currentStep = allSteps.find(s => s.id === stepId);
        if (currentStep) {
          for (const prereq of currentStep.prerequisites) {
            if (hasCycle(prereq)) return true;
          }
        }

        recursionStack.delete(stepId);
        return false;
      };

      if (hasCycle(step.id)) {
        return {
          isValid: false,
          error: `Dépendance circulaire détectée impliquant l'étape "${step.id}"`
        };
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        error: `Erreur lors de la validation des prérequis: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * Mappe une question d'import vers la structure Payload CMS
   */
  private async mapQuestionToPayload(question: ImportQuestion, _userId: string): Promise<any> {
    // Résoudre la catégorie
    const categoryId = await this.resolveCategoryId(question.category, question.level);

    // Convertir le texte simple en RichText Lexical
    const questionTextRichText = this.convertTextToLexical(question.questionText);

    // Mapper les options
    const mappedOptions = question.options.map(option => ({
      optionText: option.text,
      isCorrect: option.isCorrect
    }));

    // Mapper les tags
    const mappedTags = question.tags ? question.tags.map(tag => ({ tag })) : [];

    const mappedQuestion = {
      questionText: questionTextRichText,
      questionType: 'multipleChoice',
      options: mappedOptions,
      explanation: question.explanation, // Temporairement en texte simple
      category: categoryId,
      difficulty: question.difficulty,
      studentLevel: question.level,
      tags: mappedTags,
      sourcePageReference: question.sourcePageReference,
      generatedByAI: false, // Import manuel
      validatedByExpert: false,
      validationStatus: 'pending'
    };

    return mappedQuestion;
  }

  /**
   * Convertit une flashcard en question QCM
   */
  private async convertFlashcardToQuestion(
    card: ImportFlashcard,
    metadata: any,
    _userId: string
  ): Promise<any> {
    // Résoudre la catégorie
    const categoryId = await this.resolveCategoryId(card.category, metadata.level || 'both');

    // Convertir le recto en question
    const questionText = this.convertTextToLexical(card.front);

    // Créer des options basiques (la bonne réponse + des distracteurs génériques)
    const options = [
      {
        optionText: card.back,
        isCorrect: true
      },
      {
        optionText: "Réponse incorrecte A",
        isCorrect: false
      },
      {
        optionText: "Réponse incorrecte B",
        isCorrect: false
      },
      {
        optionText: "Réponse incorrecte C",
        isCorrect: false
      }
    ];

    // Mapper les tags
    const mappedTags = card.tags ? card.tags.map(tag => ({ tag })) : [];

    return {
      questionText: questionText,
      questionType: 'multipleChoice',
      options: options,
      explanation: `Réponse: ${card.back}`, // Utiliser le verso comme explication
      category: categoryId,
      difficulty: card.difficulty,
      studentLevel: metadata.level || 'both',
      tags: mappedTags,
      generatedByAI: false,
      validatedByExpert: false,
      validationStatus: 'needs_review' // Les flashcards converties nécessitent une révision
    };
  }

  /**
   * Résout l'ID d'une catégorie par son nom, la crée si nécessaire
   */
  private async resolveCategoryId(categoryName: string, level: string): Promise<string> {
    try {
      // Chercher la catégorie existante
      const existingCategory = await payload.find({
        collection: 'categories',
        where: {
          title: {
            equals: categoryName
          }
        },
        limit: 1
      });

      if (existingCategory.docs.length > 0) {
        return String(existingCategory.docs[0]?.id);
      }

      // Créer une nouvelle catégorie si elle n'existe pas
      const newCategory = await payload.create({
        collection: 'categories',
        data: {
          title: categoryName,
          level: level as 'PASS' | 'LAS' | 'both',
          adaptiveSettings: {
            isActive: true,
            minimumQuestions: 5,
            weight: 1
          }
        }
      });

      return String(newCategory.id);

    } catch (error) {
      throw new Error(`Impossible de résoudre la catégorie "${categoryName}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Convertit du texte simple en structure RichText Lexical
   */
  private convertTextToLexical(text: string): any {
    // Structure Lexical basique pour du texte simple
    return {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: text,
                type: "text",
                version: 1
              }
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1
          }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1
      }
    };
  }

  /**
   * Génère des distracteurs automatiques pour une question (version basique)
   */
  private generateBasicDistractors(_correctAnswer: string, count: number = 3): string[] {
    // Version basique - génère des distracteurs génériques
    // TODO: Améliorer avec l'IA pour générer des distracteurs contextuels
    const genericDistractors = [
      "Option incorrecte A",
      "Option incorrecte B",
      "Option incorrecte C",
      "Option incorrecte D",
      "Aucune des réponses ci-dessus",
      "Toutes les réponses ci-dessus"
    ];

    return genericDistractors.slice(0, count);
  }

  /**
   * Valide qu'une question mappée est correcte avant création
   */
  private validateMappedQuestion(mappedQuestion: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Vérifier les champs requis
    if (!mappedQuestion.questionText) {
      errors.push('Texte de question manquant');
    }

    if (!mappedQuestion.options || mappedQuestion.options.length < 2) {
      errors.push('Au moins 2 options requises');
    }

    if (!mappedQuestion.category) {
      errors.push('Catégorie manquante');
    }

    // Vérifier qu'il y a exactement une bonne réponse
    if (mappedQuestion.options) {
      const correctCount = mappedQuestion.options.filter((opt: any) => opt.isCorrect).length;
      if (correctCount !== 1) {
        errors.push('Exactement une option doit être correcte');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}