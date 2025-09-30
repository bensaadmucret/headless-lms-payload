import type { PayloadRequest } from 'payload';
import type { Response } from 'express';
import type { StudySession, User } from '../payload-types';

// Définition des types personnalisés pour éviter les problèmes de typage
interface PayloadWithFindByID {
  findByID<T = any>(args: { collection: string; id: number; depth?: number }): Promise<T>;
  update<T = any>(args: { collection: string; id: number; data: any; depth?: number }): Promise<T>;
}

// Interface pour l'utilisateur authentifié
interface AuthenticatedUser extends Omit<User, 'id' | 'role'> {
  id: number;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  [key: string]: any;
}

interface PayloadRequestWithUser extends PayloadRequest {
  user: AuthenticatedUser;
  payload: PayloadWithFindByID;
  body: {
    answers?: Record<string, any>;
    metadata?: Record<string, any>;
  };
}

export interface StudySessionWithAnswers extends Omit<StudySession, 'steps'> {
  answers?: Record<string, any>;
  metadata?: Record<string, any>;
  steps?: Array<{
    stepId: number;
    type: string;
    title: string;
    status?: string;
    [key: string]: any;
  }>;
}

export default async function updateDailySessionHandler(
  req: PayloadRequestWithUser,
  res: Response
): Promise<void> {
  try {
    // Récupération des paramètres de la requête
    const { id: sessionIdParam } = req.params;
    const { answers, metadata: requestMetadata } = req.body;

    // Vérification de l'authentification
    if (!req.user) {
      res.status(401).json({ error: 'Non autorisé' });
      return;
    }

    // Vérification de l'ID de session
    if (!sessionIdParam) {
      res.status(400).json({ 
        success: false,
        error: 'ID de session manquant' 
      });
      return;
    }

    const sessionId = parseInt(sessionIdParam, 10);
    if (isNaN(sessionId)) {
      res.status(400).json({ 
        success: false,
        error: 'ID de session invalide' 
      });
      return;
    }

    // Récupération de la session existante
    const existingSession = await req.payload.findByID<StudySessionWithAnswers>({
      collection: 'study-sessions',
      id: sessionId,
      depth: 2,
    });

    if (!existingSession) {
      res.status(404).json({ error: 'Session non trouvée' });
      return;
    }

    // Vérification des autorisations
    const userId = typeof existingSession.user === 'number' 
      ? existingSession.user 
      : existingSession.user?.id;
      
    if (!userId || (userId !== req.user?.id && !['admin', 'superadmin'].includes(req.user?.role))) {
      res.status(403).json({ 
        success: false,
        error: 'Accès non autorisé à cette session' 
      });
      return;
    }

    // Préparation des données de mise à jour
    const updateData: Partial<StudySessionWithAnswers> = {
      status: 'in-progress',
      metadata: {
        ...(existingSession.metadata || {}),
        lastActivity: new Date().toISOString()
      }
    };

    // Mise à jour des réponses si fournies
    if (answers) {
      updateData.answers = {
        ...(existingSession.answers || {}),
        ...answers
      };
    }

    // Mise à jour des métadonnées si fournies
    if (requestMetadata) {
      updateData.metadata = {
        ...(existingSession.metadata || {}),
        ...requestMetadata,
        lastUpdated: new Date().toISOString()
      };
    }

    // Mise à jour de la session
    const updatedSession = await req.payload.update<StudySessionWithAnswers>({
      collection: 'study-sessions',
      id: sessionId,
      data: updateData,
      depth: 2
    });

    // Retourner uniquement les données nécessaires de la session mise à jour
    const { status, metadata, updatedAt } = updatedSession;
    res.status(200).json({
      success: true,
      session: { 
        id: updatedSession.id, 
        status, 
        metadata, 
        updatedAt 
      },
      message: 'Session mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la session quotidienne:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la session',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}
