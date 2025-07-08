/**
 * Collection SystemMetrics
 * ------------------------
 * Cette collection permet de suivre des métriques système ou d’usage :
 * - Logs techniques
 * - Statistiques d’utilisation
 * - Suivi des quotas (stockage, utilisateurs, etc.)
 * - Incidents ou événements particuliers
 *
 * Accessible uniquement aux superadmins pour supervision et audit.
 */

import { CollectionConfig } from 'payload';

const SLUG = 'system-metrics' as const;

export const SystemMetrics: CollectionConfig = {
  slug: SLUG,
  admin: {
    useAsTitle: 'timestamp',
    defaultColumns: ['timestamp', 'type', 'value']
  },
  access: {
    read: ({ req: { user } }) => user?.role === 'superadmin',
    create: ({ req: { user } }) => user?.role === 'superadmin',
    update: ({ req: { user } }) => user?.role === 'superadmin',
    delete: ({ req: { user } }) => user?.role === 'superadmin',
  },
  fields: [
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      defaultValue: () => new Date(),
      admin: { description: 'Date de la mesure' }
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Usage', value: 'usage' },
        { label: 'Quota', value: 'quota' },
        { label: 'Incident', value: 'incident' },
        { label: 'Custom', value: 'custom' }
      ]
    },
    {
      name: 'value',
      type: 'number',
      required: true,
      admin: { description: 'Valeur numérique de la métrique' }
    },
    {
      name: 'description',
      type: 'textarea',
      required: false
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: false
    },
    {
      name: 'details',
      type: 'json',
      required: false,
      admin: { description: 'Détails additionnels (objet JSON libre)' }
    }
  ]
};

export default SystemMetrics;
