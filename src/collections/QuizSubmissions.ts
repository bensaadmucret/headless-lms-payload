import type { CollectionConfig } from 'payload'
import { PerformanceAnalyticsService } from '../services/PerformanceAnalyticsService'

export const QuizSubmissions: CollectionConfig = {
  slug: 'quiz-submissions',
  admin: {
    defaultColumns: ['quiz', 'student', 'submissionDate', 'finalScore'],
    description: 'Enregistre chaque tentative de quiz par les étudiants.',
    // La propriété 'readOnly' n'existe pas. Pour rendre la collection non-éditable, on utilise les contrôles d'accès.
  },
  access: {
    create: ({ req }) => !!req.user, // Seuls les utilisateurs connectés peuvent créer une soumission
    read: () => true, // Tout le monde peut lire les soumissions
    update: () => false, // Personne ne peut modifier une soumission
    delete: ({ req }) => req.user?.role === 'admin', // Seuls les administrateurs peuvent supprimer une soumission
  },
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        // Mettre à jour les performances uniquement lors de la création d'une nouvelle soumission
        if (operation === 'create' && doc.student && doc.finalScore !== undefined) {
          try {
            const studentId = typeof doc.student === 'object' ? doc.student.id : doc.student;
            const analyticsService = new PerformanceAnalyticsService(req.payload);
            
            // Invalider le cache pour forcer un recalcul
            await analyticsService.invalidateUserCache(studentId);
            
            // Recalculer les performances
            const analytics = await analyticsService.analyzeUserPerformance(studentId);
            
            // Vérifier si un enregistrement existe déjà
            const existingPerformance = await req.payload.find({
              collection: 'user-performances',
              where: {
                user: { equals: studentId }
              },
              limit: 1
            });

            // Préparer les données
            const performanceData = {
              user: studentId,
              overallSuccessRate: analytics.overallSuccessRate,
              totalQuizzesTaken: analytics.totalQuizzesTaken,
              totalQuestionsAnswered: analytics.totalQuestionsAnswered,
              categoryPerformances: analytics.categoryPerformances.map(cat => ({
                categoryId: cat.categoryId,
                categoryName: cat.categoryName,
                totalQuestions: cat.totalQuestions,
                correctAnswers: cat.correctAnswers,
                successRate: cat.successRate,
                lastAttemptDate: cat.lastAttemptDate,
                questionsAttempted: cat.questionsAttempted,
                averageTimePerQuestion: cat.averageTimePerQuestion
              })),
              weakestCategories: analytics.weakestCategories.map(cat => ({
                categoryId: cat.categoryId,
                categoryName: cat.categoryName,
                successRate: cat.successRate
              })),
              strongestCategories: analytics.strongestCategories.map(cat => ({
                categoryId: cat.categoryId,
                categoryName: cat.categoryName,
                successRate: cat.successRate
              })),
              lastUpdated: new Date().toISOString(),
              analysisDate: analytics.analysisDate
            };

            // Créer ou mettre à jour
            if (existingPerformance.totalDocs > 0 && existingPerformance.docs[0]) {
              await req.payload.update({
                collection: 'user-performances',
                id: existingPerformance.docs[0].id,
                data: performanceData
              });
              req.payload.logger.info(`Auto-updated performance for user: ${studentId}`);
            } else {
              await req.payload.create({
                collection: 'user-performances',
                data: performanceData
              });
              req.payload.logger.info(`Auto-created performance for user: ${studentId}`);
            }
          } catch (error) {
            // Log l'erreur mais ne pas bloquer la création de la soumission
            req.payload.logger.error(`Failed to auto-update performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        return doc;
      }
    ]
  },
  fields: [
    {
      name: 'quiz',
      type: 'relationship',
      relationTo: 'quizzes',
      required: true,
      index: true,
      // Configuration pour permettre la suppression en cascade
      admin: {
        allowCreate: false,
      },
      hooks: {
        beforeChange: [({ req, value }) => {
          return value;
        }],
      },
    },
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'submissionDate',
      label: 'Date de soumission',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
      defaultValue: () => new Date(),
    },
    {
      name: 'answers',
      label: 'Réponses fournies',
      type: 'array',
      fields: [
        {
          name: 'question',
          type: 'relationship',
          relationTo: 'questions',
          required: true,
        },
        {
          name: 'answer',
          label: "Réponse de l'étudiant (ID de l'option)",
          type: 'text',
        },
        {
          name: 'isCorrect',
          type: 'checkbox',
          label: 'Réponse correcte ?',
          required: true,
        },
      ],
    },
    {
      name: 'finalScore',
      label: 'Score Final (%)',
      type: 'number',
      required: true,
    },
  ],
}
