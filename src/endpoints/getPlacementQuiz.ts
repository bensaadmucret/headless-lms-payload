import type { PayloadRequest, Endpoint } from 'payload'
import { shuffleArray } from '../utils/shuffleArray'

export const getPlacementQuizEndpoint: Endpoint = {
  path: '/placement-quiz',
  method: 'get',
  handler: async (req: PayloadRequest): Promise<Response> => {
    try {
      // Récupérer le quiz de positionnement (type: 'placement')
      const placementQuizzes = await req.payload.find({
        collection: 'quizzes',
        where: {
          quizType: {
            equals: 'placement'
          },
          published: {
            equals: true
          }
        },
        depth: 2, // Pour récupérer les questions et leurs relations
        limit: 1
      })

      const placementQuiz = placementQuizzes.docs?.[0]
      if (!placementQuiz) {
        return new Response(
          JSON.stringify({ 
            message: 'Aucun quiz de positionnement disponible',
            error: 'NO_PLACEMENT_QUIZ'
          }), 
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Récupérer les questions avec toutes leurs relations (categories, etc.)
      const questionsWithDetails = await Promise.all(
        (placementQuiz.questions as any[]).map(async (questionId) => {
          const question = await req.payload.findByID({
            collection: 'questions',
            id: typeof questionId === 'object' ? questionId.id : questionId,
            depth: 2 // Pour récupérer les catégories
          })
          return question
        })
      )

      // Structurer la réponse selon le format attendu par le frontend
      const quizResponse = {
        id: placementQuiz.id,
        title: placementQuiz.title,
        description: placementQuiz.description,
        questions: questionsWithDetails.map(question => ({
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          options: Array.isArray(question.options) ? shuffleArray(question.options) : [],
          category: question.category ? {
            id: typeof question.category === 'object' ? question.category.id : question.category,
            title: typeof question.category === 'object' ? question.category.title : 'Catégorie inconnue'
          } : null,
          explanation: question.explanation
        }))
      }

      return new Response(
        JSON.stringify(quizResponse), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    } catch (error: any) {
      req.payload.logger.error('Error fetching placement quiz:', error)
      
      return new Response(
        JSON.stringify({ 
          message: 'Erreur lors de la récupération du quiz de positionnement',
          error: error.message 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
