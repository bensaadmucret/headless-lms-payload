# Plan d'Implémentation

## Architecture d'abonnement
**Important**: Cette application propose **UN SEUL produit "Premium"** avec 2 cycles de facturation :
- **Mensuel** : facturation tous les mois
- **Annuel** : facturation tous les ans

Il n'y a pas de notion de "plans multiples" (Free, Basic, Premium, etc.). Tous les utilisateurs sont soit :
- Sans abonnement (`subscriptionStatus: 'none'`)
- En essai gratuit (`subscriptionStatus: 'trialing'`)  
- Premium actif (`subscriptionStatus: 'active'`)
- Premium en retard de paiement (`subscriptionStatus: 'past_due'`)
- Abonnement annulé (`subscriptionStatus: 'canceled'`)

Le cycle de facturation (mensuel/annuel) est déterminé par le `priceId` Stripe, pas par un champ "plan".

---

- [x] 1. Configurer l'infrastructure Stripe backend
  - Créer le service client API Stripe avec configuration selon l'environnement
  - Ajouter STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_YEARLY à .env.example
  - Implémenter la validation de configuration au démarrage
  - _Exigences: 11.1, 11.3, 11.5_

- [x] 2. Implémenter le service et endpoint de création de session checkout
  - [x] 2.1 Créer StripeCheckoutService avec logique de création de session
    - Implémenter getOrCreateCustomer pour récupérer ou créer un Stripe Customer
    - Implémenter createCheckoutSession avec configuration d'essai gratuit de 30 jours
    - Stocker userId dans les metadata de la session
    - Gérer les erreurs avec logging approprié
    - _Exigences: 1.2, 1.3, 1.4_

  - [x] 2.2 Créer l'endpoint POST /api/stripe/checkout-session
    - Implémenter la vérification d'authentification (session utilisateur requise)
    - Mapper priceId ('monthly'/'yearly') vers les Stripe Price IDs réels
    - Construire successUrl: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    - Construire cancelUrl: `${FRONTEND_URL}/checkout/cancel`
    - Appeler StripeCheckoutService pour créer la session avec les URLs
    - Retourner sessionId et URL de checkout
    - Gérer les erreurs avec codes HTTP appropriés (401 pour non authentifié, 400 pour priceId invalide)
    - _Exigences: 1.1, 1.5, 2.1_

- [x] 3. Implémenter la vérification et le traitement des webhooks
  - [x] 3.1 Créer l'utilitaire de vérification de signature webhook
    - Implémenter la vérification de l'en-tête Stripe-Signature en utilisant le webhook secret
    - Ajouter le logging de sécurité pour les vérifications échouées
    - _Exigences: 3.2, 3.3_

  - [x] 3.2 Créer StripeWebhookService avec gestionnaires d'événements
    - Implémenter handleSubscriptionCreated: créer enregistrement Subscription, lier à l'utilisateur
    - Implémenter handleInvoicePaymentSucceeded: mettre à jour le statut de l'abonnement à active
    - Implémenter handleSubscriptionUpdated: mettre à jour les champs de l'abonnement
    - Implémenter handleSubscriptionDeleted: mettre à jour le statut et le plan utilisateur
    - Implémenter handleInvoicePaymentFailed: mettre à jour le statut à past_due
    - Ajouter le logging d'événements avec horodatage et statut de traitement
    - _Exigences: 3.4, 3.5, 4.1, 4.2, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 8.2, 8.3, 9.1, 9.2, 9.3_

  - [x] 3.3 Créer la collection WebhookRetryQueue
    - Créer payload-cms/src/collections/WebhookRetryQueue.ts
    - Ajouter les champs: eventId, eventType, payload, retryCount, maxRetries, lastError, status, nextRetryAt
    - Configurer les options de statut: pending, processing, success, failed
    - _Exigences: 3.5_

  - [x] 3.4 Créer l'endpoint POST /api/stripe/webhook
    - Vérifier la signature webhook avant traitement (pas d'auth requise - la signature est l'auth)
    - Parser le type d'événement et les données du corps de la requête
    - Appeler StripeWebhookService pour traiter l'événement
    - Retourner 200 immédiatement à Stripe, traiter de manière asynchrone si nécessaire
    - En cas d'échec, ajouter l'événement à WebhookRetryQueue avec nextRetryAt dans 5 minutes
    - Logger toutes les tentatives de webhook avec statut de traitement
    - _Exigences: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.5 Créer le processeur de file de réessai webhook
    - Créer payload-cms/src/jobs/processWebhookRetryQueue.ts
    - Récupérer les webhooks en attente avec nextRetryAt passé
    - Réessayer le traitement de chaque webhook
    - Incrémenter retryCount et mettre à jour nextRetryAt en cas d'échec
    - Marquer comme 'failed' si maxRetries atteint
    - Configurer un cron job ou worker pour exécuter toutes les 5 minutes
    - _Exigences: 3.5_

