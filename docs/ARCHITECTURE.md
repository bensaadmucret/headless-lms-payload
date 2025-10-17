# 🏗️ Architecture - MedCoach Platform

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Admin Panel │  │ Student App  │  │  Public Site │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    Payload CMS Core                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Collections                         │   │
│  │  Users │ Courses │ Quizzes │ Questions │ Progress   │   │
│  └──────────────────────────────────────────────────────┘   │
│                             │                                │
│  ┌──────────────────────────┼────────────────────────────┐  │
│  │                     Endpoints                          │  │
│  │  /api/quiz │ /api/sessions │ /api/adaptive-quiz      │  │
│  └──────────────────────────┼────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────┼────────────────────────────┐  │
│  │                      Services                          │  │
│  │  AIQuizService │ StudySessionService │ RAGService    │  │
│  └──────────────────────────┼────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
┌─────────▼─────────┐ ┌─────▼──────┐ ┌────────▼────────┐
│   PostgreSQL      │ │   Redis    │ │  External APIs  │
│   (Données)       │ │  (Cache)   │ │  (OpenAI, etc.) │
└───────────────────┘ └────────────┘ └─────────────────┘
```

## Structure des Dossiers

```
payload-cms/
├── src/
│   ├── collections/          # Définitions des collections Payload
│   │   ├── Users.ts
│   │   ├── Courses.ts
│   │   ├── Quizzes.ts
│   │   ├── Questions.ts
│   │   ├── AdaptiveQuizSessions.ts
│   │   └── ...
│   │
│   ├── endpoints/            # API endpoints personnalisés
│   │   ├── generateAIQuiz.ts
│   │   ├── dailySession.ts
│   │   ├── adaptiveQuiz.ts
│   │   └── ...
│   │
│   ├── services/             # Logique métier
│   │   ├── AIQuizGenerationService.ts
│   │   ├── StudySessionService.ts
│   │   ├── AdaptiveQuizService.ts
│   │   ├── RAGService.ts
│   │   └── ...
│   │
│   ├── components/           # Composants React
│   │   ├── admin/           # Composants admin
│   │   └── blocks/          # Blocks Payload
│   │
│   ├── app/                  # Next.js App Router
│   │   ├── (payload)/       # Routes admin
│   │   └── (frontend)/      # Routes publiques
│   │
│   ├── access/               # Contrôles d'accès
│   ├── hooks/                # Hooks Payload
│   ├── utilities/            # Utilitaires
│   ├── jobs/                 # Jobs asynchrones (Bull)
│   └── __tests__/            # Tests
│
├── docs/                     # Documentation
├── public/                   # Assets statiques
└── scripts/                  # Scripts utilitaires
```

## Flux de Données Principaux

### 1. Génération de Quiz IA

```
┌─────────┐
│  Admin  │
└────┬────┘
     │ 1. Demande génération
     ▼
┌─────────────────────────┐
│ generateAIQuizEndpoint  │
└────┬────────────────────┘
     │ 2. Validation config
     ▼
┌──────────────────────────┐
│ AIQuizGenerationService  │
└────┬─────────────────────┘
     │ 3. Construction prompt
     ▼
┌──────────────────────────┐
│ PromptEngineeringService │
└────┬─────────────────────┘
     │ 4. Appel API IA
     ▼
┌──────────────────────────┐
│     AIAPIService         │
└────┬─────────────────────┘
     │ 5. Réponse JSON
     ▼
┌──────────────────────────┐
│  ContentValidatorService │
└────┬─────────────────────┘
     │ 6. Validation OK
     ▼
┌──────────────────────────┐
│   QuizCreationService    │
└────┬─────────────────────┘
     │ 7. Création DB
     ▼
┌──────────────────────────┐
│      PostgreSQL          │
└──────────────────────────┘
```

### 2. Session d'Étude Quotidienne

```
┌──────────┐
│ Étudiant │
└────┬─────┘
     │ 1. GET /study-sessions/daily
     ▼
