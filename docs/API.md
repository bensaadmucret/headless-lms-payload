# 📡 API Documentation - MedCoach Platform

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

Toutes les requêtes nécessitant une authentification doivent inclure un cookie de session ou un token JWT.

```bash
# Login
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# Response
{
  "token": "eyJhbGc...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "role": "student"
  }
}
```

---

## Endpoints

### 1. Quiz Management

#### GET /api/quizzes

Récupère la liste des quiz.

**Query Parameters:**
- `limit` (number): Nombre de résultats (défaut: 10)
- `page` (number): Page (défaut: 1)
- `where[category][equals]` (string): Filtrer par catégorie
- `where[published][equals]` (boolean): Filtrer par statut de publication

**Example:**
```bash
GET /api/quizzes?limit=20&where[published][equals]=true
```

**Response:**
```json
{
  "docs": [
    {
      "id": "quiz_123",
      "title": "Anatomie Cardiaque - PASS",
      "description": "Quiz sur le système cardiovasculaire",
      "category": {
        "id": "cat_456",
        "name": "Cardiologie"
      },
      "questions": ["q1", "q2", "q3"],
      "difficulty": "medium",
      "studentLevel": "PASS",
      "published": true,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "totalDocs": 45,
  "limit": 20,
  "page": 1,
  "totalPages": 3
}
```

#### POST /api/quizzes

Créer un nouveau quiz (admin/teacher uniquement).

**Request:**
```json
{
  "title": "Nouveau Quiz",
  "description": "Description du quiz",
  "category": "cat_456",
  "questions": ["q1", "q2", "q3"],
  "difficulty": "medium",
  "studentLevel": "PASS",
  "published": false
}
```

**Response:**
```json
{
  "doc": {
    "id": "quiz_789",
    "title": "Nouveau Quiz",
    ...
  }
}
```

---

### 2. AI Quiz Generation

#### POST /api/generate-ai-quiz

Génère un quiz avec l'IA (admin/teacher uniquement).

**Request:**
```json
{
  "subject": "Anatomie du système cardiovasculaire",
  "categoryId": "cat_456",
  "studentLevel": "PASS",
  "questionCount": 10,
  "difficulty": "medium",
  "includeExplanations": true,
  "customInstructions": "Focus sur les pathologies courantes"
}
```

**Response:**
```json
{
  "success": true,
  "quiz": {
    "id": "quiz_ai_123",
    "title": "Quiz IA - Anatomie Cardiovasculaire",
    "questions": [
      {
        "id": "q_ai_1",
        "text": "Quelle est la fonction principale du ventricule gauche?",
        "options": [
          { "text": "Pomper le sang vers l'aorte", "isCorrect": true },
          { "text": "Recevoir le sang des poumons", "isCorrect": false },
          { "text": "Pomper le sang vers les poumons", "isCorrect": false },
          { "text": "Recevoir le sang des veines caves", "isCorrect": false }
        ],
        "explanation": "Le ventricule gauche pompe le sang oxygéné vers l'aorte...",
        "difficulty": "medium",
        "category": "cat_456"
      }
    ],
    "validationScore": 95,
    "generationTime": 2500
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "type": "validation_failed",
    "message": "La configuration est invalide",
    "details": {
      "field": "questionCount",
      "issue": "Doit être entre 5 et 20"
    }
  }
}
```

---

### 3. Study Sessions

#### GET /api/study-sessions/daily

Récupère ou crée la session d'étude du jour pour l'utilisateur connecté.

