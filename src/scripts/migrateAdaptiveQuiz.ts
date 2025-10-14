import { Payload } from 'payload'
import { getPayloadInstance } from '../jobs/initPayload'

/**
 * Script de migration pour le système de quiz adaptatif
 * 
 * Ce script migre les données existantes pour supporter les nouvelles fonctionnalités
 * de quiz adaptatif en ajoutant les champs manquants et en créant les catégories par défaut.
 */

interface MigrationStats {
  questionsUpdated: number
  categoriesUpdated: number
  defaultCategoriesCreated: number
  errors: string[]
}

/**
 * Fonction principale d'orchestration de la migration
 */
export async function migrateForAdaptiveQuiz(): Promise<MigrationStats> {
  console.log('🚀 Début de la migration pour le quiz adaptatif...')
  
  const payload = await getPayloadInstance()
  const stats: MigrationStats = {
    questionsUpdated: 0,
    categoriesUpdated: 0,
    defaultCategoriesCreated: 0,
    errors: []
  }

  try {
    // 1. Créer les catégories par défaut si nécessaire
    console.log('📁 Création des catégories par défaut...')
    const defaultCategoriesCount = await createDefaultCategories(payload)
    stats.defaultCategoriesCreated = defaultCategoriesCount

    // 2. Migrer la collection Categories
    console.log('🏷️ Migration de la collection Categories...')
    const categoriesUpdated = await migrateCategoriesCollection(payload)
    stats.categoriesUpdated = categoriesUpdated

    // 3. Migrer la collection Questions
    console.log('❓ Migration de la collection Questions...')
    const questionsUpdated = await migrateQuestionsCollection(payload)
    stats.questionsUpdated = questionsUpdated

    // 4. Associer les questions existantes aux catégories
    console.log('🔗 Association des questions aux catégories...')
    await migrateExistingData(payload)

    console.log('✅ Migration terminée avec succès!')
    console.log(`📊 Statistiques:`)
    console.log(`   - Questions mises à jour: ${stats.questionsUpdated}`)
    console.log(`   - Catégories mises à jour: ${stats.categoriesUpdated}`)
    console.log(`   - Catégories par défaut créées: ${stats.defaultCategoriesCreated}`)
    
    if (stats.errors.length > 0) {
      console.log(`⚠️ Erreurs rencontrées: ${stats.errors.length}`)
      stats.errors.forEach(error => console.log(`   - ${error}`))
    }

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    stats.errors.push(`Erreur générale: ${errorMessage}`)
    throw error
  }

  return stats
}

/**
 * Migre la collection Questions pour ajouter les champs adaptatifs manquants
 */
