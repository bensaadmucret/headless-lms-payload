import type { PayloadRequest as BasePayloadRequest } from 'payload';
import type { Response as ExpressResponse } from 'express';
import {
  StudyPlanningService,
  type StudyPlanSlotInput,
  type StudyPlanDocument,
  type AutofillOptions,
} from '../services/StudyPlanningService';

type Endpoint = {
  path: string;
  method: 'get' | 'post';
  handler: (req: PlanningRequest, res: PlanningResponse, next: NextFunction) => Promise<void | Response>;
};

type PlanningPayloadClient = (BasePayloadRequest['payload'] & {
  find: (args: {
    collection: string;
    where?: Record<string, unknown>;
    limit?: number;
  }) => Promise<{ docs: StudyPlanDocument[] }>;
  create: (args: { collection: string; data: Partial<StudyPlanDocument> }) => Promise<StudyPlanDocument>;
  update: (args: {
    collection: string;
    id: string | number;
    data: Partial<StudyPlanDocument>;
  }) => Promise<StudyPlanDocument>;
}) & BasePayloadRequest['payload'];

type PlanningRequest = BasePayloadRequest & {
  user?: { id: string | number };
  payload: PlanningPayloadClient;
  query: Record<string, unknown>;
  body: unknown;
};

type PlanningResponse = ExpressResponse & {
  status: (code: number) => PlanningResponse;
  json: (data: unknown) => PlanningResponse;
};

type NextFunction = (error?: Error) => void;

type WeeklyPlanBody = Partial<StudyPlanDocument> & { weekStart?: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireAuth = (
  req: PlanningRequest,
  res: PlanningResponse
): req is PlanningRequest & { user: { id: string | number } } => {
  if (!req.user || (typeof req.user.id !== 'string' && typeof req.user.id !== 'number')) {
    sendJson(res, 401, {
      success: false,
      error: 'Authentification requise',
    });
    return false;
  }
  return true;
};

const getPlanningService = (payloadClient: PlanningPayloadClient) => new StudyPlanningService(payloadClient);

const sendJson = (res: PlanningResponse | undefined, statusCode: number, body: unknown): Response | void => {
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(body);
    return;
  }

  if (typeof Response !== 'undefined' && typeof Response.json === 'function') {
    return Response.json(body, { status: statusCode });
  }

  throw new Error("Impossible d'envoyer la réponse HTTP: aucune interface compatible disponible");
};

const parseSlotInput = (value: unknown): StudyPlanSlotInput | null => {
  if (!isRecord(value)) {
    return null;
  }

  const { title, startsAt, durationMinutes, activityType } = value;

  if (
    typeof title !== 'string' ||
    typeof startsAt !== 'string' ||
    typeof durationMinutes !== 'number' ||
    typeof activityType !== 'string'
  ) {
    return null;
  }

  const slot: StudyPlanSlotInput = {
    slotId: typeof value.slotId === 'string' ? value.slotId : undefined,
    title,
    notes: typeof value.notes === 'string' ? value.notes : undefined,
    startsAt,
    durationMinutes,
    activityType: activityType as StudyPlanSlotInput['activityType'],
    status: typeof value.status === 'string' ? (value.status as StudyPlanSlotInput['status']) : undefined,
    linkedQuiz:
      typeof value.linkedQuiz === 'string' || typeof value.linkedQuiz === 'number'
        ? value.linkedQuiz
        : undefined,
    linkedStudySession:
      typeof value.linkedStudySession === 'string' || typeof value.linkedStudySession === 'number'
        ? value.linkedStudySession
        : undefined,
    metadata: isRecord(value.metadata) ? value.metadata : undefined,
  };

  return slot;
};

const parseAutofillOptions = (value: unknown): AutofillOptions | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const options: AutofillOptions = {};

  if (typeof value.preferredHour === 'number') {
    options.preferredHour = value.preferredHour;
  }
  if (typeof value.maxCards === 'number') {
    options.maxCards = value.maxCards;
  }
  if (typeof value.sessionDuration === 'number') {
    options.sessionDuration = value.sessionDuration;
  }

  return options;
};

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
};