┌─────────────────────────┐
│  dailySessionEndpoint   │
└────┬────────────────────┘
     │ 2. Vérif auth
     ▼
┌──────────────────────────┐
│  StudySessionService     │
└────┬─────────────────────┘
     │ 3. Cherche session du jour
     ▼
┌──────────────────────────┐
│      PostgreSQL          │
└────┬─────────────────────┘
     │ 4. Session existe ?
     ├─ Non ─▶ Créer nouvelle session
     │         └─▶ Sélectionner quiz adapté
     │             └─▶ Retourner session
     │
     └─ Oui ─▶ Retourner session existante
```

### 3. Quiz Adaptatif

```
┌──────────┐
│ Étudiant │
└────┬─────┘
     │ 1. Demande quiz adaptatif
     ▼
┌─────────────────────────────┐
│ generateAdaptiveQuizEndpoint│
└────┬────────────────────────┘
     │ 2. Vérif éligibilité
     ▼
┌──────────────────────────┐
│   EligibilityService     │
└────┬─────────────────────┘
     │ 3. Analyse performance
     ▼
┌──────────────────────────┐
│   AdaptiveQuizService    │
└────┬─────────────────────┘
     │ 4. Sélection questions
     │    (algorithme adaptatif)
     ▼
┌──────────────────────────┐
│   RAGService (optionnel) │
│   Enrichissement contexte│
└────┬─────────────────────┘
     │ 5. Création session
     ▼
┌──────────────────────────┐
│      PostgreSQL          │
└──────────────────────────┘
```

## Collections Principales

### Hiérarchie des Collections

```
Users
  └── enrolledCourses[]
        └── Courses
              ├── sections[]
              │     └── Sections
              │           └── lessons[]
              │                 └── Lessons
              │                       ├── quizzes[]
              │                       │     └── Quizzes
              │                       │           └── questions[]
              │                       │                 └── Questions
              │                       └── assignments[]
              │                             └── Assignments
              │
              └── Progress (tracking)
                    └── StudySessions
                          └── QuizSubmissions
```

### Relations Clés

```
┌──────────────┐
│    Users     │
└──────┬───────┘
       │
       ├─── enrolledCourses ──▶ Courses
       │
       ├─── progress ──────────▶ Progress
       │
       ├─── studySessions ─────▶ StudySessions
       │
       ├─── quizSubmissions ───▶ QuizSubmissions
       │
       └─── adaptiveSessions ──▶ AdaptiveQuizSessions

┌──────────────┐
│   Quizzes    │
└──────┬───────┘
       │
       ├─── questions[] ───────▶ Questions
       │
       ├─── category ──────────▶ Categories
       │
       └─── course ────────────▶ Courses
```

## Services Architecture

### Services Principaux

#### 1. AIQuizGenerationService
**Responsabilité**: Orchestration de la génération de quiz IA

```typescript
class AIQuizGenerationService {
  - promptService: PromptEngineeringService
  - apiService: AIAPIService
  - validatorService: ContentValidatorService
  - creationService: QuizCreationService
  
  + generateQuiz(config): Promise<Quiz>
  + validateConfig(config): ValidationResult
  + retryGeneration(config, attempt): Promise<Quiz>
}
```

#### 2. StudySessionService
**Responsabilité**: Gestion des sessions d'étude

```typescript
class StudySessionService {
  + getOrCreateDailySession(userId): Promise<StudySession>
  + selectQuizForSession(user, course): Promise<Quiz>
  + completeSession(sessionId): Promise<void>
  + getSessionStats(userId): Promise<Stats>
}
```

#### 3. AdaptiveQuizService
**Responsabilité**: Génération de quiz adaptatifs

```typescript
class AdaptiveQuizService {
  + generateAdaptiveQuiz(userId, config): Promise<AdaptiveSession>
  + selectQuestionsAdaptively(performance): Promise<Question[]>
  + adjustDifficulty(userPerformance): DifficultyLevel
  + analyzeWeakAreas(userId): Promise<Category[]>
}
```

#### 4. RAGService
**Responsabilité**: Retrieval-Augmented Generation

```typescript
class RAGService {
  - chromaClient: ChromaDB
  - embeddingService: EmbeddingService
  
