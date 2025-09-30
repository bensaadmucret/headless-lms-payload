import type { PayloadRequest } from 'payload'

export const completePlacementQuizEndpoint = {
  path: '/placement-quiz/complete',
  method: 'post' as const,
  handler: async (req: PayloadRequest): Promise<Response> => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user) {
        return new Response(
          JSON.stringify({ message: 'Authentification requise' }), 
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Récupérer les données du quiz de positionnement depuis le body de la requête
      const body = await req.json()
      const { answers, scores } = body

      // Mettre à jour l'utilisateur pour marquer le quiz comme terminé
      const updatedUser = await req.payload.update({
        collection: 'users',
        id: req.user.id,
        data: {
          hasTakenPlacementQuiz: true,
          // Optionnel : stocker les résultats dans le profil de compétences
          competencyProfile: {
            placementQuizResults: {
              scores,
              completedAt: new Date().toISOString(),
              answers
            }
          }
        }
      })

      // Optionnel : créer un enregistrement QuizSubmission pour traçabilité
      try {
        await req.payload.create({
          collection: 'quiz-submissions',
          data: {
            user: req.user.id,
            quiz: body.quizId, // ID du quiz de positionnement
            answers: answers,
            score: body.globalScore || 0,
            submittedAt: new Date(),
            isPlacementQuiz: true
          }
        })
      } catch (submissionError) {
        // Log l'erreur mais ne pas faire échouer la requête principale
        req.payload.logger.warn('Failed to create quiz submission record:', submissionError)
      }

      return new Response(
        JSON.stringify({ 
          message: 'Quiz de positionnement terminé avec succès',
          user: updatedUser,
          placementCompleted: true
        }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    } catch (error: any) {
      req.payload.logger.error('Error completing placement quiz:', error)
      
      return new Response(
        JSON.stringify({ 
          message: 'Erreur lors de la finalisation du quiz de positionnement',
          error: error.message 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}