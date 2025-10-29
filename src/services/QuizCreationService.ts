/**
 * Service de création automatique de quiz et questions
 * Gère la création complète des quiz à partir du contenu généré par l'IA
 */

import type { Payload } from 'payload';
import type { Quiz } from '../payload-types';
import type { AIGeneratedQuiz, AIGeneratedQuestion } from './ContentValidatorService';

export interface QuizCreationRequest {
  aiContent: AIGeneratedQuiz;
  categoryId: string;
  categoryName?: string;
  courseId?: string;
  courseName?: string;
  studentLevel: 'PASS' | 'LAS' | 'both';
  difficulty?: 'easy' | 'medium' | 'hard';
  userId: string;
  published?: boolean;
  customMetadata?: Record<string, any>;
}

export interface QuizCreationResult {
  success: boolean;
  quizId?: string;
  questionIds: string[];
  questionsCreated: number;
  validationScore?: number;
  errors?: string[];
  warnings?: string[];
  metadata: {
    createdAt: string;
    generatedByAI: boolean;
    totalDuration: number;
    processingTime: number;
  };
}

export interface CreatedQuestion {
  id: string;
  questionText: any; // RichText content
  options: Array<{
    id: string;
    optionText: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  category: string;
  course?: string;
  difficulty: string;
  studentLevel: string;
  generatedByAI: boolean;
  aiGenerationPrompt?: string;
  tags: string[];
}

export class QuizCreationService {
  constructor(private payload: Payload) {}

