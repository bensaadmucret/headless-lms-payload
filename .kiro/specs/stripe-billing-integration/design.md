# Document de Conception

## Vue d'Ensemble

Cette conception implémente une intégration Stripe Billing sécurisée et prête pour la production pour le système d'abonnement destiné aux étudiants en médecine français. L'architecture suit un modèle de sécurité piloté par le serveur où les opérations sensibles (création de session checkout, vérification de webhook, gestion des abonnements) se produisent sur le backend, tandis que le frontend gère l'interaction utilisateur et le flux de paiement.

L'implémentation comble les lacunes actuelles :
- Pas d'intégration de paiement → Stripe Checkout complet avec essai gratuit de 30 jours
- Pas de gestion d'abonnement → Synchronisation complète du cycle de vie des abonnements
- Pas de portail client → Accès au portail Stripe pour gestion autonome
- Pas de traitement webhook → Vérification sécurisée et traitement des événements

## Architecture

### Flux de Haut Niveau

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Dashboard App  │────────▶│   Payload CMS    │────────▶│   Stripe    │
│   (Frontend)    │         │    (Backend)     │         │     API     │
└─────────────────┘         └──────────────────┘         └─────────────┘
       │                            │                            │
       │ 1. Demande checkout        │                            │
       │───────────────────────────▶│                            │
       │                            │ 2. Créer Customer/Session  │
       │                            │───────────────────────────▶│
       │                            │◀───────────────────────────│
       │◀───────────────────────────│ 3. Retourner URL checkout  │
       │                            │                            │
       │ 4. Redirection checkout    │                            │
       │───────────────────────────────────────────────────────▶│
       │                            │                            │
       │ 5. Paiement complété       │                            │
       │◀───────────────────────────────────────────────────────│
       │                            │                            │
       │                            │ 6. Événements webhook      │
       │                            │◀───────────────────────────│
       │                            │                            │
       │ 7. Récupérer abonnement    │                            │
       │───────────────────────────▶│                            │
       │◀───────────────────────────│                            │
```

### Architecture des Composants

#### Backend (Payload CMS)

```
src/
├── services/
│   └── stripe/
│       ├── StripeClient.ts              # Wrapper API Stripe
│       ├── StripeCheckoutService.ts     # Création de sessions checkout
│       ├── StripeWebhookService.ts      # Vérification & traitement webhook
│       └── StripePortalService.ts       # Création de sessions portail
├── endpoints/
│   └── stripe/
│       ├── checkout-session.ts          # POST /api/stripe/checkout-session
│       ├── webhook.ts                   # POST /api/stripe/webhook
│       ├── portal-session.ts            # POST /api/stripe/portal-session
│       └── subscription.ts              # GET /api/me/subscription
├── collections/
│   ├── Subscriptions.ts                 # Amélioré avec sync webhook
│   └── Users/index.ts                   # Amélioré avec champs abonnement
└── utils/
    └── stripe/
        ├── webhookSignature.ts          # Vérification de signature
        └── subscriptionSync.ts          # Synchronisation user-subscription
```

#### Frontend (Dashboard App)

```
src/
├── services/
│   ├── stripeService.ts                 # Initialisation Stripe.js
│   ├── stripeCheckoutService.ts         # Création de session checkout
│   ├── stripePortalService.ts           # Gestion du portail
│   └── api/
│       └── subscriptionApi.ts           # Récupération données abonnement
├── components/
│   └── subscription/
│       ├── Step3_Payment.tsx            # Amélioré avec Stripe Checkout
│       ├── ManageSubscriptionButton.tsx # Nouveau: accès portail
│       └── SubscriptionStatus.tsx       # Nouveau: affichage statut
└── hooks/
    └── useSubscription.ts               # Amélioré avec logique refresh
```

## Composants et Interfaces

### Services Backend

#### StripeClient

Client API Stripe centralisé avec configuration selon l'environnement.

```typescript
interface StripeClientConfig {
  secretKey: string;
  webhookSecret: string;
}

class StripeClient {
  private stripe: Stripe;
  
  constructor(config: StripeClientConfig);
  
  getStripe(): Stripe;
  isTestMode(): boolean;
}
```

#### StripeCheckoutService

Crée des sessions Stripe Checkout pour les abonnements.

```typescript
interface CheckoutSessionRequest {
  userId: string;
  priceId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

class StripeCheckoutService {
  constructor(private client: StripeClient, private payload: Payload);
  
  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<CheckoutSessionResponse>;
  
