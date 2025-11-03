import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

const baseURL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient()],
  // Configuration pour le développement local
  fetchOptions: {
    credentials: 'include', // Important pour les cookies
    headers: {
      'Content-Type': 'application/json',
    },
  },
  fetchOptions: {
    credentials: 'include', // Important pour les cookies
    headers: {
      'Content-Type': 'application/json',
    },
    onError(error) {
      console.error('[BetterAuth] Erreur de requête:', error);
      if (error.error.status === 429) {
        // TODO: centraliser la gestion du rate limiting côté UI si nécessaire
        console.warn('[BetterAuth] Trop de requêtes', error);
      }
    },
    onRequest(context) {
      console.log('[BetterAuth] Requête:', context.url);
    },
    onResponse(context) {
      console.log('[BetterAuth] Réponse:', context.response.status);
    },
  },
});

export const { signUp, signIn, signOut, useSession } = authClient;

export type Session = typeof authClient.$Infer.Session;

// possibilité d'écouter les changements de session si besoin applicatif
authClient.$store.listen('$sessionSignal', async () => {
  // noop pour l'instant
});
