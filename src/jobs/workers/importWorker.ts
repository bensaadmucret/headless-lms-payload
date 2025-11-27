/**
 * Worker pour le traitement des imports de quiz JSON/CSV
 * Utilise la queue Bull existante pour le traitement asynchrone
 */

import type { Job } from 'bull'
import { getPayloadInstance } from '../initPayload'
import type { ImportData, QuestionImportData, ImportQuestion, FlashcardImportData, LearningPathImportData } from '../../types/jsonImport'
import { importQueue } from '../queue'
import fs from 'fs/promises'
import path from 'path'

/**
 * Interface pour les données du job d'import
 */
interface ImportJobData {
  jobId: string
  userId: string
  importType: 'questions' | 'quizzes' | 'flashcards' | 'learning-path'
  fileName: string
}

/**
 * Interface pour les résultats du traitement
 */
interface ImportProcessingResult {
  questionsCreated: string[]
  quizzesCreated: string[]
  totalProcessed: number
  successful: number
  failed: number
  errors: Array<{
    type: string
    message: string
    itemIndex?: number
  }>
}

/**
 * Configuration du worker d'import
 */
const WORKER_CONFIG = {
  concurrency: 2, // 2 imports en parallèle max
  limiter: {
    max: 5, // 5 jobs par minute max
    duration: 60 * 1000,
  },
}

/**
 * Processer un job d'import
 */
