import type { Endpoint, PayloadRequest } from 'payload';
import { AIQuizGenerationService, QuestionGenerationRequest, GeneratedQuestion } from '../services/AIQuizGenerationService';

interface QuizGenerationConfig {
  subject: string;
  categoryId: string;
  studentLevel: 'PASS' | 'LAS' | 'both';
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  includeExplanations: boolean;
  quizType?: 'standard' | 'placement';
  customInstructions?: string;
}

interface QuizGenerationResult {
  success: boolean;
  quiz: {
    id: string;
    title: string;
    description: string;
    questionsCreated: number;
  };
  validationScore: number;
  errors?: string[];
  warnings?: string[];
  generationTime: number;
}

/**
 * Endpoint pour générer un quiz complet avec l'IA
 */
export const generateAIQuizEndpoint: Endpoint = {
  path: '/ai-quiz/generate',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    console.log('🎯 Endpoint generateAIQuiz appelé');
    const startTime = Date.now();

    // Vérifier l'authentification et les permissions admin
    const allowedRoles = ['admin', 'superadmin', 'super-admin', 'super_admin'];
    
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.log('❌ Permissions insuffisantes - Rôle actuel:', req.user?.role);
      return Response.json({ 
        error: 'Admin permissions required.',
        currentRole: req.user?.role,
        requiredRoles: allowedRoles
      }, { status: 403 });
    }
    
    console.log('✅ Permissions validées - Rôle:', req.user.role);

    let config: QuizGenerationConfig | null = null;
    
    try {
      const body = await req.json?.() || {};
      config = {
        subject: body.subject,
        categoryId: body.categoryId,
        studentLevel: body.studentLevel || 'PASS',
        questionCount: Math.min(body.questionCount || 10, 20), // Max 20 questions
        difficulty: body.difficulty || 'medium',
        includeExplanations: body.includeExplanations !== false,
        quizType: body.quizType || 'standard',
        customInstructions: body.customInstructions,
      };

      // Validation des paramètres requis
      const validationErrors = validateConfig(config);
      if (validationErrors.length > 0) {
        return Response.json({
          error: 'Configuration invalide',
          details: validationErrors
        }, { status: 400 });
      }

      req.payload.logger.info(`Génération de quiz IA`, {
        userId: req.user.id,
        subject: config.subject,
        categoryId: config.categoryId,
        level: config.studentLevel,
        questionCount: config.questionCount,
      });

      // Récupérer les informations de la catégorie
      const category = await req.payload.findByID({
        collection: 'categories',
        id: config.categoryId,
      });

      if (!category) {
        return Response.json({
          error: 'Catégorie non trouvée'
        }, { status: 404 });
      }

      // Préparer la requête de génération de questions
      const questionRequest: QuestionGenerationRequest = {
        categoryId: config.categoryId,
        categoryName: category.title,
        difficultyLevel: config.studentLevel.toLowerCase() as 'pass' | 'las',
        questionCount: config.questionCount,
        medicalDomain: config.subject,
        sourceContent: config.customInstructions,
      };

      // Générer les questions avec l'IA
      const aiService = new AIQuizGenerationService(req.payload);
      const generatedQuestions = await aiService.generateQuestions(questionRequest);

      if (generatedQuestions.length === 0) {
        return Response.json({
          error: 'Aucune question générée par l\'IA'
        }, { status: 500 });
      }

      // Valider toutes les questions générées
      const validatedQuestions = generatedQuestions.map((question: GeneratedQuestion) => {
        const validation = aiService.validateGeneratedQuestion(question);
        return {
          ...question,
          validation,
        };
      });

      // Calculer le score de validation global
      const validationScore = validatedQuestions.reduce((sum, q) => sum + (q.validation?.score || 0), 0) / validatedQuestions.length;

      // Créer d'abord les questions dans la base de données
      const createdQuestions = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const question of validatedQuestions) {
        try {
          const createdQuestion = await req.payload.create({
            collection: 'questions',
            data: {
              questionText: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          text: question.questionText,
                          version: 1
                        }
                      ],
                      direction: 'ltr',
                      format: '',
                      indent: 0,
                      version: 1
                    }
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1
                }
              },
              questionType: 'multipleChoice',
              options: question.options,
              explanation: question.explanation,
              // course is optional for AI-generated questions
              category: parseInt(config.categoryId),
              difficulty: question.estimatedDifficulty || 'medium',
              studentLevel: config.studentLevel,
              generatedByAI: true,
              aiGenerationPrompt: question.aiGenerationPrompt,
              sourcePageReference: `Quiz IA: ${config.subject}`,
            },
          });

          createdQuestions.push(createdQuestion);

          // Ajouter des avertissements si la validation a des problèmes
          if (question.validation && question.validation.issues.length > 0) {
            warnings.push(`Question "${question.questionText.substring(0, 50)}...": ${question.validation.issues.join(', ')}`);
          }

        } catch (dbError) {
          req.payload.logger.error(`Erreur création question en DB:`, dbError);
          errors.push(`Erreur lors de la création d'une question: ${dbError instanceof Error ? dbError.message : 'Erreur inconnue'}`);
        }
      }

      // Maintenant créer le quiz avec les questions
      const quizTitle = generateQuizTitle(config.subject, config.studentLevel);
      const quizDescription = generateQuizDescription(config.subject, config.studentLevel, config.questionCount);

      const createdQuiz = await req.payload.create({
        collection: 'quizzes',
        data: {
          title: quizTitle,
          description: quizDescription,
          questions: createdQuestions.map(q => q.id),
          published: true, // Publier automatiquement les quiz générés par IA
          duration: estimateQuizDuration(config.questionCount),
          passingScore: 70,
          quizType: config.quizType || 'standard',
        },
      });

      const generationTime = Date.now() - startTime;

      // Log the generation for audit purposes
      req.payload.logger.info('Quiz IA créé avec succès', {
        userId: req.user.id,
        quizId: createdQuiz.id,
        questionsCreated: createdQuestions.length,
        validationScore,
        generationTime,
      });

      // Créer un log dans la collection GenerationLogs
      try {
        await req.payload.create({
          collection: 'generationlogs',
          data: {
            user: req.user.id,
            action: 'ai_quiz_generation',
            status: 'success',
            generationConfig: {
              subject: config.subject,
              categoryId: config.categoryId,
              categoryName: category.title,
              studentLevel: config.studentLevel,
              questionCount: config.questionCount,
              difficulty: config.difficulty,
              includeExplanations: config.includeExplanations,
              customInstructions: config.customInstructions,
            },
            result: {
              quizId: String(createdQuiz.id),
              questionIds: createdQuestions.map(q => ({ questionId: String(q.id) })),
              questionsCreated: createdQuestions.length,
              validationScore,
              aiModel: 'gemini-2.0-flash',
            },
            performance: {
              duration: generationTime,
              retryCount: 1,
            },
            metadata: {
              environment: process.env.NODE_ENV || 'development',
              version: '1.0.0',
            },
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        // Ne pas faire échouer la génération si le log échoue
        req.payload.logger.error('Erreur lors de la création du log:', logError);
      }

      const result: QuizGenerationResult = {
        success: true,
        quiz: {
          id: String(createdQuiz.id),
          title: quizTitle,
          description: quizDescription,
          questionsCreated: createdQuestions.length,
        },
        validationScore,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        generationTime,
      };

      return Response.json(result, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      const generationTime = Date.now() - startTime;
      
      req.payload.logger.error(`Error in generateAIQuizEndpoint: ${errorMessage}`);

      // Créer un log d'erreur dans la collection GenerationLogs
      try {
        await req.payload.create({
          collection: 'generationlogs',
          data: {
            user: req.user.id,
            action: 'ai_quiz_generation',
            status: 'failed',
            generationConfig: config ? {
              subject: config.subject,
              categoryId: config.categoryId,
              studentLevel: config.studentLevel,
              questionCount: config.questionCount,
              difficulty: config.difficulty,
            } : undefined,
            error: {
              type: 'unknown_error',
              message: errorMessage,
              details: error instanceof Error ? { stack: error.stack } : {},
            },
            performance: {
              duration: generationTime,
              retryCount: 1,
            },
            metadata: {
              environment: process.env.NODE_ENV || 'development',
              version: '1.0.0',
            },
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        });
      } catch (logError) {
        req.payload.logger.error('Erreur lors de la création du log d\'erreur:', logError);
      }

      return Response.json({
        error: 'Erreur lors de la génération du quiz IA.',
        details: errorMessage
      }, { status: 500 });
    }
  },
};

/**
 * Valide la configuration de génération
 */
function validateConfig(config: QuizGenerationConfig): string[] {
  const errors: string[] = [];

  if (!config.subject || config.subject.length < 10 || config.subject.length > 200) {
    errors.push('Le sujet doit contenir entre 10 et 200 caractères');
  }

  if (!config.categoryId) {
    errors.push('Une catégorie doit être sélectionnée');
  }

  if (!['PASS', 'LAS', 'both'].includes(config.studentLevel)) {
    errors.push('Niveau d\'études invalide');
  }

  if (!config.questionCount || config.questionCount < 5 || config.questionCount > 20) {
    errors.push('Le nombre de questions doit être entre 5 et 20');
  }

  if (!['easy', 'medium', 'hard'].includes(config.difficulty)) {
    errors.push('Niveau de difficulté invalide');
  }

  return errors;
}

/**
 * Génère un titre pour le quiz
 */
function generateQuizTitle(subject: string, level: string): string {
  const levelText = level === 'PASS' ? 'PASS' : level === 'LAS' ? 'LAS' : 'PASS/LAS';
  return `Quiz ${levelText}: ${subject}`;
}

/**
 * Génère une description pour le quiz
 */
function generateQuizDescription(subject: string, level: string, questionCount: number): string {
  const levelText = level === 'PASS' ? 'première année (PASS)' : 
                   level === 'LAS' ? 'Licence Accès Santé (LAS)' : 
                   'PASS et LAS';
  
  return `Quiz de ${questionCount} questions sur ${subject}, adapté aux étudiants de ${levelText}. Généré automatiquement par IA avec validation qualité.`;
}

/**
 * Estime la durée du quiz en minutes
 */
function estimateQuizDuration(questionCount: number): number {
  // Estimation: 1.5 minutes par question en moyenne
  return Math.ceil(questionCount * 1.5);
}