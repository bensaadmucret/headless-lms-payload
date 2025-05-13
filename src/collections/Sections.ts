import type { CollectionConfig } from 'payload';

const Sections: CollectionConfig = {
  slug: 'sections',
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
  ],
};

export default Sections;