export const getWeeklyPlanningEndpoint: Endpoint = {
  path: '/planning/week',
  method: 'get',
  handler: async (req, res, _next) => {
    if (!requireAuth(req, res)) {
      return;
    }

    try {
      const weekStart = typeof req.query.weekStart === 'string' ? req.query.weekStart : undefined;
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;

      const planningService = getPlanningService(req.payload);
      const result = await planningService.getWeeklyPlan(String(req.user.id), weekStart ?? date);

      const responseBody = {
        success: true,
        ...result,
        hasPlan: Boolean(result?.plan),
      };

      return sendJson(res, 200, responseBody);
    } catch (error) {
      console.error('Erreur lors de la récupération du planning hebdomadaire:', error);
      return sendJson(res, 500, {
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  },
};

export const updateWeeklyPlanningEndpoint: Endpoint = {
  path: '/planning/week',
  method: 'post',
  handler: async (req, res, _next) => {
    if (!requireAuth(req, res)) {
      return;
    }

    try {
      const rawBody = req.body;
      if (!isRecord(rawBody)) {
        sendJson(res, 400, {
          success: false,
          error: 'Corps de requête invalide',
        });
        return;
      }

      const { weekStart, ...rest } = rawBody as WeeklyPlanBody;

      if (typeof weekStart !== 'string') {
        sendJson(res, 400, {
          success: false,
          error: 'weekStart est requis',
        });
        return;
      }

      const payloadData: Partial<StudyPlanDocument> & { weekStart: string } = {
        ...(rest as Partial<StudyPlanDocument>),
        weekStart,
      };

      const planningService = getPlanningService(req.payload);
      const result = await planningService.updateWeeklyPlan(String(req.user.id), payloadData);

      return sendJson(res, 200, {
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du planning hebdomadaire:', error);
      return sendJson(res, 500, {
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  },
};

export const upsertPlanningSlotEndpoint: Endpoint = {
  path: '/planning/slot',
  method: 'post',
  handler: async (req, res, _next) => {
    if (!requireAuth(req, res)) {
      return;
    }

    try {
      const rawBody = req.body;
      if (!isRecord(rawBody)) {
        sendJson(res, 400, {
          success: false,
          error: 'Corps de requête invalide',
        });
        return;
      }

      const weekStart = typeof rawBody.weekStart === 'string' ? rawBody.weekStart : undefined;
      const slot = parseSlotInput(rawBody.slot);

      if (!weekStart) {
        sendJson(res, 400, {
          success: false,
          error: 'weekStart est requis',
        });
        return;
      }

      if (!slot) {
        sendJson(res, 400, {
          success: false,
          error: 'slot est requis ou invalide',
        });
        return;
      }

      const planningService = getPlanningService(req.payload);
      const result = await planningService.upsertSlot(String(req.user.id), weekStart, slot);

      return sendJson(res, 200, {
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du créneau planning:", error);
      return sendJson(res, 500, {
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  },
};

export const autofillPlanningEndpoint: Endpoint = {
  path: '/planning/autofill',
  method: 'post',
  handler: async (req, res, _next) => {
    if (!requireAuth(req, res)) {
      return;
    }

    try {
      const rawBody = req.body;
      if (!isRecord(rawBody)) {
        sendJson(res, 400, {
          success: false,
          error: 'Corps de requête invalide',
        });
        return;
      }

      const weekStart = typeof rawBody.weekStart === 'string' ? rawBody.weekStart : undefined;
      const options = parseAutofillOptions(rawBody.options);
      const apply = parseBoolean(rawBody.apply);

      if (!weekStart) {
        sendJson(res, 400, {
          success: false,
          error: 'weekStart est requis',
        });
        return;
      }

      const planningService = getPlanningService(req.payload);
      const result = await planningService.generateAutofillSuggestions(
        String(req.user.id),
        weekStart,
        options,
        apply
      );

      return sendJson(res, 200, {
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Erreur lors de la génération du planning automatique:', error);
      return sendJson(res, 500, {
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  },
};
