# Implémentation de la Sécurité et Gestion des Erreurs - Quiz Adaptatifs

## Vue d'ensemble

Cette documentation décrit l'implémentation complète du système de sécurité et de gestion des erreurs pour les quiz adaptatifs dans Payload CMS, conformément aux exigences 5.1, 5.2, 5.3 et 5.4.

## 1. Système de Limitation de Taux (Rate Limiting)

### 1.1 Hook de Limitation de Taux

**Fichier:** `src/hooks/rateLimitHook.ts`

- **Limite quotidienne:** 5 quiz adaptatifs par jour par utilisateur
- **Cooldown:** 30 minutes entre chaque génération
- **Réinitialisation automatique:** À minuit chaque jour
- **Messages d'erreur informatifs:** Temps d'attente restant inclus

**Fonctionnalités:**
- `rateLimitHook`: Hook principal intégré dans la collection AdaptiveQuizSessions
- `checkDailyLimit()`: Vérifie la limite quotidienne
- `checkCooldown()`: Vérifie le cooldown de 30 minutes
- `getRateLimitInfo()`: Obtient les informations de limite pour un utilisateur

### 1.2 Service de Limitation de Taux

**Fichier:** `src/services/RateLimitService.ts`

**Fonctionnalités:**
- `checkRateLimit()`: Vérifie si un utilisateur peut générer un quiz
- `getRateLimitErrorMessage()`: Génère des messages d'erreur informatifs
- `getUserUsageStats()`: Statistiques d'utilisation (jour/semaine/mois)

### 1.3 Endpoints de Statut

**Fichier:** `src/endpoints/rateLimitStatus.ts`

- `GET /api/rate-limit/status`: Vérifie le statut des limitations
- `GET /api/rate-limit/usage-stats`: Statistiques d'utilisation détaillées

## 2. Validation et Sécurité Côté Serveur

### 2.1 Service de Validation

**Fichier:** `src/services/ValidationService.ts`

**Fonctionnalités:**
- `validateGenerationParams()`: Valide les paramètres de génération de quiz
- `validateSubmissionParams()`: Valide les paramètres de soumission
- `validateSessionIdFormat()`: Valide le format des IDs de session
- `sanitizeParams()`: Nettoie les paramètres d'entrée
- `validateDataLimits()`: Vérifie les limites de taille des données

**Validations implémentées:**
- Format et type des paramètres
- Limites de taille (max 50 réponses, 1000 caractères par réponse)
- Sanitisation contre les injections
- Validation des IDs de session (format: `adaptive_timestamp_randomstring`)

### 2.2 Service de Sécurité

**Fichier:** `src/services/SecurityService.ts`

**Fonctionnalités:**
- `validateSessionOwnership()`: Vérifie la propriété des sessions
- `validateSessionValidity()`: Vérifie la validité des sessions (expiration, statut)
- `validateUserAuthentication()`: Vérifie l'authentification utilisateur
- `validateUserProfile()`: Vérifie la complétude du profil utilisateur
- `cleanupExpiredSessions()`: Nettoyage automatique des sessions expirées
- `validateSessionIntegrity()`: Vérifie l'intégrité des données de session

**Contrôles de sécurité:**
- Vérification de propriété des sessions
- Gestion des sessions expirées
- Validation de l'intégrité des données
- Contrôles d'accès utilisateur

### 2.3 Middleware de Sécurité

**Fichier:** `src/middleware/securityMiddleware.ts`

**Middlewares disponibles:**
- `validateAuthentication`: Authentification et validation utilisateur
- `validateGenerationParams`: Validation des paramètres de génération
- `validateSubmissionParams`: Validation des paramètres de soumission
- `validateSessionOwnership`: Validation de propriété de session
- `cleanupExpiredSessions`: Nettoyage automatique en arrière-plan
- `validateSessionIntegrity`: Validation d'intégrité de session

## 3. Audit Logging

### 3.1 Service d'Audit

**Fichier:** `src/services/AuditLogService.ts`

**Actions auditées:**
- `adaptive_quiz_generated`: Génération de quiz adaptatif
- `adaptive_quiz_submitted`: Soumission de résultats
- `adaptive_quiz_results_viewed`: Consultation de résultats
- `rate_limit_exceeded`: Dépassement de limite de taux
- `unauthorized_access_attempt`: Tentative d'accès non autorisé
- `validation_failed`: Échec de validation
- `security_violation`: Violation de sécurité

**Fonctionnalités:**
- `logAction()`: Enregistrement générique d'actions
- `logQuizGeneration()`: Log spécifique pour la génération
- `logQuizSubmission()`: Log spécifique pour la soumission
- `logUnauthorizedAccess()`: Log des tentatives d'accès non autorisé
- `searchAuditLogs()`: Recherche dans les logs
- `getAuditStats()`: Statistiques d'audit

