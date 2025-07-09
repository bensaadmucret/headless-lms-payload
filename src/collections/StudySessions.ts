import type { CollectionConfig } from 'payload';
import { authenticated } from '../access/authenticated';

export const StudySessions: CollectionConfig = {
  slug: 'study-sessions',
  labels: {
    singular: 'Session d\'étude',
    plural: 'Sessions d\'étude',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'user', 'status', 'createdAt'],
    description: 'Sessions d\'étude générées par le Coach IA',
    group: 'Apprentissage',
  },
  access: {
    read: ({ req }) => {
      if (req.user?.role === 'superadmin') return true;
      return { 'user': { equals: req.user?.id } };
    },
    create: authenticated,
    update: authenticated,
    delete: ({ req }) => req.user?.role === 'superadmin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre de la session',
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Brouillon', value: 'draft' },
        { label: 'En cours', value: 'in-progress' },
        { label: 'Terminée', value: 'completed' },
        { label: 'En pause', value: 'paused' },
      ],
      defaultValue: 'draft',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'estimatedDuration',
      type: 'number',
      label: 'Durée estimée (minutes)',
      min: 5,
      max: 240,
      admin: {
        description: 'Durée estimée en minutes pour compléter cette session',
        position: 'sidebar',
      },
    },
    {
      name: 'currentStep',
      type: 'number',
      label: 'Étape actuelle',
      defaultValue: 0,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'steps',
      type: 'array',
      label: 'Étapes de la session',
      labels: {
        singular: 'Étape',
        plural: 'Étapes',
      },
      fields: [
        {
          name: 'stepId',
          type: 'number',
          required: true,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Quiz', value: 'quiz' },
            { label: 'Révision', value: 'review' },
            { label: 'Flashcards', value: 'flashcards' },
            { label: 'Vidéo', value: 'video' },
            { label: 'Lecture', value: 'reading' },
          ],
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'En attente', value: 'pending' },
            { label: 'En cours', value: 'in-progress' },
            { label: 'Terminée', value: 'completed' },
            { label: 'Sautée', value: 'skipped' },
          ],
          defaultValue: 'pending',
        },
        {
          name: 'metadata',
          type: 'json',
          admin: {
            description: 'Données spécifiques au type d\'étape',
          },
        },
        {
          name: 'startedAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
            readOnly: true,
          },
        },
        {
          name: 'completedAt',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
            readOnly: true,
          },
        },
      ],
    },
    {
      name: 'context',
      type: 'group',
      label: 'Contexte de la session',
      fields: [
        {
          name: 'course',
          type: 'relationship',
          relationTo: 'courses',
          label: 'Cours associé',
        },
        {
          name: 'difficulty',
          type: 'select',
          options: [
            { label: 'Débutant', value: 'beginner' },
            { label: 'Intermédiaire', value: 'intermediate' },
            { label: 'Avancé', value: 'advanced' },
          ],
          defaultValue: 'beginner',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === 'create') {
          return {
            ...data,
            user: data.user || req.user?.id,
          };
        }
        return data;
      },
    ],
  },
};

export default StudySessions;
