/**
 * Utilitaires de validation pour les quiz générés par l'IA
 * Fournit des méthodes pratiques pour la validation dans le workflow de génération
 */

import { AIQuizValidationOrchestrator, type ComprehensiveValidationResult, type ValidationConfig } from './AIQuizValidationOrchestrator';
import type { StudentLevel } from '../schemas/aiQuizValidationSchema';

export interface QuizValidationOptions {
  studentLevel?: StudentLevel;
  strictValidation?: boolean;
  skipInappropriateContentCheck?: boolean;
  skipMedicalVocabularyCheck?: boolean;
  customValidationRules?: any;
}

export interface ValidationReport {
  passed: boolean;
  score: number;
  canCreateQuiz: boolean;
  issues: {
    critical: string[];
    major: string[];
    minor: string[];
  };
  warnings: string[];
  recommendations: string[];
  medicalQuality: {
    score: number;
    terminologyRatio: number;
    isAppropriate: boolean;
  };
  summary: string;
}

export class QuizValidationUtils {
  private orchestrator: AIQuizValidationOrchestrator;

  constructor() {
    this.orchestrator = new AIQuizValidationOrchestrator();
  }

  /**
   * Validation complète avec rapport simplifié pour l'interface utilisateur
   */
  async validateForGeneration(
    content: any,
    options: QuizValidationOptions = {}
  ): Promise<ValidationReport> {
    const config: ValidationConfig = {
      studentLevel: options.studentLevel,
      strictMode: options.strictValidation || false,
      enableInappropriateContentDetection: !options.skipInappropriateContentCheck,
      enableMedicalVocabularyValidation: !options.skipMedicalVocabularyCheck,
      customRules: options.customValidationRules
    };

    const result = await this.orchestrator.validateAIGeneratedQuiz(content, config);
    
    return this.convertToValidationReport(result);
  }

  /**
   * Validation rapide pour vérifier si le contenu peut être traité
   */
  async quickCheck(content: any): Promise<{
    canProcess: boolean;
    issues: string[];
    quality: 'high' | 'medium' | 'low';
  }> {
    const result = await this.orchestrator.quickValidation(content);
    return {
      canProcess: result.canProcess,
      issues: result.criticalIssues,
      quality: result.estimatedQuality
    };
  }

  /**
   * Validation spécialisée pour le contenu médical
   */
  async validateMedicalContent(
    content: any,
    studentLevel?: StudentLevel
  ): Promise<{
    isValid: boolean;
    score: number;
    terminologyRatio: number;
    issues: string[];
    suggestions: string[];
  }> {
    const result = await this.orchestrator.validateMedicalContent(content, studentLevel);
    
    return {
      isValid: result.medicalQualityScore >= 70,
      score: result.medicalQualityScore,
      terminologyRatio: result.terminologyRatio,
      issues: result.medicalIssues,
      suggestions: result.suggestions
    };
  }

  /**
   * Détection de contenu inapproprié
   */
  async checkInappropriateContent(content: any): Promise<{
    hasIssues: boolean;
    severity: 'low' | 'medium' | 'high';
    mustReject: boolean;
    patterns: string[];
  }> {
    const result = await this.orchestrator.detectInappropriateContent(content);
    
    return {
      hasIssues: result.hasInappropriateContent,
      severity: result.severity,
      mustReject: result.actionRequired,
      patterns: result.inappropriatePatterns
    };
  }

  /**
   * Validation du vocabulaire médical par niveau
   */
  async validateVocabularyForLevel(
    content: any,
    studentLevel: StudentLevel
  ): Promise<{
    isAppropriate: boolean;
    score: number;
    suggestions: string[];
    levelMatch: boolean;
  }> {
    const result = await this.orchestrator.validateMedicalVocabulary(content, studentLevel);
    
    return {
      isAppropriate: result.isAdequate,
      score: result.vocabularyScore,
      suggestions: result.suggestions,
      levelMatch: result.levelAppropriate
    };
  }