async function migrateQuestionsCollection(payload: Payload): Promise<number> {
  let updatedCount = 0
  let page = 1
  const limit = 50

  try {
    while (true) {
      const questions = await payload.find({
        collection: 'questions',
        limit,
        page,
        depth: 0
      })

      if (questions.docs.length === 0) break

      for (const question of questions.docs) {
        try {
          const updateData: any = {}
          let needsUpdate = false

          // Vérifier et ajouter les champs manquants
          if (!question.difficulty) {
            updateData.difficulty = 'medium'
            needsUpdate = true
          }

          if (!question.studentLevel) {
            updateData.studentLevel = 'both'
            needsUpdate = true
          }

          if (!question.tags) {
            updateData.tags = []
            needsUpdate = true
          }

          if (!question.adaptiveMetadata) {
            updateData.adaptiveMetadata = {
              averageTimeSeconds: null,
              successRate: null,
              timesUsed: 0
            }
            needsUpdate = true
          }

          // Mettre à jour si nécessaire
          if (needsUpdate) {
            await payload.update({
              collection: 'questions',
              id: question.id,
              data: updateData
            })
            updatedCount++
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(`Erreur lors de la mise à jour de la question ${question.id}:`, errorMessage)
        }
      }

      page++
      if (page > questions.totalPages) break
    }

  } catch (error) {
    console.error('Erreur lors de la migration des questions:', error)
    throw error
  }

  return updatedCount
}

/**
 * Migre la collection Categories pour ajouter les nouvelles propriétés
 */
async function migrateCategoriesCollection(payload: Payload): Promise<number> {
  let updatedCount = 0
  let page = 1
  const limit = 50

  try {
    while (true) {
      const categories = await payload.find({
        collection: 'categories',
        limit,
        page,
        depth: 0
      })

      if (categories.docs.length === 0) break

      for (const category of categories.docs) {
        try {
          const updateData: any = {}
          let needsUpdate = false

          // Vérifier et ajouter les champs manquants
          if (!category.level) {
            updateData.level = 'both'
            needsUpdate = true
          }

          if (!category.adaptiveSettings) {
            updateData.adaptiveSettings = {
              isActive: true,
              minimumQuestions: 5,
              weight: 1
            }
            needsUpdate = true
          }

          // Mettre à jour si nécessaire
          if (needsUpdate) {
            await payload.update({
              collection: 'categories',
              id: category.id,
              data: updateData
            })
            updatedCount++
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(`Erreur lors de la mise à jour de la catégorie ${category.id}:`, errorMessage)
        }
      }

      page++
      if (page > categories.totalPages) break
    }

  } catch (error) {
    console.error('Erreur lors de la migration des catégories:', error)
    throw error
  }

  return updatedCount
}

/**
 * Associe les questions existantes aux catégories si elles ne le sont pas déjà
 */
async function migrateExistingData(payload: Payload): Promise<void> {
  try {
    // Récupérer toutes les questions sans catégorie
    const questionsWithoutCategory = await payload.find({
      collection: 'questions',
      where: {
        category: { exists: false }
      },
      limit: 1000
    })

    if (questionsWithoutCategory.totalDocs === 0) {
      console.log('✅ Toutes les questions ont déjà une catégorie assignée')
      return
    }

    // Récupérer une catégorie par défaut
    const defaultCategory = await payload.find({
      collection: 'categories',
      where: {
        title: { equals: 'Général' }
      },
      limit: 1
    })

    if (defaultCategory.totalDocs === 0) {
      console.log('⚠️ Aucune catégorie par défaut trouvée pour associer les questions')
      return
    }

    const defaultCategoryId = defaultCategory.docs[0]?.id
    if (!defaultCategoryId) {
      console.log('⚠️ ID de catégorie par défaut invalide')
      return
    }

    // Associer les questions à la catégorie par défaut
    for (const question of questionsWithoutCategory.docs) {
      try {
        await payload.update({
          collection: 'questions',
          id: question.id,
          data: {
            category: defaultCategoryId
          }
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`Erreur lors de l'association de la question ${question.id}:`, errorMessage)
      }
    }

    console.log(`✅ ${questionsWithoutCategory.totalDocs} questions associées à la catégorie par défaut`)

  } catch (error) {
    console.error('Erreur lors de l\'association des données existantes:', error)
    throw error
  }
}

/**
 * Crée les catégories par défaut si elles n'existent pas
 */
async function createDefaultCategories(payload: Payload): Promise<number> {
  const defaultCategories = [
    {
      title: 'Général',
      slug: 'general',
      level: 'both' as const,
      adaptiveSettings: {
        isActive: true,
        minimumQuestions: 5,
        weight: 1
      }
    },
    {
      title: 'Anatomie',
      slug: 'anatomie',
      level: 'both' as const,
      adaptiveSettings: {
        isActive: true,
        minimumQuestions: 10,
        weight: 1.2
      }
    },
    {
      title: 'Physiologie',
      slug: 'physiologie',
      level: 'both' as const,
      adaptiveSettings: {
        isActive: true,
        minimumQuestions: 10,
        weight: 1.2
      }
    },
    {
      title: 'Pathologie',
      slug: 'pathologie',
      level: 'both' as const,
      adaptiveSettings: {
        isActive: true,
        minimumQuestions: 8,
        weight: 1.5
      }
    },
    {
      title: 'Pharmacologie',
      slug: 'pharmacologie',
      level: 'LAS' as const,
      adaptiveSettings: {
        isActive: true,
        minimumQuestions: 6,
        weight: 1.3
      }
    },
    {
      title: 'Biochimie',
      slug: 'biochimie',
      level: 'both' as const,
      adaptiveSettings: {
        isActive: true,
        minimumQuestions: 8,
        weight: 1.1
      }
    }
  ]

  let createdCount = 0

  for (const categoryData of defaultCategories) {
    try {
      // Vérifier si la catégorie existe déjà
      const existing = await payload.find({
        collection: 'categories',
        where: {
          slug: { equals: categoryData.slug }
        },
        limit: 1
      })

      if (existing.totalDocs === 0) {
        await payload.create({
          collection: 'categories',
          data: categoryData
        })
        createdCount++
        console.log(`✅ Catégorie créée: ${categoryData.title}`)
      } else {
        console.log(`ℹ️ Catégorie existante: ${categoryData.title}`)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Erreur lors de la création de la catégorie ${categoryData.title}:`, errorMessage)
    }
  }

  return createdCount
}

// Fonction utilitaire pour exécuter la migration depuis la ligne de commande
if (require.main === module) {
  migrateForAdaptiveQuiz()
    .then((stats) => {
      console.log('Migration terminée:', stats)
      process.exit(0)
    })
    .catch((error) => {
      console.error('Échec de la migration:', error)
      process.exit(1)
    })
}