  + indexDocument(doc): Promise<void>
  + searchSimilar(query, k): Promise<Document[]>
  + enrichContext(question): Promise<Context>
}
```

## Patterns Architecturaux

### 1. Service Layer Pattern
Séparation claire entre:
- **Endpoints**: Validation HTTP, auth, réponses
- **Services**: Logique métier
- **Collections**: Schémas et hooks Payload

### 2. Repository Pattern (via Payload)
```typescript
// Abstraction des accès DB via Payload
await payload.find({ collection: 'quizzes' })
await payload.create({ collection: 'quizzes', data })
await payload.update({ collection: 'quizzes', id, data })
```

### 3. Strategy Pattern (Quiz Generation)
```typescript
interface QuizGenerationStrategy {
  generate(config: Config): Promise<Quiz>
}

class AIGenerationStrategy implements QuizGenerationStrategy
class ManualGenerationStrategy implements QuizGenerationStrategy
class AdaptiveGenerationStrategy implements QuizGenerationStrategy
```

### 4. Observer Pattern (Hooks)
```typescript
// Hooks Payload pour réactions aux événements
afterChange: [
  async ({ doc, operation }) => {
    if (operation === 'create') {
      await auditLog.create({ ... })
    }
  }
]
```

## Sécurité

### Contrôle d'Accès (RBAC)

```
Rôles:
├── superadmin (accès total)
├── admin (gestion contenus)
├── teacher (création quiz/cours)
└── student (lecture seule)

Permissions par Collection:
┌────────────┬──────────┬───────┬─────────┬─────────┐
│ Collection │ Superadm │ Admin │ Teacher │ Student │
├────────────┼──────────┼───────┼─────────┼─────────┤
│ Users      │    RW    │   R   │    R    │    R*   │
│ Courses    │    RW    │  RW   │   RW    │    R    │
│ Quizzes    │    RW    │  RW   │   RW    │    R    │
│ Questions  │    RW    │  RW   │   RW    │    -    │
│ Tenants    │    RW    │   -   │    -    │    -    │
└────────────┴──────────┴───────┴─────────┴─────────┘
* Student: lecture de son propre profil uniquement
```

### Validation des Données

```
Niveau 1: Validation TypeScript (compile-time)
    ↓
Niveau 2: Validation Payload Schema (runtime)
    ↓
Niveau 3: Validation Métier (services)
    ↓
Niveau 4: Sanitisation (avant DB)
```

## Performance

### Stratégies de Cache

```typescript
// 1. Cache Redis (Bull queues)
await queue.add('extract-document', data, {
  removeOnComplete: true,
  attempts: 3
})

// 2. Cache Payload (built-in)
await payload.find({
  collection: 'quizzes',
  where: { published: true },
  // Payload cache automatique
})

// 3. Cache Next.js (ISR)
export const revalidate = 3600 // 1 heure
```

### Optimisations DB

```sql
-- Index sur les champs fréquemment requêtés
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_quizzes_category ON quizzes(category_id);
CREATE INDEX idx_questions_quiz ON questions(quiz_id);
CREATE INDEX idx_sessions_user_date ON study_sessions(user_id, created_at);

-- Index composites pour les requêtes complexes
CREATE INDEX idx_adaptive_sessions_user_status 
  ON adaptive_quiz_sessions(user_id, status);
```

## Scalabilité

### Horizontal Scaling

```
┌─────────────────────────────────────────────┐
│          Load Balancer (Nginx)              │
└────┬────────────────────────────────────┬───┘
     │                                    │
