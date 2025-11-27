import type { CollectionConfig } from 'payload';

import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';

export const Progress: CollectionConfig = {
  slug: 'progress',
  admin: {
    useAsTitle: 'user',
  },
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
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


