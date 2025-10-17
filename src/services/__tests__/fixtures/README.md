# Test Fixtures Documentation

Cette documentation décrit l'organisation et l'utilisation des fixtures de test pour le système d'import JSON.

## Structure des Fixtures

```
fixtures/
├── valid/                     # Données valides pour tests positifs
├── invalid/                   # Données invalides pour tests d'erreur
├── edge-cases/               # Cas limites et tests de performance
├── FixtureValidationTests.test.ts    # Tests principaux utilisant les fixtures
├── EdgeCasePerformanceTests.test.ts  # Tests spécialisés cas limites
└── README.md                 # Cette documentation
```

## Fixtures Valides (`valid/`)

### `questions-simple.json`
- **Contenu** : 10 questions de cardiologie bien formées
- **Usage** : Tests de validation basique, intégration
- **Caractéristiques** :
  - Questions de difficulté variée (easy, medium, hard)
  - Catégorie homogène (Cardiologie)
  - Niveau PASS
  - Tags appropriés
  - Explications détaillées

### `questions-large.json`
- **Contenu** : 10 questions multispécialités
- **Usage** : Tests de performance modérée
- **Caractéristiques** :
  - Spécialités variées (Cardiologie, Pneumologie, Endocrinologie, etc.)
  - Niveaux mixtes (PASS, LAS, both)
  - Complexité progressive

### `learning-path-simple.json`
- **Contenu** : Parcours d'apprentissage en cardiologie (3 étapes)
- **Usage** : Tests de validation des parcours
- **Caractéristiques** :
  - Prérequis bien définis
  - Progression logique
  - Questions intégrées dans chaque étape
  - Durées estimées

### `flashcards-simple.json`
- **Contenu** : 10 flashcards de cardiologie
- **Usage** : Tests de validation des flashcards
- **Caractéristiques** :
  - Format recto/verso
  - Métadonnées complètes
  - Difficulté progressive

### `csv-export-sample.csv`
- **Contenu** : 5 questions au format CSV
- **Usage** : Tests de parsing CSV
- **Caractéristiques** :
  - Headers standards
  - Encodage UTF-8
  - Données bien formées

## Fixtures Invalides (`invalid/`)

### `malformed-json.json`
- **Contenu** : JSON avec erreurs de syntaxe
- **Usage** : Tests de robustesse du parser
- **Erreurs** : Virgules manquantes, accolades non fermées

### `missing-required-fields.json`
- **Contenu** : Questions avec champs obligatoires manquants
- **Usage** : Tests de validation des schémas
- **Erreurs** : 
  - Champs `options` manquants
  - `questionText` vide
  - `category` manquante
  - Métadonnées incomplètes

### `duplicate-questions.json`
- **Contenu** : Questions dupliquées
- **Usage** : Tests de détection de doublons
- **Caractéristiques** :
  - 3 occurrences de la même question
  - 2 occurrences d'une autre question
  - Questions uniques pour contraste

### `invalid-answer-options.json`
- **Contenu** : Problèmes dans les options de réponse
- **Usage** : Tests de validation des réponses
- **Erreurs** :
  - Aucune bonne réponse
  - Plusieurs bonnes réponses
  - Une seule option
  - Options identiques
  - Options vides
  - Trop d'options (>4)

### `invalid-field-values.json`
- **Contenu** : Valeurs de champs non conformes
- **Usage** : Tests de validation des énumérations
- **Erreurs** :
  - Difficulté invalide ("très-difficile")
  - Niveau invalide ("MASTER")
  - Types de données incorrects
  - Tags avec types mixtes

### `circular-dependencies.json`
- **Contenu** : Parcours avec dépendances circulaires
- **Usage** : Tests de validation des prérequis
- **Erreurs** :
  - Alpha → Gamma → Beta → Alpha
  - Prérequis inexistant

### `invalid-csv-structure.csv`
- **Contenu** : CSV mal formé
- **Usage** : Tests de robustesse du parser CSV
- **Erreurs** :
  - Réponses inexistantes (C, Z)
  - Questions vides
  - Problèmes d'échappement

## Fixtures Cas Limites (`edge-cases/`)