- [x] 4. Implémenter la synchronisation subscription-utilisateur
  - [x] 4.1 Configurer les champs d'abonnement dans la collection Users
    - Vérifier que payload-cms/src/collections/Users/index.ts existe
    - ~~Ajouter le champ plan~~ (supprimé - abonnement unique Premium)
    - Ajouter le champ subscriptionStatus (select: none, trialing, active, past_due, canceled) avec defaultValue: 'none'
    - Ajouter le champ subscriptionEndDate (date)
    - Ajouter le champ stripeCustomerId (text, readOnly)
    - Note: Le cycle de facturation (mensuel/annuel) est distingué via Subscriptions.priceId
    - _Exigences: 6.2, 6.3, 6.4_

  - [x]* 4.1.5 Créer un script de migration pour les utilisateurs existants
    - Créer payload-cms/scripts/migrate-user-subscription-fields.ts
    - Ajouter les nouveaux champs à tous les utilisateurs existants avec valeurs par défaut
    - Tester le script sur une copie de la base de données
    - Documenter comment exécuter le script
    - Note: Optionnel car les nouveaux champs ont des valeurs par défaut
    - _Exigences: 6.2_

  - [x] 4.2 Créer l'utilitaire de synchronisation d'abonnement
    - Implémenter la fonction syncUserSubscription
    - ~~Mettre à jour le plan utilisateur~~ (supprimé - pas de champ plan, logique basée sur subscriptionStatus)
    - Mettre à jour subscriptionStatus et subscriptionEndDate de l'utilisateur
    - Gérer l'utilisateur manquant avec log d'avertissement et file de réessai
    - Note: L'accès Premium est déterminé par subscriptionStatus ('trialing' ou 'active')
    - _Exigences: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.3 Ajouter le hook afterChange à la collection Subscriptions
    - Appeler syncUserSubscription quand le statut de l'abonnement change
    - _Exigences: 6.1, 8.3_

- [x] 5. Implémenter l'intégration du portail client
  - [x] 5.1 Créer StripePortalService
    - Implémenter createPortalSession appelant l'API Stripe /billing_portal/sessions
    - Retourner l'URL du portail signée
    - Gérer les erreurs API Stripe
    - _Exigences: 7.2, 7.3_

  - [x] 5.2 Créer l'endpoint POST /api/stripe/portal-session
    - Vérifier l'authentification utilisateur (session utilisateur requise)
    - Récupérer l'abonnement de l'utilisateur depuis la base de données
    - Vérifier que l'utilisateur possède l'abonnement (403 sinon)
    - Appeler StripePortalService pour créer la session
    - Retourner l'URL du portail
    - Gérer les erreurs d'autorisation (401), non trouvé (404) et erreurs API (500)
    - _Exigences: 7.1, 7.2, 7.3_

- [x] 6. Créer l'endpoint de données d'abonnement
  - Créer l'endpoint GET /api/me/subscription
  - Récupérer l'abonnement de l'utilisateur actuel depuis la base de données
  - Retourner les données d'abonnement (status, billingCycle, currentPeriodEnd, trialEnd, cancelAtPeriodEnd)
  - Note: billingCycle est déduit du priceId (monthly ou yearly) - pas de champ plan distinct
  - Gérer le cas où l'utilisateur n'a pas d'abonnement (retourner null)
  - _Exigences: 12.1, 12.2, 12.3, 12.5_

- [x] 7. Mettre à jour la collection Subscriptions pour Stripe
  - Mettre à jour le champ provider pour utiliser 'stripe' au lieu de 'paddle'
  - Vérifier que tous les champs nécessaires existent (customerId, subscriptionId, priceId, status, etc.)
  - Mettre à jour les options du champ status pour inclure 'trialing'
  - Ajouter le champ trialEnd si manquant
  - _Exigences: 4.1, 4.2, 4.4_

