# Intégration Better Auth — Design Technique

## 1. Architecture cible

### 1.1 Composants
- **Front React (dashboard-app)** : SDK Better Auth embarqué, hooks dédiés (`useBetterAuth`, `BetterAuthProvider`).
- **Backend Payload CMS** : Hooks Payload (`beforeOperation`, `afterRead`, `afterLogin`) validant les tokens Better Auth et enrichissant `req.user` / les réponses avec les métadonnées métier (service type, tunnel status).
- **Service Better Auth** : Autorité d'authentification (gestion identités, MFA, sessions), callbacks webhooks pour évènements de sécurité.
- **Module Paiement** : Stripe (ou équivalent) orchestrant la phase de paiement au sein du tunnel client.

### 1.2 Substitution de l'existant
- Suppression progressive des endpoints `api.login`/`api.register` côté front au profit des méthodes Better Auth.
- Transformation d'`AuthProvider` + `useAuth` en wrapper autour du SDK (stockage de session géré par cookies httpOnly générés par Better Auth).
- Conservation de l'`ApiService` pour les appels métier, mais suppression de toute responsabilité auth (plus d'injection manuelle de JWT locaux).

### 1.3 Gestion des rôles & service types
- Mapping `betterAuth.app_metadata.roles` ↔︎ `users.role` Payload.
- Ajout d'un champ `serviceType` (enum) synchronisé lors du paiement.
- Gestion multi-profils (entreprise) : possibilité d'associer plusieurs `serviceType` à un même utilisateur via collection relationnelle.

### 1.4 Sessions & stockage
- Sessions persistées par Better Auth (cookies httpOnly, rotation automatique).
- Tokens d'API longue durée accessibles côté backend uniquement via exchange (jamais exposés au front).
- Support mode "magic link" pour reprise tunnel (URL signée Better Auth).

## 2. Flux tunnel client

### 2.1 Parcours principal
1. Landing → page tunnel (publique).
2. Authentification Better Auth (signup/login/MFA).
3. Sélection du service type (plan tarifaire).
4. Paiement (Stripe Checkout).
5. Webhook paiement → activation du service type → redirection dashboard.

### 2.2 États UI
- Écrans chargement auth/paiement.
- Gestion erreurs : auth, paiement, activation (différents messages et CTA).
- Bannière rappel "paiement requis" si session active non payée.

### 2.3 Intégration paiement
- Stripe Checkout initialisé avec `betterAuthUserId` comme metadata.
- Webhook Stripe → middleware Payload : vérifie signature, valide paiement, met à jour `users.serviceType`, émet évènement "service:activated".
- En cas d'échec paiement, conserve session mais marque `tunnelStatus = "payment_failed"`.

## 3. Intégration front-end

### 3.1 Provider & hooks
- Nouveau `BetterAuthProvider` encapsulant le SDK.
- Hook `useBetterAuth` exposant : `user`, `isAuthenticated`, `login`, `logout`, `requireServiceType`.
- Guard de route `withBetterAuth` pour pages protégées.

### 3.2 Services & API
- `ApiService` nettoyé : suppression interceptors JWT → rely sur cookies.
- Ajout d'un helper `api.requireServiceAccess(serviceType)` redirigeant si absence d'accès.

### 3.3 UI & formulaires
- Formulaires Better Auth (login, signup, reset) intégrés dans le tunnel.
- Gestion MFA inline si activée (Better Auth challenge component).
- Pages d'état (succès, pending paiement, erreur) stylées selon design system existant.

## 4. Intégration backend Payload

### 4.1 Hooks d'authentification
- Hooks Payload `beforeOperation` : valident le cookie/session Better Auth avant chaque requête sensible.
- `afterRead` : enrichit la réponse (et `req.user`) avec `serviceType`, `tunnelStatus`, métadonnées Better Auth.
- `afterLogin` / `afterChange` : synchronisent les actions Better Auth (activation, suspension, MFA) avec les documents `users`.

### 4.2 Modifications schéma `users`
- Champs à ajouter :
  - `betterAuthId` (string, unique).
  - `serviceType` (relation/enum).
  - `tunnelStatus` (enum: `pending_auth`, `pending_payment`, `active`, `payment_failed`).
  - `metadata` (JSON sécurisé pour stocker claims Better Auth).

### 4.3 Migration données
- Script `migrateUsersToBetterAuth` :
  - Crée comptes Better Auth pour utilisateurs existants (via API management).
  - Synchronise roles/serviceType.
  - Invalide anciens tokens Payload.

### 4.4 Webhooks & évènements
- Endpoint `/webhooks/better-auth` (login/logout/mfa events) pour audit.
- Endpoint `/webhooks/payment` pour activation service.
- Publie évènements internes (Queue) : `auth.userActivated`, `auth.paymentFailed`.

## 5. Sécurité & conformité

- Rotation des clés Better Auth via gestion centralisée (Vault/vercel secrets).
- Politique CSP : autoriser domaines Better Auth + Stripe.
- Cookies `SameSite=None` + `Secure` pour compatibilité tunnel paiement.
- Journalisation : logs JSON sans données sensibles (hash d'identifiants, pas de tokens).
- Tests de sécurité : OWASP auth, revocation tokens, corruption tunnel.

## 6. Plan de migration

1. **Phase 0** : Préparer infra (clés, env, middlewares en mode pass-through).
2. **Phase 1** : Activer Better Auth en parallèle (double write) + feature flag.
3. **Phase 2** : Migrer utilisateurs + basculer tunnel production.
4. **Phase 3** : Nettoyage anciens flux, monitoring renforcé 30 jours.
