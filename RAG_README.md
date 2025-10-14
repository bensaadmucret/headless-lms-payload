# 🧠 Système RAG - Retrieval-Augmented Generation

> **Système de recherche sémantique intelligent pour vos documents**

## 🎯 Qu'est-ce que c'est ?

Le système RAG transforme vos documents PDF en une base de connaissances interrogeable intelligemment. Au lieu de chercher des mots-clés exacts, vous pouvez poser des questions en langage naturel et obtenir les passages les plus pertinents.

### Exemple Concret

**Sans RAG (recherche classique) :**
```
Recherche: "symptômes"
→ Trouve uniquement les pages contenant le mot "symptômes"
```

**Avec RAG (recherche sémantique) :**
```
Question: "Quels sont les signes de la maladie ?"
→ Trouve les passages parlant de symptômes, signes cliniques, manifestations, etc.
→ Classés par pertinence sémantique
```

## ✨ Fonctionnalités

- 🔍 **Recherche sémantique** : Comprend le sens, pas juste les mots
- 📊 **Multi-documents** : Recherche dans tous vos documents à la fois
- 🎯 **Pertinence** : Résultats classés par score de similarité
- ⚡ **Rapide** : Recherche vectorielle optimisée avec ChromaDB
- 🔄 **Asynchrone** : Traitement en arrière-plan avec Bull
- 🌐 **Multi-providers** : OpenAI, HuggingFace ou Local

## 🚀 Démarrage Rapide (5 minutes)

### 1. Installer les Dépendances

```bash
pnpm install
```

### 2. Démarrer ChromaDB

```bash
# Option A : Tous les services
docker-compose up -d

# Option B : ChromaDB seul
npm run rag:chromadb
```

### 3. Configurer

```bash
# Copier le fichier exemple
cp .env.example .env

# Ajouter dans .env :
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=sk-...  # Ou utiliser 'local' (gratuit mais lent)
```

### 4. Tester

```bash
npm run rag:test
```

Si vous voyez `🎉 TOUS LES TESTS SONT PASSÉS!`, c'est prêt !

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[RAG_QUICKSTART.md](docs/RAG_QUICKSTART.md)** | Guide de démarrage rapide |
| **[RAG_SYSTEM.md](docs/RAG_SYSTEM.md)** | Documentation technique complète |
| **[RAG_IMPLEMENTATION_SUMMARY.md](docs/RAG_IMPLEMENTATION_SUMMARY.md)** | Résumé de l'implémentation |

## 💻 Utilisation

### Traiter un Document

```typescript
import { addRAGJob } from './src/jobs/queue'

// Après l'extraction d'un PDF
await addRAGJob({
  type: 'rag-processing',
  documentId: 'doc_123',
  extractedText: '...texte extrait...',
  priority: 'normal',
  userId: 'user_456',
  embeddingOptions: {
    provider: 'openai'  // ou 'local' si pas de clé API
  }
})
```

### Rechercher dans un Document

```typescript
import { searchInDocument } from './src/jobs/workers/ragWorker'

const results = await searchInDocument(
  'doc_123',
  'Quels sont les symptômes ?',
  { topK: 5, minScore: 0.5 }
)

console.log(results.results)
// [
//   { content: "Les symptômes incluent...", score: 0.92 },
//   { content: "On observe également...", score: 0.87 },
//   ...
// ]
```

## 🏗️ Architecture

```
PDF → Extraction → Chunking → Embeddings → Vector Store → Recherche
      (pdfjs)     (LangChain) (OpenAI/HF)  (ChromaDB)    (Sémantique)
```

### Composants

1. **chunkingService** : Découpe le texte en morceaux intelligents
2. **embeddingService** : Transforme le texte en vecteurs numériques
3. **vectorStoreService** : Stocke et recherche dans ChromaDB
4. **ragWorker** : Orchestre le pipeline complet

## 🔧 Configuration

### Providers d'Embeddings

| Provider | Qualité | Vitesse | Coût | Configuration |
|----------|---------|---------|------|---------------|
| **OpenAI** | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | 💰 | `OPENAI_API_KEY=sk-...` |
| **HuggingFace** | ⭐⭐⭐⭐ | ⚡⚡ | 💰 | `HUGGINGFACE_API_KEY=hf_...` |
| **Local** | ⭐⭐⭐ | ⚡ | ✅ Gratuit | Pas de clé nécessaire |

**Recommandation :**
- **Développement** : Local (gratuit)
- **Production** : OpenAI (meilleure qualité)

## 📊 Performance

| Document | Chunks | Provider | Temps | Coût |
|----------|--------|----------|-------|------|
| 10 pages | 15 | OpenAI | ~5s | $0.01 |
| 50 pages | 75 | OpenAI | ~15s | $0.05 |
| 100 pages | 150 | OpenAI | ~30s | $0.10 |
| 100 pages | 150 | Local | ~2min | Gratuit |

## 🛠️ Commandes Utiles

```bash
# Tester le système RAG
npm run rag:test

# Démarrer ChromaDB
npm run rag:chromadb

# Vérifier la santé de ChromaDB
npm run rag:health

# Démarrer tous les services
docker-compose up -d

# Voir les logs des workers
npm run workers:logs

# Statut des workers
npm run workers:status
```

## 🔍 Exemples Complets

Voir le fichier **[examples/rag-usage-example.ts](examples/rag-usage-example.ts)** pour :

1. ✅ Traiter un document avec RAG
2. ✅ Rechercher dans un document
3. ✅ Obtenir les statistiques
4. ✅ Recherche globale multi-documents
5. ✅ Supprimer les données RAG
6. ✅ Vérifier la santé de ChromaDB
7. ✅ Pipeline complet

## 🐛 Dépannage

### ChromaDB ne démarre pas

```bash
# Vérifier le port
lsof -i :8000

# Redémarrer
docker-compose restart chromadb
```

### Erreur "Cannot find module"

```bash
# Réinstaller
rm -rf node_modules
pnpm install
```

### Embeddings trop lents

```typescript
// Utiliser OpenAI au lieu de local
embeddingOptions: { provider: 'openai' }
```

## 📚 Ressources

- **Documentation LangChain** : https://js.langchain.com/
- **ChromaDB** : https://docs.trychroma.com/
- **OpenAI Embeddings** : https://platform.openai.com/docs/guides/embeddings

## ✅ Checklist

- [ ] Dépendances installées
- [ ] ChromaDB démarré
- [ ] Variables d'environnement configurées
- [ ] Test réussi
- [ ] Premier document traité
- [ ] Première recherche effectuée

## 🎉 Prêt à Utiliser !

Votre système RAG est maintenant opérationnel. Consultez la [documentation complète](docs/RAG_SYSTEM.md) pour aller plus loin.

---

**Questions ?** Consultez la documentation ou les exemples d'utilisation.
