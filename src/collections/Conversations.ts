import type { CollectionConfig } from 'payload';

const Conversations: CollectionConfig = {
  slug: 'conversations',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'user', 'createdAt'],
    description: 'Historique des conversations avec le coach IA',
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true;
      return false;
    },
    create: ({ req }) => {
      if (req.user) return true;
      return false;
    },
    update: ({ req }) => {
      if (req.user) return true;
      return false;
    },
    delete: ({ req }) => {
      if (req.user?.role === 'superadmin') return true;
      return false;
    },
  },
  fields: [
    {
      name: 'title',
      label: 'Titre de la conversation',
      type: 'text',
      required: true,
    },
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
      name: 'messages',
      label: 'Messages',
      type: 'array',
      fields: [
        {
          name: 'role',
          label: 'Rôle',
          type: 'select',
          options: [
            { label: 'Système', value: 'system' },
            { label: 'Utilisateur', value: 'user' },
            { label: 'Assistant', value: 'assistant' },
          ],
          required: true,
        },
        {
          name: 'content',
          label: 'Contenu',
          type: 'textarea',
          required: true,
        },
        {
          name: 'timestamp',
          label: 'Horodatage',
          type: 'date',
          required: true,
          defaultValue: () => new Date(),
        },
      ],
    },
    {
      name: 'context',
      label: 'Contexte',
      type: 'group',
      fields: [
        {
          name: 'course',
          label: 'Cours associé',
          type: 'relationship',
          relationTo: 'courses',
        },
        {
          name: 'difficulty',
          label: 'Niveau de difficulté',
          type: 'select',
          options: [
            { label: 'Débutant', value: 'beginner' },
            { label: 'Intermédiaire', value: 'intermediate' },
            { label: 'Avancé', value: 'advanced' },
          ],
        },
      ],
    },
  ],
  timestamps: true,
};

export default Conversations;
