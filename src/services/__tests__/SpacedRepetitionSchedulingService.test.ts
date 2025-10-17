/**
 * Tests pour le service de planification de répétition espacée
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpacedRepetitionSchedulingService } from '../SpacedRepetitionSchedulingService';

// Mock global de payload
vi.mock('payload', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findByID: vi.fn(),
    update: vi.fn()
  }
}));

describe('SpacedRepetitionSchedulingService', () => {
  let service: SpacedRepetitionSchedulingService;
  let mockPayload: any;

  beforeEach(async () => {
    service = new SpacedRepetitionSchedulingService();
    mockPayload = (await import('payload')).default;
    vi.clearAllMocks();
  });

  describe('createScheduleForImportedFlashcards', () => {
    it('devrait créer un planning avec les paramètres par défaut', async () => {
      const userId = 'user123';
      const deckName = 'Test Deck';
      const questionIds = ['q1', 'q2', 'q3'];

      mockPayload.create.mockResolvedValue({ id: 'session123' });

      const schedule = await service.createScheduleForImportedFlashcards(
        userId,
        deckName,
        questionIds
      );

      expect(schedule).toBeDefined();
      expect(schedule.userId).toBe(userId);
      expect(schedule.deckName).toBe(deckName);
      expect(schedule.totalCards).toBe(3);
      expect(schedule.activeCards).toBe(3);
      expect(schedule.completedCards).toBe(0);
      expect(schedule.cards).toHaveLength(3);

      // Vérifier les paramètres par défaut SM-2
      schedule.cards.forEach(card => {
        expect(card.easeFactor).toBe(2.5);
        expect(card.interval).toBe(1);
        expect(card.repetitions).toBe(0);
        expect(card.nextReviewDate).toBeInstanceOf(Date);
      });
    });

    it('devrait ajuster les paramètres selon la difficulté', async () => {
      const userId = 'user123';
      const deckName = 'Hard Deck';
      const questionIds = ['q1', 'q2'];

      mockPayload.create.mockResolvedValue({ id: 'session123' });

      const schedule = await service.createScheduleForImportedFlashcards(
        userId,
        deckName,
        questionIds,
        { difficulty: 'hard' }
      );

      // Vérifier les ajustements pour difficulté "hard"
      schedule.cards.forEach(card => {
        expect(card.easeFactor).toBe(2.2);
        expect(card.interval).toBe(1);
      });
    });

    it('devrait ajuster les paramètres pour difficulté facile', async () => {
      const userId = 'user123';
      const deckName = 'Easy Deck';
      const questionIds = ['q1'];

      mockPayload.create.mockResolvedValue({ id: 'session123' });

      const schedule = await service.createScheduleForImportedFlashcards(
        userId,
        deckName,
        questionIds,
        { difficulty: 'easy' }
      );

      // Vérifier les ajustements pour difficulté "easy"
      schedule.cards.forEach(card => {
        expect(card.easeFactor).toBe(2.8);
        expect(card.interval).toBe(2);
      });
    });

    it('devrait créer une session d\'étude initiale', async () => {
      const userId = 'user123';
      const deckName = 'Test Deck';
      const questionIds = ['q1', 'q2', 'q3'];

      mockPayload.create.mockResolvedValue({ id: 'session123' });

      await service.createScheduleForImportedFlashcards(
        userId,
        deckName,
        questionIds
      );

      // Vérifier que create a été appelé deux fois (planning + session)
      expect(mockPayload.create).toHaveBeenCalledTimes(2);

      // Vérifier la création de la session d'étude
      const sessionCall = mockPayload.create.mock.calls[1];
      expect(sessionCall[0].collection).toBe('study-sessions');
      expect(sessionCall[0].data.title).toContain('Première révision');
      expect(sessionCall[0].data.steps).toHaveLength(3);
    });
  });

  describe('updateScheduleAfterReview', () => {
    it('devrait mettre à jour les cartes selon l\'algorithme SM-2', async () => {
      const scheduleId = 'schedule123';
      const mockSchedule = {
        id: scheduleId,
        userId: 'user123',
        deckName: 'Test Deck',
        cards: [
          {
            questionId: 'q1',
            easeFactor: 2.5,
            interval: 1,
            repetitions: 0,
            nextReviewDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        totalCards: 1,
        activeCards: 1,
        completedCards: 0,
        averageEaseFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock pour simuler la récupération du planning
      mockPayload.find.mockResolvedValue({
        docs: [{
          context: {
            isSpacedRepetitionSchedule: true,
            scheduleData: JSON.stringify(mockSchedule)
          }
        }]
      });

      const reviewResults = [
        {
          questionId: 'q1',
          quality: 4, // Bonne réponse
          responseTime: 3000,
          wasCorrect: true
        }
      ];

      const updatedSchedule = await service.updateScheduleAfterReview(
        scheduleId,
        reviewResults
      );

      expect(updatedSchedule).toBeDefined();
      expect(updatedSchedule.cards[0]?.repetitions).toBe(1);
      expect(updatedSchedule.cards[0]?.interval).toBe(1); // Premier intervalle SM-2 = 1 jour
      expect(updatedSchedule.cards[0]?.quality).toBe(4);
    });

    it('devrait réinitialiser les répétitions pour une mauvaise réponse', async () => {
      const scheduleId = 'schedule123';
      const mockSchedule = {
        id: scheduleId,
        userId: 'user123',
        deckName: 'Test Deck',
        cards: [
          {
            questionId: 'q1',
            easeFactor: 2.5,
            interval: 6,
            repetitions: 2,
            nextReviewDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        totalCards: 1,
        activeCards: 1,
        completedCards: 0,
        averageEaseFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPayload.find.mockResolvedValue({
        docs: [{
          context: {
            isSpacedRepetitionSchedule: true,
            scheduleData: JSON.stringify(mockSchedule)
          }
        }]
      });

      const reviewResults = [
        {
          questionId: 'q1',
          quality: 1, // Mauvaise réponse
          responseTime: 5000,
          wasCorrect: false
        }
      ];

      const updatedSchedule = await service.updateScheduleAfterReview(
        scheduleId,
        reviewResults
      );

      // Vérifier la réinitialisation
      expect(updatedSchedule.cards[0]?.repetitions).toBe(0);
      expect(updatedSchedule.cards[0]?.interval).toBe(1);
      expect(updatedSchedule.cards[0]?.quality).toBe(1);
    });
  });

  describe('generateReviewSession', () => {
    it.skip('devrait générer une session avec les cartes dues', async () => {
      const userId = 'user123';
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const mockSchedule = {
        id: 'schedule123',
        userId,
        deckName: 'Test Deck',
        cards: [
          {
            questionId: 'q1',
            easeFactor: 2.5,
            interval: 1,
            repetitions: 0,
            nextReviewDate: yesterday, // Due hier
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        totalCards: 1,
        activeCards: 1,
        completedCards: 0,
        averageEaseFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Reset mock and set up fresh
      vi.clearAllMocks();
      mockPayload.find.mockResolvedValue({
        docs: [{
          context: {
            isSpacedRepetitionSchedule: true,
            scheduleData: JSON.stringify(mockSchedule)
          }
        }]
      });

      const reviewSession = await service.generateReviewSession(userId, 20, 30);

      expect(reviewSession).not.toBeNull();
      if (reviewSession) {
        expect(reviewSession.cardsToReview).toHaveLength(1);
        expect(reviewSession.cardsToReview[0]?.questionId).toBe('q1');
        expect(reviewSession.estimatedDuration).toBe(2);
      }
    });

    it('devrait retourner null si aucune carte n\'est due', async () => {
      const userId = 'user123';
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const mockSchedule = {
        id: 'schedule123',
        userId,
        deckName: 'Test Deck',
        cards: [
          {
            questionId: 'q1',
            easeFactor: 2.5,
            interval: 1,
            repetitions: 0,
            nextReviewDate: tomorrow, // Due demain
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        totalCards: 1,
        activeCards: 1,
        completedCards: 0,
        averageEaseFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPayload.find.mockResolvedValue({
        docs: [{
          context: {
            isSpacedRepetitionSchedule: true,
            scheduleData: JSON.stringify(mockSchedule)
          }
        }]
      });

      const reviewSession = await service.generateReviewSession(userId, 20, 30);

      expect(reviewSession).toBeNull();
    });
  });

  describe('getUserProgressStats', () => {
    it.skip('devrait calculer les statistiques correctement', async () => {
      const userId = 'user123';
      const now = new Date();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const mockSchedule = {
        id: 'schedule123',
        userId,
        deckName: 'Test Deck',
        cards: [
          {
            questionId: 'q1',
            easeFactor: 2.8, // Carte "maîtrisée"
            interval: 30,
            repetitions: 5,
            nextReviewDate: tomorrow,
            lastReviewDate: now,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            questionId: 'q2',
            easeFactor: 2.2, // Carte active
            interval: 3,
            repetitions: 1,
            nextReviewDate: tomorrow,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        totalCards: 2,
        activeCards: 2,
        completedCards: 0,
        averageEaseFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Reset mock and set up fresh
      vi.clearAllMocks();
      mockPayload.find.mockResolvedValue({
        docs: [{
          context: {
            isSpacedRepetitionSchedule: true,
            scheduleData: JSON.stringify(mockSchedule)
          }
        }]
      });

      const stats = await service.getUserProgressStats(userId);

      expect(stats.totalCards).toBe(2);
      expect(stats.activeCards).toBe(2); // Les deux cartes sont dans les 7 prochains jours
      expect(stats.completedCards).toBe(1); // Une carte avec easeFactor >= 2.5 et interval >= 30
      expect(stats.averageEaseFactor).toBe(2.5);
      expect(stats.nextReviewDate).toBeInstanceOf(Date);
      expect(stats.streakDays).toBeGreaterThanOrEqual(0);
    });

    it('devrait retourner des statistiques par défaut si aucun planning', async () => {
      const userId = 'user123';

      mockPayload.find.mockResolvedValue({ docs: [] });

      const stats = await service.getUserProgressStats(userId);

      expect(stats.totalCards).toBe(0);
      expect(stats.activeCards).toBe(0);
      expect(stats.completedCards).toBe(0);
      expect(stats.averageEaseFactor).toBe(2.5);
      expect(stats.nextReviewDate).toBeNull();
      expect(stats.streakDays).toBe(0);
    });
  });

  describe('Algorithme SM-2', () => {
    it('devrait calculer correctement les intervalles pour des réponses correctes', () => {
      const service = new SpacedRepetitionSchedulingService();
      
      // Accéder à la méthode privée pour les tests
      const applySM2 = (service as any).applySM2Algorithm.bind(service);

      let card = {
        questionId: 'q1',
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Première répétition correcte (quality = 4)
      card = applySM2(card, 4);
      expect(card.repetitions).toBe(1);
      expect(card.interval).toBe(1); // Premier intervalle = 1 jour

      // Deuxième répétition correcte
      card = applySM2(card, 4);
      expect(card.repetitions).toBe(2);
      expect(card.interval).toBe(6); // Deuxième intervalle = 6 jours
    });

    it('devrait ajuster le facteur de facilité selon la qualité', () => {
      const service = new SpacedRepetitionSchedulingService();
      const applySM2 = (service as any).applySM2Algorithm.bind(service);

      let card = {
        questionId: 'q1',
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Réponse parfaite (quality = 5)
      card = applySM2(card, 5);
      expect(card.easeFactor).toBeGreaterThan(2.5);

      // Réponse difficile (quality = 3)
      card = applySM2(card, 3);
      expect(card.easeFactor).toBeLessThan(2.5);

      // Le facteur ne doit jamais descendre en dessous de 1.3
      card.easeFactor = 1.4;
      card = applySM2(card, 0);
      expect(card.easeFactor).toBe(1.3);
    });
  });
});