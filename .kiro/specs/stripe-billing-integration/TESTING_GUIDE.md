# Guide de Test - Intégration Stripe

Ce guide vous permet de tester rapidement l'intégration Stripe Backend après configuration.

## 🎯 Prérequis

- ✅ Backend Stripe implémenté (Tâches 1-7)
- ✅ Stripe Dashboard configuré (Tâche 15)
- ✅ Variables d'environnement configurées dans `.env`
- ✅ Serveur backend démarré : `npm run dev`
- ✅ Workers démarrés : `npm run workers:start`

## 1️⃣ Test du Système de Configuration

### Vérifier les Variables d'Environnement

```bash
cd payload-cms

# Vérifier que toutes les variables Stripe sont présentes
cat .env | grep STRIPE
```

Vous devriez voir :
```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_MONTHLY=price_xxxxx
STRIPE_PRICE_ID_YEARLY=price_xxxxx
```

### Vérifier le Démarrage du Backend

```bash
# Dans les logs au démarrage, vous devriez voir :
# [Stripe] Configuration loaded successfully
# [Stripe] Environment: test
```

## 2️⃣ Test des Webhooks (Développement)

### Démarrer Stripe CLI

```bash
# Installer Stripe CLI (si pas déjà fait)
# Mac
brew install stripe/stripe-brew/stripe

# Windows
scoop install stripe

# Linux
# Télécharger depuis https://github.com/stripe/stripe-cli/releases

# Se connecter
stripe login

# Écouter les webhooks en local
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Vous devriez voir :
```
> Ready! Your webhook signing secret is whsec_xxxxx (^C to quit)
```

⚠️ **Copier ce webhook secret dans votre `.env` pour les tests locaux !**

### Tester les Événements Webhook

**Dans un nouveau terminal** :

```bash
# Test: Création d'abonnement
stripe trigger customer.subscription.created

# Test: Paiement réussi
stripe trigger invoice.payment_succeeded

# Test: Paiement échoué
stripe trigger invoice.payment_failed

# Test: Abonnement mis à jour
stripe trigger customer.subscription.updated

# Test: Abonnement supprimé
stripe trigger customer.subscription.deleted
```

### Vérifier les Logs Backend

Dans les logs du backend, vous devriez voir :
```
[Stripe Webhook] Event received: customer.subscription.created
[Stripe Webhook] Signature verified successfully
[Stripe Webhook] Processing event evt_xxxxx
[Stripe Webhook] Event processed successfully in XXms
```

## 3️⃣ Test de Création de Session Checkout

### Étape 1 : Créer un prospect

```bash
curl -X POST http://localhost:3000/api/prospects \
  -H "Content-Type: application/json" \
  -d '{
        "email": "prospect-test@example.com",
        "firstName": "Prospect",
        "lastName": "Test",
        "billingCycle": "monthly",
        "selectedPrice": 69.99
      }'
```

**Réponse attendue** :
```json
{
  "prospect": {
    "id": "prospect_abc123",
    "email": "prospect-test@example.com",
    ...
  },
  "created": true
}
```

### Étape 2 : Créer la session checkout avec le prospect

```bash
curl -X POST http://localhost:3000/api/stripe/checkout-session \
  -H "Content-Type: application/json" \
  -d '{
        "prospectId": "prospect_abc123",
        "billingCycle": "monthly",
        "selectedPrice": 69.99,
        "email": "prospect-test@example.com"
      }'
```

**Réponse attendue** :
```json
{
  "sessionId": "cs_test_xxxxx",
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxx"
}
```

### Compléter le Checkout

1. Ouvrir l'URL retournée dans votre navigateur
2. Utiliser une carte de test :
   ```
   Numéro : 4242 4242 4242 4242
   Date   : N'importe quelle date future (ex: 12/25)
   CVC    : N'importe quel 3 chiffres (ex: 123)
   ```
3. Compléter le paiement

### Vérifier les Webhooks

Après le paiement, dans les logs Stripe CLI :
```
customer.subscription.created [evt_xxxxx]
invoice.payment_succeeded [evt_xxxxx]
```

Dans les logs backend :
```
[Stripe Webhook] Subscription created
[Subscription Sync] User synchronized successfully
```

## 4️⃣ Vérifier en Base de Données

### Via Payload Admin

1. Ouvrir `http://localhost:3000/admin`
2. Aller dans **Collections > Prospects** et vérifier la mise à jour :
   - `status`: `ready_for_password` après paiement réussi, `payment_failed` en cas d'échec
   - `checkoutSessionId` rempli
   - `subscriptionId` renseigné si l'abonnement est actif
3. Aller dans **Collections > Subscriptions**
4. Vérifier qu'un nouvel abonnement est créé :
   - Provider: `stripe`
   - Status: `trialing` ou `active`
   - PriceId: Correspond au prix sélectionné

5. Aller dans **Collections > Users**
6. Vérifier l'utilisateur :
   - `subscriptionStatus`: `trialing` ou `active`
   - `subscriptionEndDate`: Date future
   - `stripeCustomerId`: `cus_xxxxx`

### Via PostgreSQL Direct

```bash
# Se connecter à la DB
psql $DATABASE_URI

# Vérifier les abonnements
SELECT id, "subscriptionId", status, "userId" 
FROM subscriptions 
ORDER BY "createdAt" DESC 
LIMIT 5;

# Vérifier la synchronisation utilisateur
SELECT id, email, "subscriptionStatus", "subscriptionEndDate" 
FROM users 
WHERE "subscriptionStatus" != 'none';
```

## 5️⃣ Test du Portail Client

### Créer une Session Portail

