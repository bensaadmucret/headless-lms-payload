import { CollectionConfig } from 'payload';
import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';
import { payloadIsSuperAdmin } from '../access/payloadAccess';

const SLUG = 'subscriptions' as const;

// Helper d'accès: accepte superadmin via session, via API Key (adapter), ou via fallback entête + env
const isSuperadminS2S = async ({ req }: { req: any }): Promise<boolean> => {
  // 1) Session utilisateur
  const userRole = req?.user?.role as string | undefined;
  if (userRole === 'superadmin') return true;

  // Helpers headers
  const getHeader = (name: string): string | null => {
    try {
      const h = req?.headers;
      if (h && typeof h.get === 'function') return h.get(name);
      if (h && typeof h[name] === 'string') return h[name];
    } catch {}
    return null;
  };
  const extractTokenFromHeaders = (): string | null => {
    const auth = getHeader('authorization');
    if (auth) {
      // Formats supportés: "users API-Key <TOKEN>" ou "API-Key <TOKEN>"
      const parts = auth.trim().split(/\s+/);
      if (parts.length >= 2) {
        const maybeToken = parts[parts.length - 1];
        if (maybeToken) return maybeToken;
      }
    }
    const xPayload = getHeader('x-payload-api-key');
    if (xPayload && typeof xPayload === 'string') return xPayload.trim();
    return null;
  };

  // 2) API Key via adapter Payload (si peuplé)
  const apiKey = req?.apiKey as any;
  if (apiKey?.user) {
    let role: string | undefined;
    if (typeof apiKey.user === 'string') {
      try {
        const u = await req.payload.findByID({ collection: 'users', id: apiKey.user });
        role = u?.role as string | undefined;
      } catch (_e) {
        // ignore, on tentera le fallback
      }
    } else {
      role = (apiKey.user as any)?.role as string | undefined;
    }
    if (role === 'superadmin') return true;
  }

  // 3) Fallback S2S: comparaison entête vs secret serveur
  const headerToken = extractTokenFromHeaders();
  const expected = process.env.PAYLOAD_SUPERADMIN_API_KEY;
  if (headerToken && expected && headerToken === expected) {
    return true;
  }

  // 4) Sinon, refus
  return false;
};

export const Subscriptions: CollectionConfig = {
  slug: SLUG,
  admin: {
    useAsTitle: 'subscriptionId',
    defaultColumns: ['user', 'status', 'subscriptionId', 'currentPeriodEnd', 'updatedAt'],
    description: 'Instances d’abonnements (Paddle) rattachées aux utilisateurs.'
  },
  access: {
    // Autoriser superadmin via session utilisateur OU via API Key (req.apiKey), en chargeant l'user si nécessaire
    read: isSuperadminS2S,
    create: isSuperadminS2S,
    update: isSuperadminS2S,
    delete: isSuperadminS2S,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      defaultValue: 'paddle',
      options: [
        { label: 'Paddle', value: 'paddle' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'customerId',
      label: 'Paddle Customer ID',
      type: 'text',
      admin: { description: 'Identifiant client Paddle (customer_id)' },
    },
    {
      name: 'subscriptionId',
      label: 'Paddle Subscription ID',
      type: 'text',
      required: true,
      unique: true,
      admin: { position: 'sidebar', description: 'Identifiant d’abonnement (subscription_id) unique' },
    },
    {
      name: 'productId',
      label: 'Paddle Product ID',
      type: 'text',
    },
    {
      name: 'priceId',
      label: 'Paddle Price ID',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Trialing', value: 'trialing' },
        { label: 'Active', value: 'active' },
        { label: 'Past due', value: 'past_due' },
        { label: 'Canceled', value: 'canceled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'trialEnd',
      type: 'date',
      admin: { description: 'Fin de période d’essai' },
    },
    {
      name: 'currentPeriodEnd',
      type: 'date',
      admin: { description: 'Fin de la période de facturation en cours' },
    },
    {
      name: 'cancelAtPeriodEnd',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Annulation à la fin de la période en cours' },
    },
    {
      name: 'lastPaymentAt',
      type: 'date',
    },
    {
      name: 'amount',
      type: 'number',
      admin: { description: 'Montant en plus petite unité (ex: centimes)' },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'EUR',
    },
    {
      name: 'history',
      type: 'array',
      labels: { singular: 'Événement', plural: 'Événements' },
      admin: { description: 'Historique des événements Paddle liés à cet abonnement' },
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'subscription_created', value: 'subscription_created' },
            { label: 'payment_succeeded', value: 'payment_succeeded' },
            { label: 'subscription_updated', value: 'subscription_updated' },
            { label: 'payment_failed', value: 'payment_failed' },
            { label: 'subscription_canceled', value: 'subscription_canceled' },
          ],
          required: true,
        },
        {
          name: 'occurredAt',
          type: 'date',
          required: true,
        },
        {
          name: 'raw',
          type: 'json',
          admin: { description: 'Payload d’événement (sanitisé/tronqué si nécessaire)' },
        },
      ],
    },
    {
      name: 'metadata',
      type: 'json',
      admin: { description: 'Clés/valeurs additionnelles (optionnel)' },
    },
  ],
  hooks: {
    afterChange: [logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  timestamps: true,
};

export default Subscriptions;
