# Exemples de Quiz JSON pour MedCoach

Ce dossier contient des exemples de fichiers JSON prêts à être importés dans le système MedCoach via le système d'import JSON.

## 📁 Structure du dossier

```
quiz-json-examples/
├── README.md (ce fichier)
├── pass/ (dossier PASS - niveau fondamental)
│   ├── pass-bases-medicales.json (15 questions QCM bases médicales)
│   ├── pass-sciences-fondamentales.json (15 questions QCM sciences fondamentales)
│   └── pass-pathologies-generales.json (15 questions QCM pathologies générales)
├── las/ (dossier LAS - niveau avancé)
│   ├── las-specialites-medicales.json (15 questions QCM spécialités médicales)
│   ├── las-pharmacologie-avancee.json (15 questions QCM pharmacologie avancée)
│   └── las-avancees-medicales.json (15 questions QCM avancées médicales)
├── questions-cardiologie-pass.json (5 questions QCM cardiologie PASS)
├── questions-neurologie-las.json (5 questions QCM neurologie LAS)
├── questions-pass-100.json (100 questions QCM niveau PASS)
├── questions-las-100.json (100 questions QCM niveau LAS)
├── questions-pass-complete.json (92 questions QCM niveau PASS)
├── quiz-ue8-sante-publique.json (15 questions QCM santé publique)
├── quiz-ue9-medecine-preventive.json (15 questions QCM médecine préventive)
├── quiz-ue10-medecine-urgence.json (15 questions QCM médecine d'urgence)
├── quiz-specialites-medicales-avancees.json (15 questions QCM spécialités avancées)
├── questions-las-complete.json (31 questions QCM niveau LAS)
├── parcours-physiologie-cardiaque.json (parcours avec 4 étapes)
├── flashcards-semiologie-cardiaque.json (8 flashcards sémiologie)
├── questions-medicales-csv.csv (10 questions au format CSV)
└── questions-malformees-test.json (exemples d'erreurs pour tests)
```

## 🚀 Comment utiliser ces exemples

### 1. Importer dans l'interface admin

1. Connectez-vous à l'interface admin Payload CMS
2. Allez dans la section "Import JSON" (à créer selon la spec)
3. Sélectionnez le fichier JSON de votre choix
4. Cliquez sur "Importer"

### 2. Utilisation programmatique

```bash
# Exemple d'import via API
curl -X POST http://localhost:3000/api/json-import \
  -H "Content-Type: multipart/form-data" \
  -F "file=@questions-pass-complete.json" \
  -F "importType=questions"
```

## 📋 Description des fichiers

### Questions QCM - Collections complètes

#### `questions-pass-complete.json`
- **92 questions** médicales niveau PASS
- **Thèmes couverts** : Toutes spécialités médicales fondamentales
- **Niveaux de difficulté** : easy, medium, hard
- **Métadonnées complètes** : explications détaillées, catégories, tags, niveaux
- **Format optimisé** pour import en masse

#### `questions-las-complete.json`
- **31 questions** médicales niveau LAS
- **Thèmes avancés** : Mécanismes moléculaires, physiopathologie clinique
- **Spécialités médicales** : Toutes disciplines avec approfondissement
- **Niveau de difficulté** : medium à hard
- **Explications approfondies** pour compréhension clinique

#### `questions-pass-100.json` (archive)
- **100 questions** médicales niveau PASS (version précédente)
- **Collection complète** pour tests de performance
- **Thèmes variés** : fondamentaux médicaux

#### `questions-las-100.json` (archive)
- **100 questions** médicales niveau LAS (version précédente)
- **Niveau avancé** avec approfondissement clinique

### Questions QCM spécialisées

#### `questions-cardiologie-pass.json`
- **5 questions** sur la cardiologie niveau PASS
- **Thèmes** : anatomie cardiaque, physiologie, hémodynamique
- **Niveau de difficulté** : easy à hard
- **Métadonnées complètes** : explications détaillées, tags, hints

#### `questions-neurologie-las.json`
- **5 questions** sur la neurologie niveau LAS
- **Thèmes** : nerfs crâniens, réflexes, neurotransmetteurs
- **Spécialités médicales** : neurologie, sémiologie

### Quiz organisés par niveau académique

#### Dossier PASS (niveau fondamental)
Quiz spécialement conçus pour le niveau PASS (Première Année Commune aux Études de Santé) avec des questions fondamentales et des concepts de base.

#### `pass-bases-medicales.json`
- **15 questions** sur les bases médicales fondamentales
- **Thèmes couverts** : anatomie, physiologie, pathologie générale
- **Niveau de difficulté** : easy à medium
- **Idéal pour débutants** en médecine

#### `pass-sciences-fondamentales.json`
- **15 questions** sur les sciences fondamentales
- **Thèmes couverts** : biochimie, biologie cellulaire, génétique
- **Niveau de difficulté** : medium
- **Focus sur les mécanismes** biologiques essentiels

#### `pass-pathologies-generales.json`
- **15 questions** sur les mécanismes pathologiques généraux
- **Thèmes couverts** : inflammation, nécrose, dégénérescence, cancérogenèse
- **Niveau de difficulté** : medium
- **Compréhension des processus** pathologiques fondamentaux

#### Dossier LAS (niveau avancé)
Quiz spécialement conçus pour le niveau LAS (Licence Accès Santé) avec des questions avancées et un approfondissement clinique.

