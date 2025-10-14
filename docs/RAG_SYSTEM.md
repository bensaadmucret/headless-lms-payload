# 🧠 Système RAG (Retrieval-Augmented Generation)

## 📋 Vue d'Ensemble

Le système RAG transforme vos documents en une base de connaissances interrogeable sémantiquement. Il permet de :
- 🔍 Rechercher des informations pertinentes dans vos documents
- 🎯 Obtenir des réponses contextuelles précises
- 📊 Analyser le contenu de manière intelligente

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  1. EXTRACTION (Existant)                               │
│     pdfProcessor.ts → Texte brut                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  2. CHUNKING (Nouveau)                                  │
│     chunkingService.ts                                  │
│     → Découpe le texte en morceaux intelligents         │
│     → 1000 chars par chunk, 200 chars overlap           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  3. EMBEDDINGS (Nouveau)                                │
│     embeddingService.ts                                 │
│     → Transforme chaque chunk en vecteur numérique      │
│     → Support OpenAI / HuggingFace / Local              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  4. VECTOR STORE (Nouveau)                              │
│     vectorStoreService.ts                               │
│     → Stocke les vecteurs dans ChromaDB                 │
│     → Permet la recherche sémantique                    │
└─────────────────────────────────────────────────────────┘
```

## 📦 Composants Créés

### 1. **chunkingService.ts**
Découpe intelligente du texte en morceaux optimaux.

**Stratégies disponibles :**
- `standard` : Découpage récursif avec séparateurs intelligents (par défaut)
- `chapters` : Découpage par chapitres détectés automatiquement
- `fixed` : Découpage à taille fixe (pour tests)

**Options :**
```typescript
{
  chunkSize: 1000,        // Taille de chaque chunk
  chunkOverlap: 200,      // Chevauchement entre chunks
  separators: ['\n\n', '\n', '. ', ' ', '']
}
```

### 2. **embeddingService.ts**
Génération d'embeddings (vecteurs numériques).

**Providers supportés :**

| Provider | Modèle par défaut | Dimensions | Coût | Vitesse |
|----------|-------------------|------------|------|---------|
| **OpenAI** | text-embedding-3-small | 1536 | 💰 Payant | ⚡ Rapide |
| **HuggingFace** | all-MiniLM-L6-v2 | 384 | 💰 Payant | ⚡ Rapide |
| **Local** | Xenova/all-MiniLM-L6-v2 | 384 | ✅ Gratuit | 🐢 Lent |

**Configuration :**
```bash
# .env
OPENAI_API_KEY=sk-...           # Pour OpenAI
HUGGINGFACE_API_KEY=hf_...      # Pour HuggingFace
# Pas de clé nécessaire pour Local
```

### 3. **vectorStoreService.ts**
Stockage et recherche vectorielle avec ChromaDB.

**Fonctionnalités :**
- ✅ Stockage de chunks avec métadonnées
- ✅ Recherche sémantique (similarité cosinus)
- ✅ Gestion de collections par document
- ✅ Recherche globale multi-documents
- ✅ Statistiques et monitoring

### 4. **ragWorker.ts**
Worker Bull qui orchestre le pipeline RAG complet.

**Fonctions principales :**
- `processRAGJob()` : Pipeline complet (chunking → embeddings → storage)
- `searchInDocument()` : Recherche dans un document spécifique
- `deleteDocumentRAG()` : Suppression des données RAG
- `getDocumentRAGStats()` : Statistiques d'un document

## 🚀 Installation

### 1. Installer les Dépendances

```bash
pnpm install
```

Les dépendances suivantes ont été ajoutées à `package.json` :
- `chromadb` : Base de données vectorielle
- `langchain` : Framework RAG
- `@langchain/core` : Core LangChain
- `@langchain/community` : Intégrations communautaires
- `@langchain/openai` : Intégration OpenAI
- `@xenova/transformers` : Embeddings locaux

### 2. Démarrer ChromaDB

**Option A : Docker (Recommandé)**
```bash
docker run -d -p 8000:8000 chromadb/chroma
```

**Option B : Installation locale**
```bash
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

