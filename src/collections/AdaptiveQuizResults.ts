import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'
import { logAuditAfterChange, logAuditAfterDelete } from './logAudit'

export const AdaptiveQuizResults: CollectionConfig = {
  slug: 'adaptiveQuizResults',
  admin: {
    useAsTitle: 'session',
    defaultColumns: ['user', 'overallScore', 'successRate', 'completedAt'],
    description: 'Résultats détaillés des quiz adaptatifs'
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
      name: 'session',
      label: 'Session',
      type: 'relationship',
      relationTo: 'adaptiveQuizSessions',
      required: true,
      hasMany: false,
      admin: {
        position: 'sidebar'
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
      name: 'overallScore',
      label: 'Score total',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Score total obtenu'
      }
    },
    {
      name: 'maxScore',
      label: 'Score maximum',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Score maximum possible'
      }
    },
    {
      name: 'successRate',
      label: 'Taux de réussite',
      type: 'number',
      required: true,
      min: 0,
      max: 1,
      admin: {
        description: 'Taux de réussite (0-1)'
      }
    },
    {
      name: 'timeSpent',
      label: 'Temps passé',
      type: 'number',
      required: true,
      admin: {
        description: 'Temps total passé en secondes'
      }
    },
    {
      name: 'completedAt',
      label: 'Terminé le',
      type: 'date',
      required: true,
      admin: {
        description: 'Date et heure de completion'
      }
    },
    {
      name: 'categoryResults',
      label: 'Résultats par catégorie',
      type: 'array',
      admin: {
        description: 'Résultats détaillés par catégorie'
      },
      fields: [
        {
          name: 'category',
          label: 'Catégorie',
          type: 'relationship',
          relationTo: 'categories',
          required: true
        },
        {
          name: 'questionsCount',
          label: 'Nombre de questions',
          type: 'number',
          required: true,
          admin: {
            description: 'Nombre de questions dans cette catégorie'
          }
        },
        {
          name: 'correctAnswers',
          label: 'Réponses correctes',
          type: 'number',
          required: true,
          admin: {
            description: 'Nombre de réponses correctes'
          }
        },
        {
          name: 'incorrectAnswers',
          label: 'Réponses incorrectes',
          type: 'number',
          required: true,
          admin: {
            description: 'Nombre de réponses incorrectes'
          }
        },
        {
          name: 'successRate',
          label: 'Taux de réussite',
          type: 'number',
          required: true,
          min: 0,
          max: 1,
          admin: {
            description: 'Taux de réussite pour cette catégorie'
          }
        },
        {
          name: 'scoreImprovement',
          label: 'Amélioration du score',
          type: 'number',
          admin: {
            description: 'Amélioration par rapport aux performances précédentes'
          }
        },
        {
          name: 'previousSuccessRate',
          label: 'Taux de réussite précédent',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Taux de réussite précédent dans cette catégorie'
          }
        },
        {
          name: 'averageTimePerQuestion',
          label: 'Temps moyen par question',
          type: 'number',
          admin: {
            description: 'Temps moyen par question en secondes'
          }
        }
      ]
    },
    {
      name: 'recommendations',
      label: 'Recommandations',
      type: 'array',
      admin: {
        description: 'Recommandations personnalisées générées'
      },
      fields: [
        {
          name: 'recommendationId',
          label: 'ID de recommandation',
          type: 'text',
          required: true,
          admin: {
            description: 'Identifiant unique de la recommandation'
          }
        },
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          required: true,
          options: [
            { label: 'Étudier plus', value: 'study_more' },
            { label: 'Pratiquer quiz', value: 'practice_quiz' },
            { label: 'Revoir matériel', value: 'review_material' },
            { label: 'Focus catégorie', value: 'focus_category' },
            { label: 'Maintenir force', value: 'maintain_strength' }
          ]
        },
        {
          name: 'category',
          label: 'Catégorie',
          type: 'relationship',
          relationTo: 'categories',
          required: true
        },
        {
          name: 'message',
          label: 'Message',
          type: 'text',
          required: true,
          admin: {
            description: 'Message de recommandation pour l\'étudiant'
          }
        },
        {
          name: 'priority',
          label: 'Priorité',
          type: 'select',
          required: true,
          options: [
            { label: 'Haute', value: 'high' },
            { label: 'Moyenne', value: 'medium' },
            { label: 'Basse', value: 'low' }
          ]
        },
        {
          name: 'actionUrl',
          label: 'URL d\'action',
          type: 'text',
          admin: {
            description: 'URL vers l\'action recommandée'
          }
        },
        {
          name: 'estimatedTimeMinutes',
          label: 'Temps estimé (minutes)',
          type: 'number',
          admin: {
            description: 'Temps estimé pour suivre cette recommandation'
          }
        }
      ]
    },
    {
      name: 'progressComparison',
      label: 'Comparaison de progression',
      type: 'group',
      admin: {
        description: 'Comparaison avec les performances précédentes'
      },
      fields: [
        {
          name: 'previousAverageScore',
          label: 'Score moyen précédent',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Score moyen des quiz précédents'
          }
        },
        {
          name: 'currentScore',
          label: 'Score actuel',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Score de ce quiz'
          }
        },
        {
          name: 'improvement',
          label: 'Amélioration',
          type: 'number',
          admin: {
            description: 'Amélioration (peut être négative)'
          }
        },
        {
          name: 'trend',
          label: 'Tendance',
          type: 'select',
          options: [
            { label: 'En amélioration', value: 'improving' },
            { label: 'Stable', value: 'stable' },
            { label: 'En baisse', value: 'declining' }
          ]
        },
        {
          name: 'streakDays',
          label: 'Série de jours',
          type: 'number',
          admin: {
            description: 'Nombre de jours consécutifs de quiz'
          }
        },
        {
          name: 'lastQuizDate',
          label: 'Date du dernier quiz',
          type: 'date',
          admin: {
            description: 'Date du dernier quiz avant celui-ci'
          }
        }
      ]
    },
    {
      name: 'nextAdaptiveQuizAvailableAt',
      label: 'Prochain quiz adaptatif disponible',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Prochaine disponibilité pour un quiz adaptatif (cooldown)'
      }
    },
    {
      name: 'improvementAreas',
      label: 'Domaines à améliorer',
      type: 'array',
      admin: {
        description: 'Domaines nécessitant une amélioration'
      },
      fields: [
        {
          name: 'categoryName',
          label: 'Nom de la catégorie',
          type: 'text',
          required: true
        }
      ]
    },
    {
      name: 'strengthAreas',
      label: 'Domaines de force',
      type: 'array',
      admin: {
        description: 'Domaines de force de l\'étudiant'
      },
      fields: [
        {
          name: 'categoryName',
          label: 'Nom de la catégorie',
          type: 'text',
          required: true
        }
      ]
    }
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create') {
          // Définir la date de completion si pas déjà définie
          if (!data.completedAt) {
            data.completedAt = new Date()
          }
          
          // Calculer le cooldown pour le prochain quiz adaptatif (30 minutes)
          data.nextAdaptiveQuizAvailableAt = new Date(Date.now() + 30 * 60 * 1000)
        }
      }
    ],
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete]
  }
}