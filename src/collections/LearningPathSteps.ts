import type { CollectionConfig } from 'payload'

export const LearningPathSteps: CollectionConfig = {
  slug: 'learning-path-steps',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'learningPath', 'order', 'estimatedTime'],
    description: 'Étapes individuelles des parcours d\'apprentissage',
    group: 'Contenu Pédagogique',
  },
  fields: [
    {
      name: 'learningPath',
      label: 'Parcours',
      type: 'relationship',
      relationTo: 'learning-paths',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'stepId',
      label: 'ID de l\'étape',
      type: 'text',
      required: true,
      admin: {
        description: 'Identifiant unique de l\'étape dans le parcours',
      },
    },
    {
      name: 'title',
      label: 'Titre de l\'étape',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      admin: {
        description: 'Description détaillée de l\'étape',
      },
    },
    {
      name: 'order',
      label: 'Ordre',
      type: 'number',
      required: true,
      admin: {
        description: 'Position de l\'étape dans le parcours (commence à 1)',
      },
    },
    {
      name: 'estimatedTime',
      label: 'Temps estimé (minutes)',
      type: 'number',
      required: true,
      admin: {
        description: 'Durée estimée pour compléter cette étape',
      },
    },
    {
      name: 'difficulty',
      label: 'Difficulté',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Facile', value: 'easy' },
        { label: 'Moyen', value: 'medium' },
        { label: 'Difficile', value: 'hard' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'prerequisites',
      label: 'Étapes prérequises',
      type: 'array',
      admin: {
        description: 'IDs des étapes qui doivent être complétées avant celle-ci',
      },
      fields: [
        {
          name: 'stepId',
          label: 'ID de l\'étape prérequise',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'objectives',
      label: 'Objectifs de l\'étape',
      type: 'array',
      admin: {
        description: 'Objectifs spécifiques à cette étape',
      },
      fields: [
        {
          name: 'objective',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'questions',
      label: 'Questions associées',
      type: 'relationship',
      relationTo: 'questions',
      hasMany: true,
      admin: {
        description: 'Questions pour valider les connaissances de cette étape',
      },
    },
  ],
}

export default LearningPathSteps
