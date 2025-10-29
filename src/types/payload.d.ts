// Types globaux pour Payload CMS : centraliser ici tous les slugs de collection !
import type { CollectionSlug as PayloadCollectionSlug } from 'payload';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction as ExpressNextFunction,
} from 'express';

declare global {
  interface CollectionSlug extends PayloadCollectionSlug {
    tenants: string;
    'subscription-plans': string;
    courses: string;
    quizzes: string;
    users: string;
    posts: string;
    categories: string;
    tags: string;
    media: string;
    settings: string;
    audit: string;
    progressions: string;
    'webhook-retry-queue': string;
  }

  // Types pour les endpoints personnalisés
  interface Endpoint {
    path: string;
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    handler: (
      req: PayloadRequest,
      res: ExpressResponse,
      next: ExpressNextFunction,
    ) => Promise<void> | void;
  }

  // Interface pour les réponses API standardisées
  interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }

  // Extension de PayloadRequest pour inclure les propriétés personnalisées
  interface PayloadRequest extends ExpressRequest {
    user?: {
      id: string;
      email: string;
      role?: string;
      [key: string]: any;
    };
    payload: any; // Type plus spécifique possible selon les besoins
  }
}

export {};
