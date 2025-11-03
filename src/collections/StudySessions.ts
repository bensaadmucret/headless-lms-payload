import type { CollectionConfig } from 'payload';
import { StudySessionService } from '../services/StudySessionService';
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
      if (req.user?.role === 'admin') return true;
      return { 'user': { equals: req.user?.id } };
    },
    create: authenticated,
    update: authenticated,
    delete: ({ req }) => req.user?.role === 'admin',
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
          name: 'quiz',
          type: 'relationship',
          relationTo: 'quizzes',
          label: 'Quiz associé',
          // Condition pour n'afficher ce champ que si le type de l'étape est 'quiz'
          admin: {
            condition: (data, siblingData) => siblingData.type === 'quiz',
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
        {
          name: 'isSpacedRepetitionSchedule',
          type: 'checkbox',
          label: 'Planning de répétition espacée',
          defaultValue: false,
        },
        {
          name: 'scheduleData',
          type: 'textarea',
          label: 'Données du planning SRS',
          admin: {
            description: 'Représentation JSON du planning utilisée pour la reconstruction des sessions.',
            readOnly: true,
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        // S'exécute seulement à la création et si ce n'est pas un seed
        if (operation === 'create' && !req.context?.isSeeding) {
          if (!req.user) {
            req.payload.logger.error('User not authenticated in afterChange hook for StudySession.');
            return;
          }

          try {
            const studySessionService = new StudySessionService(req.payload);
            // Appeler le service pour enrichir la session
            const populatedData = await studySessionService.populateSessionWithAI({
              ...doc,
              user: doc.user.id || req.user.id, // Assurer que l'ID utilisateur est passé
            });

            // Mettre à jour le document avec les données enrichies
            // On ne déclenche pas les hooks pour éviter une boucle infinie
            await req.payload.update({
              collection: 'study-sessions',
              id: doc.id,
              data: populatedData,
              overrideAccess: true,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            req.payload.logger.error(`Error populating study session ${doc.id} with AI: ${errorMessage}`);
          }
        }
      },
    ],
  },
};

export default StudySessions;