- [x] 8. Implémenter les services frontend Stripe
  - [x] 8.1 Créer stripeService.ts
    - Implémenter initStripe avec chargement de @stripe/stripe-js
    - Utiliser VITE_STRIPE_PUBLISHABLE_KEY depuis les variables d'environnement
    - Mettre en cache l'instance Stripe après initialisation
    - Gérer les erreurs d'initialisation
    - _Exigences: 11.2, 11.4_

  - [x] 8.2 Créer stripeCheckoutService.ts
    - Implémenter createCheckoutSession
    - Appeler l'endpoint POST /api/stripe/checkout-session
    - Rediriger vers l'URL de checkout retournée
    - Gérer les erreurs avec messages conviviaux
    - _Exigences: 1.1, 1.5_

  - [x] 8.3 Créer stripePortalService.ts
    - Implémenter openCustomerPortal
    - Appeler l'endpoint POST /api/stripe/portal-session
    - Ouvrir l'URL retournée dans une nouvelle fenêtre
    - Gérer les erreurs avec messages toast
    - _Exigences: 7.4_

  - [x] 8.4 Créer subscriptionApi.ts
    - Implémenter fetchCurrentSubscription
    - Appeler l'endpoint GET /api/me/subscription
    - Gérer les erreurs API
    - _Exigences: 12.1, 12.2_

- [x] 9. Nettoyer complètement le code Paddle
  - [ ] 9.1 Nettoyer le backend Paddle
    - Supprimer toutes les variables PADDLE_* de payload-cms/.env et .env.example
    - Supprimer les services Paddle si existants: payload-cms/src/services/paddle/
    - Supprimer les endpoints Paddle si existants: payload-cms/src/endpoints/paddle/
    - Rechercher et supprimer toute référence à "paddle" dans payload-cms/src/
    - _Exigences: 1.1_

  - [ ] 9.2 Nettoyer le frontend Paddle
    - Supprimer dashboard-app/src/services/paddleService.ts
    - Désinstaller le package: `npm uninstall @paddle/paddle-js`
    - Supprimer toutes les variables VITE_PADDLE_* de dashboard-app/.env et .env.example
    - Retirer les imports Paddle de Step3_Payment.tsx
    - Rechercher et supprimer toute référence à "paddle" dans dashboard-app/src/
    - _Exigences: 1.1_

- [ ] 10. Mettre à jour le composant de paiement avec Stripe Checkout
  - [ ] 10.1 Installer les dépendances Stripe frontend
    - Exécuter: `npm install @stripe/stripe-js` dans dashboard-app/
    - _Exigences: 1.1_

  - [ ] 10.2 Implémenter Stripe Checkout dans Step3_Payment.tsx
    - Remplacer handlePaddleCheckout par handleStripeCheckout
    - Appeler createCheckoutSession avec le priceId sélectionné
    - Gérer les états de chargement et d'erreur
    - Afficher des messages d'erreur conviviaux
    - _Exigences: 1.1, 1.5, 2.5_

- [ ] 11. Créer les routes et composants de redirection checkout
  - [ ] 11.1 Créer la route /checkout/success
    - Ajouter la route dans le routeur de l'application
    - Créer le composant CheckoutSuccess.tsx
    - _Exigences: 2.1_

  - [ ] 11.2 Créer la route /checkout/cancel
    - Ajouter la route dans le routeur de l'application
    - Créer le composant CheckoutCancel.tsx
    - _Exigences: 2.5_

- [ ] 12. Créer les composants UI de gestion d'abonnement
  - [ ] 12.1 Implémenter CheckoutSuccess.tsx
    - Afficher un message de succès après checkout
    - Récupérer et afficher les données d'abonnement
    - Gérer l'état de chargement
    - _Exigences: 2.1, 2.2, 2.3, 2.4_

  - [ ] 12.2 Implémenter CheckoutCancel.tsx
    - Afficher un message d'annulation
    - Fournir un lien pour réessayer
    - _Exigences: 2.5_

  - [x] 12.3 Créer ManageSubscriptionButton.tsx
    - Ajouter un bouton "Gérer mon abonnement"
    - Appeler openCustomerPortal au clic
    - Afficher l'état de chargement pendant la création de session portail
    - Afficher uniquement pour les utilisateurs avec abonnement actif ou en essai
    - **Créé** : `dashboard-app/src/components/subscription/ManageSubscriptionButton.tsx`
    - _Exigences: 7.4, 7.5_

  - [x] 12.4 Créer SubscriptionStatus.tsx
    - Afficher les informations d'abonnement (cycle de facturation mensuel/annuel, statut, dates)
    - Afficher "Premium Mensuel" ou "Premium Annuel" selon le priceId
    - Afficher un avertissement pour les abonnements past_due
    - Afficher un lien vers le portail pour mettre à jour le moyen de paiement
    - Afficher un avertissement pour les abonnements avec cancelAtPeriodEnd
    - Intégrer ManageSubscriptionButton
    - **Créé** : `dashboard-app/src/components/subscription/SubscriptionStatus.tsx`
    - _Exigences: 9.4, 9.5, 12.4_

