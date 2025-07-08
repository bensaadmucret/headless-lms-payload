import type { CollectionConfig } from 'payload';

import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';

export const Assignments: CollectionConfig = {
  slug: 'assignments',
  admin: {
    useAsTitle: 'title',
  },
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
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


