import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { slugField } from '@/fields/slug'

import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
  },
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  // Note: Database indexes for performance will be created in migration task 9.2
  // Required indexes: parentCategory, level, adaptiveSettings.isActive
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    ...slugField(),
    {
      name: 'parentCategory',
      label: 'Catégorie parent',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      admin: {
        description: 'Catégorie parent pour hiérarchie'
      }
    },
    {
      name: 'level',
      label: 'Niveau d\'études',
      type: 'select',
      required: true,
      defaultValue: 'both',
      options: [
        { label: 'PASS uniquement', value: 'PASS' },
        { label: 'LAS uniquement', value: 'LAS' },
        { label: 'PASS et LAS', value: 'both' }
      ],
      admin: {
        description: 'Niveau d\'études ciblé par cette catégorie'
      }
    },
    {
      name: 'adaptiveSettings',
      label: 'Paramètres adaptatifs',
      type: 'group',
      admin: {
        description: 'Configuration pour les quiz adaptatifs'
      },
      fields: [
        {
          name: 'isActive',
          label: 'Actif pour quiz adaptatifs',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Inclure cette catégorie dans l\'analyse adaptative'
          }
        },
        {
          name: 'minimumQuestions',
          label: 'Nombre minimum de questions',
          type: 'number',
          defaultValue: 5,
          admin: {
            description: 'Nombre minimum de questions requises pour l\'analyse'
          }
        },
        {
          name: 'weight',
          label: 'Poids dans l\'algorithme',
          type: 'number',
          defaultValue: 1,
          min: 0.1,
          max: 3,
          admin: {
            description: 'Poids dans l\'algorithme de sélection (1 = normal)'
          }
        }
      ]
    }
  ],
}
