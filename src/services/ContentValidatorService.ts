/**
 * Service de validation du contenu généré par l'IA
 * Valide la structure JSON et la qualité métier des quiz médicaux
 * 
 * @deprecated Utiliser EnhancedContentValidatorService pour les nouvelles fonctionnalités
 */

import { EnhancedContentValidatorService, type EnhancedValidationResult } from './EnhancedContentValidatorService';
import type { StudentLevel } from '../schemas/aiQuizValidationSchema';

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
}

export interface ValidationIssue {
  type: 'structure' | 'content' | 'medical' | 'pedagogical';
  severity: 'critical' | 'major' | 'minor';
  field?: string;
  message: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'quality' | 'style' | 'optimization';
  message: string;
  suggestion?: string;
}

export interface AIGeneratedQuiz {
  quiz: {
    title: string;
    description: string;
    estimatedDuration: number;
  };
  questions: AIGeneratedQuestion[];
}

export interface AIGeneratedQuestion {
  questionText: string;
  options: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  difficulty?: string;
  tags?: string[];
}

export class ContentValidatorService {
  private readonly MIN_QUESTION_LENGTH = 20;
  private readonly MAX_QUESTION_LENGTH = 500;
  private readonly MIN_EXPLANATION_LENGTH = 50;
  private readonly MIN_OPTION_LENGTH = 5;
  
  private enhancedValidator: EnhancedContentValidatorService;

  constructor() {
    this.enhancedValidator = new EnhancedContentValidatorService();
  }

  /**
   * Valide complètement un quiz généré par l'IA
   */
  validateAIGeneratedQuiz(content: any): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    let score = 100;

    // Validation de la structure JSON
    const structureValidation = this.validateQuizStructure(content);
    issues.push(...structureValidation.issues);
    score -= structureValidation.penalty;

