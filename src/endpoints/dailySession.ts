import { PayloadRequest as BasePayloadRequest } from 'payload';
import { Response as ExpressResponse } from 'express';
import { StudySession } from '../payload-types';
import { StudySessionError } from '../services/StudySessionService';

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

import { StudySessionService } from '../services/StudySessionService';
// Import de l'interface PayloadService depuis le service

/**
 * Endpoint pour gérer les sessions d'étude quotidiennes
 */
export const dailySessionEndpoint: Endpoint = {
  path: '/study-sessions/daily',
  method: 'get',
  handler: async (req: PayloadRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Requête reçue sur /study-sessions/daily', { query: req.query, userId: req.user?.id });
      
      // Vérification de l'authentification
      if (!req.user || !req.user.id) {
        console.warn('Tentative d\'accès non autorisée - utilisateur non connecté');
        res.status(401).json({ 
          error: 'Non autorisé',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      // Récupération de la date de la requête (si fournie)
      const { date } = req.query;
      const userId = req.user?.id;
      
      if (!userId) {
        console.warn('ID utilisateur manquant dans la requête');
        res.status(400).json({ 
          error: 'ID utilisateur manquant',
          code: 'MISSING_USER_ID'
        });
        return;
      }
      
      // Log pour débogage
      console.log(`[dailySession] Utilisation de l'ID utilisateur authentifié: ${userId} (type: ${typeof userId})`);
      
      // Ignorer tout userId passé en paramètre d'URL pour des raisons de sécurité
      if (req.query.userId) {
        console.warn(`[dailySession] Paramètre userId détecté dans l'URL (${req.query.userId}). Ce paramètre est ignoré pour des raisons de sécurité.`);
      }
      
      // Validation stricte de l'ID utilisateur
      if (typeof userId !== 'string' && typeof userId !== 'number') {
        console.error('Format d\'ID utilisateur invalide:', userId);
        res.status(400).json({ 
          error: 'Format d\'ID utilisateur invalide',
          code: 'INVALID_USER_ID'
        });
        return;
      }
      
      // Vérification supplémentaire pour les IDs numériques
      if (typeof userId === 'number' && isNaN(userId)) {
        console.error('ID utilisateur invalide (NaN):', userId);
        res.status(400).json({ 
          error: 'ID utilisateur invalide (NaN)',
          code: 'INVALID_USER_ID_NAN'
        });
        return;
      }
      
      // Conversion sécurisée de l'ID utilisateur en string
      const userIdSafe = typeof userId === 'number' ? String(userId) : userId;
      
      // Validation de la date si fournie
      let targetDate: Date | undefined;
      if (date) {
        try {
          // Utiliser le format ISO pour éviter les problèmes de timezone
          if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Format YYYY-MM-DD - ajouter l'heure pour éviter les problèmes de timezone
            targetDate = new Date(`${date}T00:00:00.000Z`);
            console.log(`[dailySession] Date au format YYYY-MM-DD détectée: ${date}, convertie en: ${targetDate.toISOString()}`);
          } else {
            // Essayer le parsing standard
            targetDate = new Date(date as string);
          }
          
          // Vérifier si la date est valide
          if (isNaN(targetDate.getTime())) {
            console.error(`[dailySession] Format de date invalide: ${date} (type: ${typeof date})`);
            res.status(400).json({
              error: 'Format de date invalide',
              code: 'INVALID_DATE_FORMAT',
              details: { providedDate: date, type: typeof date }
            });
            return;
          }
          
          console.log(`[dailySession] Date cible spécifiée et validée: ${targetDate.toISOString()}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          console.error(`[dailySession] Erreur lors du parsing de la date: ${errorMessage}`, {
            date,
            error,
            stack: error instanceof Error ? error.stack : undefined
          });
          res.status(400).json({
            error: 'Format de date invalide',
            code: 'INVALID_DATE_FORMAT',
            details: { providedDate: date, error: errorMessage }
          });
          return;
        }
      } else {
        console.log('[dailySession] Aucune date spécifiée, utilisation de la date actuelle');
      }
      
      // Création du service avec le payload de la requête
      console.log(`[dailySession] Initialisation du StudySessionService pour l'utilisateur ${userId}`);
      const studySessionService = new StudySessionService(req.payload as any);
      
      try {
        // Utiliser directement getOrCreateDailySession qui gère la logique de récupération/création
        console.log(`[dailySession] Appel à getOrCreateDailySession pour l'utilisateur ${userId}`);
        
        // Préparation des options pour la méthode getOrCreateDailySession
        const options: { targetDate?: Date } = {};
        
        // Si une date est spécifiée dans la requête, l'utiliser
        if (targetDate) {
          options.targetDate = targetDate;
        }
        
        console.log(`[dailySession] Appel à getOrCreateDailySession avec options:`, {
          userId: userIdSafe,
          userIdOriginal: userId,
          userIdType: typeof userId,
          targetDate: options.targetDate ? options.targetDate.toISOString() : 'non spécifiée'
        });
        
        const { session, isNew } = await studySessionService.getOrCreateDailySession(userIdSafe, options);
        
        if (!session) {
          throw new StudySessionError(
            'La création de la session a échoué: aucune session retournée', 
            'SESSION_CREATION_FAILED'
          );
        }
        
        console.log(`[dailySession] Session ${isNew ? 'créée' : 'récupérée'} avec succès:`, {
          id: session.id,
          status: session.status,
          steps: session.steps?.length || 0,
          createdAt: session.createdAt
        });

        // Répondre avec la session et l'état de création
        res.status(200).json({
          success: true,
          session,
          isNew
        });
        
      } catch (sessionError) {
        const errorMessage = sessionError instanceof Error ? sessionError.message : 'Erreur inconnue';
        const errorStack = sessionError instanceof Error ? sessionError.stack : undefined;
        const errorCode = sessionError instanceof StudySessionError ? sessionError.code : 'UNKNOWN_ERROR';
        const userId = req.user?.id || 'inconnu';
        
        console.error('Erreur lors de la gestion de la session:', {
          error: errorMessage,
          code: errorCode,
          stack: errorStack,
          timestamp: new Date().toISOString(),
          userId,
          ...(sessionError instanceof StudySessionError && sessionError.cause ? { cause: sessionError.cause } : {})
        });
        
        // Relancer l'erreur pour qu'elle soit traitée par le bloc catch externe
        throw sessionError;
      }
    } catch (error: unknown) {
      // Log détaillé de l'erreur
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorCode = error instanceof StudySessionError ? error.code : 'INTERNAL_SERVER_ERROR';
      const statusCode = error instanceof StudySessionError && error.code === 'UNAUTHORIZED' ? 401 : 500;
      const userId = req.user?.id || 'inconnu';
      
      // Log complet de l'erreur
      console.error('❌ [dailySession] Erreur critique:', {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        code: errorCode,
        stack: errorStack,
        userId,
        environment: process.env.NODE_ENV
      });
      
      // Vérifier si la réponse n'a pas déjà été envoyée
      if (!res.headersSent) {
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
          
          if (error instanceof StudySessionError && error.cause) {
            (errorResponse.details as Record<string, unknown>).cause = error.cause;
          }
        }
        
        res.status(statusCode).json(errorResponse);
      } else {
        console.error('Impossible d\'envoyer la réponse d\'erreur: les en-têtes ont déjà été envoyés');
      }
    }
  },
};