┌────▼────────┐                    ┌─────▼───────┐
│  Instance 1 │                    │ Instance 2  │
│  (Next.js)  │                    │  (Next.js)  │
└────┬────────┘                    └─────┬───────┘
     │                                    │
     └────────────┬───────────────────────┘
                  │
         ┌────────▼────────┐
         │   PostgreSQL    │
         │   (Primary)     │
         └────────┬────────┘
                  │
         ┌────────▼────────┐
         │   PostgreSQL    │
         │   (Replica)     │
         └─────────────────┘
```

### Async Jobs (Bull)

```typescript
// Jobs asynchrones pour tâches lourdes
const jobs = {
  'extract-document': extractDocumentProcessor,
  'generate-quiz': generateQuizProcessor,
  'send-email': sendEmailProcessor,
  'calculate-stats': calculateStatsProcessor
}

// Traitement en arrière-plan
queue.process('generate-quiz', async (job) => {
  const { config } = job.data
  return await aiQuizService.generate(config)
})
```

## Monitoring & Observabilité

### Logs Structurés

```typescript
// AuditLogService
await auditLog.create({
  action: 'quiz_generated',
  resource: 'quizzes',
  resourceId: quiz.id,
  userId: user.id,
  metadata: { duration, questionsCount }
})
```

### Métriques

```typescript
// GenerationLogs collection
{
  action: 'ai_quiz_generation',
  status: 'success',
  duration: 2500, // ms
  questionsGenerated: 10,
  validationScore: 95,
  errorDetails: null
}
```

## Déploiement

### Architecture de Déploiement

```
┌──────────────────────────────────────────────┐
│              Vercel / AWS                    │
│  ┌────────────────────────────────────────┐  │
│  │         Next.js Application            │  │
│  │  (SSR + API Routes + Admin Panel)      │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌──▼────────┐ ┌─▼──────────┐
│  PostgreSQL  │ │   Redis   │ │  S3/CDN    │
│  (Supabase)  │ │ (Upstash) │ │  (Media)   │
└──────────────┘ └───────────┘ └────────────┘
```

### Variables d'Environnement

```bash
# Database
DATABASE_URI=postgresql://...
POSTGRES_URL=postgresql://...

# Payload
PAYLOAD_SECRET=...
PAYLOAD_PUBLIC_SERVER_URL=https://...

# External APIs
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Redis
REDIS_URL=redis://...

# Email
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...

# Storage
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

## Migration & Évolution

### Stratégie de Migration

```bash
# 1. Créer une migration
npm run payload migrate:create add_quiz_difficulty

# 2. Éditer la migration
# src/migrations/YYYY-MM-DD-add_quiz_difficulty.ts

# 3. Appliquer la migration
npm run payload migrate

# 4. Rollback si nécessaire
npm run payload migrate:down
```

### Versioning API

```typescript
// v1 (actuel)
/api/quizzes
/api/adaptive-quiz

// v2 (futur)
/api/v2/quizzes
/api/v2/adaptive-quiz

// Maintenir compatibilité v1 pendant transition
```

## Tests

### Pyramide de Tests

```
        ┌─────────┐
        │   E2E   │  (Playwright - 5%)
        └─────────┘
      ┌─────────────┐
      │ Integration │  (Vitest - 15%)
      └─────────────┘
    ┌─────────────────┐
    │   Unit Tests    │  (Vitest - 80%)
    └─────────────────┘
```

### Couverture Actuelle

- **254 tests** (100% passants)
- **Couverture**: ~70% du code métier
- **Collections**: Tests unitaires complets
- **Services**: Tests unitaires + quelques intégrations
- **Endpoints**: Tests d'intégration

## Roadmap Architecture

### Court Terme (Q1 2025)
- [ ] Documentation OpenAPI/Swagger
- [ ] Métriques Prometheus
- [ ] Logs centralisés (Winston/Pino)

### Moyen Terme (Q2 2025)
- [ ] Microservices pour IA (séparation)
- [ ] GraphQL API (en plus de REST)
- [ ] WebSocket pour temps réel

### Long Terme (Q3-Q4 2025)
- [ ] Multi-région deployment
- [ ] Event sourcing pour audit
- [ ] Machine Learning pipeline
