# Plan de tâches — Intégration Better Auth

## 1. Préparation & infrastructure
- [x] T1.1 Auditer `package.json` (front/back) pour identifier dépendances obsolètes liées à l’auth actuelle.
- [x] T1.2 Installer les bibliothèques Better Auth (SDK front, client admin backend) + scripts post-install si requis.
- [x] T1.3 Créer clés Better Auth et configurer variables `.env` (`BETTER_AUTH_CLIENT_ID`, `BETTER_AUTH_SECRET`, etc.).
- [ ] T1.4 Mettre en place stockage sécurisé des secrets (Vault ou variables chiffrées CI/CD).
- [x] T1.5 Mettre à jour documentation d’environnement (README, STRIPE_SETUP, etc.).

## 2. Backend Payload
- [x] T2.1 Ajouter hooks Better Auth (`beforeOperation`, `afterRead`, `afterLogin`) pour valider la session et enrichir `req.user`.
- [x] T2.2 Étendre la collection `users` (champs `betterAuthId`, `serviceType`, `tunnelStatus`, `metadata`).
- [x] T2.3 Créer service `betterAuthClient` (appel API Better Auth : fetch user, suspend, etc.).
- [x] T2.4 Implémenter webhook `/webhooks/better-auth` (audit login/logout, MFA).
- [x] T2.5 Implémenter webhook `/webhooks/payment` (Stripe → activation service type, statut tunnel).
- [ ] T2.6 Rédiger script `scripts/migrate-users-to-better-auth.ts` (création comptes Better Auth, sync roles/service).
    - Pré-requis terminés : variables Better Auth générées, migrations SQL appliquées, script `better-auth/sync.cjs` OK (31/10).
- [ ] T2.7 Couvrir la migration de tests (unit + integration payload) pour hooks & webhooks.

## 3. Front React (dashboard-app)
- [x] T3.1 Créer `BetterAuthProvider` + hook `useBetterAuth` (wrapper SDK).
- [ ] T3.2 Réécrire `AuthProvider`/`useAuth` pour consommer `useBetterAuth` ou les supprimer si redondants.
- [ ] T3.3 Nettoyer `ApiService` (suppression interceptors JWT, rely on httpOnly cookies).
- [ ] T3.4 Mettre à jour routes (guard) avec Better Auth → redirections tunnel.
- [ ] T3.5 Implémenter formulaires `Login`, `Signup`, `Reset`, `MFA` via composants Better Auth.
- [ ] T3.6 Gérer états tunnel (pending payment, payment failed, active) dans l’UI.
- [ ] T3.7 Ajouter tests unitaires et e2e (Cypress/Playwright) pour parcours tunnel.

## 4. Tunnel client & paiement
- [ ] T4.1 Définir flow complet (wireframe, navigation) : sélection service → paiement → retour.
- [ ] T4.2 Intégrer Stripe Checkout avec metadata `betterAuthUserId`.
- [ ] T4.3 Créer page “Reprendre le paiement” (si `tunnelStatus = payment_failed`).
- [ ] T4.4 Ajouter surveillance des webhooks (retries, idempotence).

## 5. Sécurité & conformité
- [ ] T5.1 Appliquer CSP / headers pour Better Auth + Stripe.
- [ ] T5.2 Mettre à jour politique cookies (SameSite=None, Secure) + tests navigateur.
- [ ] T5.3 Ajouter logging structuré (masquage données sensibles) + dashboard monitoring (auth/paiement).
- [ ] T5.4 Réaliser tests de pénétration ciblés sur auth & tunnel (OWASP top 10).

## 6. Documentation & déploiement
- [ ] T6.1 Compléter `design.md` et `requirements.md` (versions finales).
- [ ] T6.2 Rédiger guide d’exploitation (rotation clés, suspension compte, réponse incident).
- [ ] T6.3 Préparer plan de migration (staging → beta → production) + check-list rollback.
- [ ] T6.4 Organiser revue de code/architecture + validation produit.
- [ ] T6.5 Planifier campagne tests utilisateurs (parcours complet tunnel).

## 7. Livraison & suivi
- [ ] T7.1 Déployer en staging (feature flag activé) et monitorer métriques.
- [ ] T7.2 Exécuter script migration en staging, vérifier cohérence.
- [ ] T7.3 Déployer production (fenêtre contrôlée), activer feature flag.
- [ ] T7.4 Monitorer 30 jours (auth/paiement), traiter retours.
- [ ] T7.5 Clôturer projet (post-mortem, documentation finale, archive de specs).