**Données enregistrées:**
- Utilisateur (ID, email, rôle)
- Action effectuée
- Ressource concernée
- Adresse IP et User-Agent
- Détails de l'opération
- Statut de succès/échec
- Timestamp

## 4. Gestion Automatique des Sessions

### 4.1 Job de Nettoyage

**Fichier:** `src/jobs/sessionCleanupJob.ts`

**Fonctionnalités:**
- `execute()`: Nettoyage des sessions expirées
- `cleanupOldAuditLogs()`: Nettoyage des anciens logs d'audit
- `getCleanupStats()`: Statistiques de nettoyage
- `startSessionCleanupScheduler()`: Démarrage du scheduler automatique

**Configuration:**
- Exécution toutes les heures par défaut
- Nettoyage des logs d'audit après 90 jours
- Endpoint manuel pour les administrateurs: `POST /api/admin/cleanup-sessions`

## 5. Intégration dans les Endpoints Existants

### 5.1 Endpoint de Génération

**Fichier:** `src/endpoints/generateAdaptiveQuiz.ts`

**Sécurité ajoutée:**
- Audit logging pour toutes les tentatives
- Gestion spécifique des erreurs de rate limiting
- Logging des violations de sécurité

### 5.2 Endpoints de Résultats

**Fichier:** `src/endpoints/adaptiveQuizResults.ts`

**Sécurité ajoutée:**
- Validation de propriété de session
- Validation du format des IDs de session
- Audit logging pour consultation et soumission
- Validation complète des paramètres de soumission

## 6. Configuration et Déploiement

### 6.1 Variables d'Environnement

```env
# Rate Limiting
ADAPTIVE_QUIZ_DAILY_LIMIT=5
ADAPTIVE_QUIZ_COOLDOWN_MINUTES=30

# Session Management
SESSION_CLEANUP_INTERVAL_MINUTES=60
AUDIT_LOG_RETENTION_DAYS=90

# Security
ENABLE_AUDIT_LOGGING=true
ENABLE_SESSION_INTEGRITY_CHECKS=true
```

### 6.2 Intégration dans payload.config.ts

```typescript
import { rateLimitHook } from './src/hooks/rateLimitHook'
import { AdaptiveQuizSessions } from './src/collections/AdaptiveQuizSessions'

// Dans la configuration des collections
collections: [
  // ... autres collections
  {
    ...AdaptiveQuizSessions,
    hooks: {
      ...AdaptiveQuizSessions.hooks,
      beforeChange: [
        rateLimitHook,
        ...AdaptiveQuizSessions.hooks.beforeChange
      ]
    }
  }
]

// Dans les endpoints
endpoints: [
  // ... autres endpoints
  ...require('./src/endpoints/rateLimitStatus').rateLimitStatusEndpoint,
  ...require('./src/jobs/sessionCleanupJob').manualCleanupEndpoint
]
```

### 6.3 Démarrage du Scheduler

```typescript
// Dans le fichier de démarrage de l'application
import { startSessionCleanupScheduler } from './src/jobs/sessionCleanupJob'

// Après l'initialisation de Payload
startSessionCleanupScheduler(payload, 60) // Toutes les 60 minutes
```

## 7. Monitoring et Métriques

### 7.1 Métriques Disponibles

- Nombre de sessions nettoyées
- Violations de rate limiting par utilisateur
- Tentatives d'accès non autorisé
- Erreurs de validation
- Statistiques d'utilisation par période

### 7.2 Logs de Sécurité

Tous les événements de sécurité sont enregistrés avec:
- Timestamp précis
- Informations utilisateur complètes
- Adresse IP et User-Agent
- Détails de l'action tentée
- Contexte de l'erreur

## 8. Tests et Validation

### 8.1 Tests de Sécurité Recommandés

1. **Rate Limiting:**
   - Tester la limite quotidienne
   - Tester le cooldown
   - Tester la réinitialisation à minuit

2. **Validation:**
   - Tester avec des paramètres invalides
   - Tester les limites de taille
   - Tester la sanitisation

3. **Contrôles d'Accès:**
   - Tenter d'accéder aux sessions d'autres utilisateurs
   - Tester avec des sessions expirées
   - Tester l'intégrité des données

### 8.2 Surveillance en Production

- Surveiller les logs d'audit pour les patterns suspects
- Alertes sur les violations de sécurité répétées
- Monitoring des performances du nettoyage automatique
- Surveillance de l'utilisation des rate limits

## 9. Maintenance

### 9.1 Tâches Régulières

- Vérifier les statistiques de nettoyage
- Analyser les logs d'audit pour les patterns
- Ajuster les limites de rate limiting si nécessaire
- Nettoyer les anciens logs d'audit

### 9.2 Mise à Jour des Règles

Les règles de sécurité peuvent être ajustées via:
- Variables d'environnement
- Configuration dans les services
- Mise à jour des middlewares

Cette implémentation fournit une sécurité robuste et une gestion d'erreurs complète pour le système de quiz adaptatifs, respectant toutes les exigences spécifiées.