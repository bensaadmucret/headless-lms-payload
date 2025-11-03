import type { CollectionConfig } from 'payload';

const AuditLogs: CollectionConfig = {
  slug: 'auditlogs',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'user', 'collection', 'timestamp'],
    description: 'Historique des modifications et actions importantes du système.'
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: () => true, // Permettre au système (via les hooks) de créer des logs
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'user',
      label: 'Utilisateur',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'action',
      label: 'Action',
      type: 'text',
      required: true,
    },
    {
      name: 'collection',
      label: 'Collection',
      type: 'text',
      required: true,
    },
    {
      name: 'documentId',
      label: 'ID du document',
      type: 'text',
      required: false,
    },
    {
      name: 'diff',
      label: 'Différence',
      type: 'json',
      required: false,
      admin: {
        description: 'Contient l’état avant/après si pertinent.'
      }
    },
    {
      name: 'timestamp',
      label: 'Horodatage',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
      admin: {
        position: 'sidebar',
      }
    }
  ]
};

export default AuditLogs;
