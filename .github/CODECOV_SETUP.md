# Configuration Codecov pour MedCoach Backend

## 🔧 Configuration GitHub Actions

La configuration est maintenant active dans `.github/workflows/ci.yml`.

## 📝 Étapes pour Activer Codecov

### 1. Créer un Compte Codecov

1. Aller sur [codecov.io](https://codecov.io)
2. Se connecter avec GitHub
3. Autoriser l'accès au repository `bensaadmucret/headless-lms-payload`

### 2. Obtenir le Token Codecov

1. Sur Codecov, aller dans le repository
2. Aller dans **Settings** → **General**
3. Copier le **Upload Token**

### 3. Ajouter le Token aux Secrets GitHub

1. Aller sur GitHub : `https://github.com/bensaadmucret/headless-lms-payload/settings/secrets/actions`
2. Cliquer sur **New repository secret**
3. Nom : `CODECOV_TOKEN`
4. Valeur : Coller le token copié depuis Codecov
5. Cliquer sur **Add secret**

### 4. Vérifier la Configuration

Une fois le secret ajouté, le prochain push déclenchera :
- ✅ Exécution des tests avec couverture
- ✅ Upload automatique vers Codecov
- ✅ Rapport de couverture dans les artifacts
- ✅ Badge de couverture disponible

## 📊 Badge de Couverture

Ajouter dans le `README.md` :

```markdown
[![codecov](https://codecov.io/gh/bensaadmucret/headless-lms-payload/branch/main/graph/badge.svg)](https://codecov.io/gh/bensaadmucret/headless-lms-payload)
```

## 🎯 Configuration Codecov (Optionnel)

Créer un fichier `codecov.yml` à la racine :

```yaml
coverage:
  status:
    project:
      default:
        target: 30%
        threshold: 1%
    patch:
      default:
        target: 50%
        threshold: 5%

comment:
  layout: "reach,diff,flags,tree"
  behavior: default
  require_changes: false

ignore:
  - "**/*.test.ts"
  - "**/__tests__/**"
  - "**/__mocks__/**"
  - "src/app/**"
  - "**/*.d.ts"
```

## 📈 Rapports Disponibles

Après le premier upload, vous aurez accès à :

1. **Dashboard Codecov** : Vue d'ensemble de la couverture
2. **Graphiques** : Évolution de la couverture dans le temps
3. **Fichiers** : Couverture par fichier
4. **Commits** : Impact de chaque commit sur la couverture
5. **Pull Requests** : Commentaires automatiques avec diff de couverture

## 🔍 Commandes Locales

```bash
# Générer le rapport de couverture
npm run test:vitest -- --coverage

# Voir le rapport HTML
open coverage/index.html

# Voir le résumé dans le terminal
cat coverage/coverage-summary.json | jq '.total'
```

## ✅ Checklist

- [ ] Compte Codecov créé
- [ ] Token Codecov obtenu
- [ ] Secret `CODECOV_TOKEN` ajouté sur GitHub
- [ ] Push sur `main` ou `develop` pour tester
- [ ] Vérifier le workflow sur GitHub Actions
- [ ] Vérifier le rapport sur Codecov
- [ ] Ajouter le badge dans README.md
- [ ] (Optionnel) Créer `codecov.yml` pour personnaliser

## 🆘 Dépannage

### Le workflow échoue

1. Vérifier que le secret `CODECOV_TOKEN` est bien configuré
2. Vérifier les logs du workflow GitHub Actions
3. S'assurer que les tests passent localement

### Pas de rapport sur Codecov

1. Vérifier que le fichier `coverage/lcov.info` est généré
2. Vérifier les logs de l'étape "Upload coverage to Codecov"
3. Vérifier que le token est valide

### Couverture à 0%

1. Vérifier que les tests s'exécutent bien
2. Vérifier la configuration dans `vite.config.ts`
3. S'assurer que les fichiers sources sont inclus

## 📞 Support

- Documentation Codecov : https://docs.codecov.com
- GitHub Actions : https://docs.github.com/actions
- Issues : Créer une issue sur le repository

---

**Status actuel** : Configuration prête, en attente du token Codecov
**Prochaine étape** : Ajouter le secret `CODECOV_TOKEN` sur GitHub