### `unicode-characters.json`
- **Contenu** : Questions avec caractères Unicode variés
- **Usage** : Tests d'internationalisation
- **Caractéristiques** :
  - Émojis médicaux (🫀💊🩺)
  - Symboles mathématiques (≥, ≤, ∞, α, β)
  - Caractères multilingues (arabe, chinois)
  - Symboles médicaux (♥)

### `very-long-text.json`
- **Contenu** : Textes de longueurs extrêmes
- **Usage** : Tests de limites de taille
- **Caractéristiques** :
  - Question ultra-longue (>1000 caractères)
  - Explication très détaillée (>2000 caractères)
  - Question minimale (1 caractère)
  - Options de longueurs variées

### `special-medical-terms.json`
- **Contenu** : Terminologie médicale complexe
- **Usage** : Tests de vocabulaire spécialisé
- **Termes** :
  - Tétralogie de Fallot
  - Pneumoultramicroscopicsilicovolcanoconiosе
  - Pseudohypoparathyroïdisme
  - Hippopotomonstrosesquippedaliophobie

### `mixed-encodings.csv`
- **Contenu** : CSV avec encodages mixtes
- **Usage** : Tests de gestion des encodages
- **Caractéristiques** :
  - Caractères français (àéèùç)
  - Symboles monétaires (£$€¥)
  - Caractères espagnols (ñ, ¿, ¡)
  - Émojis médicaux
  - Lettres grecques (α, β, γ)

### `performance-large-dataset.json`
- **Contenu** : 100 questions générées
- **Usage** : Tests de performance et scalabilité
- **Caractéristiques** :
  - Distribution équilibrée des catégories
  - Niveaux de difficulté variés
  - Contenu réaliste mais répétitif

## Utilisation des Fixtures

### Tests de Validation
```typescript
const fixture = JSON.parse(
  readFileSync(join(fixturesPath, 'valid', 'questions-simple.json'), 'utf-8')
);
const result = await validationService.validateImportData(fixture, 'questions');
```

### Tests CSV
```typescript
const csvContent = readFileSync(
  join(fixturesPath, 'valid', 'csv-export-sample.csv'), 
  'utf-8'
);
const result = await csvService.parseCSVFile(csvContent, { hasHeader: true });
```

### Tests de Performance
```typescript
const startTime = Date.now();
const result = await validationService.validateImportData(largeFixture, 'questions');
const endTime = Date.now();
expect(endTime - startTime).toBeLessThan(5000); // 5 secondes max
```

## Maintenance des Fixtures

### Ajout de Nouvelles Fixtures
1. Créer le fichier dans le répertoire approprié (`valid/`, `invalid/`, `edge-cases/`)
2. Suivre les conventions de nommage existantes
3. Ajouter la documentation dans ce README
4. Créer ou mettre à jour les tests correspondants

### Validation des Fixtures
- Toutes les fixtures `valid/` doivent passer la validation
- Toutes les fixtures `invalid/` doivent échouer de manière prévisible
- Les fixtures `edge-cases/` peuvent générer des avertissements mais rester valides

### Conventions de Nommage
- **Fichiers** : `kebab-case.json` ou `.csv`
- **Contenu médical** : Terminologie française correcte
- **Catégories** : Noms de spécialités standards
- **Niveaux** : PASS, LAS, both uniquement

## Tests Associés

### `FixtureValidationTests.test.ts`
- Tests principaux utilisant toutes les fixtures
- Validation complète du pipeline
- Tests d'intégration
- Vérification de la qualité des fixtures

### `EdgeCasePerformanceTests.test.ts`
- Tests spécialisés pour cas limites
- Tests de performance et scalabilité
- Tests de gestion mémoire
- Tests de résilience

## Couverture des Tests

Les fixtures couvrent :
- ✅ Validation de schémas JSON
- ✅ Détection de doublons
- ✅ Validation des références
- ✅ Gestion des erreurs
- ✅ Performance sur gros volumes
- ✅ Caractères Unicode
- ✅ Terminologie médicale
- ✅ Formats CSV
- ✅ Parcours d'apprentissage
- ✅ Flashcards
- ✅ Cas limites de longueur
- ✅ Encodages multiples

Cette structure de fixtures garantit une couverture complète des cas d'usage et d'erreur du système d'import JSON.