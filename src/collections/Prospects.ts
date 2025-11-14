import type { CollectionConfig } from 'payload';
import { upsertProspectHandler } from '../endpoints/prospects/upsertProspect';

export const ProspectStatusOptions: { value: ProspectStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'payment_in_progress', label: 'Paiement en cours' },
  { value: 'ready_for_password', label: 'En attente du mot de passe' },
  { value: 'payment_failed', label: 'Paiement échoué' },
  { value: 'converted', label: 'Converti' },
  { value: 'abandoned', label: 'Abandonné' },
];

export type ProspectStatus =
  | 'pending'
  | 'payment_in_progress'
  | 'ready_for_password'
  | 'payment_failed'
  | 'converted'
  | 'abandoned';

export const Prospects: CollectionConfig = {
  slug: 'prospects',
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: ({ req }) => Boolean(req.user),
    admin: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['email', 'firstName', 'lastName', 'status', 'billingCycle'],
    useAsTitle: 'email',
  },
  timestamps: true,
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'billingCycle',
      type: 'select',
      options: [
        { label: 'Mensuel', value: 'monthly' },
        { label: 'Annuel', value: 'yearly' },
      ],
      defaultValue: 'yearly',
    },
    {
      name: 'selectedPrice',
      type: 'number',
      min: 0,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: ProspectStatusOptions,
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
    },
    {
      name: 'checkoutSessionId',
      type: 'text',
    },
    {
      name: 'subscriptionId',
      type: 'text',
    },
    {
      name: 'utmSource',
      type: 'text',
    },
    {
      name: 'utmMedium',
      type: 'text',
    },
    {
      name: 'utmCampaign',
      type: 'text',
    },
    {
      name: 'metadata',
      type: 'json',
    },
    {
      name: 'lastPaymentAttemptAt',
      type: 'date',
    },
    {
      name: 'attemptCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'lastCompletionReminderSentAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
  endpoints: [
    {
      path: '/upsert',
      method: 'post',
      handler: upsertProspectHandler,
    },
  ],
};
