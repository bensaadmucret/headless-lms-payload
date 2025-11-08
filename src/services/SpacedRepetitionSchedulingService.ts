/**
 * Service de planification de répétition espacée pour les flashcards
 * Implémente l'algorithme SM-2 (SuperMemo 2) pour optimiser la mémorisation
 */

import payload from 'payload';
import type { StudySession, Question } from '../payload-types';

type SpacedRepetitionSessionContext = NonNullable<StudySession['context']> & {
  isSpacedRepetitionSchedule?: boolean;
  scheduleData?: string;
};

export interface SpacedRepetitionCard {
  questionId: string;
  easeFactor: number; // Facteur de facilité (1.3 - 2.5)
  interval: number; // Intervalle en jours
  repetitions: number; // Nombre de répétitions
  nextReviewDate: Date;
  lastReviewDate?: Date;
  quality?: number; // Qualité de la dernière réponse (0-5)
  createdAt: Date;
  updatedAt: Date;
}

export interface SpacedRepetitionSchedule {
  id: string;
  userId: string;
  deckName: string;
  cards: SpacedRepetitionCard[];
  totalCards: number;
  activeCards: number;
  completedCards: number;
  averageEaseFactor: number;
  createdAt: Date;
  updatedAt: Date;
  planId?: string;
}

export interface ReviewSession {
  scheduleId: string;
  userId: string;
  cardsToReview: SpacedRepetitionCard[];
  sessionDate: Date;
  estimatedDuration: number; // en minutes
}

export interface ReviewResult {
  questionId: string;
  quality: number; // 0-5 (0=blackout, 5=perfect)
  responseTime: number; // en millisecondes
  wasCorrect: boolean;
}

export class SpacedRepetitionSchedulingService {
  
  /**
   * Normalise un identifiant utilisateur pour les relations Payload (IDs numériques)
   */
  private normalizeUserId(userId: string | number): number {
    const numericId = typeof userId === 'number' ? userId : Number(userId);

    if (Number.isNaN(numericId)) {
      throw new Error(`Identifiant utilisateur invalide: ${userId}`);
    }

    return numericId;
  }

