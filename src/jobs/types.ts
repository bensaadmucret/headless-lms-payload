/**
 * Types et interfaces pour le système de jobs asynchrones
 */

export type JobPriority = 'low' | 'normal' | 'high' | 'critical'
export type FileType = 'pdf' | 'epub' | 'docx' | 'txt'
export type Language = 'fr' | 'en'
export type ContentType = 'medical' | 'general'
export type ValidationType = 'medical' | 'quality' | 'plagiarism'

export type ProcessingStatus = 
  | 'queued'          // En attente de traitement
  | 'extracting'      // Extraction du contenu
  | 'analyzing'       // Analyse NLP 
  | 'enriching'       // Enrichissement IA
  | 'validating'      // Validation qualité
  | 'completed'       // Traitement terminé
  | 'failed'          // Erreur
  | 'retrying'        // Nouvelle tentative

// ===== JOB INTERFACES =====

export interface BaseJob {
  documentId: string
  priority: JobPriority
  userId: string
  attemptNumber?: number
  startTime?: Date
}

export interface ExtractionJob extends BaseJob {
  type: 'document-extraction'
  fileType: FileType
  sourceFileId: string
  sourceFileUrl: string
  collectionType?: 'media' | 'knowledge-base' // Type de collection à mettre à jour
}

export interface NLPJob extends BaseJob {
  type: 'nlp-processing'
  extractedText: string
  language: Language
  features: Array<'keywords' | 'summary' | 'sentiment' | 'entities'>
}

export interface AIJob extends BaseJob {
  type: 'ai-enrichment'
  contentType: ContentType
  tasks: Array<'summary' | 'quiz-generation' | 'concept-extraction' | 'difficulty-assessment'>
  context?: {
    medicalDomain?: string
    targetAudience?: string
  }
}

export interface ValidationJob extends BaseJob {
  type: 'validation-check'
  validationType: ValidationType
  rules: ValidationRule[]
}

export interface RAGJob extends BaseJob {
  type: 'rag-processing'
  extractedText: string
  chunkingOptions?: {
    chunkSize?: number
    chunkOverlap?: number
    strategy?: 'standard' | 'chapters' | 'fixed'
  }
  embeddingOptions?: {
    provider?: 'openai' | 'huggingface' | 'local'
    model?: string
  }
}

export type JobData = ExtractionJob | NLPJob | AIJob | ValidationJob | RAGJob

// ===== VALIDATION RULES =====

export interface ValidationRule {
  id: string
  name: string
  description: string
  category: 'content' | 'format' | 'medical' | 'quality'
  severity: 'warning' | 'error'
  autoFix?: boolean
}

// ===== PROCESSING RESULTS =====

export interface ExtractionResult {
  success: boolean
  extractedText: string
  metadata: {
    pageCount?: number
    wordCount: number
    language?: string
    title?: string
    author?: string
  }
  chapters?: Array<{
    title: string
    content: string
    pageNumbers?: string
  }>
  error?: string
}

export interface NLPResult {
  success: boolean
  keywords: Array<{
    term: string
    relevance: number
    category?: string
  }>
  summary?: string
  sentiment?: {
    score: number
    label: 'positive' | 'negative' | 'neutral'
  }
  entities?: Array<{
    text: string
    type: 'medical_term' | 'anatomy' | 'disease' | 'drug' | 'person' | 'location'
    confidence: number
  }>
  language: Language
  error?: string
}

export interface AIResult {
  success: boolean
  aiSummary?: string
  conceptsExtracted?: Array<{
    concept: string
    definition: string
    importance: number
  }>
  difficultyScore?: number
  suggestedQuestions?: Array<{
    question: string
    type: 'qcm' | 'open' | 'case_study'
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    answers?: string[]
    correctAnswer?: string
  }>
  error?: string
}

export interface ValidationResult {
  success: boolean
  score: number
  issues: Array<{
    ruleId: string
    severity: 'warning' | 'error'
    message: string
    suggestions?: string[]
  }>
  recommendations: string[]
  error?: string
}

// ===== PROCESSING LOGS =====

export interface ProcessingLog {
  documentId: string
  jobId: string
  timestamp: Date
  step: ProcessingStatus
  progress: number        // 0-100%
  message: string
  details?: Record<string, unknown>
  error?: string
  duration?: number       // en ms
}

// ===== JOB OPTIONS =====

export interface JobOptions {
  attempts?: number
  delay?: number
  timeout?: number
  removeOnComplete?: number
  removeOnFail?: number
  backoff?: {
    type: 'fixed' | 'exponential'
    delay: number
  }
}

// ===== QUEUE CONFIGURATION =====

export interface QueueConfig {
  name: string
  redis: {
    host: string
    port: number
    password?: string
    db?: number
  }
  defaultJobOptions: JobOptions
  settings: {
    stalledInterval: number
    maxStalledCount: number
  }
}

// ===== WORKER CONFIGURATION =====

export interface WorkerConfig {
  concurrency: number
  limiter?: {
    max: number
    duration: number
  }
}

// ===== JOB STATS =====

export interface JobStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

export interface QueueStats extends JobStats {
  name: string
  isPaused: boolean
}

// ===== ERROR TYPES =====

export class JobError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = true,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'JobError'
  }
}

export class ExtractionError extends JobError {
  constructor(message: string, fileType: FileType, details?: Record<string, unknown>) {
    super(message, `EXTRACTION_${fileType.toUpperCase()}_ERROR`, true, details)
    this.name = 'ExtractionError'
  }
}

export class NLPError extends JobError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NLP_PROCESSING_ERROR', true, details)
    this.name = 'NLPError'
  }
}

export class AIError extends JobError {
  constructor(message: string, retryable: boolean = false, details?: Record<string, unknown>) {
    super(message, 'AI_SERVICE_ERROR', retryable, details)
    this.name = 'AIError'
  }
}