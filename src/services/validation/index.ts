/**
 * Index des services de validation pour les quiz générés par l'IA
 * Point d'entrée centralisé pour tous les services de validation
 */

// Schémas et types (importés en premier pour éviter les dépendances circulaires)
export type {
    StudentLevel,
    ValidationCategory,
    ContentPattern
} from '../../schemas/aiQuizValidationSchema';

export {
    AI_QUIZ_JSON_SCHEMA,
    LEVEL_SPECIFIC_VALIDATION_RULES,
    INAPPROPRIATE_CONTENT_PATTERNS,
    MEDICAL_VOCABULARY_REFERENCE,
    QUALITY_THRESHOLDS
} from '../../schemas/aiQuizValidationSchema';

// Services de validation principaux
export { ContentValidatorService } from '../ContentValidatorService';
export type { ValidationResult, ValidationIssue, ValidationWarning, AIGeneratedQuiz, AIGeneratedQuestion } from '../ContentValidatorService';

export { EnhancedContentValidatorService } from '../EnhancedContentValidatorService';
export type {
    EnhancedValidationResult,
    ValidationIssue as EnhancedValidationIssue,
    ValidationWarning as EnhancedValidationWarning,
    ValidationRecommendation,
    ValidationMetadata
} from '../EnhancedContentValidatorService';

export { JSONSchemaValidatorService } from '../JSONSchemaValidatorService';
export type { JSONValidationResult, JSONValidationError, JSONValidationWarning } from '../JSONSchemaValidatorService';

// Service orchestrateur principal
export { AIQuizValidationOrchestrator } from '../AIQuizValidationOrchestrator';
export type {
    ComprehensiveValidationResult,
    ValidationSummary,
    ValidationConfig
} from '../AIQuizValidationOrchestrator';

// Utilitaires de validation
export { QuizValidationUtils, ValidationHelpers, quizValidationUtils } from '../QuizValidationUtils';
export type {
    QuizValidationOptions,
    ValidationReport
} from '../QuizValidationUtils';

// Import des classes pour les fonctions utilitaires
import { AIQuizValidationOrchestrator } from '../AIQuizValidationOrchestrator';
import { QuizValidationUtils } from '../QuizValidationUtils';
import type { ValidationConfig } from '../AIQuizValidationOrchestrator';
import type { QuizValidationOptions, ValidationReport } from '../QuizValidationUtils';
import type { StudentLevel } from '../../schemas/aiQuizValidationSchema';

/**
 * Configuration par défaut pour la validation des quiz IA
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
    strictMode: false,
    enableInappropriateContentDetection: true,
    enableMedicalVocabularyValidation: true
};

/**
 * Options par défaut pour la validation des quiz
 */
export const DEFAULT_QUIZ_VALIDATION_OPTIONS: QuizValidationOptions = {
    strictValidation: false,
    skipInappropriateContentCheck: false,
    skipMedicalVocabularyCheck: false
};

/**
 * Fonction utilitaire pour créer une instance de validation orchestrée
 */
export function createQuizValidator() {
    return new AIQuizValidationOrchestrator();
}

/**
 * Fonction utilitaire pour créer une instance des utilitaires de validation
 */
export function createValidationUtils() {
    return new QuizValidationUtils();
}

/**
 * Validation rapide d'un quiz - fonction de commodité
 */
export async function quickValidateQuiz(
    content: unknown,
    studentLevel?: StudentLevel
): Promise<{
    isValid: boolean;
    canCreateQuiz: boolean;
    criticalIssues: string[];
    score: number;
}> {
    const validator = new AIQuizValidationOrchestrator();
    const result = await validator.validateAIGeneratedQuiz(content, { studentLevel });

    return {
        isValid: result.isValid,
        canCreateQuiz: result.canProceedToCreation,
        criticalIssues: result.validationSteps.contentValidation.issues
            .filter(issue => issue.severity === 'critical')
            .map(issue => issue.message),
        score: result.overallScore
    };
}

/**
 * Validation complète avec rapport détaillé - fonction de commodité
 */
export async function validateQuizWithReport(
    content: unknown,
    options: QuizValidationOptions = DEFAULT_QUIZ_VALIDATION_OPTIONS
): Promise<{
    validation: ValidationReport;
    detailedReport: string;
}> {
    const utils = new QuizValidationUtils();
    const validation = await utils.validateForGeneration(content, options);
    const detailedReport = await utils.generateAdminReport(content, options);

    return {
        validation,
        detailedReport
    };
}