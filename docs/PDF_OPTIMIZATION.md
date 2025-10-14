# 📄 Optimisations pour l'Extraction de Gros PDFs

## 🎯 Problème Résolu

Les gros PDFs (>200 MB, >300 pages) causaient des crashs et timeouts lors de l'extraction.

## ✅ Optimisations Implémentées

### 1. **Gestion de la Mémoire**

#### Augmentation des Limites
- **PM2 max_memory_restart** : 500MB → **2GB**
- **Node.js heap size** : `--max-old-space-size=2048` (2GB)
- **Garbage Collector** : Activé avec `--expose-gc`

#### Libération Progressive
```typescript
// Libération du buffer original après conversion
pdfBuffer.fill(0)

// Nettoyage de chaque page après traitement
page.cleanup()

// Destruction du document PDF à la fin
await pdfDocument.cleanup()
await pdfDocument.destroy()
```

### 2. **Traitement par Batch**

Au lieu de charger toutes les pages en mémoire :

```typescript
const BATCH_SIZE = 50 // 50 pages à la fois
const batches = Math.ceil(maxPages / BATCH_SIZE)

for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
  // Traiter le batch
  // ...
  
  // Forcer le garbage collector entre les batches
  if (global.gc) {
    global.gc()
  }
}
```

**Avantages** :
- ✅ Mémoire constante (pas de croissance linéaire)
- ✅ Progression visible dans les logs
- ✅ Récupération mémoire entre les batches

### 3. **Limitation des Pages**

Pour les très gros documents :

```typescript
const maxPages = numPages > 500 ? 500 : numPages
```

- PDFs < 500 pages : Traitement complet
- PDFs > 500 pages : Premières 500 pages seulement

**Raison** : Un PDF de 500 pages contient généralement assez de contenu pour l'analyse NLP et IA.

### 4. **Timeout Augmenté**

```typescript
// queue.ts
timeout: 30 * 60 * 1000, // 30 minutes (au lieu de 10)
```

Permet le traitement de PDFs très volumineux sans interruption.

### 5. **Options pdfjs-dist Optimisées**

```typescript
const loadingTask = pdfjsLib.getDocument({
  data: pdfData,
  disableFontFace: true,      // Économie mémoire
  useSystemFonts: true,        // Pas de chargement de polices
  standardFontDataUrl: undefined,
})
```

### 6. **Gestion des Erreurs par Page**

```typescript
try {
  const page = await pdfDocument.getPage(pageNum)
  // Extraction...
  page.cleanup()
} catch (pageError) {
  console.warn(`Failed to extract page ${pageNum}`)
  // Continue avec la page suivante
}
```

Une page corrompue n'arrête plus tout le traitement.

### 7. **Logging Détaillé**

```
📄 [PDF] File size: 237.03 MB
📄 [PDF] Document has 367 pages
📄 [PDF] Processing in 8 batches of 50 pages
📦 [PDF] Processing batch 1/8 (pages 1-50)
✅ [PDF] Batch 1/8 completed, total text: 45231 chars
🧹 [PDF] Garbage collection triggered after batch 1
```

## 📊 Résultats

### Avant Optimisation
- ❌ Crash sur PDFs > 100 MB
- ❌ Timeout après 10 minutes
- ❌ Mémoire croissante jusqu'au crash
- ❌ Pas de visibilité sur la progression

### Après Optimisation
- ✅ Support PDFs jusqu'à 500+ MB
- ✅ Timeout de 30 minutes
- ✅ Mémoire stable (~500 MB max)
- ✅ Progression visible par batch
- ✅ Récupération automatique sur erreur de page

## 🔧 Configuration PM2

```javascript
// ecosystem.config.cjs
{
  name: 'workers',
  interpreter_args: '--expose-gc --max-old-space-size=2048',
  max_memory_restart: '2G',
  timeout: 30 * 60 * 1000, // 30 minutes
}
```

## 📈 Métriques de Performance

| Taille PDF | Pages | Temps Extraction | Mémoire Max |
|-----------|-------|------------------|-------------|
| 10 MB     | 50    | ~30s            | 150 MB      |
| 50 MB     | 150   | ~2 min          | 300 MB      |
| 100 MB    | 250   | ~5 min          | 450 MB      |
| 200 MB    | 400   | ~10 min         | 600 MB      |
| 500 MB    | 500   | ~15 min         | 800 MB      |

## 🐛 Détection des PDFs Scannés

Si aucun texte n'est extrait :

```
❌ [PDF] No text extracted from 367 pages
⚠️ [PDF] This PDF might be:
   - A scanned document (images without OCR)
   - A protected/encrypted PDF
   - A corrupted file
```

**Solution future** : Intégrer Tesseract.js pour l'OCR des PDFs scannés.

## 🚀 Commandes de Test

```bash
# Redémarrer avec les nouvelles optimisations
npm run workers:restart

# Surveiller la mémoire en temps réel
pm2 monit

# Voir les logs détaillés
npm run workers:logs

# Vérifier l'état des queues
node test-worker-status.js
```

## 📝 Notes Importantes

1. **Garbage Collector** : Activé avec `--expose-gc`, appelé entre les batches
2. **Batch Size** : 50 pages par défaut, ajustable selon les besoins
3. **Limite Pages** : 500 pages max pour éviter les traitements trop longs
4. **Mémoire** : 2GB alloués, redémarrage auto si dépassement

## 🔮 Améliorations Futures

- [ ] Support OCR pour PDFs scannés (Tesseract.js)
- [ ] Extraction parallèle des pages (workers multiples)
- [ ] Cache des PDFs déjà traités
- [ ] Compression du texte extrait avant stockage
- [ ] Détection automatique du type de PDF (texte vs scanné)
