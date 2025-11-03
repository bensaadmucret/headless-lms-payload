# Exigences — Intégration Better Auth

## 1. Exigences fonctionnelles

- **RF1** : Authentifier tous les clients du tunnel via Better Auth (signup/login/reset/MFA).
- **RF2** : Après authentification, l’utilisateur doit choisir un service type (plan) avant paiement.
- **RF3** : Le paiement confirmé via Stripe (ou équivalent) doit activer automatiquement le service type dans Payload.
- **RF4** : Les commandes e-mail (confirmation, reset) sont gérées via Better Auth avec branding Pellot.
- **RF5** : Les administrateurs peuvent suspendre/réactiver un compte et cette action est reflétée dans Better Auth et Payload.
- **RF6** : Compatibilité avec comptes existants (migration) sans interrompre l’accès des clients actuels.

## 2. Exigences non fonctionnelles

- **RNF1** : Authentification et rafraîchissement de session < 300 ms moyenne (hors réseau externe).
- **RNF2** : Disponibilité du tunnel > 99.5% (SLI : authentification + paiement).
- **RNF3** : Aucune donnée sensible (mot de passe, token) loggée ou stockée côté front.
- **RNF4** : Traçabilité complète des actions auth/paiement (logs structurés, corrélation d’ID).
- **RNF5** : Système testable en staging avec sandbox Better Auth + Stripe.

## 3. Contraintes techniques

- **CT1** : Respect de la stack existante : React (Vite), Payload CMS, Stripe, TypeScript.
- **CT2** : Intégration Better Auth via SDK officiel (ESM) côté front + API REST côté Payload.
- **CT3** : Utiliser uniquement cookies httpOnly fournis par Better Auth pour la session.
- **CT4** : Conserver l’infrastructure CI/CD actuelle (tests, lint, déploiement).
- **CT5** : Gestion des secrets via fichiers `.env` + store sécurisé (pas de valeurs en dur).

## 4. Cas limites & règles métier

- **CL1** : Si le paiement échoue, l’utilisateur reste authentifié mais reçoit statut `payment_failed` et doit pouvoir relancer le paiement.
- **CL2** : Si l’utilisateur abandonne le tunnel après authentification, il doit pouvoir reprendre via lien magique (Better Auth magic link).
- **CL3** : Gestion des organisations : un compte peut avoir plusieurs `serviceType` (ex: multi-sites) → interface de sélection à prévoir.
- **CL4** : Synchronisation webhook double (Better Auth / Stripe) ne doit pas produire des états incohérents (idempotence via ID externe).
- **CL5** : Possibilité d’activer des features en fonction du service type (feature flags).

## 5. Critères d’acceptation

1. Un client s’inscrit via Better Auth, paie, et accède au service immédiatement (scénario E2E validé).
2. Un client existant migré conserve son service type et peut se connecter sans recréer un compte.
3. Un administrateur suspend un utilisateur → la session Better Auth est invalidée et l’accès au tunnel est retiré.
4. Tous les endpoints sensibles exigent une session Better Auth valide (tests d’API).
5. Les journaux d’audit reflètent les actions (login, paiement, activation) sans contenu sensible.
6. Les tests automatisés (unit + e2e) couvrent > 80% des nouveaux flux d’authentification et tunnel.
