import type { CollectionConfig } from 'payload';

const Progress: CollectionConfig = {
  slug: 'progress',
  admin: {
    useAsTitle: 'user',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Non commencé', value: 'not_started' },
        { label: 'En cours', value: 'in_progress' },
        { label: 'Terminé', value: 'completed' },
      ],
      required: true,
      defaultValue: 'not_started',
    },
    {
      name: 'score',
      type: 'number',
      required: false,
      label: 'Score (pour les quiz)',
    },
  ],
};

export default Progress;
