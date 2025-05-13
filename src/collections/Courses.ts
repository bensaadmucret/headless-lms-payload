import type { CollectionConfig } from 'payload';

const Courses: CollectionConfig = {
  slug: 'courses',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'level',
      type: 'select',
      options: [
        { label: 'Débutant', value: 'beginner' },
        { label: 'Intermédiaire', value: 'intermediate' },
        { label: 'Avancé', value: 'advanced' },
      ],
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Publié',
      defaultValue: false,
    },
    {
      name: 'tags',
      type: 'text',
      required: false,
    },
    {
      name: 'duration',
      type: 'text',
      required: false,
      label: 'Durée',
    },
  ],
};

export default Courses;
