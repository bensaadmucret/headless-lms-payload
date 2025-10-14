# 🚀 Guide de Démarrage Rapide - Système RAG

Ce guide vous permet de démarrer avec le système RAG en **5 minutes**.

## ⚡ Installation Express

### 1. Installer les Dépendances

```bash
pnpm install
```

Cela installera automatiquement :
- `chromadb` - Base de données vectorielle
- `langchain` - Framework RAG
- `@langchain/openai` - Intégration OpenAI
- `@xenova/transformers` - Embeddings locaux

### 2. Démarrer ChromaDB

**Option A : Avec Docker (Recommandé)**

```bash
# Démarrer tous les services (PostgreSQL + Redis + ChromaDB)
docker-compose up -d

# Vérifier que ChromaDB fonctionne
curl http://localhost:8000/api/v1/heartbeat
```

**Option B : ChromaDB seul**

```bash
docker run -d -p 8000:8000 chromadb/chroma
```

### 3. Configurer les Variables d'Environnement

```bash
# Copier le fichier exemple
cp .env.example .env

# Éditer .env et ajouter au minimum:
CHROMA_URL=http://localhost:8000

# Choisir UN provider d'embeddings:

# Option 1: OpenAI (Recommandé, rapide, qualité)
OPENAI_API_KEY=sk-...

# Option 2: HuggingFace (Alternative)
HUGGINGFACE_API_KEY=hf_...

# Option 3: Local (Gratuit, mais lent)
# Pas de clé nécessaire
```

### 4. Tester l'Installation

```bash
node test-rag.js
```

Si tout fonctionne, vous verrez :
```
✅ ChromaDB est accessible
✅ Collection créée
✅ Documents ajoutés
✅ Recherche réussie
🎉 TOUS LES TESTS SONT PASSÉS!
```

## 🎯 Premier Exemple

### Traiter un Document

```typescript
import { addRAGJob } from './src/jobs/queue'

// Ajouter un document à traiter
const job = await addRAGJob({
  type: 'rag-processing',
  documentId: 'doc_123',
  extractedText: 'Votre texte ici...',
  priority: 'normal',
  userId: 'user_456',
  embeddingOptions: {
    provider: 'openai'  // ou 'local' si pas de clé API
  }
})

console.log(`Job créé: ${job.id}`)
```

### Rechercher dans un Document

```typescript
import { searchInDocument } from './src/jobs/workers/ragWorker'

const results = await searchInDocument(
  'doc_123',
  'Quelle est la question ?',
  { topK: 3 }
)

console.log(results.results)
```

## 📊 Vérifier que Tout Fonctionne

### 1. Vérifier ChromaDB

```bash
# Health check
curl http://localhost:8000/api/v1/heartbeat

# Lister les collections
curl http://localhost:8000/api/v1/collections
```

### 2. Vérifier les Workers

```bash
# Démarrer les workers
npm run workers:start

# Voir les logs
npm run workers:logs

# Voir le statut
npm run workers:status
```

### 3. Vérifier les Queues

```bash
node test-worker-status.js
```

## 🔧 Configuration des Providers

### OpenAI (Recommandé)

**Avantages :**
- ✅ Meilleure qualité
- ✅ Très rapide
- ✅ 1536 dimensions

**Configuration :**
```bash
# .env
OPENAI_API_KEY=sk-proj-...
```

**Coût :** ~0.02$ / 1M tokens (~0.10$ pour 100 pages)

### HuggingFace

**Avantages :**
- ✅ Bonne qualité
- ✅ Moins cher qu'OpenAI
- ✅ 384 dimensions

**Configuration :**
```bash
# .env
HUGGINGFACE_API_KEY=hf_...
```

### Local (Gratuit)

**Avantages :**
- ✅ Gratuit
- ✅ Pas de clé API
- ✅ Fonctionne offline

**Inconvénients :**
- ⚠️ Plus lent (CPU)
- ⚠️ Télécharge le modèle (~90MB)

