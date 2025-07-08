import type { CollectionConfig } from 'payload';

const Lessons: CollectionConfig = {
  slug: 'lessons',
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
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      label: 'Ordre dans le cours',
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Publié',
      defaultValue: false,
    },
  ],
};

export default Lessons;