  /**
   * Génère un rapport de validation pour l'interface d'administration
   */
  async generateAdminReport(
    content: any,
    options: QuizValidationOptions = {}
  ): Promise<string> {
    const config: ValidationConfig = {
      studentLevel: options.studentLevel,
      strictMode: options.strictValidation || false,
      enableInappropriateContentDetection: !options.skipInappropriateContentCheck,
      enableMedicalVocabularyValidation: !options.skipMedicalVocabularyCheck,
      customRules: options.customValidationRules
    };

    const result = await this.orchestrator.validateAIGeneratedQuiz(content, config);
    return this.orchestrator.generateComprehensiveReport(result);
  }

  /**
   * Validation par étapes pour le processus de génération
   */
  async validateStep(
    content: any,
    step: 'structure' | 'content' | 'medical' | 'level',
    studentLevel?: StudentLevel
  ): Promise<{
    passed: boolean;
    score: number;
    issues: string[];
    canContinue: boolean;
  }> {
    switch (step) {
      case 'structure':
        return await this.validateStructureStep(content);
      
      case 'content':
        return await this.validateContentStep(content);
      
      case 'medical':
        return await this.validateMedicalStep(content);
      
      case 'level':
        return await this.validateLevelStep(content, studentLevel);
      
      default:
        throw new Error(`Étape de validation inconnue: ${step}`);
    }
  }

  /**
   * Méthodes privées pour la validation par étapes
   */
  private async validateStructureStep(content: any): Promise<{
    passed: boolean;
    score: number;
    issues: string[];
    canContinue: boolean;
  }> {
    const quickCheck = await this.orchestrator.quickValidation(content);
    
    return {
      passed: quickCheck.canProcess,
      score: quickCheck.estimatedQuality === 'high' ? 100 : 
             quickCheck.estimatedQuality === 'medium' ? 70 : 40,
      issues: quickCheck.criticalIssues,
      canContinue: quickCheck.canProcess
    };
  }

  private async validateContentStep(content: any): Promise<{
    passed: boolean;
    score: number;
    issues: string[];
    canContinue: boolean;
  }> {
    const result = await this.orchestrator.validateAIGeneratedQuiz(content, {
      strictMode: false,
      enableInappropriateContentDetection: false,
      enableMedicalVocabularyValidation: false
    });

    const contentScore = result.validationSteps.contentValidation.score;
    const criticalIssues = result.validationSteps.contentValidation.issues
      .filter(issue => issue.severity === 'critical')
      .map(issue => issue.message);

    return {
      passed: contentScore >= 60,
      score: contentScore,
      issues: criticalIssues,
      canContinue: criticalIssues.length === 0
    };
  }

  private async validateMedicalStep(content: any): Promise<{
    passed: boolean;
    score: number;
    issues: string[];
    canContinue: boolean;
  }> {
    const medicalResult = await this.orchestrator.validateMedicalContent(content);
    const inappropriateResult = await this.orchestrator.detectInappropriateContent(content);

    const issues: string[] = [];
    if (medicalResult.medicalIssues.length > 0) {
      issues.push(...medicalResult.medicalIssues);
    }
    if (inappropriateResult.hasInappropriateContent) {
      issues.push('Contenu inapproprié détecté');
    }

    const passed = medicalResult.medicalQualityScore >= 60 && !inappropriateResult.actionRequired;

    return {
      passed,
      score: medicalResult.medicalQualityScore,
      issues,
      canContinue: !inappropriateResult.actionRequired
    };
  }

  private async validateLevelStep(
    content: any,
    studentLevel?: StudentLevel
  ): Promise<{
    passed: boolean;
    score: number;
    issues: string[];
    canContinue: boolean;
  }> {
    if (!studentLevel) {
      return {
        passed: true,
        score: 100,
        issues: [],
        canContinue: true
      };
    }

    const vocabularyResult = await this.orchestrator.validateMedicalVocabulary(content, studentLevel);
    const result = await this.orchestrator.validateAIGeneratedQuiz(content, { studentLevel });

    const pedagogicalScore = result.validationSteps.enhancedValidation.categoryScores.pedagogical;
    const issues: string[] = [];

    if (!vocabularyResult.levelAppropriate) {
      issues.push(`Contenu non adapté au niveau ${studentLevel}`);
    }
    if (!vocabularyResult.isAdequate) {
      issues.push('Vocabulaire médical insuffisant');
    }

    return {
      passed: pedagogicalScore >= 60 && vocabularyResult.levelAppropriate,
      score: pedagogicalScore,
      issues,
      canContinue: pedagogicalScore >= 50
    };
  }

