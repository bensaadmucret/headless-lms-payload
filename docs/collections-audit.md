# Audit des collections Payload

Ce document résume l'état actuel des collections définies dans `payload.config.ts` et leur utilisation.

## Légende des statuts

- **Essentiel** : utilisé activement par des fonctionnalités clé (abonnement, quiz, sessions, site marketing).
- **Support** : utilisé pour la supervision, les imports, les logs, l'analytics.
- **Produit avancé** : fonctionnalités produit plus poussées, pas toujours exposées partout dans le front.
- **Futur / Dormant** : prévu pour des fonctionnalités futures, pas câblé dans le frontend actuel.
- **Code mort** : collection/fichier non enregistré ou plus utilisé.

---

## Collections cœur produit

- **users**  
  - **Rôle** : comptes utilisateurs / admin.  
  - **Utilisation front** : Oui (auth BetterAuth, dashboard).  
  - **Utilisation back** : Oui (Payload admin, endpoints /api/users/me, etc.).  
  - **Statut** : Essentiel.

- **prospects**  
  - **Rôle** : prospects du tunnel d'abonnement.  
  - **Utilisation front** : Oui (tunnel subscription, `useSubscriptionWithAnalytics` → `/api/prospects/upsert`).  
  - **Utilisation back** : Oui (endpoint `upsertProspect`, Stripe).  
  - **Statut** : Essentiel (acquisition / abonnement).

- **subscriptions**  
  - **Rôle** : abonnements actifs (Stripe / facturation).  
  - **Utilisation front** : Oui (dashboard abonnement, meSubscription).  
  - **Utilisation back** : Oui (endpoints Stripe, gestion abonnement).  
  - **Statut** : Essentiel.

- **subscription-plans**  
  - **Rôle** : plans tarifaires (mensuel/annuel, prix).  
  - **Utilisation front** : Oui (`useSubscriptionPlans` → cartes de prix + Step3_Payment).  
  - **Utilisation back** : Oui (collection Payload Tarification).  
  - **Statut** : Essentiel (pricing).

- **media, pages, posts, categories**  
  - **Rôle** : contenu marketing (site, blog, pages).  
  - **Utilisation front** : Oui (Next / app router).  
  - **Utilisation back** : Oui (Payload admin contenu).  
  - **Statut** : Essentiel (site marketing / contenu).

- **questions, quizzes, quiz-submissions, study-sessions, study-plans, courses, lessons, prerequisites, progress**  
  - **Rôle** : cœur pédagogique (quiz, études, sessions, planning).  
  - **Utilisation front** : Oui (pages quiz, planning, sessions).  
  - **Utilisation back** : Oui (endpoints generateSessionSteps, generateAIQuiz, etc.).  
  - **Statut** : Essentiel (pédago).

- **adaptive-quiz-sessions, adaptive-quiz-results, user-performances**  
  - **Rôle** : quiz adaptatif, analytics de performance.  
  - **Utilisation front** : Oui/Partiel (fonctionnalités adaptatives).  
  - **Utilisation back** : Oui (endpoints generateAdaptiveQuiz, performanceByUser, etc.).  
  - **Statut** : Essentiel ou très proche du cœur produit.

---

## Collections support / infra

- **analytics-events**  
  - **Rôle** : stockage des événements analytics (tunnel, pages, erreurs, conversions…).  
  - **Utilisation front** : Oui (`AnalyticsService` → POST `/api/analytics/events`).  
  - **Utilisation back** : Oui (`analyticsEventsEndpoint`, collection AnalyticsEvents).  
  - **Statut** : Support (analytics).

- **analytics-sessions**  
  - **Rôle** : sessions utilisateur analytics (regroupe les events par sessionId, stats).  
  - **Utilisation front** : Indirecte (sessionId généré par AnalyticsService).  
  - **Utilisation back** : Oui (mise à jour dans `analyticsEventsEndpoint`).  
  - **Statut** : Support (analytics / funnel).