    if (structureValidation.isValid) {
      // Validation du contenu du quiz
      const quizValidation = this.validateQuizContent(content.quiz);
      issues.push(...quizValidation.issues);
      warnings.push(...quizValidation.warnings);
      score -= quizValidation.penalty;

      // Validation des questions
      const questionsValidation = this.validateQuestions(content.questions);
      issues.push(...questionsValidation.issues);
      warnings.push(...questionsValidation.warnings);
      score -= questionsValidation.penalty;

      // Validation médicale spécialisée
      const medicalValidation = this.validateMedicalContent(content);
      issues.push(...medicalValidation.issues);
      warnings.push(...medicalValidation.warnings);
      score -= medicalValidation.penalty;
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      score: Math.max(0, score),
      issues,
      warnings
    };
  }

  /**
   * Valide la structure JSON du quiz
   */
  private validateQuizStructure(content: any): { isValid: boolean; issues: ValidationIssue[]; penalty: number } {
    const issues: ValidationIssue[] = [];
    let penalty = 0;

    // Vérification de la structure de base
    if (!content || typeof content !== 'object') {
      issues.push({
        type: 'structure',
        severity: 'critical',
        message: 'Le contenu doit être un objet JSON valide',
        suggestion: 'Vérifier la syntaxe JSON'
      });
      return { isValid: false, issues, penalty: 100 };
    }

    // Vérification de la section quiz
    if (!content.quiz || typeof content.quiz !== 'object') {
      issues.push({
        type: 'structure',
        severity: 'critical',
        field: 'quiz',
        message: 'La section "quiz" est manquante ou invalide',
        suggestion: 'Ajouter un objet "quiz" avec title, description, estimatedDuration'
      });
      penalty += 30;
    }

    // Vérification de la section questions
    if (!content.questions || !Array.isArray(content.questions)) {
      issues.push({
        type: 'structure',
        severity: 'critical',
        field: 'questions',
        message: 'La section "questions" doit être un tableau',
        suggestion: 'Fournir un tableau de questions'
      });
      penalty += 50;
    } else if (content.questions.length === 0) {
      issues.push({
        type: 'structure',
        severity: 'critical',
        field: 'questions',
        message: 'Le tableau de questions ne peut pas être vide',
        suggestion: 'Ajouter au moins une question'
      });
      penalty += 50;
    }

    return { isValid: issues.filter(i => i.severity === 'critical').length === 0, issues, penalty };
  }

  /**
   * Valide le contenu de la section quiz
   */
  private validateQuizContent(quiz: any): { issues: ValidationIssue[]; warnings: ValidationWarning[]; penalty: number } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    let penalty = 0;

    if (!quiz) return { issues, warnings, penalty };

    // Validation du titre
    if (!quiz.title || typeof quiz.title !== 'string') {
      issues.push({
        type: 'content',
        severity: 'major',
        field: 'quiz.title',
        message: 'Le titre du quiz est requis',
        suggestion: 'Ajouter un titre descriptif'
      });
      penalty += 15;
    } else {
      if (quiz.title.length < 10) {
        warnings.push({
          type: 'quality',
          message: 'Le titre du quiz est très court',
          suggestion: 'Utiliser un titre plus descriptif (minimum 10 caractères)'
        });
      }
      if (quiz.title.length > 100) {
        warnings.push({
          type: 'quality',
          message: 'Le titre du quiz est très long',
          suggestion: 'Raccourcir le titre (maximum 100 caractères)'
        });
      }
    }

    // Validation de la description
    if (!quiz.description || typeof quiz.description !== 'string') {
      issues.push({
        type: 'content',
        severity: 'major',
        field: 'quiz.description',
        message: 'La description du quiz est requise',
        suggestion: 'Ajouter une description claire du contenu'
      });
      penalty += 10;
    } else if (quiz.description.length < 20) {
      warnings.push({
        type: 'quality',
        message: 'La description du quiz est très courte',
        suggestion: 'Développer la description (minimum 20 caractères)'
      });
    }

    // Validation de la durée estimée
    if (typeof quiz.estimatedDuration !== 'number') {
      issues.push({
        type: 'content',
        severity: 'minor',
        field: 'quiz.estimatedDuration',
        message: 'La durée estimée doit être un nombre',
        suggestion: 'Fournir une durée en minutes'
      });
      penalty += 5;
    } else {
      if (quiz.estimatedDuration < 1 || quiz.estimatedDuration > 120) {
        warnings.push({
          type: 'quality',
          message: 'La durée estimée semble inappropriée',
          suggestion: 'Ajuster la durée entre 1 et 120 minutes'
        });
      }
    }

    return { issues, warnings, penalty };
  }

  /**
   * Valide toutes les questions du quiz
   */
  private validateQuestions(questions: any[]): { issues: ValidationIssue[]; warnings: ValidationWarning[]; penalty: number } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    let penalty = 0;

    if (!questions || !Array.isArray(questions)) {
      return { issues, warnings, penalty };
    }

    questions.forEach((question, index) => {
      const questionValidation = this.validateSingleQuestion(question, index);
      issues.push(...questionValidation.issues);
      warnings.push(...questionValidation.warnings);
      penalty += questionValidation.penalty;
    });

    // Validation globale des questions
    if (questions.length > 20) {
      warnings.push({
        type: 'optimization',
        message: 'Nombre élevé de questions',
        suggestion: 'Considérer diviser en plusieurs quiz plus courts'
      });
    }

    return { issues, warnings, penalty };
  }

  /**
   * Valide une question individuelle
   */
  private validateSingleQuestion(question: any, index: number): { issues: ValidationIssue[]; warnings: ValidationWarning[]; penalty: number } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    let penalty = 0;
    const fieldPrefix = `questions[${index}]`;

    // Validation du texte de la question
    if (!question.questionText || typeof question.questionText !== 'string') {
      issues.push({
        type: 'content',
        severity: 'critical',
        field: `${fieldPrefix}.questionText`,
        message: 'Le texte de la question est requis',
        suggestion: 'Ajouter un texte de question clair'
      });
      penalty += 20;
    } else {
      if (question.questionText.length < this.MIN_QUESTION_LENGTH) {
        issues.push({
          type: 'content',
          severity: 'major',
          field: `${fieldPrefix}.questionText`,
          message: 'Le texte de la question est trop court',
          suggestion: `Minimum ${this.MIN_QUESTION_LENGTH} caractères`
        });
        penalty += 10;
      }
      if (question.questionText.length > this.MAX_QUESTION_LENGTH) {
        warnings.push({
          type: 'quality',
          message: `Question ${index + 1}: texte très long`,
          suggestion: 'Simplifier la formulation'
        });
      }
    }

    // Validation des options
    const optionsValidation = this.validateQuestionOptions(question.options, fieldPrefix);
    issues.push(...optionsValidation.issues);
    warnings.push(...optionsValidation.warnings);
    penalty += optionsValidation.penalty;

    // Validation de l'explication
    if (!question.explanation || typeof question.explanation !== 'string') {
      issues.push({
        type: 'content',
        severity: 'major',
        field: `${fieldPrefix}.explanation`,
        message: 'L\'explication est requise',
        suggestion: 'Ajouter une explication détaillée'
      });
      penalty += 15;
    } else {
      if (question.explanation.length < this.MIN_EXPLANATION_LENGTH) {
        issues.push({
          type: 'content',
          severity: 'minor',
          field: `${fieldPrefix}.explanation`,
          message: 'L\'explication est trop courte',
          suggestion: `Minimum ${this.MIN_EXPLANATION_LENGTH} caractères`
        });
        penalty += 5;
      }
    }

    return { issues, warnings, penalty };
  }

  /**
   * Valide les options d'une question
   */
  private validateQuestionOptions(options: any, fieldPrefix: string): { issues: ValidationIssue[]; warnings: ValidationWarning[]; penalty: number } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    let penalty = 0;

    if (!Array.isArray(options)) {
      issues.push({
        type: 'structure',
        severity: 'critical',
        field: `${fieldPrefix}.options`,
        message: 'Les options doivent être un tableau',
        suggestion: 'Fournir un tableau d\'options'
      });
      return { issues, warnings, penalty: 30 };
    }

    if (options.length !== 4) {
      issues.push({
        type: 'structure',
        severity: 'critical',
        field: `${fieldPrefix}.options`,
        message: 'Chaque question doit avoir exactement 4 options',
        suggestion: 'Ajouter ou supprimer des options pour avoir exactement 4'
      });
      penalty += 25;
    }

    // Validation de chaque option
    let correctCount = 0;
    const optionTexts: string[] = [];

    options.forEach((option, optIndex) => {
      if (!option || typeof option !== 'object') {
        issues.push({
          type: 'structure',
          severity: 'major',
          field: `${fieldPrefix}.options[${optIndex}]`,
          message: 'Option invalide',
          suggestion: 'Chaque option doit être un objet avec text et isCorrect'
        });
        penalty += 10;
        return;
      }

      // Validation du texte de l'option
      if (!option.text || typeof option.text !== 'string') {
        issues.push({
          type: 'content',
          severity: 'major',
          field: `${fieldPrefix}.options[${optIndex}].text`,
          message: 'Le texte de l\'option est requis',
          suggestion: 'Ajouter un texte pour l\'option'
        });
        penalty += 8;
      } else {
        if (option.text.length < this.MIN_OPTION_LENGTH) {
          warnings.push({
            type: 'quality',
            message: `Option ${optIndex + 1} très courte`,
            suggestion: 'Développer le texte de l\'option'
          });
        }
        optionTexts.push(option.text.toLowerCase().trim());
      }

      // Validation du flag isCorrect
      if (typeof option.isCorrect !== 'boolean') {
        issues.push({
          type: 'structure',
          severity: 'major',
          field: `${fieldPrefix}.options[${optIndex}].isCorrect`,
          message: 'isCorrect doit être un booléen',
          suggestion: 'Utiliser true ou false'
        });
        penalty += 8;
      } else if (option.isCorrect) {
        correctCount++;
      }
    });

    // Validation du nombre de bonnes réponses
    if (correctCount !== 1) {
      issues.push({
        type: 'content',
        severity: 'critical',
        field: `${fieldPrefix}.options`,
        message: `Il doit y avoir exactement une bonne réponse (trouvé: ${correctCount})`,
        suggestion: 'Marquer exactement une option comme correcte'
      });
      penalty += 30;
    }

    // Détection des doublons
    const uniqueTexts = new Set(optionTexts);
    if (uniqueTexts.size !== optionTexts.length) {
      issues.push({
        type: 'content',
        severity: 'major',
        field: `${fieldPrefix}.options`,
        message: 'Options dupliquées détectées',
        suggestion: 'Chaque option doit être unique'
      });
      penalty += 15;
    }

    return { issues, warnings, penalty };
  }

  /**
   * Validation spécialisée pour le contenu médical
   */
  private validateMedicalContent(content: any): { issues: ValidationIssue[]; warnings: ValidationWarning[]; penalty: number } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    let penalty = 0;

    if (!content.questions) return { issues, warnings, penalty };

    // Termes médicaux de base attendus
    const medicalTerms = [
      'anatomie', 'physiologie', 'pathologie', 'diagnostic', 'traitement',
      'symptôme', 'maladie', 'syndrome', 'cellule', 'tissu', 'organe',
      'système', 'fonction', 'mécanisme', 'processus'
    ];

    let questionsWithMedicalTerms = 0;

    content.questions.forEach((question: any, index: number) => {
      if (!question.questionText) return;

      const questionText = question.questionText.toLowerCase();
      const hasMedicalTerms = medicalTerms.some(term => questionText.includes(term));

      if (hasMedicalTerms) {
        questionsWithMedicalTerms++;
      }

      // Validation du vocabulaire médical approprié
      if (!hasMedicalTerms) {
        warnings.push({
          type: 'quality',
          message: `Question ${index + 1}: manque de terminologie médicale spécifique`,
          suggestion: 'Utiliser un vocabulaire médical plus précis'
        });
      }

      // Détection de contenu potentiellement dangereux
      const dangerousPatterns = [
        /auto.?médication/i,
        /diagnostic.?personnel/i,
        /traitement.?sans.?médecin/i,
        /remède.?miracle/i
      ];

      dangerousPatterns.forEach(pattern => {
        if (pattern.test(questionText)) {
          issues.push({
            type: 'medical',
            severity: 'major',
            field: `questions[${index}].questionText`,
            message: 'Contenu médical potentiellement dangereux détecté',
            suggestion: 'Reformuler pour éviter les conseils médicaux directs'
          });
          penalty += 20;
        }
      });
    });

    // Validation globale du contenu médical
    const medicalRatio = questionsWithMedicalTerms / content.questions.length;
    if (medicalRatio < 0.5) {
      warnings.push({
        type: 'quality',
        message: 'Faible densité de terminologie médicale dans le quiz',
        suggestion: 'Augmenter l\'utilisation de termes médicaux spécialisés'
      });
    }

    return { issues, warnings, penalty };
  }

  /**
   * Valide la cohérence pédagogique du quiz
   */
  validatePedagogicalCoherence(content: any): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    let score = 100;

    if (!content.questions || !Array.isArray(content.questions)) {
      return { isValid: false, score: 0, issues, warnings };
    }

    // Vérification de la progression de difficulté
    const difficulties = content.questions
      .map((q: any) => q.difficulty)
      .filter((d: any) => d);

    if (difficulties.length > 1) {
      const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
      let isProgressive = true;

      for (let i = 1; i < difficulties.length; i++) {
        const current = difficultyOrder[difficulties[i] as keyof typeof difficultyOrder] || 2;
        const previous = difficultyOrder[difficulties[i-1] as keyof typeof difficultyOrder] || 2;
        
        if (current < previous - 1) {
          isProgressive = false;
          break;
        }
      }

      if (!isProgressive) {
        warnings.push({
          type: 'optimization',
          message: 'La progression de difficulté pourrait être améliorée',
          suggestion: 'Organiser les questions par difficulté croissante'
        });
      }
    }

    // Vérification de la diversité des explications
    const explanationLengths = content.questions
      .map((q: any) => q.explanation?.length || 0)
      .filter((l: number) => l > 0);

    if (explanationLengths.length > 0) {
      const avgLength = explanationLengths.reduce((a: number, b: number) => a + b, 0) / explanationLengths.length;
      const variance = explanationLengths.reduce((acc: number, len: number) => acc + Math.pow(len - avgLength, 2), 0) / explanationLengths.length;
      
      if (variance < 100) {
        warnings.push({
          type: 'quality',
          message: 'Les explications ont des longueurs très similaires',
          suggestion: 'Varier la profondeur des explications selon la complexité'
        });
      }
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      score: Math.max(0, score),
      issues,
      warnings
    };
  }

  /**
   * Validation améliorée avec support des niveaux d'études et détection de contenu inapproprié
   */
  async validateAIGeneratedQuizEnhanced(
    content: any,
    studentLevel?: StudentLevel,
    additionalRules?: any
  ): Promise<EnhancedValidationResult> {
    return await this.enhancedValidator.validateAIGeneratedQuiz(content, studentLevel, additionalRules);
  }

  /**
   * Validation avec schéma JSON strict
   */
  async validateWithJSONSchema(content: any): Promise<EnhancedValidationResult> {
    return await this.enhancedValidator.validateAIGeneratedQuiz(content);
  }

  /**
   * Validation spécifique pour le niveau PASS
   */
  async validateForPASS(content: any): Promise<EnhancedValidationResult> {
    return await this.enhancedValidator.validateAIGeneratedQuiz(content, 'PASS');
  }

  /**
   * Validation spécifique pour le niveau LAS
   */
  async validateForLAS(content: any): Promise<EnhancedValidationResult> {
    return await this.enhancedValidator.validateAIGeneratedQuiz(content, 'LAS');
  }

  /**
   * Détection de contenu inapproprié uniquement
   */
  async detectInappropriateContent(content: any): Promise<{
    hasInappropriateContent: boolean;
    issues: ValidationIssue[];
    warnings: ValidationWarning[];
  }> {
    const result = await this.enhancedValidator.validateAIGeneratedQuiz(content);
    const inappropriateIssues = result.issues.filter(issue => 
      issue.type === 'medical' && issue.message.includes('inapproprié')
    );
    
    return {
      hasInappropriateContent: inappropriateIssues.length > 0,
      issues: inappropriateIssues,
      warnings: result.warnings.filter(w => w.type === 'quality').map(w => ({
        type: w.type as 'quality' | 'style' | 'optimization',
        message: w.message,
        suggestion: w.suggestion
      }))
    };
  }

  /**
   * Validation de la qualité du vocabulaire médical
   */
  async validateMedicalVocabulary(content: any, studentLevel?: StudentLevel): Promise<{
    medicalTerminologyRatio: number;
    isAdequate: boolean;
    suggestions: string[];
  }> {
    const result = await this.enhancedValidator.validateAIGeneratedQuiz(content, studentLevel);
    
    return {
      medicalTerminologyRatio: result.metadata.medicalTerminologyRatio,
      isAdequate: result.metadata.medicalTerminologyRatio >= 0.3,
      suggestions: result.recommendations
        .filter(r => r.category === 'medical')
        .map(r => r.action)
    };
  }

  /**
   * Génère un rapport de validation détaillé
   */
  generateValidationReport(result: ValidationResult): string {
    let report = `=== RAPPORT DE VALIDATION ===\n\n`;
    report += `Score global: ${result.score}/100\n`;
    report += `Statut: ${result.isValid ? '✅ VALIDE' : '❌ INVALIDE'}\n\n`;

    if (result.issues.length > 0) {
      report += `PROBLÈMES DÉTECTÉS (${result.issues.length}):\n`;
      result.issues.forEach((issue, index) => {
        const severity = issue.severity === 'critical' ? '🔴' : 
                        issue.severity === 'major' ? '🟠' : '🟡';
        report += `${index + 1}. ${severity} ${issue.message}\n`;
        if (issue.field) report += `   Champ: ${issue.field}\n`;
        if (issue.suggestion) report += `   Suggestion: ${issue.suggestion}\n`;
        report += '\n';
      });
    }

    if (result.warnings.length > 0) {
      report += `AVERTISSEMENTS (${result.warnings.length}):\n`;
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ⚠️ ${warning.message}\n`;
        if (warning.suggestion) report += `   Suggestion: ${warning.suggestion}\n`;
        report += '\n';
      });
    }

    if (result.isValid && result.issues.length === 0 && result.warnings.length === 0) {
      report += '🎉 Aucun problème détecté ! Le contenu est de haute qualité.\n';
    }

    return report;
  }

  /**
   * Génère un rapport détaillé avec la nouvelle validation améliorée
   */
  generateEnhancedValidationReport(result: EnhancedValidationResult): string {
    return this.enhancedValidator.generateDetailedReport(result);
  }
}