# Document d'Exigences

## Introduction

Cette fonctionnalité implémente une intégration complète et prête pour la production de Stripe Billing pour le système d'abonnement destiné aux étudiants en médecine français. L'implémentation établira un traitement sécurisé des paiements, une gestion du cycle de vie des abonnements, un accès au portail client et une gestion des événements webhook entre le frontend dashboard-app et le backend payload-cms. Le système supportera les cycles de facturation mensuels et annuels avec une période d'essai gratuite de 30 jours.

## Glossaire

- **Stripe**: Plateforme de traitement des paiements et service de gestion des abonnements
- **Stripe Checkout**: Page de paiement hébergée pour collecter les informations de paiement
- **Stripe Customer**: Entité représentant un client dans le système Stripe
- **Stripe Subscription**: Arrangement de facturation récurrente dans Stripe
- **Stripe Price**: Configuration de tarification spécifique pour un produit (mensuel/annuel)
- **Stripe Product**: Représente le service vendu (plan Premium)
- **Customer Portal**: Interface hébergée par Stripe pour que les clients gèrent leurs abonnements
- **Webhook**: Callback HTTP serveur-à-serveur de Stripe pour les événements d'abonnement
- **Webhook Secret**: Clé secrète pour vérifier l'authenticité des webhooks
- **Subscription Entity**: Enregistrement en base de données dans Payload CMS suivant l'état de l'abonnement
- **Dashboard App**: Application frontend React pour les étudiants
- **Payload CMS**: Système de gestion de contenu backend et API
- **Client Secret**: Token temporaire pour initialiser Stripe.js de manière sécurisée

## Exigences

### Exigence 1

**User Story:** En tant qu'étudiant, je veux initier une session de paiement de manière sécurisée, afin que mes informations de paiement soient protégées et que je puisse m'abonner au plan premium

#### Critères d'Acceptation

1. QUAND un étudiant clique pour s'abonner, L'Application Dashboard DOIT créer une session Stripe Checkout via le Payload CMS
2. LE Payload CMS DOIT créer un Stripe Customer si l'utilisateur n'en a pas
3. LE Payload CMS DOIT créer une Checkout Session avec le prix sélectionné (mensuel ou annuel)
4. LE Payload CMS DOIT configurer la Checkout Session avec un essai gratuit de 30 jours
5. L'Application Dashboard DOIT rediriger l'utilisateur vers l'URL Stripe Checkout

### Exigence 2

**User Story:** En tant qu'étudiant, je veux être redirigé vers l'application après le paiement, afin de voir mon statut d'abonnement et accéder aux fonctionnalités premium

#### Critères d'Acceptation

1. QUAND une Checkout Session se termine avec succès, STRIPE DOIT rediriger l'utilisateur vers l'URL de succès
2. L'Application Dashboard DOIT afficher un message de succès sur la page de succès
3. L'Application Dashboard DOIT récupérer les données d'abonnement mises à jour depuis Payload CMS
4. L'Application Dashboard DOIT mettre à jour l'interface pour refléter le statut d'abonnement premium
5. SI le checkout est annulé, ALORS STRIPE DOIT rediriger vers l'URL d'annulation avec un message approprié

### Exigence 3

**User Story:** En tant qu'administrateur système, je veux que les webhooks Stripe soient vérifiés et traités de manière sécurisée, afin que seuls les événements d'abonnement légitimes mettent à jour la base de données

#### Critères d'Acceptation

1. LE Payload CMS DOIT exposer un endpoint webhook à /api/stripe/webhook acceptant les requêtes POST
2. QUAND une requête webhook arrive, LE Payload CMS DOIT vérifier l'en-tête Stripe-Signature en utilisant le secret webhook
3. SI la vérification de signature échoue, ALORS LE Payload CMS DOIT rejeter la requête avec un statut HTTP 400
4. LE Payload CMS DOIT parser le type d'événement webhook et les données du corps de la requête
5. LE Payload CMS DOIT logger tous les événements webhook avec horodatage, type d'événement et statut de traitement

### Exigence 4

**User Story:** En tant qu'étudiant, je veux que mon abonnement soit automatiquement créé quand je termine le checkout, afin d'avoir immédiatement accès aux fonctionnalités premium après l'essai

