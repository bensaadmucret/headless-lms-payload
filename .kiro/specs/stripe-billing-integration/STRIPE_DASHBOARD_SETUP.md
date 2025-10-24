# Guide de Configuration Stripe Dashboard

Ce guide détaille toutes les étapes pour configurer votre compte Stripe afin d'utiliser le système d'abonnement implémenté.

## 📋 Prérequis

- Compte Stripe créé sur [https://stripe.com](https://stripe.com)
- Accès au Dashboard Stripe
- Backend déployé ou accessible via tunnel (pour webhooks)

## 1️⃣ Créer le Produit Premium

### Étapes

1. **Accéder aux Produits**
   - Aller sur [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products)
   - Cliquer sur **"+ Ajouter un produit"**

2. **Configuration du Produit**
   ```
   Nom: Premium MedCoach
   Description: Accès complet à la plateforme MedCoach avec coach IA personnel
   ```

3. **Type de Produit**
   - Sélectionner : **"Abonnement"** (Recurring)

## 2️⃣ Créer les Prix avec TVA Française

### Important : Architecture Un Seul Produit
⚠️ Vous créez **2 prix pour le même produit Premium**, pas 2 produits différents :
- Un prix **mensuel**
- Un prix **annuel**

### Prix Mensuel

1. **Modèle de tarification**
   - Montant : `15.00` EUR
   - Périodicité : **Mensuel** (Monthly)

2. **Configurer la TVA (CRUCIAL)**
   - ✅ Cocher : **"Prix toutes taxes comprises (TTC)"**
   - Pays : **France**
   - Taux de TVA : **20%**
   
   💡 Stripe calculera automatiquement :
   ```
   Prix TTC : 15.00 €
   Prix HT  : 12.50 €
   TVA (20%): 2.50 €
   ```

3. **Facturation**
   - Type de facturation : **Récurrente**
   - Essai gratuit : **NE PAS configurer ici**
     (géré dynamiquement dans le code avec `trial_period_days: 30`)

4. **Sauvegarder et copier le Price ID**
   ```
   Format: price_xxxxxxxxxxxxxxxxxxxxx
   ```
   → Copier dans `.env` : `STRIPE_PRICE_ID_MONTHLY=price_xxxxx`

### Prix Annuel

1. **Ajouter un nouveau prix au même produit**
   - Cliquer sur **"+ Ajouter un autre prix"** sur la page du produit Premium

2. **Modèle de tarification**
   - Montant : `120.00` EUR (équivalent 10€/mois)
   - Périodicité : **Annuel** (Yearly)

3. **Configurer la TVA (identique)**
   - ✅ Cocher : **"Prix toutes taxes comprises (TTC)"**
   - Pays : **France**
   - Taux de TVA : **20%**
   
   💡 Stripe calculera :
   ```
   Prix TTC : 120.00 €
   Prix HT  : 100.00 €
   TVA (20%): 20.00 €
   ```

4. **Sauvegarder et copier le Price ID**
   ```
   Format: price_yyyyyyyyyyyyyyyyyyyyyyy
   ```
   → Copier dans `.env` : `STRIPE_PRICE_ID_YEARLY=price_yyyyy`

### Résultat Final

Vous devriez avoir **1 produit "Premium MedCoach"** avec **2 prix** :
```
✅ Premium MedCoach
   ├─ 💳 Prix Mensuel : 15€ TTC/mois (price_xxxxx)
   └─ 💳 Prix Annuel  : 120€ TTC/an (price_yyyyy)
```

## 3️⃣ Configurer les Webhooks

### Étapes

1. **Accéder aux Webhooks**
   - Aller sur [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   - Cliquer sur **"+ Ajouter un endpoint"**

2. **URL de l'Endpoint**

   **En développement local :**
   ```bash
   # Option 1: Utiliser Stripe CLI (recommandé)
   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
   
   # Option 2: Utiliser un tunnel (ngrok, localtunnel, etc.)
   ngrok http 3000
   # Puis utiliser: https://xxxxx.ngrok.io/api/stripe/webhook
   ```

   **En production :**
   ```
   https://api.votre-domaine.com/api/stripe/webhook
   ```

3. **Sélectionner les Événements**

   Cliquer sur **"Sélectionner des événements"** et cocher :

   ✅ **customer.subscription.created**
   - Déclenché : Quand un nouvel abonnement est créé
   - Action : Crée l'enregistrement Subscription + lie à l'utilisateur

   ✅ **customer.subscription.updated**
   - Déclenché : Quand un abonnement est modifié
   - Action : Met à jour les champs de l'abonnement

   ✅ **customer.subscription.deleted**
   - Déclenché : Quand un abonnement est annulé définitivement
   - Action : Marque l'abonnement comme canceled + met à jour l'utilisateur

   ✅ **invoice.payment_succeeded**
   - Déclenché : Quand un paiement réussit
   - Action : Active l'abonnement (passage de trialing à active)

   ✅ **invoice.payment_failed**
   - Déclenché : Quand un paiement échoue
   - Action : Marque l'abonnement comme past_due

4. **Sauvegarder et copier le Signing Secret**
   ```
   Format: whsec_xxxxxxxxxxxxxxxxxxxxx
   ```
   → Copier dans `.env` : `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`

### Test avec Stripe CLI (Développement)

```bash
# Installer Stripe CLI
# Mac: brew install stripe/stripe-brew/stripe
# Autres: https://stripe.com/docs/stripe-cli

# Se connecter
stripe login

# Écouter les webhooks
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Tester un événement (dans un autre terminal)
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

## 4️⃣ Configurer le Customer Portal

Le Customer Portal permet aux clients de gérer leur abonnement (modifier paiement, annuler, voir factures).

### Étapes

1. **Accéder au Customer Portal**
   - Aller sur [https://dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal)

2. **Activer les Fonctionnalités**

   ✅ **Mettre à jour les informations de paiement**
   - Permet de changer la carte bancaire
   - Essentiel pour résoudre les past_due

   ✅ **Annuler l'abonnement**
   - Configuration : **"Annuler à la fin de la période de facturation"**
   - Raison : L'utilisateur garde l'accès jusqu'à la fin de la période payée

   ✅ **Voir les factures**
   - Permet de télécharger les factures passées

   ❌ **Changer de plan** (Désactivé)
   - Vous n'avez qu'un produit Premium, pas besoin de changement

3. **Paramètres d'Annulation**
   - Type : **"Annuler à la fin de la période"** (`cancel_at_period_end: true`)
   - Demander une raison : **Optionnel**

4. **Personnalisation (Optionnel)**
   - Logo : Votre logo
   - Couleurs : Vos couleurs de marque
   - Liens : Politique de confidentialité, CGV

5. **Sauvegarder**

## 5️⃣ Configurer les Emails Stripe (Recommandé)

### Étapes

1. **Accéder aux Emails**
   - Aller sur [https://dashboard.stripe.com/settings/emails](https://dashboard.stripe.com/settings/emails)

2. **Personnaliser les Emails**
   
   Emails importants à configurer :
   - ✅ Confirmation de paiement
   - ✅ Échec de paiement
   - ✅ Fin d'essai gratuit
   - ✅ Facture disponible
   - ✅ Annulation d'abonnement

3. **Ajouter votre Logo et Couleurs**

## 6️⃣ Mode Test vs Production

### Mode Test (Développement)

- Clés API commencent par `sk_test_` et `pk_test_`
- Cartes de test disponibles :
  ```
  Succès : 4242 4242 4242 4242
  Échec  : 4000 0000 0000 0341
  3D Secure: 4000 0025 0000 3155
  ```
- Les webhooks peuvent être simulés avec Stripe CLI

### Passage en Production

1. **Activer votre compte**
   - Compléter les informations bancaires
   - Fournir les documents requis

2. **Obtenir les clés de production**
   - Format : `sk_live_` et `pk_live_`

3. **Mettre à jour `.env`**
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_PUBLIC_KEY=pk_live_xxxxx
   # Les Price IDs changent aussi en production
   STRIPE_PRICE_ID_MONTHLY=price_live_xxxxx
   STRIPE_PRICE_ID_YEARLY=price_live_yyyyy
   ```

4. **Configurer les webhooks de production**
   - Créer un nouvel endpoint webhook pour l'URL de production
   - Copier le nouveau `whsec_` de production

## 7️⃣ Variables d'Environnement Finales

Après configuration, votre `.env` doit contenir :

```bash
# Mode Test
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ID_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ID_YEARLY=price_yyyyyyyyyyyyyyyyyyyyyy

# URL Frontend (pour redirections)
FRONTEND_URL=http://localhost:5173

# En production, remplacer par :
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLIC_KEY=pk_live_...
# FRONTEND_URL=https://app.votre-domaine.com
```

## 8️⃣ Vérification

### Checklist

- [ ] Produit "Premium MedCoach" créé
- [ ] Prix mensuel créé avec TVA française 20% (TTC)
- [ ] Prix annuel créé avec TVA française 20% (TTC)
- [ ] `STRIPE_PRICE_ID_MONTHLY` copié dans `.env`
- [ ] `STRIPE_PRICE_ID_YEARLY` copié dans `.env`
- [ ] Webhook configuré avec les 5 événements
- [ ] `STRIPE_WEBHOOK_SECRET` copié dans `.env`
- [ ] Customer Portal activé
- [ ] Fonctionnalités du portail configurées
- [ ] Emails personnalisés (optionnel)

### Test Rapide

```bash
# Démarrer le backend
cd payload-cms
npm run dev

# Dans un autre terminal, écouter les webhooks
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Tester la création d'une session checkout
curl -X POST http://localhost:3000/api/stripe/checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"priceId": "monthly"}'
```

## 🎯 Prochaines Étapes

Après cette configuration :

1. **Tester le flux complet**
   - Créer une session checkout
   - Compléter le paiement avec une carte test
   - Vérifier les webhooks dans les logs
   - Vérifier la création de l'abonnement en DB

2. **Implémenter le frontend**
   - Bouton "S'abonner"
   - Pages success/cancel
   - Composant SubscriptionStatus
   - Bouton "Gérer mon abonnement"

3. **Tests d'intégration**
   - Flux de paiement réussi
   - Flux de paiement échoué
   - Annulation d'abonnement
   - Portail client

## 📚 Ressources

- [Documentation Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Cartes de test](https://stripe.com/docs/testing)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
