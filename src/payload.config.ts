import 'dotenv/config'
import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp' // sharp-import
import path from 'path'
import { buildConfig } from 'payload'
import { diagnosticsEndpoint } from './endpoints/diagnostics'
import { studentQuizzesEndpoint } from './endpoints/studentQuizzes'
import { generateSessionStepsEndpoint } from './endpoints/generateSessionSteps'
import { generateSessionStepsAltEndpoint } from './endpoints/generateSessionStepsAlt'
import { dailySessionEndpoint } from './endpoints/dailySession'
import { getDailySessionEndpoint } from './endpoints/getDailySession'
import { simpleDailySessionEndpoint } from './endpoints/simpleDailySession'
import { meEndpoint } from './endpoints/me'
import { performanceAnalysisEndpoint } from './endpoints/performanceAnalysis';
import { generateAdaptiveQuizEndpoint } from './endpoints/generateAdaptiveQuiz';
import { checkAdaptiveQuizEligibilityEndpoint } from './endpoints/checkAdaptiveQuizEligibility';
import { eligibilityDetailsEndpoint } from './endpoints/eligibilityDetails';
import { getAdaptiveQuizResultsEndpoint, saveAdaptiveQuizResultsEndpoint } from './endpoints/adaptiveQuizResults';
import { rateLimitStatusEndpoint, usageStatsEndpoint } from './endpoints/rateLimitStatus';
import { generateAIQuestionsEndpoint } from './endpoints/generateAIQuestions';
import { generateAIQuizEndpoint } from './endpoints/generateAIQuiz';
import { generateCompleteQuizEndpoint, createTestQuizEndpoint } from './endpoints/generateCompleteQuiz';
import { regenerateQuestionEndpoint } from './endpoints/aiQuizRegenerateEndpoint';
import { onboardUserEndpoint } from './endpoints/onboardUser';
import { getPlacementQuizEndpoint } from './endpoints/getPlacementQuiz';
import { completePlacementQuizEndpoint } from './endpoints/completePlaymentQuiz';
import updateDailySessionHandler from './endpoints/updateDailySession'

import { getWorkersStatusEndpoint, restartWorkersEndpoint, cleanOldJobsEndpoint, getQueueDetailsEndpoint } from './endpoints/adminWorkers'
import { generationMetricsEndpoint, generationLogsEndpoint, cleanupOldLogsEndpoint } from './endpoints/generationMetrics'
import { exportGenerationLogsEndpoint } from './endpoints/exportGenerationLogs'
// Endpoints pour l'import JSON
import { downloadTemplate, listTemplates } from './endpoints/jsonImportTemplates'
import { validateImportFile, getImportJobStatus, getImportHistory, exportImportHistory } from './endpoints/jsonImportValidation'
import { uploadImportFile } from './endpoints/jsonImportUpload'
import { triggerImport } from './endpoints/triggerImport'
import { getImportStatus } from './endpoints/importStatus'


// Endpoints pour la répétition espacée
import {
  generateReviewSession,
  submitReviewResults,
  getProgressStats,
  createSchedule
} from './endpoints/spacedRepetitionEndpoints'
// Nouveaux endpoints pour le quiz adaptatif
import { 
  performanceAnalyticsByUserEndpoint, 
  performanceByCategoryEndpoint, 
  performanceMinimumDataEndpoint, 
  performanceValidateHistoryEndpoint,
  performanceUpdateEndpoint 
} from './endpoints/performanceByUser'
import { 
  getQuestionsByCategoryEndpoint, 
  getQuestionCountEndpoint, 
  getFallbackConfidenceQuestionsEndpoint,
  getRelatedCategoryQuestionsEndpoint,
  getAnyAvailableQuestionsEndpoint,
  getRelaxedLevelQuestionsEndpoint
} from './endpoints/questionsByCategory'
import { 
  saveAdaptiveQuizSessionEndpoint, 
  getAdaptiveQuizSessionEndpoint,
  saveAdaptiveQuizResultEndpoint,
  getAdaptiveQuizResultBySessionEndpoint,
  getUserAdaptiveQuizHistoryEndpoint
} from './endpoints/adaptiveQuizSessionsEndpoints'
import { CorsConfig } from './globals/CorsConfig'
import { fileURLToPath } from 'url'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Courses } from './collections/Courses'
import { Assignments } from './collections/Assignments'
import Lessons from './collections/Lessons'
import { Prerequisites } from './collections/Prerequisites'
import { Quizzes } from './collections/Quizzes'
import { Questions } from './collections/Questions'
import { QuizSubmissions } from './collections/QuizSubmissions'
import { Progress } from './collections/Progress'
import { Sections } from './collections/Sections'
import { StudySessions } from './collections/StudySessions'
import { Badges } from './collections/Badges'
import { ColorSchemes } from './collections/ColorSchemes'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from './fields/defaultLexical'
import { Categories } from './collections/Categories'
import { SubscriptionPlans } from './collections/SubscriptionPlans'
import { Tenants } from './collections/Tenants'
import Conversations from './collections/Conversations'
import { SystemMetrics } from './collections/SystemMetrics'
import { Subscriptions } from './collections/Subscriptions'

