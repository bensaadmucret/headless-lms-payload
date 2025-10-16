/**
 * Endpoint pour la génération et création automatique de quiz complets
 * Tâche 5: Création automatique des quiz et questions
 */

import type { PayloadRequest } from 'payload';
import { AIQuizGenerationService } from '../services/AIQuizGenerationService';

interface GenerateCompleteQuizRequest {
  subject: string;
  categoryId: string;
  categoryName?: string;
  courseId?: string;
  courseName?: string;
  studentLevel: 'PASS' | 'LAS' | 'both';
  questionCount: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  includeExplanations?: boolean;
  customInstructions?: string;
  medicalDomain?: string;
  published?: boolean;
}

export const generateCompleteQuizEndpoint = async (req: PayloadRequest): Promise<Response> => {
  try {
    // Vérification de l'authentification et des permissions
    if (!req.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentification requise'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Vérification des permissions admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Permissions administrateur requises'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validation de la méthode HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Méthode POST requise'
        }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Récupération et validation des données
    let requestData: GenerateCompleteQuizRequest;
    try {
      requestData = await req.json?.() as GenerateCompleteQuizRequest;
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Données JSON invalides'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validation des champs requis
    const validationErrors = validateGenerationRequest(requestData);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Données invalides',
          details: validationErrors
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🚀 Début génération quiz complet:', {
      subject: requestData.subject,
      level: requestData.studentLevel,
      questions: requestData.questionCount,
      user: req.user.id
    });

    // Initialisation du service de génération
    const aiService = new AIQuizGenerationService(req.payload);

    // Configuration de la génération
    const generationConfig = {
      subject: requestData.subject,
      categoryId: requestData.categoryId,
      categoryName: requestData.categoryName,
      courseId: requestData.courseId,
      courseName: requestData.courseName,
      studentLevel: requestData.studentLevel,
      questionCount: requestData.questionCount,
      difficulty: requestData.difficulty || 'medium',
      includeExplanations: requestData.includeExplanations !== false,
      customInstructions: requestData.customInstructions,
      medicalDomain: requestData.medicalDomain,
      userId: req.user.id.toString(),
      published: requestData.published || false
    };

    // Génération et création automatique du quiz
    const result = await aiService.generateAndCreateCompleteQuiz(generationConfig);

    // Préparation de la réponse
    const responseData = {
      success: result.success,
      data: result.success ? {
        quizId: result.quizId,
        questionIds: result.questionIds,
        questionsCreated: result.questionsCreated,
        validationScore: result.validationScore,
        metadata: result.metadata
      } : undefined,
      errors: result.errors,
      warnings: result.warnings,
      processingTime: result.metadata.processingTime
    };

    const statusCode = result.success ? 200 : 400;

    console.log(`${result.success ? '✅' : '❌'} Génération terminée:`, {
      success: result.success,
      quizId: result.quizId,
      questionsCreated: result.questionsCreated,
      processingTime: result.metadata.processingTime
    });

    return new Response(
      JSON.stringify(responseData),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur endpoint génération quiz:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur interne du serveur',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Valide les données de la requête de génération
 */
function validateGenerationRequest(data: any): string[] {
  const errors: string[] = [];

  // Validation des champs requis
  if (!data.subject || typeof data.subject !== 'string') {
    errors.push('Le sujet est requis et doit être une chaîne de caractères');
  } else {
    if (data.subject.length < 10) {
      errors.push('Le sujet doit contenir au moins 10 caractères');
    }
    if (data.subject.length > 200) {
      errors.push('Le sujet ne peut pas dépasser 200 caractères');
    }
  }

  if (!data.categoryId || typeof data.categoryId !== 'string') {
    errors.push('L\'ID de catégorie est requis');
  }

  if (!data.studentLevel || !['PASS', 'LAS', 'both'].includes(data.studentLevel)) {
    errors.push('Le niveau étudiant doit être PASS, LAS ou both');
  }

  if (!data.questionCount || typeof data.questionCount !== 'number') {
    errors.push('Le nombre de questions est requis et doit être un nombre');
  } else {
    if (data.questionCount < 1 || data.questionCount > 20) {
      errors.push('Le nombre de questions doit être entre 1 et 20');
    }
  }

  // Validation des champs optionnels
  if (data.difficulty && !['easy', 'medium', 'hard'].includes(data.difficulty)) {
    errors.push('La difficulté doit être easy, medium ou hard');
  }

  if (data.customInstructions && typeof data.customInstructions !== 'string') {
    errors.push('Les instructions personnalisées doivent être une chaîne de caractères');
  }

  if (data.medicalDomain && typeof data.medicalDomain !== 'string') {
    errors.push('Le domaine médical doit être une chaîne de caractères');
  }

  if (data.published !== undefined && typeof data.published !== 'boolean') {
    errors.push('Le statut de publication doit être un booléen');
  }

  return errors;
}

/**
 * Endpoint pour créer un quiz de test
 */
export const createTestQuizEndpoint = async (req: PayloadRequest): Promise<Response> => {
  try {
    // Vérifications de base
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Permissions administrateur requises'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Méthode POST requise'
        }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { categoryId } = await req.json?.() as { categoryId: string };

    if (!categoryId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ID de catégorie requis'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🧪 Création quiz de test pour catégorie:', categoryId);

    const aiService = new AIQuizGenerationService(req.payload);
    const result = await aiService.createTestQuizComplete(categoryId, req.user.id.toString());

    return new Response(
      JSON.stringify({
        success: result.success,
        data: result.success ? {
          quizId: result.quizId,
          questionIds: result.questionIds,
          questionsCreated: result.questionsCreated
        } : undefined,
        errors: result.errors,
        processingTime: result.metadata.processingTime
      }),
      {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur création quiz de test:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur interne du serveur',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};