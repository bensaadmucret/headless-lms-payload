import type { CollectionConfig } from 'payload';

/**
 * Collection pour stocker les métriques de performance pré-calculées des utilisateurs
 * Optimise les requêtes en évitant de recalculer à chaque fois
 * Requirements: 1.1, 8.1, 8.4
 */
export const UserPerformances: CollectionConfig = {
  slug: 'user-performances',
  admin: {
    defaultColumns: ['user', 'overallSuccessRate', 'totalQuizzesTaken', 'lastUpdated'],
    description: 'Métriques de performance pré-calculées pour chaque utilisateur',
    useAsTitle: 'user',
  },
  access: {
    create: ({ req }) => !!req.user, // Seuls les utilisateurs connectés peuvent créer
    read: ({ req }) => {
      // Les utilisateurs peuvent lire leurs propres performances
      // Les admins peuvent tout lire
      if (!req.user) return false;
      if (req.user.role === 'admin' || req.user.role === 'superadmin') return true;
      return {
        user: {
          equals: req.user.id,
        },
      };
    },
    update: ({ req }) => {
      // Seuls les admins et le système peuvent mettre à jour
      if (!req.user) return false;
      return req.user.role === 'admin' || req.user.role === 'superadmin';
    },
    delete: ({ req }) => {
      // Seuls les admins peuvent supprimer
      return !!req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Utilisateur associé à ces métriques de performance',
      },
    },
    {
      name: 'overallSuccessRate',
      label: 'Taux de réussite global',
      type: 'number',
      required: true,
      min: 0,
      max: 1,
      admin: {
        description: 'Taux de réussite global (0-1)',
        step: 0.01,
      },
    },
    {
      name: 'totalQuizzesTaken',
      label: 'Nombre total de quiz complétés',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Nombre total de quiz complétés par l\'utilisateur',
      },
    },
    {
      name: 'totalQuestionsAnswered',
      label: 'Nombre total de questions répondues',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Nombre total de questions auxquelles l\'utilisateur a répondu',
      },
    },
    {
      name: 'categoryPerformances',
      label: 'Performances par catégorie',
      type: 'array',
      required: true,
      admin: {
        description: 'Détails des performances pour chaque catégorie',
      },
      fields: [
        {
          name: 'categoryId',
          label: 'ID de la catégorie',
          type: 'text',
          required: true,
          index: true,
        },
        {
          name: 'categoryName',
          label: 'Nom de la catégorie',
          type: 'text',
          required: true,
        },
        {
          name: 'totalQuestions',
          label: 'Nombre de questions',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'correctAnswers',
          label: 'Réponses correctes',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'successRate',
          label: 'Taux de réussite',
          type: 'number',
          required: true,
          min: 0,
          max: 1,
        },
        {
          name: 'lastAttemptDate',
          label: 'Date de dernière tentative',
          type: 'date',
          required: true,
        },
        {
          name: 'questionsAttempted',
          label: 'Questions tentées',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'averageTimePerQuestion',
          label: 'Temps moyen par question (secondes)',
          type: 'number',
          min: 0,
        },
      ],
    },
    {
      name: 'weakestCategories',
      label: 'Catégories les plus faibles',
      type: 'array',
      maxRows: 3,
      admin: {
        description: 'Les 3 catégories avec les taux de réussite les plus bas',
      },
      fields: [
        {
          name: 'categoryId',
          type: 'text',
          required: true,
        },
        {
          name: 'categoryName',
          type: 'text',
          required: true,
        },
        {
          name: 'successRate',
          type: 'number',
          required: true,
          min: 0,
          max: 1,
        },
      ],
    },
    {
      name: 'strongestCategories',
      label: 'Catégories les plus fortes',
      type: 'array',
      maxRows: 3,
      admin: {
        description: 'Les 3 catégories avec les taux de réussite les plus élevés',
      },
      fields: [
        {
          name: 'categoryId',
          type: 'text',
          required: true,
        },
        {
          name: 'categoryName',
          type: 'text',
          required: true,
        },
        {
          name: 'successRate',
          type: 'number',
          required: true,
          min: 0,
          max: 1,
        },
      ],
    },
    {
      name: 'lastUpdated',
      label: 'Dernière mise à jour',
      type: 'date',
      required: true,
      admin: {
        description: 'Date de la dernière mise à jour des métriques',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      defaultValue: () => new Date(),
    },
    {
      name: 'analysisDate',
      label: 'Date d\'analyse',
      type: 'date',
      required: true,
      admin: {
        description: 'Date à laquelle l\'analyse a été effectuée',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      defaultValue: () => new Date(),
    },
  ],
  timestamps: true,
};
