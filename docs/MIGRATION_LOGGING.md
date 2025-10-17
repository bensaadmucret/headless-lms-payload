# Guide de migration vers le système de logging centralisé

## 🎯 Objectif

Remplacer les 537 occurrences de `console.log/debug/warn/error` par le système de logging centralisé.

## 📦 Import du logger

```typescript
import { logger } from '@/utils/logger';
```

## 🔄 Patterns de migration

### 1. Console.log simple

**Avant :**
```typescript
console.log('User created:', userId);
```

**Après :**
```typescript
logger.info('User created', { userId });
```

### 2. Console.error avec stack trace

**Avant :**
```typescript
console.error('Error creating user:', error);
```

**Après :**
```typescript
logger.error('Error creating user', error);
```

### 3. Console.debug (développement uniquement)

**Avant :**
```typescript
console.debug('Processing step:', step);
```

**Après :**
```typescript
logger.debug('Processing step', { step });
```

### 4. Console.warn

**Avant :**
```typescript
console.warn('Deprecated API used');
```

**Après :**
```typescript
logger.warn('Deprecated API used');
```

### 5. Logs avec contexte

**Avant :**
```typescript
console.log(`[${serviceName}] Operation completed for user ${userId}`);
```

**Après :**
```typescript
const serviceLogger = logger.child({ service: serviceName });
serviceLogger.info('Operation completed', { userId });
```

### 6. Mesure de performance

**Avant :**
```typescript
const start = Date.now();
// ... opération ...
console.log(`Operation took ${Date.now() - start}ms`);
```

**Après :**
```typescript
await logger.time('Operation', async () => {
  // ... opération ...
});
```

### 7. Logs de requêtes HTTP

**Avant :**
```typescript
console.log(`${req.method} ${req.path} - ${statusCode}`);
```

**Après :**
```typescript
logger.logRequest(req.method, req.path, { userId: req.user?.id });
// ... traitement ...
logger.logResponse(req.method, req.path, statusCode, duration);
```

### 8. Logs de base de données

**Avant :**
```typescript
console.log('Finding user in database');
```

**Après :**
```typescript
logger.logDatabase('find', 'users', { userId });
```

### 9. Logs de jobs/queues

**Avant :**
```typescript
console.log('Job started:', jobName);
// ... traitement ...
console.log('Job completed:', jobName);
```

**Après :**
```typescript
logger.logJob(jobName, 'started');
// ... traitement ...
logger.logJob(jobName, 'completed');
```

## 📝 Fichiers prioritaires à migrer

### Phase 1 : Services critiques (2-3h)

1. **StudySessionService.ts** (41 logs)
   ```bash
   # Rechercher tous les console.log
   grep -n "console\." src/services/StudySessionService.ts
   ```

2. **AIQuizGenerationService.ts** (20 logs)
3. **AdaptiveQuizService.ts** (nombreux logs)

### Phase 2 : Workers et jobs (2-3h)

4. **aiWorker.ts** (29 logs)
5. **pdfProcessor.ts** (26 logs)
6. **ragWorker.ts** (22 logs)
7. **start-workers.ts** (22 logs)

### Phase 3 : Endpoints (1-2h)

8. **dailySession.ts** (12 logs)
9. **diagnostics.ts** (15 logs)
10. Autres endpoints avec logs

## 🛠️ Script de migration automatique

Créer un script pour faciliter la migration :

```bash
#!/bin/bash
# migrate-logs.sh

# Remplacer console.log par logger.info
find src -name "*.ts" -type f -exec sed -i '' 's/console\.log(/logger.info(/g' {} +

# Remplacer console.error par logger.error
find src -name "*.ts" -type f -exec sed -i '' 's/console\.error(/logger.error(/g' {} +

# Remplacer console.warn par logger.warn
find src -name "*.ts" -type f -exec sed -i '' 's/console\.warn(/logger.warn(/g' {} +

# Remplacer console.debug par logger.debug
find src -name "*.ts" -type f -exec sed -i '' 's/console\.debug(/logger.debug(/g' {} +

echo "Migration terminée. Vérifiez les imports et ajustez les paramètres."
```

**⚠️ Attention :** Ce script est un point de départ. Vous devrez :
1. Ajouter les imports du logger
2. Ajuster les paramètres (passer des objets au lieu de strings concaténées)
3. Tester chaque fichier modifié

## 📋 Checklist de migration par fichier

Pour chaque fichier :