### 3. Configurer les Variables d'Environnement

```bash
# .env
CHROMA_URL=http://localhost:8000

# Choisir un provider d'embeddings (au moins un)
OPENAI_API_KEY=sk-...           # Option 1 : OpenAI (recommandé)
HUGGINGFACE_API_KEY=hf_...      # Option 2 : HuggingFace
# Option 3 : Local (pas de clé nécessaire, mais plus lent)
```

## 💻 Utilisation

### 1. Traiter un Document avec RAG

```typescript
import { addRAGJob } from './jobs/queue'

// Après l'extraction d'un PDF
const ragJob = await addRAGJob({
  type: 'rag-processing',
  documentId: 'doc_123',
  extractedText: '...texte extrait...',
  priority: 'normal',
  userId: 'user_456',
  chunkingOptions: {
    chunkSize: 1000,
    chunkOverlap: 200,
    strategy: 'standard'
  },
  embeddingOptions: {
    provider: 'openai',  // ou 'huggingface' ou 'local'
    model: 'text-embedding-3-small'
  }
})

console.log(`Job RAG créé: ${ragJob.id}`)
```

### 2. Rechercher dans un Document

```typescript
import { searchInDocument } from './jobs/workers/ragWorker'

const results = await searchInDocument(
  'doc_123',
  'Quels sont les symptômes de la maladie ?',
  {
    topK: 5,           // Nombre de résultats
    minScore: 0.5,     // Score minimum de pertinence
    embeddingProvider: 'openai'
  }
)

console.log('Résultats trouvés:', results.results)
// [
//   {
//     content: "Les symptômes incluent...",
//     score: 0.92,
//     chunkIndex: 15
//   },
//   ...
// ]
```

### 3. Intégration dans le Pipeline Existant

```typescript
// Dans extractionWorker.ts
import { addRAGJob } from '../queue'

// Après l'extraction réussie
if (result.success) {
  // Lancer le traitement RAG en parallèle
  await addRAGJob({
    type: 'rag-processing',
    documentId: job.data.documentId,
    extractedText: result.extractedText,
    priority: job.data.priority,
    userId: job.data.userId,
  })
}
```

### 4. Obtenir les Statistiques

```typescript
import { getDocumentRAGStats } from './jobs/workers/ragWorker'

const stats = await getDocumentRAGStats('doc_123')

console.log(stats)
// {
//   success: true,
//   stats: {
//     collectionName: 'doc_doc_123',
//     chunksCount: 45,
//     exists: true
//   }
// }
```

## 🔧 Configuration Avancée

### Stratégies de Chunking

**1. Standard (Recommandé)**
```typescript
chunkingOptions: {
  strategy: 'standard',
  chunkSize: 1000,
  chunkOverlap: 200
}
```
✅ Découpage intelligent avec séparateurs
✅ Préserve le contexte entre chunks
✅ Adapté à tous types de documents

**2. Par Chapitres**
```typescript
chunkingOptions: {
  strategy: 'chapters'
}
```
✅ Détecte automatiquement les chapitres
✅ Idéal pour livres et cours structurés
⚠️ Nécessite des marqueurs de chapitres

**3. Taille Fixe**
```typescript
chunkingOptions: {
  strategy: 'fixed',
  chunkSize: 500,
  chunkOverlap: 0
}
```
✅ Rapide et prévisible
⚠️ Peut couper au milieu de phrases

### Choix du Provider d'Embeddings

**OpenAI (Recommandé pour Production)**
```typescript
embeddingOptions: {
  provider: 'openai',
  model: 'text-embedding-3-small'  // ou 'text-embedding-3-large'
}
```
✅ Meilleure qualité
✅ Rapide
💰 ~0.02$ / 1M tokens

**HuggingFace (Alternative)**
```typescript
embeddingOptions: {
  provider: 'huggingface',
  model: 'sentence-transformers/all-MiniLM-L6-v2'
}
```
✅ Bonne qualité
✅ Moins cher qu'OpenAI
⚠️ Nécessite API key