- [x] 13. Implémenter la gestion complète des erreurs et le logging
  - [x] 13.1 Ajouter le logging et l'observabilité backend
    - Logger tous les appels API Stripe avec paramètres de requête et statut de réponse vers console/fichier
    - Logger toutes les tentatives de traitement webhook avec type d'événement, statut et durée
    - Logger les tentatives de création de session checkout avec statut de succès/échec
    - Configurer la destination des logs (console pour dev, logs structurés pour production)
    - Ajouter des alertes d'erreur critiques pour les échecs de signature webhook (Sentry/Slack si configuré)
    - Note: Tous les services Stripe incluent déjà un logging complet avec timestamps
    - _Exigences: 10.3, 10.4_

  - [ ] 13.2 Ajouter la gestion des erreurs frontend
    - Logger toutes les tentatives de création de session Stripe Checkout avec statut de succès/échec
    - Masquer les données de paiement sensibles dans les messages d'erreur
    - Envoyer les erreurs de paiement au service de monitoring si configuré (Sentry)
    - _Exigences: 10.1, 10.2, 10.5_

- [x] 14. Mettre à jour les fichiers de configuration d'environnement
  - [x] 14.1 Mettre à jour payload-cms/.env.example
    - Ajouter STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_YEARLY
    - Ajouter FRONTEND_URL (ex: http://localhost:5173 en dev, https://app.example.com en prod)
    - Documenter chaque variable avec description et exemples de valeurs
    - Documenter la configuration sandbox vs production
    - Documenter comment obtenir les clés depuis Stripe Dashboard
    - Note: Toutes les variables Stripe sont déjà documentées dans .env.example
    - _Exigences: 11.1, 11.3_

  - [x] 14.2 Mettre à jour dashboard-app/.env.example
    - Supprimer toutes les variables VITE_PADDLE_* (déjà fait dans tâche 9.2)
    - Ajouter VITE_STRIPE_PUBLISHABLE_KEY avec exemple (pk_test_xxx)
    - Ajouter VITE_STRIPE_PRICE_ID_MONTHLY et VITE_STRIPE_PRICE_ID_YEARLY
    - S'assurer que VITE_API_BASE_URL est présent (pour les appels d'endpoint backend)
    - Documenter les valeurs d'environnement sandbox vs production
    - **Créé** : `dashboard-app/STRIPE_INTEGRATION.md` avec guide complet
    - _Exigences: 11.2, 11.4_

