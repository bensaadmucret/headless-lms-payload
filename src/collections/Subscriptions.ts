import { CollectionConfig, CollectionAfterChangeHook } from 'payload';
import { logAuditAfterChange, logAuditAfterDelete } from './logAudit';
import { syncUserSubscription } from '../utils/stripe/subscriptionSync';

const SLUG = 'subscriptions' as const;

// Hook pour synchroniser automatiquement l'utilisateur après changement d'abonnement
const syncUserAfterChange: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  // Ne synchroniser que lors de la création ou mise à jour
  if (operation === 'create' || operation === 'update') {
    try {
      await syncUserSubscription(doc, req.payload);
    } catch (error) {
      // Logger l'erreur mais ne pas bloquer l'opération
      req.payload.logger.error('[Subscriptions Hook] Échec de synchronisation utilisateur', error);
    }
  }
  return doc;
};

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
    defaultColumns: ['user', 'provider', 'status', 'subscriptionId', 'currentPeriodEnd', 'updatedAt'],
    description: 'Instances d\'abonnements (Stripe/Paddle) rattachées aux utilisateurs.',
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
      defaultValue: 'stripe',
      options: [
        { label: 'Paddle', value: 'paddle' },
        { label: 'Stripe', value: 'stripe' },
      ],
      admin: { 
        position: 'sidebar',
        description: 'Fournisseur de paiement (Stripe par défaut)',
      },
    },
    {
      name: 'customerId',
      label: 'Customer ID',
      type: 'text',
      admin: { 
        description: 'Identifiant client du fournisseur (Stripe Customer ID ou Paddle Customer ID)',
      },
    },
    {
      name: 'subscriptionId',
      label: 'Subscription ID',
      type: 'text',
      required: true,
      unique: true,
      admin: { 
        position: 'sidebar', 
        description: 'Identifiant d\'abonnement unique du fournisseur',
      },
    },
    {
      name: 'priceId',
      label: 'Price ID',
      type: 'text',
      admin: {
        description: 'Identifiant du prix du fournisseur',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Essai gratuit', value: 'trialing' },
        { label: 'Actif', value: 'active' },
        { label: 'Paiement en retard', value: 'past_due' },
        { label: 'Annulé', value: 'canceled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'trialEnd',
      type: 'date',
      admin: { description: 'Fin de période d\'essai' },
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
      admin: { description: 'Date du dernier paiement réussi' },
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
      admin: { description: 'Devise (EUR par défaut)' },
    },
    {
      name: 'history',
      type: 'array',
      labels: { singular: 'Événement', plural: 'Événements' },
      admin: { description: 'Historique des événements webhook liés à cet abonnement' },
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Abonnement créé', value: 'subscription_created' },
            { label: 'Paiement réussi', value: 'payment_succeeded' },
            { label: 'Abonnement mis à jour', value: 'subscription_updated' },
            { label: 'Paiement échoué', value: 'payment_failed' },
            { label: 'Abonnement annulé', value: 'subscription_canceled' },
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
          admin: { description: 'Payload d\'événement (sanitisé/tronqué si nécessaire)' },
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
    afterChange: [syncUserAfterChange, logAuditAfterChange],
    afterDelete: [logAuditAfterDelete],
  },
  timestamps: true,
};

export default Subscriptions;
