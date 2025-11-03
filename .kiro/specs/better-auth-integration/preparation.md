# Préparation & infrastructure — Journal d’implémentation

## T1.1 Audit des dépendances actuelles

### Front (dashboard-app)
- Auth hébergée dans `src/app/providers/AuthProvider.tsx`, `src/features/auth/**`.
- Librairies liées : `axios`, `jwt-decode`, wrappers maison dans `api.ts` et `authService.ts`.
- Aucune dépendance Better Auth installée. Ajustements prévus : ajout SDK Better Auth (provider React), client JS officiel, outils CLI éventuels.
- Dépendances à surveiller pour suppression future (post migration) : `jwt-decode`, logique locale de stockage de tokens.

### Backend (payload-cms)
- Auth custom via `SecurityService`, `securityMiddleware`, collection `users`.
- Dépendances actuelles : `axios`, middleware Express, hooks Payload sur mesure.
- Prévoir ajout client admin Better Auth (SDK Node/REST), gestion des webhooks.
- Inventaire en vue d’une migration : scripts de nettoyage de sessions (`clear-sessions.js`, `delete-recent-sessions.mjs`).

## T1.2 Sélection / installation des SDK Better Auth
- Cible front : `@better-auth/react` (provider + hooks) et `better-auth` core.
- Cible backend : `better-auth` (client Node/REST) + types associés.
- Mise à jour des `package.json` (front & backend) pour intégrer ces bibliothèques.
- Ajout de scripts npm pour synchroniser la configuration (`pnpm run better-auth:postinstall` côté front, `pnpm run better-auth:sync` côté backend) — placeholders pour les étapes ultérieures (rotation clé, sync webhooks).

## T1.3 Variables d’environnement
- Front : `VITE_BETTER_AUTH_DOMAIN`, `VITE_BETTER_AUTH_CLIENT_ID`.
- Backend : `BETTER_AUTH_BASE_URL`, `BETTER_AUTH_CLIENT_ID`, `BETTER_AUTH_CLIENT_SECRET`, `BETTER_AUTH_WEBHOOK_SECRET`.
- `.env` et `.env.example` mis à jour avec placeholders explicites.

## T1.4 Stockage sécurisé des secrets
- Documentation ajoutée pour rappeler l’usage d’un coffre (Vault / Secrets Manager) et la rotation régulière des clés.
- Scripts post-install créés comme rappel pour automatiser la synchronisation future.

## T1.5 Documentation
- README + docs d’environnement enrichis pour inclure les nouvelles variables et la procédure de setup Better Auth.
