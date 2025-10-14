# Guide de Déploiement - Système de Quiz Adaptatif

Ce guide décrit les procédures de migration et de déploiement pour le système de quiz adaptatif dans Payload CMS.

## 📋 Vue d'ensemble

Le système de quiz adaptatif nécessite plusieurs étapes de déploiement :

1. **Migration des données existantes** - Mise à jour des collections Questions et Categories
2. **Création des index de performance** - Optimisation des requêtes de base de données
3. **Vérification de l'intégrité** - Validation du déploiement

## 🚀 Déploiement Rapide

### Déploiement Complet (Recommandé)

```bash
# Déploiement complet avec toutes les étapes
node deploy-adaptive-quiz.js
```

### Déploiement Personnalisé

```bash
# Ignorer la migration (si déjà effectuée)
node deploy-adaptive-quiz.js --skip-migration

# Ignorer les index (pour les environnements de développement)
node deploy-adaptive-quiz.js --skip-indexes

# Afficher l'aide
node deploy-adaptive-quiz.js --help
```

## 📦 Scripts Individuels

### 1. Migration des Données

```bash
# Migrer les données existantes
node migrate-adaptive-quiz.js
```

**Ce que fait ce script :**
- Ajoute les champs adaptatifs manquants aux Questions existantes
- Met à jour les Categories avec les nouveaux paramètres
- Crée les catégories par défaut si nécessaire
- Associe les questions non catégorisées à une catégorie par défaut

### 2. Index de Performance

```bash
# Créer les index de performance
node create-database-indexes.js

# Supprimer les index (rollback)
node create-database-indexes.js drop
```

**Index créés :**
- `quiz_submissions` : user_id, status, created_at
- `questions` : category_id, student_level, difficulty
- `adaptive_quiz_sessions` : user_id, created_at, status
- `adaptive_quiz_results` : user_id, completed_at, session_id
- `categories` : parent_category_id, level, adaptive_settings

## 🔧 Configuration Prérequise

### Variables d'Environnement

Assurez-vous que ces variables sont configurées :

```env
# Base de données PostgreSQL
DATABASE_URI=postgresql://user:password@localhost:5432/database

# Configuration Payload
PAYLOAD_SECRET=your-secret-key
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Optionnel : Configuration CORS
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
```

### Dépendances

```bash
# Installer les dépendances nécessaires
npm install
```

## 📊 Vérification Post-Déploiement

### 1. Vérifier les Collections

```bash
# Vérifier que les nouvelles collections existent
curl -X GET "http://localhost:3000/api/adaptive-quiz-sessions" \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X GET "http://localhost:3000/api/adaptive-quiz-results" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Tester les Endpoints

```bash
# Vérifier l'éligibilité pour un quiz adaptatif
curl -X GET "http://localhost:3000/api/adaptive-quiz/can-generate" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Générer un quiz adaptatif (si éligible)
curl -X POST "http://localhost:3000/api/adaptive-quiz/generate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Vérifier les Index

```sql
-- Connectez-vous à PostgreSQL et vérifiez les index
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%adaptive%' 
   OR indexname LIKE 'idx_quiz_submissions%'
   OR indexname LIKE 'idx_questions%'
   OR indexname LIKE 'idx_categories%';
```

## 🔄 Procédures de Rollback

### Rollback des Index

```bash
# Supprimer tous les index créés
node create-database-indexes.js drop
```

### Rollback des Données

⚠️ **Attention** : Il n'y a pas de rollback automatique pour la migration des données car elle ne fait qu'ajouter des champs. Pour un rollback complet, vous devrez :

1. Restaurer une sauvegarde de la base de données
2. Ou supprimer manuellement les champs ajoutés (non recommandé)

## 🐛 Dépannage

### Erreurs Communes

#### 1. Erreur de Connexion à la Base de Données

```
Error: Connection refused
```

**Solution :**
- Vérifiez que PostgreSQL est démarré
- Validez la variable `DATABASE_URI`
- Testez la connexion manuellement

#### 2. Erreur de Permissions

```
Error: Permission denied
```

**Solution :**
- Vérifiez les permissions de l'utilisateur PostgreSQL
- Assurez-vous que l'utilisateur peut créer des index

#### 3. Index Déjà Existant

```
Error: Index already exists
```

**Solution :**
- Normal, le script ignore les index existants
- Utilisez `--skip-indexes` si nécessaire

#### 4. Collections Manquantes

```
Error: Collection not found
```

**Solution :**
- Vérifiez que Payload CMS est correctement configuré
- Assurez-vous que toutes les collections sont importées dans `payload.config.ts`

### Logs de Débogage

```bash
# Activer les logs détaillés
DEBUG=payload:* node deploy-adaptive-quiz.js

# Logs spécifiques à la base de données
DEBUG=payload:db node migrate-adaptive-quiz.js
```

## 📈 Monitoring Post-Déploiement

### Métriques à Surveiller

1. **Performance des Requêtes**
   - Temps de réponse des endpoints de quiz adaptatif
   - Utilisation des index créés

2. **Utilisation du Système**
   - Nombre de quiz adaptatifs générés par jour
   - Taux d'erreur des endpoints

3. **Santé de la Base de Données**
   - Taille des nouvelles collections
   - Performance des requêtes complexes

### Requêtes de Monitoring

```sql
-- Statistiques d'utilisation des quiz adaptatifs
SELECT 
  DATE(created_at) as date,
  COUNT(*) as sessions_created,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as sessions_completed
FROM adaptive_quiz_sessions 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Performance des index
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes 
WHERE indexname LIKE 'idx_%adaptive%'
ORDER BY idx_scan DESC;
```

## 📚 Documentation Supplémentaire

- **Spécifications** : `.kiro/specs/quiz-adaptatif-backend/`
- **Architecture** : `design.md`
- **Exigences** : `requirements.md`
- **Tâches** : `tasks.md`

## 🆘 Support

En cas de problème lors du déploiement :

1. Consultez les logs détaillés
2. Vérifiez la configuration de l'environnement
3. Testez les composants individuellement
4. Contactez l'équipe technique avec les logs d'erreur

---

**Note** : Ce guide suppose un environnement PostgreSQL. Pour d'autres bases de données, adaptez les requêtes SQL en conséquence.