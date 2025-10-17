import type { PayloadRequest } from 'payload'
import { AIQuizGenerationService } from '../services/AIQuizGenerationService'

/**
 * Endpoint pour régénérer une question spécifique
 * Tâche 9: Possibilité de régénérer des questions spécifiques
 * Exigences: 9.4
 */
export const regenerateQuestion = async (req: PayloadRequest): Promise<Response> => {
  try {
    // Vérifier l'authentification et les permissions
    if (!req.user) {
      return new Response(JSON.stringify({ 
        error: 'Authentification requise' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Seuls les admins peuvent régénérer
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return new Response(JSON.stringify({ 
        error: 'Permissions insuffisantes pour régénérer des questions' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json!()
    const { questionId, quizId, regenerationReason } = body

    if (!questionId || !quizId) {
      return new Response(JSON.stringify({ 
        error: 'ID de question et de quiz requis' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Récupérer la question originale
    const originalQuestion = await req.payload.findByID({
      collection: 'questions',
      id: questionId as string,
      depth: 1
    })

    if (!originalQuestion) {
      return new Response(JSON.stringify({ 
        error: 'Question non trouvée' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Récupérer le quiz pour obtenir le contexte
    const quiz = await req.payload.findByID({
      collection: 'quizzes',
      id: quizId as string,
      depth: 1
    })

    if (!quiz) {
      return new Response(JSON.stringify({ 
        error: 'Quiz non trouvé' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Initialiser le service de génération IA
    const aiService = new AIQuizGenerationService(req.payload)

    // Extraire le contexte de la question originale
    const questionContext = {
      categoryId: (originalQuestion as any).category?.id || (originalQuestion as any).category,
      categoryName: (originalQuestion as any).category?.title || 'Général',
      courseId: (originalQuestion as any).course?.id || (originalQuestion as any).course,
      courseName: (originalQuestion as any).course?.title,
      difficultyLevel: (originalQuestion as any).difficultyLevel || 'pass',
      medicalDomain: (originalQuestion as any).medicalDomain || 'médecine générale'
    }

    console.log('🔄 Régénération de question:', {
      questionId,
      quizId,
      context: questionContext,
      reason: regenerationReason
    })

    // Générer une nouvelle question avec le même contexte
    const generatedQuestions = await aiService.generateQuestions({
      categoryId: questionContext.categoryId,
      categoryName: questionContext.categoryName,
      courseId: questionContext.courseId,
      courseName: questionContext.courseName,
      difficultyLevel: questionContext.difficultyLevel as 'pass' | 'las',
      questionCount: 1,
      medicalDomain: questionContext.medicalDomain
    }, req.user.id)

    if (!generatedQuestions || generatedQuestions.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Échec de la génération de la nouvelle question' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const newQuestionData = generatedQuestions[0]!

    // Mettre à jour la question existante avec le nouveau contenu
    const updatedQuestion = await req.payload.update({
      collection: 'questions',
      id: questionId as string,
      data: {
        questionText: {
          root: {
            type: 'root',
            children: [{
              type: 'paragraph',
              children: [{
                type: 'text',
                text: newQuestionData.questionText
              }]
            }]
          }
        },
        options: newQuestionData.options.map(opt => ({
          optionText: opt.optionText,
          isCorrect: opt.isCorrect
        })),
        explanation: newQuestionData.explanation,
        generatedByAI: true,
        aiGenerationPrompt: newQuestionData.aiGenerationPrompt,
        qualityScore: newQuestionData.qualityScore,
        validationIssues: newQuestionData.validationIssues?.map(issue => ({ issue })) || [],
        // Réinitialiser le statut de validation
        validationStatus: 'pending',
        validationNotes: `Régénérée le ${new Date().toLocaleDateString()} - Raison: ${regenerationReason || 'Demande utilisateur'}`,
        validatedBy: null,
        validatedAt: null,
        regenerationReason: regenerationReason || 'user_request'
      }
    })

    // Logger l'action de régénération
    await req.payload.create({
      collection: 'auditlogs',
      data: {
        user: req.user.id,
        action: 'question_regenerated',
        collection: 'questions',
        documentId: questionId as string,
        diff: {
          quizId,
          regenerationReason,
          originalQualityScore: (originalQuestion as any).qualityScore,
          newQualityScore: newQuestionData.qualityScore,
          regeneratedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    })

    return new Response(JSON.stringify({
      success: true,
      question: updatedQuestion,
      message: 'Question régénérée avec succès',
      metadata: {
        originalQualityScore: (originalQuestion as any).qualityScore,
        newQualityScore: newQuestionData.qualityScore,
        regeneratedAt: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ Erreur régénération question:', error)
    
    return new Response(JSON.stringify({
      error: 'Erreur lors de la régénération de la question',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}