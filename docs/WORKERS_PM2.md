# 🚀 Gestion des Workers avec PM2

Ce guide explique comment gérer les workers de traitement de documents avec PM2.

## 📋 Prérequis

PM2 est déjà installé globalement. Si ce n'est pas le cas :

```bash
npm install -g pm2
```

## 🎯 Commandes Rapides

### Démarrer les workers

```bash
npm run workers:start
# ou directement
pm2 start ecosystem.config.cjs
```

### Vérifier le statut

```bash
npm run workers:status
# ou
pm2 status
```

### Voir les logs en temps réel

```bash
npm run workers:logs
# ou
pm2 logs workers
```

### Redémarrer les workers

```bash
npm run workers:restart
# ou
pm2 restart workers
```

### Arrêter les workers

```bash
npm run workers:stop
# ou
pm2 stop workers
```

### Supprimer les workers de PM2

```bash
npm run workers:delete
# ou
pm2 delete workers
```

### Monitorer en temps réel

```bash
npm run workers:monit
# ou
pm2 monit
```

## 📊 Monitoring Avancé

### Voir les statistiques détaillées

```bash
pm2 show workers
```

### Voir les logs avec filtrage

```bash
# Dernières 100 lignes
pm2 logs workers --lines 100

# Logs d'erreur uniquement
pm2 logs workers --err

# Logs de sortie uniquement
pm2 logs workers --out
```

### Vider les logs

```bash
pm2 flush workers
```

## 🔧 Configuration

La configuration PM2 se trouve dans `ecosystem.config.cjs` :

- **Instances** : 1 (un seul processus)
- **Mode** : fork
- **Auto-restart** : Oui
- **Max memory** : 500MB (redémarre si dépassé)
- **Max restarts** : 10 tentatives
- **Restart delay** : 4 secondes

### Logs

Les logs sont stockés dans :
- `logs/workers-out.log` : Logs de sortie standard
- `logs/workers-error.log` : Logs d'erreur

## 🚀 Démarrage Automatique au Boot

Pour que les workers démarrent automatiquement au démarrage du système :

```bash
# Sauvegarder la configuration actuelle
pm2 save

# Générer le script de démarrage
pm2 startup

# Suivre les instructions affichées (copier/coller la commande)
```

Pour désactiver le démarrage automatique :

```bash
pm2 unstartup
```

## 🔍 Diagnostic

### Vérifier si les workers tournent

```bash
pm2 status
# ou
ps aux | grep workers
```

### Vérifier l'état des queues

```bash
node test-worker-status.js
```

### Vérifier Redis

```bash
docker ps | grep redis
```

## 🐛 Dépannage

### Les workers ne démarrent pas

1. Vérifier que Redis est actif :
   ```bash
   docker ps | grep redis
   ```

2. Vérifier les logs d'erreur :
   ```bash
   pm2 logs workers --err --lines 50
   ```

3. Redémarrer les workers :
   ```bash
   pm2 restart workers
   ```

### Les workers crashent en boucle

1. Vérifier la mémoire disponible :
   ```bash
   pm2 show workers
   ```

2. Augmenter la limite mémoire dans `ecosystem.config.cjs` :
   ```javascript
   max_memory_restart: '1G', // au lieu de 500M
   ```

3. Redémarrer :
   ```bash
   pm2 restart workers
   ```

### Les jobs ne sont pas traités

1. Vérifier que les workers sont actifs :
   ```bash
   pm2 status
   ```

2. Vérifier l'état des queues :
   ```bash
   node test-worker-status.js
   ```

3. Vérifier les logs en temps réel :
   ```bash
   pm2 logs workers
   ```

## 📈 Environnements

### Développement (par défaut)

```bash
pm2 start ecosystem.config.cjs
```

### Production

```bash
pm2 start ecosystem.config.cjs --env production
```

## 🔄 Workflow Recommandé

### Développement Local

1. **Démarrer Redis** :
   ```bash
   npm run docker:up
   ```

2. **Démarrer les workers** :
   ```bash
   npm run workers:start
   ```

3. **Démarrer le serveur Payload** :
   ```bash
   npm run dev
   ```

4. **Monitorer les workers** :
   ```bash
   npm run workers:logs
   ```

### Production

1. Utiliser PM2 avec démarrage automatique
2. Configurer les alertes de monitoring
3. Mettre en place une rotation des logs
4. Utiliser un reverse proxy (nginx) devant l'application

## 📚 Ressources

- [Documentation PM2](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Process Management](https://pm2.keymetrics.io/docs/usage/process-management/)
- [PM2 Log Management](https://pm2.keymetrics.io/docs/usage/log-management/)
