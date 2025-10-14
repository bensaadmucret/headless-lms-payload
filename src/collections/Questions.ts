import { defaultEditorFeatures, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

export const Questions: CollectionConfig = {
  slug: 'questions',
  admin: {
    useAsTitle: 'questionText',
    defaultColumns: ['questionText', 'questionType', 'course'],
    description: 'Notre banque centrale de questions pour tous les quiz et sessions d\'étude.',
    // TODO: Ajouter le bouton de génération IA une fois la structure déterminée
    // components: {
    //   edit: ['@/components/admin/GenerateAIQuestionsButton'],
    // },
  },
  fields: [
    {
      name: 'questionText',
      label: 'Texte de la question',
      type: 'richText',
      required: true,
      editor: lexicalEditor({ features: defaultEditorFeatures }),
    },
    {
      name: 'questionType',
      label: 'Type de question',
      type: 'select',
      required: true,
      defaultValue: 'multipleChoice',
      options: [
        {
          label: 'Choix Multiple (QCM)',
          value: 'multipleChoice',
        },
      ],
    },
    {
      name: 'options',
      label: 'Options de réponse',
      type: 'array',
      minRows: 2,
      maxRows: 6,
      required: true,
      admin: {
        condition: data => data.questionType === 'multipleChoice',
        description: 'Définissez les options pour le QCM et cochez la bonne réponse.',
      },
      fields: [
        {
          name: 'optionText',
          label: 'Texte de l\'option',
          type: 'text',
          required: true,
        },
        {
          name: 'isCorrect',
          label: 'Est la bonne réponse ?',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'explanation',
      label: 'Explication détaillée (Texte Simple)',
      type: 'textarea',
      required: true,
      admin: {
        description: "Cette explication s'affichera à l'étudiant après qu'il ait répondu. Champ temporairement en texte simple pour débogage.",
      },
    },
    {
      name: 'course',
      label: 'Cours associé',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'category',
      label: 'Catégorie',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'difficulty',
      label: 'Niveau de difficulté',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Facile', value: 'easy' },
        { label: 'Moyen', value: 'medium' },
        { label: 'Difficile', value: 'hard' }
      ],
      admin: {
        position: 'sidebar',
        description: 'Niveau de difficulté pour la sélection adaptative'
      }
    },
    {
      name: 'studentLevel',
      label: 'Niveau d\'études ciblé',
      type: 'select',
      required: true,
      defaultValue: 'both',
      options: [
        { label: 'PASS uniquement', value: 'PASS' },
        { label: 'LAS uniquement', value: 'LAS' },
        { label: 'PASS et LAS', value: 'both' }
      ],
      admin: {
        position: 'sidebar',
        description: 'Niveau d\'études ciblé par cette question'
      }
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'array',
      admin: {
        position: 'sidebar',
        description: 'Tags pour filtrage et recherche avancée'
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true
        }
      ]
    },
    {
      name: 'adaptiveMetadata',
      label: 'Métadonnées adaptatives',
      type: 'group',
      admin: {
        position: 'sidebar',
        description: 'Métadonnées spécifiques aux quiz adaptatifs'
      },
      fields: [
        {
          name: 'averageTimeSeconds',
          label: 'Temps moyen de réponse (secondes)',
          type: 'number',
          admin: {
            description: 'Temps moyen de réponse en secondes'
          }
        },
        {
          name: 'successRate',
          label: 'Taux de réussite',
          type: 'number',
          min: 0,
          max: 1,
          admin: {
            description: 'Taux de réussite global (0-1)'
          }
        },
        {
          name: 'timesUsed',
          label: 'Nombre d\'utilisations',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Nombre de fois utilisée dans des quiz adaptatifs'
          }
        }
      ]
    },
    
    // === RELATION AVEC LA BASE DE CONNAISSANCES ===
    // {
    //   name: 'sourceKnowledge',
    //   label: 'Source de Connaissance',
    //   type: 'relationship',
    //   relationTo: 'knowledge-base',
    //   hasMany: true,
    //   admin: {
    //     position: 'sidebar',
    //     description: 'Documents de la base de connaissances utilisés pour cette question',
    //   },
    // },
    {
      name: 'sourcePageReference',
      label: 'Référence de Page',
      type: 'text',
      admin: {
        placeholder: 'Ex: p. 45-47, Chapitre 3',
        description: 'Référence précise dans le document source',
        // condition: (data) => data.sourceKnowledge && data.sourceKnowledge.length > 0,
      },
    },
    {
      name: 'generatedByAI',
      label: 'Générée par l\'IA',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Cette question a été générée automatiquement par l\'IA',
        readOnly: true,
      },
    },
    {
      name: 'aiGenerationPrompt',
      label: 'Prompt de Génération IA',
      type: 'textarea',
      admin: {
        description: 'Prompt utilisé pour générer cette question (pour traçabilité)',
        readOnly: true,
        condition: (data) => data.generatedByAI === true,
      },
    },
    {
      name: 'validatedByExpert',
      label: 'Validée par Expert',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Cette question a été validée par un expert médical',
      },
    },
    {
      name: 'validatedBy',
      label: 'Validée par',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        description: 'Expert médical qui a validé cette question',
        condition: (data) => data.validatedByExpert === true,
      },
    },
  ],
}
