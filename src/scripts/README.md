# Scripts de gestion des quiz

Ce dossier contient des scripts utilitaires pour gérer les quiz et leurs dépendances dans la base de données.

## Mise à jour de la contrainte de clé étrangère

### Problématique
Par défaut, lorsqu'un quiz est supprimé, les soumissions de quiz associées ne sont pas supprimées automatiquement, ce qui peut entraîner des erreurs d'intégrité référentielle.

### Solution
Le script `update-quiz-constraint.ts` modifie la contrainte de clé étrangère sur la table `quiz_submissions` pour ajouter l'option `ON DELETE CASCADE`. Cela permettra la suppression automatique des soumissions lorsqu'un quiz est supprimé.

### Prérequis

- Node.js installé
- Les dépendances du projet installées (`npm install` ou `yarn`)
- Un fichier `.env` correctement configuré avec la variable `DATABASE_URI`

### Installation des dépendances

```bash
npm install pg dotenv
# ou
yarn add pg dotenv
```

### Exécution du script

1. Assurez-vous que le serveur Payload n'est pas en cours d'exécution pour éviter tout conflit.
2. Exécutez le script avec la commande suivante :

```bash
npx ts-node src/scripts/update-quiz-constraint.ts
```

### Vérification

Après l'exécution du script, vous pouvez vérifier que la contrainte a bien été mise à jour en vous connectant à votre base de données PostgreSQL et en exécutant la requête suivante :

```sql
SELECT conname, confupdtype, confdeltype, confmatchtype
FROM pg_constraint
WHERE conname = 'quiz_submissions_quiz_fk';
```

Vous devriez voir que `confdeltype` est défini sur `c`, ce qui indique que l'action `ON DELETE CASCADE` est active.

### Fichier SQL brut

Si vous préférez exécuter la requête SQL directement, vous pouvez utiliser le fichier `add-cascade-constraint.sql` avec un client PostgreSQL de votre choix (comme psql, pgAdmin, etc.).

### Remarques importantes

- Ce script doit être exécuté avec des privilèges d'administration sur la base de données.
- Il est recommandé de faire une sauvegarde de votre base de données avant d'exécuter ce script en production.
- Le script est conçu pour être sûr et réversible, mais il est toujours bon de tester d'abord dans un environnement de développement.