**Configuration :**
```bash
# .env
# Pas de clé nécessaire
# Le provider 'local' sera utilisé automatiquement
```

## 🎓 Exemples Complets

### Exemple 1 : Pipeline Complet

```typescript
// 1. Extraction PDF (existant)
const pdfResult = await pdfProcessor.extract('document.pdf')

// 2. Traitement RAG (nouveau)
await addRAGJob({
  type: 'rag-processing',
  documentId: 'doc_123',
  extractedText: pdfResult.extractedText,
  priority: 'normal',
  userId: 'user_456',
  chunkingOptions: {
    strategy: 'standard',
    chunkSize: 1000,
    chunkOverlap: 200
  },
  embeddingOptions: {
    provider: 'openai'
  }
})

// 3. Attendre le traitement (dans un vrai cas, utiliser les events)
await new Promise(resolve => setTimeout(resolve, 10000))

// 4. Rechercher
const results = await searchInDocument(
  'doc_123',
  'Quel est le sujet principal ?',
  { topK: 3, minScore: 0.5 }
)

console.log('Résultats:', results.results)
```

### Exemple 2 : Recherche Multi-Documents

```typescript
import { embeddingService } from './src/jobs/services/embeddingService'
import { vectorStoreService } from './src/jobs/services/vectorStoreService'

// Générer l'embedding de la requête
const queryEmbedding = await embeddingService.generateQueryEmbedding(
  'anatomie du cœur'
)

// Rechercher dans tous les documents
const results = await vectorStoreService.searchGlobal(
  queryEmbedding,
  { topK: 5, minScore: 0.6 }
)

// Afficher les résultats par collection
for (const [collection, chunks] of results.entries()) {
  console.log(`\nDocument: ${collection}`)
  chunks.forEach(chunk => {
    console.log(`  - Score: ${chunk.score}`)
    console.log(`    ${chunk.chunk.content.substring(0, 100)}...`)
  })
}
```

## 🐛 Dépannage Rapide

### ChromaDB ne démarre pas

```bash
# Vérifier si le port est utilisé
lsof -i :8000

# Tuer le processus si nécessaire
kill -9 <PID>

# Redémarrer
docker-compose restart chromadb
```

### Erreur "Cannot find module"

```bash
# Réinstaller les dépendances
rm -rf node_modules
pnpm install
```

### Embeddings trop lents

```typescript
// Utiliser OpenAI au lieu de local
embeddingOptions: {
  provider: 'openai'  // Plus rapide
}
```

### Erreur de mémoire

```typescript
// Réduire la taille des chunks
chunkingOptions: {
  chunkSize: 500,  // Au lieu de 1000
  chunkOverlap: 100
}
```

## 📚 Ressources

- **Documentation complète** : `docs/RAG_SYSTEM.md`
- **Exemples d'utilisation** : `examples/rag-usage-example.ts`
- **Tests** : `test-rag.js`

## 🎯 Prochaines Étapes

1. ✅ Installation terminée
2. 📖 Lire la documentation complète : `docs/RAG_SYSTEM.md`
3. 🧪 Tester avec vos propres documents
4. 🔧 Ajuster les paramètres selon vos besoins
5. 🚀 Intégrer dans votre application

## 💡 Conseils

**Pour le Développement :**
- Utiliser le provider `local` (gratuit)
- Réduire `chunkSize` pour des tests rapides
- Utiliser `docker-compose` pour tout démarrer

**Pour la Production :**
- Utiliser le provider `openai` (meilleure qualité)
- Augmenter `chunkSize` à 1000-1500
- Monitorer les coûts d'API
- Activer la persistance de ChromaDB

## ✅ Checklist de Démarrage

- [ ] Dépendances installées (`pnpm install`)
- [ ] ChromaDB démarré (`docker-compose up -d`)
- [ ] Variables d'environnement configurées (`.env`)
- [ ] Test réussi (`node test-rag.js`)
- [ ] Premier document traité
- [ ] Première recherche effectuée

**Tout est vert ? Vous êtes prêt ! 🎉**