#### `las-specialites-medicales.json`
- **15 questions** sur les spécialités médicales pointues
- **Thèmes couverts** : spécialités rares, nouvelles technologies, approches multidisciplinaires
- **Niveau de difficulté** : hard
- **Mise à jour des connaissances** médicales actuelles

#### `las-pharmacologie-avancee.json`
- **15 questions** sur les mécanismes pharmacologiques avancés
- **Thèmes couverts** : inhibiteurs tyrosine kinase, anticorps monoclonaux, pharmacogénétique
- **Niveau de difficulté** : hard
- **Compréhension approfondie** des mécanismes d'action

#### `las-avancees-medicales.json`
- **15 questions** sur les technologies médicales de pointe
- **Thèmes couverts** : CAR-T, CRISPR-Cas9, intelligence artificielle, nanomédecine
- **Niveau de difficulté** : hard
- **Avancées thérapeutiques** les plus récentes

### Quiz par Unités d'Enseignement (nouveaux)

#### `quiz-ue8-sante-publique.json`
- **15 questions** sur la santé publique et l'épidémiologie
- **Thèmes couverts** : épidémiologie, prévention, politique de santé, facteurs de risque
- **Niveaux de difficulté** : easy à hard
- **Métadonnées complètes** : explications détaillées, catégories, niveaux

#### `quiz-ue9-medecine-preventive.json`
- **15 questions** sur la médecine préventive et la prévention
- **Thèmes couverts** : prévention primaire, secondaire, tertiaire, dépistage, vaccination
- **Niveaux de difficulté** : easy à hard
- **Explications approfondies** pour compréhension clinique

#### `quiz-ue10-medecine-urgence.json`
- **15 questions** sur la médecine d'urgence et la réanimation
- **Thèmes couverts** : urgences vitales, RCP, choc, gestes d'urgence, protocoles
- **Niveau de difficulté** : medium à hard
- **Contenu spécialisé** pour formation médicale avancée

#### `quiz-specialites-medicales-avancees.json`
- **15 questions** sur les spécialités médicales pointues
- **Thèmes couverts** : spécialités rares, nouvelles technologies, approches multidisciplinaires
- **Niveau de difficulté** : medium à hard
- **Mise à jour des connaissances** médicales actuelles

### Parcours d'apprentissage

#### `parcours-physiologie-cardiaque.json`
- **Parcours structuré** avec 4 étapes progressives
- **Prérequis** définis entre étapes
- **Objectifs pédagogiques** par étape
- **Questions intégrées** dans chaque étape
- **Durée estimée** : 3 heures

### Flashcards

#### `flashcards-semiologie-cardiaque.json`
- **8 flashcards** pour la sémiologie cardiaque
- **Format recto/verso** optimisé pour la mémorisation
- **Indices** pour faciliter l'apprentissage
- **Tags médicaux** pour la recherche

### Format CSV

#### `questions-medicales-csv.csv`
- **Format tableur** (Excel, Google Sheets)
- **10 questions** multi-spécialités médicales
- **Structure standardisée** pour import en masse
- **Métadonnées** dans la dernière colonne

### Tests d'erreur

#### `questions-malformees-test.json`
- **Exemples d'erreurs** pour valider le système de validation
- **Cas limites** : questions vides, options manquantes, etc.
- **À utiliser** pour tester la robustesse du système d'import

## 🔧 Formats supportés

### JSON Questions
```json
{
  "version": "1.0",
  "type": "questions",
  "metadata": { ... },
  "questions": [ ... ]
}
```

### JSON Parcours
```json
{
  "version": "1.0",
  "type": "learning-path",
  "metadata": { ... },
  "path": {
    "steps": [ ... ]
  }
}
```

### JSON Flashcards
```json
{
  "version": "1.0",
  "type": "flashcards",
  "metadata": { ... },
  "cards": [ ... ]
}
```

### CSV
```csv
questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,category,difficulty,level,tags
```

## ✅ Bonnes pratiques

### Pour les questions
- **4 options** par question (standard QCM médical)
- **Explication détaillée** pour l'apprentissage
- **Catégorie existante** ou création automatique
- **Tags pertinents** pour la recherche
- **Niveau de difficulté** adapté

### Pour les parcours
- **Étapes progressives** avec prérequis
- **Objectifs clairs** pour chaque étape
- **Questions intégrées** ou références externes
- **Durée réaliste** par étape

### Pour les flashcards
- **Recto concis** (question/concept clé)
- **Verso complet** (explication détaillée)
- **Indices optionnels** pour l'auto-évaluation
- **Catégorisation médicale** précise

## 🧪 Tests et validation

Ces fichiers sont utilisés pour :
- **Tests d'intégration** du système d'import
- **Validation des schémas** JSON
- **Tests de performance** avec différents volumes
- **Formation** des utilisateurs

## 📚 Ressources

- [Documentation complète du système d'import](../.kiro/specs/json-import-system/design.md)
- [Guide utilisateur](../.kiro/specs/json-import-system/requirements.md)
- [Spécifications techniques](../.kiro/specs/json-import-system/tasks.md)

## 🔄 Mises à jour

Ces exemples sont mis à jour régulièrement pour :
- Refléter les nouvelles fonctionnalités du système
- Ajouter de nouveaux domaines médicaux
- Améliorer les exemples pédagogiques
- Tester les nouvelles validations

---

*Dernière mise à jour : Janvier 2025*
