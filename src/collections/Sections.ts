import type { CollectionConfig } from 'payload';

import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';

export const Sections: CollectionConfig = {
  slug: 'sections',
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


