import { Payload } from 'payload'
import { getPayloadInstance } from '../jobs/initPayload'

/**
 * Utility function to execute SQL queries
 */
async function executeSQL(db: any, sql: string): Promise<any> {
  try {
    // Try different methods to execute SQL based on the database adapter
    if (db.drizzle && typeof db.drizzle.execute === 'function') {
      return await db.drizzle.execute(sql)
    } else if (db.execute && typeof db.execute === 'function') {
      return await db.execute(sql)
    } else {
      throw new Error('No suitable SQL execution method found')
    }
  } catch (error) {
    console.warn(`SQL execution failed, skipping: ${sql}`)
    return null
  }
}

/**
 * Script pour créer les index de base de données recommandés pour les performances
 * du système de quiz adaptatif
 * 
 * Ce script crée les index nécessaires pour optimiser les requêtes fréquentes
 * utilisées par le système de quiz adaptatif.
 */

interface IndexCreationResult {
  indexesCreated: number
  indexesSkipped: number
  errors: string[]
}

/**
 * Fonction principale pour créer tous les index recommandés
 */
export async function createRecommendedIndexes(): Promise<IndexCreationResult> {
  console.log('🚀 Création des index de base de données pour les performances...')
  
  const payload = await getPayloadInstance()
  const result: IndexCreationResult = {
    indexesCreated: 0,
    indexesSkipped: 0,
    errors: []
  }

  try {
    // Récupérer l'adaptateur de base de données PostgreSQL
    const db = payload.db

    // Créer les index pour chaque collection
    await createQuizSubmissionsIndexes(db, result)
    await createQuestionsIndexes(db, result)
    await createAdaptiveQuizSessionsIndexes(db, result)
    await createAdaptiveQuizResultsIndexes(db, result)
    await createCategoriesIndexes(db, result)
    await createUsersIndexes(db, result)

    console.log('✅ Création des index terminée!')
    console.log(`📊 Statistiques:`)
    console.log(`   - Index créés: ${result.indexesCreated}`)
    console.log(`   - Index ignorés (déjà existants): ${result.indexesSkipped}`)
    
    if (result.errors.length > 0) {
      console.log(`⚠️ Erreurs rencontrées: ${result.errors.length}`)
      result.errors.forEach(error => console.log(`   - ${error}`))
    }

  } catch (error) {
    console.error('❌ Erreur lors de la création des index:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    result.errors.push(`Erreur générale: ${errorMessage}`)
    throw error
  }

  return result
}

/**
 * Crée les index pour la collection quizSubmissions
 */
async function createQuizSubmissionsIndexes(db: any, result: IndexCreationResult): Promise<void> {
  console.log('📝 Création des index pour quizSubmissions...')

  const indexes = [
    {
      name: 'idx_quiz_submissions_user_status_created',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_submissions_user_status_created 
            ON quiz_submissions (user_id, status, created_at DESC)`
    },
    {
      name: 'idx_quiz_submissions_user_completed',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_submissions_user_completed 
            ON quiz_submissions (user_id) WHERE status = 'completed'`
    },
    {
      name: 'idx_quiz_submissions_created_at',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_submissions_created_at 
            ON quiz_submissions (created_at DESC)`
    },
    {
      name: 'idx_quiz_submissions_quiz_user',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_submissions_quiz_user 
            ON quiz_submissions (quiz_id, user_id)`
    }
  ]

  await createIndexes(db, indexes, result)
}

/**
 * Crée les index pour la collection questions
 */
async function createQuestionsIndexes(db: any, result: IndexCreationResult): Promise<void> {
  console.log('❓ Création des index pour questions...')

  const indexes = [
    {
      name: 'idx_questions_category_level_difficulty',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_category_level_difficulty 
            ON questions (category_id, student_level, difficulty)`
    },
    {
      name: 'idx_questions_student_level',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_student_level 
            ON questions (student_level)`
    },
    {
      name: 'idx_questions_category_active',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_category_active 
            ON questions (category_id) WHERE category_id IS NOT NULL`
    },
    {
      name: 'idx_questions_difficulty',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_difficulty 
            ON questions (difficulty)`
    },
    {
      name: 'idx_questions_adaptive_metadata',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_adaptive_metadata 
            ON questions USING GIN (adaptive_metadata)`
    }
  ]

  await createIndexes(db, indexes, result)
}

/**
 * Crée les index pour la collection adaptiveQuizSessions
 */
async function createAdaptiveQuizSessionsIndexes(db: any, result: IndexCreationResult): Promise<void> {
  console.log('🎯 Création des index pour adaptiveQuizSessions...')

  const indexes = [
    {
      name: 'idx_adaptive_quiz_sessions_user_created_status',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_quiz_sessions_user_created_status 
            ON adaptive_quiz_sessions (user_id, created_at DESC, status)`
    },
    {
      name: 'idx_adaptive_quiz_sessions_session_id',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_quiz_sessions_session_id 
            ON adaptive_quiz_sessions (session_id)`
    },
    {
      name: 'idx_adaptive_quiz_sessions_user_today',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_quiz_sessions_user_today 
            ON adaptive_quiz_sessions (user_id, created_at) WHERE created_at >= CURRENT_DATE`
    },
    {
      name: 'idx_adaptive_quiz_sessions_expires_at',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_quiz_sessions_expires_at 
            ON adaptive_quiz_sessions (expires_at) WHERE expires_at IS NOT NULL`
    },
    {
      name: 'idx_adaptive_quiz_sessions_status',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_quiz_sessions_status 
            ON adaptive_quiz_sessions (status)`
    }
  ]

  await createIndexes(db, indexes, result)
}

/**
 * Crée les index pour la collection adaptiveQuizResults
 */
async function createAdaptiveQuizResultsIndexes(db: any, result: IndexCreationResult): Promise<void> {
  console.log('📊 Création des index pour adaptiveQuizResults...')

  const indexes = [
    {
      name: 'idx_adaptive_quiz_results_user_completed_session',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_quiz_results_user_completed_session 
            ON adaptive_quiz_results (user_id, completed_at DESC, session_id)`
    },
    {
      name: 'idx_adaptive_quiz_results_session',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_quiz_results_session 
            ON adaptive_quiz_results (session_id)`
    },
    {
      name: 'idx_adaptive_quiz_results_user_success_rate',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_quiz_results_user_success_rate 
            ON adaptive_quiz_results (user_id, success_rate DESC)`
    },
    {
      name: 'idx_adaptive_quiz_results_completed_at',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_adaptive_quiz_results_completed_at 
            ON adaptive_quiz_results (completed_at DESC)`
    }
  ]

  await createIndexes(db, indexes, result)
}

/**
 * Crée les index pour la collection categories
 */
async function createCategoriesIndexes(db: any, result: IndexCreationResult): Promise<void> {
  console.log('🏷️ Création des index pour categories...')

  const indexes = [
    {
      name: 'idx_categories_parent_category',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_category 
            ON categories (parent_category_id) WHERE parent_category_id IS NOT NULL`
    },
    {
      name: 'idx_categories_level',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_level 
            ON categories (level)`
    },
    {
      name: 'idx_categories_adaptive_active',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_adaptive_active 
            ON categories USING GIN (adaptive_settings) WHERE (adaptive_settings->>'isActive')::boolean = true`
    },
    {
      name: 'idx_categories_slug',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_slug 
            ON categories (slug)`
    }
  ]

  await createIndexes(db, indexes, result)
}

/**
 * Crée les index pour la collection users (pour les requêtes liées aux quiz adaptatifs)
 */
async function createUsersIndexes(db: any, result: IndexCreationResult): Promise<void> {
  console.log('👤 Création des index pour users...')

  const indexes = [
    {
      name: 'idx_users_student_level',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_student_level 
            ON users (student_level) WHERE student_level IS NOT NULL`
    },
    {
      name: 'idx_users_role_active',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active 
            ON users (role) WHERE role IN ('student')`
    }
  ]

  await createIndexes(db, indexes, result)
}

/**
 * Fonction utilitaire pour créer une liste d'index
 */
async function createIndexes(db: any, indexes: Array<{name: string, sql: string}>, result: IndexCreationResult): Promise<void> {
  for (const index of indexes) {
    try {
      // Vérifier si l'index existe déjà
      const existsQuery = `
        SELECT 1 FROM pg_indexes 
        WHERE indexname = '${index.name}'
      `
      
      const existsResult = await executeSQL(db, existsQuery)

      if (existsResult && existsResult.length > 0) {
        console.log(`ℹ️ Index déjà existant: ${index.name}`)
        result.indexesSkipped++
        continue
      }

      // Créer l'index
      await executeSQL(db, index.sql)

      console.log(`✅ Index créé: ${index.name}`)
      result.indexesCreated++

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorMsg = `Erreur lors de la création de l'index ${index.name}: ${errorMessage}`
      console.error(`❌ ${errorMsg}`)
      result.errors.push(errorMsg)
    }
  }
}

/**
 * Fonction pour supprimer tous les index créés (utile pour les tests ou rollback)
 */
export async function dropAdaptiveQuizIndexes(): Promise<void> {
  console.log('🗑️ Suppression des index de quiz adaptatif...')
  
  const payload = await getPayloadInstance()
  const db = payload.db

  const indexNames = [
    // QuizSubmissions indexes
    'idx_quiz_submissions_user_status_created',
    'idx_quiz_submissions_user_completed',
    'idx_quiz_submissions_created_at',
    'idx_quiz_submissions_quiz_user',
    
    // Questions indexes
    'idx_questions_category_level_difficulty',
    'idx_questions_student_level',
    'idx_questions_category_active',
    'idx_questions_difficulty',
    'idx_questions_adaptive_metadata',
    
    // AdaptiveQuizSessions indexes
    'idx_adaptive_quiz_sessions_user_created_status',
    'idx_adaptive_quiz_sessions_session_id',
    'idx_adaptive_quiz_sessions_user_today',
    'idx_adaptive_quiz_sessions_expires_at',
    'idx_adaptive_quiz_sessions_status',
    
    // AdaptiveQuizResults indexes
    'idx_adaptive_quiz_results_user_completed_session',
    'idx_adaptive_quiz_results_session',
    'idx_adaptive_quiz_results_user_success_rate',
    'idx_adaptive_quiz_results_completed_at',
    
    // Categories indexes
    'idx_categories_parent_category',
    'idx_categories_level',
    'idx_categories_adaptive_active',
    'idx_categories_slug',
    
    // Users indexes
    'idx_users_student_level',
    'idx_users_role_active'
  ]

  for (const indexName of indexNames) {
    try {
      await executeSQL(db, `DROP INDEX CONCURRENTLY IF EXISTS ${indexName}`)
      console.log(`✅ Index supprimé: ${indexName}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ Erreur lors de la suppression de l'index ${indexName}:`, errorMessage)
    }
  }
}

// Fonction utilitaire pour exécuter la création d'index depuis la ligne de commande
if (require.main === module) {
  const action = process.argv[2]
  
  if (action === 'drop') {
    dropAdaptiveQuizIndexes()
      .then(() => {
        console.log('Suppression des index terminée')
        process.exit(0)
      })
      .catch((error) => {
        console.error('Échec de la suppression des index:', error)
        process.exit(1)
      })
  } else {
    createRecommendedIndexes()
      .then((result) => {
        console.log('Création des index terminée:', result)
        process.exit(0)
      })
      .catch((error) => {
        console.error('Échec de la création des index:', error)
        process.exit(1)
      })
  }
}