  /**
   * Crée un quiz complet avec ses questions à partir du contenu IA
   */
  async createQuizFromAIContent(request: QuizCreationRequest): Promise<QuizCreationResult> {
    const startTime = Date.now();
    console.log('🏗️ Début création quiz automatique:', {
      title: request.aiContent.quiz.title,
      questionsCount: request.aiContent.questions.length,
      category: request.categoryName,
      level: request.studentLevel
    });

    try {
      // 1. Validation préalable du contenu
      const validationResult = this.validateCreationRequest(request);
      if (!validationResult.isValid) {
        return {
          success: false,
          questionIds: [],
          questionsCreated: 0,
          errors: validationResult.errors,
          metadata: {
            createdAt: new Date().toISOString(),
            generatedByAI: true,
            totalDuration: 0,
            processingTime: Date.now() - startTime
          }
        };
      }

      // 2. Création des questions en premier
      const questionsResult = await this.createQuestionsFromAIContent(request);
      if (!questionsResult.success) {
        return {
          success: false,
          questionIds: [],
          questionsCreated: 0,
          errors: questionsResult.errors,
          warnings: questionsResult.warnings,
          metadata: {
            createdAt: new Date().toISOString(),
            generatedByAI: true,
            totalDuration: 0,
            processingTime: Date.now() - startTime
          }
        };
      }

      // 3. Création du quiz avec les questions créées
      const quizResult = await this.createQuizWithQuestions(request, questionsResult.questionIds);
      if (!quizResult.success) {
        // Nettoyer les questions créées en cas d'échec du quiz
        await this.cleanupCreatedQuestions(questionsResult.questionIds);
        return {
          success: false,
          questionIds: [],
          questionsCreated: 0,
          errors: quizResult.errors,
          metadata: {
            createdAt: new Date().toISOString(),
            generatedByAI: true,
            totalDuration: 0,
            processingTime: Date.now() - startTime
          }
        };
      }

      // 4. Validation finale et métadonnées
      const finalValidation = await this.validateCreatedQuiz(quizResult.quizId!, questionsResult.questionIds);
      
      const result: QuizCreationResult = {
        success: true,
        quizId: quizResult.quizId,
        questionIds: questionsResult.questionIds,
        questionsCreated: questionsResult.questionIds.length,
        validationScore: finalValidation.score,
        warnings: [...(questionsResult.warnings || []), ...(finalValidation.warnings || [])],
        metadata: {
          createdAt: new Date().toISOString(),
          generatedByAI: true,
          totalDuration: request.aiContent.quiz.estimatedDuration || 15,
          processingTime: Date.now() - startTime
        }
      };

      console.log('✅ Quiz créé avec succès:', {
        quizId: result.quizId,
        questionsCreated: result.questionsCreated,
        validationScore: result.validationScore,
        processingTime: result.metadata.processingTime
      });

      return result;

    } catch (error: any) {
      console.error('❌ Erreur création quiz automatique:', error);
      return {
        success: false,
        questionIds: [],
        questionsCreated: 0,
        errors: [`Erreur lors de la création: ${error.message}`],
        metadata: {
          createdAt: new Date().toISOString(),
          generatedByAI: true,
          totalDuration: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Crée toutes les questions à partir du contenu IA
   */
  private async createQuestionsFromAIContent(request: QuizCreationRequest): Promise<{
    success: boolean;
    questionIds: string[];
    errors?: string[];
    warnings?: string[];
  }> {
    const questionIds: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log(`📝 Création de ${request.aiContent.questions.length} questions...`);

    for (let i = 0; i < request.aiContent.questions.length; i++) {
      const aiQuestion = request.aiContent.questions[i]!;
      
      try {
        const questionData = this.prepareQuestionData(aiQuestion, request, i + 1);
        
        // Validation de la question avant création
        const questionValidation = this.validateQuestionData(questionData);
        if (!questionValidation.isValid) {
          errors.push(`Question ${i + 1}: ${questionValidation.errors.join(', ')}`);
          continue;
        }

        // Création de la question dans la base
        const createdQuestion = await this.payload.create({
          collection: 'questions',
          data: questionData
        });

        const createdQuestionId = String(createdQuestion.id);
        questionIds.push(createdQuestionId);
        console.log(`✅ Question ${i + 1} créée: ${createdQuestionId}`);

        // Ajouter des warnings si nécessaire
        if (questionValidation.warnings.length > 0) {
          warnings.push(`Question ${i + 1}: ${questionValidation.warnings.join(', ')}`);
        }

      } catch (error: any) {
        console.error(`❌ Erreur création question ${i + 1}:`, error);
        errors.push(`Question ${i + 1}: ${error.message}`);
      }
    }

    const success = questionIds.length > 0 && errors.length === 0;
    
    return {
      success,
      questionIds,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Prépare les données d'une question pour la création en base
   */
  private prepareQuestionData(aiQuestion: AIGeneratedQuestion, request: QuizCreationRequest, questionNumber: number): any {
    // Conversion du texte en format RichText pour Payload
    const questionTextRichText = {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        children: [
          {
            type: 'paragraph',
            format: '',
            indent: 0,
            version: 1,
            children: [
              {
                type: 'text',
                format: 0,
                style: '',
                mode: 'normal',
                text: aiQuestion.questionText,
                version: 1
              }
            ]
          }
        ]
      }
    };

    // Préparation des options avec validation
    const options = aiQuestion.options.map((option, index) => ({
      optionText: option.text,
      isCorrect: option.isCorrect,
      id: `opt_${questionNumber}_${index + 1}` // ID unique pour chaque option
    }));

    // Génération des tags automatiques
    const autoTags = this.generateAutoTags(aiQuestion, request);

    return {
      questionText: questionTextRichText,
      questionType: 'multipleChoice',
      options,
      explanation: aiQuestion.explanation,
      course: request.courseId || undefined,
      category: request.categoryId,
      difficulty: aiQuestion.difficulty || request.difficulty || 'medium',
      studentLevel: request.studentLevel,
      tags: autoTags.map(tag => ({ tag })),
      generatedByAI: true,
      aiGenerationPrompt: `Quiz: ${request.aiContent.quiz.title} - Question ${questionNumber}`,
      validatedByExpert: false,
      adaptiveMetadata: {
        averageTimeSeconds: this.estimateQuestionTime(aiQuestion),
        successRate: 0.5, // Valeur par défaut, sera mise à jour avec l'usage
        timesUsed: 0
      }
    };
  }

  /**
   * Génère des tags automatiques pour une question
   */
  private generateAutoTags(aiQuestion: AIGeneratedQuestion, request: QuizCreationRequest): string[] {
    const tags: string[] = [];

    // Tags basés sur le niveau
    tags.push(request.studentLevel.toLowerCase());

    // Tags basés sur la difficulté
    if (aiQuestion.difficulty) {
      tags.push(aiQuestion.difficulty);
    }

    // Tags basés sur le contenu médical
    const medicalTerms = this.extractMedicalTerms(aiQuestion.questionText);
    tags.push(...medicalTerms.slice(0, 3)); // Limiter à 3 termes médicaux

    // Tags basés sur les tags IA si disponibles
    if (aiQuestion.tags) {
      tags.push(...aiQuestion.tags.slice(0, 2));
    }

    // Tag générique pour les questions IA
    tags.push('ai-generated');

    // Nettoyer et dédupliquer
    return [...new Set(tags.filter(tag => tag && tag.length > 2))];
  }

  /**
   * Extrait les termes médicaux d'un texte
   */
  private extractMedicalTerms(text: string): string[] {
    const medicalKeywords = [
      'anatomie', 'physiologie', 'pathologie', 'diagnostic', 'traitement',
      'symptôme', 'maladie', 'syndrome', 'cellule', 'tissu', 'organe',
      'système', 'fonction', 'mécanisme', 'processus', 'thérapie',
      'médical', 'clinique', 'patient', 'santé', 'biologie'
    ];

    const foundTerms: string[] = [];
    const lowerText = text.toLowerCase();

    for (const term of medicalKeywords) {
      if (lowerText.includes(term)) {
        foundTerms.push(term);
      }
    }

    return foundTerms;
  }

  /**
   * Estime le temps nécessaire pour répondre à une question
   */
  private estimateQuestionTime(aiQuestion: AIGeneratedQuestion): number {
    const baseTime = 30; // 30 secondes de base
    const textLength = aiQuestion.questionText.length;
    const optionsLength = aiQuestion.options.reduce((sum, opt) => sum + opt.text.length, 0);
    
    // Temps basé sur la longueur du texte (1 seconde par 20 caractères)
    const readingTime = Math.ceil((textLength + optionsLength) / 20);
    
    // Ajustement selon la difficulté
    const difficultyMultiplier = {
      'easy': 1,
      'medium': 1.3,
      'hard': 1.6
    };
    
    const multiplier = difficultyMultiplier[aiQuestion.difficulty as keyof typeof difficultyMultiplier] || 1.3;
    
    return Math.round((baseTime + readingTime) * multiplier);
  }

  /**
   * Valide les données d'une question avant création
   */
  private validateQuestionData(questionData: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation des options
    if (!questionData.options || !Array.isArray(questionData.options)) {
      errors.push('Options manquantes ou invalides');
    } else {
      if (questionData.options.length !== 4) {
        errors.push('Doit avoir exactement 4 options');
      }

      const correctOptions = questionData.options.filter((opt: any) => opt.isCorrect);
      if (correctOptions.length !== 1) {
        errors.push('Doit avoir exactement une bonne réponse');
      }

      // Vérifier les doublons
      const optionTexts = questionData.options.map((opt: any) => opt.optionText.toLowerCase().trim());
      const uniqueTexts = new Set(optionTexts);
      if (uniqueTexts.size !== optionTexts.length) {
        errors.push('Options dupliquées détectées');
      }
    }

    // Validation de l'explication
    if (!questionData.explanation || questionData.explanation.length < 20) {
      errors.push('Explication trop courte (minimum 20 caractères)');
    }

    // Validation de la catégorie
    if (!questionData.category) {
      errors.push('Catégorie requise');
    }

    // Warnings pour la qualité
    if (questionData.explanation && questionData.explanation.length < 50) {
      warnings.push('Explication courte, pourrait être plus détaillée');
    }

    if (questionData.tags && questionData.tags.length === 0) {
      warnings.push('Aucun tag défini, la recherche sera limitée');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Crée le quiz avec les questions associées
   */
  private async createQuizWithQuestions(request: QuizCreationRequest, questionIds: string[]): Promise<{
    success: boolean;
    quizId?: string;
    errors?: string[];
  }> {
    try {
      console.log('🎯 Création du quiz avec', questionIds.length, 'questions...');

      const formattedQuestionIds = questionIds.map(id => {
        const numericId = Number(id);
        if (Number.isNaN(numericId)) {
          throw new Error(`ID de question invalide: ${id}`);
        }
        return numericId;
      });

      let courseIdNumeric: number | undefined;
      if (typeof request.courseId === 'number' && !Number.isNaN(request.courseId)) {
        courseIdNumeric = request.courseId;
      } else if (typeof request.courseId === 'string') {
        const courseId = request.courseId ? Number(request.courseId) : undefined;
        if (courseId !== undefined && Number.isNaN(courseId)) {
          throw new Error(`ID de cours invalide: ${request.courseId}`);
        }
        courseIdNumeric = courseId;
      }

      const quizType: Quiz['quizType'] = 'standard';

      const quizData: Omit<Quiz, 'createdAt' | 'id' | 'sizes' | 'updatedAt'> = {
        title: request.aiContent.quiz.title,
        description: request.aiContent.quiz.description,
        questions: formattedQuestionIds as Quiz['questions'], // Relations vers les questions créées
        course: courseIdNumeric ?? undefined,
        published: request.published ?? false,
        duration: request.aiContent.quiz.estimatedDuration ?? 15,
        passingScore: 70, // Score par défaut
        quizType
      } satisfies Partial<Quiz>;

      const createdQuiz = await this.payload.create({
        collection: 'quizzes',
        data: quizData
      });

      const createdQuizId = String(createdQuiz.id);
      console.log('✅ Quiz créé:', createdQuizId);

      return {
        success: true,
        quizId: createdQuizId
      };

    } catch (error: any) {
      console.error('❌ Erreur création quiz:', error);
      return {
        success: false,
        errors: [`Erreur création quiz: ${error.message}`]
      };
    }
  }

  /**
   * Valide la demande de création
   */
  private validateCreationRequest(request: QuizCreationRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validation du contenu IA
    if (!request.aiContent) {
      errors.push('Contenu IA manquant');
    } else {
      if (!request.aiContent.quiz) {
        errors.push('Section quiz manquante dans le contenu IA');
      } else {
        if (!request.aiContent.quiz.title || request.aiContent.quiz.title.length < 5) {
          errors.push('Titre du quiz manquant ou trop court');
        }
        if (!request.aiContent.quiz.description || request.aiContent.quiz.description.length < 10) {
          errors.push('Description du quiz manquante ou trop courte');
        }
      }

      if (!request.aiContent.questions || !Array.isArray(request.aiContent.questions)) {
        errors.push('Questions manquantes dans le contenu IA');
      } else if (request.aiContent.questions.length === 0) {
        errors.push('Aucune question fournie');
      } else if (request.aiContent.questions.length > 20) {
        errors.push('Trop de questions (maximum 20)');
      }
    }

    // Validation des paramètres
    if (!request.categoryId) {
      errors.push('ID de catégorie requis');
    }

    if (!request.userId) {
      errors.push('ID utilisateur requis');
    }

    if (!['PASS', 'LAS', 'both'].includes(request.studentLevel)) {
      errors.push('Niveau étudiant invalide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valide le quiz créé
   */
  private async validateCreatedQuiz(quizId: string, questionIds: string[]): Promise<{
    score: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let score = 100;

    try {
      // Vérifier que le quiz existe et est bien lié aux questions
      const quiz = await this.payload.findByID({
        collection: 'quizzes',
        id: quizId,
        depth: 1
      });

      if (!quiz) {
        warnings.push('Quiz créé non trouvé');
        score -= 50;
      } else {
        // Vérifier les relations questions
        const quizQuestions = Array.isArray(quiz.questions) ? quiz.questions : [];
        if (quizQuestions.length !== questionIds.length) {
          warnings.push('Nombre de questions liées incorrect');
          score -= 20;
        }

        // Vérifier que toutes les questions existent
        for (const questionId of questionIds) {
          try {
            await this.payload.findByID({
              collection: 'questions',
              id: questionId
            });
          } catch {
            warnings.push(`Question ${questionId} non trouvée`);
            score -= 10;
          }
        }
      }

    } catch (error) {
      warnings.push('Erreur lors de la validation finale');
      score -= 30;
    }

    return {
      score: Math.max(0, score),
      warnings
    };
  }

  /**
   * Nettoie les questions créées en cas d'échec
   */
  private async cleanupCreatedQuestions(questionIds: string[]): Promise<void> {
    console.log('🧹 Nettoyage des questions créées...');
    
    for (const questionId of questionIds) {
      try {
        await this.payload.delete({
          collection: 'questions',
          id: questionId
        });
        console.log(`🗑️ Question ${questionId} supprimée`);
      } catch (error) {
        console.error(`❌ Erreur suppression question ${questionId}:`, error);
      }
    }
  }

  /**
   * Met à jour les métadonnées d'un quiz après création
   */
  async updateQuizMetadata(quizId: string, metadata: {
    aiGenerationTime?: number;
    validationScore?: number;
    sourcePrompt?: string;
    generatedBy?: string;
  }): Promise<void> {
    try {
      // Note: Cette fonctionnalité nécessiterait d'ajouter des champs de métadonnées
      // à la collection Quizzes pour stocker ces informations
      console.log('📊 Mise à jour métadonnées quiz:', quizId, metadata);
      
      // Pour l'instant, on log les métadonnées
      // Dans une version future, on pourrait ajouter une collection QuizMetadata
      
    } catch (error) {
      console.error('❌ Erreur mise à jour métadonnées:', error);
    }
  }

  /**
   * Crée un quiz de test avec des questions prédéfinies
   */
  async createTestQuiz(categoryId: string, userId: string): Promise<QuizCreationResult> {
    const testContent: AIGeneratedQuiz = {
      quiz: {
        title: "Quiz de Test - Anatomie de Base",
        description: "Quiz de test pour valider le système de création automatique",
        estimatedDuration: 10
      },
      questions: [
        {
          questionText: "Quel est l'os le plus long du corps humain ?",
          options: [
            { text: "Le fémur", isCorrect: true },
            { text: "Le tibia", isCorrect: false },
            { text: "L'humérus", isCorrect: false },
            { text: "Le radius", isCorrect: false }
          ],
          explanation: "Le fémur est effectivement l'os le plus long du corps humain. Il s'étend de la hanche au genou et peut mesurer jusqu'à 50 cm chez un adulte.",
          difficulty: "easy",
          tags: ["anatomie", "os", "squelette"]
        },
        {
          questionText: "Combien de chambres possède le cœur humain ?",
          options: [
            { text: "2 chambres", isCorrect: false },
            { text: "3 chambres", isCorrect: false },
            { text: "4 chambres", isCorrect: true },
            { text: "5 chambres", isCorrect: false }
          ],
          explanation: "Le cœur humain possède 4 chambres : 2 oreillettes (droite et gauche) et 2 ventricules (droit et gauche). Cette structure permet une circulation sanguine efficace.",
          difficulty: "easy",
          tags: ["cardiologie", "anatomie", "physiologie"]
        }
      ]
    };

    const request: QuizCreationRequest = {
      aiContent: testContent,
      categoryId,
      studentLevel: 'PASS',
      userId,
      published: false
    };

    return await this.createQuizFromAIContent(request);
  }
}