- [x] 15. Configurer Stripe Dashboard et TVA française
  - [x] 15.1 Créer le produit et les prix avec TVA
    - Créer **UN SEUL produit "Premium"** dans Stripe Dashboard (l'application n'a qu'une offre)
    - Créer le prix mensuel (ex: 15€ TTC):
      - Activer "Inclure la TVA"
      - Sélectionner "France" et taux "20%"
      - Le prix HT sera calculé automatiquement (12.50€ HT + 2.50€ TVA = 15€ TTC)
    - Créer le prix annuel (ex: 120€ TTC) avec la même configuration TVA
    - **Important**: Ce sont 2 cycles de facturation pour le même produit Premium, pas 2 plans différents
    - Noter les Price IDs pour la configuration (STRIPE_PRICE_ID_MONTHLY et STRIPE_PRICE_ID_YEARLY)
    - **Documentation**: Guide complet dans `STRIPE_DASHBOARD_SETUP.md`
    - _Exigences: 1.3, 13.1, 13.2, 13.3_

  - [x] 15.2 Configurer l'essai gratuit
    - Dans chaque prix, ne PAS configurer d'essai au niveau du produit
    - L'essai sera configuré dynamiquement lors de la création de la session checkout (trial_period_days: 30)
    - _Exigences: 1.4_

  - [x] 15.3 Configurer le Customer Portal
    - Aller dans Settings > Customer Portal
    - Activer les fonctionnalités: Mise à jour moyen de paiement, Annulation d'abonnement, Voir factures
    - Configurer les paramètres d'annulation (immédiate ou fin de période)
    - **Documentation**: Instructions détaillées dans `STRIPE_DASHBOARD_SETUP.md`
    - _Exigences: 7.2_

  - [x] 15.4 Configurer les webhooks
    - Aller dans Developers > Webhooks
    - Ajouter un endpoint: URL de votre backend /api/stripe/webhook
    - Sélectionner les événements:
      - customer.subscription.created
      - invoice.payment_succeeded
      - customer.subscription.updated
      - customer.subscription.deleted
      - invoice.payment_failed
    - Copier le webhook secret (whsec_xxx) pour STRIPE_WEBHOOK_SECRET
    - **Documentation**: Guide complet avec Stripe CLI dans `STRIPE_DASHBOARD_SETUP.md`
    - _Exigences: 3.1, 7.2_

- [ ] 16. Tout assembler et valider l'intégration
  - [ ] 16.1 Tester le flux checkout complet en sandbox
    - Créer une session checkout avec carte de test
    - Compléter le checkout avec carte de test (4242 4242 4242 4242)
    - Vérifier que le webhook est reçu et traité
    - Vérifier que l'abonnement est créé en base de données
    - Vérifier que les champs utilisateur sont mis à jour
    - Vérifier que le statut est 'trialing' pendant l'essai
    - _Exigences: 1.1, 2.1, 3.1, 4.1, 6.1_

  - [ ] 16.2 Tester l'accès au portail client
    - Ouvrir le portail depuis ManageSubscriptionButton
    - Vérifier que la session portail est créée
    - Vérifier que l'URL du portail s'ouvre correctement
    - Tester la mise à jour du moyen de paiement
    - _Exigences: 7.1, 7.2, 7.3, 7.4_

  - [ ] 16.3 Tester le flux d'annulation d'abonnement
    - Annuler l'abonnement via le portail
    - Vérifier que le webhook est reçu
    - Vérifier que le statut de l'abonnement est mis à jour avec cancelAtPeriodEnd
    - Attendre la fin de période ou simuler avec Stripe CLI
    - Vérifier que le statut utilisateur est mis à jour à 'canceled'
    - Vérifier que l'utilisateur perd l'accès Premium (subscriptionStatus = 'canceled')
    - _Exigences: 8.1, 8.2, 8.3_

  - [ ] 16.4 Tester le flux d'échec de paiement
    - Utiliser une carte de test qui échoue (4000 0000 0000 0341)
    - Vérifier que le webhook invoice.payment_failed est reçu
    - Vérifier que le statut de l'abonnement est mis à jour à past_due
    - Vérifier que l'utilisateur voit l'avis d'échec de paiement
    - Vérifier que le lien de mise à jour du moyen de paiement fonctionne
    - _Exigences: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 16.5 Tester l'affichage des données d'abonnement
    - Vérifier que SubscriptionStatus affiche correctement les informations
    - Tester l'affichage pour chaque statut (trialing, active, past_due, canceled)
    - Vérifier que le cycle de facturation est affiché correctement (Premium Mensuel / Premium Annuel)
    - Vérifier que les dates sont formatées correctement
    - Vérifier que ManageSubscriptionButton apparaît uniquement pour les statuts appropriés
    - _Exigences: 12.3, 12.4_

  - [ ]* 16.6 Écrire des tests unitaires pour les services Stripe
    - Mocker les réponses API Stripe pour StripeClient
    - Tester StripeCheckoutService création de customer et session
    - Tester StripeWebhookService vérification de signature
    - Tester chaque gestionnaire d'événement webhook avec des payloads fixtures
    - Tester StripePortalService création de session
    - _Exigences: 3.2, 4.1, 7.2_

  - [ ]* 16.7 Écrire des tests d'intégration pour les endpoints
    - Tester POST /api/stripe/checkout-session avec scénarios d'authentification
    - Tester POST /api/stripe/webhook avec signatures valides et invalides
    - Tester POST /api/stripe/portal-session avec scénarios d'autorisation
    - Tester GET /api/me/subscription avec et sans abonnement
    - _Exigences: 1.1, 3.1, 7.1, 12.1_

  - [ ]* 16.8 Écrire un test E2E pour le flux d'abonnement complet
    - Créer un script de test automatisé utilisant Vitest ou similaire
    - Tester le flux complet: création session → checkout → webhook → sync abonnement
    - Vérifier l'état de la base de données à chaque étape
    - Tester les scénarios d'erreur (échecs réseau, données invalides)
    - _Exigences: 1.1, 2.1, 3.1, 4.1, 6.1_
