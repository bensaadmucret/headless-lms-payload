# Suivi des TODO et FIXME

## 📊 Vue d'ensemble

**Total : 18 TODO/FIXME** identifiés dans le code

## 🔴 Priorité HAUTE - À résoudre immédiatement

### 1. AdaptiveQuizService.ts - Cooldown désactivé en développement

**Fichier :** `src/services/AdaptiveQuizService.ts:546`

```typescript
// TODO: Re-enable in production
```

**Problème :** Le cooldown entre les quiz adaptatifs est désactivé pour le développement.

**Action :**
- [ ] Créer une variable d'environnement `ADAPTIVE_QUIZ_COOLDOWN_ENABLED`
- [ ] Réactiver en production
- [ ] Documenter dans le README

**Ticket :** #TODO-001

---

### 2. ✅ tenantStats.ts - Collections non reconnues (RÉSOLU)

**Fichier :** `src/stats/tenantStats.ts:143,162`

```typescript
// TODO: Slug non reconnu, à aligner avec la config Payload
collection: 'auditLog' as any
collection: 'subscriptionPlan' as any
```

**Problème :** Les slugs de collections ne correspondent pas à la configuration Payload.

**Action :**
- [x] Vérifier les noms corrects dans `payload.config.ts`
- [x] Corriger : `auditLog` → `auditlogs`
- [x] Corriger : `subscriptionPlan` → `subscription-plans`
- [x] Supprimer les `as any`

**Ticket :** #TODO-002 ✅ **RÉSOLU**

---

## 🟡 Priorité MOYENNE - À planifier

### 3. AIAPIService.ts - Métriques de cache manquantes

**Fichier :** `src/services/AIAPIService.ts:409,572,578,579`

```typescript
// TODO: Implémenter le tracking des hits/misses
// TODO: Implémenter la détection de santé
// TODO: Implémenter le tracking des temps de réponse
```

**Problème :** Les métriques de performance du cache et de l'API ne sont pas implémentées.

**Action :**
- [ ] Ajouter un compteur de hits/misses dans la classe de cache
- [ ] Implémenter un health check pour l'API externe
- [ ] Tracker les temps de réponse moyens
- [ ] Exposer ces métriques dans l'endpoint `/diagnostics`

**Ticket :** #TODO-003

**Estimation :** 2-3 heures

---

### 4. SpacedRepetitionSchedulingService.ts - Collection dédiée manquante

**Fichier :** `src/services/SpacedRepetitionSchedulingService.ts:341`

```typescript
// TODO: Créer une collection dédiée SpacedRepetitionSchedules
```

**Problème :** Les schedules de répétition espacée sont stockés dans `study-sessions` au lieu d'une collection dédiée.

**Action :**
- [ ] Créer la collection `SpacedRepetitionSchedules` dans `src/collections/`
- [ ] Définir le schéma approprié
- [ ] Migrer les données existantes
- [ ] Mettre à jour le service

**Ticket :** #TODO-004

**Estimation :** 4-6 heures

---

### 5. JSONProcessingService.ts - Collection parcours d'apprentissage

**Fichier :** `src/services/JSONProcessingService.ts:480`

```typescript
// TODO: Créer une collection dédiée aux parcours d'apprentissage
```

**Problème :** Pas de collection dédiée pour les parcours d'apprentissage.

**Action :**
- [ ] Analyser les besoins métier pour les parcours
- [ ] Créer la collection `LearningPaths`
- [ ] Définir les relations avec les cours et quiz
- [ ] Mettre à jour le service d'import JSON

**Ticket :** #TODO-005

**Estimation :** 6-8 heures

---

## 🟢 Priorité BASSE - Améliorations futures

### 6. Génération de distracteurs avec IA

**Fichiers :**
- `src/services/FlashcardImportService.ts:673`
- `src/services/JSONProcessingService.ts:801`
- `src/services/FlashcardConversionService.ts:292`

```typescript
// TODO: Améliorer avec l'IA pour générer des distracteurs contextuels
```

**Problème :** Les distracteurs (mauvaises réponses) sont générés de manière basique.

**Action :**
- [ ] Intégrer avec le service IA existant
- [ ] Créer des prompts pour générer des distracteurs pertinents
- [ ] Valider la qualité des distracteurs générés
- [ ] Ajouter des tests

**Ticket :** #TODO-006

**Estimation :** 8-10 heures

---

