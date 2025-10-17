/**
 * Endpoint principal pour l'import JSON
 * Responsable de l'upload, validation et traitement des fichiers JSON/CSV
 */

import { JSONValidationService } from '../services/JSONValidationService';
import { BatchProcessingService } from '../services/BatchProcessingService';
import { 
  ImportData, 
  ImportType, 
  ImportFormat, 
  ImportOptions
} from '../types/jsonImport';

// Instance globale du service de traitement par lots
const batchProcessingService = new BatchProcessingService();

// Initialiser les services avec Payload (sera fait lors du premier appel)
let servicesInitialized = false;

/**
 * Endpoint principal d'upload et traitement JSON
 */
export const jsonImportUploadEndpoint = {
  path: '/json-import/upload',
  method: 'post',
  handler: async (req: any) => {
    try {
      console.log('📤 Début import JSON...');

      // 0. Initialiser les services si nécessaire
      if (!servicesInitialized) {
        batchProcessingService.initializeServices(req.payload);
        servicesInitialized = true;
      }

      // 1. Vérifier l'authentification et permissions
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
          error: 'Permissions administrateur requises pour l\'import'
        }, { status: 403 });
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

      console.log(`📄 Fichier reçu: ${uploadedFile.name} (${uploadedFile.size} bytes)`);

      // 3. Valider le type de fichier et détecter le format
      const format = detectFileFormat(uploadedFile.name, uploadedFile.type);
      
      if (!['json', 'csv'].includes(format)) {
        return Response.json({
          success: false,
          error: `Format de fichier non supporté: ${format}. Formats acceptés: JSON, CSV`
        }, { status: 400 });
      }

      // 4. Valider la taille du fichier (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (uploadedFile.size > maxSize) {
        return Response.json({
          success: false,
          error: `Fichier trop volumineux (${Math.round(uploadedFile.size / 1024 / 1024)}MB). Taille maximale: 10MB`
        }, { status: 400 });
      }

      // 5. Parser les options d'import depuis formData
      const options: ImportOptions = {
        dryRun: formData.get('dryRun') === 'true',
        batchSize: parseInt(formData.get('batchSize') as string) || 50,
        overwriteExisting: formData.get('overwriteExisting') === 'true',
        categoryMapping: formData.get('categoryMapping') ? JSON.parse(formData.get('categoryMapping') as string) : {},
        generateDistractors: formData.get('generateDistractors') === 'true',
        preserveOriginalTags: formData.get('preserveOriginalTags') === 'true',
        autoCategories: formData.get('autoCategories') === 'true'
      };

      // 6. Parser le contenu du fichier
      let importData: ImportData;
      try {
        if (format === 'json') {
          const fileContent = await uploadedFile.text();
          importData = JSON.parse(fileContent);
        } else {
          // Pour CSV, on utilisera le service CSV (à implémenter dans la prochaine tâche)
          throw new Error('Support CSV en cours d\'implémentation');
        }
      } catch (parseError) {
        return Response.json({
          success: false,
          error: 'Erreur lors du parsing du fichier',
          details: parseError instanceof Error ? parseError.message : 'Format invalide'
        }, { status: 400 });
      }

      // 7. Valider le type d'import
      if (!importData.type || !['questions', 'flashcards', 'learning-path'].includes(importData.type)) {
        return Response.json({
          success: false,
          error: `Type d'import invalide: ${importData.type}. Types supportés: questions, flashcards, learning-path`
        }, { status: 400 });
      }

      // 8. Mode dry-run : validation seulement
      if (options.dryRun) {
        const validationService = new JSONValidationService();
        const validation = await validationService.validateImportData(importData, importData.type);

        return Response.json({
          success: true,
          message: 'Validation terminée (mode dry-run)',
          data: {
            validation,
            fileName: uploadedFile.name,
            format,
            importType: importData.type,
            estimatedItems: getEstimatedItemCount(importData),
            nextSteps: validation.isValid ? [
              'Les données sont valides',
              'Relancez sans dry-run pour effectuer l\'import',
              'Vérifiez les avertissements si présents'
            ] : [
              'Corrigez les erreurs de validation',
              'Relancez la validation',
              'Consultez la documentation pour les formats'
            ]
          }
        });
      }

      // 9. Démarrer le traitement par lots
      console.log('🚀 Démarrage du traitement par lots...');
      
      const jobId = await batchProcessingService.startBatchProcessing(
        importData,
        req.user.id,
        uploadedFile.name,
        format,
        {
          ...options,
          chunkSize: options.batchSize,
          maxConcurrency: 3,
          pauseOnError: false,
          enableProgressTracking: true,
          errorRecovery: {
            rollbackOnCriticalError: true,
            continueOnNonCriticalErrors: true,
            maxErrorsBeforeStop: 10,
            createDetailedReport: true
          }
        }
      );

      console.log(`✅ Job créé avec l'ID: ${jobId}`);

      // 10. Réponse de succès avec informations de suivi
      return Response.json({
        success: true,
        message: 'Import démarré avec succès',
        data: {
          jobId,
          fileName: uploadedFile.name,
          format,
          importType: importData.type,
          estimatedItems: getEstimatedItemCount(importData),
          options,
          status: 'queued',
          queuedAt: new Date().toISOString(),
          estimatedProcessingTime: calculateEstimatedTime(getEstimatedItemCount(importData), options.batchSize || 50),
          endpoints: {
            status: `/api/json-import/status/${jobId}`,
            pause: `/api/json-import/control/${jobId}/pause`,
            cancel: `/api/json-import/control/${jobId}/cancel`
          },
          nextSteps: [
            'L\'import a été placé en file d\'attente',
            'Utilisez l\'endpoint status pour suivre la progression',
            'Vous recevrez un rapport détaillé à la fin'
          ]
        }
      }, { status: 202 });

    } catch (error) {
      console.error('💥 Erreur critique dans jsonImportUpload:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
};/**

 * Endpoint pour obtenir le statut d'un job d'import
 */
export const jsonImportStatusEndpoint = {
  path: '/json-import/status/:jobId',
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

      // Récupérer le job
      const job = batchProcessingService.getJobStatus(jobId);
      if (!job) {
        return Response.json({
          success: false,
          error: `Job ${jobId} non trouvé`
        }, { status: 404 });
      }

      // Vérifier les permissions (propriétaire ou admin)
      const userRole = req.user.role;
      const hasAdminRole = ['admin', 'superadmin'].includes(userRole);

      if (job.userId !== req.user.id && !hasAdminRole) {
        return Response.json({
          success: false,
          error: 'Permissions insuffisantes pour consulter ce job'
        }, { status: 403 });
      }

      // Calculer des métriques supplémentaires
      const now = new Date();
      const duration = job.startedAt ? 
        Math.round((now.getTime() - job.startedAt.getTime()) / 1000) : 0;

      // Construire la réponse détaillée
      return Response.json({
        success: true,
        data: {
          jobId: job.id,
          fileName: job.fileName,
          importType: job.importType,
          format: job.format,
          status: job.status,
          progress: {
            ...job.progress,
            percentage: Math.round((job.progress.processed / job.progress.total) * 100)
          },
          timing: {
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            duration: duration
          },
          results: {
            totalResults: job.results.length,
            successful: job.results.filter(r => r.status === 'success').length,
            failed: job.results.filter(r => r.status === 'error').length,
            skipped: job.results.filter(r => r.status === 'skipped').length
          },
          options: job.options
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération du statut:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour obtenir l'historique des imports d'un utilisateur
 */
export const jsonImportHistoryEndpoint = {
  path: '/json-import/history',
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

      // Vérifier si l'utilisateur est admin (peut voir tous les jobs)
      const userRole = req.user.role;
      const hasAdminRole = ['admin', 'superadmin'].includes(userRole);

      // Récupérer les jobs
      let jobs = hasAdminRole ? 
        Array.from(batchProcessingService['jobs'].values()) :
        batchProcessingService.getUserJobs(req.user.id);

      // Trier par date de création (plus récent en premier)
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Formater les jobs pour la réponse
      const formattedJobs = jobs.slice(0, 20).map(job => ({
        jobId: job.id,
        fileName: job.fileName,
        importType: job.importType,
        format: job.format,
        status: job.status,
        progress: {
          total: job.progress.total,
          processed: job.progress.processed,
          successful: job.progress.successful,
          failed: job.progress.failed,
          percentage: Math.round((job.progress.processed / job.progress.total) * 100)
        },
        timing: {
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt
        },
        errorCount: job.errors.length
      }));

      return Response.json({
        success: true,
        data: {
          jobs: formattedJobs,
          total: jobs.length
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération de l\'historique:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour télécharger les templates JSON
 */
export const jsonImportTemplatesEndpoint = {
  path: '/json-import/templates/:type?',
  method: 'get',
  handler: async (req: any) => {
    try {
      const type = req.routeParams?.type;

      // Template simple pour les questions
      const questionTemplate = {
        version: "1.0",
        type: "questions",
        metadata: {
          source: "Votre établissement",
          created: new Date().toISOString().split('T')[0],
          level: "PASS",
          description: "Description de votre lot de questions"
        },
        questions: [
          {
            questionText: "Quelle est la fonction principale du ventricule gauche ?",
            options: [
              { text: "Pomper le sang vers l'aorte", isCorrect: true },
              { text: "Recevoir le sang des veines", isCorrect: false },
              { text: "Filtrer le sang", isCorrect: false },
              { text: "Produire les globules rouges", isCorrect: false }
            ],
            explanation: "Le ventricule gauche pompe le sang oxygéné vers l'aorte et la circulation systémique.",
            category: "Cardiologie",
            difficulty: "medium",
            level: "PASS",
            tags: ["anatomie", "cœur", "circulation"]
          }
        ]
      };

      // Si un type spécifique est demandé
      if (type === 'questions') {
        return new Response(JSON.stringify(questionTemplate, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="template-questions.json"`
          }
        });
      }

      // Retourner la liste des templates disponibles
      return Response.json({
        success: true,
        data: {
          availableTemplates: ['questions'],
          templates: {
            questions: {
              name: 'questions',
              description: 'Template pour importer des questions QCM avec options et explications',
              downloadUrl: '/api/json-import/templates/questions',
              estimatedItems: 1
            }
          },
          usage: {
            instructions: [
              "Téléchargez le template correspondant à votre type de contenu",
              "Modifiez les données selon vos besoins",
              "Respectez la structure et les champs requis",
              "Utilisez l'endpoint /validate pour vérifier avant import"
            ],
            supportedFormats: ["JSON"],
            maxFileSize: "10MB",
            maxItems: 1000
          }
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la récupération des templates:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour valider un fichier sans l'importer
 */
export const jsonImportValidateEndpoint = {
  path: '/json-import/validate',
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

      let importData: ImportData;
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

      // Effectuer la validation complète
      const validationService = new JSONValidationService();
      const validation = await validationService.validateImportData(importData, importData.type);

      return Response.json({
        success: true,
        message: validation.isValid ? 'Validation réussie' : 'Erreurs de validation détectées',
        data: {
          validation,
          fileName: uploadedFile.name,
          importType: importData.type,
          estimatedItems: getEstimatedItemCount(importData)
        }
      });

    } catch (error) {
      console.error('💥 Erreur lors de la validation:', error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour contrôler un job (pause/reprise/annulation)
 */
export const jsonImportControlEndpoint = {
  path: '/json-import/control/:jobId/:action',
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

      const jobId = req.routeParams?.jobId;
      const action = req.routeParams?.action;

      if (!jobId || !action) {
        return Response.json({
          success: false,
          error: 'JobId et action requis'
        }, { status: 400 });
      }

      // Vérifier que le job existe
      const job = batchProcessingService.getJobStatus(jobId);
      if (!job) {
        return Response.json({
          success: false,
          error: `Job ${jobId} non trouvé`
        }, { status: 404 });
      }

      // Vérifier les permissions
      const userRole = req.user.role;
      const hasAdminRole = ['admin', 'superadmin'].includes(userRole);

      if (job.userId !== req.user.id && !hasAdminRole) {
        return Response.json({
          success: false,
          error: 'Permissions insuffisantes pour contrôler ce job'
        }, { status: 403 });
      }

      // Exécuter l'action demandée
      let result: boolean;
      let message: string;

      switch (action) {
        case 'pause':
          result = await batchProcessingService.pauseJob(jobId);
          message = result ? 'Job mis en pause avec succès' : 'Impossible de mettre en pause le job';
          break;

        case 'resume':
          result = await batchProcessingService.resumeJob(jobId);
          message = result ? 'Job repris avec succès' : 'Impossible de reprendre le job';
          break;

        case 'cancel':
          result = await batchProcessingService.cancelJob(jobId);
          message = result ? 'Job annulé avec succès' : 'Impossible d\'annuler le job';
          break;

        default:
          return Response.json({
            success: false,
            error: `Action non supportée: ${action}. Actions disponibles: pause, resume, cancel`
          }, { status: 400 });
      }

      return Response.json({
        success: result,
        message,
        data: {
          jobId,
          action,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error(`💥 Erreur lors du contrôle du job:`, error);

      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour générer et télécharger un rapport d'import
 */
export const jsonImportReportEndpoint = {
  path: '/json-import/report/:jobId',
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

      // Vérifier que le job existe
      const job = batchProcessingService.getJobStatus(jobId);
      if (!job) {
        return Response.json({
          success: false,
          error: `Job ${jobId} non trouvé`
        }, { status: 404 });
      }

      // Vérifier les permissions
      const userRole = req.user.role;
      const hasAdminRole = ['admin', 'superadmin'].includes(userRole);

      if (job.userId !== req.user.id && !hasAdminRole) {
        return Response.json({
          success: false,
          error: 'Permissions insuffisantes pour consulter ce rapport'
        }, { status: 403 });
      }

      // Générer le rapport
      const report = batchProcessingService.generateJobReport(jobId);
      if (!report) {
        return Response.json({
          success: false,
          error: 'Rapport non disponible pour ce job'
        }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('💥 Erreur lors de la génération du rapport:', error);

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

/**
 * Calcule le nombre estimé d'éléments dans les données d'import
 */
function getEstimatedItemCount(data: ImportData): number {
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

/**
 * Calcule le temps estimé de traitement
 */
function calculateEstimatedTime(itemCount: number, batchSize: number): string {
  // Estimation: ~2 secondes par batch + 0.1 seconde par item
  const batchCount = Math.ceil(itemCount / batchSize);
  const estimatedSeconds = (batchCount * 2) + (itemCount * 0.1);
  
  if (estimatedSeconds < 60) {
    return `${Math.round(estimatedSeconds)} secondes`;
  } else if (estimatedSeconds < 3600) {
    return `${Math.round(estimatedSeconds / 60)} minutes`;
  } else {
    return `${Math.round(estimatedSeconds / 3600)} heures`;
  }
}