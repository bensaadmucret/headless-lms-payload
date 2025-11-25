import type { PayloadRequest } from 'payload'

/**
 * Endpoint pour valider un quiz complet
 * Tâche 9: Système de validation manuelle par les experts
 * Exigences: 9.3
 */
export const validateQuiz = async (req: PayloadRequest): Promise<Response> => {
  try {
    const { quizId } = req.routeParams || {}
    
    if (!quizId) {
      return new Response(JSON.stringify({ 
        error: 'ID de quiz manquant' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Vérifier l'authentification et les permissions
    if (!req.user) {
      return new Response(JSON.stringify({ 
        error: 'Authentification requise' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Seuls les admins peuvent valider
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return new Response(JSON.stringify({ 
        error: 'Permissions insuffisantes pour valider des quiz' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json!()
    const { validationStatus, validationNotes } = body

    if (!validationStatus || !['approved', 'rejected', 'pending_review'].includes(validationStatus)) {
      return new Response(JSON.stringify({ 
        error: 'Statut de validation invalide' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Récupérer le quiz avec ses questions pour vérifier l'état de validation
    const quiz = await req.payload.findByID({
      collection: 'quizzes',
      id: quizId as string,
      depth: 2
    })

    if (!quiz) {
      return new Response(JSON.stringify({ 
        error: 'Quiz non trouvé' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Vérifier l'état de validation des questions si on approuve le quiz
    if (validationStatus === 'approved' && Array.isArray(quiz.questions)) {
      const questionsWithValidation = quiz.questions.filter((q: any) => 
        typeof q === 'object' && q.validationStatus
      )
      
      const rejectedQuestions = questionsWithValidation.filter((q: any) => 
        q.validationStatus === 'rejected'
      )
      
      if (rejectedQuestions.length > 0) {
        return new Response(JSON.stringify({ 
          error: `Impossible d'approuver le quiz: ${rejectedQuestions.length} question(s) rejetée(s)`,
          rejectedQuestions: rejectedQuestions.map((q: any) => ({
            id: q.id,
            questionText: q.questionText,
            validationNotes: q.validationNotes
          }))
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Mettre à jour le quiz avec les informations de validation
    const updatedQuiz = await req.payload.update({
      collection: 'quizzes',
      id: quizId as string,
      data: {
        validationStatus,
        validationNotes: validationNotes || '',
        validatedBy: String(req.user.id),
        validatedAt: new Date().toISOString(),
        // Publier automatiquement si approuvé, dépublier si rejeté
        published: validationStatus === 'approved'
          ? true
          : validationStatus === 'rejected'
          ? false
          : quiz.published
      }
    })

    // Logger l'action de validation
    await req.payload.create({
      collection: 'auditlogs',
      data: {
        user: req.user.id,
        action: 'quiz_validated',
        collection: 'quizzes',
        documentId: quizId as string,
        diff: {
          validationStatus,
          validationNotes,
          validatedAt: new Date().toISOString(),
          autoPublished: validationStatus === 'approved'
        },
        timestamp: new Date().toISOString()
      }
    })

    return new Response(JSON.stringify({
      success: true,
      quiz: updatedQuiz,
      message: validationStatus === 'approved' 
        ? 'Quiz approuvé et publié avec succès'
        : validationStatus === 'rejected'
        ? 'Quiz rejeté'
        : 'Quiz marqué pour révision'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ Erreur validation quiz:', error)
    
    return new Response(JSON.stringify({
      error: 'Erreur lors de la validation du quiz',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}