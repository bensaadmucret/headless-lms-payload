/**
 * Endpoints pour le workflow de validation humaine obligatoire
 * Gère les étapes de prévisualisation, correction et validation manuelle
 */

import { HumanValidationWorkflowService } from '../services/HumanValidationWorkflowService';
import { CSVImportService } from '../services/CSVImportService';
import { ImportFormat } from '../types/jsonImport';

// Instance globale du service de validation humaine
const humanValidationService = new HumanValidationWorkflowService();
const csvImportService = new CSVImportService();

/**
 * Endpoint pour créer une session de validation avec prévisualisation
 */
export const createValidationSessionEndpoint = {
  path: '/json-import/validate-preview',
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

      // 2. Récupérer le fichier depuis formData
      const formData = await req.formData();
      const uploadedFile = formData.get('file');

      if (!uploadedFile || !(uploadedFile instanceof File)) {
        return Response.json({
          success: false,
          error: 'Aucun fichier fourni. Utilisez le champ "file".'
        }, { status: 400 });
      }

      // 3. Détecter le format du fichier
      const format = detectFileFormat(uploadedFile.name, uploadedFile.type);
      
      if (!['json', 'csv'].includes(format)) {
        return Response.json({
          success: false,
          error: `Format de fichier non supporté: ${format}. Formats acceptés: JSON, CSV`
        }, { status: 400 });
      }

      // 4. Valider la taille du fichier
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (uploadedFile.size > maxSize) {
        return Response.json({
          success: false,
          error: `Fichier trop volumineux (${Math.round(uploadedFile.size / 1024 / 1024)}MB). Taille maximale: 10MB`
        }, { status: 400 });
      }

      // 5. Lire le contenu du fichier
      const fileContent = format === 'json' ? 
        await uploadedFile.text() : 
        await uploadedFile.arrayBuffer();

      // 6. Créer la session de validation avec prévisualisation
      const { sessionId, preview } = await humanValidationService.createValidationSession(
        fileContent,
        uploadedFile.name,
        format as ImportFormat,
        req.user.id
      );

      // 7. Déterminer si une validation manuelle est requise
      const requiresManualValidation = 
        preview.validation.errors.length > 0 || 
        preview.categoryMappings.some(m => m.action === 'create') ||
        preview.sampleItems.some(item => item.requiresAttention);

      return Response.json({
        success: true,
        message: 'Session de validation créée avec succès',
        data: {
          sessionId,
          fileName: uploadedFile.name,
          format,
          preview,
          requiresManualValidation,
          validationRequired: true, // Toujours requis selon les exigences
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          nextSteps: requiresManualValidation ? [
            'Examinez les erreurs et avertissements détectés',
            'Appliquez les corrections nécessaires',
            'Demandez la validation à un administrateur',
            'Procédez à l\'import après approbation'
          ] : [
            'Aucune erreur critique détectée',
            'Validation administrateur requise avant import',
            'Vérifiez les mappings de catégories suggérés'
          ],
          endpoints: {
            applyCorrections: `/api/json-import/validation/${sessionId}/corrections`,
            requestValidation: `/api/json-import/validation/${sessionId}/request-approval`,
            getSession: `/api/json-import/validation/${sessionId}`
          }
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la création de la session de validation:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la création de la session de validation',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer une session de validation
 */
export const getValidationSessionEndpoint = {
  path: '/json-import/validation/:sessionId',
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

      const sessionId = req.routeParams?.sessionId;

      if (!sessionId) {
        return Response.json({
          success: false,
          error: 'SessionId requis'
        }, { status: 400 });
      }

      // 2. Récupérer la session
      const session = humanValidationService.getValidationSession(sessionId, req.user.id);

      if (!session) {
        return Response.json({
          success: false,
          error: 'Session de validation non trouvée ou expirée'
        }, { status: 404 });
      }

      // 3. Générer la prévisualisation actuelle
      const preview = await humanValidationService['generateImportPreview'](session);

      return Response.json({
        success: true,
        data: {
          sessionId: session.id,
          fileName: session.fileName,
          format: session.format,
          importType: session.importType,
          status: session.status,
          preview,
          corrections: session.corrections,
          adminComments: session.adminComments,
          validatedBy: session.validatedBy,
          validatedAt: session.validatedAt,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          canEdit: session.status === 'pending_validation',
          canProceedToImport: session.status === 'validated'
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération de la session:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la récupération de la session',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour appliquer des corrections à une session
 */
export const applyCorrectionsEndpoint = {
  path: '/json-import/validation/:sessionId/corrections',
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

      const sessionId = req.routeParams?.sessionId;

      if (!sessionId) {
        return Response.json({
          success: false,
          error: 'SessionId requis'
        }, { status: 400 });
      }

      // 2. Parser les corrections depuis le body
      const body = await req.json();
      const { corrections } = body;

      if (!corrections || !Array.isArray(corrections)) {
        return Response.json({
          success: false,
          error: 'Liste de corrections requise'
        }, { status: 400 });
      }

      // 3. Valider le format des corrections
      for (const correction of corrections) {
        if (typeof correction.itemIndex !== 'number' || 
            !correction.field || 
            correction.newValue === undefined ||
            !correction.reason) {
          return Response.json({
            success: false,
            error: 'Format de correction invalide. Requis: itemIndex, field, newValue, reason'
          }, { status: 400 });
        }
      }

      // 4. Appliquer les corrections
      const result = await humanValidationService.applyCorrections(
        sessionId,
        corrections,
        req.user.id
      );

      return Response.json({
        success: true,
        message: `${corrections.length} correction(s) appliquée(s) avec succès`,
        data: {
          sessionId,
          appliedCorrections: corrections.length,
          updatedPreview: result.updatedPreview,
          remainingIssues: result.updatedPreview.validation.errors.length,
          canRequestValidation: result.updatedPreview.validation.errors.filter(e => e.severity === 'critical').length === 0
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de l\'application des corrections:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de l\'application des corrections',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour demander la validation administrative
 */
export const requestValidationEndpoint = {
  path: '/json-import/validation/:sessionId/request-approval',
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

      const sessionId = req.routeParams?.sessionId;

      if (!sessionId) {
        return Response.json({
          success: false,
          error: 'SessionId requis'
        }, { status: 400 });
      }

      // 2. Récupérer la session
      const session = humanValidationService.getValidationSession(sessionId, req.user.id);

      if (!session) {
        return Response.json({
          success: false,
          error: 'Session de validation non trouvée ou expirée'
        }, { status: 404 });
      }

      if (session.status !== 'pending_validation') {
        return Response.json({
          success: false,
          error: 'Cette session ne peut plus être modifiée'
        }, { status: 400 });
      }

      // 3. Vérifier qu'il n'y a pas d'erreurs critiques
      const criticalErrors = session.validationResults.errors.filter(e => e.severity === 'critical');
      
      if (criticalErrors.length > 0) {
        return Response.json({
          success: false,
          error: 'Des erreurs critiques doivent être corrigées avant de demander la validation',
          data: {
            criticalErrors: criticalErrors.map(e => e.message)
          }
        }, { status: 400 });
      }

      // 4. Parser les commentaires optionnels
      const body = await req.json().catch(() => ({}));
      const { comments } = body;

      // 5. Marquer la session comme prête pour validation admin
      // (Dans une implémentation complète, ceci pourrait déclencher une notification)
      
      return Response.json({
        success: true,
        message: 'Demande de validation envoyée aux administrateurs',
        data: {
          sessionId,
          status: 'awaiting_admin_validation',
          comments,
          submittedAt: new Date().toISOString(),
          nextSteps: [
            'Un administrateur va examiner votre demande',
            'Vous recevrez une notification une fois la validation terminée',
            'L\'import pourra être lancé après approbation'
          ],
          estimatedValidationTime: '2-24 heures'
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la demande de validation:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la demande de validation',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour la validation administrative (approbation/rejet)
 */
export const adminValidationEndpoint = {
  path: '/json-import/validation/:sessionId/admin-validate',
  method: 'post',
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

      const sessionId = req.routeParams?.sessionId;

      if (!sessionId) {
        return Response.json({
          success: false,
          error: 'SessionId requis'
        }, { status: 400 });
      }

      // 2. Parser la décision de validation
      const body = await req.json();
      const { approved, comments } = body;

      if (typeof approved !== 'boolean') {
        return Response.json({
          success: false,
          error: 'Décision de validation requise (approved: true/false)'
        }, { status: 400 });
      }

      // 3. Effectuer la validation
      const result = await humanValidationService.validateSession(
        sessionId,
        req.user.id,
        approved,
        comments
      );

      return Response.json({
        success: true,
        message: approved ? 'Session approuvée avec succès' : 'Session rejetée',
        data: {
          sessionId,
          approved,
          comments,
          canProceedToImport: result.canProceedToImport,
          validatedBy: req.user.id,
          validatedAt: new Date().toISOString(),
          nextSteps: approved ? [
            'L\'utilisateur peut maintenant procéder à l\'import',
            'Les données ont été validées et approuvées',
            'L\'import utilisera les données corrigées si applicable'
          ] : [
            'L\'utilisateur a été notifié du rejet',
            'Des corrections supplémentaires peuvent être nécessaires',
            'Une nouvelle demande de validation peut être soumise'
          ]
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la validation administrative:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la validation administrative',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour lister les sessions en attente de validation (admin)
 */
export const listPendingValidationsEndpoint = {
  path: '/json-import/validation/pending',
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

      // 2. Récupérer les statistiques et sessions en attente
      const stats = humanValidationService.getValidationStats();
      
      // Pour une implémentation complète, on récupérerait les sessions depuis la base de données
      // Ici on utilise les sessions en mémoire pour la démonstration
      const pendingSessions = Array.from(humanValidationService['validationSessions'].values())
        .filter(session => session.status === 'pending_validation')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 20) // Limiter à 20 sessions
        .map(session => ({
          sessionId: session.id,
          fileName: session.fileName,
          format: session.format,
          importType: session.importType,
          userId: session.userId,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          errorCount: session.validationResults.errors.length,
          warningCount: session.validationResults.warnings.length,
          criticalErrorCount: session.validationResults.errors.filter(e => e.severity === 'critical').length,
          itemCount: humanValidationService['getItemCount'](session.originalData),
          correctionCount: session.corrections.length,
          requiresAttention: session.validationResults.errors.some(e => ['critical', 'major'].includes(e.severity))
        }));

      return Response.json({
        success: true,
        data: {
          stats,
          pendingSessions,
          total: pendingSessions.length
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération des validations en attente:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la récupération des validations en attente',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour procéder à l'import après validation
 */
export const proceedToImportEndpoint = {
  path: '/json-import/validation/:sessionId/proceed',
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

      const sessionId = req.routeParams?.sessionId;

      if (!sessionId) {
        return Response.json({
          success: false,
          error: 'SessionId requis'
        }, { status: 400 });
      }

      // 2. Récupérer les données finales validées
      const finalData = humanValidationService.getFinalImportData(sessionId, req.user.id);

      if (!finalData) {
        return Response.json({
          success: false,
          error: 'Session non trouvée ou non validée. La validation administrative est requise.'
        }, { status: 400 });
      }

      // 3. Parser les options d'import
      const body = await req.json().catch(() => ({}));
      const options = {
        dryRun: false, // Toujours false pour l'import final
        batchSize: body.batchSize || 50,
        overwriteExisting: body.overwriteExisting || false,
        ...body.options
      };

      // 4. Démarrer l'import via le service de traitement par lots existant
      const { BatchProcessingService } = await import('../services/BatchProcessingService');
      const batchProcessingService = new BatchProcessingService();
      
      // Initialiser avec payload si nécessaire
      if (!batchProcessingService['servicesInitialized']) {
        batchProcessingService.initializeServices(req.payload);
      }

      const jobId = await batchProcessingService.startBatchProcessing(
        finalData,
        req.user.id,
        `validated_${sessionId}`,
        'json', // Format normalisé après validation
        {
          ...options,
          validationSessionId: sessionId, // Traçabilité
          preValidated: true
        }
      );

      return Response.json({
        success: true,
        message: 'Import démarré avec succès après validation',
        data: {
          jobId,
          sessionId,
          importType: finalData.type,
          estimatedItems: humanValidationService['getItemCount'](finalData),
          status: 'queued',
          queuedAt: new Date().toISOString(),
          endpoints: {
            status: `/api/json-import/status/${jobId}`,
            pause: `/api/json-import/control/${jobId}/pause`,
            cancel: `/api/json-import/control/${jobId}/cancel`
          },
          nextSteps: [
            'L\'import a été placé en file d\'attente',
            'Les données ont été pré-validées par un administrateur',
            'Utilisez l\'endpoint status pour suivre la progression'
          ]
        }
      }, { status: 202 });

    } catch (error) {
      console.error('💥 Erreur lors du lancement de l\'import validé:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors du lancement de l\'import',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour générer un template CSV
 */
export const generateCSVTemplateEndpoint = {
  path: '/json-import/csv-template',
  method: 'get',
  handler: async (req: any) => {
    try {
      const csvTemplate = csvImportService.generateCSVTemplate();

      return new Response(csvTemplate, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="template-questions.csv"'
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la génération du template CSV:', error);

      return Response.json({
        success: false,
        error: 'Erreur lors de la génération du template CSV',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Détecte le format d'un fichier à partir de son nom et type MIME
 */
function detectFileFormat(filename: string, mimetype: string): ImportFormat {
  const extension = filename.toLowerCase().split('.').pop();
  
  // Vérification par extension
  switch (extension) {
    case 'json':
      return 'json';
    case 'csv':
      return 'csv';
    case 'apkg':
      return 'anki';
    default:
      break;
  }
  
  // Vérification par type MIME
  switch (mimetype) {
    case 'application/json':
    case 'text/json':
      return 'json';
    case 'text/csv':
    case 'application/csv':
      return 'csv';
    default:
      return 'json'; // Par défaut
  }
}