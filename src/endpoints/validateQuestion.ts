import type { PayloadRequest } from 'payload'

/**
 * Endpoint pour valider une question spécifique
 * Tâche 9: Système de validation manuelle par les experts
 * Exigences: 9.3
 */
export const validateQuestion = async (req: PayloadRequest): Promise<Response> => {
  try {
    const { questionId } = req.routeParams || {}
    
    if (!questionId) {
      return new Response(JSON.stringify({ 
        error: 'ID de question manquant' 
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
        error: 'Permissions insuffisantes pour valider des questions' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json!()
    const { validationStatus, validationNotes } = body

    if (!validationStatus || !['approved', 'rejected', 'needs_review'].includes(validationStatus)) {
      return new Response(JSON.stringify({ 
        error: 'Statut de validation invalide' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Mettre à jour la question avec les informations de validation
    const updatedQuestion = await req.payload.update({
      collection: 'questions',
      id: questionId as string,
      data: {
        validationStatus,
        validationNotes: validationNotes || '',
        validatedBy: req.user.id,
        validatedAt: new Date().toISOString()
      }
    })

    // Logger l'action de validation
    await req.payload.create({
      collection: 'auditlogs',
      data: {
        user: req.user.id,
        action: 'question_validated',
        collection: 'questions',
        documentId: questionId as string,
        diff: {
          validationStatus,
          validationNotes,
          validatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    })

    return new Response(JSON.stringify({
      success: true,
      question: updatedQuestion,
      message: `Question ${validationStatus === 'approved' ? 'approuvée' : validationStatus === 'rejected' ? 'rejetée' : 'marquée pour révision'}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('❌ Erreur validation question:', error)
    
    return new Response(JSON.stringify({
      error: 'Erreur lors de la validation de la question',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}