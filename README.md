[![codecov](https://codecov.io/gh/bensaadmucret/headless-lms-payload/branch/main/graph/badge.svg)](https://codecov.io/gh/bensaadmucret/headless-lms-payload)
[![CI](https://github.com/bensaadmucret/headless-lms-payload/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/bensaadmucret/headless-lms-payload/actions/workflows/ci.yml)

# 🎓 Backoffice LMS – Payload CMS

> Plateforme de gestion pédagogique moderne, modulaire et extensible basée sur Payload CMS.

---

## 🚀 Installation & Démarrage rapide

### Prérequis
- Node.js 18+ 
- PostgreSQL 14+
- npm (pas de yarn/pnpm)

### Installation

```bash
# 1. Cloner le projet
git clone <repository-url>
cd payload-cms

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres (DATABASE_URI, PAYLOAD_SECRET, etc.)

# 4. Initialiser la base de données
npm run payload migrate

# 5. Créer un utilisateur admin
npm run payload seed

# 6. Lancer le serveur de développement
npm run dev
```

Le serveur démarre sur `http://localhost:3000`  
Admin: `http://localhost:3000/admin`

### 📬 Emails en local (MailHog)

Un service MailHog est inclus pour intercepter les emails (invitation Better Auth, reset password) en environnement local.

```bash
# (déjà fait) copier .env et configurer vos variables

# redémarrer l'infrastructure docker pour lancer MailHog
npm run docker:down && npm run docker:up
```

- SMTP est automatiquement configuré (`mailhog:1025`).
- Consultez les emails envoyés depuis l'interface MailHog : http://localhost:8025.

### 🧪 Tests

```bash
# Tests unitaires
npm run test:vitest

# Tests avec couverture
npm run test:vitest -- --coverage

# Tests en mode watch
npm run test:vitest:ui

# Linter
npm run lint

# Vérifier les duplications
npm run ci:dup

# Détecter le code mort
npm run ci:prune
```

---

Ce backoffice propose une interface d’administration UX-friendly, permettant de gérer l’ensemble des contenus pédagogiques, utilisateurs et progressions.

## Collections principales

| Collection      
| Rôle / Description

| **Users**       | Gestion des comptes utilisateurs et administrateurs                                |
| **Pages**       | Pages de contenu statique ou éditorial                                            |
| **Posts**       | Articles de blog ou actualités                                                    |
| **Media**       | Gestionnaire de médias (images, vidéos, documents)                                |
| **Categories**  | Taxonomie pour organiser les contenus                                             |
| **Courses**     | Cours principaux du LMS, chaque cours regroupe des sections, leçons, etc.         |
| **Sections**    | Découpage d’un cours en grandes parties ou modules                                |
| **Lessons**     | Leçons individuelles, rattachées à une section ou un cours                        |
| **Assignments** | Devoirs ou exercices à rendre par les apprenants                                  |
| **Quizzes**     | Quiz d’évaluation associés à des leçons ou sections                               |
| **Prerequisites**| Gestion des prérequis entre cours/sections/leçons                                |
| **Progress**    | Suivi de la progression des apprenants                                            |
| **Badges**      | Badges de progression, réussite ou participation attribuables aux utilisateurs     |

## Globals

- **Header** : Configuration du menu de navigation principal du site
- **Footer** : Configuration du pied de page

## Plugins et architecture

- Utilisation de `@payloadcms/db-postgres` pour la persistance des données
- Prise en charge des relations avancées (parent-enfant) via le plugin `payload-nested-docs` (prévu)
- Gestion des accès, hooks et personnalisation avancée via Payload

---

### Exemple d’arborescence pédagogique

```
Course
 └── Section(s)
      └── Lesson(s)
           ├── Assignment(s)
           └── Quiz(zes)
```

---

**Remarques :**
- Toutes les collections sont configurées pour tirer parti des fonctionnalités avancées de Payload (drafts, access control, rich text, etc.).
- Le projet est pensé pour être facilement extensible (ajout de badges, forums, ressources, etc.).
- L’architecture respecte les standards modernes, la séparation des responsabilités et la sécurité des données.

---

## 🆕 Nouvelles fonctionnalités SuperAdmin (mai 2025)

- **Notification email intelligente lors d’un changement de statut de tenant**
  - Envoi automatique d’un email (template Handlebars) aux admins et au contact principal du tenant lors d’un changement de statut (`active`, `suspended`, etc.)
  - Template multilingue (français/anglais), logo personnalisable, variables dynamiques injectées (nom du tenant, ancien/nouveau statut, etc.)
  - Gestion de la langue dynamique selon le contact du tenant
- **Audit des notifications**
  - Nouvelle collection `NotificationLogs` pour tracer chaque notification envoyée ou échouée (destinataire, statut, payload, erreur éventuelle)
  - Logging automatique pour l’audit et la conformité RGPD
- **CRUD avancé multi-tenant**
  - Endpoints CRUD sécurisés pour la gestion des tenants, plans d’abonnement, métriques système, logs d’audit
  - Gestion de la suspension/activation des tenants via un simple PUT sur le champ `status`
- **Extensible & sécurisé**
  - Architecture conçue pour supporter d’autres canaux de notification (Slack, webhook, etc.)
  - Sécurité avancée : seuls les superadmins peuvent effectuer les actions critiques

## 📚 Documentation

- **[Architecture](./docs/ARCHITECTURE.md)** - Diagrammes et structure du projet
- **[API Documentation](./docs/API.md)** - Endpoints et exemples d'utilisation
- **[Rapport Qualité](./RAPPORT_QUALITE_CODE.md)** - Analyse de qualité du code
- Collections techniques: `/src/collections`
- Templates email: `/src/emailTemplates`

## 🔗 Liens Utiles

- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
