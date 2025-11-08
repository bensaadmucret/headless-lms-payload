/**
 * Tests pour le service de planification de répétition espacée
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpacedRepetitionSchedulingService } from '../SpacedRepetitionSchedulingService';

const payloadMock = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn(),
  update: vi.fn(),
}));

vi.mock('payload', () => ({
  default: payloadMock,
}));

const createPlanRecord = (schedule: any) => ({
  id: 'plan-1',
  title: 'Planning SRS',
  status: 'active',
  weekStart: new Date().toISOString(),
  weekEnd: new Date().toISOString(),
  planType: 'spaced_repetition',
  scheduleId: schedule.id,
  srsScheduleData: JSON.stringify(schedule),
});

describe('SpacedRepetitionSchedulingService', () => {
  let service: SpacedRepetitionSchedulingService;

  beforeEach(() => {
    service = new SpacedRepetitionSchedulingService();

    payloadMock.create.mockReset();
    payloadMock.find.mockReset();
    payloadMock.findByID.mockReset();
    payloadMock.update.mockReset();

    payloadMock.find.mockResolvedValue({ docs: [] });
    payloadMock.create.mockResolvedValue({ id: 'created-id' });
    payloadMock.update.mockResolvedValue({ id: 'updated-id' });
  });

  describe('createScheduleForImportedFlashcards', () => {
    it('devrait créer un planning avec les paramètres par défaut', async () => {
      const userId = '123';
      const deckName = 'Test Deck';
      const questionIds = ['q1', 'q2', 'q3'];

      payloadMock.create
        .mockResolvedValueOnce({ id: 'plan-123' })
        .mockResolvedValueOnce({ id: 'session-123' });

      const schedule = await service.createScheduleForImportedFlashcards(
        userId,
        deckName,
        questionIds
      );

      expect(schedule.userId).toBe(userId);
      expect(schedule.totalCards).toBe(3);
      expect(payloadMock.create).toHaveBeenCalledTimes(2);
    });

    it('ajuste les paramètres selon la difficulté hard', async () => {
      const userId = '123';
      const questionIds = ['q1', 'q2'];

      payloadMock.create
        .mockResolvedValueOnce({ id: 'plan-123' })
        .mockResolvedValueOnce({ id: 'session-123' });

      const schedule = await service.createScheduleForImportedFlashcards(
        userId,
        'Hard Deck',
        questionIds,
        { difficulty: 'hard' }
      );

      schedule.cards.forEach((card) => {
        expect(card.easeFactor).toBe(2.2);
        expect(card.interval).toBe(1);
      });
    });

    it('ajuste les paramètres selon la difficulté easy', async () => {
      const userId = '123';

      payloadMock.create
        .mockResolvedValueOnce({ id: 'plan-123' })
        .mockResolvedValueOnce({ id: 'session-123' });

      const schedule = await service.createScheduleForImportedFlashcards(
        userId,
        'Easy Deck',
        ['q1'],
        { difficulty: 'easy' }
      );

      schedule.cards.forEach((card) => {
        expect(card.easeFactor).toBe(2.8);
        expect(card.interval).toBe(2);
      });
    });

    it("crée une session d'étude initiale", async () => {
      const userId = '123';

      payloadMock.create
        .mockResolvedValueOnce({ id: 'plan-123', collection: 'study-plans' })
        .mockResolvedValueOnce({ id: 'session-123', collection: 'study-sessions' });

      await service.createScheduleForImportedFlashcards(userId, 'Deck', ['q1', 'q2']);

      expect(payloadMock.create).toHaveBeenCalledTimes(2);
      const sessionCall = payloadMock.create.mock.calls[1]![0];
      expect(sessionCall.collection).toBe('study-sessions');
    });
  });

  describe('updateScheduleAfterReview', () => {
    it("met à jour le planning après une bonne réponse", async () => {
      const scheduleId = 'schedule-1';
      const schedule = {
        id: scheduleId,
        userId: '123',
        deckName: 'Deck',
        cards: [
          {
            questionId: 'q1',
            easeFactor: 2.5,
            interval: 1,
            repetitions: 0,
            nextReviewDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        totalCards: 1,
        activeCards: 1,
        completedCards: 0,
        averageEaseFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const planRecord = createPlanRecord(schedule);

      payloadMock.find
        .mockResolvedValueOnce({ docs: [planRecord] })
        .mockResolvedValueOnce({ docs: [planRecord] });

      const updatedSchedule = await service.updateScheduleAfterReview(scheduleId, [
        {
          questionId: 'q1',
          quality: 4,
          responseTime: 3000,
          wasCorrect: true,
        },
      ]);

      expect(updatedSchedule.cards[0]?.repetitions).toBe(1);
      expect(payloadMock.update).toHaveBeenCalled();
    });

    it('réinitialise la carte après une mauvaise réponse', async () => {
      const scheduleId = 'schedule-1';
      const schedule = {
        id: scheduleId,
        userId: '123',
        deckName: 'Deck',
        cards: [
          {
            questionId: 'q1',
            easeFactor: 2.5,
            interval: 6,
            repetitions: 2,
            nextReviewDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        totalCards: 1,
        activeCards: 1,
        completedCards: 0,
        averageEaseFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const planRecord = createPlanRecord(schedule);

      payloadMock.find
        .mockResolvedValueOnce({ docs: [planRecord] })
        .mockResolvedValueOnce({ docs: [planRecord] });

      const updatedSchedule = await service.updateScheduleAfterReview(scheduleId, [
        {
          questionId: 'q1',
          quality: 1,
          responseTime: 5000,
          wasCorrect: false,
        },
      ]);

      expect(updatedSchedule.cards[0]?.repetitions).toBe(0);
      expect(payloadMock.update).toHaveBeenCalled();
    });
  });

  describe('generateReviewSession', () => {
    it('retourne null lorsqu’aucune carte n’est due', async () => {
      const userId = '123';
      const schedule = {
        id: 'schedule-1',
        userId,
        deckName: 'Deck',
        cards: [
          {
            questionId: 'q1',
            easeFactor: 2.5,
            interval: 1,
            repetitions: 0,
            nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        totalCards: 1,
        activeCards: 1,
        completedCards: 0,
        averageEaseFactor: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      payloadMock.find.mockResolvedValueOnce({ docs: [createPlanRecord(schedule)] });

      const session = await service.generateReviewSession(userId, 20, 30);
      expect(session).toBeNull();
    });
  });

  describe('getUserProgressStats', () => {
    it('retourne les statistiques par défaut quand aucun planning', async () => {
      payloadMock.find.mockResolvedValueOnce({ docs: [] });

      const stats = await service.getUserProgressStats('123');
      expect(stats.totalCards).toBe(0);
      expect(stats.completedCards).toBe(0);
    });
  });

  describe('Algorithme SM-2', () => {
    it('calcule les intervalles croissants', () => {
      const serviceInstance = new SpacedRepetitionSchedulingService();
      const applySM2 = (serviceInstance as any).applySM2Algorithm.bind(serviceInstance);

      let card = {
        questionId: 'q1',
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      card = applySM2(card, 4);
      expect(card.repetitions).toBe(1);

      card = applySM2(card, 4);
      expect(card.interval).toBeGreaterThan(1);
    });

    it('borne le facteur de facilité', () => {
      const serviceInstance = new SpacedRepetitionSchedulingService();
      const applySM2 = (serviceInstance as any).applySM2Algorithm.bind(serviceInstance);

      let card = {
        questionId: 'q1',
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      card.easeFactor = 1.4;
      card = applySM2(card, 0);
      expect(card.easeFactor).toBe(1.3);
    });
  });
});