#### Critères d'Acceptation

1. QUAND LE Payload CMS reçoit un événement webhook customer.subscription.created, LE Payload CMS DOIT créer un nouvel enregistrement Subscription
2. LE Payload CMS DOIT remplir l'enregistrement Subscription avec subscriptionId, customerId, status, priceId, currentPeriodEnd et trialEnd
3. LE Payload CMS DOIT lier l'enregistrement Subscription à l'enregistrement User correspondant à l'email du client
4. LE Payload CMS DOIT définir le statut de l'abonnement à 'trialing' pendant la période d'essai
5. LE Payload CMS DOIT ajouter l'événement webhook au tableau d'historique Subscription avec horodatage et détails de l'événement

### Exigence 5

**User Story:** En tant qu'étudiant, je veux que mon abonnement s'active automatiquement après la période d'essai quand le paiement réussit, afin de continuer à avoir accès sans interruption

#### Critères d'Acceptation

1. QUAND LE Payload CMS reçoit un événement webhook invoice.payment_succeeded, LE Payload CMS DOIT mettre à jour le statut de l'Subscription associée à active
2. LE Payload CMS DOIT mettre à jour le champ lastPaymentAt avec l'horodatage du paiement
3. LE Payload CMS DOIT mettre à jour les champs amount et currency
4. LE Payload CMS DOIT mettre à jour currentPeriodEnd avec la prochaine date de facturation
5. LE Payload CMS DOIT ajouter l'événement de paiement au tableau d'historique Subscription

### Exigence 6

**User Story:** En tant qu'étudiant, je veux que mon compte utilisateur reflète mon niveau d'abonnement, afin que l'application m'accorde l'accès approprié aux fonctionnalités

#### Critères d'Acceptation

1. QUAND un enregistrement Subscription est créé ou mis à jour au statut active, LE Payload CMS DOIT mettre à jour l'enregistrement User lié
2. LE Payload CMS DOIT définir le champ plan de l'User à 'premium'
3. LE Payload CMS DOIT définir le champ subscriptionStatus de l'User pour correspondre au statut de l'abonnement (trialing, active, past_due, canceled)
4. LE Payload CMS DOIT mettre à jour le champ subscriptionEndDate de l'User avec la valeur currentPeriodEnd
5. SI aucun enregistrement User n'existe pour l'email du client, ALORS LE Payload CMS DOIT logger un avertissement et mettre l'événement en file d'attente pour réessai

### Exigence 7

**User Story:** En tant qu'étudiant, je veux gérer mon abonnement (mettre à jour le moyen de paiement, annuler, voir les factures), afin d'avoir le contrôle sur ma facturation

#### Critères d'Acceptation

1. LE Payload CMS DOIT exposer un endpoint à /api/stripe/portal-session acceptant les requêtes POST
2. QUAND un utilisateur demande l'accès au portail, LE Payload CMS DOIT créer une session Stripe Customer Portal
3. LE Payload CMS DOIT retourner une URL de portail valide pour le Stripe customer de l'utilisateur demandeur
4. L'Application Dashboard DOIT fournir un bouton "Gérer mon abonnement" qui ouvre l'URL du portail
5. L'Application Dashboard DOIT afficher le bouton du portail uniquement aux utilisateurs avec un abonnement actif ou en période d'essai

### Exigence 8

**User Story:** En tant qu'étudiant, je veux que mon abonnement soit automatiquement mis à jour quand j'annule, afin que mon niveau d'accès reflète précisément mon statut d'abonnement

#### Critères d'Acceptation

1. QUAND LE Payload CMS reçoit un événement webhook customer.subscription.updated avec cancel_at_period_end à true, LE Payload CMS DOIT mettre à jour le champ cancelAtPeriodEnd de l'Subscription
2. QUAND LE Payload CMS reçoit un événement webhook customer.subscription.deleted, LE Payload CMS DOIT mettre à jour le statut de l'Subscription à canceled
3. QUAND le statut d'une Subscription change à canceled, LE Payload CMS DOIT mettre à jour le plan de l'User lié à free
4. LE Payload CMS DOIT préserver l'enregistrement Subscription et l'historique à des fins d'audit
5. LE Payload CMS DOIT définir le subscriptionStatus de l'User à canceled quand l'abonnement se termine

