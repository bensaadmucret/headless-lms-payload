import type { CollectionConfig } from 'payload';

import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';

export const Badges: CollectionConfig = {
  slug: 'badges',
  labels: {
    singular: 'Badge',
    plural: 'Badges',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'isActive', 'roleVisibility'],
    description: 'Badges attribuables aux utilisateurs (progression, réussite, etc.)',
  },
  access: {
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
    read: () => true,
  },
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  fields: [
    {
      name: 'name',
      label: 'Nom du badge',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        placeholder: 'Ex : Fin de cours, Quiz Master, etc.',
      },
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      admin: {
        placeholder: 'Explique la signification du badge.'
      }
    },
    {
      name: 'icon',
      label: 'Icône',
      type: 'upload',
      relationTo: 'media',
      required: false,
      admin: {
        description: 'Icône ou image représentative du badge.'
      }
    },
    {
      name: 'criteria',
      label: "Critères d'obtention",
      type: 'richText',
      required: false,
      admin: {
        description: 'Décris comment obtenir ce badge.'
      }
    },
    {
      name: 'roleVisibility',
      label: 'Visibilité pour rôles',
      type: 'select',
      hasMany: true,
      required: false,
      options: [

        { label: 'Admin', value: 'admin' },

        { label: 'Étudiant', value: 'student' },
      ],
      admin: {
        description: 'Définit quels rôles peuvent voir ou obtenir ce badge.'
      }
    },
    {
      name: 'isActive',
      label: 'Actif',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Permet de désactiver un badge sans le supprimer.'
      }
    }
  ]
};


