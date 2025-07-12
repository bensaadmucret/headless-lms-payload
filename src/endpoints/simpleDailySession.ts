import { PayloadRequest as BasePayloadRequest } from 'payload';
import { Response as ExpressResponse } from 'express';
import { StudySession } from '../payload-types';

// Types pour les endpoints Payload CMS
type Endpoint = {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  handler: (req: PayloadRequest, res: Response, next: NextFunction) => Promise<void>;
};

// Extension du type PayloadRequest de Payload
export interface PayloadRequest extends BasePayloadRequest {
  headers: BasePayloadRequest['headers'];
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
 * Endpoint simplifié pour la session quotidienne
 * Cette version contourne la logique complexe et se concentre sur les opérations de base
 */
export const simpleDailySessionEndpoint: Endpoint = {
  path: '/api/study-sessions/simple-daily',
  method: 'get',
  handler: async (req: PayloadRequest, res: Response, next: NextFunction): Promise<void> => {
    console.log('[simpleDailySession] --- Début du handler ---');
    try {
      // Vérification de l'authentification
      if (!req.user || !req.user.id) {
        console.warn('[simpleDailySession] Accès non autorisé - utilisateur non connecté ou id absent', {
          user: req.user,
          headers: req.headers
        });
        res.status(401).json({ 
          error: 'Non autorisé',
          code: 'UNAUTHORIZED',
          details: {
            user: req.user,
            headers: req.headers
          }
        });
        return;
      }

      // Récupération de l'ID utilisateur
      const userId = req.user.id;
      console.log('[simpleDailySession] Utilisateur authentifié:', { 
        userId, 
        type: typeof userId,
        userObj: req.user
      });
      
      // Validation stricte de l'ID utilisateur
      let userIdSafe: string | number | undefined = undefined;
      if (typeof userId === 'number') {
        if (isNaN(userId)) {
          console.error('[simpleDailySession] ID utilisateur NaN (number)', { userId });
          res.status(400).json({ error: 'ID utilisateur NaN (number)', details: { userId } });
          return;
        }
        userIdSafe = userId;
      } else if (typeof userId === 'string') {
        if (
          userId.trim() === '' ||
          userId === 'undefined' ||
          userId === 'null' ||
          userId === 'NaN' ||
          isNaN(Number(userId))
        ) {
          console.error('[simpleDailySession] ID utilisateur invalide (string)', { userId });
          res.status(400).json({ error: 'ID utilisateur invalide (string)', details: { userId } });
          return;
        }
        userIdSafe = userId;
      } else {
        console.error('[simpleDailySession] Type d\'ID utilisateur non supporté', { userId, type: typeof userId });
        res.status(400).json({ error: 'Type d\'ID utilisateur non supporté', details: { userId, type: typeof userId } });
        return;
      }
      if (!userIdSafe) {
        console.error('[simpleDailySession] ID utilisateur absent après validation stricte', { userId, userIdSafe });
        res.status(400).json({ error: 'ID utilisateur absent après validation stricte', details: { userId, userIdSafe } });
        return;
      }
      
      // Calcul de la date limite (24h dans le passé)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();
      
      console.log('[simpleDailySession] Recherche de sessions actives:', {
        userId: userIdSafe,
        dateLimit: twentyFourHoursAgoISO
      });
      
      // Recherche d'une session active existante
      let response, session;
      try {
        response = await req.payload.find({
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
        
        session = response.docs[0];
        
        // Si une session existe, la retourner
        if (session) {
          console.log('[simpleDailySession] Session existante trouvée:', { 
            sessionId: session.id,
            session
          });
          
          res.status(200).json({
            success: true,
            session,
            isNew: false
          });
          return;
        }
        
        console.log('[simpleDailySession] Aucune session existante trouvée, création d\'une nouvelle session');
        
        // Création d'une nouvelle session simplifiée
        const today = new Date();
        const title = `Session du ${today.toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`;
        
        const newSessionData = {
          user: userIdSafe,
          title,
          status: 'active',
          context: {
            isDailySession: true,
            difficulty: 'beginner',
            date: today.toISOString(),
            expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
          },
          metadata: {
            timeSpent: 0,
            lastUpdated: today.toISOString(),
            quizSessions: []
          }
        };
        
        console.log('[simpleDailySession] Création d\'une nouvelle session avec les données:', newSessionData);
        
        // Création de la session dans la base de données
        let newSession;
        try {
          newSession = await req.payload.create({
            collection: 'study-sessions',
            data: newSessionData
          });
        } catch (creationError) {
          console.error('[simpleDailySession] Erreur lors de la création de la session:', creationError);
          res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de la session',
            details: {
              message: creationError instanceof Error ? creationError.message : creationError,
              stack: creationError instanceof Error ? creationError.stack : undefined
            }
          });
          return;
        }
        
        console.log('[simpleDailySession] Nouvelle session créée avec succès:', { 
          sessionId: newSession.id,
          newSession
        });
        
        res.status(200).json({
          success: true,
          session: newSession,
          isNew: true
        });
        return;
      } catch (findError) {
        console.error('[simpleDailySession] Erreur lors de la recherche de session:', findError);
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la recherche de session',
          details: {
            message: findError instanceof Error ? findError.message : findError,
            stack: findError instanceof Error ? findError.stack : undefined
          }
        });
        return;
      }
    } catch (error) {
      // Log détaillé de l'erreur
      console.error('[simpleDailySession] Erreur critique (catch global):', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        user: req.user
      });
      // Réponse d'erreur structurée
      res.status(500).json({
        success: false,
        error: 'Erreur critique dans simple-daily',
        details: {
          message: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          user: req.user
        }
      });
    }
    console.log('[simpleDailySession] --- Fin du handler ---');
  },
};
