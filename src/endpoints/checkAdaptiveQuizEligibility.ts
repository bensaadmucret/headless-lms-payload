import type { Endpoint, PayloadRequest } from 'payload';
import { EligibilityService } from '../services/EligibilityService';

/**
 * Endpoint pour vérifier l'éligibilité d'un utilisateur à générer un quiz adaptatif
 * Fournit des informations détaillées sur les prérequis et suggestions
 * Requirements: 3.1, 3.3
 */
export const checkAdaptiveQuizEligibilityEndpoint: Endpoint = {
  path: '/adaptive-quiz/can-generate',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    // 1. Vérifier l'authentification de l'utilisateur
    if (!req.user) {
      return Response.json({
        canGenerate: false,
        reason: 'Authentification requise pour accéder à cette fonctionnalité'
      }, { status: 401 });
    }

    try {
      req.payload.logger.info(`Vérification d'éligibilité pour l'utilisateur: ${req.user.id}`);

      // 2. Initialiser le service d'éligibilité
      const eligibilityService = new EligibilityService(req.payload);

      // 3. Vérifier l'éligibilité avec détails des exigences
      console.log('🔍 Début de la vérification d\'éligibilité...');
      const eligibility = await eligibilityService.checkEligibility(String(req.user.id));
      console.log('✅ Éligibilité vérifiée:', eligibility);

      // 4. Ajouter les exigences générales pour information
      const userRequirements = eligibilityService.getUserRequirements();

      // 5. Retourner la réponse compatible avec le frontend
      return Response.json({
        canGenerate: eligibility.canGenerate,
        reason: eligibility.reason,
        requirements: eligibility.requirements ? {
          minimumQuizzes: eligibility.requirements.minimumQuizzes.required,
          currentQuizzes: eligibility.requirements.minimumQuizzes.current,
          levelSet: eligibility.requirements.studentLevel.satisfied,
          categoriesAvailable: 10 // TODO: Calculate actual number
        } : undefined,
        nextAvailableAt: eligibility.nextAvailableAt,
        suggestedActions: eligibility.suggestions
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      req.payload.logger.error(`Error in checkAdaptiveQuizEligibilityEndpoint: ${errorMessage}`, {
        userId: req.user.id,
        error: error instanceof Error ? error.stack : error
      });

      // 6. Retourner une réponse d'erreur sécurisée
      return Response.json({
        canGenerate: false,
        reason: 'Erreur technique lors de la vérification des prérequis',
        error: {
          type: 'technical_error',
          message: 'Une erreur est survenue lors de la vérification. Veuillez réessayer.'
        }
      }, { status: 500 });
    }
  },
};