  private async getOrCreateCustomer(userId: string, email: string): Promise<string>;
}
```

**Implémentation:**
- Récupère ou crée un Stripe Customer pour l'utilisateur
- Crée une Checkout Session avec le priceId sélectionné
- Configure l'essai gratuit de 30 jours (trial_period_days: 30)
- Définit les URLs de succès et d'annulation
- Stocke le userId dans les metadata de la session
- Retourne l'URL de checkout pour redirection

#### StripeWebhookService

Traite les événements webhook Stripe entrants avec vérification de signature.

```typescript
interface WebhookEvent {
  type: string;
  data: {
    object: any;
  };
  created: number;
}

interface WebhookProcessingResult {
  success: boolean;
  eventType: string;
  subscriptionId?: string;
  error?: string;
}

class StripeWebhookService {
  constructor(
    private client: StripeClient,
    private payload: Payload
  );
  
  verifySignature(body: string, signature: string): Stripe.Event;
  async processEvent(event: WebhookEvent): Promise<WebhookProcessingResult>;
  
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void>;
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void>;
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void>;
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void>;
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void>;
}
```

**Gestionnaires d'Événements:**

1. **customer.subscription.created**
   - Extraire: subscriptionId, customerId, status, priceId, currentPeriodEnd, trialEnd
   - Trouver l'utilisateur via l'email du customer Stripe
   - Créer un enregistrement Subscription lié à l'utilisateur
   - Définir le statut à 'trialing' si en période d'essai
   - Ajouter l'événement au tableau d'historique

2. **invoice.payment_succeeded**
   - Trouver la Subscription par subscriptionId
   - Mettre à jour le statut à 'active'
   - Mettre à jour lastPaymentAt, amount, currency
   - Mettre à jour currentPeriodEnd avec la prochaine date de facturation
   - Synchroniser les champs plan et subscriptionStatus de l'utilisateur
   - Ajouter l'événement à l'historique

3. **customer.subscription.updated**
   - Trouver la Subscription par subscriptionId
   - Mettre à jour les champs: status, priceId, currentPeriodEnd, cancelAtPeriodEnd
   - Synchroniser les champs utilisateur si le statut a changé
   - Ajouter l'événement à l'historique

4. **customer.subscription.deleted**
   - Trouver la Subscription par subscriptionId
   - Mettre à jour le statut à 'canceled'
   - Mettre à jour le plan utilisateur à 'free', subscriptionStatus à 'canceled'
   - Ajouter l'événement à l'historique

5. **invoice.payment_failed**
   - Trouver la Subscription par subscriptionId
   - Mettre à jour le statut à 'past_due'
   - Mettre à jour le subscriptionStatus utilisateur à 'past_due'
   - Ajouter l'événement à l'historique

#### StripePortalService

Crée des sessions de portail client pour la gestion des abonnements.

```typescript
interface PortalSessionRequest {
  customerId: string;
  returnUrl: string;
}

interface PortalSessionResponse {
  url: string;
}

class StripePortalService {
  constructor(private client: StripeClient);
  
