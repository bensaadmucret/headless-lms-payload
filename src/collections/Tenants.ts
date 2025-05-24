import { CollectionConfig } from 'payload';
import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';
import { payloadIsSuperAdmin } from '../access/payloadAccess';


const SLUG: CollectionSlug['tenants'] = 'tenants';

const _SUBSCRIPTION_PLANS_SLUG: CollectionSlug['subscription-plans'] = 'subscription-plans';

export const Tenants: CollectionConfig = {
  slug: SLUG,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'plan', 'status', 'createdAt']
  },
  access: {
    read: payloadIsSuperAdmin,
    create: payloadIsSuperAdmin,
    update: payloadIsSuperAdmin,
    delete: payloadIsSuperAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL slug for the tenant'
      }
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Trial', value: 'trial' }
      ]
    },
    {
      name: 'plan',
      type: 'relationship',
      relationTo: 'subscription-plans' as any,      required: true
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text' }
      ]
    },
    {
      name: 'billing',
      type: 'group',
      fields: [
        { name: 'address', type: 'textarea' },
        { name: 'vatNumber', type: 'text' },
        { name: 'billingEmail', type: 'email' }
      ]
    },
    {
      name: 'quotas',
      type: 'group',
      fields: [
        { name: 'maxUsers', type: 'number', defaultValue: 100 },
        { name: 'maxStorage', type: 'number', defaultValue: 10, admin: { description: 'Storage limit in GB' } },
        { name: 'maxCourses', type: 'number', defaultValue: 50 }
      ]
    },
    {
      name: 'branding',
      type: 'group',
      fields: [
        { name: 'primaryColor', type: 'text', admin: { description: 'Hex color code' } },
        { name: 'customDomain', type: 'text' }
      ]
    },
    {
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'features',
          type: 'select',
          
          options: [
            { label: 'Advanced Analytics', value: 'analytics' },
            { label: 'API Access', value: 'api' },
            { label: 'Custom Certificates', value: 'certificates' },
            { label: 'White Label', value: 'white-label' }
          ]
        }
      ]
    },
    {
      name: 'usage',
      type: 'group',
      fields: [
        { name: 'usersCount', type: 'number', defaultValue: 0 },
        { name: 'storageUsed', type: 'number', defaultValue: 0 },
        { name: 'lastActivity', type: 'date' }
      ]
    }
  ],
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  }
};

export default Tenants;
