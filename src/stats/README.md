# Module tenantStats

Ce module centralise toutes les fonctions utilitaires de monitoring/statistiques par tenant pour Payload CMS.

## Fonctions principales

- `getUserCountForTenant(tenantId)` : Nombre total d'utilisateurs
- `getActiveUserCountForTenant(tenantId)` : Nombre d'utilisateurs actifs (30j)
- `getCourseCountForTenant(tenantId)` : Nombre de cours créés
- `getQuizCountForTenant(tenantId)` : Nombre de quizz créés
- `getMediaCountForTenant(tenantId)` : Nombre de médias/documents
- `getStorageUsedForTenant(tenantId)` : Stockage utilisé (Mo)
- `getLoginCountForTenant(tenantId)` : Nombre de connexions (30j)
- `getActionCountForTenant(tenantId, days)` : Nombre d'actions (période)
- `getActivePlansForTenant(tenantId)` : Nombre de plans actifs
- `isQuotaExceededForTenant(tenantId)` : Dépassement de quota
- `getAvgCourseCompletionForTenant(tenantId)` : Taux de complétion moyen
- `getAllTenantStats(tenantId)` : Agrégation de toutes les stats

## Utilisation

Importer la fonction souhaitée :

```typescript
import { getAllTenantStats } from './tenantStats';

const stats = await getAllTenantStats('tenantId');
```

## Cas limites
- Si un champ n'existe pas (ex: `lastLogin`, `size`), adapter la fonction ou retourner 0
- Les fonctions gèrent les erreurs et retournent 0 ou false en cas d'échec

## Sécurité
- Ces fonctions doivent être utilisées uniquement dans des endpoints protégés (ex: accès superadmin)

## Extension
- Ajoutez vos propres métriques en suivant le modèle proposé
