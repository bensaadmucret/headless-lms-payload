/**
 * Service de validation JSON Schema pour les quiz générés par l'IA
 * Fournit une validation stricte de la structure JSON
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { AI_QUIZ_JSON_SCHEMA } from '../schemas/aiQuizValidationSchema';

export interface JSONValidationResult {
  isValid: boolean;
  errors: JSONValidationError[];
  warnings: JSONValidationWarning[];
}

export interface JSONValidationError {
  field: string;
  message: string;
  value?: any;
  expectedType?: string;
  constraint?: string;
}

export interface JSONValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export class JSONSchemaValidatorService {
  private ajv: Ajv;
  private quizValidator: any;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: false,
      removeAdditional: false
    });
    addFormats(this.ajv);
    
    // Compiler le schéma de quiz
    this.quizValidator = this.ajv.compile(AI_QUIZ_JSON_SCHEMA);
  }

  /**
   * Valide la structure JSON d'un quiz généré par l'IA
   */
  validateQuizStructure(content: any): JSONValidationResult {
    const errors: JSONValidationError[] = [];
    const warnings: JSONValidationWarning[] = [];

    // Validation avec AJV
    const isValid = this.quizValidator(content);

    if (!isValid && this.quizValidator.errors) {
      this.quizValidator.errors.forEach((error: any) => {
        errors.push(this.convertAJVErrorToValidationError(error));
      });
    }

    // Validations métier supplémentaires
    if (content && typeof content === 'object') {
      this.validateBusinessRules(content, errors, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide uniquement la structure de base (sans contenu métier)
   */
  validateBasicStructure(content: any): boolean {
    try {
      return this.quizValidator(content);
    } catch (error) {
      return false;
    }
  }

  /**
   * Valide et nettoie le contenu JSON
   */
  validateAndSanitize(content: any): {
    isValid: boolean;
    sanitizedContent?: any;
    errors: JSONValidationError[];
  } {
    const errors: JSONValidationError[] = [];
    
    if (!content || typeof content !== 'object') {
      errors.push({
        field: 'root',
        message: 'Le contenu doit être un objet JSON valide',
        expectedType: 'object'
      });
      return { isValid: false, errors };
    }

    // Créer une copie nettoyée
    const sanitized = this.sanitizeContent(content);
    
    // Valider la version nettoyée
    const validation = this.validateQuizStructure(sanitized);
    
    return {
      isValid: validation.isValid,
      sanitizedContent: validation.isValid ? sanitized : undefined,
      errors: validation.errors
    };
  }

  /**
   * Convertit une erreur AJV en erreur de validation
   */
  private convertAJVErrorToValidationError(error: any): JSONValidationError {
    const field = error.instancePath || error.schemaPath || 'unknown';
    let message = error.message || 'Erreur de validation';
    
    // Messages personnalisés selon le type d'erreur
    switch (error.keyword) {
      case 'required':
        message = `Le champ "${error.params?.missingProperty}" est requis`;
        break;
      case 'type':
        message = `Le champ doit être de type "${error.schema}"`;
        break;
      case 'minLength':
        message = `Minimum ${error.schema} caractères requis`;
        break;
      case 'maxLength':
        message = `Maximum ${error.schema} caractères autorisés`;
        break;
      case 'minItems':
        message = `Minimum ${error.schema} éléments requis`;
        break;
      case 'maxItems':
        message = `Maximum ${error.schema} éléments autorisés`;
        break;
      case 'enum':
        message = `Valeur autorisée: ${Array.isArray(error.schema) ? error.schema.join(', ') : error.schema}`;
        break;
      case 'minimum':
        message = `Valeur minimum: ${error.schema}`;
        break;
      case 'maximum':
        message = `Valeur maximum: ${error.schema}`;
        break;
      case 'additionalProperties':
        message = `Propriété non autorisée: "${error.params?.additionalProperty}"`;
        break;
    }

    return {
      field,
      message,
      value: error.data,
      expectedType: error.schema,
      constraint: error.keyword
    };
  }

  /**
   * Valide les règles métier spécifiques
   */
  private validateBusinessRules(
    content: any, 
    errors: JSONValidationError[], 
    warnings: JSONValidationWarning[]
  ): void {
    // Validation des questions
    if (content.questions && Array.isArray(content.questions)) {
      content.questions.forEach((question: any, index: number) => {
        this.validateQuestionBusinessRules(question, index, errors, warnings);
      });
    }

    // Validation du quiz
    if (content.quiz) {
      this.validateQuizBusinessRules(content.quiz, errors, warnings);
    }
  }

  /**
   * Valide les règles métier d'une question
   */
  private validateQuestionBusinessRules(
    question: any, 
    index: number, 
    errors: JSONValidationError[], 
    warnings: JSONValidationWarning[]
  ): void {
    const fieldPrefix = `questions[${index}]`;

    // Validation des options
    if (question.options && Array.isArray(question.options)) {
      const correctOptions = question.options.filter((opt: any) => opt.isCorrect === true);
      
      if (correctOptions.length !== 1) {
        errors.push({
          field: `${fieldPrefix}.options`,
          message: `Il doit y avoir exactement une bonne réponse (trouvé: ${correctOptions.length})`,
          constraint: 'single_correct_answer'
        });
      }

      // Vérification des doublons
      const optionTexts = question.options
        .map((opt: any) => opt.text?.toLowerCase().trim())
        .filter(Boolean);
      
      const uniqueTexts = new Set(optionTexts);
      if (uniqueTexts.size !== optionTexts.length) {
        errors.push({
          field: `${fieldPrefix}.options`,
          message: 'Options dupliquées détectées',
          constraint: 'unique_options'
        });
      }

      // Avertissements sur la longueur des options
      question.options.forEach((option: any, optIndex: number) => {
        if (option.text) {
          if (option.text.length < 5) {
            warnings.push({
              field: `${fieldPrefix}.options[${optIndex}]`,
              message: 'Option très courte',
              suggestion: 'Développer le texte de l\'option pour plus de clarté'
            });
          } else if (option.text.length > 200) {
            warnings.push({
              field: `${fieldPrefix}.options[${optIndex}]`,
              message: 'Option très longue',
              suggestion: 'Raccourcir l\'option pour améliorer la lisibilité'
            });
          }
        }
      });
    }

    // Validation de la cohérence question-explication
    if (question.questionText && question.explanation) {
      const coherenceScore = this.calculateCoherenceScore(
        question.questionText, 
        question.explanation
      );
      
      if (coherenceScore < 0.2) {
        warnings.push({
          field: `${fieldPrefix}`,
          message: 'L\'explication semble peu cohérente avec la question',
          suggestion: 'Vérifier que l\'explication répond directement à la question'
        });
      }
    }
  }

  /**
   * Valide les règles métier du quiz
   */
  private validateQuizBusinessRules(
    quiz: any, 
    errors: JSONValidationError[], 
    warnings: JSONValidationWarning[]
  ): void {
    // Validation de la durée estimée
    if (typeof quiz.estimatedDuration === 'number') {
      if (quiz.estimatedDuration < 1) {
        warnings.push({
          field: 'quiz.estimatedDuration',
          message: 'Durée estimée très courte',
          suggestion: 'Vérifier que la durée est réaliste (minimum 1 minute)'
        });
      } else if (quiz.estimatedDuration > 120) {
        warnings.push({
          field: 'quiz.estimatedDuration',
          message: 'Durée estimée très longue',
          suggestion: 'Considérer diviser en plusieurs quiz plus courts'
        });
      }
    }

    // Validation du titre
    if (quiz.title && typeof quiz.title === 'string') {
      if (quiz.title.length < 10) {
        warnings.push({
          field: 'quiz.title',
          message: 'Titre très court',
          suggestion: 'Utiliser un titre plus descriptif'
        });
      }
    }
  }

  /**
   * Nettoie et normalise le contenu JSON
   */
  private sanitizeContent(content: any): any {
    if (!content || typeof content !== 'object') {
      return content;
    }

    const sanitized = JSON.parse(JSON.stringify(content));

    // Nettoyer les questions
    if (sanitized.questions && Array.isArray(sanitized.questions)) {
      sanitized.questions = sanitized.questions.map((question: any) => {
        const cleanQuestion: any = {};

        // Nettoyer le texte de la question
        if (question.questionText && typeof question.questionText === 'string') {
          cleanQuestion.questionText = question.questionText.trim();
        }

        // Nettoyer les options
        if (question.options && Array.isArray(question.options)) {
          cleanQuestion.options = question.options
            .filter((opt: any) => opt && typeof opt === 'object')
            .map((opt: any) => ({
              text: typeof opt.text === 'string' ? opt.text.trim() : '',
              isCorrect: Boolean(opt.isCorrect)
            }))
            .filter((opt: any) => opt.text.length > 0);
        }

        // Nettoyer l'explication
        if (question.explanation && typeof question.explanation === 'string') {
          cleanQuestion.explanation = question.explanation.trim();
        }

        // Nettoyer la difficulté
        if (question.difficulty && typeof question.difficulty === 'string') {
          const validDifficulties = ['easy', 'medium', 'hard'];
          if (validDifficulties.includes(question.difficulty.toLowerCase())) {
            cleanQuestion.difficulty = question.difficulty.toLowerCase();
          }
        }

        // Nettoyer les tags
        if (question.tags && Array.isArray(question.tags)) {
          cleanQuestion.tags = question.tags
            .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
            .map((tag: string) => tag.trim().toLowerCase());
        }

        return cleanQuestion;
      }).filter((question: any) => 
        question.questionText && 
        question.options && 
        question.options.length === 4 && 
        question.explanation
      );
    }

    // Nettoyer les métadonnées du quiz
    if (sanitized.quiz && typeof sanitized.quiz === 'object') {
      const cleanQuiz: any = {};

      if (sanitized.quiz.title && typeof sanitized.quiz.title === 'string') {
        cleanQuiz.title = sanitized.quiz.title.trim();
      }

      if (sanitized.quiz.description && typeof sanitized.quiz.description === 'string') {
        cleanQuiz.description = sanitized.quiz.description.trim();
      }

      if (typeof sanitized.quiz.estimatedDuration === 'number') {
        cleanQuiz.estimatedDuration = Math.max(1, Math.min(120, sanitized.quiz.estimatedDuration));
      }

      sanitized.quiz = cleanQuiz;
    }

    return sanitized;
  }

  /**
   * Calcule un score de cohérence entre question et explication
   */
  private calculateCoherenceScore(question: string, explanation: string): number {
    const questionWords = new Set(
      question.toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 3)
    );
    
    const explanationWords = new Set(
      explanation.toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 3)
    );
    
    const commonWords = new Set(
      [...questionWords].filter(w => explanationWords.has(w))
    );
    
    return commonWords.size / Math.max(questionWords.size, explanationWords.size, 1);
  }

  /**
   * Génère un rapport de validation JSON
   */
  generateJSONValidationReport(result: JSONValidationResult): string {
    let report = `=== RAPPORT DE VALIDATION JSON ===\n\n`;
    report += `Statut: ${result.isValid ? '✅ STRUCTURE VALIDE' : '❌ STRUCTURE INVALIDE'}\n\n`;

    if (result.errors.length > 0) {
      report += `ERREURS DE STRUCTURE (${result.errors.length}):\n`;
      result.errors.forEach((error, index) => {
        report += `${index + 1}. 🔴 ${error.message}\n`;
        report += `   Champ: ${error.field}\n`;
        if (error.expectedType) report += `   Type attendu: ${error.expectedType}\n`;
        if (error.constraint) report += `   Contrainte: ${error.constraint}\n`;
        report += '\n';
      });
    }

    if (result.warnings.length > 0) {
      report += `AVERTISSEMENTS (${result.warnings.length}):\n`;
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ⚠️ ${warning.message}\n`;
        report += `   Champ: ${warning.field}\n`;
        report += `   Suggestion: ${warning.suggestion}\n`;
        report += '\n';
      });
    }

    if (result.isValid && result.errors.length === 0 && result.warnings.length === 0) {
      report += '🎉 Structure JSON parfaitement valide !\n';
    }

    return report;
  }
}