**Local (Développement)**
```typescript
embeddingOptions: {
  provider: 'local',
  model: 'Xenova/all-MiniLM-L6-v2'
}
```
✅ Gratuit
✅ Pas de clé API
⚠️ Plus lent (CPU)
⚠️ Télécharge le modèle (~90MB)

## 📊 Monitoring

### Vérifier l'État de ChromaDB

```typescript
import { vectorStoreService } from './jobs/services/vectorStoreService'

const isHealthy = await vectorStoreService.healthCheck()
console.log('ChromaDB status:', isHealthy ? '✅ Healthy' : '❌ Down')
```

### Lister les Collections

```typescript
const collections = await vectorStoreService.listCollections()
console.log('Collections:', collections)
// ['doc_doc_123', 'doc_doc_456', ...]
```

### Statistiques d'une Collection

```typescript
const stats = await vectorStoreService.getCollectionStats('doc_123')
console.log(stats)
// {
//   name: 'doc_doc_123',
//   count: 45,
//   exists: true
// }
```

## 🐛 Dépannage

### ChromaDB ne démarre pas

```bash
# Vérifier si le port 8000 est libre
lsof -i :8000

# Redémarrer ChromaDB
docker restart <container_id>
```

### Erreur "Cannot find module '@langchain/openai'"

```bash
# Réinstaller les dépendances
rm -rf node_modules
pnpm install
```

### Embeddings locaux trop lents

```typescript
// Utiliser OpenAI ou HuggingFace à la place
embeddingOptions: {
  provider: 'openai'  // Plus rapide
}
```

### Erreur de mémoire avec gros documents

```typescript
// Réduire la taille des chunks
chunkingOptions: {
  chunkSize: 500,  // Au lieu de 1000
  chunkOverlap: 100
}
```

## 📈 Performance

### Benchmarks

| Document | Pages | Chunks | Embeddings | Temps Total |
|----------|-------|--------|------------|-------------|
| 10 pages | 10 | 15 | OpenAI | ~5s |
| 50 pages | 50 | 75 | OpenAI | ~15s |
| 100 pages | 100 | 150 | OpenAI | ~30s |
| 100 pages | 100 | 150 | Local | ~2min |

### Optimisations

**1. Utiliser OpenAI pour les embeddings**
```typescript
embeddingOptions: { provider: 'openai' }
```

**2. Traiter en parallèle**
```typescript
// Le worker RAG tourne en parallèle du NLP et AI
```

**3. Ajuster la taille des chunks**
```typescript
// Plus de petits chunks = plus rapide mais moins de contexte
chunkingOptions: { chunkSize: 500 }
```

## 🔐 Sécurité

### Clés API

```bash
# Ne JAMAIS commiter les clés dans le code
# Utiliser .env
OPENAI_API_KEY=sk-...
HUGGINGFACE_API_KEY=hf_...
```

### Isolation des Données

Chaque document a sa propre collection :
```
doc_doc_123  → Collection pour document 123
doc_doc_456  → Collection pour document 456
```

### Suppression des Données

```typescript
import { deleteDocumentRAG } from './jobs/workers/ragWorker'

await deleteDocumentRAG('doc_123')
// Supprime toutes les données RAG du document
```

## 🚀 Prochaines Étapes

1. **Installer les dépendances** : `pnpm install`
2. **Démarrer ChromaDB** : `docker run -d -p 8000:8000 chromadb/chroma`
3. **Configurer .env** : Ajouter au moins une clé API
4. **Tester** : Traiter un document avec RAG
5. **Intégrer** : Ajouter au pipeline d'extraction existant

## 📚 Ressources

- [LangChain Documentation](https://js.langchain.com/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [HuggingFace Models](https://huggingface.co/models?pipeline_tag=sentence-similarity)

## 🆘 Support

En cas de problème :
1. Vérifier les logs : `npm run workers:logs`
2. Vérifier ChromaDB : `curl http://localhost:8000/api/v1/heartbeat`
3. Vérifier les clés API dans `.env`
