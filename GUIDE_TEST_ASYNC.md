# 📋 Guide de Test - Système de Traitement Asynchrone

## 🎯 Vue d'ensemble du système

Votre système de traitement de documents est maintenant **100% asynchrone** ! Voici comment ça fonctionne :

```
📤 Upload (Admin) → 🧵 Queue Redis → 👷 Workers → ✅ Document Enrichi
```

### ✨ Nouveautés

1. **Upload instantané** : Plus d'attente de 2-5 minutes
2. **Traitement en arrière-plan** : Les workers traitent automatiquement
3. **Suivi en temps réel** : Statut visible dans l'admin
4. **Système robust** : Retry automatique en cas d'erreur

---

## 🚀 Comment tester

### 1️⃣ Démarrer les services

```bash
# Terminal 1 : Démarrer Redis + PostgreSQL
docker-compose up -d redis db

# Terminal 2 : Démarrer les workers
npm run workers

# Terminal 3 : Démarrer Payload (dans un autre terminal)
npm run dev
```

### 2️⃣ Créer un document via l'admin Payload

1. **Ouvrir l'admin** : `http://localhost:3000/admin`

2. **Aller dans "Base de Connaissances"**

3. **Créer un nouveau document** :
   - Titre : "Test Document Asynchrone"
   - Uploader un fichier (PDF, DOCX, TXT, ou EPUB)
   - **Laisser les autres champs vides** (ils se rempliront automatiquement)

4. **Sauvegarder** 

### 3️⃣ Observer le traitement automatique

Après la sauvegarde, le **hook automatique** va :

1. ✅ **Détecter** le nouveau fichier
2. 🧵 **Mettre en queue** le traitement
3. 📋 **Changer le statut** à "⏳ En File d'Attente"

Dans le terminal des workers, vous verrez :
```
📋 Job de traitement ajouté: doc-67890-1234567890
🔍 Lancement extraction pour: test.pdf
🧠 Lancement enrichissement pour: 67890
✅ Traitement complet terminé pour: 67890
```

### 4️⃣ Voir le statut en temps réel

**Dans l'admin Payload** :
- Rafraîchir la page du document
- Le statut changera : `En File d'Attente` → `Extraction en Cours` → `Enrichissement IA` → `Terminé`
- Les champs se rempliront automatiquement :
  - Contenu extrait
  - Mots-clés
  - Domaine médical  
  - Résumé IA

---

## 🔧 Endpoints de monitoring

### Statut des workers
```
GET /api/admin/workers/status
```

### Statut d'un document spécifique
```
GET /api/knowledge-base/{id}/status
```

### Redémarrer les workers (admin)
```
POST /api/admin/workers/restart
```

---

## 🐛 Dépannage

### ❌ Workers ne démarrent pas
```bash
# Vérifier Redis
docker ps | grep redis

# Vérifier les variables d'environnement
echo $GEMINI_API_KEY
```

### ❌ Hook ne se déclenche pas
- Vérifier que le document a un `sourceFile`
- Vérifier les logs dans le terminal des workers
- Le hook ne se déclenche que pour les créations ou changements de fichier

### ❌ Extraction échoue
- Types supportés : PDF, EPUB, DOCX, TXT
- Vérifier que le fichier n'est pas corrompu
- Les logs détaillés sont dans `processingLogs`

### ❌ Enrichissement IA échoue  
- Vérifier `GEMINI_API_KEY` 
- Le système a un fallback automatique
- Mots-clés basiques seront quand même générés

---

## 📊 Architecture technique

```
Admin UI (Create Document)
       ↓
Hook afterChange
       ↓  
QueueManager.addJob()
       ↓
Redis Queue
       ↓
DocumentProcessingWorker
       ↓
ContentExtractionWorker → AIEnrichmentWorker
       ↓
Update Knowledge Base
       ↓
Notification (optionnel)
```

### 🧵 Workers configurés

- **DocumentProcessingWorker** : 3 concurrency (orchestrateur)
- **ContentExtractionWorker** : 5 concurrency (I/O intensif)
- **AIEnrichmentWorker** : 2 concurrency (limité par API Gemini)

### 📋 Queues Redis

- `document-processing` : Jobs principaux
- `content-extraction` : Extraction PDF/EPUB/DOCX
- `ai-enrichment` : Enrichissement IA
- `notifications` : Notifications utilisateurs

---

## 🎉 Test de réussite

Votre test est **réussi** si :

1. ✅ Upload instantané (< 2 secondes)
2. ✅ Statut change automatiquement
3. ✅ Contenu extrait apparaît
4. ✅ Mots-clés générés
5. ✅ Domaine médical détecté
6. ✅ Résumé IA créé

---

## 🚀 Prochaines étapes

Une fois le test validé, vous pouvez :

1. **Déployer en production** avec Docker
2. **Ajouter plus de workers** pour traiter plus de documents
3. **Monitorer avec un dashboard** (BullMQ Board)
4. **Ajouter d'autres formats** de documents

Le système est prêt pour la production ! 🎯