### Exigence 9

**User Story:** En tant qu'étudiant, je veux être notifié si mon paiement échoue, afin de pouvoir mettre à jour mon moyen de paiement et maintenir mon accès

#### Critères d'Acceptation

1. QUAND LE Payload CMS reçoit un événement webhook invoice.payment_failed, LE Payload CMS DOIT mettre à jour le statut de l'Subscription à past_due
2. LE Payload CMS DOIT mettre à jour le subscriptionStatus de l'User à past_due
3. LE Payload CMS DOIT ajouter l'événement de paiement échoué à l'historique Subscription
4. L'Application Dashboard DOIT afficher un avis d'échec de paiement aux utilisateurs avec le statut past_due
5. L'Application Dashboard DOIT fournir un lien pour mettre à jour le moyen de paiement via le Customer Portal

### Exigence 10

**User Story:** En tant que développeur, je veux une gestion complète des erreurs et des logs pour les opérations de paiement, afin de pouvoir diagnostiquer les problèmes et surveiller la santé du système

#### Critères d'Acceptation

1. L'Application Dashboard DOIT logger toutes les tentatives de création de session Stripe Checkout avec le statut de succès ou d'échec
2. L'Application Dashboard DOIT masquer les données de paiement sensibles dans les messages d'erreur affichés aux utilisateurs
3. LE Payload CMS DOIT logger toutes les tentatives de traitement de webhook avec le type d'événement, le statut et la durée de traitement
4. LE Payload CMS DOIT logger tous les appels API Stripe avec les paramètres de requête et le statut de réponse
5. OÙ le suivi des erreurs est configuré, L'Application Dashboard DOIT envoyer les erreurs de paiement au service de monitoring

### Exigence 11

**User Story:** En tant que développeur, je veux une configuration spécifique à l'environnement pour l'intégration Stripe, afin de pouvoir tester en mode test avant de déployer en production

#### Critères d'Acceptation

1. LE Payload CMS DOIT lire STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, FRONTEND_URL depuis les variables d'environnement
2. L'Application Dashboard DOIT lire VITE_STRIPE_PUBLISHABLE_KEY depuis les variables d'environnement
3. LE Payload CMS DOIT utiliser les clés API Stripe de test ou live selon le préfixe de la clé (sk_test_ ou sk_live_)
4. L'Application Dashboard DOIT initialiser Stripe avec la clé publique de test ou live selon le préfixe de la clé (pk_test_ ou pk_live_)
5. LE Payload CMS DOIT valider que toutes les variables d'environnement Stripe requises sont présentes au démarrage

### Exigence 13

**User Story:** En tant qu'administrateur, je veux que la TVA française soit correctement appliquée aux paiements, afin de respecter la réglementation fiscale française

#### Critères d'Acceptation

1. LES Prix Stripe DOIVENT être configurés avec la TVA française de 20% incluse
2. LE Stripe Checkout DOIT afficher le prix TTC (toutes taxes comprises) aux étudiants
3. LES Factures Stripe DOIVENT inclure le détail de la TVA (montant HT, TVA 20%, montant TTC)
4. LE Payload CMS DOIT stocker le montant TTC dans l'enregistrement Subscription
5. LA Documentation DOIT expliquer comment configurer la TVA dans Stripe Dashboard

### Exigence 12

**User Story:** En tant qu'étudiant, je veux que mes données d'abonnement soient disponibles dans l'application, afin de pouvoir voir mon plan actuel, ma date de facturation et mon statut d'abonnement

#### Critères d'Acceptation

1. LE Payload CMS DOIT exposer un endpoint à /api/me/subscription acceptant les requêtes GET
2. QUAND un utilisateur demande ses données d'abonnement, LE Payload CMS DOIT récupérer l'enregistrement Subscription de l'utilisateur
3. LE Payload CMS DOIT retourner les données d'abonnement incluant status, plan, currentPeriodEnd, trialEnd et cancelAtPeriodEnd
4. L'Application Dashboard DOIT afficher les informations d'abonnement dans le profil utilisateur ou la page de paramètres
5. SI l'utilisateur n'a pas d'abonnement, ALORS LE Payload CMS DOIT retourner null pour les données d'abonnement
