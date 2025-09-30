# 🐳 Configuration Docker pour le Système Asynchrone

## 🎯 Vue d'Ensemble

Le système asynchrone nécessite **Redis** pour les queues et **PostgreSQL** pour la base de données. Tout est configuré avec Docker Compose pour un démarrage simple.

## 📋 Services Docker

### Services Configurés
```yaml
services:
  db:        # PostgreSQL 15
  redis:     # Redis 7 Alpine
```

### Ports Exposés
- **PostgreSQL** : `5433:5432` (évite conflit avec Postgres local)
- **Redis** : `6379:6379` (port standard)

## 🚀 Démarrage Rapide

### 1. Démarrer les Services
```bash
# Démarrer PostgreSQL + Redis en arrière-plan
npm run docker:up

# Vérifier que les services sont up
docker ps
```

### 2. Tester la Connectivité
```bash
# Tester Redis
npm run test:redis

# Tester PostgreSQL (si configuré)
docker exec -it payload-cms-db-1 psql -U payload -d payload -c "SELECT 1;"
```

### 3. Lancer l'Application
```bash
# Terminal 1: App principale
npm run dev

# Terminal 2: Workers asynchrones
npm run workers
```

## 🔧 Configuration Environnement

### Copier la Configuration
```bash
cp .env.docker.example .env.local
```

### Variables Clés
```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# PostgreSQL
DATABASE_URI=postgresql://payload:password@localhost:5433/payload
```

## 📊 Commandes Utiles

### Gestion Docker
```bash
# Démarrer les services
npm run docker:up

# Arrêter les services
npm run docker:down

# Voir les logs en temps réel
npm run docker:logs

# Démarrer services + app
npm run docker:dev
```

### Debugging Redis
```bash
# Se connecter au Redis CLI
docker exec -it payload-cms-redis-1 redis-cli

# Vérifier la santé
docker exec -it payload-cms-redis-1 redis-cli ping

# Voir les queues actives
docker exec -it payload-cms-redis-1 redis-cli keys "*bull*"
```

### Debugging PostgreSQL
```bash
# Se connecter à la base
docker exec -it payload-cms-db-1 psql -U payload -d payload

# Voir les tables
docker exec -it payload-cms-db-1 psql -U payload -d payload -c "\\dt"
```

## 🛠 Résolution de Problèmes

### Redis Connection Failed
```bash
# 1. Vérifier que Redis tourne
docker ps | grep redis

# 2. Voir les logs Redis
docker-compose logs redis

# 3. Redémarrer Redis
docker-compose restart redis

# 4. Tester la connectivité
npm run test:redis
```

### Port Already in Use
```bash
# Si port 6379 occupé, changer dans docker-compose.yml
ports:
  - "6380:6379"  # Utiliser port 6380 localement

# Puis mettre à jour .env.local
REDIS_PORT=6380
```

### Workers Ne Démarrent Pas
```bash
# 1. Vérifier Redis
npm run test:redis

# 2. Vérifier les variables d'environnement
cat .env.local

# 3. Démarrer avec debug
DEBUG=bull* npm run workers
```

## 📈 Monitoring

### Dashboard Bull (À venir)
- URL : `http://localhost:3000/admin/jobs`
- Stats des queues en temps réel
- Retry et management des jobs

### Redis Monitor
```bash
# Voir les commandes Redis en temps réel
docker exec -it payload-cms-redis-1 redis-cli monitor

# Stats Redis
docker exec -it payload-cms-redis-1 redis-cli info stats
```

## 🔄 Workflow Complet

### Développement
```bash
# 1. Démarrer l'infra
npm run docker:up

# 2. Vérifier Redis
npm run test:redis

# 3. Terminal 1: App
npm run dev

# 4. Terminal 2: Workers  
npm run workers

# 5. Tester upload
curl -X POST http://localhost:3000/api/upload-test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@test.txt"
```

### Production
```bash
# Build image
docker build -t medcoach-app .

# Run avec docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

## 📋 Checklist Setup

- [ ] Docker et Docker Compose installés
- [ ] `npm run docker:up` réussi
- [ ] `npm run test:redis` passe ✅
- [ ] `.env.local` configuré
- [ ] `npm run dev` démarre sans erreur
- [ ] `npm run workers` connecte à Redis
- [ ] Upload de test fonctionne

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │    │  Redis (Queue)  │    │ PostgreSQL DB  │
│   Port: 3000    │◄──►│   Port: 6379    │    │   Port: 5433    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       ▲
         │              ┌─────────────────┐
         └─────────────►│  Workers Node   │
                        │  (Background)   │
                        └─────────────────┘
```

## 🎯 Prochaines Étapes

1. **Phase 3** : Endpoint upload asynchrone
2. **Bull Dashboard** : Interface de monitoring  
3. **Health Checks** : Monitoring automatique
4. **Scaling** : Multiple workers et load balancing

---

**Redis est maintenant prêt pour le système asynchrone ! 🚀**