```bash
curl -X POST http://localhost:3000/api/stripe/portal-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse attendue** :
```json
{
  "url": "https://billing.stripe.com/session/xxxxx"
}
```

### Accéder au Portail

1. Ouvrir l'URL retournée
2. Vérifier les fonctionnalités :
   - ✅ Voir l'abonnement actuel
   - ✅ Mettre à jour le moyen de paiement
   - ✅ Voir les factures
   - ✅ Annuler l'abonnement

## 6️⃣ Test de l'Endpoint Me/Subscription

### Récupérer les Données d'Abonnement

```bash
curl -X GET http://localhost:3000/api/me/subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Réponse attendue** :
```json
{
  "subscription": {
    "id": "123",
    "status": "trialing",
    "billingCycle": "monthly",
    "currentPeriodEnd": "2025-11-24T18:00:00.000Z",
    "trialEnd": "2025-11-24T18:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "provider": "stripe",
    "priceId": "price_xxxxx",
    "amount": 1500,
    "currency": "EUR",
    "lastPaymentAt": null
  }
}
```

### Sans Abonnement

```json
{
  "subscription": null
}
```

## 7️⃣ Test des Scénarios d'Erreur

### Paiement Échoué

```bash
# Créer une session checkout
# Puis utiliser la carte test qui échoue : 4000 0000 0000 0341

# Vérifier le webhook
stripe trigger invoice.payment_failed
```

Vérifier en DB que le statut passe à `past_due`.

### Annulation d'Abonnement

1. Accéder au portail client
2. Annuler l'abonnement
3. Choisir "À la fin de la période"
4. Vérifier que `cancelAtPeriodEnd = true`

### Webhook Non Livré (Retry Queue)

1. Arrêter le backend
2. Trigger un webhook : `stripe trigger customer.subscription.created`
3. Redémarrer le backend
4. Vérifier dans **Collections > Webhook Retry Queue**
5. Attendre 5 minutes (traitement automatique par worker)
6. Vérifier que le statut passe à `success`

## 8️⃣ Tests de Performance

### Charge de Webhooks

```bash
# Envoyer plusieurs webhooks rapidement
for i in {1..10}; do
  stripe trigger customer.subscription.created &
done
wait

# Vérifier que tous sont traités
# Dans Collections > Subscriptions
# Devrait voir 10 nouveaux abonnements (ou dans la retry queue)
```

## 9️⃣ Checklist de Validation Complète

- [ ] ✅ Configuration .env valide
- [ ] ✅ Backend démarre sans erreur
- [ ] ✅ Workers démarrés
- [ ] ✅ Stripe CLI connecté
- [ ] ✅ Webhook signature vérifiée
- [ ] ✅ Session checkout créée
- [ ] ✅ Paiement test réussi
- [ ] ✅ Subscription créée en DB
- [ ] ✅ User synchronisé (subscriptionStatus, subscriptionEndDate)
- [ ] ✅ Portail client accessible
- [ ] ✅ Endpoint /me/subscription retourne les bonnes données
- [ ] ✅ Paiement échoué traité (status = past_due)
- [ ] ✅ Annulation fonctionne (cancelAtPeriodEnd = true)
- [ ] ✅ Retry queue fonctionne

## 🐛 Dépannage

### Erreur : "Webhook signature verification failed"

**Cause** : Le `STRIPE_WEBHOOK_SECRET` ne correspond pas.

**Solution** :
```bash
# Obtenir le bon secret depuis Stripe CLI
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Copier le webhook secret affiché
# Mettre à jour .env
# Redémarrer le backend
```

### Erreur : "Cannot find module '@payloadcms/plugin-cron'"

**Solution** : Ce module a été remplacé par Bull/BullMQ.
- Vérifier que `src/jobs/workers/webhookWorker.ts` existe
- Vérifier que les workers sont démarrés : `npm run workers:start`

### Abonnement créé mais utilisateur non synchronisé

**Vérifications** :
1. Hook afterChange dans `src/collections/Subscriptions.ts` présent ?
2. Logs backend montrent `[Subscription Sync] Synchronisation réussie` ?
3. Vérifier la retry queue : `Collections > Webhook Retry Queue`

### Portail client : "No subscription found"

**Cause** : L'utilisateur n'a pas de `customerId` Stripe.

**Solution** :
1. Vérifier que l'abonnement a un `customerId`
2. Créer un abonnement via checkout d'abord

## 📊 Métriques à Surveiller

Pendant les tests, surveiller :

1. **Temps de traitement webhook** : < 500ms
2. **Taux de succès webhook** : 100%
3. **Latence checkout session** : < 1s
4. **Synchronisation user** : < 200ms

## 🚀 Après les Tests

Une fois tous les tests validés :

1. **Passer en mode production Stripe**
   - Récupérer les clés `sk_live_` et `pk_live_`
   - Créer les produits en production
   - Configurer les webhooks production

2. **Implémenter le frontend**
   - Bouton "S'abonner"
   - Pages success/cancel
   - Composant SubscriptionStatus

3. **Monitoring production**
   - Configurer Sentry pour les erreurs
   - Alertes sur échecs webhook
   - Dashboard Stripe pour métriques

## 📚 Commandes Utiles

```bash
# Démarrer backend
npm run dev

# Démarrer workers
npm run workers:start

# Écouter webhooks locaux
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Trigger événements
stripe trigger [event_name]

# Lister les événements disponibles
stripe trigger --help

# Voir les logs Stripe CLI
stripe logs tail

# Voir les webhooks échoués dans Dashboard
open https://dashboard.stripe.com/webhooks
```
