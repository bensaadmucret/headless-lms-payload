# Guide d'Import JSON/CSV - MedCoach

## 📋 Vue d'ensemble

Ce guide vous accompagne dans l'import en masse de contenu éducatif médical dans MedCoach. Le système supporte plusieurs formats et types de contenu avec un workflow de validation humaine obligatoire pour garantir la qualité médicale.

## 🎯 Types de contenu supportés

### 1. Questions QCM (JSON/CSV)
- Questions à choix multiples avec 4 options
- Explications détaillées obligatoires
- Catégorisation par spécialité médicale
- Niveaux PASS/LAS/Both

### 2. Flashcards (JSON)
- Format recto/verso pour révision
- Conversion automatique en QCM possible
- Support des images et médias
- Intégration répétition espacée

### 3. Parcours d'apprentissage (JSON)
- Séquences progressives avec prérequis
- Questions intégrées par étape
- Estimation de durée
- Validation des dépendances

## 📁 Templates disponibles

### Questions simples (JSON)
```json
{
  "version": "1.0",
  "type": "questions",
  "metadata": {
    "source": "Votre établissement",
    "level": "PASS",
    "description": "Description de votre lot"
  },
  "questions": [
    {
      "questionText": "Votre question ici...",
      "options": [
        {"text": "Option A", "isCorrect": true},
        {"text": "Option B", "isCorrect": false},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ],
      "explanation": "Explication détaillée...",
      "category": "Cardiologie",
      "difficulty": "medium",
      "level": "PASS",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### Format CSV simplifié
```csv
questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,category,difficulty,level,tags
"Votre question","Option A","Option B","Option C","Option D","A","Explication","Cardiologie","medium","PASS","tag1,tag2"
```

## 🔄 Workflow d'import

### 1. Upload et détection
- Glissez-déposez votre fichier (JSON/CSV)
- Détection automatique du type
- Validation du format et de la taille

### 2. Validation automatique
- Vérification de la structure
- Contrôle des champs obligatoires
- Détection des doublons
- Validation des références

### 3. Aperçu et corrections ⚠️ **ÉTAPE CRITIQUE**
- Prévisualisation de toutes les données
- Corrections en ligne possibles
- Mapping intelligent des catégories
- **Validation humaine obligatoire**

### 4. Import final
- Traitement par lots optimisé
- Suivi de progression en temps réel
- Rapport détaillé des résultats
- Audit complet tracé

## 🏷️ Gestion des catégories

### Mapping intelligent
Le système détecte automatiquement les catégories similaires :
- "cardio" → "Cardiologie"
- "neuro" → "Neurologie"
- "anatomy" → "Anatomie"

### Validation administrative
- Aucune création automatique de catégorie
- Suggestions de fusion pour éviter les doublons
- Historique des mappings pour cohérence

## 📊 Alternative Anki → CSV → MedCoach

### Workflow pragmatique recommandé

1. **Export depuis Anki**
   - Ouvrir votre deck Anki
   - Fichier → Exporter → Format "Notes en texte simple (*.txt)"
   - Sélectionner "Inclure les tags"

2. **Conversion en CSV**
   - Ouvrir le fichier .txt dans Excel/LibreOffice
   - Réorganiser les colonnes selon le template CSV
   - Ajouter les colonnes manquantes (difficulty, level, etc.)
   - Sauvegarder en format CSV UTF-8

3. **Import dans MedCoach**
   - Utiliser le template CSV fourni
   - Suivre le workflow de validation
   - Bénéficier du mapping intelligent

### Avantages de cette approche
- ✅ Contrôle total sur la conversion
- ✅ Pas de complexité technique .apkg
- ✅ Même résultat final
- ✅ Implémentation 10x plus simple
- ✅ Compatible avec tous les decks Anki

## ⚙️ Options d'import

### Mode test (Dry Run)
- Aperçu sans modification de la base
- Validation complète des données
- Rapport détaillé des problèmes
- Recommandé pour le premier import

### Validation humaine
- **Obligatoire par défaut**
- Écran de preview avec corrections
- Validation admin manuelle requise
- Traçabilité complète des validations

### Génération de distracteurs (Flashcards)
- Conversion automatique flashcard → QCM
- Génération IA des options incorrectes
- Préservation des métadonnées originales

## 🔍 Validation et qualité

### Contrôles automatiques
- **Structure** : Conformité des schémas JSON/CSV
- **Contenu** : Champs obligatoires, formats
- **Cohérence** : Options correctes, références
- **Doublons** : Détection dans le fichier et la base
- **Références** : Catégories, niveaux existants

### Niveaux de sévérité
- **🚨 Critique** : Bloque l'import, correction obligatoire
- **⚠️ Majeur** : Import possible avec avertissement
- **⚡ Mineur** : Notification, pas de blocage
- **ℹ️ Info** : Information, aucun impact

## 📈 Suivi et historique

### Progression temps réel
- Barre de progression avec pourcentages
- Logs détaillés en direct
- Statistiques de réussite/échec
- Estimation du temps restant

### Historique complet
- Tous les imports tracés
- Filtres par statut, type, date, utilisateur
- Export des rapports en CSV
- Possibilité de retry sur échecs

## 🛡️ Sécurité et permissions

### Contrôles d'accès
- Import limité aux rôles admin/superadmin
- Validation des permissions sur les collections
- Audit complet de toutes les opérations

### Validation des données
- Sanitisation des entrées utilisateur
- Limitation des tailles (max 10MB)
- Vérification des types MIME
- Protection contre l'injection

## 🚨 Résolution des problèmes courants

### Erreurs de format
```
❌ "Fichier JSON malformé"
💡 Vérifiez la syntaxe avec un validateur JSON en ligne
```

### Catégories manquantes
```
⚠️ "Catégorie 'cardio' non trouvée"
💡 Utilisez le mapping suggéré vers 'Cardiologie'
```

### Doublons détectés
```
ℹ️ "Question similaire trouvée ligne 15"
💡 Vérifiez le contenu et supprimez si nécessaire
```

### Encodage CSV
```
❌ "Caractères spéciaux mal affichés"
💡 Sauvegardez votre CSV en UTF-8 avec BOM
```

## 📞 Support et assistance

### Ressources disponibles
- 📖 Templates JSON/CSV téléchargeables
- 🎥 Vidéos tutoriels (à venir)
- 📧 Support technique : support@medcoach.fr
- 💬 Documentation interactive dans l'interface

### Bonnes pratiques
1. **Testez d'abord** avec un petit échantillon
2. **Utilisez le mode dry-run** pour valider
3. **Préparez vos catégories** avant l'import
4. **Vérifiez l'encodage** de vos fichiers CSV
5. **Sauvegardez** vos données avant import

---

## 🎯 Cas d'usage typiques

### Import depuis Excel
1. Préparez vos données dans Excel
2. Utilisez le template CSV fourni
3. Sauvegardez en CSV UTF-8
4. Importez avec validation humaine

### Migration depuis Anki
1. Exportez vos decks en TXT
2. Convertissez en CSV avec Excel
3. Mappez les colonnes selon le template
4. Importez avec génération de distracteurs

### Création de parcours
1. Définissez la progression pédagogique
2. Créez les questions par étape
3. Utilisez le template learning-path
4. Validez les prérequis avant import

Ce guide vous accompagne vers un import réussi de vos contenus médicaux. N'hésitez pas à commencer par un test avec quelques questions pour vous familiariser avec le processus !