### 7. Questions.ts - Bouton de génération IA

**Fichier :** `src/collections/Questions.ts:10`

```typescript
// TODO: Ajouter le bouton de génération IA une fois la structure déterminée
```

**Problème :** Le bouton de génération IA dans l'admin n'est pas activé.

**Action :**
- [ ] Vérifier que le composant `GenerateAIQuestionsButton` existe
- [ ] Décommenter et tester
- [ ] Documenter l'utilisation

**Ticket :** #TODO-007

**Estimation :** 1-2 heures

---

### 8. generateAdaptiveQuiz.ts - Audit logs commentés

**Fichier :** `src/endpoints/generateAdaptiveQuiz.ts:42,104,113`

```typescript
// TODO: Uncomment when auditlogs collection is created
```

**Problème :** Les logs d'audit sont commentés.

**Action :**
- [ ] Vérifier que la collection `audit-logs` existe
- [ ] Décommenter les appels au service d'audit
- [ ] Tester le logging
- [ ] Vérifier que les logs apparaissent dans l'admin

**Ticket :** #TODO-008

**Estimation :** 30 minutes

---

### 9. checkAdaptiveQuizEligibility.ts - Calcul des catégories

**Fichier :** `src/endpoints/checkAdaptiveQuizEligibility.ts:43`

```typescript
categoriesAvailable: 10 // TODO: Calculate actual number
```

**Problème :** Le nombre de catégories disponibles est hardcodé.

**Action :**
- [ ] Implémenter le calcul réel du nombre de catégories
- [ ] Prendre en compte le niveau de l'étudiant (PASS/LAS)
- [ ] Filtrer les catégories avec suffisamment de questions

**Ticket :** #TODO-009

**Estimation :** 1 heure

---

### 10. generateAdaptiveQuiz.ts - Niveau étudiant hardcodé

**Fichier :** `src/endpoints/generateAdaptiveQuiz.ts:71`

```typescript
studentLevel: 'PASS' // TODO: Get from user
```

**Problème :** Le niveau de l'étudiant est hardcodé.

**Action :**
- [ ] Récupérer le niveau depuis `req.user.studentLevel`
- [ ] Ajouter une validation
- [ ] Gérer le cas où le niveau n'est pas défini

**Ticket :** #TODO-010

**Estimation :** 30 minutes

---

## 📋 Plan d'action

### Sprint 1 (Priorité HAUTE) - 1 jour
- [ ] TODO-001 : Réactiver cooldown en production
- [x] TODO-002 : Corriger les slugs de collections ✅

### Sprint 2 (Priorité MOYENNE) - 2-3 jours
- [ ] TODO-003 : Implémenter métriques de cache
- [ ] TODO-008 : Décommenter audit logs
- [ ] TODO-009 : Calculer catégories disponibles
- [ ] TODO-010 : Récupérer niveau étudiant

### Sprint 3 (Améliorations) - 1 semaine
- [ ] TODO-004 : Collection SpacedRepetitionSchedules
- [ ] TODO-005 : Collection LearningPaths
- [ ] TODO-007 : Activer bouton génération IA

### Backlog (Futures améliorations)
- [ ] TODO-006 : Distracteurs avec IA

## 🔧 Commandes utiles

### Rechercher tous les TODO
```bash
grep -rn "// TODO" src --include="*.ts"
```

### Compter les TODO par fichier
```bash
grep -r "// TODO" src --include="*.ts" | cut -d: -f1 | sort | uniq -c | sort -rn
```

### Rechercher les TODO d'un type spécifique
```bash
grep -rn "// TODO.*collection" src --include="*.ts"
```

## 📊 Statistiques

| Catégorie | Nombre | Temps estimé | Complété |
|-----------|--------|--------------|----------|
| Priorité HAUTE | 2 | 2h | 1/2 ✅ |
| Priorité MOYENNE | 6 | 12h | 0/6 |
| Priorité BASSE | 4 | 20h | 0/4 |
| **TOTAL** | **12** | **34h** | **1/12 (8%)** |

## ✅ Résolution d'un TODO

Quand vous résolvez un TODO :

1. Supprimer le commentaire TODO du code
2. Cocher la case dans ce document
3. Fermer le ticket associé
4. Mettre à jour les statistiques
5. Commit avec le message : `fix: resolve TODO-XXX - description`

## 🎯 Objectif

**Réduire à 0 TODO** dans le code de production d'ici 2 sprints.
