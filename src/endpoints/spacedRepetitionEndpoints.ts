/**
 * Endpoints pour la gestion des plannings de répétition espacée
 */

import type { Endpoint } from 'payload';
import { SpacedRepetitionSchedulingService } from '../services/SpacedRepetitionSchedulingService';

/**
 * Endpoint pour générer une session de révision
 * GET /api/spaced-repetition/review-session
 */
export const generateReviewSession: Endpoint = {
  path: '/review-session',
  method: 'get',
  handler: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentification requise'
        });
      }

      const { maxCards = 20, sessionDuration = 30 } = req.query;
      
      const spacedRepetitionService = new SpacedRepetitionSchedulingService();
      const reviewSession = await spacedRepetitionService.generateReviewSession(
        String(req.user.id),
        Number(maxCards),
        Number(sessionDuration)
      );

      if (!reviewSession) {
        return res.status(200).json({
          success: true,
          message: 'Aucune carte à réviser pour le moment',
          session: null
        });
      }

      return res.status(200).json({
        success: true,
        session: reviewSession
      });

    } catch (error) {
      console.error('Erreur lors de la génération de la session de révision:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }
};

/**
 * Endpoint pour soumettre les résultats d'une session de révision
 * POST /api/spaced-repetition/submit-review
 */
export const submitReviewResults: Endpoint = {
  path: '/submit-review',
  method: 'post',
  handler: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentification requise'
        });
      }

      const { scheduleId, reviewResults } = req.body;

      if (!scheduleId || !Array.isArray(reviewResults)) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres manquants: scheduleId et reviewResults requis'
        });
      }

      // Valider la structure des résultats
      for (const result of reviewResults) {
        if (!result.questionId || typeof result.quality !== 'number' || 
            result.quality < 0 || result.quality > 5) {
          return res.status(400).json({
            success: false,
            error: 'Format de résultat invalide: quality doit être entre 0 et 5'
          });
        }
      }

      const spacedRepetitionService = new SpacedRepetitionSchedulingService();
      const updatedSchedule = await spacedRepetitionService.updateScheduleAfterReview(
        scheduleId,
        reviewResults
      );

      return res.status(200).json({
        success: true,
        message: 'Résultats de révision enregistrés avec succès',
        schedule: {
          id: updatedSchedule.id,
          totalCards: updatedSchedule.totalCards,
          activeCards: updatedSchedule.activeCards,
          completedCards: updatedSchedule.completedCards,
          averageEaseFactor: updatedSchedule.averageEaseFactor
        }
      });

    } catch (error) {
      console.error('Erreur lors de la soumission des résultats:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }
};

/**
 * Endpoint pour obtenir les statistiques de progression
 * GET /api/spaced-repetition/progress-stats
 */
export const getProgressStats: Endpoint = {
  path: '/progress-stats',
  method: 'get',
  handler: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentification requise'
        });
      }

      const spacedRepetitionService = new SpacedRepetitionSchedulingService();
      const stats = await spacedRepetitionService.getUserProgressStats(String(req.user.id));

      return res.status(200).json({
        success: true,
        stats: {
          ...stats,
          nextReviewDate: stats.nextReviewDate?.toISOString() || null
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }
};

/**
 * Endpoint pour créer manuellement un planning de répétition espacée
 * POST /api/spaced-repetition/create-schedule
 */
export const createSchedule: Endpoint = {
  path: '/create-schedule',
  method: 'post',
  handler: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentification requise'
        });
      }

      const { deckName, questionIds, metadata } = req.body;

      if (!deckName || !Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Paramètres manquants: deckName et questionIds requis'
        });
      }

      const spacedRepetitionService = new SpacedRepetitionSchedulingService();
      const schedule = await spacedRepetitionService.createScheduleForImportedFlashcards(
        String(req.user.id),
        deckName,
        questionIds,
        metadata
      );

      return res.status(201).json({
        success: true,
        message: 'Planning de répétition espacée créé avec succès',
        schedule: {
          id: schedule.id,
          deckName: schedule.deckName,
          totalCards: schedule.totalCards,
          activeCards: schedule.activeCards,
          averageEaseFactor: schedule.averageEaseFactor,
          createdAt: schedule.createdAt
        }
      });

    } catch (error) {
      console.error('Erreur lors de la création du planning:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }
};