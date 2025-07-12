import type { CollectionConfig } from 'payload';

import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';

export const Courses: CollectionConfig = {
  slug: 'courses',
  admin: {
    useAsTitle: 'title',
  },
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  access: {
    read: ({ req }) => {
      // Les administrateurs peuvent tout voir
      if (req.user?.role === 'admin' || req.user?.role === 'superadmin') return true;
      
      // Les utilisateurs authentifiés peuvent voir les cours publiés
      if (req.user) {
        return {
          published: { equals: true }
        };
      }
      
      // Les utilisateurs non authentifiés ne peuvent rien voir
      return false;
    },
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'superadmin',
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'superadmin',
    delete: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'superadmin',
  },
  fields: [
    // La relation inverse sera gérée manuellement dans les requêtes GraphQL
    // pour éviter les problèmes de boucle infinie et de performances
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'level',
      type: 'select',
      options: [
        { label: 'Débutant', value: 'beginner' },
        { label: 'Intermédiaire', value: 'intermediate' },
        { label: 'Avancé', value: 'advanced' },
      ],
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Publié',
      defaultValue: false,
    },
    {
      name: 'tags',
      type: 'text',
      required: false,
    },
    {
      name: 'duration',
      type: 'text',
      required: false,
      label: 'Durée',
    },
  ],
};


