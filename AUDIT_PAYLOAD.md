# Rapport d’Audit Payload CMS

---

## 1. Généralités & Configuration

### 1.1 Fichier principal : `src/payload.config.ts`

- **Résumé** :  
  Le fichier centralise la configuration Payload, l’import des collections, des plugins, des hooks, la configuration de la base Postgres, le setup des globals (Header, Footer, CorsConfig), la gestion des jobs, et la configuration de l’admin.
- **Collections déclarées** :
  - Pages
  - Posts
  - Media
  - Categories
  - Users
  - Courses
  - Lessons
  - Prerequisites
  - Quizzes
  - Progress
  - Sections
  - Assignments
  - Badges
  - ColorSchemes
  - SubscriptionPlans
  - Tenants
  - SystemMetrics
- **Globals** :
  - CorsConfig
  - Header
  - Footer
- **Plugins** :  
  Plugins custom et officiels (importés via `./plugins`)
- **Jobs** :  
  Gestion d’accès custom pour l’exécution des jobs (authentification par user ou header Bearer avec secret CRON).
- **Sécurité** :  
  Secret Payload injecté par env, CORS configuré dynamiquement.

### 1.2 Dépendances & scripts (`package.json`)

- **Payload** : version 3.39.1
- **Base de données** : `@payloadcms/db-postgres`
- **Plugins Payload** : form-builder, nested-docs, redirects, search, seo, admin-bar, live-preview, etc.
- **Autres outils** : Next.js, Tailwind, Sharp, React, etc.
- **Scripts utiles** :
  - `payload` : lance Payload CLI
  - `generate:types` : génère les types TypeScript à partir de la config
  - `generate:importmap` : génère l’import map Payload
  - `test:vitest` : tests unitaires
  - `format` : prettier sur tout le code
  - `lint` : vérification du code

### 1.3 Types générés (`src/payload-types.ts`)

- **Types exhaustifs pour chaque collection, global, block, etc.**
- **Point d’attention** :  
  Ces types sont la référence pour la structure des données exposées par l’API Payload (à utiliser pour le mapping Symfony).

---

## 2. Collections Payload

### Liste des collections (dossier `src/collections/`)

| Collection            | Fichier/Dossier                      | Description synthétique           |
|-----------------------|--------------------------------------|-----------------------------------|
| Assignments           | Assignments.ts                       | Devoirs, gestion des rendus       |
| AuditLogs             | AuditLogs.ts                         | Logs d’audit système              |
| Badges                | Badges.ts                            | Badges de progression             |
| Categories            | Categories.ts                        | Catégorisation des contenus       |
| ColorSchemes          | ColorSchemes.ts                      | Thèmes de couleurs                |
| Courses               | Courses.ts                           | Cours, entité principale LMS      |
| Lessons               | Lessons.ts                           | Leçons, sous-unité de cours       |
| Media                 | Media.ts                             | Gestion des fichiers médias       |
| Pages                 | Pages/                               | Pages CMS                         |
| Posts                 | Posts/                               | Articles de blog                  |
| Prerequisites         | Prerequisites.ts                     | Prérequis pour les cours          |
| Progress              | Progress.ts                          | Suivi de progression utilisateur  |
| Quizzes               | Quizzes.ts                           | Quiz et évaluations               |
| Sections              | Sections.ts                          | Sections de cours                 |
| SubscriptionPlans     | SubscriptionPlans.ts                 | Plans d’abonnement                |
| SystemMetrics         | SystemMetrics.ts                     | Statistiques système              |
| Tenants               | Tenants.ts                           | Gestion multi-tenants             |
| Users                 | Users/                               | Utilisateurs                      |

#### Exemple de structure détaillée (extrait de `payload-types.ts`)

- **Post**
  - id: number
  - title: string
  - heroImage?: Media
  - content: RichText
  - categories?: Category[]
  - publishedAt?: string
  - slug?: string
  - updatedAt: string
  - createdAt: string
  - _status?: 'draft' | 'published'

- **User**
  - id: number
  - name?: string
  - role: 'superadmin' | 'admin' | 'teacher' | 'student'
  - email: string
  - password?: string
  - resetPasswordToken?: string
  - ... (autres champs de sécurité)

#### Pour chaque collection :
- **Structure complète** : voir `payload-types.ts` (types exhaustifs)
- **Hooks, access, policies** : à détailler par fichier (ex : `src/collections/Posts/index.ts`)
- **Rôles/permissions** : gérés par le champ `role` dans Users, et par les access policies de chaque collection

---

## 3. Blocks & Champs Réutilisables

- **Blocks** :  
  Dossier `src/blocks/` (ex : CallToActionBlock, ContentBlock, BannerBlock, CodeBlock…)
- **Champs réutilisables** :  
  Dossier `src/fields/` (ex : defaultLexical, customFields, etc.)

---

## 4. Endpoints & API

- **Endpoints custom** :  
  Dossier `src/endpoints/` (à détailler pour chaque endpoint)
- **Routes REST/GraphQL** :  
  Générées automatiquement par Payload pour chaque collection (CRUD, auth, etc.)
