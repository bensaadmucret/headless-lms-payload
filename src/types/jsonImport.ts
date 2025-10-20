/**
 * Types pour le système d'import JSON
 * Définit les interfaces pour l'import de contenu éducatif depuis des fichiers JSON
 */

// Types de base pour l'import
export type ImportType = 'questions' | 'quizzes' | 'flashcards' | 'learning-path';
export type ImportFormat = 'json' | 'csv' | 'anki';
export type ImportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
export type ErrorSeverity = 'critical' | 'major' | 'minor' | 'warning';
export type ErrorType = 'validation' | 'database' | 'mapping' | 'reference' | 'system';

// Métadonnées communes pour tous les imports
export interface ImportMetadata {
  source?: string;
  created?: string;
  level?: 'PASS' | 'LAS' | 'both';
  description?: string;
  version?: string;
}

// Structure de base pour tous les fichiers d'import JSON
export interface BaseImportData {
  version: string;
  type: ImportType;
  metadata: ImportMetadata;
}

// Interface pour les questions dans l'import JSON
export interface ImportQuestion {
  questionText: string;
  options: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  level: 'PASS' | 'LAS' | 'both';
  tags?: string[];
  sourcePageReference?: string;
}

// Structure pour l'import de questions
export interface QuestionImportData extends BaseImportData {
  type: 'questions';
  questions: ImportQuestion[];
}

// Interface pour les flashcards dans l'import JSON
export interface ImportFlashcard {
  front: string;
  back: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  level?: 'PASS' | 'LAS' | 'both';
  tags?: string[];
  hints?: string[];
  imageUrl?: string;
}

// Structure pour l'import de flashcards
export interface FlashcardImportData extends BaseImportData {
  type: 'flashcards';
  metadata: ImportMetadata & {
    deckName: string;
    category: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    author?: string;
    source?: string;
  };
  cards: ImportFlashcard[];
}

// Interface pour les étapes de parcours d'apprentissage
export interface ImportLearningStep {
  id: string;
  title: string;
  description?: string;
  prerequisites: string[];
  estimatedTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  objectives?: string[];
  questions: ImportQuestion[];
}

// Structure pour l'import de parcours d'apprentissage
export interface LearningPathImportData extends BaseImportData {
  type: 'learning-path';
  metadata: ImportMetadata & {
    title: string;
    estimatedDuration: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    prerequisites?: string[];
    objectives?: string[];
    author?: string;
    source?: string;
  };
  path: {
    steps: ImportLearningStep[];
  };
}

// Union type pour tous les types d'import
export type ImportData = QuestionImportData | FlashcardImportData | LearningPathImportData;

// Options d'import
export interface ImportOptions {
  dryRun?: boolean;
  batchSize?: number;
  overwriteExisting?: boolean;
  categoryMapping?: Record<string, string>;
  generateDistractors?: boolean; // Pour les flashcards
  preserveOriginalTags?: boolean;
  autoCategories?: boolean;
}

// Requête d'import
export interface ImportRequest {
  file: File;
  importType: ImportType;
  format?: ImportFormat;
  options: ImportOptions;
}

// Progression d'import
export interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
}

// Erreur d'import
export interface ImportError {
  type: ErrorType;
  severity: ErrorSeverity;
  itemIndex?: number;
  field?: string;
  message: string;
  suggestion?: string;
}

// Résultat d'import pour un élément
export interface ImportResult {
  type: 'question' | 'quiz' | 'flashcard' | 'learning-path';
  sourceIndex: number;
  payloadId?: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
  warnings?: string[];
}

// Job d'import complet
export interface ImportJob {
  id: string;
  userId: string;
  fileName: string;
  importType: ImportType;
  format: ImportFormat;
  status: ImportStatus;
  progress: ImportProgress;
  options: ImportOptions;
  results: ImportResult[];
  errors: ImportError[];
  createdAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
}

// Réponse de validation
export interface ValidationResponse {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
  summary: {
    totalItems: number;
    validItems: number;
    invalidItems: number;
    duplicates: number;
    missingCategories: string[];
  };
}

// Mapping de catégories
export interface CategoryMapping {
  originalName: string;
  suggestedName: string;
  confidence: number;
  action: 'map' | 'create' | 'skip';
}

// Suggestion de catégorie
export interface CategorySuggestion {
  existingCategory: string;
  similarity: number;
  recommended: boolean;
}

// Réponse de prévisualisation
export interface ImportPreview {
  validation: ValidationResponse;
  categoryMappings: CategoryMapping[];
  sampleItems: Array<{
    original: any;
    converted: any;
    warnings: string[];
  }>;
  estimatedImportTime: number;
}

// Options CSV spécifiques
export interface CSVOptions {
  delimiter?: ',' | ';' | '\t';
  encoding?: 'utf-8' | 'iso-8859-1' | 'windows-1252';
  hasHeader?: boolean;
}

// Options Anki spécifiques
export interface AnkiOptions {
  generateDistractors?: boolean;
  preserveScheduling?: boolean;
  convertCloze?: boolean;
}

// Requête multi-format
export interface MultiFormatImportRequest extends ImportRequest {
  csvOptions?: CSVOptions;
  ankiOptions?: AnkiOptions;
}

// Analyse de deck Anki
export interface AnkiDeckAnalysis {
  deckInfo: {
    name: string;
    cardCount: number;
    noteTypes: string[];
    mediaFiles: string[];
    language: 'fr' | 'en' | 'mixed';
    medicalDomain: string;
  };
  cardTypeDistribution: {
    basic: number;
    cloze: number;
    imageOcclusion: number;
    custom: number;
  };
  tagAnalysis: {
    commonTags: string[];
    hierarchicalStructure: boolean;
    medicalCategories: string[];
  };
  qualityScore: number;
  recommendations: string[];
}