- **audit-logs**  
  - **Rôle** : logs d'audit (traçabilité des actions).  
  - **Utilisation front** : Non direct.  
  - **Utilisation back** : Oui (hooks logAudit, supervision).  
  - **Statut** : Support.

- **generation-logs, system-metrics**  
  - **Rôle** : logs de génération, métriques système (jobs, performance).  
  - **Utilisation front** : Non direct.  
  - **Utilisation back** : Oui (endpoints generationMetrics, generationLogs, monitoring).  
  - **Statut** : Support.

- **import-jobs, webhook-retry-queue**  
  - **Rôle** : suivi des imports JSON et file de retry des webhooks.  
  - **Utilisation front** : Interface admin Payload + outils internes.  
  - **Utilisation back** : Oui (workers, endpoints JSON import, jobs).  
  - **Statut** : Support (ops / import).

---

## Collections produit "avancé" / étendu

- **flashcards, flashcard-decks**  
  - **Rôle** : cartes de révision, decks, intégrées au système de répétition espacée et d'import JSON.  
  - **Utilisation front** : Indirecte via planning étudiant (`activityType: "flashcards"`).  
  - **Utilisation back** : Oui (FlashcardImportService, SpacedRepetitionSchedulingService, import JSON).  
  - **Statut** : Produit avancé (répétition espacée / cartes).

- **learning-paths, learning-path-steps**  
  - **Rôle** : parcours d'apprentissage structurés (séquences de leçons, quiz…).  
  - **Utilisation front** : Pas encore d'UI principale dans le dashboard.  
  - **Utilisation back** : Oui (services d'import/mapping JSON, tests).  
  - **Statut** : Produit futur / avancé (parcours), non mort.

- **conversations**  
  - **Rôle** : stockage des conversations (coach IA / chat).  
  - **Utilisation front** : Partiel/en cours (fonctionnalités IA).  
  - **Utilisation back** : Oui (collection active, liée à l'IA).  
  - **Statut** : Produit futur / progress (chat IA).

- **badges**  
  - **Rôle** : gamification, récompenses utilisateur.  
  - **Utilisation front** : Potentiellement partielle (profil, dashboard).  
  - **Utilisation back** : Oui (relations, tests).  
  - **Statut** : Support produit (gamification).

- **tenants**  
  - **Rôle** : multi-tenant / multi-organisation (préparation marque blanche).  
  - **Utilisation front** : Pas encore exposé.  
  - **Utilisation back** : Oui (tenantStats, SystemMetrics).  
  - **Statut** : Futur multi-tenant / infra.

---

## Collections futures / dormantes / code mort potentiel

- **color-schemes**  
  - **Rôle** : définir des thèmes de couleurs (primary, secondary, accent, background, text).  
  - **Utilisation front** : Aucune aujourd'hui (pas d'appel à `/api/color-schemes`, pas de ThemeProvider connecté).  
  - **Utilisation back** : Présente dans Payload, utilisée seulement pour config/admin + tests de structure.  
  - **Statut** : Futur / Dormant (thèmes dynamiques non câblés).  
  - **Note** : à activer uniquement si besoin de theming dynamique (multi-marque, A/B tests visuels, etc.).

- **learning-analytics.ts (fichier)**  
  - **Rôle** : collection potentielle pour des analytics pédagogiques.  
  - **Enregistrement** : non présent dans `collections` de `payload.config.ts` → **non chargé par Payload**.  
  - **Utilisation front/back** : Aucune.  
  - **Statut** : Code mort (au sens "fichier non utilisé").  
  - **Note** : candidat à suppression ou à activation future si un besoin clair apparaît.

---

## Pistes pour la suite

- **Court terme** : ne pas câbler `color-schemes` ni activer `learning-analytics` tant qu'il n'y a pas de besoin business clair.
- **Moyen terme** : si multi-tenant / marque blanche ou theming marketing devient prioritaire, réutiliser `tenants` + `color-schemes`.
- **Nettoyage éventuel** : si certaines collections "Dormant" ne sont toujours pas utilisées dans 3–6 mois, envisager leur retrait de la config et du code.
