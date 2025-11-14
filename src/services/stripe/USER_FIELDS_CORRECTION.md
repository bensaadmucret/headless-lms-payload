# Correction des Champs Utilisateur - Abonnement Unique

## Contexte

L'application propose **une seule offre Premium** avec deux cycles de facturation :
- Abonnement mensuel
- Abonnement annuel

Il n'y a **pas de plan gratuit** et **pas de plan premium distinct**. Tous les utilisateurs sont soit :
- Sans abonnement (accès limité)
- Avec abonnement Premium actif (accès complet)

## Changements Apportés

### 1. Suppression du Champ `plan` dans Users

**Avant:**
```typescript
{
  name: 'plan',
  type: 'select',
  options: [
    { label: 'Gratuit', value: 'free' },
    { label: 'Premium', value: 'premium' },
  ],
  defaultValue: 'free',
}
```

**Après:**
- Champ supprimé complètement
- La logique d'accès se base uniquement sur `subscriptionStatus`

**Rationale:**
- Il n'y a qu'une seule offre (Premium)
- Le cycle de facturation (mensuel/annuel) est stocké dans `Subscription.priceId`
- Le statut d'abonnement suffit pour déterminer l'accès

### 2. Champs Utilisateur Finaux

Les champs liés à l'abonnement dans la collection Users sont maintenant :

```typescript
{
  name: 'subscriptionStatus',
  type: 'select',
  options: [
    { label: 'Aucun', value: 'none' },           // Pas d'abonnement
    { label: 'Essai gratuit', value: 'trialing' }, // En période d'essai
    { label: 'Actif', value: 'active' },          // Abonnement actif
    { label: 'Paiement en retard', value: 'past_due' }, // Paiement échoué
    { label: 'Annulé', value: 'canceled' },       // Abonnement annulé
  ],
  defaultValue: 'none',
}

{
  name: 'subscriptionEndDate',
  type: 'date',
  // Date de fin de la période d'abonnement actuelle
}

{
  name: 'stripeCustomerId',
  type: 'text',
  // ID du client Stripe (lecture seule)
}
```

### 3. Mise à Jour du StripeWebhookService

Toutes les références au champ `plan` ont été supprimées :

**customer.subscription.created:**
```typescript
const primaryItem = subscription.items?.data?.[0];

// Avant
await this.payload.update({
  collection: 'users',
  id: user.id,
  data: {
    stripeCustomerId: subscription.customer as string,
    plan: 'premium', // ❌ Supprimé
    subscriptionStatus: status,
    subscriptionEndDate: new Date(subscription.current_period_end * 1000),
  },
});

// Après
await this.payload.update({
  collection: 'users',
  id: user.id,
  data: {
    stripeCustomerId: subscription.customer as string,
    subscriptionStatus: status,
    subscriptionEndDate: primaryItem?.current_period_end
      ? new Date(primaryItem.current_period_end * 1000)
      : null,
  },
});
```

**invoice.payment_succeeded:**
```typescript
const subscriptionItem = stripeSubscription.items?.data?.[0];

// Avant
data: {
  plan: 'premium', // ❌ Supprimé
  subscriptionStatus: 'active',
  subscriptionEndDate: new Date(stripeSubscription.current_period_end * 1000),
}

// Après
data: {
  subscriptionStatus: 'active',
  subscriptionEndDate: subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000)
    : null,
}
```

**customer.subscription.deleted:**
```typescript
// Avant
data: {
  plan: 'free', // ❌ Supprimé
  subscriptionStatus: 'canceled',
}

// Après
data: {
  subscriptionStatus: 'canceled',
}
```

## Logique d'Accès

### Déterminer si un Utilisateur a Accès Premium

```typescript
function hasActivePremiumAccess(user: User): boolean {
  return ['trialing', 'active'].includes(user.subscriptionStatus);
}

function hasExpiredAccess(user: User): boolean {
  return user.subscriptionStatus === 'past_due';
}

function hasNoAccess(user: User): boolean {
  return ['none', 'canceled'].includes(user.subscriptionStatus);
}
```

### Déterminer le Cycle de Facturation

Le cycle de facturation n'est pas stocké sur l'utilisateur mais dans la subscription :

```typescript
// Récupérer le cycle de facturation
const subscription = await payload.find({
  collection: 'subscriptions',
  where: {
    user: { equals: userId },
    status: { in: ['trialing', 'active'] },
  },
  limit: 1,
});

if (subscription.docs.length > 0) {
  const priceId = subscription.docs[0].priceId;
  
  // Comparer avec les Price IDs configurés
  const isMonthly = priceId === process.env.STRIPE_PRICE_ID_MONTHLY;
  const isYearly = priceId === process.env.STRIPE_PRICE_ID_YEARLY;
}
```

## Avantages de Cette Approche

1. **Simplicité**: Un seul champ de statut au lieu de deux (plan + status)
2. **Clarté**: Le statut d'abonnement est la source de vérité unique
3. **Flexibilité**: Facile d'ajouter d'autres statuts si nécessaire
4. **Cohérence**: Le cycle de facturation est géré au niveau de la subscription, pas de l'utilisateur

## Migration

### Pour les Utilisateurs Existants

Si des utilisateurs ont déjà le champ `plan` dans la base de données :

```typescript
// Script de migration (optionnel)
const users = await payload.find({
  collection: 'users',
  limit: 1000,
});

for (const user of users.docs) {
  // Le champ 'plan' sera simplement ignoré s'il existe
  // Aucune action nécessaire car TypeScript ne le reconnaît plus
}
```

**Note:** Le champ `plan` peut rester dans la base de données sans causer de problèmes. Il sera simplement ignoré par l'application.

## Frontend

### Affichage du Statut d'Abonnement

```typescript
function getSubscriptionLabel(status: string): string {
  const labels = {
    none: 'Aucun abonnement',
    trialing: 'Essai gratuit actif',
    active: 'Abonnement Premium actif',
    past_due: 'Paiement en attente',
    canceled: 'Abonnement annulé',
  };
  return labels[status] || status;
}

function getSubscriptionBadgeColor(status: string): string {
  const colors = {
    none: 'gray',
    trialing: 'blue',
    active: 'green',
    past_due: 'orange',
    canceled: 'red',
  };
  return colors[status] || 'gray';
}
```

### Affichage du Cycle de Facturation

```typescript
interface SubscriptionData {
  status: string;
  priceId: string;
  currentPeriodEnd: string;
}

function getBillingCycleLabel(priceId: string): string {
  if (priceId === import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY) {
    return 'Mensuel';
  }
  if (priceId === import.meta.env.VITE_STRIPE_PRICE_ID_YEARLY) {
    return 'Annuel';
  }
  return 'Inconnu';
}
```

## Résumé

- ✅ Suppression du champ `plan` (inutile avec une seule offre)
- ✅ `subscriptionStatus` est la source de vérité unique
- ✅ Cycle de facturation stocké dans `Subscription.priceId`
- ✅ Logique simplifiée dans le webhook service
- ✅ Meilleure cohérence avec le modèle métier
