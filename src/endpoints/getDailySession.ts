import { PayloadRequest as BasePayloadRequest } from 'payload';
import { Response as ExpressResponse } from 'express';
import { StudySession } from '../payload-types';
import { StudySessionService, StudySessionError } from '../services/StudySessionService';

// Types pour les endpoints Payload CMS
type Endpoint = {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  handler: (req: PayloadRequest, res: Response, next: NextFunction) => Promise<void>;
};

// Extension du type PayloadRequest de Payload
export interface PayloadRequest extends BasePayloadRequest {
  user?: {
    id: string | number;
    email: string;
    collection: string;
    [key: string]: unknown;
  };
  payload: {
    find: (args: {
      collection: string;
      where: Record<string, unknown>;
      limit?: number;
      depth?: number;
      sort?: string;
    }) => Promise<{ docs: StudySession[] }>;
    create: (args: {
      collection: string;
      data: Record<string, unknown>;
    }) => Promise<StudySession>;
    update: (args: {
      collection: string;
      id: string | number;
      data: Record<string, unknown>;
    }) => Promise<StudySession>;
    findByID: (args: {
      collection: string;
      id: string | number;
      depth?: number;
    }) => Promise<StudySession>;
  };
  params: Record<string, string>;
  query: {
    date?: string;
    [key: string]: unknown;
  };
  body: unknown;
}

// Types pour les réponses Express
type Response = ExpressResponse & {
  status: (code: number) => Response;
  json: (data: unknown) => Response;
  send: (data: unknown) => Response;
};

type NextFunction = (error?: Error) => void;

/**
 * Endpoint simplifié pour récupérer la session d'étude quotidienne
 * Cet endpoint est une version allégée pour diagnostiquer les problèmes
 */
export const getDailySessionEndpoint: Endpoint = {
  path: '/api/study-sessions/get-daily',
  method: 'get',
  handler: async (req: PayloadRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('[getDailySession] Requête reçue', { 
        query: req.query, 
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Vérification de l'authentification
      if (!req.user || !req.user.id) {
        console.warn('[getDailySession] Tentative d\'accès non autorisée - utilisateur non connecté');
        res.status(401).json({ 
          error: 'Non autorisé',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const userId = req.user.id;
      
      // Validation stricte de l'ID utilisateur
      if (typeof userId !== 'string' && typeof userId !== 'number') {
        console.error('[getDailySession] Format d\'ID utilisateur invalide:', userId);
        res.status(400).json({ 
          error: 'Format d\'ID utilisateur invalide',
          code: 'INVALID_USER_ID'
        });
        return;
      }
      
      // Conversion sécurisée de l'ID utilisateur
      const userIdSafe = typeof userId === 'number' ? String(userId) : userId;
      
      console.log('[getDailySession] Recherche de sessions pour l\'utilisateur', {
        userIdSafe,
        userIdOriginal: userId,
        userIdType: typeof userId
      });
      
      // Recherche directe des sessions actives de l'utilisateur
      try {
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();
        
        console.log('[getDailySession] Paramètres de recherche', {
          collection: 'study-sessions',
          userId: userIdSafe,
          dateLimit: twentyFourHoursAgoISO
        });
        
        const response = await req.payload.find({
          collection: 'study-sessions',
          where: {
            user: {
              equals: userIdSafe
            },
            status: {
              equals: 'active'
            },
            createdAt: {
              greater_than_equal: twentyFourHoursAgoISO
            }
          },
          sort: '-createdAt',
          limit: 1
        });
        
        const { docs } = response;
        const session = docs[0];
        
        if (session) {
          console.log('[getDailySession] Session trouvée', {
            sessionId: session.id,
            status: session.status,
            createdAt: session.createdAt
          });
          
          res.status(200).json({
            success: true,
            session,
            isExisting: true
          });
        } else {
          console.log('[getDailySession] Aucune session active trouvée');
          
          // Si aucune session n'est trouvée, initialiser le service et en créer une nouvelle
          const studySessionService = new StudySessionService(req.payload);
          
          // Création d'une nouvelle session via le service
          console.log('[getDailySession] Initialisation du service StudySessionService');
          
          try {
            const { session: newSession, isNew } = await studySessionService.getOrCreateDailySession(userIdSafe);
            
            console.log('[getDailySession] Session créée avec succès', {
              sessionId: newSession.id,
              isNew
            });
            
            res.status(200).json({
              success: true,
              session: newSession,
              isNew
            });
          } catch (serviceError) {
            console.error('[getDailySession] Erreur lors de la création de la session via le service', {
              error: serviceError instanceof Error ? serviceError.message : 'Erreur inconnue',
              stack: serviceError instanceof Error ? serviceError.stack : undefined
            });
            
            throw serviceError;
          }
        }
      } catch (findError) {
        console.error('[getDailySession] Erreur lors de la recherche des sessions', {
          error: findError instanceof Error ? findError.message : 'Erreur inconnue',
          stack: findError instanceof Error ? findError.stack : undefined
        });
        
        throw findError;
      }
    } catch (error: unknown) {
      // Log détaillé de l'erreur
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorCode = error instanceof StudySessionError ? error.code : 'INTERNAL_SERVER_ERROR';
      const statusCode = error instanceof StudySessionError && error.code === 'UNAUTHORIZED' ? 401 : 500;
      
      console.error('[getDailySession] Erreur critique:', {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        code: errorCode,
        stack: errorStack,
        environment: process.env.NODE_ENV
      });
      
      // Réponse d'erreur structurée
      const errorResponse: Record<string, unknown> = {
        success: false,
        error: statusCode === 401 ? 'Non autorisé' : 'Une erreur est survenue',
        code: errorCode,
        timestamp: new Date().toISOString()
      };
      
      // Ne renvoyer les détails complets qu'en développement
      if (process.env.NODE_ENV === 'development') {
        errorResponse.details = {
          message: errorMessage,
          stack: errorStack
        };
      }
      
      res.status(statusCode).json(errorResponse);
    }
  },
};
