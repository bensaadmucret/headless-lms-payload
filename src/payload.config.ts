// storage-adapter-import-placeholder
import 'dotenv/config'
import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp' // sharp-import
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { diagnosticsEndpoint } from './endpoints/diagnostics'
import { studentQuizzesEndpoint } from './endpoints/studentQuizzes'
import { generateSessionStepsEndpoint } from './endpoints/generateSessionSteps'
import { generateSessionStepsAltEndpoint } from './endpoints/generateSessionStepsAlt'
import { dailySessionEndpoint } from './endpoints/dailySession'
import { getDailySessionEndpoint } from './endpoints/getDailySession'
import { simpleDailySessionEndpoint } from './endpoints/simpleDailySession'
import { meEndpoint } from './endpoints/me'
import { performanceAnalysisEndpoint } from './endpoints/performanceAnalysis';
import updateDailySessionHandler from './endpoints/updateDailySession'
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
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { Categories } from './collections/Categories'
import { SubscriptionPlans } from './collections/SubscriptionPlans'
import { Tenants } from './collections/Tenants'
import Conversations from './collections/Conversations'
import { SystemMetrics } from './collections/SystemMetrics'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)


export default buildConfig({
  graphQL: {
    schemaOutputFile: path.resolve(dirname, 'generated-schema.graphql'),
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
    Conversations
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
    diagnosticsEndpoint,
    studentQuizzesEndpoint,
    generateSessionStepsEndpoint,
    generateSessionStepsAltEndpoint,
    dailySessionEndpoint,
    getDailySessionEndpoint,
    simpleDailySessionEndpoint,
    performanceAnalysisEndpoint,
    meEndpoint, // Endpoint personnalisé pour /api/users/me
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
        const user = (req as any).user;
        if (user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        // Utilisation d'une assertion de type pour accéder à headers
        const headers = (req as any).headers;
        const authHeader = headers && typeof headers.get === 'function' ? headers.get('authorization') : null;
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})
