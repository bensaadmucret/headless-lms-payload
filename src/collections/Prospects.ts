import { CollectionConfig } from 'payload';
import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';
import { payloadIsAdminOrSuperAdmin, payloadIsAnyone } from '../access/payloadAccess';

const SLUG = 'prospects' as const;

const Prospects: CollectionConfig = {
  slug: SLUG,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'status', 'createdAt'],
    description: "Prospects collectés avant le paiement (leads en attente de conversion).",
  },
  access: {
    read: payloadIsAdminOrSuperAdmin,
    create: payloadIsAnyone,
    update: payloadIsAnyone,
    delete: payloadIsAdminOrSuperAdmin,
  },
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
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Étudiant', value: 'student' },
      ],
      defaultValue: 'student',
      required: true,
    },
    {
      name: 'billingCycle',
      type: 'select',
      options: [
        { label: 'Mensuel', value: 'monthly' },
        { label: 'Annuel', value: 'yearly' },
      ],
    },
    {
      name: 'selectedPrice',
      type: 'number',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'En attente', value: 'pending' },
        { label: 'Payé', value: 'paid' },
        { label: 'Expiré', value: 'expired' },
        { label: 'Abandonné', value: 'abandoned' },
      ],
      required: true,
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      admin: {
        description: 'Identifiant Stripe Customer associé à ce prospect (optionnel).',
      },
    },
    {
      name: 'stripeCheckoutSessionId',
      type: 'text',
      admin: {
        description: 'Dernière session Stripe Checkout créée pour ce prospect (optionnel).',
      },
    },
    {
      name: 'userCreated',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: "Indique si un utilisateur Payload a été créé à partir de ce prospect.",
      },
    },
    {
      name: 'createdUser',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: "Utilisateur Payload lié après conversion (optionnel).",
        position: 'sidebar',
      },
    },
    {
      name: 'campaign',
      type: 'group',
      admin: {
        description: 'Paramètres de campagne (UTM) optionnels.',
      },
      fields: [
        { name: 'utm_source', type: 'text' },
        { name: 'utm_medium', type: 'text' },
        { name: 'utm_campaign', type: 'text' },
      ],
    },
  ],
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  timestamps: true,
};

export default Prospects;
