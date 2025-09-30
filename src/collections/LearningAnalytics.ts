import { CollectionConfig } from 'payload/types'

const LearningAnalytics: CollectionConfig = {
  slug: 'learning-analytics',
  admin: {
    useAsTitle: 'sessionId',
    defaultColumns: ['student', 'conceptMastered', 'progressionRate', 'adaptationCost'],
    group: 'Analytics'
  },
  fields: [
    {
      name: 'sessionId',
      type: 'text',
      required: true,
      index: true
    },
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true
    },
    {
      name: 'concept',
      type: 'text',
      required: true,
      index: true
    },
    
    // 🎯 MÉTRIQUES D'IMPACT RÉEL
    {
      name: 'realProgressionMetrics',
      type: 'group',
      fields: [
        {
          name: 'timeToMastery',
          type: 'number',
          admin: {
            description: 'Temps réel pour maîtriser le concept (minutes)'
          }
        },
        {
          name: 'masteryDefinition',
          type: 'select',
          options: [
            { label: 'Score > 80% + Confidence > 70%', value: 'standard' },
            { label: 'Score > 90% + Speed < 1.2x median', value: 'advanced' },
            { label: 'Peut expliquer à quelqu\'un d\'autre', value: 'teaching_ready' }
          ]
        },
        {
          name: 'progressionRate',
          type: 'number',
          admin: {
            description: 'Points de progression / heure d\'étude'
          }
        },
        {
          name: 'retentionAfter7Days',
          type: 'number',
          admin: {
            description: 'Score de rétention après 7 jours (0-100%)'
          }
        }
      ]
    },

    // 🔍 DÉTECTION PATTERNS CACHÉS (étudiant lent mais correct)
    {
      name: 'hiddenPatterns',
      type: 'group',
      fields: [
        {
          name: 'accuracyScore',
          type: 'number',
          required: true
        },
        {
          name: 'averageResponseTime',
          type: 'number',
          required: true,
          admin: {
            description: 'Temps moyen de réponse (secondes)'
          }
        },
        {
          name: 'medianResponseTime',
          type: 'number',
          required: true,
          admin: {
            description: 'Temps médian pour ce concept'
          }
        },
        {
          name: 'speedRatio',
          type: 'number',
          admin: {
            description: 'averageTime / medianTime - Detecte les étudiants lents mais corrects'
          }
        },
        {
          name: 'patternDetected',
          type: 'select',
          options: [
            { label: 'Fast & Accurate (Mastered)', value: 'fast_accurate' },
            { label: 'Slow but Correct (Needs Depth)', value: 'slow_correct' },
            { label: 'Fast but Wrong (Overconfident)', value: 'fast_wrong' },
            { label: 'Slow & Wrong (Struggling)', value: 'slow_wrong' }
          ]
        },
        {
          name: 'confidenceScore',
          type: 'number',
          admin: {
            description: 'Score de confiance basé sur vitesse + hésitations'
          }
        }
      ]
    },

    // 💰 COÛT D'ADAPTATION
    {
      name: 'adaptationCost',
      type: 'group',
      fields: [
        {
          name: 'geminiAPICalls',
          type: 'number',
          required: true
        },
        {
          name: 'costPerCall',
          type: 'number',
          admin: {
            description: 'Coût unitaire Gemini (ex: 0.002$)'
          }
        },
        {
          name: 'totalAPICost',
          type: 'number',
          admin: {
            description: 'Coût total API pour cette session'
          }
        },
        {
          name: 'progressionAchieved',
          type: 'number',
          admin: {
            description: 'Points de progression obtenus'
          }
        },
        {
          name: 'costPerProgressionPoint',
          type: 'number',
          admin: {
            description: '$ par point de progression - Métrique ROI clé'
          }
        },
        {
          name: 'ruleBasedResolutions',
          type: 'number',
          admin: {
            description: 'Nombre de résolutions sans IA (économie)'
          }
        }
      ]
    },

    // 🧠 ADAPTATION SYSTÈME
    {
      name: 'systemAdaptation',
      type: 'group',
      fields: [
        {
          name: 'adaptationTrigger',
          type: 'select',
          options: [
            { label: 'Pattern détecté (lent mais correct)', value: 'pattern_slow_correct' },
            { label: 'Confiance faible malgré score', value: 'low_confidence' },
            { label: 'Progression stagnante', value: 'stagnant_progress' },
            { label: 'Aucune adaptation', value: 'no_adaptation' }
          ]
        },
        {
          name: 'adaptationApplied',
          type: 'textarea',
          admin: {
            description: 'Description de l\'adaptation appliquée par le système'
          }
        },
        {
          name: 'adaptationImpact',
          type: 'group',
          fields: [
            {
              name: 'beforeAdaptation',
              type: 'number',
              admin: {
                description: 'Score de progression avant adaptation'
              }
            },
            {
              name: 'afterAdaptation',
              type: 'number',
              admin: {
                description: 'Score de progression après adaptation'
              }
            },
            {
              name: 'improvementRatio',
              type: 'number',
              admin: {
                description: 'Ratio d\'amélioration (afterAdaptation / beforeAdaptation)'
              }
            }
          ]
        }
      ]
    },

    // 📊 COMPARAISONS A/B TEST
    {
      name: 'experimentalGroup',
      type: 'select',
      options: [
        { label: 'Groupe A (Système actuel)', value: 'control_current' },
        { label: 'Groupe B (Vitesse + Confiance)', value: 'experimental_speed_confidence' },
        { label: 'Groupe C (Full Adaptatif)', value: 'experimental_full_adaptive' }
      ],
      required: true,
      index: true
    },

    {
      name: 'timestamps',
      type: 'group',
      fields: [
        {
          name: 'sessionStart',
          type: 'date',
          required: true
        },
        {
          name: 'sessionEnd',
          type: 'date'
        },
        {
          name: 'masteryAchieved',
          type: 'date',
          admin: {
            description: 'Moment où la maîtrise a été atteinte'
          }
        }
      ]
    }
  ],

  hooks: {
    beforeChange: [
      ({ data }) => {
        // Auto-calcul des métriques dérivées
        if (data.hiddenPatterns?.averageResponseTime && data.hiddenPatterns?.medianResponseTime) {
          data.hiddenPatterns.speedRatio = data.hiddenPatterns.averageResponseTime / data.hiddenPatterns.medianResponseTime
        }

        if (data.adaptationCost?.geminiAPICalls && data.adaptationCost?.costPerCall) {
          data.adaptationCost.totalAPICost = data.adaptationCost.geminiAPICalls * data.adaptationCost.costPerCall
        }

        if (data.adaptationCost?.totalAPICost && data.adaptationCost?.progressionAchieved) {
          data.adaptationCost.costPerProgressionPoint = data.adaptationCost.totalAPICost / data.adaptationCost.progressionAchieved
        }

        if (data.systemAdaptation?.adaptationImpact?.beforeAdaptation && data.systemAdaptation?.adaptationImpact?.afterAdaptation) {
          data.systemAdaptation.adaptationImpact.improvementRatio = 
            data.systemAdaptation.adaptationImpact.afterAdaptation / data.systemAdaptation.adaptationImpact.beforeAdaptation
        }
      }
    ]
  }
}

export default LearningAnalytics