import type { PayloadRequest } from 'payload';

export const exportGenerationLogsEndpoint = {
  path: '/export-generation-logs',
  method: 'get' as const,
  handler: async (req: PayloadRequest) => {
    try {
      // Vérifier les permissions
      if (!req.user || (req.user.role !== 'superadmin' && req.user.role !== 'admin')) {
        return Response.json(
          { error: 'Accès non autorisé' },
          { status: 403 }
        );
      }

      // Récupérer les logs avec les mêmes filtres que l'interface
      const statusFilter = req.query?.status as string;
      const actionFilter = req.query?.action as string;
      const startDate = req.query?.startDate as string;
      const endDate = req.query?.endDate as string;

      // Construire la requête
      const where: any = {};
      
      if (statusFilter && statusFilter !== 'all') {
        where.status = { equals: statusFilter };
      }
      
      if (actionFilter && actionFilter !== 'all') {
        where.action = { equals: actionFilter };
      }

      if (startDate) {
        where.createdAt = { ...where.createdAt, greater_than_equal: startDate };
      }

      if (endDate) {
        where.createdAt = { ...where.createdAt, less_than_equal: endDate };
      }

      // Récupérer tous les logs (sans limite)
      const logs = await req.payload.find({
        collection: 'generationlogs',
        where,
        limit: 10000, // Limite raisonnable
        sort: '-createdAt',
      });

      // Générer le CSV
      const csvHeaders = [
        'Date/Heure',
        'Utilisateur',
        'Email',
        'Action',
        'Statut',
        'Sujet',
        'Catégorie',
        'Niveau',
        'Nombre Questions',
        'Difficulté',
        'Questions Créées',
        'Score Validation',
        'Quiz ID',
        'Type Erreur',
        'Message Erreur',
        'Durée (ms)',
        'Tentatives',
      ];

      const csvRows = logs.docs.map((log: any) => {
        return [
          new Date(log.createdAt).toLocaleString('fr-FR'),
          log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : 'N/A',
          log.user?.email || 'N/A',
          log.action || '',
          log.status || '',
          log.generationConfig?.subject || '',
          log.generationConfig?.categoryName || '',
          log.generationConfig?.studentLevel || '',
          log.generationConfig?.questionCount || '',
          log.generationConfig?.difficulty || '',
          log.result?.questionsCreated || '',
          log.result?.validationScore || '',
          log.result?.quizId || '',
          log.error?.type || '',
          log.error?.message || '',
          log.performance?.duration || '',
          log.performance?.retryCount || '',
        ].map(value => {
          // Échapper les guillemets et entourer de guillemets si nécessaire
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',');
      });

      const csv = [csvHeaders.join(','), ...csvRows].join('\n');

      // Générer le nom de fichier avec timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `generation-logs-${timestamp}.csv`;

      // Retourner le CSV avec les bons headers
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });

    } catch (error: any) {
      console.error('Erreur export logs génération:', error);
      return Response.json(
        { 
          success: false, 
          error: 'Erreur lors de l\'export des logs',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  },
};