  /**
   * Convertit le résultat complet en rapport simplifié
   */
  private convertToValidationReport(result: ComprehensiveValidationResult): ValidationReport {
    const allIssues = [
      ...result.validationSteps.contentValidation.issues,
      ...result.validationSteps.enhancedValidation.issues
    ];

    const criticalIssues = allIssues
      .filter(issue => issue.severity === 'critical')
      .map(issue => issue.message);

    const majorIssues = allIssues
      .filter(issue => issue.severity === 'major')
      .map(issue => issue.message);

    const minorIssues = allIssues
      .filter(issue => issue.severity === 'minor')
      .map(issue => issue.message);

    const allWarnings = [
      ...result.validationSteps.contentValidation.warnings,
      ...result.validationSteps.enhancedValidation.warnings
    ].map(warning => warning.message);

    // Génération du résumé
    let summary = `Validation ${result.isValid ? 'réussie' : 'échouée'} avec un score de ${result.overallScore}/100. `;
    
    if (result.canProceedToCreation) {
      summary += 'Le quiz peut être créé.';
    } else {
      summary += 'Des corrections sont nécessaires avant la création.';
    }

    if (result.summary.criticalIssues > 0) {
      summary += ` ${result.summary.criticalIssues} problème(s) critique(s) détecté(s).`;
    }

    return {
      passed: result.isValid,
      score: result.overallScore,
      canCreateQuiz: result.canProceedToCreation,
      issues: {
        critical: criticalIssues,
        major: majorIssues,
        minor: minorIssues
      },
      warnings: allWarnings,
      recommendations: result.recommendations,
      medicalQuality: {
        score: result.validationSteps.enhancedValidation.categoryScores.medical,
        terminologyRatio: result.validationSteps.enhancedValidation.metadata.medicalTerminologyRatio,
        isAppropriate: result.validationSteps.enhancedValidation.categoryScores.medical >= 70
      },
      summary
    };
  }
}

/**
 * Instance singleton pour utilisation dans l'application
 */
export const quizValidationUtils = new QuizValidationUtils();

/**
 * Fonctions utilitaires pour la validation rapide
 */
export const ValidationHelpers = {
  /**
   * Vérifie si un quiz peut être créé sans validation complète
   */
  async canCreateQuiz(content: any, studentLevel?: StudentLevel): Promise<boolean> {
    const quickCheck = await quizValidationUtils.quickCheck(content);
    if (!quickCheck.canProcess) return false;

    const inappropriateCheck = await quizValidationUtils.checkInappropriateContent(content);
    return !inappropriateCheck.mustReject;
  },

  /**
   * Obtient un score de qualité rapide
   */
  async getQualityScore(content: any): Promise<number> {
    const quickCheck = await quizValidationUtils.quickCheck(content);
    switch (quickCheck.quality) {
      case 'high': return 85;
      case 'medium': return 65;
      case 'low': return 35;
      default: return 0;
    }
  },

  /**
   * Vérifie si le contenu est approprié pour un niveau d'études
   */
  async isAppropriateForLevel(content: any, studentLevel: StudentLevel): Promise<boolean> {
    const vocabularyCheck = await quizValidationUtils.validateVocabularyForLevel(content, studentLevel);
    return vocabularyCheck.isAppropriate && vocabularyCheck.levelMatch;
  },

  /**
   * Obtient les problèmes critiques uniquement
   */
  async getCriticalIssues(content: any): Promise<string[]> {
    const report = await quizValidationUtils.validateForGeneration(content);
    return report.issues.critical;
  }
};