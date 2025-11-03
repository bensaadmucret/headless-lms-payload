/**
 * Extensions de types pour Better Auth
 */

import type { User as BetterAuthUser } from 'better-auth'

// Extension du type User de Better Auth pour inclure le rôle
export interface ExtendedUser extends BetterAuthUser {
  role: 'admin' | 'student'
}

// Type pour les contextes de hooks Better Auth
export interface BetterAuthContext {
  user: ExtendedUser
  request: Request
  path: string
}

// Type pour les handlers de hooks
export type BetterAuthHookHandler = (context: BetterAuthContext) => Promise<ExtendedUser | void>

// Type pour les matchers de hooks
export type BetterAuthHookMatcher = (context: BetterAuthContext) => boolean