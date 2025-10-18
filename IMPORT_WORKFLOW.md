# 📥 Workflow d'Import JSON/CSV

## Comment utiliser la collection Import JSON/CSV

### 1. Créer un nouvel import

1. Allez dans **Outils > Import JSON/CSV**
2. Cliquez sur **Create New**
3. Remplissez les champs :
   - **Titre** : Nom descriptif (ex: "Questions Cardiologie Janvier 2025")
   - **Fichier** : Uploadez votre fichier JSON ou CSV
   - **Type d'import** : Sélectionnez le type (auto-détecté depuis le nom du fichier)
   - **Options d'import** : Configurez selon vos besoins

### 2. Traitement automatique

Dès que vous sauvegardez avec un fichier uploadé, le système :

1. ✅ **Valide** le fichier (structure, format, contenu)
2. 🔄 **Traite** les données par lots
3. 📊 **Crée** les questions/flashcards/parcours dans la base
4. ✅ **Met à jour** le statut et la progression en temps réel

### 3. Suivre la progression

Le champ **Statut** indique où en est le traitement :

- ⏳ **En attente** : Fichier prêt à être traité
- 🔄 **Traitement** : Import en cours
- ✅ **Validation** : Vérification des données
- 👁️ **Aperçu** : Mode test (pas d'import réel)
- ✅ **Terminé** : Import réussi
- ❌ **Échec** : Erreur détectée (voir section Erreurs)

Le groupe **Progression** affiche :
- Total d'éléments
- Éléments traités
- Réussis
- Échecs

### 4. Vérifier les résultats

Après un import réussi :

1. Allez dans la collection concernée (Questions, Flashcards, Learning Paths)
2. Filtrez par date de création récente
3. Vérifiez que vos données sont bien importées

### 5. Gérer les erreurs

Si le statut est **Échec** :

1. Consultez la section **Erreurs** pour voir les détails
2. Corrigez votre fichier selon les suggestions
3. Changez le statut en **En attente** (décochez readOnly temporairement)
4. Sauvegardez pour relancer le traitement

OU

1. Supprimez l'import échoué
2. Créez un nouvel import avec le fichier corrigé

## Options d'import

### Mode test (dryRun)
- ✅ Active : Validation uniquement, pas d'import réel
- ❌ Désactive : Import complet dans la base

### Taille des lots (batchSize)
- Défaut : 100 éléments par lot
- Min : 1, Max : 1000
- Plus petit = plus lent mais plus sûr
- Plus grand = plus rapide mais plus de mémoire

### Écraser les existants (overwriteExisting)
- ✅ Active : Remplace les éléments en conflit
- ❌ Désactive : Ignore les doublons

### Générer des distracteurs (flashcards uniquement)
- ✅ Active : Crée automatiquement des options incorrectes
- ❌ Désactive : Utilise uniquement les options fournies

### Validation humaine obligatoire
- ✅ Active : Nécessite une validation manuelle
- ❌ Désactive : Import automatique complet

## Formats de fichiers supportés

### JSON
- Questions QCM
- Flashcards
- Parcours d'apprentissage

Voir les templates dans `/src/templates/json-import-templates/`

### CSV
- Questions QCM uniquement
- Format : Question, Option A, Option B, Option C, Option D, Bonne réponse, Explication

## Logs et débogage

Les logs du traitement s'affichent dans la console du serveur :

```
🚀 Déclenchement traitement import job: 123 - questions.json
   Type: questions, Statut: queued
✅ Traitement déclenché avec succès
```

En cas d'erreur :
```
❌ Erreur déclenchement traitement: [détails]
```

## Permissions

- **Tous les utilisateurs connectés** : Peuvent créer des imports
- **Utilisateurs normaux** : Voient et modifient leurs propres imports
- **Admins/Superadmins** : Accès complet à tous les imports

## Architecture technique

1. **Collection ImportJobs** : Stocke les métadonnées d'import
2. **Hook afterChange** : Déclenche le traitement automatique
3. **Endpoint /api/json-import/process/:jobId** : Traite le fichier
4. **Services** :
   - `JSONValidationService` : Validation
   - `JSONProcessingService` : Traitement JSON
   - `CSVImportService` : Traitement CSV
   - `BatchProcessingService` : Traitement par lots

## Troubleshooting

### Le fichier n'est pas traité
- Vérifiez que le statut est "En attente"
- Vérifiez que le fichier est bien uploadé
- Consultez les logs du serveur
- Vérifiez que l'URL du serveur est correcte dans les variables d'environnement

### Import très lent
- Réduisez la taille des lots (batchSize)
- Vérifiez la charge du serveur
- Importez en plusieurs fois

### Erreurs de validation
- Vérifiez le format du fichier avec les templates
- Assurez-vous que toutes les données requises sont présentes
- Vérifiez les types de données (nombres, textes, booléens)

### Doublons créés
- Activez l'option "Écraser les existants"
- Ou nettoyez manuellement avant l'import
