import type { CollectionConfig } from 'payload';

const Assignments: CollectionConfig = {
  slug: 'assignments',
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
      required: false,
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
    },
    {
      name: 'dueDate',
      type: 'date',
      label: 'Date limite',
      required: false,
    },
    {
      name: 'submitted',
      type: 'checkbox',
      label: 'Soumis',
      defaultValue: false,
    },
  ],
};

export default Assignments;
