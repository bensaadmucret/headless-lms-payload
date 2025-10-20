# 🌱 Seed des Catégories Médicales

Ce script permet de générer automatiquement toutes les catégories nécessaires pour le système de quiz PASS/LAS.

## 📋 Catégories incluses

Le script crée **30 catégories** couvrant toutes les UE (Unités d'Enseignement) :

### UE1 - Chimie, Biochimie, Biologie moléculaire
- Chimie générale et organique
- Biochimie structurale
- Biochimie métabolique
- Biologie moléculaire

### UE2 - Biologie cellulaire
- Structure et fonction cellulaire
- Cycle cellulaire et division
- Communication cellulaire

### UE3 - Physique, Biophysique
- Physique des fluides
- Électricité et magnétisme
- Biophysique des radiations
- Imagerie médicale

### UE4 - Mathématiques, Biostatistiques
- Probabilités et statistiques
- Tests statistiques
- Épidémiologie

### UE5 - Anatomie
- Anatomie générale
- Système nerveux
- Système cardiovasculaire
- Système respiratoire
- Système digestif
- Appareil locomoteur

### UE6 - Pharmacologie
- Pharmacocinétique
- Pharmacodynamie
- Classes thérapeutiques

### UE7 - Sciences humaines et sociales
- Santé publique
- Éthique médicale
- Droit de la santé

### Catégories spécifiques
- Positionnement Las
- Positionnement Pass
- Quiz de révision générale

## 🚀 Utilisation

### Commande simple
```bash
npm run seed:categories
```

### Ou directement avec node
```bash
node seed-categories.mjs
```

## ⚙️ Fonctionnement

Le script :
1. ✅ Vérifie si des catégories existent déjà
2. ⏭️ Ignore les catégories déjà présentes (évite les doublons)
3. ➕ Crée uniquement les catégories manquantes
4. 📊 Affiche un résumé détaillé

## 📊 Exemple de sortie

```
🌱 Démarrage du seed des catégories...

✅ Catégorie créée: "Chimie générale et organique" (both)
✅ Catégorie créée: "Biochimie structurale" (both)
⏭️  Catégorie déjà existante: "Anatomie générale"
...

============================================================
📊 Résumé du seed:
   ✅ Créées: 25
   ⏭️  Ignorées (déjà existantes): 5
   ❌ Erreurs: 0
   📝 Total traité: 30
============================================================

🎉 Seed terminé avec succès !
```

## 🔧 Personnalisation

Pour modifier les catégories, éditez le fichier `seed-categories.mjs` :

```javascript
const categories = [
  {
    title: 'Votre catégorie',
    level: 'both', // 'PASS', 'LAS', ou 'both'
    adaptiveSettings: { 
      isActive: true, 
      minimumQuestions: 10 
    }
  },
  // ...
];
```

## 🎯 Cas d'usage

### Première installation
```bash
npm run seed:categories
```
→ Crée toutes les 30 catégories

### Ajout de nouvelles catégories
1. Modifiez `seed-categories.mjs`
2. Ajoutez vos catégories
3. Exécutez `npm run seed:categories`
→ Seules les nouvelles catégories seront créées

### Réinitialisation complète
Si vous voulez repartir de zéro :
1. Supprimez toutes les catégories dans l'admin Payload
2. Exécutez `npm run seed:categories`

## 📝 Notes

- Le script est **idempotent** : vous pouvez l'exécuter plusieurs fois sans risque
- Les catégories existantes ne sont **jamais modifiées**
- Chaque catégorie a des **paramètres adaptatifs** configurés pour les quiz intelligents
- Les niveaux (`PASS`, `LAS`, `both`) permettent de cibler les bonnes populations d'étudiants

## 🔒 Sécurité

Le script nécessite :
- ✅ Une connexion à la base de données (via `.env`)
- ✅ Les permissions de création sur la collection `categories`

## 🐛 Dépannage

### Erreur de connexion à la base de données
```
❌ Erreur fatale lors du seed: Connection refused
```
→ Vérifiez que PostgreSQL est démarré et que les variables d'environnement sont correctes

### Erreur de permissions
```
❌ Erreur lors de la création: Insufficient permissions
```
→ Assurez-vous que l'utilisateur Payload a les droits de création

## 📚 Ressources

- [Documentation Payload CMS](https://payloadcms.com/docs)
- [Structure des catégories](./src/collections/Categories.ts)
