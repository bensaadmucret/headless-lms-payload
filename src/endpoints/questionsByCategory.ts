import type { Endpoint, PayloadRequest } from 'payload';

/**
 * Endpoint pour récupérer les questions d'une catégorie spécifique
 * Requirements: 3.1, 6.2
 */
export const getQuestionsByCategoryEndpoint: Endpoint = {
  path: '/questions/by-category/:categoryId',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer les paramètres
      const categoryId = (req as any).params?.categoryId;
      const { level, limit = '10', difficulty } = req.query as Record<string, string>;

      req.payload.logger.info(`Fetching questions for category: ${categoryId}, level: ${level}, limit: ${limit}`);

      // 3. Construire la requête de filtrage
      const where: any = {
        category: { equals: categoryId }
      };

      // Filtrer par niveau d'études si spécifié
      if (level && (level === 'PASS' || level === 'LAS')) {
        where.studentLevel = {
          in: [level, 'both']
        };
      }

      // Filtrer par difficulté si spécifié
      if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
        where.difficulty = { equals: difficulty };
      }

      // 4. Récupérer les questions avec les catégories peuplées (évite N+1)
      const questions = await req.payload.find({
        collection: 'questions',
        where,
        limit: parseInt(limit) || 10,
        sort: '-createdAt',
        depth: 1 // Peuple automatiquement les relations
      });

      // 5. Enrichir les questions avec les informations de catégorie (déjà peuplées)
      const enrichedQuestions = questions.docs.map((question) => {
        const category = typeof question.category === 'object' && question.category !== null
          ? question.category
          : null;
        
        const categoryId = typeof question.category === 'string'
          ? question.category
          : typeof question.category === 'number'
          ? question.category
          : (category as any)?.id;
        
        const categoryName = (category as any)?.title || 'Unknown';

        return {
          ...question,
          categoryId,
          categoryName,
          difficulty: question.difficulty || 'medium',
          studentLevel: question.studentLevel || 'both'
        };
      });

      // 6. Retourner les questions
      return Response.json({
        success: true,
        data: enrichedQuestions
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in getQuestionsByCategoryEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch questions by category',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour compter les questions disponibles dans une catégorie
 * Requirements: 3.1, 5.4
 */
export const getQuestionCountEndpoint: Endpoint = {
  path: '/questions/count/:categoryId',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer les paramètres
      const categoryId = (req as any).params?.categoryId;
      const { level, difficulty } = req.query as Record<string, string>;

      req.payload.logger.info(`Counting questions for category: ${categoryId}, level: ${level}`);

      // 3. Construire la requête de filtrage
      const where: any = {
        category: { equals: categoryId }
      };

      // Filtrer par niveau d'études si spécifié
      if (level && (level === 'PASS' || level === 'LAS')) {
        where.studentLevel = {
          in: [level, 'both']
        };
      }

      // Filtrer par difficulté si spécifié
      if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
        where.difficulty = { equals: difficulty };
      }

      // 4. Compter les questions
      const result = await req.payload.find({
        collection: 'questions',
        where,
        limit: 0 // On veut juste le count
      });

      // 5. Retourner le compte
      return Response.json({
        success: true,
        data: {
          count: result.totalDocs
        }
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in getQuestionCountEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to count questions',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer des questions de confiance (fallback)
 * Requirements: 3.2, 5.4
 */
export const getFallbackConfidenceQuestionsEndpoint: Endpoint = {
  path: '/questions/fallback-confidence',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer les paramètres
      const { level, limit = '5' } = req.query as Record<string, string>;

      req.payload.logger.info(`Fetching fallback confidence questions for level: ${level}`);

      // 3. Construire la requête pour des questions faciles
      const where: any = {
        difficulty: { equals: 'easy' }
      };

      // Filtrer par niveau si spécifié
      if (level && (level === 'PASS' || level === 'LAS')) {
        where.studentLevel = {
          in: [level, 'both']
        };
      }

      // 4. Récupérer les questions avec les catégories peuplées (évite N+1)
      const questions = await req.payload.find({
        collection: 'questions',
        where,
        limit: parseInt(limit) || 5,
        sort: '-createdAt',
        depth: 1
      });

      // 5. Enrichir les questions (catégories déjà peuplées)
      const enrichedQuestions = questions.docs.map((question) => {
        const category = typeof question.category === 'object' && question.category !== null
          ? question.category
          : null;
        
        const categoryId = typeof question.category === 'string'
          ? question.category
          : typeof question.category === 'number'
          ? question.category
          : (category as any)?.id;
        
        const categoryName = (category as any)?.title || 'General';

        return {
          ...question,
          categoryId,
          categoryName,
          difficulty: 'easy',
          studentLevel: question.studentLevel || 'both'
        };
      });

      // 6. Retourner les questions
      return Response.json({
        success: true,
        data: enrichedQuestions
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in getFallbackConfidenceQuestionsEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch fallback confidence questions',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer des questions de catégories liées
 * Requirements: 3.2, 6.3
 */
export const getRelatedCategoryQuestionsEndpoint: Endpoint = {
  path: '/questions/related-categories',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer les paramètres
      const { categoryId, level, limit = '5' } = req.query as Record<string, string>;

      req.payload.logger.info(`Fetching related category questions for: ${categoryId}`);

      // 3. Pour l'instant, on retourne des questions générales
      // Dans une vraie implémentation, vous pourriez avoir une logique de catégories parentes/enfants
      const where: any = {};

      // Exclure la catégorie actuelle si spécifiée
      if (categoryId) {
        where.category = { not_equals: categoryId };
      }

      // Filtrer par niveau si spécifié
      if (level && (level === 'PASS' || level === 'LAS')) {
        where.studentLevel = {
          in: [level, 'both']
        };
      }

      // 4. Récupérer les questions avec les catégories peuplées (évite N+1)
      const questions = await req.payload.find({
        collection: 'questions',
        where,
        limit: parseInt(limit) || 5,
        sort: '-createdAt',
        depth: 1
      });

      // 5. Enrichir les questions (catégories déjà peuplées)
      const enrichedQuestions = questions.docs.map((question) => {
        const category = typeof question.category === 'object' && question.category !== null
          ? question.category
          : null;
        
        const categoryId = typeof question.category === 'string'
          ? question.category
          : typeof question.category === 'number'
          ? question.category
          : (category as any)?.id;
        
        const categoryName = (category as any)?.title || 'General';

        return {
          ...question,
          categoryId,
          categoryName,
          difficulty: question.difficulty || 'medium',
          studentLevel: question.studentLevel || 'both'
        };
      });

      // 6. Retourner les questions
      return Response.json({
        success: true,
        data: enrichedQuestions
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in getRelatedCategoryQuestionsEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch related category questions',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer n'importe quelles questions disponibles
 * Requirements: 6.3
 */
export const getAnyAvailableQuestionsEndpoint: Endpoint = {
  path: '/questions/any-available',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer les paramètres
      const { level, limit = '5' } = req.query as Record<string, string>;

      req.payload.logger.info(`Fetching any available questions for level: ${level}`);

      // 3. Construire la requête
      const where: any = {};

      // Filtrer par niveau si spécifié
      if (level && (level === 'PASS' || level === 'LAS')) {
        where.studentLevel = {
          in: [level, 'both']
        };
      }

      // 4. Récupérer les questions avec les catégories peuplées (évite N+1)
      const questions = await req.payload.find({
        collection: 'questions',
        where,
        limit: parseInt(limit) || 5,
        sort: '-createdAt',
        depth: 1
      });

      // 5. Enrichir les questions (catégories déjà peuplées)
      const enrichedQuestions = questions.docs.map((question) => {
        const category = typeof question.category === 'object' && question.category !== null
          ? question.category
          : null;
        
        const categoryId = typeof question.category === 'string'
          ? question.category
          : typeof question.category === 'number'
          ? question.category
          : (category as any)?.id;
        
        const categoryName = (category as any)?.title || 'General';

        return {
          ...question,
          categoryId,
          categoryName,
          difficulty: question.difficulty || 'medium',
          studentLevel: question.studentLevel || 'both'
        };
      });

      // 6. Retourner les questions
      return Response.json({
        success: true,
        data: enrichedQuestions
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in getAnyAvailableQuestionsEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch any available questions',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer des questions avec restrictions de niveau assouplies
 * Requirements: 6.3
 */
export const getRelaxedLevelQuestionsEndpoint: Endpoint = {
  path: '/questions/relaxed-level',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer les paramètres
      const { categoryId, level, limit = '5' } = req.query as Record<string, string>;

      req.payload.logger.info(`Fetching relaxed level questions for category: ${categoryId}, level: ${level}`);

      // 3. Construire la requête (sans filtre strict de niveau)
      const where: any = {};

      if (categoryId) {
        where.category = { equals: categoryId };
      }

      // 4. Récupérer les questions avec les catégories peuplées (évite N+1)
      const questions = await req.payload.find({
        collection: 'questions',
        where,
        limit: parseInt(limit) || 5,
        sort: '-createdAt',
        depth: 1
      });

      // 5. Enrichir les questions (catégories déjà peuplées)
      const enrichedQuestions = questions.docs.map((question) => {
        const category = typeof question.category === 'object' && question.category !== null
          ? question.category
          : null;
        
        const categoryId = typeof question.category === 'string'
          ? question.category
          : typeof question.category === 'number'
          ? question.category
          : (category as any)?.id;
        
        const categoryName = (category as any)?.title || 'General';

        return {
          ...question,
          categoryId,
          categoryName,
          difficulty: question.difficulty || 'medium',
          studentLevel: question.studentLevel || 'both'
        };
      });

      // 6. Retourner les questions
      return Response.json({
        success: true,
        data: enrichedQuestions
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in getRelaxedLevelQuestionsEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch relaxed level questions',
        details: errorMessage
      }, { status: 500 });
    }
  }
};