  async createPortalSession(
    request: PortalSessionRequest
  ): Promise<PortalSessionResponse>;
}
```

### Endpoints Backend

#### POST /api/stripe/checkout-session

Crée une session Stripe Checkout pour l'abonnement.

**Request:**
```typescript
{
  priceId: string;  // 'monthly' ou 'yearly'
}
```

**Response:**
```typescript
{
  sessionId: string;
  url: string;
}
```

**Erreurs:**
- 401: Non autorisé (pas de session valide)
- 400: priceId invalide
- 500: Échec de création de session

**Implémentation:**
- Vérifier l'authentification utilisateur
- Mapper priceId ('monthly'/'yearly') vers le Stripe Price ID réel
- Appeler StripeCheckoutService.createCheckoutSession
- Retourner l'URL de checkout

#### POST /api/stripe/webhook

Reçoit et traite les événements webhook Stripe.

**Request Headers:**
- `Stripe-Signature`: Signature webhook pour vérification

**Request Body:**
```typescript
{
  type: string;
  data: {
    object: any;
  };
  created: number;
}
```

**Response:**
- 200: Événement traité avec succès
- 400: Signature invalide ou format d'événement invalide
- 500: Erreur de traitement

**Sécurité:**
- Vérifier l'en-tête Stripe-Signature en utilisant le webhook secret
- Rejeter les requêtes avec signatures invalides
- Logger toutes les tentatives de webhook avec statut de traitement
- Traiter de manière asynchrone si possible, retourner 200 rapidement

#### POST /api/stripe/portal-session

Crée une session de portail client Stripe.

**Request:**
```typescript
{
  returnUrl: string;
}
```

**Response:**
```typescript
{
  url: string;
}
```

**Erreurs:**
- 401: Non autorisé
- 404: Abonnement non trouvé
- 403: L'abonnement n'appartient pas à l'utilisateur
- 500: Échec de création de session portail

**Implémentation:**
- Vérifier l'authentification utilisateur
- Récupérer l'abonnement de l'utilisateur depuis la base de données
- Vérifier que l'utilisateur possède l'abonnement
- Appeler StripePortalService.createPortalSession
- Retourner l'URL du portail

#### GET /api/me/subscription

Retourne les données d'abonnement de l'utilisateur actuel.

**Response:**
```typescript
{
  subscription: {
    id: string;
    status: 'trialing' | 'active' | 'past_due' | 'canceled';
    plan: 'free' | 'premium';
    currentPeriodEnd: string;
    trialEnd: string | null;
    cancelAtPeriodEnd: boolean;
    customerId: string;
  } | null;
}
```

**Implémentation:**
- Vérifier l'authentification utilisateur
- Récupérer l'enregistrement Subscription de l'utilisateur
- Retourner les données d'abonnement ou null si aucun abonnement

### Services Frontend

#### stripeService.ts

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripeInstance: Stripe | null = null;

async function initStripe(): Promise<Stripe> {
  if (stripeInstance) {
    return stripeInstance;
  }

  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    throw new Error('VITE_STRIPE_PUBLISHABLE_KEY non configurée');
  }

  stripeInstance = await loadStripe(publishableKey);
  
  if (!stripeInstance) {
    throw new Error('Échec d\'initialisation de Stripe');
  }

  return stripeInstance;
}

export { initStripe };
```

#### stripeCheckoutService.ts

```typescript
interface CheckoutOptions {
  priceId: 'monthly' | 'yearly';
}

async function createCheckoutSession(
  options: CheckoutOptions
): Promise<void> {
  const response = await fetch('/api/stripe/checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId: options.priceId }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Échec de création de session checkout');
  }

  const { url } = await response.json();
  window.location.href = url;
}

export { createCheckoutSession };
```

#### stripePortalService.ts

```typescript
async function openCustomerPortal(returnUrl: string): Promise<void> {
  const response = await fetch('/api/stripe/portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnUrl }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Échec d\'ouverture du portail');
  }

  const { url } = await response.json();
  window.open(url, '_blank');
}

export { openCustomerPortal };
```

#### subscriptionApi.ts

```typescript
interface SubscriptionData {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

async function fetchCurrentSubscription(): Promise<SubscriptionData | null> {
  const response = await fetch('/api/me/subscription', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Échec de récupération de l\'abonnement');
  }

  const { subscription } = await response.json();
  return subscription;
}

export { fetchCurrentSubscription };
```

### Composants Frontend

#### Step3_Payment.tsx Amélioré

**Changements:**
1. Remplacer l'intégration Paddle par Stripe Checkout
2. Appeler `createCheckoutSession` avec le priceId sélectionné
3. Rediriger vers Stripe Checkout (géré par Stripe)
4. Gérer les erreurs avec messages conviviaux

```typescript
const handleStripeCheckout = async () => {
  setIsProcessing(true);
  
  try {
    await createCheckoutSession({
      priceId: formData.billingCycle === 'yearly' ? 'yearly' : 'monthly'
    });
  } catch (error) {
    console.error('Erreur checkout:', error);
    toast.error('Erreur lors de l\'initialisation du paiement');
  } finally {
    setIsProcessing(false);
  }
};
```

#### CheckoutSuccess.tsx (Nouveau)

Page affichée après un checkout réussi.

```typescript
function CheckoutSuccess() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const data = await fetchCurrentSubscription();
        setSubscription(data);
      } catch (error) {
        console.error('Erreur chargement abonnement:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadSubscription();
  }, []);

  return (
    <div>
      <h1>Paiement réussi !</h1>
      <p>Votre abonnement premium est maintenant actif.</p>
      {subscription && (
        <div>
          <p>Statut: {subscription.status}</p>
          <p>Prochaine facturation: {subscription.currentPeriodEnd}</p>
        </div>
      )}
    </div>
  );
}
```

#### ManageSubscriptionButton.tsx (Nouveau)

```typescript
interface ManageSubscriptionButtonProps {
  className?: string;
}

function ManageSubscriptionButton({ className }: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await openCustomerPortal(window.location.href);
    } catch (error) {
      console.error('Erreur ouverture portail:', error);
      toast.error('Impossible d\'ouvrir le portail de gestion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? 'Chargement...' : 'Gérer mon abonnement'}
    </button>
  );
}
```

#### SubscriptionStatus.tsx (Nouveau)

Affiche le statut d'abonnement de l'utilisateur.

```typescript
function SubscriptionStatus() {
  const { subscription, loading } = useSubscription();

  if (loading) return <div>Chargement...</div>;
  if (!subscription) return <div>Aucun abonnement actif</div>;

  return (
    <div className="subscription-status">
      <h3>Mon Abonnement</h3>
      <div>
        <span>Plan: {subscription.plan === 'premium' ? 'Premium' : 'Gratuit'}</span>
        <span>Statut: {getStatusLabel(subscription.status)}</span>
      </div>
      
      {subscription.status === 'trialing' && subscription.trialEnd && (
        <p>Essai gratuit jusqu'au {formatDate(subscription.trialEnd)}</p>
      )}
      
      {subscription.status === 'active' && (
        <p>Prochaine facturation: {formatDate(subscription.currentPeriodEnd)}</p>
      )}
      
      {subscription.cancelAtPeriodEnd && (
        <p className="warning">
          Votre abonnement sera annulé le {formatDate(subscription.currentPeriodEnd)}
        </p>
      )}
      
      {subscription.status === 'past_due' && (
        <div className="alert">
          <p>Votre paiement a échoué. Veuillez mettre à jour votre moyen de paiement.</p>
          <ManageSubscriptionButton />
        </div>
      )}
      
      {['active', 'trialing'].includes(subscription.status) && (
        <ManageSubscriptionButton className="mt-4" />
      )}
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels = {
    trialing: 'Essai gratuit',
    active: 'Actif',
    past_due: 'Paiement en retard',
    canceled: 'Annulé',
  };
  return labels[status] || status;
}
```

## Modèles de Données

### Collection Subscriptions Améliorée

**Champs existants maintenus, synchronisation webhook ajoutée via hooks:**

```typescript
// Pas de changements de schéma nécessaires - les champs existants supportent toutes les exigences
// Ajouter des hooks pour la synchronisation webhook
hooks: {
  afterChange: [
    async ({ doc, operation, req }) => {
      // Synchroniser les champs utilisateur quand le statut d'abonnement change
      if (operation === 'update') {
        await syncUserSubscription(doc, req.payload);
      }
    }
  ]
}
```

**Champs clés:**
- `provider`: 'stripe' (au lieu de 'paddle')
- `customerId`: Stripe Customer ID
- `subscriptionId`: Stripe Subscription ID
- `status`: 'trialing' | 'active' | 'past_due' | 'canceled'
- `priceId`: Stripe Price ID
- `currentPeriodEnd`: Date de fin de période actuelle
- `trialEnd`: Date de fin d'essai (si applicable)
- `cancelAtPeriodEnd`: Boolean
- `lastPaymentAt`: Date du dernier paiement
- `amount`: Montant en centimes
- `currency`: 'eur'
- `history`: Tableau d'événements webhook

### Collection Users Améliorée

**Ajouter des champs liés à l'abonnement:**

```typescript
{
  name: 'plan',
  type: 'select',
  options: [
    { label: 'Gratuit', value: 'free' },
    { label: 'Premium', value: 'premium' }
  ],
  defaultValue: 'free',
  admin: { position: 'sidebar' }
},
{
  name: 'subscriptionStatus',
  type: 'select',
  options: [
    { label: 'Aucun', value: 'none' },
    { label: 'Essai gratuit', value: 'trialing' },
    { label: 'Actif', value: 'active' },
    { label: 'Paiement en retard', value: 'past_due' },
    { label: 'Annulé', value: 'canceled' }
  ],
  defaultValue: 'none',
  admin: { position: 'sidebar' }
},
{
  name: 'subscriptionEndDate',
  type: 'date',
  admin: { 
    position: 'sidebar',
    description: 'Date de fin de la période d\'abonnement actuelle'
  }
},
{
  name: 'stripeCustomerId',
  type: 'text',
  admin: {
    position: 'sidebar',
    description: 'ID du client Stripe',
    readOnly: true
  }
}
```

### Schéma d'Historique des Événements Webhook

**Déjà défini dans la collection Subscriptions:**

```typescript
history: [
  {
    type: 'subscription_created' | 'payment_succeeded' | 'subscription_updated' | 'subscription_deleted' | 'payment_failed',
    occurredAt: Date,
    raw: JSON // Payload d'événement sanitisé
  }
]
```

## Gestion des Erreurs

### Gestion des Erreurs Backend

**Création de Session Checkout:**
- Erreurs API Stripe → Logger l'erreur, retourner 500 avec message générique
- Erreurs réseau → Réessayer une fois, puis retourner 500
- Identifiants invalides → Logger erreur critique, retourner 500
- Utilisateur non trouvé → Retourner 404

**Traitement Webhook:**
- Signature invalide → Retourner 400, logger avertissement de sécurité
- Type d'événement inconnu → Retourner 200 (acquitter), logger avertissement
- Erreurs base de données → Retourner 500, mettre l'événement en file pour réessai
- Utilisateur non trouvé → Logger avertissement, mettre l'événement en file pour réessai

**Session Portail:**
- Abonnement non trouvé → Retourner 404
- Erreur API Stripe → Retourner 500 avec message générique
- Erreur d'autorisation → Retourner 403

### Gestion des Erreurs Frontend

**Création de Checkout:**
- Erreur réseau → Afficher message "Impossible de se connecter"
- Erreur 401 → Rediriger vers la connexion
- Erreur 500 → Afficher message "Système de paiement indisponible"

**Accès Portail:**
- Erreur réseau → Afficher toast "Impossible d'ouvrir le portail"
- Erreur 404 → Afficher toast "Abonnement non trouvé"
- Erreur 500 → Afficher toast "Portail indisponible"

**Récupération Abonnement:**
- Erreur réseau → Afficher message d'erreur, permettre réessai
- Erreur 401 → Rediriger vers la connexion
- Erreur 500 → Afficher message d'erreur générique

### Stratégie de Logging

**Backend:**
```typescript
logger.info('Webhook Stripe reçu', {
  eventType: event.type,
  subscriptionId: event.data.object.id,
  timestamp: event.created
});

logger.error('Échec traitement webhook', {
  eventType: event.type,
  error: error.message,
  stack: error.stack
});
```

**Frontend:**
```typescript
// Développement: console.log
// Production: Envoyer au service de monitoring (Sentry, etc.)
if (import.meta.env.PROD && window.Sentry) {
  Sentry.captureException(error, {
    tags: { component: 'stripe-checkout' },
    extra: { priceId, userId }
  });
}
```

## Stratégie de Test

### Tests Backend

**Tests Unitaires:**
- StripeClient: Mocker les requêtes HTTP, tester la gestion des erreurs
- StripeCheckoutService: Tester la création de customer, création de session, gestion d'erreurs
- StripeWebhookService: Tester la vérification de signature, traitement d'événements
- Gestionnaires webhook: Tester chaque type d'événement avec des payloads d'exemple

**Tests d'Intégration:**
- Endpoint checkout-session: Tester l'authentification, flux de création de session
- Endpoint webhook: Tester la vérification de signature, mises à jour base de données
- Endpoint portal-session: Tester l'autorisation, création de session
- Endpoint subscription: Tester la récupération de données

**Données de Test:**
- Utiliser l'environnement de test Stripe
- Créer des payloads webhook fixtures pour chaque type d'événement
- Mocker les réponses API Stripe

### Tests Frontend

**Tests Unitaires:**
- stripeService: Tester l'initialisation, gestion d'erreurs
- stripeCheckoutService: Tester les appels API, gestion d'erreurs
- stripePortalService: Tester l'ouverture du portail
- subscriptionApi: Tester les appels API, gestion d'erreurs

**Tests de Composants:**
- Step3_Payment: Tester le flux checkout, gestion d'erreurs, états de chargement
- ManageSubscriptionButton: Tester l'ouverture du portail, états de chargement
- SubscriptionStatus: Tester l'affichage des différents statuts

**Tests E2E:**
- Flux checkout complet (mode test)
- Flux d'accès au portail
- Rafraîchissement d'abonnement après paiement

### Checklist de Tests Manuels

**Tests en Mode Test:**
1. Initialiser Stripe avec clé publique de test
2. Compléter checkout avec carte de test (4242 4242 4242 4242)
3. Vérifier webhook reçu et traité
4. Vérifier abonnement créé en base de données
5. Vérifier champs utilisateur mis à jour
6. Tester l'accès au portail
7. Tester l'annulation d'abonnement
8. Vérifier statut annulé synchronisé

**Scénarios d'Erreur:**
1. Échec de création de session checkout
2. Signature webhook invalide
3. Annulation de checkout
4. Erreurs réseau pendant checkout
5. Accès portail pour abonnement inexistant
6. Échec de paiement (carte de test 4000 0000 0000 0341)

## Configuration d'Environnement

### Payload CMS (.env)

```bash
# Configuration Stripe
STRIPE_SECRET_KEY=sk_test_xxx  # ou sk_live_xxx pour production
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Prix Stripe (créés dans le dashboard Stripe)
STRIPE_PRICE_ID_MONTHLY=price_xxx
STRIPE_PRICE_ID_YEARLY=price_xxx

# Configuration existante...
DATABASE_URI=postgresql://...
PAYLOAD_SECRET=...
```

### Dashboard App (.env)

```bash
# Configuration Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # ou pk_live_xxx pour production

# URLs de succès/annulation
VITE_APP_URL=http://localhost:5173

# Configuration existante...
VITE_API_BASE_URL=http://localhost:3000
```

## Considérations de Sécurité

1. **Sécurité des Clés:**
   - Ne jamais exposer STRIPE_SECRET_KEY au frontend
   - Utiliser des clés de test en développement
   - Rotation régulière des clés en production

2. **Sécurité Webhook:**
   - Toujours vérifier l'en-tête Stripe-Signature
   - Rejeter immédiatement les requêtes non signées
   - Logger tous les échecs de vérification

3. **Autorisation:**
   - Sessions portail uniquement pour le propriétaire de l'abonnement
   - Vérifier que l'utilisateur possède l'abonnement avant création de session portail
   - Utiliser le middleware d'authentification de Payload

4. **Confidentialité des Données:**
   - Masquer les données sensibles dans les messages d'erreur frontend
   - Sanitiser les payloads webhook avant stockage dans l'historique
   - Ne jamais logger les numéros de carte complets

5. **Limitation de Débit:**
   - Implémenter limitation de débit sur l'endpoint checkout-session
   - L'endpoint webhook doit gérer un volume élevé
   - Endpoint portal-session limité par utilisateur

## Considérations de Performance

1. **Mise en Cache:**
   - Mettre en cache l'instance Stripe côté serveur
   - Mettre en cache les données d'abonnement côté client (avec invalidation)
   - Utiliser des requêtes select pour ne récupérer que les champs nécessaires

2. **Traitement Webhook:**
   - Traiter les webhooks de manière asynchrone si possible
   - Retourner 200 rapidement à Stripe
   - Mettre en file les opérations lourdes (notifications email, etc.)

3. **Requêtes Base de Données:**
   - Indexer le champ subscriptionId
   - Indexer l'email utilisateur pour les recherches webhook
   - Utiliser des requêtes select pour récupérer uniquement les champs nécessaires

4. **Frontend:**
   - Mettre en cache l'instance Stripe après initialisation
   - Débouncer les appels de rafraîchissement d'abonnement
   - Lazy load du composant ManageSubscriptionButton

## Plan de Migration

### Checklist de Retrait de Paddle

Avant de commencer l'implémentation Stripe, nettoyer complètement le code Paddle existant :

**Backend (payload-cms):**
- [ ] Supprimer toutes les variables d'environnement Paddle de .env et .env.example
- [ ] Supprimer les services Paddle (si existants) : `src/services/paddle/`
- [ ] Supprimer les endpoints Paddle (si existants) : `src/endpoints/paddle/`
- [ ] Vérifier qu'aucune référence à Paddle ne reste dans le code

**Frontend (dashboard-app):**
- [ ] Supprimer `src/services/paddleService.ts`
- [ ] Supprimer toutes les variables VITE_PADDLE_* de .env et .env.example :
  - VITE_PADDLE_CLIENT_TOKEN
  - VITE_PADDLE_VENDOR_ID
  - VITE_PADDLE_PRODUCT_ID
  - VITE_PADDLE_PORTAL_URL
  - VITE_PADDLE_API_BASE
  - VITE_PADDLE_PRICE_ID_MONTHLY
  - VITE_PADDLE_PRICE_ID_YEARLY
  - VITE_PADDLE_ENVIRONMENT
- [ ] Supprimer les imports Paddle de Step3_Payment.tsx
- [ ] Désinstaller le package @paddle/paddle-js : `npm uninstall @paddle/paddle-js`
- [ ] Rechercher et supprimer toute référence à "paddle" dans le code : `grep -r "paddle" src/`

### Migration des Données Utilisateurs

**Avant le déploiement, créer un script de migration pour :**
- [ ] Ajouter les nouveaux champs à tous les utilisateurs existants :
  - `plan: 'free'` (valeur par défaut)
  - `subscriptionStatus: 'none'` (valeur par défaut)
  - `subscriptionEndDate: null`
  - `stripeCustomerId: null`
- [ ] Si des abonnements Paddle existent, les marquer comme "legacy" ou les migrer manuellement
- [ ] Tester la migration sur une copie de la base de données de production

**Script de migration exemple :**
```typescript
// payload-cms/scripts/migrate-user-subscription-fields.ts
async function migrateUserFields(payload: Payload) {
  const users = await payload.find({
    collection: 'users',
    limit: 1000,
  });

  for (const user of users.docs) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        plan: user.plan || 'free',
        subscriptionStatus: user.subscriptionStatus || 'none',
        subscriptionEndDate: user.subscriptionEndDate || null,
        stripeCustomerId: null,
      },
    });
  }
}
```

### Phases de Migration

1. **Phase 1: Nettoyage Paddle**
   - Exécuter la checklist de retrait de Paddle
   - Vérifier qu'aucune référence Paddle ne reste
   - Commit et déployer le nettoyage

2. **Phase 2: Infrastructure Backend**
   - Ajouter les variables d'environnement Stripe
   - Créer les services Stripe
   - Implémenter les endpoints
   - Exécuter le script de migration des champs utilisateur
   - Mettre à jour la collection Subscriptions (changer provider à 'stripe')

3. **Phase 3: Configuration Stripe**
   - Créer le produit Premium dans Stripe Dashboard
   - Créer les prix mensuels et annuels avec TVA française (20%)
   - Configurer l'essai gratuit de 30 jours
   - Configurer le Customer Portal
   - Obtenir les clés API et webhook secret

4. **Phase 4: Intégration Webhook**
   - Déployer l'endpoint webhook
   - Configurer l'URL webhook dans Stripe Dashboard
   - Tester avec des événements sandbox
   - Monitorer le traitement des webhooks

5. **Phase 5: Intégration Frontend**
   - Installer @stripe/stripe-js : `npm install @stripe/stripe-js`
   - Implémenter les services Stripe
   - Mettre à jour Step3_Payment avec Stripe Checkout
   - Créer les pages de succès/annulation
   - Ajouter le bouton portail et composant statut

6. **Phase 6: Tests & Validation**
   - Tests end-to-end en sandbox
   - Vérifier tous les événements webhook
   - Tester les scénarios d'erreur
   - Tests de performance
   - Tests d'accessibilité

7. **Phase 7: Déploiement Production**
   - Mettre à jour les variables d'environnement de production
   - Déployer les changements backend
   - Déployer les changements frontend
   - Monitorer pendant 24 heures
   - Déploiement progressif si possible

## Différences Clés avec Paddle

1. **Flux de Paiement:**
   - Paddle: Overlay checkout dans l'application
   - Stripe: Redirection vers page checkout hébergée

2. **Gestion de la TVA:**
   - Paddle: Gère automatiquement la TVA (Merchant of Record)
   - Stripe: **Vous devez gérer la TVA vous-même**
     - Option 1 (Recommandée): Configurer la TVA française (20%) directement dans les prix Stripe
     - Option 2: Utiliser Stripe Tax (frais supplémentaires de 0.5% par transaction)
     - Pour la France uniquement, configurer manuellement la TVA est suffisant

3. **Frais:**
   - Paddle: ~5% + 0.50€
   - Stripe: ~1.4% + 0.25€ (Europe)

4. **Webhooks:**
   - Paddle: Signature dans en-tête Paddle-Signature
   - Stripe: Signature dans en-tête Stripe-Signature

5. **Customer Portal:**
   - Paddle: URL statique configurée
   - Stripe: Session dynamique créée par API

6. **Essai Gratuit:**
   - Paddle: Configuré au niveau du produit
   - Stripe: Configuré lors de la création de la session checkout (trial_period_days)

## Configuration de la TVA Française

Pour les étudiants français, vous devez configurer la TVA à 20% :

**Option 1: Configuration dans Stripe Dashboard (Recommandée)**
1. Lors de la création des prix, activer "Inclure la TVA"
2. Sélectionner "France" et taux de TVA "20%"
3. Le prix affiché inclura automatiquement la TVA

**Option 2: Stripe Tax (Si expansion internationale future)**
1. Activer Stripe Tax dans le Dashboard
2. Configurer les règles fiscales pour la France
3. Frais supplémentaires: 0.5% par transaction

**Pour ce projet (France uniquement), utilisez l'Option 1.**

## URLs de Redirection Checkout

Les URLs de succès et d'annulation doivent être construites dynamiquement :

**Backend (StripeCheckoutService):**
```typescript
const successUrl = `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl = `${process.env.FRONTEND_URL}/checkout/cancel`;
```

**Variables d'environnement requises:**
- `FRONTEND_URL`: URL du frontend (ex: `http://localhost:5173` en dev, `https://app.example.com` en prod)

**Routes frontend à créer:**
- `/checkout/success` → Affiche CheckoutSuccess.tsx
- `/checkout/cancel` → Affiche CheckoutCancel.tsx

**Exemple de construction dans l'endpoint:**
```typescript
// payload-cms/src/endpoints/stripe/checkout-session.ts
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const successUrl = `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
const cancelUrl = `${frontendUrl}/checkout/cancel`;
```

## File de Réessai pour Webhooks Échoués

Pour gérer les webhooks qui échouent lors du traitement, implémenter une file de réessai :

**Option 1: Collection Payload dédiée (Recommandée pour simplicité)**

Créer une collection `WebhookRetryQueue` :

```typescript
// payload-cms/src/collections/WebhookRetryQueue.ts
export const WebhookRetryQueue: CollectionConfig = {
  slug: 'webhook-retry-queue',
  admin: {
    useAsTitle: 'eventId',
    description: 'File de réessai pour les webhooks Stripe échoués'
  },
  fields: [
    {
      name: 'eventId',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'eventType',
      type: 'text',
      required: true,
    },
    {
      name: 'payload',
      type: 'json',
      required: true,
    },
    {
      name: 'retryCount',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'maxRetries',
      type: 'number',
      defaultValue: 3,
    },
    {
      name: 'lastError',
      type: 'textarea',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'En attente', value: 'pending' },
        { label: 'En cours', value: 'processing' },
        { label: 'Réussi', value: 'success' },
        { label: 'Échec définitif', value: 'failed' },
      ],
      defaultValue: 'pending',
    },
    {
      name: 'nextRetryAt',
      type: 'date',
    },
  ],
  timestamps: true,
};
```

**Logique de réessai:**
```typescript
// Dans StripeWebhookService
async processEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
  try {
    // Traiter l'événement normalement
    await this.handleEvent(event);
    return { success: true, eventType: event.type };
  } catch (error) {
    // En cas d'échec, ajouter à la file de réessai
    await this.addToRetryQueue(event, error);
    return { success: false, eventType: event.type, error: error.message };
  }
}

