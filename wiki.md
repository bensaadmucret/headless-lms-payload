# Wiki des Collections Payload LMS

Bienvenue dans le wiki technique du backoffice LMS. Ce guide explique, de façon pédagogique, comment utiliser chaque collection principale du projet.

---

## Sommaire

- [Utilisateurs (Users)](#utilisateurs-users)
- [Badges (Badges)](#badges-badges)
- [Cours (Courses)](#cours-courses)
- [Devoirs (Assignments)](#devoirs-assignments)
- [Sections (Sections)](#sections-sections)
- [Médias (Media)](#médias-media)
- [Catégories (Categories)](#catégories-categories)
- [Quiz (Quizzes)](#quiz-quizzes)
- [Progression (Progress)](#progression-progress)
- [Prérequis (Prerequisites)](#prérequis-prerequisites)
- [Pages (Pages)](#pages-pages)
- [Posts (Posts)](#posts-posts)
- [Historique (AuditLogs)](#historique-auditlogs)

---

## Utilisateurs (Users)

Gère tous les comptes utilisateurs (apprenants, formateurs, admins, superadmins).

- **Champs clés :**
  - email
  - nom
  - rôle
  - badges
  - progression
- **Actions possibles :**
  - création
  - modification
  - gestion des rôles
  - attribution de badges
- **Bonnes pratiques :**
  - Utiliser les rôles pour sécuriser les accès.
  - Toujours renseigner l’email et le rôle.
  - Associer les badges et la progression pour le suivi personnalisé.

---

## Badges (Badges)

Permet d’attribuer des badges de progression ou de réussite aux utilisateurs.

- **Champs clés :**
  - nom
  - description
  - visibilité selon le rôle
  - actif/inactif
- **Actions possibles :**
  - création
  - édition
  - suppression
  - attribution à un utilisateur
- **Bonnes pratiques :**
  - Utiliser la visibilité pour restreindre certains badges à des rôles précis.
  - Activer/désactiver un badge sans le supprimer.

---

## Cours (Courses)

Centralise les informations sur chaque cours proposé sur la plateforme.

- **Champs clés :**
  - titre
  - description
  - niveau
  - auteur
  - sections
- **Actions possibles :**
  - création
  - édition
  - organisation par niveau
- **Bonnes pratiques :**
  - Structurer les cours par sections pour une meilleure navigation.
  - Lier chaque cours à un auteur (formateur).

---

## Devoirs (Assignments)

Permet de gérer les devoirs à rendre pour chaque cours.

- **Champs clés :**
  - titre
  - description
  - date limite
  - cours lié
- **Actions possibles :**
  - création
  - modification
  - association à un cours
- **Bonnes pratiques :**
  - Associer chaque devoir à un cours existant.
  - Utiliser la date limite pour gérer les échéances.

---

## Sections (Sections)

Découpe un cours en différentes parties (modules, chapitres).

- **Champs clés :**
  - titre
  - ordre
  - cours lié
- **Actions possibles :**
  - ajout
  - modification
  - organisation par ordre
- **Bonnes pratiques :**
  - Utiliser l’ordre pour structurer la progression pédagogique.

---

## Médias (Media)

Gère tous les fichiers médias (images, vidéos, documents) utilisés sur la plateforme.

- **Champs clés :**
  - fichier
  - texte alternatif
  - légende
  - type
- **Actions possibles :**
  - upload
  - édition des métadonnées
  - suppression
- **Bonnes pratiques :**
  - Toujours renseigner le texte alternatif pour l’accessibilité.

---

## Catégories (Categories)

Classe les contenus (cours, posts, etc.) par thématique.

- **Champs clés :**
  - titre
  - slug
- **Actions possibles :**
  - création
  - édition
  - suppression
- **Bonnes pratiques :**
  - Utiliser des slugs uniques pour chaque catégorie.

---

## Quiz (Quizzes)

Permet de créer des quiz pour évaluer les apprenants.

- **Champs clés :**
  - titre
  - liste de questions/réponses
  - cours associé
- **Actions possibles :**
  - création
  - édition
  - association à un cours
- **Bonnes pratiques :**
  - Rédiger des questions claires et variées.

---

## Progression (Progress)

Suit la progression des utilisateurs dans les cours et les leçons.

- **Champs clés :**
  - utilisateur
  - leçon
  - statut (non commencé, en cours, terminé)
  - score
- **Actions possibles :**
  - mise à jour automatique lors de l’avancement
- **Bonnes pratiques :**
  - Utiliser pour personnaliser l’expérience utilisateur.

---

## Prérequis (Prerequisites)

Définit les conditions d’accès à certains cours ou contenus.

- **Champs clés :**
  - nom
  - description
- **Actions possibles :**
  - création
  - édition
  - association à un cours
- **Bonnes pratiques :**
  - Lier les prérequis aux cours avancés pour guider la progression.

---

## Pages (Pages)

Gère les pages de contenu statique (accueil, à propos, etc.).

- **Champs clés :**
  - titre
  - slug
  - contenu riche
- **Actions possibles :**
  - création
  - édition
  - publication
- **Bonnes pratiques :**
  - Utiliser le slug pour le routage frontend.

---

## Posts (Posts)

Permet la publication d’articles, d’actualités ou de ressources.

- **Champs clés :**
  - titre
  - contenu
  - auteur
  - date de publication
- **Actions possibles :**
  - rédaction
  - édition
  - publication
  - archivage
- **Bonnes pratiques :**
  - Associer chaque post à un auteur.

---

## Historique (AuditLogs)

Trace toutes les actions importantes réalisées sur la plateforme (création, modification, suppression, changements de rôles, attribution de badge, etc.).

- **Champs clés :**
  - utilisateur
  - action
  - collection
  - documentId
  - différence
  - timestamp
- **Accès :** réservé aux superadmins (admin Payload et API)
- **Bonnes pratiques :**
  - Utiliser pour l’audit, la traçabilité et la sécurité.
  - Ne pas supprimer les logs pour garantir l’intégrité historique.

---

Pour toute question ou contribution, merci de respecter la structure et de documenter chaque nouvelle collection ou champ ajouté.

> UX-friendly, moderne, et sécurisé, ce guide évoluera avec le projet.
