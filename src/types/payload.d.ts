// Types globaux pour Payload CMS : centraliser ici tous les slugs de collection !
// Types globaux pour Payload CMS : centraliser ici tous les slugs de collection !
import type { CollectionSlug as PayloadCollectionSlug } from 'payload';

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
  }
}

export {};
