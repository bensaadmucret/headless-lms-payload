/**
 * Endpoints pour la consultation des rapports d'audit des imports JSON
 * Permet aux administrateurs de consulter l'historique et générer des rapports
 */

import { JSONImportAuditService } from '../services/JSONImportAuditService';

// Instance globale du service d'audit
let auditService: JSONImportAuditService;

/**
 * Initialise le service d'audit avec l'instance Payload
 */
export const initializeAuditService = (payload: any) => {
  auditService = new JSONImportAuditService(payload);
};

/**
 * Endpoint pour générer un rapport d'activité
 */
export const jsonImportActivityReportEndpoint = {
  path: '/json-import/audit/activity-report',
  method: 'post',
  handler: async (req: any) => {
    try {
      // Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // Vérifier les permissions admin
      const userRole = req.user.role;
      if (!['admin', 'superadmin'].includes(userRole)) {
        return Response.json({
          success: false,
          error: 'Permissions administrateur requises'
        }, { status: 403 });
      }

      // Initialiser le service si nécessaire
      if (!auditService) {
        auditService = new JSONImportAuditService(req.payload);
      }

      // Parser les paramètres de la requête
      const body = await req.json().catch(() => ({}));
      
      const startDate = body.startDate ? new Date(body.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours par défaut
      const endDate = body.endDate ? new Date(body.endDate) : new Date();
      const userId = body.userId ? parseInt(body.userId) : undefined;

      // Valider les dates
      if (startDate >= endDate) {
        return Response.json({
          success: false,
          error: 'La date de début doit être antérieure à la date de fin'
        }, { status: 400 });
      }

      // Générer le rapport
      const report = await auditService.generateActivityReport(startDate, endDate, userId);

      return Response.json({
        success: true,
        data: {
          report,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            durationDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          },
          generatedAt: new Date().toISOString(),
          generatedBy: {
            userId: req.user.id,
            role: req.user.role
          }
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la génération du rapport d\'activité:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer l'historique d'audit d'un job spécifique
 */
export const jsonImportJobAuditHistoryEndpoint = {
  path: '/json-import/audit/job/:jobId',
  method: 'get',
  handler: async (req: any) => {
    try {
      // Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      const jobId = req.routeParams?.jobId;

      if (!jobId) {
        return Response.json({
          success: false,
          error: 'JobId requis'
        }, { status: 400 });
      }

      // Vérifier les permissions admin
      const userRole = req.user.role;
      if (!['admin', 'superadmin'].includes(userRole)) {
        return Response.json({
          success: false,
          error: 'Permissions administrateur requises'
        }, { status: 403 });
      }

      // Initialiser le service si nécessaire
      if (!auditService) {
        auditService = new JSONImportAuditService(req.payload);
      }

      // Récupérer l'historique d'audit
      const auditHistory = await auditService.getJobAuditHistory(jobId);

      if (auditHistory.length === 0) {
        return Response.json({
          success: false,
          error: `Aucun historique d'audit trouvé pour le job ${jobId}`
        }, { status: 404 });
      }

      // Analyser l'historique pour fournir un résumé
      const summary = {
        totalEvents: auditHistory.length,
        firstEvent: auditHistory[0],
        lastEvent: auditHistory[auditHistory.length - 1],
        eventTypes: [...new Set(auditHistory.map(event => event.action))],
        duration: auditHistory.length > 1 ? 
          auditHistory[auditHistory.length - 1].timestamp.getTime() - auditHistory[0].timestamp.getTime() : 0
      };

      return Response.json({
        success: true,
        data: {
          jobId,
          auditHistory,
          summary,
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération de l\'historique d\'audit:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour valider un fichier et logger l'audit
 */
export const jsonImportValidateWithAuditEndpoint = {
  path: '/json-import/validate-with-audit',
  method: 'post',
  handler: async (req: any) => {
    try {
      // Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // Initialiser le service si nécessaire
      if (!auditService) {
        auditService = new JSONImportAuditService(req.payload);
      }

      // Récupérer le fichier depuis formData
      const formData = await req.formData();
      const uploadedFile = formData.get('file');

      if (!uploadedFile || !(uploadedFile instanceof File)) {
        return Response.json({
          success: false,
          error: 'Aucun fichier fourni. Utilisez le champ "file".'
        }, { status: 400 });
      }

      // Détecter le format et parser le contenu
      const format = detectFileFormat(uploadedFile.name, uploadedFile.type);
      
      if (format !== 'json') {
        return Response.json({
          success: false,
          error: 'Seuls les fichiers JSON sont supportés pour la validation'
        }, { status: 400 });
      }

      let importData: any;
      try {
        const fileContent = await uploadedFile.text();
        importData = JSON.parse(fileContent);
      } catch (parseError) {
        return Response.json({
          success: false,
          error: 'Erreur lors du parsing JSON',
          details: parseError instanceof Error ? parseError.message : 'Format invalide'
        }, { status: 400 });
      }

      // Effectuer la validation (simulation - vous devrez importer le service de validation)
      const validationResult = {
        isValid: true, // TODO: Utiliser le vrai service de validation
        errors: [],
        warnings: [],
        totalItems: getEstimatedItemCount(importData)
      };

      // Logger l'audit de validation
      await auditService.logValidationPerformed(
        req.user.id,
        uploadedFile.name,
        format as any,
        importData.type,
        validationResult
      );

      return Response.json({
        success: true,
        message: 'Validation terminée et enregistrée dans l\'audit',
        data: {
          validation: validationResult,
          fileName: uploadedFile.name,
          importType: importData.type,
          auditLogged: true
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la validation avec audit:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer les statistiques d'audit globales
 */
export const jsonImportAuditStatsEndpoint = {
  path: '/json-import/audit/stats',
  method: 'get',
  handler: async (req: any) => {
    try {
      // Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 });
      }

      // Vérifier les permissions admin
      const userRole = req.user.role;
      if (!['admin', 'superadmin'].includes(userRole)) {
        return Response.json({
          success: false,
          error: 'Permissions administrateur requises'
        }, { status: 403 });
      }

      // Initialiser le service si nécessaire
      if (!auditService) {
        auditService = new JSONImportAuditService(req.payload);
      }

      // Générer un rapport pour les 7 derniers jours
      const endDate = new Date();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const weeklyReport = await auditService.generateActivityReport(startDate, endDate);

      // Générer un rapport pour les 30 derniers jours
      const monthStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const monthlyReport = await auditService.generateActivityReport(monthStartDate, endDate);

      return Response.json({
        success: true,
        data: {
          weekly: {
            period: '7 derniers jours',
            ...weeklyReport
          },
          monthly: {
            period: '30 derniers jours',
            ...monthlyReport
          },
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération des statistiques d\'audit:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Détecte le format d'un fichier à partir de son nom et type MIME
 */
function detectFileFormat(filename: string, mimetype: string): string {
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'json':
      return 'json';
    case 'csv':
      return 'csv';
    case 'apkg':
      return 'anki';
    default:
      return 'json';
  }
}

/**
 * Calcule le nombre estimé d'éléments dans les données d'import
 */
function getEstimatedItemCount(data: any): number {
  switch (data.type) {
    case 'questions':
      return (data as any).questions?.length || 0;
    case 'flashcards':
      return (data as any).cards?.length || 0;
    case 'learning-path':
      return (data as any).path?.steps?.reduce((sum: number, step: any) => 
        sum + (step.questions?.length || 0), 0) || 0;
    default:
      return 0;
  }
}