import { AdaptiveQuizSessions } from './collections/AdaptiveQuizSessions'
import Flashcards from './collections/Flashcards'
import FlashcardDecks from './collections/FlashcardDecks'
import LearningPaths from './collections/LearningPaths'
import LearningPathSteps from './collections/LearningPathSteps'
import { AdaptiveQuizResults } from './collections/AdaptiveQuizResults'
import { UserPerformances } from './collections/UserPerformances'
import AuditLogs from './collections/AuditLogs'
import GenerationLogs from './collections/GenerationLogs'
import ImportJobs from './collections/ImportJobs'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)


export default buildConfig({
  graphQL: {
    schemaOutputFile: path.resolve(dirname, 'generated-schema.graphql'),
    disablePlaygroundInProduction: process.env.NODE_ENV === 'production',
  },

  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      beforeDashboard: ['@/components/BeforeDashboard'],

    },
    meta: {
      titleSuffix: '- MedCoach Admin',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Users,
    Subscriptions,
    Categories,
    Courses,
    Lessons,
    Sections,
    Assignments,
    Prerequisites,
    Quizzes,
    Questions,
    QuizSubmissions,
    Progress,
    StudySessions,
    Badges,
    ColorSchemes,
    SubscriptionPlans,
    Tenants,
    SystemMetrics,
    Conversations,
    AdaptiveQuizSessions,
    AdaptiveQuizResults,
    UserPerformances,
    AuditLogs,
    GenerationLogs,
    ImportJobs,
    Flashcards,
    FlashcardDecks,
    LearningPaths,
    LearningPathSteps
  ],
  globals: [CorsConfig, Header, Footer],
  cors: (process.env.CORS_ORIGINS || '').split(',').concat([process.env.PAYLOAD_PUBLIC_SERVER_URL || '']),
  csrf: (process.env.CORS_ORIGINS || '').split(',').concat([process.env.PAYLOAD_PUBLIC_SERVER_URL || '']),
  cookiePrefix: 'payload-admin',
  plugins: [
    ...plugins,
    // storage-adapter-placeholder
  ],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  endpoints: [
    // === ENDPOINTS JSON IMPORT ===
    {
      path: '/json-import/templates',
      method: 'get',
      handler: listTemplates
    },
    {
      path: '/json-import/templates/:filename',
      method: 'get',
      handler: downloadTemplate
    },
    {
      path: '/json-import/validate',
      method: 'post',
      handler: validateImportFile
    },
    {
      path: '/json-import/upload',
      method: 'post',
      handler: uploadImportFile
    },
    {
      path: '/json-import/status/:jobId',
      method: 'get',
      handler: getImportJobStatus
    },
    {
      path: '/json-import/history',
      method: 'get',
      handler: getImportHistory
    },
    {
      path: '/json-import/export-history',
      method: 'get',
      handler: exportImportHistory
    },
    {
      path: '/trigger-import',
      method: 'post',
      handler: triggerImport
    },
    {
      path: '/import-status/:jobId',
      method: 'get',
      handler: getImportStatus
    },

    // === ENDPOINTS RÉPÉTITION ESPACÉE ===
    {
      path: '/spaced-repetition/review-session',
      method: 'get',
      handler: generateReviewSession.handler
    },
    {
      path: '/spaced-repetition/submit-review',
      method: 'post',
      handler: submitReviewResults.handler
    },
    {
      path: '/spaced-repetition/progress-stats',
      method: 'get',
      handler: getProgressStats.handler
    },
    {
      path: '/spaced-repetition/create-schedule',
      method: 'post',
      handler: createSchedule.handler
    },

    // Endpoints d'administration pour les workers
    getWorkersStatusEndpoint,
    restartWorkersEndpoint,
    cleanOldJobsEndpoint,
    getQueueDetailsEndpoint,

    // === ENDPOINTS EXISTANTS ===
    diagnosticsEndpoint,
    studentQuizzesEndpoint,
    generateSessionStepsEndpoint,
    generateSessionStepsAltEndpoint,
    dailySessionEndpoint,
    getDailySessionEndpoint,
    simpleDailySessionEndpoint,
    
    // === ENDPOINTS PERFORMANCE ===
    performanceAnalysisEndpoint,
    performanceAnalyticsByUserEndpoint,
    performanceByCategoryEndpoint,
    performanceMinimumDataEndpoint,
    performanceValidateHistoryEndpoint,
    performanceUpdateEndpoint,
    
    // === ENDPOINTS QUIZ ADAPTATIF ===
    generateAdaptiveQuizEndpoint,
    checkAdaptiveQuizEligibilityEndpoint,
    eligibilityDetailsEndpoint,
    getAdaptiveQuizResultsEndpoint,
    saveAdaptiveQuizResultsEndpoint,
    saveAdaptiveQuizSessionEndpoint,
    getAdaptiveQuizSessionEndpoint,
    saveAdaptiveQuizResultEndpoint,
    getAdaptiveQuizResultBySessionEndpoint,
    getUserAdaptiveQuizHistoryEndpoint,
    
    // === ENDPOINTS QUESTIONS ===
    getQuestionsByCategoryEndpoint,
    getQuestionCountEndpoint,
    getFallbackConfidenceQuestionsEndpoint,
    getRelatedCategoryQuestionsEndpoint,
    getAnyAvailableQuestionsEndpoint,
    getRelaxedLevelQuestionsEndpoint,
    
    // === ENDPOINTS RATE LIMITING ===
    rateLimitStatusEndpoint,
    usageStatsEndpoint,
    
    // === ENDPOINTS AUTRES ===
    generateAIQuestionsEndpoint,
    generateAIQuizEndpoint,
    // === ENDPOINTS CRÉATION AUTOMATIQUE QUIZ (Tâche 5) ===
    generateCompleteQuizEndpoint,
    createTestQuizEndpoint,
    // === ENDPOINTS PRÉVISUALISATION ET MODIFICATION (Tâche 9) ===
    regenerateQuestionEndpoint,
    
    // === ENDPOINTS AUDIT ET LOGGING (Tâche 6) ===
    generationMetricsEndpoint,
    generationLogsEndpoint,
    cleanupOldLogsEndpoint,
    exportGenerationLogsEndpoint,
    meEndpoint, // Endpoint personnalisé pour /api/users/me
    onboardUserEndpoint,
    getPlacementQuizEndpoint,
    completePlacementQuizEndpoint,
    {
      path: '/study-sessions/:id/update-with-answers',
      method: 'patch',
      handler: updateDailySessionHandler,
    },
  ],
  jobs: {
    access: {
      run: ({ req }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        // Utilisation d'une assertion de type pour accéder à user
        const user = (req as { user?: unknown }).user;
        if (user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        // Utilisation d'une assertion de type pour accéder à headers
        const headers = (req as { headers?: { get?: (key: string) => string | null } }).headers;
        const authHeader = headers && typeof headers.get === 'function' ? headers.get('authorization') : null;
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})
