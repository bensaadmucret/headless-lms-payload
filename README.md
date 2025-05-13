# Backoffice LMS – Payload CMS

Ce backoffice s’appuie sur Payload CMS et sert de cœur à la gestion d’un LMS (Learning Management System) moderne, modulaire et évolutif. Il propose une interface d’administration UX-friendly, permettant de gérer l’ensemble des contenus pédagogiques, utilisateurs et progressions.

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

