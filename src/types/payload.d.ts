// Types globaux pour Payload CMS : centraliser ici tous les slugs de collection !
import { CollectionSlug } from 'payload';

declare global {
  interface CollectionSlug {
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
  }
}

// Type strict pour les slugs utilisables dans la configuration Payload
export type CollectionSlugLiteral =
  | 'tenants'
  | 'subscription-plans'
  | 'courses'
  | 'quizzes'
  | 'users'
  | 'posts'
  | 'categories'
  | 'tags'
  | 'media'
  | 'settings'
  | 'audit';

export {};