- **Points d’entrée spécifiques** :  
  Ex : onboarding, portail client, BFF (à détailler selon la logique métier)

---

## 5. Hooks, Policies, Middlewares, Access Control

- **Hooks globaux et spécifiques** :  
  Dossier `src/hooks/`
- **Policies d’accès** :  
  Dossier `src/access/`
- **Middlewares** :  
  À identifier dans les plugins ou la config

---

## 6. Rôles, Permissions & Sécurité

- **Gestion des rôles** :  
  Champ `role` dans Users, access policies par collection
- **Mapping des accès** :  
  Définis dans les fichiers d’access ou dans la config de chaque collection
- **Sécurité** :  
  - Authentification JWT par Payload
  - Sécurité des endpoints jobs (secret CRON)
  - CORS restrictif

---

## 7. Utilitaires, Seeds, Scripts

- **Utilitaires** :  
  Dossier `src/utilities/` (ex : getURL, helpers divers)
- **Seeds/scripts init** :  
  À identifier dans le projet (ex : scripts de seed, migration, etc.)

---

## 8. Annexes

- **Documentation interne** :  
  Fichiers markdown à la racine (`architecture-saas-final.md`, `super_admin_analysis.md`, `schema-architecture.md`, etc.)
- **Guides, analyses, notes d’architecture** :  
  À utiliser pour la migration et la conception du Hub Symfony

---

# Détail des Collections Payload

---

### 2.1. Assignments

- **Fichier** : `src/collections/Assignments.ts`
- **Description** : Gestion des devoirs/rendus dans le LMS.
- **Structure** (extrait type) :
  - id: number
  - title: string
  - description?: string
  - dueDate?: string
  - course: number | Course
  - user: number | User
  - status: 'pending' | 'submitted' | 'graded'
  - grade?: number
  - createdAt: string
  - updatedAt: string
- **Access/Policies** : Définir qui peut créer/soumettre/corriger (voir fichier access associé si présent).
- **Hooks** : Contrôle de cohérence, notifications (à vérifier dans le code).

---

### 2.2. AuditLogs

- **Fichier** : `src/collections/AuditLogs.ts`
- **Description** : Logs d’audit pour traçabilité des actions.
- **Structure** (extrait type) :
  - id: number
  - action: string
  - user: number | User
  - target: string
  - details?: string
  - createdAt: string
- **Hooks** : Création automatique à chaque action critique.

---

### 2.3. Badges

- **Fichier** : `src/collections/Badges.ts`
- **Description** : Badges de progression/utilisateur.
- **Structure** :
  - id: number
  - name: string
  - description?: string
  - icon?: Media
  - criteria: string
  - createdAt: string
  - updatedAt: string

---

### 2.4. Categories

- **Fichier** : `src/collections/Categories.ts`
- **Description** : Catégorisation de contenus (cours, posts…).
- **Structure** :
  - id: number
  - title: string
  - slug?: string
  - parent?: number | Category
  - createdAt: string
  - updatedAt: string

---

### 2.5. ColorSchemes

- **Fichier** : `src/collections/ColorSchemes.ts`
- **Description** : Thèmes de couleurs pour l’UI.
- **Structure** :
  - id: number
  - name: string
  - colors: object
  - createdAt: string
  - updatedAt: string

---

### 2.6. Courses

- **Fichier** : `src/collections/Courses.ts`
- **Description** : Cours du LMS.
- **Structure** :
  - id: number
  - title: string
  - description: string
  - teacher: number | User
  - sections: Section[]
  - categories?: Category[]
  - publishedAt?: string
  - createdAt: string
  - updatedAt: string

---

### 2.7. Lessons

- **Fichier** : `src/collections/Lessons.ts`
- **Description** : Leçons, sous-unité de cours.
- **Structure** :
  - id: number
  - title: string
  - content: RichText
  - course: number | Course
  - section: number | Section
  - createdAt: string
  - updatedAt: string

---

### 2.8. Media

- **Fichier** : `src/collections/Media.ts`
- **Description** : Gestion des fichiers médias.
- **Structure** :
  - id: number
  - user: number | User
  - alt?: string
  - caption?: RichText
  - mimeType?: string
  - filesize?: number
  - filename?: string
  - createdAt: string
  - updatedAt: string

---

### 2.9. Pages

- **Dossier** : `src/collections/Pages/`
- **Description** : Pages CMS (vitrine, landing, etc.).
- **Structure** :
  - id: number
  - title: string
  - hero: { type: 'none' | 'highImpact' | ... }
  - content: RichText
  - slug?: string
  - publishedAt?: string
  - createdAt: string
  - updatedAt: string

---

### 2.10. Posts

- **Dossier** : `src/collections/Posts/`
- **Description** : Articles de blog.
- **Structure** :
  - id: number
  - title: string
  - heroImage?: Media
  - content: RichText
  - categories?: Category[]
  - publishedAt?: string
  - slug?: string
  - createdAt: string
  - updatedAt: string

---

### 2.11. Prerequisites