private async addToRetryQueue(event: WebhookEvent, error: Error) {
  const existingEntry = await this.payload.find({
    collection: 'webhook-retry-queue',
    where: { eventId: { equals: event.id } },
  });

  if (existingEntry.docs.length > 0) {
    // Incrémenter le compteur de réessais
    const entry = existingEntry.docs[0];
    await this.payload.update({
      collection: 'webhook-retry-queue',
      id: entry.id,
      data: {
        retryCount: entry.retryCount + 1,
        lastError: error.message,
        status: entry.retryCount + 1 >= entry.maxRetries ? 'failed' : 'pending',
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // Réessayer dans 5 minutes
      },
    });
  } else {
    // Créer une nouvelle entrée
    await this.payload.create({
      collection: 'webhook-retry-queue',
      data: {
        eventId: event.id,
        eventType: event.type,
        payload: event,
        retryCount: 0,
        lastError: error.message,
        status: 'pending',
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
  }
}
```

**Processeur de file (cron job ou worker):**
```typescript
// payload-cms/src/jobs/processWebhookRetryQueue.ts
export async function processWebhookRetryQueue(payload: Payload) {
  const pendingWebhooks = await payload.find({
    collection: 'webhook-retry-queue',
    where: {
      and: [
        { status: { equals: 'pending' } },
        { nextRetryAt: { less_than_or_equal: new Date() } },
      ],
    },
  });

  for (const webhook of pendingWebhooks.docs) {
    try {
      await webhookService.processEvent(webhook.payload);
      
      // Marquer comme réussi
      await payload.update({
        collection: 'webhook-retry-queue',
        id: webhook.id,
        data: { status: 'success' },
      });
    } catch (error) {
      // Le service ajoutera automatiquement à la file avec compteur incrémenté
      console.error(`Échec réessai webhook ${webhook.eventId}:`, error);
    }
  }
}
```

**Option 2: Service de queue externe (Pour production à grande échelle)**
- Utiliser BullMQ, Bee-Queue, ou AWS SQS
- Plus robuste mais plus complexe à configurer
