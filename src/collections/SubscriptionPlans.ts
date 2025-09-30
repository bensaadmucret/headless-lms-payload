import { CollectionConfig } from 'payload';

const SLUG = 'subscription-plans' as const;

import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';

export const SubscriptionPlans: CollectionConfig = {
  slug: SLUG,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'price', 'currency', 'billingPeriod']
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'superadmin',
    create: ({ req: { user } }) => user?.role === 'superadmin',
    update: ({ req: { user } }) => user?.role === 'superadmin',
    delete: ({ req: { user } }) => user?.role === 'superadmin',
  },
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'price',
      type: 'number',
      required: true,
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'EUR',
    },
    {
      name: 'billingPeriod',
      type: 'select',
      options: [
        { label: 'Mensuel', value: 'monthly' },
        { label: 'Annuel', value: 'yearly' }
      ],
      required: true,
      defaultValue: 'monthly',
    },
    {
      name: 'features',
      type: 'array',
      fields: [
        {
          name: 'feature',
          type: 'text',
        }
      ]
    },
    {
      name: 'limits',
      type: 'group',
      fields: [
        {
          name: 'maxUsers',
          type: 'number',
        },
        {
          name: 'maxStorage',
          type: 'number',
        },
        {
          name: 'maxCourses',
          type: 'number',
        }
      ]
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Actif',
      defaultValue: true,
      required: true,
      admin: {
        position: 'sidebar'
      }
    }
  ]
};

export default SubscriptionPlans;