**Query Parameters:**
- `date` (string, optional): Date au format ISO (défaut: aujourd'hui)

**Example:**
```bash
GET /api/study-sessions/daily
GET /api/study-sessions/daily?date=2025-01-15
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session_123",
    "user": "user_456",
    "date": "2025-01-15",
    "quiz": {
      "id": "quiz_789",
      "title": "Quiz du Jour - Cardiologie",
      "questions": [...]
    },
    "status": "in_progress",
    "startedAt": "2025-01-15T08:00:00Z",
    "completedAt": null,
    "score": null
  }
}
```

#### POST /api/study-sessions/:id/complete

Marque une session comme terminée et enregistre le score.

**Request:**
```json
{
  "score": 85,
  "answers": [
    { "questionId": "q1", "selectedOption": 0, "isCorrect": true },
    { "questionId": "q2", "selectedOption": 2, "isCorrect": false }
  ],
  "timeSpent": 1200
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "session_123",
    "status": "completed",
    "score": 85,
    "completedAt": "2025-01-15T08:20:00Z"
  },
  "stats": {
    "averageScore": 82,
    "totalSessions": 15,
    "streak": 7
  }
}
```

---

### 4. Adaptive Quiz

#### GET /api/adaptive-quiz/eligibility

Vérifie si l'utilisateur est éligible pour un quiz adaptatif.

**Response:**
```json
{
  "eligible": true,
  "requirements": {
    "minimumQuizzes": {
      "required": 3,
      "completed": 5,
      "met": true
    },
    "studentLevel": {
      "required": true,
      "current": "PASS",
      "met": true
    },
    "recentActivity": {
      "required": true,
      "lastQuiz": "2025-01-14",
      "met": true
    }
  }
}
```

#### POST /api/adaptive-quiz/generate

Génère un quiz adaptatif basé sur les performances de l'utilisateur.

**Request:**
```json
{
  "categoryId": "cat_456",
  "questionCount": 15,
  "targetDifficulty": "adaptive"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "adaptive_session_123",
    "user": "user_456",
    "questions": [
      {
        "id": "q_adapt_1",
        "text": "Question adaptée au niveau de l'étudiant...",
        "difficulty": "medium",
        "category": "cat_456",
        "options": [...]
      }
    ],
    "algorithm": {
      "weakCategories": ["cat_456", "cat_789"],
      "strongCategories": ["cat_111"],
      "recommendedDifficulty": "medium",
      "adaptiveStrategy": "focus_weak_areas"
    },
    "createdAt": "2025-01-15T09:00:00Z"
  }
}
```

#### POST /api/adaptive-quiz/:sessionId/submit

Soumet les réponses d'un quiz adaptatif.

**Request:**
```json
{
  "answers": [
    { "questionId": "q1", "selectedOption": 0, "timeSpent": 45 },
    { "questionId": "q2", "selectedOption": 2, "timeSpent": 60 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "score": 80,
    "correctAnswers": 12,
    "totalQuestions": 15,
    "timeSpent": 900,
    "performance": {
      "improved": true,
      "previousScore": 75,
      "trend": "improving"
    },
    "recommendations": {
      "nextDifficulty": "hard",
      "focusAreas": ["Anatomie", "Physiologie"],
      "suggestedTopics": ["Système nerveux", "Système endocrinien"]
    }
  }
}
```

---

### 5. User Progress

#### GET /api/users/:userId/progress

Récupère la progression d'un utilisateur.

**Response:**
```json
{
  "user": {
    "id": "user_456",
    "email": "student@example.com",
    "studentLevel": "PASS"
  },
  "progress": {
    "totalQuizzes": 45,
    "completedQuizzes": 38,
    "averageScore": 82,
    "currentStreak": 7,
    "longestStreak": 15,
    "totalTimeSpent": 18000,
    "lastActivity": "2025-01-15T08:20:00Z"
  },
  "categories": [
    {
      "category": {
        "id": "cat_456",
        "name": "Cardiologie"
      },
      "quizzesCompleted": 12,
      "averageScore": 85,
      "mastery": "advanced"
    }
  ],
  "badges": [
    {
      "id": "badge_1",
      "name": "Premier Quiz",
      "earnedAt": "2025-01-01T10:00:00Z"
    }
  ]
}
```

#### GET /api/users/:userId/performance

Récupère les performances détaillées d'un utilisateur.

**Query Parameters:**
- `startDate` (string): Date de début (ISO format)
- `endDate` (string): Date de fin (ISO format)
- `categoryId` (string, optional): Filtrer par catégorie

**Example:**
```bash
GET /api/users/user_456/performance?startDate=2025-01-01&endDate=2025-01-15
```

**Response:**
```json
{
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-15"
  },
  "summary": {
    "quizzesCompleted": 15,
    "averageScore": 82,
    "totalTimeSpent": 7200,
    "improvementRate": 12
  },
  "daily": [
    {
      "date": "2025-01-15",
      "quizzes": 1,
      "score": 85,
      "timeSpent": 1200
    }
  ],
  "byCategory": [
    {
      "category": "Cardiologie",
      "quizzes": 5,
      "averageScore": 88,
      "trend": "improving"
    }
  ],
  "weakAreas": [
    {
      "category": "Neurologie",
      "score": 65,
      "recommendation": "Réviser les bases"
    }
  ]
}
```

---

### 6. Admin Endpoints

#### GET /api/admin/generation-logs

Récupère les logs de génération IA (admin uniquement).

**Query Parameters:**
- `status` (string): success | failed | in_progress
- `action` (string): ai_quiz_generation | ai_question_generation
- `startDate` (string): Date de début
- `endDate` (string): Date de fin

**Response:**
```json
{
  "docs": [
    {
      "id": "log_123",
      "action": "ai_quiz_generation",
      "status": "success",
      "user": {
        "id": "user_admin",
        "email": "admin@example.com"
      },
      "config": {
        "subject": "Anatomie",
        "questionCount": 10,
        "difficulty": "medium"
      },
      "results": {
        "quizId": "quiz_789",
        "questionsGenerated": 10,
        "validationScore": 95
      },
      "performance": {
        "duration": 2500,
        "apiCalls": 1,
        "retries": 0
      },
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "totalDocs": 150,
  "page": 1,
  "totalPages": 15
}
```

#### GET /api/admin/generation-metrics

Récupère les métriques de génération IA.

**Response:**
```json
{
  "summary": {
    "totalGenerations": 150,
    "successRate": 94,
    "averageDuration": 2300,
    "totalQuestionsGenerated": 1500
  },
  "byAction": [
    {
      "action": "ai_quiz_generation",
      "count": 120,
      "successRate": 95
    },
    {
      "action": "ai_question_generation",
      "count": 30,
      "successRate": 90
    }
  ],
  "byStatus": [
    { "status": "success", "count": 141 },
    { "status": "failed", "count": 9 }
  ],
  "errors": [
    {
      "type": "validation_failed",
      "count": 5
    },
    {
      "type": "api_timeout",
      "count": 4
    }
  ]
}
```

#### POST /api/admin/generation-logs/export

Exporte les logs en CSV.

**Request:**
```json
{
  "filters": {
    "status": "success",
    "startDate": "2025-01-01",
    "endDate": "2025-01-15"
  }
}
```

**Response:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="generation-logs-2025-01-15.csv"

Date,Utilisateur,Action,Statut,Configuration,Résultats,Erreurs,Performance
2025-01-15 10:00:00,admin@example.com,ai_quiz_generation,success,...
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Paramètres invalides |
| 401 | Unauthorized | Non authentifié |
| 403 | Forbidden | Permissions insuffisantes |
| 404 | Not Found | Ressource introuvable |
| 409 | Conflict | Conflit (ex: quiz déjà existant) |
| 429 | Too Many Requests | Rate limit dépassé |
| 500 | Internal Server Error | Erreur serveur |
| 503 | Service Unavailable | Service temporairement indisponible |

**Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données fournies sont invalides",
    "details": {
      "field": "questionCount",
      "issue": "Doit être entre 5 et 20"
    },
    "timestamp": "2025-01-15T10:00:00Z"
  }
}
```

---

## Rate Limiting

### Limites par Rôle

| Rôle | Requêtes/heure | Génération IA/heure |
|------|----------------|---------------------|
| Student | 100 | 5 |
| Teacher | 500 | 20 |
| Admin | 1000 | 50 |
| Superadmin | Illimité | Illimité |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

---

## Webhooks

### Configuration

```json
POST /api/webhooks/configure
{
  "url": "https://your-app.com/webhook",
  "events": ["quiz.completed", "session.created"],
  "secret": "your_webhook_secret"
}
```

### Events

#### quiz.completed
```json
{
  "event": "quiz.completed",
  "timestamp": "2025-01-15T10:00:00Z",
  "data": {
    "quizId": "quiz_123",
    "userId": "user_456",
    "score": 85,
    "completedAt": "2025-01-15T10:00:00Z"
  }
}
```

#### session.created
```json
{
  "event": "session.created",
  "timestamp": "2025-01-15T08:00:00Z",
  "data": {
    "sessionId": "session_123",
    "userId": "user_456",
    "quizId": "quiz_789",
    "createdAt": "2025-01-15T08:00:00Z"
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { MedCoachClient } from '@medcoach/sdk';

const client = new MedCoachClient({
  apiKey: 'your_api_key',
  baseURL: 'https://api.medcoach.com'
});

// Récupérer les quiz
const quizzes = await client.quizzes.list({
  limit: 20,
  where: { published: true }
});

// Générer un quiz IA
const aiQuiz = await client.ai.generateQuiz({
  subject: 'Anatomie Cardiaque',
  categoryId: 'cat_456',
  questionCount: 10
});

// Créer une session
const session = await client.sessions.createDaily();

// Soumettre des réponses
const results = await client.sessions.submit(session.id, {
  answers: [...]
});
```

### Python

```python
from medcoach import MedCoachClient

client = MedCoachClient(
    api_key='your_api_key',
    base_url='https://api.medcoach.com'
)

# Récupérer les quiz
quizzes = client.quizzes.list(limit=20, published=True)

# Générer un quiz IA
ai_quiz = client.ai.generate_quiz(
    subject='Anatomie Cardiaque',
    category_id='cat_456',
    question_count=10
)

# Créer une session
session = client.sessions.create_daily()

# Soumettre des réponses
results = client.sessions.submit(session.id, answers=[...])
```

---

## Postman Collection

Télécharger la collection Postman complète :
[MedCoach API.postman_collection.json](./postman/MedCoach_API.postman_collection.json)

---

## OpenAPI Specification

Documentation OpenAPI/Swagger disponible à :
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

---

## Support

- **Documentation**: https://docs.medcoach.com
- **Email**: support@medcoach.com
- **GitHub Issues**: https://github.com/medcoach/platform/issues
