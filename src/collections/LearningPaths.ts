import type { CollectionConfig } from 'payload'

export const LearningPaths: CollectionConfig = {
  slug: 'learning-paths',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'level', 'estimatedDuration', 'stepCount'],
    description: 'Parcours d\'apprentissage structurés avec étapes progressives',
    group: 'Contenu Pédagogique',
  },
  fields: [
    {
      name: 'title',
      label: 'Titre du parcours',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Description générale du parcours d\'apprentissage',
      },
    },
    {
      name: 'level',
      label: 'Niveau d\'études',
      type: 'select',
      required: true,
      defaultValue: 'both',
      options: [
        { label: 'PASS uniquement', value: 'PASS' },
        { label: 'LAS uniquement', value: 'LAS' },
        { label: 'PASS et LAS', value: 'both' },
      ],
      admin: {
        position: 'sidebar',
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
      name: 'estimatedDuration',
      label: 'Durée estimée (minutes)',
      type: 'number',
      required: true,
      admin: {
        position: 'sidebar',
        description: 'Durée totale estimée en minutes',
      },
    },
    {
      name: 'stepCount',
      label: 'Nombre d\'étapes',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'prerequisites',
      label: 'Prérequis',
      type: 'array',
      admin: {
        description: 'Connaissances requises avant de commencer',
      },
      fields: [
        {
          name: 'prerequisite',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'objectives',
      label: 'Objectifs pédagogiques',
      type: 'array',
      admin: {
        description: 'Objectifs à atteindre à la fin du parcours',
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
      name: 'author',
      label: 'Auteur',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'source',
      label: 'Source',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}

export default LearningPaths
