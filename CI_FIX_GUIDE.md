# Guide de correction pour les tests CI - ✅ RÉSOLU

## Problème

Les tests échouaient en CI avec l'erreur :
```
Error: Failed to resolve import "bull" from "payload-cms/src/jobs/queue.ts"
```

## Cause

Le module `bull` (et `ioredis`) ne pouvait pas être résolu correctement par Vitest dans l'environnement CI, car ces modules utilisent des fonctionnalités Node.js natives qui ne sont pas compatibles avec l'environnement de test jsdom.

## Solutions implémentées ✅

### 1. Configuration Vitest mise à jour

**Fichier : `vite.config.ts`**

Le fichier a été mis à jour pour utiliser `vitest/config` au lieu de `vite` :

```typescript
import { defineConfig } from 'vitest/config'
```

Configuration finale :
```typescript
test: {
  environment: 'jsdom',
  globals: true,
  coverage: {
    reporter: ['text', 'lcov'],
  },
  env: {
    ...process.env,
  },
  setupFiles: ['dotenv/config', './vitest.setup.ts'],
}
```

### 2. Fichier de setup Vitest global

**Fichier : `vitest.setup.ts`** (créé)

Ce fichier mocke automatiquement `bull` et `ioredis` pour tous les tests :

```typescript
import { vi } from 'vitest'

// Mock de Bull
vi.mock('bull', () => {
  const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    // ... autres méthodes mockées
    name: 'test-queue',
  }
  return {
    default: vi.fn(() => mockQueue),
  }
})

// Mock de IORedis
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    disconnect: vi.fn().mockResolvedValue(undefined),
    // ... autres méthodes mockées
  })),
}))
```

### 3. Nettoyage des tests

**Fichier : `src/jobs/__tests__/queue.test.ts`**

Les mocks redondants ont été supprimés car ils sont maintenant gérés globalement dans `vitest.setup.ts`.

## Résultat ✅

**Tous les tests passent maintenant !**

```bash
npm run test:vitest
```

Résultat :
```
✓ Test Files  19 passed (19)
✓ Tests  100 passed (100)
Duration  25.70s
```

## Pour la CI GitHub Actions

Votre workflow CI devrait maintenant fonctionner sans modification. Assurez-vous simplement qu'il :

1. Installe toutes les dépendances : `npm ci` ou `npm install`
2. Lance les tests avec : `npm run test:vitest`

Exemple de configuration `.github/workflows/test.yml` :

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:vitest
```

## Fichiers modifiés

1. ✅ `vite.config.ts` - Import de `vitest/config` et ajout du setup file
2. ✅ `vitest.setup.ts` - Nouveau fichier avec mocks globaux de Bull et IORedis
3. ✅ `src/jobs/__tests__/queue.test.ts` - Suppression des mocks redondants
4. ✅ `src/jobs/__mocks__/queue.ts` - Mock alternatif (non utilisé actuellement)

## Notes importantes

- ✅ Le mock est automatiquement appliqué à tous les tests via `vitest.setup.ts`
- ✅ Aucune dépendance Redis n'est requise pour les tests
- ✅ Les tests fonctionnent en local ET en CI
- ⚠️ Pour les tests d'intégration réels avec Redis, vous devrez configurer un service Redis dans votre CI

## Pourquoi cette solution fonctionne

1. **Mock global** : `bull` et `ioredis` sont mockés globalement, évitant les problèmes de résolution de modules
2. **Environnement jsdom** : Compatible avec les tests frontend et les collections Payload
3. **Pas de dépendances externes** : Les tests ne nécessitent plus Redis pour s'exécuter
4. **Maintenabilité** : Un seul endroit pour gérer les mocks (vitest.setup.ts)
