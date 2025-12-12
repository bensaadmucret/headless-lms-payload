# Flux Prospect → User → Subscription (Stripe)

Ce document décrit le nouveau flux d'inscription basé sur un **Prospect** avant paiement, puis la création automatique de l'utilisateur et de l'abonnement après le paiement Stripe.

---

## 1. Création / mise à jour du Prospect (avant paiement)

### Endpoint

- **POST** `/api/prospects/upsert`

### Rôle

- Enregistre ou met à jour un *lead* avant le paiement.
- Stocke :
  - `email`, `firstName`, `lastName`, `role`
  - `billingCycle` (`monthly` | `yearly`)
  - `selectedPrice` (montant affiché côté front)
  - champs de tracking (UTM) dans `campaign`.

### Comportement

- Si aucun prospect avec cet `email` n'existe → création
  - `status = 'pending'`
  - `userCreated = false`
- Si un prospect existe déjà → mise à jour
  - garde l'historique (un seul document par email)

---

## 2. Checkout Stripe basé sur `prospectId`

### Frontend

- Service : `dashboard-app/src/services/stripe/stripeCheckoutService.ts`
- Fonction : `createCheckoutSession(data: CreateCheckoutSessionRequest)`
- Envoie une requête `fetch` vers :
  - **POST** `/api/stripe/checkout-session`
  - payload :
    - `prospectId`
    - `billingCycle` (`monthly` | `yearly`)
    - `selectedPrice` (nombre)
    - `email`, `firstName`, `lastName`
    - `campaign` (UTM…)

### Backend

- Endpoint : `src/endpoints/stripe/checkout-session.ts`
- Comportement principal :
  1. Charge le `Prospect` par `prospectId` et vérifie la cohérence de l'email.
  2. Crée un **Stripe Customer** si besoin, avec :
     - `email`, `name`
     - `metadata.prospectId = <id du prospect>`
  3. Crée une **Checkout Session Stripe** (mode `subscription`).
  4. Met à jour le `Prospect` :
     - `stripeCustomerId`
     - `stripeCheckoutSessionId`
  5. Renvoie `{ sessionId, url }` au frontend.

Le frontend redirige ensuite l'utilisateur vers `url` (page de paiement Stripe).

---

## 3. Webhook Stripe : création User + Subscription

### Endpoint

- **POST** `/api/stripe/webhook`
- Service : `src/services/stripe/StripeWebhookService.ts`

### Événement clé

- `customer.subscription.created`

### Étapes du flux `handleSubscriptionCreated`

1. Récupère la `metadata.prospectId` depuis la `Subscription` Stripe.
2. Si `prospectId` présent :
   - Charge le document `Prospect` correspondant.
   - **Si `createdUser` déjà renseigné** :
     - Récupère cet utilisateur `users/<createdUser>`.
   - **Sinon** :
     - Crée un nouvel utilisateur `Users` avec :
       - `email`, `firstName`, `lastName`, `role` du Prospect.
       - mot de passe généré côté backend (aléatoire).
     - Met à jour le Prospect :
       - `userCreated = true`
       - `createdUser = <id du user>`
       - `status = 'paid'`.
3. Si aucun user n'est trouvé via Prospect (fallback) :
   - Flux historique par email : recherche d'un user existant par `customer.email`.
4. Crée le document `Subscription` dans la collection `subscriptions` :
   - `user`, `customerId`, `subscriptionId`, `priceId`, `status`, dates…
5. Met à jour l'utilisateur :
   - `stripeCustomerId`
   - `subscriptionStatus`
   - `subscriptionEndDate`.
6. Envoie un **email de bienvenue / confirmation d'abonnement** :
   - `EmailNotificationService.sendSubscriptionWelcomeEmail`
   - lien vers le dashboard (basé sur `FRONTEND_URL`, ex : `/account/subscription`).

---

## 4. Cleanup automatique des Prospects expirés

### Job Bull

- Fichier : `src/jobs/cleanupProspects.ts`
- Worker : `src/jobs/workers/webhookWorker.ts`

### Comportement

- Job répétitif `cleanup-prospects` (cron `0 3 * * *` → tous les jours à 3h).
- Marque comme **`expired`** les Prospects :
  - `status = 'pending'`
  - `createdAt` < (maintenant - 48h).

Cela évite d'accumuler des leads obsolètes qui n'ont jamais finalisé le paiement.

---

## 5. Résumé du cycle complet

1. **Formulaire d'onboarding** → `POST /api/prospects/upsert` → création/màj d'un `Prospect`.
2. **Bouton de paiement** → `createCheckoutSession` (frontend) → `POST /api/stripe/checkout-session` (backend) → création Customer + Checkout Session Stripe.
3. **Paiement réussi** → Stripe envoie `customer.subscription.created` → `/api/stripe/webhook`.
4. **Webhook** → `StripeWebhookService` :
   - crée (si besoin) un `User` à partir du `Prospect` ;
   - crée une `Subscription` liée à ce User ;
   - envoie l'email de bienvenue.
5. **Cron Bull** → `cleanupProspects` marque les Prospects `pending` trop anciens en `expired`.
