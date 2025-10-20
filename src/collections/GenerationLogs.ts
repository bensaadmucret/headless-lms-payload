import type { CollectionConfig } from 'payload';

const GenerationLogs: CollectionConfig = {
  slug: 'generationlogs',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'user', 'status', 'createdAt', 'duration'],
    description: 'Logs détaillés de toutes les générations de quiz par IA avec métriques de performance.',
    group: 'Administration',
    pagination: {
      defaultLimit: 50,
    },
  },
  access: {
    read: ({ req }) => req.user?.role === 'superadmin' || req.user?.role === 'admin',
    create: () => true, // Permettre au système de créer des logs
    update: () => false, // Les logs ne doivent pas être modifiés
    delete: ({ req }) => req.user?.role === 'superadmin', // Seuls les superadmins peuvent supprimer
  },
  fields: [
    {
      name: 'user',
      label: 'Utilisateur',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'action',
      label: 'Action',
      type: 'select',
      required: true,
      options: [
        { label: 'Génération Quiz IA', value: 'ai_quiz_generation' },
        { label: 'Génération Questions IA', value: 'ai_questions_generation' },
        { label: 'Validation Contenu IA', value: 'ai_content_validation' },
        { label: 'Création Quiz Automatique', value: 'auto_quiz_creation' },
        { label: 'Retry Génération', value: 'generation_retry' },
        { label: 'Échec Génération', value: 'generation_failure' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      required: true,
      options: [
        { label: 'Démarré', value: 'started' },
        { label: 'En cours', value: 'in_progress' },
        { label: 'Succès', value: 'success' },
        { label: 'Échec', value: 'failed' },
        { label: 'Annulé', value: 'cancelled' },
        { label: 'Timeout', value: 'timeout' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'generationConfig',
      label: 'Configuration de Génération',
      type: 'group',
      fields: [
        {
          name: 'subject',
          label: 'Sujet',
          type: 'text',
          required: false,
        },
        {
          name: 'categoryId',
          label: 'ID Catégorie',
          type: 'text',
          required: false,
        },
        {
          name: 'categoryName',
          label: 'Nom Catégorie',
          type: 'text',
          required: false,
        },
        {
          name: 'studentLevel',
          label: 'Niveau Étudiant',
          type: 'select',
          options: [
            { label: 'PASS', value: 'PASS' },
            { label: 'LAS', value: 'LAS' },
            { label: 'Les deux', value: 'both' },
          ],
          required: false,
        },
        {
          name: 'questionCount',
          label: 'Nombre de Questions',
          type: 'number',
          required: false,
        },
        {
          name: 'difficulty',
          label: 'Difficulté',
          type: 'select',
          options: [
            { label: 'Facile', value: 'easy' },
            { label: 'Moyen', value: 'medium' },
            { label: 'Difficile', value: 'hard' },
          ],
          required: false,
        },
        {
          name: 'medicalDomain',
          label: 'Domaine Médical',
          type: 'text',
          required: false,
        },
        {
          name: 'includeExplanations',
          label: 'Inclure Explications',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'customInstructions',
          label: 'Instructions Personnalisées',
          type: 'textarea',
          required: false,
        },
      ],
    },
    {
      name: 'result',
      label: 'Résultat',
      type: 'group',
      fields: [
        {
          name: 'quizId',
          label: 'ID Quiz Créé',
          type: 'text',
          required: false,
        },
        {
          name: 'questionIds',
          label: 'IDs Questions Créées',
          type: 'array',
          fields: [
            {
              name: 'questionId',
              type: 'text',
            },
          ],
          required: false,
        },
        {
          name: 'questionsCreated',
          label: 'Questions Créées',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'validationScore',
          label: 'Score de Validation',
          type: 'number',
          min: 0,
          max: 100,
          required: false,
          admin: {
            description: 'Score de qualité du contenu généré (0-100)',
          },
        },
        {
          name: 'aiModel',
          label: 'Modèle IA Utilisé',
          type: 'text',
          required: false,
        },
        {
          name: 'aiProvider',
          label: 'Provider IA',
          type: 'select',
          options: [
            { label: 'code-supernova', value: 'code-supernova' },
            { label: 'Google Gemini', value: 'google-gemini' },
            { label: 'OpenAI GPT', value: 'openai-gpt' },
            { label: 'Local/Other', value: 'local' },
          ],
          required: false,
          admin: {
            description: 'Fournisseur d\'IA qui a traité la requête',
          },
        },
        {
          name: 'tokensUsed',
          label: 'Tokens Utilisés',
          type: 'number',
          required: false,
        },
      ],
    },
    {
      name: 'error',
      label: 'Erreur',
      type: 'group',
      fields: [
        {
          name: 'type',
          label: 'Type d\'Erreur',
          type: 'select',
          options: [
            { label: 'Erreur API IA', value: 'ai_api_error' },
            { label: 'Validation Échouée', value: 'validation_failed' },
            { label: 'Erreur Base de Données', value: 'database_error' },
            { label: 'Limite de Taux Dépassée', value: 'rate_limit_exceeded' },
            { label: 'Configuration Invalide', value: 'invalid_config' },
            { label: 'Timeout', value: 'timeout' },
            { label: 'Erreur Inconnue', value: 'unknown_error' },
          ],
          required: false,
        },
        {
          name: 'message',
          label: 'Message d\'Erreur',
          type: 'text',
          required: false,
        },
        {
          name: 'details',
          label: 'Détails de l\'Erreur',
          type: 'json',
          required: false,
          admin: {
            description: 'Détails techniques de l\'erreur pour le débogage',
          },
        },
        {
          name: 'stackTrace',
          label: 'Stack Trace',
          type: 'textarea',
          required: false,
          admin: {
            condition: (data) => process.env.NODE_ENV === 'development',
          },
        },
      ],
    },
    {
      name: 'performance',
      label: 'Métriques de Performance',
      type: 'group',
      fields: [
        {
          name: 'duration',
          label: 'Durée (ms)',
          type: 'number',
          required: false,
          admin: {
            description: 'Durée totale de la génération en millisecondes',
          },
        },
        {
          name: 'aiResponseTime',
          label: 'Temps Réponse IA (ms)',
          type: 'number',
          required: false,
        },
        {
          name: 'validationTime',
          label: 'Temps Validation (ms)',
          type: 'number',
          required: false,
        },
        {
          name: 'databaseTime',
          label: 'Temps Base de Données (ms)',
          type: 'number',
          required: false,
        },
        {
          name: 'retryCount',
          label: 'Nombre de Tentatives',
          type: 'number',
          defaultValue: 1,
        },
        {
          name: 'promptLength',
          label: 'Longueur du Prompt',
          type: 'number',
          required: false,
        },
        {
          name: 'responseLength',
          label: 'Longueur de la Réponse',
          type: 'number',
          required: false,
        },
      ],
    },
    {
      name: 'metadata',
      label: 'Métadonnées',
      type: 'group',
      fields: [
        {
          name: 'ipAddress',
          label: 'Adresse IP',
          type: 'text',
          required: false,
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'userAgent',
          label: 'User Agent',
          type: 'text',
          required: false,
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'sessionId',
          label: 'ID Session',
          type: 'text',
          required: false,
        },
        {
          name: 'requestId',
          label: 'ID Requête',
          type: 'text',
          required: false,
        },
        {
          name: 'environment',
          label: 'Environnement',
          type: 'select',
          options: [
            { label: 'Développement', value: 'development' },
            { label: 'Test', value: 'test' },
            { label: 'Staging', value: 'staging' },
            { label: 'Production', value: 'production' },
          ],
          defaultValue: () => process.env.NODE_ENV || 'development',
        },
        {
          name: 'version',
          label: 'Version',
          type: 'text',
          defaultValue: '1.0.0',
        },
      ],
    },
    {
      name: 'createdAt',
      label: 'Créé le',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'completedAt',
      label: 'Terminé le',
      type: 'date',
      required: false,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Auto-calculer la durée si completedAt est défini
        if (data.completedAt && data.createdAt) {
          const duration = new Date(data.completedAt).getTime() - new Date(data.createdAt).getTime();
          if (!data.performance) {
            data.performance = {};
          }
          data.performance.duration = duration;
        }

        // Définir completedAt automatiquement pour les statuts finaux
        if (['success', 'failed', 'cancelled', 'timeout'].includes(data.status) && !data.completedAt) {
          data.completedAt = new Date();
        }

        return data;
      },
    ],
  },
  timestamps: true,
};

export default GenerationLogs;