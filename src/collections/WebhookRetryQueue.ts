import { CollectionConfig } from 'payload';

export const WebhookRetryQueue: CollectionConfig = {
  slug: 'webhook-retry-queue',
  admin: {
    useAsTitle: 'eventId',
    defaultColumns: ['eventId', 'eventType', 'status', 'retryCount', 'nextRetryAt'],
    description: 'File de réessai pour les webhooks Stripe échoués',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'eventId',
      label: 'Event ID',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Identifiant unique de l\'événement Stripe',
      },
    },
    {
      name: 'eventType',
      label: 'Type d\'événement',
      type: 'text',
      required: true,
      admin: {
        description: 'Type d\'événement webhook (ex: customer.subscription.created)',
      },
    },
    {
      name: 'payload',
      label: 'Payload',
      type: 'json',
      required: true,
      admin: {
        description: 'Données complètes de l\'événement webhook',
      },
    },
    {
      name: 'retryCount',
      label: 'Nombre de réessais',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Nombre de fois que le traitement a été tenté',
      },
    },
    {
      name: 'maxRetries',
      label: 'Réessais maximum',
      type: 'number',
      defaultValue: 3,
      admin: {
        description: 'Nombre maximum de réessais avant échec définitif',
      },
    },
    {
      name: 'lastError',
      label: 'Dernière erreur',
      type: 'textarea',
      admin: {
        description: 'Message d\'erreur du dernier échec de traitement',
      },
    },
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { label: 'En attente', value: 'pending' },
        { label: 'En cours', value: 'processing' },
        { label: 'Réussi', value: 'success' },
        { label: 'Échec définitif', value: 'failed' },
      ],
      defaultValue: 'pending',
      admin: {
        description: 'Statut actuel du traitement',
      },
    },
    {
      name: 'nextRetryAt',
      label: 'Prochain réessai',
      type: 'date',
      admin: {
        description: 'Date et heure du prochain réessai',
      },
    },
  ],
  timestamps: true,
};

export default WebhookRetryQueue;
