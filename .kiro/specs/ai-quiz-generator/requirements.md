# Document des Exigences - Générateur de Quiz IA

## Introduction

Le système de génération automatique de quiz par IA doit permettre aux administrateurs de créer rapidement des quiz de qualité en utilisant l'intelligence artificielle. Le système doit intégrer un validateur de contenu, utiliser des prompts optimisés, et organiser les quiz générés par catégories pour faciliter la gestion et la découverte par les utilisateurs.

## Exigences

### Exigence 1

**User Story :** En tant qu'administrateur, je veux pouvoir générer automatiquement des quiz par IA depuis l'interface d'administration, afin de créer rapidement du contenu éducatif de qualité.

#### Critères d'Acceptation

1. QUAND l'administrateur accède à la collection Quizzes ALORS il DOIT voir un bouton "Générer avec IA"
2. QUAND l'administrateur clique sur "Générer avec IA" ALORS le système DOIT ouvrir un formulaire de configuration
3. QUAND le formulaire est soumis ALORS le système DOIT valider tous les paramètres requis
4. SI des paramètres sont manquants ALORS le système DOIT afficher des messages d'erreur spécifiques

### Exigence 2

**User Story :** En tant qu'administrateur, je veux configurer les paramètres de génération (sujet, catégorie, niveau, nombre de questions), afin de contrôler précisément le contenu généré.

#### Critères d'Acceptation

1. QUAND l'administrateur configure la génération ALORS il DOIT pouvoir sélectionner une catégorie existante
2. QUAND l'administrateur saisit le sujet ALORS le système DOIT valider que le texte fait entre 10 et 200 caractères
3. QUAND l'administrateur choisit le niveau ALORS il DOIT pouvoir sélectionner PASS, LAS ou les deux
4. QUAND l'administrateur définit le nombre de questions ALORS il DOIT être entre 5 et 20 questions

### Exigence 3

**User Story :** En tant que système, je veux utiliser des prompts optimisés pour générer des questions de qualité médicale, afin d'assurer la pertinence et l'exactitude du contenu éducatif.

#### Critères d'Acceptation

1. QUAND le système génère des questions ALORS il DOIT utiliser un prompt spécialisé pour le domaine médical
2. QUAND le prompt est exécuté ALORS il DOIT inclure le contexte du niveau d'études (PASS/LAS)
3. QUAND l'IA génère le contenu ALORS le système DOIT demander des questions avec 4 options et une seule bonne réponse
4. QUAND les questions sont générées ALORS elles DOIVENT inclure des explications détaillées

### Exigence 4

**User Story :** En tant que système, je veux valider automatiquement le contenu généré par l'IA, afin de garantir la qualité et la conformité avant publication.

#### Critères d'Acceptation

1. QUAND l'IA génère des questions ALORS le système DOIT valider la structure JSON
2. QUAND la validation structurelle passe ALORS le système DOIT vérifier que chaque question a exactement 4 options
3. QUAND les options sont validées ALORS le système DOIT s'assurer qu'une seule option est marquée comme correcte
4. SI la validation échoue ALORS le système DOIT permettre une nouvelle tentative de génération

### Exigence 5

**User Story :** En tant qu'administrateur, je veux voir le progrès de génération en temps réel, afin de comprendre l'état du processus et identifier d'éventuels problèmes.

#### Critères d'Acceptation

1. QUAND la génération commence ALORS le système DOIT afficher une barre de progression
2. QUAND chaque étape se termine ALORS le système DOIT mettre à jour le statut affiché
3. QUAND une erreur survient ALORS le système DOIT afficher un message d'erreur détaillé
4. QUAND la génération se termine ALORS le système DOIT rediriger vers le quiz créé

### Exigence 6

**User Story :** En tant qu'administrateur, je veux que les quiz générés soient automatiquement organisés par catégorie, afin de faciliter la gestion et la découverte du contenu.

#### Critères d'Acceptation

1. QUAND un quiz est généré ALORS il DOIT être automatiquement assigné à la catégorie sélectionnée
2. QUAND le quiz est créé ALORS il DOIT avoir un titre descriptif basé sur le sujet
3. QUAND les questions sont ajoutées ALORS elles DOIVENT hériter de la catégorie du quiz
4. QUAND la génération est terminée ALORS le quiz DOIT être visible dans la liste filtrée par catégorie

### Exigence 7

**User Story :** En tant qu'utilisateur frontend, je veux pouvoir filtrer et découvrir les quiz par catégorie, afin de trouver facilement le contenu pertinent pour mes études.

#### Critères d'Acceptation

1. QUAND l'utilisateur accède aux quiz ALORS il DOIT voir les catégories disponibles
2. QUAND l'utilisateur sélectionne une catégorie ALORS seuls les quiz de cette catégorie DOIVENT s'afficher
3. QUAND l'utilisateur consulte un quiz ALORS il DOIT voir clairement sa catégorie
4. QUAND de nouveaux quiz sont générés ALORS ils DOIVENT apparaître immédiatement dans les filtres

### Exigence 8

**User Story :** En tant que système, je veux logger et auditer toutes les générations de quiz IA, afin de tracer l'utilisation et identifier les améliorations possibles.

#### Critères d'Acceptation

1. QUAND une génération commence ALORS le système DOIT enregistrer l'utilisateur et les paramètres
2. QUAND la génération se termine ALORS le système DOIT logger le succès et les métadonnées
3. QUAND une erreur survient ALORS le système DOIT enregistrer les détails de l'échec
4. QUAND l'administrateur consulte les logs ALORS il DOIT voir l'historique des générations

### Exigence 9

**User Story :** En tant qu'administrateur, je veux pouvoir prévisualiser et modifier les quiz générés avant publication, afin de m'assurer de leur qualité finale.

#### Critères d'Acceptation

1. QUAND un quiz est généré ALORS l'administrateur DOIT pouvoir le prévisualiser
2. QUAND l'administrateur prévisualise ALORS il DOIT voir toutes les questions et réponses
3. QUAND l'administrateur identifie des erreurs ALORS il DOIT pouvoir modifier le contenu
4. QUAND les modifications sont terminées ALORS l'administrateur DOIT pouvoir publier le quiz

### Exigence 10

**User Story :** En tant que système, je veux gérer les erreurs et limitations de l'API IA de manière robuste, afin d'assurer une expérience utilisateur stable.

#### Critères d'Acceptation

1. QUAND l'API IA est indisponible ALORS le système DOIT afficher un message d'erreur informatif
2. QUAND la limite de tokens est atteinte ALORS le système DOIT proposer de réessayer plus tard
3. QUAND le contenu généré est invalide ALORS le système DOIT permettre une nouvelle tentative
4. QUAND plusieurs échecs consécutifs surviennent ALORS le système DOIT suggérer une création manuelle