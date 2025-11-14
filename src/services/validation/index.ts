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

// Import des utilitaires existants pour éviter les duplications
import { quizValidationUtils } from '../QuizValidationUtils';
import type { QuizValidationOptions, ValidationReport } from '../QuizValidationUtils';
import type { StudentLevel } from '../../schemas/aiQuizValidationSchema';

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
    const validation = await quizValidationUtils.validateForGeneration(content, { studentLevel });

    return {
        isValid: validation.passed,
        canCreateQuiz: validation.canCreateQuiz,
        criticalIssues: validation.issues.critical,
        score: validation.score
    };
}

/**
 * Validation complète avec rapport détaillé - fonction de commodité
 */
export async function validateQuizWithReport(
    content: unknown,
    options: QuizValidationOptions = {}
): Promise<{
    validation: ValidationReport;
    detailedReport: string;
}> {
    const validation = await quizValidationUtils.validateForGeneration(content, options);
    const detailedReport = await quizValidationUtils.generateAdminReport(content, options);

    return {
        validation,
        detailedReport
    };
}