- [ ] Ajouter l'import : `import { logger } from '@/utils/logger';`
- [ ] Remplacer tous les `console.log` par `logger.info`
- [ ] Remplacer tous les `console.error` par `logger.error`
- [ ] Remplacer tous les `console.warn` par `logger.warn`
- [ ] Remplacer tous les `console.debug` par `logger.debug`
- [ ] Convertir les strings concaténées en objets de métadonnées
- [ ] Ajouter un contexte avec `logger.child()` si pertinent
- [ ] Tester le fichier
- [ ] Commit les changements

## 🎨 Bonnes pratiques

### 1. Utiliser des métadonnées structurées

**❌ Mauvais :**
```typescript
logger.info(`User ${userId} created quiz ${quizId}`);
```

**✅ Bon :**
```typescript
logger.info('User created quiz', { userId, quizId });
```

### 2. Créer des loggers avec contexte

**❌ Mauvais :**
```typescript
logger.info('Operation started', { service: 'QuizService', userId });
logger.info('Operation completed', { service: 'QuizService', userId });
```

**✅ Bon :**
```typescript
const serviceLogger = logger.child({ service: 'QuizService', userId });
serviceLogger.info('Operation started');
serviceLogger.info('Operation completed');
```

### 3. Logger les erreurs avec le stack trace

**❌ Mauvais :**
```typescript
logger.error('Error occurred: ' + error.message);
```

**✅ Bon :**
```typescript
logger.error('Error occurred', error);
```

### 4. Utiliser les méthodes spécialisées

**❌ Mauvais :**
```typescript
logger.info('Database query: find users');
```

**✅ Bon :**
```typescript
logger.logDatabase('find', 'users');
```

## 🧪 Tests après migration

Après avoir migré un fichier, vérifier :

1. **Compilation TypeScript** : `npm run build`
2. **Logs en développement** : Les logs s'affichent correctement
3. **Logs en production** : Format JSON structuré
4. **Performance** : Pas de dégradation
5. **Fonctionnalité** : Le code fonctionne comme avant

## 📊 Suivi de progression

Créer un fichier `MIGRATION_PROGRESS.md` :

```markdown
# Progression de la migration du logging

## Services (0/64)
- [ ] StudySessionService.ts
- [ ] AIQuizGenerationService.ts
- [ ] AdaptiveQuizService.ts
...

## Workers (0/6)
- [ ] aiWorker.ts
- [ ] pdfProcessor.ts
...

## Endpoints (0/40)
- [ ] dailySession.ts
- [ ] diagnostics.ts
...
```

## 🚀 Commandes utiles

### Compter les console.log restants
```bash
grep -r "console\." src --include="*.ts" | wc -l
```

### Trouver les fichiers avec le plus de console.log
```bash
grep -r "console\." src --include="*.ts" | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

### Vérifier qu'un fichier a été migré
```bash
grep -n "console\." src/services/StudySessionService.ts
```

### Rechercher les imports manquants
```bash
grep -l "logger\." src/**/*.ts | xargs grep -L "import.*logger"
```

## 💡 Exemple complet de migration

**Avant (StudySessionService.ts extrait) :**
```typescript
async createSession(userId: string): Promise<StudySession> {
  console.log(`[createSession] Creating session for user: ${userId}`);
  
  try {
    const session = await this.payload.create({
      collection: 'study-sessions',
      data: { user: userId }
    });
    
    console.log('Study session created successfully:', session.id);
    return session;
  } catch (error) {
    console.error('Error creating study session:', error);
    throw error;
  }
}
```

**Après :**
```typescript
import { logger } from '@/utils/logger';

async createSession(userId: string): Promise<StudySession> {
  const sessionLogger = logger.child({ service: 'StudySessionService', userId });
  
  sessionLogger.info('Creating session');
  
  try {
    const session = await sessionLogger.time('create-session', async () => {
      return await this.payload.create({
        collection: 'study-sessions',
        data: { user: userId }
      });
    });
    
    sessionLogger.info('Study session created successfully', { sessionId: session.id });
    return session;
  } catch (error) {
    sessionLogger.error('Error creating study session', error);
    throw error;
  }
}
```

## 🎯 Objectifs de la migration

- **-100%** de console.log dans le code de production
- **+50%** de logs structurés et exploitables
- **Meilleure** observabilité et debugging
- **Prêt** pour l'intégration avec des outils de monitoring (DataDog, New Relic, etc.)
