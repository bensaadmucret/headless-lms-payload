import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'
import { logAuditAfterChange, logAuditAfterDelete } from './logAudit'
import { rateLimitHook } from '../hooks/rateLimitHook'

export const AdaptiveQuizSessions: CollectionConfig = {
  slug: 'adaptiveQuizSessions',
  admin: {
    useAsTitle: 'sessionId',
    defaultColumns: ['user', 'createdAt', 'status', 'questionsCount'],
    description: 'Sessions de quiz adaptatifs générées pour les étudiants',
    enableRichTextRelationship: false,
  },
  access: {
    create: authenticated,
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      return { user: { equals: user?.id } }
    },
    update: authenticated,
    delete: authenticated
  },
  fields: [
    {
      name: 'sessionId',
      label: 'ID de session',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
        description: 'Identifiant unique généré automatiquement'
      }
    },
    {
      name: 'user',
      label: 'Utilisateur',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: {
        position: 'sidebar'
      }
    },
    {
      name: 'questions',
      label: 'Questions sélectionnées',
      type: 'relationship',
      relationTo: 'questions',
      required: true,
      hasMany: true,
      admin: {
        description: 'Questions sélectionnées pour ce quiz adaptatif'
      }
    },
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Actif', value: 'active' },
        { label: 'Terminé', value: 'completed' },
        { label: 'Abandonné', value: 'abandoned' },
        { label: 'Expiré', value: 'expired' }
      ],
      admin: {
        position: 'sidebar'
      }
    },
    {
      name: 'basedOnAnalytics',
      label: 'Basé sur l\'analyse',
      type: 'group',
      admin: {
        description: 'Données d\'analyse ayant servi à générer ce quiz'
      },
      fields: [
        {
          name: 'weakCategories',
          label: 'Catégories faibles',
          type: 'relationship',
          relationTo: 'categories',
          hasMany: true,
          admin: {
            description: 'Catégories identifiées comme faibles'
          }
        },
        {
          name: 'strongCategories',
          label: 'Catégories fortes',
          type: 'relationship',
          relationTo: 'categories',
          hasMany: true,
          admin: {
            description: 'Catégories identifiées comme fortes'
          }
        },
        {
          name: 'analysisDate',
          label: 'Date d\'analyse',
          type: 'date',
          required: true,
          admin: {
            description: 'Date de l\'analyse des performances'
          }
        },
        {
          name: 'overallSuccessRate',
          label: 'Taux de réussite global',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Taux de réussite global de l\'étudiant'
          }
        },
        {
          name: 'totalQuizzesAnalyzed',
          label: 'Nombre de quiz analysés',
          type: 'number',
          admin: {
            description: 'Nombre de quiz pris en compte dans l\'analyse'
          }
        }
      ]
    },
    {
      name: 'questionDistribution',
      label: 'Répartition des questions',
      type: 'group',
      admin: {
        description: 'Répartition des questions dans ce quiz'
      },
      fields: [
        {
          name: 'weakCategoryQuestions',
          label: 'Questions catégories faibles',
          type: 'number',
          required: true,
          admin: {
            description: 'Nombre de questions des catégories faibles'
          }
        },
        {
          name: 'strongCategoryQuestions',
          label: 'Questions catégories fortes',
          type: 'number',
          required: true,
          admin: {
            description: 'Nombre de questions des catégories fortes'
          }
        },
        {
          name: 'totalQuestions',
          label: 'Total des questions',
          type: 'number',
          required: true,
          admin: {
            description: 'Nombre total de questions'
          }
        }
      ]
    },
    {
      name: 'config',
      label: 'Configuration',
      type: 'group',
      admin: {
        description: 'Configuration utilisée pour générer ce quiz'
      },
      fields: [
        {
          name: 'weakQuestionsCount',
          label: 'Nombre de questions faibles',
          type: 'number',
          defaultValue: 5,
          admin: {
            description: 'Nombre cible de questions des catégories faibles'
          }
        },
        {
          name: 'strongQuestionsCount',
          label: 'Nombre de questions fortes',
          type: 'number',
          defaultValue: 2,
          admin: {
            description: 'Nombre cible de questions des catégories fortes'
          }
        },
        {
          name: 'targetSuccessRate',
          label: 'Taux de réussite cible',
          type: 'number',
          defaultValue: 0.6,
          min: 0,
          max: 1,
          admin: {
            description: 'Taux de réussite cible pour ce quiz'
          }
        }
      ]
    },
    {
      name: 'studentLevel',
      label: 'Niveau d\'études',
      type: 'select',
      required: true,
      options: [
        { label: 'PASS', value: 'PASS' },
        { label: 'LAS', value: 'LAS' }
      ],
      admin: {
        position: 'sidebar',
        description: 'Niveau d\'études de l\'étudiant'
      }
    },
    {
      name: 'expiresAt',
      label: 'Expire le',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Date d\'expiration de cette session'
      }
    },
    {
      name: 'questionsCount',
      label: 'Nombre de questions',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Nombre total de questions (calculé automatiquement)'
      }
    }
  ],
  hooks: {
    beforeChange: [
      // rateLimitHook, // Temporairement désactivé pour debug
      ({ data, operation, req }) => {
        if (operation === 'create') {
          // Log pour debug
          req.payload.logger.info(`beforeChange hook - sessionId provided: ${data.sessionId || 'NONE'}`);
          
          // Ne PAS générer de sessionId - il doit être fourni par le service
          // Le service AdaptiveQuizService fournit déjà un sessionId
          
          // Définir l'expiration (24h par défaut) seulement si elle n'existe pas
          if (!data.expiresAt) {
            data.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        }
        
        // Calculer le nombre de questions si le champ questions est présent
        if (data.questions && Array.isArray(data.questions)) {
          data.questionsCount = data.questions.length
        }
      }
    ],
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete]
  }
}