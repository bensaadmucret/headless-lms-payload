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
import { onboardUserEndpoint } from './endpoints/onboardUser';
import { getPlacementQuizEndpoint } from './endpoints/getPlacementQuiz';
import { completePlacementQuizEndpoint } from './endpoints/completePlaymentQuiz';
import updateDailySessionHandler from './endpoints/updateDailySession'
import { uploadDocumentEndpoint, getProcessingStatusEndpoint, reprocessDocumentEndpoint } from './endpoints/uploadDocument'
import { extractNowEndpoint } from './endpoints/extractNow'
import { uploadDocumentSimpleEndpoint } from './endpoints/uploadDocumentSimple'
import { getWorkersStatusEndpoint, restartWorkersEndpoint, cleanOldJobsEndpoint, getQueueDetailsEndpoint } from './endpoints/adminWorkers'
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
import { KnowledgeBase } from './collections/KnowledgeBase'
import { AdaptiveQuizSessions } from './collections/AdaptiveQuizSessions'
import { AdaptiveQuizResults } from './collections/AdaptiveQuizResults'
import { UserPerformances } from './collections/UserPerformances'

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
    KnowledgeBase,
    AdaptiveQuizSessions,
    AdaptiveQuizResults,
    UserPerformances
  ],
  globals: [CorsConfig, Header, Footer],
  cors: (process.env.CORS_ORIGINS || '').split(',').concat([process.env.PAYLOAD_PUBLIC_SERVER_URL || '']),
  csrf: (process.env.CORS_ORIGINS || '').split(',').concat([process.env.PAYLOAD_PUBLIC_SERVER_URL || '']),
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
    // === ENDPOINTS KNOWLEDGE BASE ===
    uploadDocumentSimpleEndpoint,
    // Endpoints asynchrones pour le traitement de documents
    uploadDocumentEndpoint,
    getProcessingStatusEndpoint,
    reprocessDocumentEndpoint,
    // Endpoints d'administration pour les workers
    getWorkersStatusEndpoint,
    restartWorkersEndpoint,
    cleanOldJobsEndpoint,
    getQueueDetailsEndpoint,

    // Extraction synchrone (fallback sans worker)
    extractNowEndpoint,

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
