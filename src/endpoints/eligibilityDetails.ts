import type { Endpoint, PayloadRequest } from 'payload';
import { EligibilityService } from '../services/EligibilityService';

/**
 * Endpoint pour obtenir les détails d'éligibilité aux quiz adaptatifs
 * Path: /adaptive-quiz/eligibility-details
 */
export const eligibilityDetailsEndpoint: Endpoint = {
  path: '/adaptive-quiz/eligibility-details',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    // 1. Vérifier l'authentification de l'utilisateur
    if (!req.user) {
      return Response.json({
        success: false,
        error: {
          type: 'authentication_required',
          message: 'Authentification requise pour accéder à cette fonctionnalité'
        }
      }, { status: 401 });
    }

    try {
      req.payload.logger.info(`Récupération des détails d'éligibilité pour l'utilisateur: ${req.user.id}`);

      // 2. Initialiser le service d'éligibilité
      const eligibilityService = new EligibilityService(req.payload);

      // 3. Vérifier l'éligibilité avec tous les détails
      const eligibility = await eligibilityService.checkEligibility(String(req.user.id));

      // 4. Calculer le nombre de catégories disponibles
      let categoriesAvailable = 0;
      try {
        const categories = await req.payload.find({
          collection: 'categories',
          limit: 1000
        });
        categoriesAvailable = categories.totalDocs;
      } catch (error) {
        req.payload.logger.warn('Failed to count categories:', error);
      }

      // 5. Transformer la réponse pour correspondre au format attendu par le frontend
      const response = {
        canGenerate: eligibility.canGenerate,
        reason: eligibility.reason,
        requirements: eligibility.requirements ? {
          minimumQuizzes: eligibility.requirements.minimumQuizzes.required,
          currentQuizzes: eligibility.requirements.minimumQuizzes.current,
          levelSet: eligibility.requirements.studentLevel.satisfied,
          categoriesAvailable
        } : undefined,
        nextAvailableAt: eligibility.nextAvailableAt,
        suggestedActions: eligibility.suggestions || []
      };

      req.payload.logger.info(`📤 Eligibility response for user ${req.user.id}:`, {
        canGenerate: response.canGenerate,
        reason: response.reason,
        requirements: response.requirements
      });

      // 5. Retourner la réponse complète
      return Response.json({
        success: true,
        data: response
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      req.payload.logger.error(`Error in eligibilityDetailsEndpoint: ${errorMessage}`, {
        userId: req.user.id,
        error: error instanceof Error ? error.stack : error
      });

      // 6. Retourner une réponse d'erreur sécurisée
      return Response.json({
        success: false,
        error: {
          type: 'technical_error',
          message: 'Erreur technique lors de la vérification des prérequis'
        }
      }, { status: 500 });
    }
  },
};