  /**
   * Crée un planning de répétition espacée pour un deck de flashcards importées
   */
  async createScheduleForImportedFlashcards(
    userId: string,
    deckName: string,
    questionIds: string[],
    metadata?: {
      difficulty?: 'easy' | 'medium' | 'hard';
      category?: string;
      estimatedSessionDuration?: number;
    }
  ): Promise<SpacedRepetitionSchedule> {
    try {
      // Initialiser les cartes avec les paramètres par défaut de l'algorithme SM-2
      const cards: SpacedRepetitionCard[] = questionIds.map(questionId => ({
        questionId,
        easeFactor: 2.5, // Valeur par défaut SM-2
        interval: 1, // Premier intervalle: 1 jour
        repetitions: 0,
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Ajuster les paramètres initiaux selon la difficulté
      if (metadata?.difficulty) {
        cards.forEach(card => {
          switch (metadata.difficulty) {
            case 'easy':
              card.easeFactor = 2.8; // Plus facile = facteur plus élevé
              card.interval = 2; // Commencer avec 2 jours
              break;
            case 'hard':
              card.easeFactor = 2.2; // Plus difficile = facteur plus bas
              card.interval = 1; // Commencer avec 1 jour
              break;
            default: // medium
              card.easeFactor = 2.5;
              card.interval = 1;
          }
        });
      }

      const schedule: SpacedRepetitionSchedule = {
        id: this.generateScheduleId(),
        userId,
        deckName,
        cards,
        totalCards: cards.length,
        activeCards: cards.length,
        completedCards: 0,
        averageEaseFactor: this.calculateAverageEaseFactor(cards),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Sauvegarder le planning en base de données
      const planId = await this.saveSchedule(schedule);
      if (planId) {
        schedule.planId = planId;
      }

      // Créer la première session d'étude
      await this.createInitialStudySession(schedule, metadata?.estimatedSessionDuration);

      console.log(`Planning de répétition espacée créé pour ${cards.length} flashcards`);
      return schedule;

    } catch (error) {
      console.error('Erreur lors de la création du planning de répétition espacée:', error);
      throw new Error(`Impossible de créer le planning: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Met à jour le planning après une session de révision
   */
  async updateScheduleAfterReview(
    scheduleId: string,
    reviewResults: ReviewResult[]
  ): Promise<SpacedRepetitionSchedule> {
    try {
      const schedule = await this.getSchedule(scheduleId);
      if (!schedule) {
        throw new Error(`Planning ${scheduleId} non trouvé`);
      }

      // Mettre à jour chaque carte selon les résultats
      for (const result of reviewResults) {
        const cardIndex = schedule.cards.findIndex(card => card.questionId === result.questionId);
        if (cardIndex === -1) continue;

        const card = schedule.cards[cardIndex]!;
        
        // Appliquer l'algorithme SM-2
        const updatedCard = this.applySM2Algorithm(card, result.quality);
        schedule.cards[cardIndex] = updatedCard;
      }

      // Recalculer les statistiques du planning
      schedule.activeCards = schedule.cards.filter(card => 
        card.nextReviewDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Dans les 30 prochains jours
      ).length;
      
      schedule.completedCards = schedule.cards.filter(card => 
        card.easeFactor >= 2.5 && card.interval >= 30 // Cartes "maîtrisées"
      ).length;
      
      schedule.averageEaseFactor = this.calculateAverageEaseFactor(schedule.cards);
      schedule.updatedAt = new Date();

      // Sauvegarder les modifications
      await this.saveSchedule(schedule);

      console.log(`Planning ${scheduleId} mis à jour après révision`);
      return schedule;

    } catch (error) {
      console.error('Erreur lors de la mise à jour du planning:', error);
      throw new Error(`Impossible de mettre à jour le planning: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Génère une session de révision pour un utilisateur
   */
  async generateReviewSession(
    userId: string,
    maxCards: number = 20,
    sessionDuration: number = 30 // minutes
  ): Promise<ReviewSession | null> {
    try {
      // Récupérer tous les plannings de l'utilisateur
      const userSchedules = await this.getUserSchedules(userId);
      
      // Collecter toutes les cartes à réviser
      const cardsToReview: SpacedRepetitionCard[] = [];
      
      for (const schedule of userSchedules) {
        const dueCards = schedule.cards.filter(card => 
          card.nextReviewDate <= new Date()
        );
        cardsToReview.push(...dueCards);
      }

      if (cardsToReview.length === 0) {
        console.log(`Aucune carte à réviser pour l'utilisateur ${userId}`);
        return null;
      }

      // Trier par priorité (cartes en retard d'abord, puis par facilité)
      cardsToReview.sort((a, b) => {
        const aOverdue = Math.max(0, Date.now() - a.nextReviewDate.getTime());
        const bOverdue = Math.max(0, Date.now() - b.nextReviewDate.getTime());
        
        if (aOverdue !== bOverdue) {
          return bOverdue - aOverdue; // Plus en retard = plus prioritaire
        }
        
        return a.easeFactor - b.easeFactor; // Plus difficile = plus prioritaire
      });

      // Limiter le nombre de cartes
      const selectedCards = cardsToReview.slice(0, maxCards);

      const reviewSession: ReviewSession = {
        scheduleId: userSchedules[0]?.id || 'mixed',
        userId,
        cardsToReview: selectedCards,
        sessionDate: new Date(),
        estimatedDuration: Math.min(sessionDuration, selectedCards.length * 2) // 2 min par carte max
      };

      console.log(`Session de révision générée: ${selectedCards.length} cartes pour ${sessionDuration} minutes`);
      return reviewSession;

    } catch (error) {
      console.error('Erreur lors de la génération de la session de révision:', error);
      throw new Error(`Impossible de générer la session: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Applique l'algorithme SM-2 pour calculer le prochain intervalle
   */
  private applySM2Algorithm(card: SpacedRepetitionCard, quality: number): SpacedRepetitionCard {
    const updatedCard = { ...card };
    updatedCard.quality = quality;
    updatedCard.lastReviewDate = new Date();
    updatedCard.updatedAt = new Date();

    if (quality >= 3) {
      // Réponse correcte
      if (updatedCard.repetitions === 0) {
        updatedCard.interval = 1;
      } else if (updatedCard.repetitions === 1) {
        updatedCard.interval = 6;
      } else {
        updatedCard.interval = Math.round(updatedCard.interval * updatedCard.easeFactor);
      }
      updatedCard.repetitions += 1;
    } else {
      // Réponse incorrecte - recommencer
      updatedCard.repetitions = 0;
      updatedCard.interval = 1;
    }

    // Ajuster le facteur de facilité
    updatedCard.easeFactor = Math.max(1.3, 
      updatedCard.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // Calculer la prochaine date de révision
    updatedCard.nextReviewDate = new Date(Date.now() + updatedCard.interval * 24 * 60 * 60 * 1000);

    return updatedCard;
  }

  /**
   * Calcule le facteur de facilité moyen d'un ensemble de cartes
   */
  private calculateAverageEaseFactor(cards: SpacedRepetitionCard[]): number {
    if (cards.length === 0) return 2.5;
    
    const sum = cards.reduce((acc, card) => acc + card.easeFactor, 0);
    return Math.round((sum / cards.length) * 100) / 100;
  }

  /**
   * Génère un ID unique pour un planning
   */
  private generateScheduleId(): string {
    return `srs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Crée une session d'étude initiale pour un nouveau planning
   */
  private async createInitialStudySession(
    schedule: SpacedRepetitionSchedule,
    estimatedDuration: number = 30
  ): Promise<void> {
    try {
      const userId = this.normalizeUserId(schedule.userId);

      // Sélectionner les premières cartes à étudier (max 10 pour commencer)
      const initialCards = schedule.cards.slice(0, Math.min(10, schedule.cards.length));
      
      // Créer une session d'étude avec les flashcards
      const sessionData = {
        title: `Première révision - ${schedule.deckName}`,
        user: userId,
        status: 'draft' as const,
        estimatedDuration: estimatedDuration,
        currentStep: 0,
        steps: initialCards.map((card, index) => ({
          stepId: index + 1,
          type: 'flashcards' as const,
          title: `Flashcard ${index + 1}`,
          description: 'Révisez cette flashcard et évaluez votre compréhension',
          status: 'pending' as const,
          metadata: {
            questionId: card.questionId,
            scheduleId: schedule.id,
            cardIndex: index,
            isSpacedRepetition: true,
            nextReviewDate: card.nextReviewDate.toISOString()
          }
        })),
        context: {
          difficulty: 'beginner' as const,
          course: null
        }
      };

      await payload.create({
        collection: 'study-sessions',
        data: sessionData
      });

      console.log(`Session d'étude initiale créée pour le planning ${schedule.id}`);

    } catch (error) {
      console.error('Erreur lors de la création de la session initiale:', error);
      // Ne pas faire échouer la création du planning si la session échoue
    }
  }

  /**
   * Sauvegarde un planning en base de données
   */
  private async saveSchedule(schedule: SpacedRepetitionSchedule): Promise<string> {
    try {
      const userId = this.normalizeUserId(schedule.userId);
      const { weekStart, weekEnd } = this.getWeekRange(schedule.createdAt);
      const weekStartISO = weekStart.toISOString();
      const weekEndISO = weekEnd.toISOString();
      const scheduleJson = JSON.stringify(schedule);
      const metadata = {
        totalCards: schedule.totalCards,
        activeCards: schedule.activeCards,
        completedCards: schedule.completedCards,
        averageEaseFactor: schedule.averageEaseFactor,
      };

      const payloadClient = payload as any;

      const existingPlans = await payloadClient.find({
        collection: 'study-plans',
        where: {
          scheduleId: {
            equals: schedule.id,
          },
          planType: {
            equals: 'spaced_repetition',
          },
        },
        limit: 1,
      });

      const durationEstimate = Math.min(schedule.cards.length * 2, 120);

      if (existingPlans.docs.length > 0) {
        const plan = existingPlans.docs[0]!;
        await payloadClient.update({
          collection: 'study-plans',
          id: plan.id,
          data: {
            title: plan.title || `Planning SRS - ${schedule.deckName}`,
            plannedDurationMinutes: durationEstimate,
            autoGenerated: true,
            status: plan.status ?? 'active',
            weekStart: plan.weekStart || weekStartISO,
            weekEnd: plan.weekEnd || weekEndISO,
            metadata,
            srsScheduleData: scheduleJson,
          },
        });
        return `${plan.id}`;
      }

      const createdPlan = await payloadClient.create({
        collection: 'study-plans',
        data: {
          title: `Planning SRS - ${schedule.deckName}`,
          user: userId,
          planType: 'spaced_repetition',
          status: 'active',
          scheduleId: schedule.id,
          weekStart: weekStartISO,
          weekEnd: weekEndISO,
          plannedDurationMinutes: durationEstimate,
          autoGenerated: true,
          slots: [],
          metadata,
          srsScheduleData: scheduleJson,
        },
      });

      return `${createdPlan.id}`;

    } catch (error) {
      console.error('Erreur lors de la sauvegarde du planning:', error);
      throw error;
    }
  }

  /**
   * Récupère un planning par son ID
   */
  private async getSchedule(scheduleId: string): Promise<SpacedRepetitionSchedule | null> {
    try {
      const payloadClient = payload as any;

      const response = await payloadClient.find({
        collection: 'study-plans',
        where: {
          scheduleId: {
            equals: scheduleId,
          },
          planType: {
            equals: 'spaced_repetition',
          },
        },
        limit: 1,
      });

      if (response.docs.length > 0) {
        const plan = response.docs[0]!;
        if (plan.srsScheduleData) {
          try {
            const schedule = JSON.parse(plan.srsScheduleData as string) as SpacedRepetitionSchedule;
            schedule.planId = `${plan.id}`;
            return schedule;
          } catch (parseError) {
            console.error('Impossible de parser le planning SRS', parseError);
          }
        }
      }

      // Fallback legacy (study-sessions)
      const legacyResponse = await payloadClient.find({
        collection: 'study-sessions',
        where: {
          'context.isSpacedRepetitionSchedule': {
            equals: true,
          },
        },
      });

      for (const session of legacyResponse.docs) {
        if (session.context && typeof session.context === 'object' && 'scheduleData' in session.context) {
          try {
            const schedule = JSON.parse(session.context.scheduleData as string) as SpacedRepetitionSchedule;
            if (schedule.id === scheduleId) {
              return schedule;
            }
          } catch {
            continue;
          }
        }
      }

      return null;

    } catch (error) {
      console.error('Erreur lors de la récupération du planning:', error);
      return null;
    }
  }

  /**
   * Récupère tous les plannings d'un utilisateur
   */
  private async getUserSchedules(userId: string): Promise<SpacedRepetitionSchedule[]> {
    try {
      const normalizedUserId = this.normalizeUserId(userId);

      const payloadClient = payload as any;

      const response = await payloadClient.find({
        collection: 'study-plans',
        where: {
          user: {
            equals: normalizedUserId,
          },
          planType: {
            equals: 'spaced_repetition',
          },
        },
      });

      const schedules: SpacedRepetitionSchedule[] = [];

      for (const plan of (response as any).docs) {
        if (plan.srsScheduleData) {
          try {
            const schedule = JSON.parse(plan.srsScheduleData as string) as SpacedRepetitionSchedule;
            schedule.planId = `${plan.id}`;
            schedules.push(schedule);
          } catch {
            continue;
          }
        }
      }

      if (schedules.length > 0) {
        return schedules;
      }

      // Fallback legacy storage
      const legacyResponse = await payloadClient.find({
        collection: 'study-sessions',
        where: {
          user: {
            equals: normalizedUserId,
          },
          'context.isSpacedRepetitionSchedule': {
            equals: true,
          },
        },
      });

      for (const session of legacyResponse.docs) {
        if (session.context && typeof session.context === 'object' && 'scheduleData' in session.context) {
          try {
            const schedule = JSON.parse(session.context.scheduleData as string) as SpacedRepetitionSchedule;
            schedules.push(schedule);
          } catch {
            continue;
          }
        }
      }

      return schedules;

    } catch (error) {
      console.error('Erreur lors de la récupération des plannings utilisateur:', error);
      return [];
    }
  }

  /**
   * Calcule le début et la fin de semaine à partir d'une date de référence
   */
  private getWeekRange(referenceDate: Date): { weekStart: Date; weekEnd: Date } {
    const weekStart = new Date(referenceDate);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay(); // 0 (Dimanche) -> 6 (Samedi)
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diffToMonday);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  }

  /**
   * Obtient les statistiques de progression pour un utilisateur
   */
  async getUserProgressStats(userId: string): Promise<{
    totalCards: number;
    activeCards: number;
    completedCards: number;
    averageEaseFactor: number;
    nextReviewDate: Date | null;
    streakDays: number;
  }> {
    try {
      const schedules = await this.getUserSchedules(userId);
      
      if (schedules.length === 0) {
        return {
          totalCards: 0,
          activeCards: 0,
          completedCards: 0,
          averageEaseFactor: 2.5,
          nextReviewDate: null,
          streakDays: 0
        };
      }

      const allCards = schedules.flatMap(schedule => schedule.cards);
      const totalCards = allCards.length;
      const activeCards = allCards.filter(card => 
        card.nextReviewDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ).length;
      const completedCards = allCards.filter(card => 
        card.easeFactor >= 2.5 && card.interval >= 30
      ).length;

      const averageEaseFactor = this.calculateAverageEaseFactor(allCards);
      
      // Prochaine date de révision
      const nextCards = allCards.filter(card => card.nextReviewDate > new Date());
      const nextReviewDate = nextCards.length > 0 
        ? new Date(Math.min(...nextCards.map(card => card.nextReviewDate.getTime())))
        : null;

      // Calcul simple du streak (à améliorer avec un vrai historique)
      const streakDays = this.calculateStreakDays(allCards);

      return {
        totalCards,
        activeCards,
        completedCards,
        averageEaseFactor,
        nextReviewDate,
        streakDays
      };

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return {
        totalCards: 0,
        activeCards: 0,
        completedCards: 0,
        averageEaseFactor: 2.5,
        nextReviewDate: null,
        streakDays: 0
      };
    }
  }

  /**
   * Calcule le nombre de jours consécutifs de révision
   */
  private calculateStreakDays(cards: SpacedRepetitionCard[]): number {
    // Implémentation simplifiée - compter les cartes révisées récemment
    const recentlyReviewed = cards.filter(card => 
      card.lastReviewDate && 
      card.lastReviewDate > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    return Math.min(recentlyReviewed.length, 7); // Max 7 jours pour cette version simple
  }
}