export async function processImportJob(job: Job<ImportJobData>): Promise<ImportProcessingResult> {
  const { jobId, userId, importType } = job.data

  console.log(`📥 [Import] Starting import job ${jobId} (${importType}) for user ${userId}`)

  try {
    const payload = await getPayloadInstance()

    // 1. Récupérer le job d'import depuis la base
    const importJob = await payload.findByID({
      collection: 'import-jobs',
      id: jobId,
    })

    if (!importJob) {
      throw new Error(`Import job ${jobId} not found`)
    }

    // 2. Mettre à jour le statut : validation
    await updateImportJobStatus(jobId, 'validating', 10)
    await job.progress(10)

    // 3. Récupérer le fichier depuis Media
    const uploadedFileId = typeof importJob.uploadedFile === 'object'
      ? importJob.uploadedFile.id
      : importJob.uploadedFile

    const mediaFile = await payload.findByID({
      collection: 'media',
      // @ts-expect-error - Type conversion from Media relation to string ID
      id: uploadedFileId as string,
    })

    if (!mediaFile || !mediaFile.filename) {
      throw new Error('Fichier média introuvable')
    }

    // 4. Lire le contenu du fichier JSON
    const fileContent = await readMediaFile(mediaFile.filename)
    const jsonData: ImportData = JSON.parse(fileContent)

    // 5. Valider les données
    const validationErrors = await validateImportData(jsonData, importType)

    if (validationErrors.length > 0) {
      await updateImportJobStatus(jobId, 'validation_failed', 100, {
        validationResults: { errors: validationErrors },
      })
      throw new Error(`Validation failed: ${validationErrors[0]?.message}`)
    }

    await updateImportJobStatus(jobId, 'validated', 20)
    await job.progress(20)

    // 6. Traiter l'import selon le type
    await updateImportJobStatus(jobId, 'processing', 30)
    await job.progress(30)

    const result = await processImportByType(
      jsonData,
      importJob,
      userId,
      job
    )

    // 7. Finaliser
    await updateImportJobStatus(jobId, 'completed', 100, {
      processingResults: result,
      completedAt: new Date().toISOString(),
    })
    await job.progress(100)

    console.log(`✅ [Import] Job ${jobId} completed: ${result.successful}/${result.totalProcessed} items`)

    return result

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ [Import] Job ${jobId} failed:`, errorMessage)

    await updateImportJobStatus(jobId, 'failed', 100, {
      errors: [{
        type: 'system',
        severity: 'critical',
        message: errorMessage,
      }],
    })

    throw error
  }
}

/**
 * Traiter l'import selon le type de contenu
 */
async function processImportByType(
  data: ImportData,
  importJob: any,
  userId: string,
  job: Job
): Promise<ImportProcessingResult> {
  const result: ImportProcessingResult = {
    questionsCreated: [],
    quizzesCreated: [],
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    errors: [],
  }

  const payload = await getPayloadInstance()

  switch (data.type) {
    case 'questions': {
      const questionData = data as QuestionImportData
      const questions = questionData.questions || []

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        if (!question) continue

        try {
          // Résoudre ou créer la catégorie
          const categoryId = await findOrCreateCategory(payload, question.category)

          // Mapper la question avec la catégorie résolue
          const questionData = mapQuestionToPayload(question)
          // Assigner l'ID de catégorie résolu
          questionData.category = categoryId

          const created = await payload.create({
            collection: 'questions',
            data: questionData,
          })

          result.questionsCreated.push(String(created.id))
          result.successful++
        } catch (error) {
          result.failed++
          result.errors.push({
            type: 'database',
            message: error instanceof Error ? error.message : 'Unknown error',
            itemIndex: i,
          })
        }

        // Mise à jour de la progression
        const progress = 30 + Math.round((i / questions.length) * 60)
        await job.progress(progress)
        await updateImportJobProgress(importJob.id, progress)
      }

      result.totalProcessed = questions.length

      // Créer un quiz conteneur si demandé
      if (importJob.createQuizContainer && result.questionsCreated.length > 0) {
        try {
          const quizData = {
            title: importJob.quizMetadata?.title || `Quiz importé - ${importJob.fileName}`,
            description: importJob.quizMetadata?.description || '',
            questions: result.questionsCreated.map((id: string) => parseInt(id, 10)),
            category: importJob.quizMetadata?.category,
            published: false,
          }
          const quiz = await payload.create({
            collection: 'quizzes',
            data: quizData,
          })
          result.quizzesCreated.push(String(quiz.id))
        } catch (error) {
          console.error('Failed to create quiz container:', error)
        }
      }
      break
    }

    case 'flashcards': {
      const flashcardData = data as FlashcardImportData
      const cards = flashcardData.cards || []

      // Créer ou récupérer le deck
      let deckId: number | null = null
      if (flashcardData.metadata.deckName) {
        const categoryId = await findOrCreateCategory(payload, flashcardData.metadata.category)

        const deck = await payload.create({
          collection: 'flashcard-decks',
          data: {
            deckName: flashcardData.metadata.deckName,
            description: flashcardData.metadata.description || '',
            category: categoryId,
            level: flashcardData.metadata.level || 'both',
            difficulty: flashcardData.metadata.difficulty || 'medium',
            cardCount: cards.length,
            author: flashcardData.metadata.author,
            source: flashcardData.metadata.source,
          },
        })
        deckId = typeof deck.id === 'number' ? deck.id : parseInt(String(deck.id), 10)
      }

      // Importer les flashcards
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i]
        if (!card) continue

        try {
          const categoryId = await findOrCreateCategory(payload, card.category)

          const created = await payload.create({
            collection: 'flashcards',
            data: {
              front: card.front,
              back: card.back,
              hints: card.hints?.map(hint => ({ hint })) || [],
              category: categoryId,
              difficulty: card.difficulty || 'medium',
              level: card.level || 'both',
              tags: card.tags?.map(tag => ({ tag })) || [],
              deck: deckId,
              imageUrl: card.imageUrl,
            },
          })

          result.questionsCreated.push(String(created.id))
          result.successful++
        } catch (error) {
          result.failed++
          result.errors.push({
            type: 'database',
            message: error instanceof Error ? error.message : 'Unknown error',
            itemIndex: i,
          })
        }

        const progress = 30 + Math.round((i / cards.length) * 60)
        await job.progress(progress)
        await updateImportJobProgress(importJob.id, progress)
      }

      result.totalProcessed = cards.length
      break
    }

    case 'learning-path': {
      const pathData = data as LearningPathImportData
      const steps = pathData.path?.steps || []

      try {
        // Créer le parcours d'apprentissage
        const learningPath = await payload.create({
          collection: 'learning-paths',
          data: {
            title: pathData.metadata.title,
            description: pathData.metadata.description || '',
            level: pathData.metadata.level || 'both',
            difficulty: pathData.metadata.difficulty || 'medium',
            estimatedDuration: pathData.metadata.estimatedDuration || 0,
            stepCount: steps.length,
            prerequisites: pathData.metadata.prerequisites?.map(p => ({ prerequisite: p })) || [],
            objectives: pathData.metadata.objectives?.map(o => ({ objective: o })) || [],
            author: pathData.metadata.author,
            source: pathData.metadata.source,
          },
        })

        const pathId = typeof learningPath.id === 'number' ? learningPath.id : parseInt(String(learningPath.id), 10)
        result.quizzesCreated.push(String(pathId))

        // Créer les étapes
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          if (!step) continue

          try {
            // Créer les questions de l'étape
            const questionIds: number[] = []
            if (step.questions && step.questions.length > 0) {
              for (const question of step.questions) {
                const categoryId = await findOrCreateCategory(payload, question.category)
                const questionData = mapQuestionToPayload(question)
                questionData.category = categoryId

                const createdQuestion = await payload.create({
                  collection: 'questions',
                  data: questionData,
                })

                questionIds.push(typeof createdQuestion.id === 'number' ? createdQuestion.id : parseInt(String(createdQuestion.id), 10))
                result.questionsCreated.push(String(createdQuestion.id))
              }
            }

            // Créer l'étape
            await payload.create({
              collection: 'learning-path-steps',
              data: {
                learningPath: pathId,
                stepId: step.id,
                title: step.title,
                description: step.description || '',
                order: i + 1,
                estimatedTime: step.estimatedTime || 30,
                difficulty: step.difficulty || 'medium',
                prerequisites: step.prerequisites?.map(p => ({ stepId: p })) || [],
                objectives: step.objectives?.map(o => ({ objective: o })) || [],
                questions: questionIds,
              },
            })

            result.successful++
          } catch (error) {
            result.failed++
            result.errors.push({
              type: 'database',
              message: error instanceof Error ? error.message : 'Unknown error',
              itemIndex: i,
            })
          }

          const progress = 30 + Math.round((i / steps.length) * 60)
          await job.progress(progress)
          await updateImportJobProgress(importJob.id, progress)
        }

        result.totalProcessed = steps.length
      } catch (error) {
        result.failed++
        result.errors.push({
          type: 'database',
          message: error instanceof Error ? error.message : 'Failed to create learning path',
        })
      }
      break
    }

    default:
      // Inclut 'quizzes' et tout autre type non implémenté
      throw new Error(`Import type "${(data as ImportData).type}" not yet implemented`)
  }

  return result
}

/**
 * Mapper une question JSON vers le format Payload
 * Convertit les données d'import en format compatible avec la collection Questions
 */
function mapQuestionToPayload(question: ImportQuestion) {
  // Convertir le texte simple en format RichText Lexical
  const richTextContent = {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '' as const,
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              format: 0,
              style: '',
              detail: 0,
              mode: 'normal',
              text: question.questionText,
              version: 1,
            },
          ],
          direction: 'ltr' as const,
        },
      ],
      direction: 'ltr' as const,
    },
  }

  return {
    questionText: richTextContent,
    questionType: 'multipleChoice' as const,
    options: question.options.map((opt, index) => ({
      optionText: opt.text,
      isCorrect: opt.isCorrect,
    })),
    explanation: question.explanation,
    // category sera résolu plus tard via findOrCreateCategory
    category: 0 as number, // Valeur temporaire, sera remplacée par l'ID réel
    difficulty: question.difficulty,
    studentLevel: question.level,
    tags: question.tags?.map(tag => ({ tag })) || [],
    sourcePageReference: question.sourcePageReference,
    generatedByAI: false,
    validatedByExpert: false,
    validationStatus: 'pending' as const,
  }
}

/**
 * Trouver ou créer une catégorie par son nom
 */
async function findOrCreateCategory(
  payload: Awaited<ReturnType<typeof getPayloadInstance>>,
  categoryName: string
): Promise<number> {
  try {
    // Rechercher la catégorie existante par titre
    const existingCategories = await payload.find({
      collection: 'categories',
      where: {
        title: {
          equals: categoryName,
        },
      },
      limit: 1,
    })

    if (existingCategories.docs.length > 0 && existingCategories.docs[0]) {
      const id = existingCategories.docs[0].id
      return typeof id === 'number' ? id : parseInt(String(id), 10)
    }

    // Créer une nouvelle catégorie si elle n'existe pas
    const newCategory = await payload.create({
      collection: 'categories',
      data: {
        title: categoryName,
        slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
        level: 'both' as const,
      },
    })

    console.log(`✅ Created new category: "${categoryName}" (ID: ${newCategory.id})`)
    const id = newCategory.id
    return typeof id === 'number' ? id : parseInt(String(id), 10)
  } catch (error) {
    console.error(`Error finding/creating category "${categoryName}":`, error)
    throw new Error(`Failed to resolve category: ${categoryName}`)
  }
}

/**
 * Valider les données d'import
 */
async function validateImportData(
  data: ImportData,
  expectedType: string
): Promise<Array<{ type: string; message: string }>> {
  const errors: Array<{ type: string; message: string }> = []

  // Vérification du type
  if (data.type !== expectedType) {
    errors.push({
      type: 'validation',
      message: `Type mismatch: expected ${expectedType}, got ${data.type}`,
    })
  }

  // Vérification de la version
  if (!data.version) {
    errors.push({
      type: 'validation',
      message: 'Missing version field',
    })
  }

  // Validation spécifique selon le type
  if (data.type === 'questions') {
    const questionData = data as QuestionImportData
    if (!questionData.questions || questionData.questions.length === 0) {
      errors.push({
        type: 'validation',
        message: 'No questions found in import data',
      })
    }

    // Valider chaque question
    questionData.questions?.forEach((q, index) => {
      if (!q.questionText) {
        errors.push({
          type: 'validation',
          message: `Question ${index + 1}: Missing questionText`,
        })
      }
      if (!q.options || q.options.length < 2) {
        errors.push({
          type: 'validation',
          message: `Question ${index + 1}: At least 2 options required`,
        })
      }
      const correctAnswers = q.options?.filter(opt => opt.isCorrect) || []
      if (correctAnswers.length !== 1) {
        errors.push({
          type: 'validation',
          message: `Question ${index + 1}: Exactly one correct answer required`,
        })
      }
    })
  }

  return errors
}

/**
 * Lire le contenu d'un fichier média
 */
async function readMediaFile(filename: string): Promise<string> {
  // Payload stocke les fichiers dans le dossier public/media
  const mediaPath = path.join(process.cwd(), 'public', 'media', filename)
  console.log(`📂 Reading file from: ${mediaPath}`)
  return await fs.readFile(mediaPath, 'utf-8')
}

/**
 * Mettre à jour le statut d'un job d'import
 */
async function updateImportJobStatus(
  jobId: string,
  status: 'pending' | 'validating' | 'validated' | 'processing' | 'completed' | 'failed' | 'validation_failed',
  progress: number,
  additionalData: Record<string, unknown> = {}
): Promise<void> {
  const payload = await getPayloadInstance()

  await payload.update({
    collection: 'import-jobs',
    id: jobId,
    data: {
      status,
      progress,
      ...additionalData,
    },
  })
}

/**
 * Mettre à jour uniquement la progression
 */
async function updateImportJobProgress(jobId: string, progress: number): Promise<void> {
  const payload = await getPayloadInstance()

  await payload.update({
    collection: 'import-jobs',
    id: jobId,
    data: { progress },
  })
}

/**
 * Démarrer le worker d'import
 */
export function startImportWorker(): void {
  importQueue.process('process-import', WORKER_CONFIG.concurrency, processImportJob)

  console.log(`✅ Import worker started with concurrency ${WORKER_CONFIG.concurrency}`)
}

export { WORKER_CONFIG }
