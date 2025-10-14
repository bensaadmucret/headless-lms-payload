import type { Endpoint, PayloadRequest } from 'payload';
import { AIQuizGenerationService, QuestionGenerationRequest, GeneratedQuestion } from '../services/AIQuizGenerationService';

/**
 * Endpoint pour générer des questions QCM médicales avec l'IA Gemini
 */
export const generateAIQuestionsEndpoint: Endpoint = {
  path: '/questions/generate-ai',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    // Vérifier l'authentification et les permissions admin
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return Response.json({ error: 'Admin permissions required.' }, { status: 403 });
    }

    try {
      const body = await (req as any).json();
      const generationRequest: QuestionGenerationRequest = {
        categoryId: body.categoryId,
        categoryName: body.categoryName,
        courseId: body.courseId,
        courseName: body.courseName,
        difficultyLevel: body.difficultyLevel || 'pass',
        questionCount: Math.min(body.questionCount || 1, 10), // Max 10 questions à la fois
        medicalDomain: body.medicalDomain,
        sourceContent: body.sourceContent,
      };

      // Validation des paramètres requis
      if (!generationRequest.categoryId) {
        return Response.json({
          error: 'categoryId requis pour la génération.'
        }, { status: 400 });
      }

      if (!generationRequest.courseId) {
        return Response.json({
          error: 'courseId requis pour la génération de questions.'
        }, { status: 400 });
      }

      if (!['pass', 'las'].includes(generationRequest.difficultyLevel)) {
        return Response.json({
          error: 'difficultyLevel doit être "pass" ou "las".'
        }, { status: 400 });
      }

      req.payload.logger.info(`Génération de ${generationRequest.questionCount} questions IA`, {
        userId: req.user.id,
        category: generationRequest.categoryName,
        level: generationRequest.difficultyLevel,
        domain: generationRequest.medicalDomain,
      });

      // Initialiser le service IA et générer les questions
      const aiService = new AIQuizGenerationService();
      const generatedQuestions = await aiService.generateQuestions(generationRequest);

      // Validation automatique des questions générées
      const validatedQuestions = generatedQuestions.map((question: GeneratedQuestion) => {
        const validation = aiService.validateGeneratedQuestion(question);
        return {
          ...question,
          validation,
        };
      });

      // Créer les questions dans la base de données
      const createdQuestions = [];
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
              course: question.courseId! as any,
              category: question.categoryId! as any,
              difficultyLevel: question.difficultyLevel,
              generatedByAI: question.generatedByAI,
              aiGenerationPrompt: question.aiGenerationPrompt,
              sourcePageReference: question.medicalDomain ? `Généré pour domaine: ${question.medicalDomain}` : undefined,
            },
          });
          createdQuestions.push({
            ...createdQuestion,
            validation: question.validation,
          });
        } catch (dbError) {
          req.payload.logger.error(`Erreur création question en DB:`, dbError);
          // Continuer avec les autres questions même si une échoue
        }
      }

      const successCount = createdQuestions.length;
      const totalRequested = generationRequest.questionCount;

      req.payload.logger.info(`${successCount}/${totalRequested} questions créées avec succès`);

      return Response.json({
        success: true,
        message: `${successCount} question(s) générée(s) avec succès.`,
        data: {
          requested: totalRequested,
          created: successCount,
          questions: createdQuestions,
        },
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      req.payload.logger.error(`Error in generateAIQuestionsEndpoint: ${errorMessage}`);

      return Response.json({
        error: 'Erreur lors de la génération des questions IA.',
        details: errorMessage
      }, { status: 500 });
    }
  },
};
