import type { CollectionConfig } from 'payload'

export const QuizSubmissions: CollectionConfig = {
  slug: 'quiz-submissions',
  admin: {
    defaultColumns: ['quiz', 'student', 'submissionDate', 'finalScore'],
    description: 'Enregistre chaque tentative de quiz par les étudiants.',
    // La propriété 'readOnly' n'existe pas. Pour rendre la collection non-éditable, on utilise les contrôles d'accès.
  },
  access: {
    create: () => false, // Personne ne peut créer de soumission depuis l'admin
    read: () => true, // Tout le monde peut lire les soumissions
    update: () => false, // Personne ne peut modifier une soumission
    delete: () => false, // Personne ne peut supprimer une soumission
  },
  fields: [
    {
      name: 'quiz',
      type: 'relationship',
      relationTo: 'quizzes',
      required: true,
      index: true,
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
          label: 'Réponse de l\'étudiant',
          type: 'number', // Stocke l'ID de l'option choisie.
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
