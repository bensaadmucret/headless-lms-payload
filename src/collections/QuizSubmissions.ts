import type { CollectionConfig } from 'payload'

export const QuizSubmissions: CollectionConfig = {
  slug: 'quiz-submissions',
  admin: {
    defaultColumns: ['quiz', 'student', 'submissionDate', 'finalScore'],
    description: 'Enregistre chaque tentative de quiz par les étudiants.',
    // La propriété 'readOnly' n'existe pas. Pour rendre la collection non-éditable, on utilise les contrôles d'accès.
  },
  access: {
    create: ({ req }) => !!req.user, // Seuls les utilisateurs connectés peuvent créer une soumission
    read: () => true, // Tout le monde peut lire les soumissions
    update: () => false, // Personne ne peut modifier une soumission
    delete: ({ req }) => !!req.user?.admin, // Seuls les administrateurs peuvent supprimer une soumission
  },
  fields: [
    {
      name: 'quiz',
      type: 'relationship',
      relationTo: 'quizzes',
      required: true,
      index: true,
      // Configuration pour permettre la suppression en cascade
      admin: {
        allowCreate: false,
      },
      hooks: {
        beforeChange: [({ req, value }) => {
          return value;
        }],
      },
    },
    {
      name: 'student',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'submissionDate',
      label: 'Date de soumission',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
      defaultValue: () => new Date(),
    },
    {
      name: 'answers',
      label: 'Réponses fournies',
      type: 'array',
      fields: [
        {
          name: 'question',
          type: 'relationship',
          relationTo: 'questions',
          required: true,
        },
        {
          name: 'answer',
          label: "Réponse de l'étudiant (ID de l'option)",
          type: 'text',
        },
        {
          name: 'isCorrect',
          type: 'checkbox',
          label: 'Réponse correcte ?',
          required: true,
        },
      ],
    },
    {
      name: 'finalScore',
      label: 'Score Final (%)',
      type: 'number',
      required: true,
    },
  ],
}
