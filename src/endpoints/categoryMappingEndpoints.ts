/**
 * Endpoints pour la gestion intelligente des catégories
 * Gère l'analyse, le mapping et l'historique des catégories
 */

import { IntelligentCategoryMappingService } from '../services/IntelligentCategoryMappingService';
import { HumanValidationWorkflowService } from '../services/HumanValidationWorkflowService';

// Instances globales des services
const categoryMappingService = new IntelligentCategoryMappingService();
const humanValidationService = new HumanValidationWorkflowService();

/**
 * Endpoint pour analyser les catégories d'un import
 */
export const analyzeCategoriesEndpoint = {
  path: '/json-import/categories/analyze',
  method: 'post',
  handler: async (req: any) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // 2. Parser les données d'import depuis le body
      const body = await req.json();
      const { importData, sessionId } = body;

      if (!importData) {
        return Response.json({
          success: false,
          error: 'Données d\'import requises'
        }, { status: 400 });
      }

      // 3. Si un sessionId est fourni, récupérer les données depuis la session
      let dataToAnalyze = importData;
      if (sessionId) {
        const session = humanValidationService.getValidationSession(sessionId, req.user.id);
        if (session) {
          dataToAnalyze = session.correctedData || session.originalData;
        }
      }

      // 4. Analyser les catégories
      const analyses = await categoryMappingService.analyzeImportCategories(
        dataToAnalyze,
        req.user.id
      );

      // 5. Récupérer les statistiques de mapping pour contexte
      const mappingStats = categoryMappingService.getMappingStatistics();

      return Response.json({
        success: true,
        message: `${analyses.length} catégorie(s) analysée(s)`,
        data: {
          analyses,
          statistics: mappingStats,
          recommendations: generateRecommendations(analyses),
          totalCategories: analyses.length,
          needsAttention: analyses.filter(a => a.confidence < 0.7).length,
          canAutoMap: analyses.filter(a => a.recommendedAction === 'map' && a.confidence > 0.8).length
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de l\'analyse des catégories:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de l\'analyse des catégories',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour appliquer un mapping de catégorie
 */
export const applyMappingEndpoint = {
  path: '/json-import/categories/apply-mapping',
  method: 'post',
  handler: async (req: any) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // 2. Parser les données de mapping
      const body = await req.json();
      const { 
        originalName, 
        targetCategoryId, 
        sessionId, 
        manualOverride = false 
      } = body;

      if (!originalName || !targetCategoryId) {
        return Response.json({
          success: false,
          error: 'Nom original et ID de catégorie cible requis'
        }, { status: 400 });
      }

      // 3. Appliquer le mapping
      const mappingRecord = await categoryMappingService.applyMapping(
        originalName,
        targetCategoryId,
        req.user.id,
        sessionId,
        manualOverride
      );

      return Response.json({
        success: true,
        message: 'Mapping appliqué avec succès',
        data: {
          mappingRecord,
          appliedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de l\'application du mapping:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de l\'application du mapping',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour créer une nouvelle catégorie
 */
export const createCategoryEndpoint = {
  path: '/json-import/categories/create',
  method: 'post',
  handler: async (req: any) => {
    try {
      // 1. Vérifier l'authentification et permissions
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // Vérifier les permissions admin pour création de catégories
      const userRole = req.user.role;
      if (!['admin', 'superadmin'].includes(userRole)) {
        return Response.json({
          success: false,
          error: 'Permissions administrateur requises pour créer des catégories'
        }, { status: 403 });
      }

      // 2. Parser les données de création
      const body = await req.json();
      const { 
        categoryName, 
        level = 'both', 
        sessionId 
      } = body;

      if (!categoryName) {
        return Response.json({
          success: false,
          error: 'Nom de catégorie requis'
        }, { status: 400 });
      }

      // 3. Valider le niveau
      if (!['PASS', 'LAS', 'both'].includes(level)) {
        return Response.json({
          success: false,
          error: 'Niveau invalide. Valeurs acceptées: PASS, LAS, both'
        }, { status: 400 });
      }

      // 4. Créer la nouvelle catégorie
      const mappingRecord = await categoryMappingService.createNewCategory(
        categoryName,
        level,
        req.user.id,
        sessionId
      );

      return Response.json({
        success: true,
        message: 'Catégorie créée avec succès',
        data: {
          mappingRecord,
          categoryId: mappingRecord.mappedToId,
          categoryName: mappingRecord.mappedToName,
          createdAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la création de la catégorie:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la création de la catégorie',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer l'historique des mappings
 */
export const getMappingHistoryEndpoint = {
  path: '/json-import/categories/history',
  method: 'get',
  handler: async (req: any) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // 2. Récupérer l'historique de l'utilisateur
      const userHistory = categoryMappingService.getUserMappingHistory(req.user.id);

      // 3. Récupérer les statistiques globales si admin
      const userRole = req.user.role;
      const isAdmin = ['admin', 'superadmin'].includes(userRole);
      const globalStats = isAdmin ? categoryMappingService.getMappingStatistics() : null;

      return Response.json({
        success: true,
        data: {
          userHistory: userHistory.slice(0, 50), // Limiter à 50 entrées récentes
          totalUserMappings: userHistory.length,
          globalStatistics: globalStats,
          recentMappings: userHistory.slice(0, 10).map(mapping => ({
            originalName: mapping.originalName,
            mappedToName: mapping.mappedToName,
            action: mapping.action,
            confidence: mapping.confidence,
            createdAt: mapping.createdAt,
            manualOverride: mapping.manualOverride
          }))
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération de l\'historique:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la récupération de l\'historique',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour rechercher des catégories similaires
 */
export const findSimilarCategoriesEndpoint = {
  path: '/json-import/categories/find-similar',
  method: 'post',
  handler: async (req: any) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // 2. Parser la requête de recherche
      const body = await req.json();
      const { categoryName, threshold = 0.5 } = body;

      if (!categoryName) {
        return Response.json({
          success: false,
          error: 'Nom de catégorie requis pour la recherche'
        }, { status: 400 });
      }

      // 3. Effectuer l'analyse pour cette catégorie spécifique
      const mockImportData = {
        version: '1.0',
        type: 'questions' as const,
        metadata: { level: 'both' as const },
        questions: [{
          questionText: 'Mock question',
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false }
          ],
          explanation: 'Mock explanation',
          category: categoryName,
          difficulty: 'medium' as const,
          level: 'both' as const
        }]
      };

      const analyses = await categoryMappingService.analyzeImportCategories(
        mockImportData,
        req.user.id
      );

      const analysis = analyses[0];
      
      if (!analysis) {
        return Response.json({
          success: true,
          data: {
            categoryName,
            similarCategories: [],
            recommendations: ['Aucune catégorie similaire trouvée - création recommandée']
          }
        });
      }

      // 4. Filtrer par seuil de similarité
      const filteredSuggestions = analysis.suggestedMappings.filter(
        suggestion => suggestion.similarity >= threshold
      );

      return Response.json({
        success: true,
        data: {
          categoryName,
          normalizedName: analysis.normalizedName,
          similarCategories: filteredSuggestions,
          recommendedAction: analysis.recommendedAction,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          threshold
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la recherche de catégories similaires:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la recherche de catégories similaires',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour appliquer des mappings en lot
 */
export const batchApplyMappingsEndpoint = {
  path: '/json-import/categories/batch-apply',
  method: 'post',
  handler: async (req: any) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // 2. Parser les mappings en lot
      const body = await req.json();
      const { mappings, sessionId } = body;

      if (!mappings || !Array.isArray(mappings)) {
        return Response.json({
          success: false,
          error: 'Liste de mappings requise'
        }, { status: 400 });
      }

      // 3. Valider le format des mappings
      for (const mapping of mappings) {
        if (!mapping.originalName || (!mapping.targetCategoryId && mapping.action !== 'create')) {
          return Response.json({
            success: false,
            error: 'Format de mapping invalide. Requis: originalName et (targetCategoryId ou action: create)'
          }, { status: 400 });
        }
      }

      // 4. Appliquer chaque mapping
      const results = [];
      const errors = [];

      for (const mapping of mappings) {
        try {
          let mappingRecord;

          if (mapping.action === 'create') {
            // Vérifier les permissions admin pour création
            const userRole = req.user.role;
            if (!['admin', 'superadmin'].includes(userRole)) {
              errors.push({
                originalName: mapping.originalName,
                error: 'Permissions administrateur requises pour créer des catégories'
              });
              continue;
            }

            mappingRecord = await categoryMappingService.createNewCategory(
              mapping.originalName,
              mapping.level || 'both',
              req.user.id,
              sessionId
            );
          } else {
            mappingRecord = await categoryMappingService.applyMapping(
              mapping.originalName,
              mapping.targetCategoryId,
              req.user.id,
              sessionId,
              mapping.manualOverride || false
            );
          }

          results.push({
            originalName: mapping.originalName,
            success: true,
            mappingRecord
          });

        } catch (error) {
          errors.push({
            originalName: mapping.originalName,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      }

      return Response.json({
        success: errors.length === 0,
        message: `${results.length} mapping(s) appliqué(s) avec succès, ${errors.length} erreur(s)`,
        data: {
          successful: results,
          errors,
          totalProcessed: mappings.length,
          successCount: results.length,
          errorCount: errors.length
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de l\'application des mappings en lot:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de l\'application des mappings en lot',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer les statistiques de mapping
 */
export const getMappingStatisticsEndpoint = {
  path: '/json-import/categories/statistics',
  method: 'get',
  handler: async (req: any) => {
    try {
      // 1. Vérifier l'authentification et permissions admin
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      const userRole = req.user.role;
      if (!['admin', 'superadmin'].includes(userRole)) {
        return Response.json({
          success: false,
          error: 'Permissions administrateur requises'
        }, { status: 403 });
      }

      // 2. Récupérer les statistiques globales
      const globalStats = categoryMappingService.getMappingStatistics();

      // 3. Récupérer les statistiques par utilisateur (top 10)
      const allMappings = Array.from(categoryMappingService['mappingHistory'].values());
      const userStats = new Map<string, number>();

      allMappings.forEach(mapping => {
        const count = userStats.get(mapping.userId) || 0;
        userStats.set(mapping.userId, count + 1);
      });

      const topUsers = Array.from(userStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, mappingCount: count }));

      // 4. Statistiques temporelles (derniers 30 jours)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentMappings = allMappings.filter(m => m.createdAt >= thirtyDaysAgo);

      return Response.json({
        success: true,
        data: {
          global: globalStats,
          topUsers,
          recent: {
            last30Days: recentMappings.length,
            averagePerDay: Math.round(recentMappings.length / 30),
            mostActiveDay: findMostActiveDay(recentMappings)
          },
          trends: {
            manualOverrideRate: globalStats.manualOverrideRate,
            averageConfidence: globalStats.averageConfidence,
            creationRate: globalStats.createdCount / globalStats.totalMappings
          }
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération des statistiques:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la récupération des statistiques',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Utilitaires privés
 */
function generateRecommendations(analyses: any[]): string[] {
  const recommendations: string[] = [];

  const lowConfidenceCount = analyses.filter(a => a.confidence < 0.7).length;
  const autoMappableCount = analyses.filter(a => a.recommendedAction === 'map' && a.confidence > 0.8).length;
  const needsCreationCount = analyses.filter(a => a.recommendedAction === 'create').length;

  if (autoMappableCount > 0) {
    recommendations.push(`${autoMappableCount} catégorie(s) peuvent être mappées automatiquement avec haute confiance`);
  }

  if (lowConfidenceCount > 0) {
    recommendations.push(`${lowConfidenceCount} catégorie(s) nécessitent une révision manuelle`);
  }

  if (needsCreationCount > 0) {
    recommendations.push(`${needsCreationCount} nouvelle(s) catégorie(s) seront créées`);
  }

  if (analyses.length > 10) {
    recommendations.push('Considérez utiliser l\'application de mappings en lot pour gagner du temps');
  }

  return recommendations;
}

function findMostActiveDay(mappings: any[]): string {
  const dayCount = new Map<string, number>();

  mappings.forEach(mapping => {
    const day = mapping.createdAt?.toISOString().split('T')[0] || 'unknown';
    const count = dayCount.get(day) || 0;
    dayCount.set(day, count + 1);
  });

  let mostActiveDay = '';
  let maxCount = 0;

  for (const [day, count] of dayCount.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostActiveDay = day;
    }
  }

  return mostActiveDay || 'Aucune activité récente';
}