- **Fichier** : `src/collections/Prerequisites.ts`
- **Description** : Prérequis pour les cours.
- **Structure** :
  - id: number
  - course: number | Course
  - prerequisite: number | Course
  - createdAt: string
  - updatedAt: string

---

### 2.12. Progress

- **Fichier** : `src/collections/Progress.ts`
- **Description** : Suivi de la progression utilisateur.
- **Structure** :
  - id: number
  - user: number | User
  - course: number | Course
  - lesson: number | Lesson
  - status: string
  - createdAt: string
  - updatedAt: string

---

### 2.13. Quizzes

- **Fichier** : `src/collections/Quizzes.ts`
- **Description** : Quiz et évaluations.
- **Structure** :
  - id: number
  - title: string
  - questions: object[]
  - course: number | Course
  - createdAt: string
  - updatedAt: string

---

### 2.14. Sections

- **Fichier** : `src/collections/Sections.ts`
- **Description** : Sections de cours.
- **Structure** :
  - id: number
  - title: string
  - course: number | Course
  - order: number
  - createdAt: string
  - updatedAt: string

---

### 2.15. SubscriptionPlans

- **Fichier** : `src/collections/SubscriptionPlans.ts`
- **Description** : Plans d’abonnement.
- **Structure** :
  - id: number
  - name: string
  - price: number
  - features: string[]
  - createdAt: string
  - updatedAt: string

---

### 2.16. SystemMetrics

- **Fichier** : `src/collections/SystemMetrics.ts`
- **Description** : Statistiques système.
- **Structure** :
  - id: number
  - metric: string
  - value: number
  - createdAt: string
  - updatedAt: string

---

### 2.17. Tenants

- **Fichier** : `src/collections/Tenants.ts`
- **Description** : Gestion multi-tenants.
- **Structure** :
  - id: number
  - name: string
  - domain: string
  - owner: number | User
  - createdAt: string
  - updatedAt: string

---

### 2.18. Users

- **Dossier** : `src/collections/Users/`
- **Description** : Utilisateurs du système.
- **Structure** :
  - id: number
  - name?: string
  - role: 'superadmin' | 'admin' | 'teacher' | 'student'
  - email: string
  - password?: string
  - ... (autres champs sécurité)
  - createdAt: string
  - updatedAt: string

---

## 3. Endpoints & API

- **Endpoints custom** :  
  Dossier `src/endpoints/` (ex : endpoints d’onboarding, BFF, intégrations externes, etc.)
- **Routes REST/GraphQL** :  
  Générées automatiquement pour chaque collection (CRUD, auth, recherche, etc.)
- **Points d’entrée spécifiques** :  
  À détailler selon la logique métier (ex : onboarding, portail client, SuperAdmin, etc.)

---

## 4. Hooks, Policies, Middlewares, Access Control

- **Hooks globaux et spécifiques** :  
  Dossier `src/hooks/`
- **Policies d’accès** :  
  Dossier `src/access/` (policies par collection ou globales)
- **Middlewares** :  
  À identifier dans les plugins ou la config (souvent via `src/plugins/`)

---

## 5. Blocks & Champs Réutilisables

- **Blocks personnalisés** :  
  Dossier `src/blocks/` (ex : CallToActionBlock, ContentBlock, BannerBlock, etc.)
- **Champs réutilisables** :  
  Dossier `src/fields/` (ex : defaultLexical, customFields, etc.)

---

## 6. Utilitaires, Seeds, Scripts

- **Utilitaires** :  
  Dossier `src/utilities/` (helpers, fonctions partagées, ex : getURL)
- **Seeds/scripts init** :  
  À identifier dans le projet (ex : scripts de seed, migration, etc.)

---

## 7. Sécurité & Rôles

- **Gestion des rôles** :  
  Champ `role` dans Users, access policies par collection
- **Mapping des accès** :  
  Définis dans les fichiers d’access ou dans la config de chaque collection
- **Sécurité** :  
  - Authentification JWT par Payload
  - Sécurité des endpoints jobs (secret CRON)
  - CORS restrictif

---

## 8. Annexes & Documentation

- **Documentation interne** :  
  Fichiers markdown à la racine (`architecture-saas-final.md`, `super_admin_analysis.md`, `schema-architecture.md`, etc.)
- **Guides, analyses, notes d’architecture** :  
  À exploiter pour la migration et la conception du Hub Symfony

---

# Points d’attention pour la migration Symfony

- **Mapping des types** : Utiliser les interfaces de `payload-types.ts` pour générer les entités Doctrine/API Platform.
- **Sécurité** : Adapter les policies et hooks Payload en listeners/event subscribers Symfony.
- **Endpoints** : Reproduire les endpoints custom Payload via des contrôleurs Symfony (API Platform/BFF).
- **Gestion des rôles** : Mapper le champ `role` et les policies sur le système de sécurité Symfony.
- **Blocks/Fields réutilisables** : Utiliser des ValueObjects ou des Embedded dans Doctrine.
- **Utilitaires** : Réécrire les helpers critiques pour Symfony si besoin.

---

Ce rapport est prêt à servir de référence technique pour la migration ou l’intégration de ton Hub Symfony connecté à Payload.
