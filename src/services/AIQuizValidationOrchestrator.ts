/**
 * Service orchestrateur de validation pour les quiz générés par l'IA
 * Coordonne tous les services de validation existants pour la génération de quiz
 */

import { ContentValidatorService, type ValidationResult, type AIGeneratedQuiz } from './ContentValidatorService';
import { EnhancedContentValidatorService, type EnhancedValidationResult } from './EnhancedContentValidatorService';
import { JSONSchemaValidatorService, type JSONValidationResult } from './JSONSchemaValidatorService';
import type { StudentLevel } from '../schemas/aiQuizValidationSchema';

export interface ComprehensiveValidationResult {
  isValid: boolean;
  overallScore: number;
  validationSteps: {
    jsonStructure: JSONValidationResult;
    contentValidation: ValidationResult;
    enhancedValidation: EnhancedValidationResult;
  };
  summary: ValidationSummary;
  recommendations: string[];
  canProceedToCreation: boolean;
}

export interface ValidationSummary {
  totalIssues: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  warnings: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ValidationConfig {
  studentLevel?: StudentLevel;
  strictMode?: boolean;
  enableInappropriateContentDetection?: boolean;
  enableMedicalVocabularyValidation?: boolean;
  customRules?: any;
}

export class AIQuizValidationOrchestrator {
  private jsonValidator: JSONSchemaValidatorService;
  private contentValidator: ContentValidatorService;
  private enhancedValidator: EnhancedContentValidatorService;

  constructor() {
    this.jsonValidator = new JSONSchemaValidatorService();
    this.contentValidator = new ContentValidatorService();
    this.enhancedValidator = new EnhancedContentValidatorService();
  }

  /**
   * Validation complète d'un quiz généré par l'IA
   * Orchestre tous les services de validation existants
   */
  async validateAIGeneratedQuiz(
    content: any,
    config: ValidationConfig = {}
  ): Promise<ComprehensiveValidationResult> {
    const {
      studentLevel,
      strictMode = false,
      enableInappropriateContentDetection = true,
      enableMedicalVocabularyValidation = true,
      customRules
    } = config;

    // Étape 1: Validation de la structure JSON
    const jsonValidation = this.jsonValidator.validateQuizStructure(content);

    // Si la structure JSON est invalide, arrêter ici
    if (!jsonValidation.isValid) {
      return this.buildFailedValidationResult(jsonValidation, null, null);
    }

    // Étape 2: Validation du contenu métier de base
    const contentValidation = this.contentValidator.validateAIGeneratedQuiz(content);

    // Étape 3: Validation améliorée avec niveau d'études et détection de contenu inapproprié
    const enhancedValidation = await this.enhancedValidator.validateAIGeneratedQuiz(
      content,
      studentLevel,
      customRules
    );

    // Calcul du score global et détermination de la validité
    const overallScore = this.calculateOverallScore(
      jsonValidation,
      contentValidation,
      enhancedValidation
    );

    const isValid = this.determineOverallValidity(
      jsonValidation,
      contentValidation,
      enhancedValidation,
      strictMode
    );

    // Génération du résumé et des recommandations
    const summary = this.generateValidationSummary(
      jsonValidation,
      contentValidation,
      enhancedValidation
    );

    const recommendations = this.generateRecommendations(
      jsonValidation,
      contentValidation,
      enhancedValidation,
      config
    );

    // Détermination si on peut procéder à la création
    const canProceedToCreation = this.canProceedToQuizCreation(
      isValid,
      summary,
      strictMode
    );

    return {
      isValid,
      overallScore,
      validationSteps: {
        jsonStructure: jsonValidation,
        contentValidation,
        enhancedValidation
      },
      summary,
      recommendations,
      canProceedToCreation
    };
  }

  /**
   * Validation rapide pour vérifier si le contenu peut être traité
   */
  async quickValidation(content: any): Promise<{
    canProcess: boolean;
    criticalIssues: string[];
    estimatedQuality: 'high' | 'medium' | 'low';
  }> {
    // Validation JSON de base
    const jsonValidation = this.jsonValidator.validateBasicStructure(content);
    
    if (!jsonValidation) {
      return {
        canProcess: false,
        criticalIssues: ['Structure JSON invalide'],
        estimatedQuality: 'low'
      };
    }

    // Validation rapide du contenu
    const contentValidation = this.contentValidator.validateAIGeneratedQuiz(content);
    const criticalIssues = contentValidation.issues
      .filter(issue => issue.severity === 'critical')
      .map(issue => issue.message);

    const canProcess = criticalIssues.length === 0;
    const estimatedQuality = this.estimateQuality(contentValidation.score);

    return {
      canProcess,
      criticalIssues,
      estimatedQuality
    };
  }

  /**
   * Validation spécialisée pour le contenu médical
   */
  async validateMedicalContent(
    content: any,
    studentLevel?: StudentLevel
  ): Promise<{
    medicalQualityScore: number;
    terminologyRatio: number;
    isAppropriateForLevel: boolean;
    medicalIssues: string[];
    suggestions: string[];
  }> {
    const enhancedValidation = await this.enhancedValidator.validateAIGeneratedQuiz(
      content,
      studentLevel
    );

    const medicalIssues = enhancedValidation.issues
      .filter(issue => issue.type === 'medical')
      .map(issue => issue.message);

    const medicalSuggestions = enhancedValidation.recommendations
      .filter(rec => rec.category === 'medical')
      .map(rec => rec.action);

    return {
      medicalQualityScore: enhancedValidation.categoryScores.medical,
      terminologyRatio: enhancedValidation.metadata.medicalTerminologyRatio,
      isAppropriateForLevel: enhancedValidation.categoryScores.pedagogical >= 70,
      medicalIssues,
      suggestions: medicalSuggestions
    };
  }

  /**
   * Détection spécialisée de contenu inapproprié
   */
  async detectInappropriateContent(content: any): Promise<{
    hasInappropriateContent: boolean;
    inappropriatePatterns: string[];
    severity: 'low' | 'medium' | 'high';
    actionRequired: boolean;
  }> {
    const result = await this.contentValidator.detectInappropriateContent(content);
    
    const criticalIssues = result.issues.filter(issue => issue.severity === 'critical');
    const majorIssues = result.issues.filter(issue => issue.severity === 'major');
    
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (criticalIssues.length > 0) {
      severity = 'high';
    } else if (majorIssues.length > 0) {
      severity = 'medium';
    }

    const inappropriatePatterns = result.issues
      .filter(issue => issue.pattern)
      .map(issue => issue.pattern!);

    return {
      hasInappropriateContent: result.hasInappropriateContent,
      inappropriatePatterns,
      severity,
      actionRequired: severity === 'high' || criticalIssues.length > 0
    };
  }

  /**
   * Validation du vocabulaire médical
   */
  async validateMedicalVocabulary(
    content: any,
    studentLevel?: StudentLevel
  ): Promise<{
    vocabularyScore: number;
    isAdequate: boolean;
    missingTerms: string[];
    suggestions: string[];
    levelAppropriate: boolean;
  }> {
    const result = await this.contentValidator.validateMedicalVocabulary(content, studentLevel);
    
    const enhancedResult = await this.enhancedValidator.validateAIGeneratedQuiz(
      content,
      studentLevel
    );

    const levelAppropriate = enhancedResult.categoryScores.pedagogical >= 70;
    const vocabularyScore = Math.round(result.medicalTerminologyRatio * 100);

    return {
      vocabularyScore,
      isAdequate: result.isAdequate,
      missingTerms: [], // Could be enhanced with specific missing terms detection
      suggestions: result.suggestions,
      levelAppropriate
    };
  }

  /**
   * Génère un rapport de validation complet
   */
  generateComprehensiveReport(result: ComprehensiveValidationResult): string {
    let report = `=== RAPPORT DE VALIDATION COMPLET ===\n\n`;
    
    // En-tête avec statut global
    report += `🎯 STATUT GLOBAL\n`;
    report += `Validité: ${result.isValid ? '✅ VALIDE' : '❌ INVALIDE'}\n`;
    report += `Score global: ${result.overallScore}/100\n`;
    report += `Peut procéder à la création: ${result.canProceedToCreation ? '✅ OUI' : '❌ NON'}\n\n`;

    // Résumé des problèmes
    report += `📊 RÉSUMÉ DES PROBLÈMES\n`;
    report += `Total des problèmes: ${result.summary.totalIssues}\n`;
    report += `Critiques: ${result.summary.criticalIssues} 🔴\n`;
    report += `Majeurs: ${result.summary.majorIssues} 🟠\n`;
    report += `Mineurs: ${result.summary.minorIssues} 🟡\n`;
    report += `Avertissements: ${result.summary.warnings} ⚠️\n\n`;

    // Points forts
    if (result.summary.strengths.length > 0) {
      report += `💪 POINTS FORTS\n`;
      result.summary.strengths.forEach((strength, index) => {
        report += `${index + 1}. ${strength}\n`;
      });
      report += '\n';
    }

    // Points faibles
    if (result.summary.weaknesses.length > 0) {
      report += `⚠️ POINTS À AMÉLIORER\n`;
      result.summary.weaknesses.forEach((weakness, index) => {
        report += `${index + 1}. ${weakness}\n`;
      });
      report += '\n';
    }

    // Recommandations
    if (result.recommendations.length > 0) {
      report += `💡 RECOMMANDATIONS\n`;
      result.recommendations.forEach((recommendation, index) => {
        report += `${index + 1}. ${recommendation}\n`;
      });
      report += '\n';
    }

    // Détails par étape de validation
    report += `📋 DÉTAILS PAR ÉTAPE\n\n`;
    
    // Structure JSON
    report += `1. VALIDATION JSON\n`;
    report += `   Statut: ${result.validationSteps.jsonStructure.isValid ? '✅' : '❌'}\n`;
    report += `   Erreurs: ${result.validationSteps.jsonStructure.errors.length}\n`;
    report += `   Avertissements: ${result.validationSteps.jsonStructure.warnings.length}\n\n`;

    // Validation de contenu
    report += `2. VALIDATION DE CONTENU\n`;
    report += `   Statut: ${result.validationSteps.contentValidation.isValid ? '✅' : '❌'}\n`;
    report += `   Score: ${result.validationSteps.contentValidation.score}/100\n`;
    report += `   Problèmes: ${result.validationSteps.contentValidation.issues.length}\n\n`;

    // Validation améliorée
    report += `3. VALIDATION AMÉLIORÉE\n`;
    report += `   Statut: ${result.validationSteps.enhancedValidation.isValid ? '✅' : '❌'}\n`;
    report += `   Score: ${result.validationSteps.enhancedValidation.score}/100\n`;
    report += `   Structure: ${result.validationSteps.enhancedValidation.categoryScores.structure}/100\n`;
    report += `   Contenu: ${result.validationSteps.enhancedValidation.categoryScores.content}/100\n`;
    report += `   Médical: ${result.validationSteps.enhancedValidation.categoryScores.medical}/100\n`;
    report += `   Pédagogique: ${result.validationSteps.enhancedValidation.categoryScores.pedagogical}/100\n`;

    return report;
  }

  /**
   * Méthodes privées utilitaires
   */
  private calculateOverallScore(
    jsonValidation: JSONValidationResult,
    contentValidation: ValidationResult,
    enhancedValidation: EnhancedValidationResult
  ): number {
    // Pondération: JSON (20%), Contenu (30%), Amélioré (50%)
    const jsonScore = jsonValidation.isValid ? 100 : 0;
    const contentScore = contentValidation.score;
    const enhancedScore = enhancedValidation.score;

    return Math.round(
      jsonScore * 0.2 + 
      contentScore * 0.3 + 
      enhancedScore * 0.5
    );
  }

  private determineOverallValidity(
    jsonValidation: JSONValidationResult,
    contentValidation: ValidationResult,
    enhancedValidation: EnhancedValidationResult,
    strictMode: boolean
  ): boolean {
    // En mode strict, tous les validateurs doivent passer
    if (strictMode) {
      return jsonValidation.isValid && 
             contentValidation.isValid && 
             enhancedValidation.isValid;
    }

    // En mode normal, la structure JSON doit être valide et au moins un score > 70
    return jsonValidation.isValid && 
           (contentValidation.score >= 70 || enhancedValidation.score >= 70);
  }

  private generateValidationSummary(
    jsonValidation: JSONValidationResult,
    contentValidation: ValidationResult,
    enhancedValidation: EnhancedValidationResult
  ): ValidationSummary {
    const allIssues = [
      ...contentValidation.issues,
      ...enhancedValidation.issues
    ];

    const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    const majorIssues = allIssues.filter(i => i.severity === 'major').length;
    const minorIssues = allIssues.filter(i => i.severity === 'minor').length;
    const warnings = contentValidation.warnings.length + enhancedValidation.warnings.length;

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Identifier les points forts
    if (jsonValidation.isValid) {
      strengths.push('Structure JSON correcte');
    }
    if (enhancedValidation.categoryScores.medical >= 80) {
      strengths.push('Excellente qualité médicale');
    }
    if (enhancedValidation.categoryScores.pedagogical >= 80) {
      strengths.push('Contenu pédagogiquement adapté');
    }
    if (criticalIssues === 0) {
      strengths.push('Aucun problème critique');
    }

    // Identifier les points faibles
    if (!jsonValidation.isValid) {
      weaknesses.push('Structure JSON invalide');
    }
    if (enhancedValidation.categoryScores.medical < 60) {
      weaknesses.push('Qualité médicale insuffisante');
    }
    if (enhancedValidation.categoryScores.pedagogical < 60) {
      weaknesses.push('Adaptation pédagogique insuffisante');
    }
    if (criticalIssues > 0) {
      weaknesses.push(`${criticalIssues} problème(s) critique(s)`);
    }

    return {
      totalIssues: allIssues.length,
      criticalIssues,
      majorIssues,
      minorIssues,
      warnings,
      strengths,
      weaknesses
    };
  }

  private generateRecommendations(
    jsonValidation: JSONValidationResult,
    contentValidation: ValidationResult,
    enhancedValidation: EnhancedValidationResult,
    config: ValidationConfig
  ): string[] {
    const recommendations: string[] = [];

    // Recommandations basées sur les erreurs JSON
    if (!jsonValidation.isValid) {
      recommendations.push('Corriger la structure JSON avant de continuer');
    }

    // Recommandations basées sur le score de contenu
    if (contentValidation.score < 70) {
      recommendations.push('Améliorer la qualité générale du contenu');
    }

    // Recommandations basées sur la validation améliorée
    if (enhancedValidation.categoryScores.medical < 70) {
      recommendations.push('Enrichir le vocabulaire médical spécialisé');
    }

    if (enhancedValidation.categoryScores.pedagogical < 70 && config.studentLevel) {
      recommendations.push(`Adapter le contenu au niveau ${config.studentLevel}`);
    }

    // Recommandations spécifiques de la validation améliorée
    enhancedValidation.recommendations
      .filter(rec => rec.priority === 'high')
      .forEach(rec => recommendations.push(rec.action));

    return recommendations;
  }

  private canProceedToQuizCreation(
    isValid: boolean,
    summary: ValidationSummary,
    strictMode: boolean
  ): boolean {
    if (strictMode) {
      return isValid && summary.criticalIssues === 0;
    }

    // En mode normal, on peut procéder si pas d'erreurs critiques
    return summary.criticalIssues === 0;
  }

  private estimateQuality(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  private buildFailedValidationResult(
    jsonValidation: JSONValidationResult,
    contentValidation: ValidationResult | null,
    enhancedValidation: EnhancedValidationResult | null
  ): ComprehensiveValidationResult {
    return {
      isValid: false,
      overallScore: 0,
      validationSteps: {
        jsonStructure: jsonValidation,
        contentValidation: contentValidation || {
          isValid: false,
          score: 0,
          issues: [],
          warnings: []
        },
        enhancedValidation: enhancedValidation || {
          isValid: false,
          score: 0,
          categoryScores: {
            structure: 0,
            content: 0,
            medical: 0,
            pedagogical: 0
          },
          issues: [],
          warnings: [],
          recommendations: [],
          metadata: {
            validatedAt: new Date().toISOString(),
            medicalTerminologyRatio: 0,
            averageQuestionLength: 0,
            averageExplanationLength: 0,
            difficultyDistribution: {},
            processingTimeMs: 0
          }
        }
      },
      summary: {
        totalIssues: jsonValidation.errors.length,
        criticalIssues: jsonValidation.errors.length,
        majorIssues: 0,
        minorIssues: 0,
        warnings: jsonValidation.warnings.length,
        strengths: [],
        weaknesses: ['Structure JSON invalide']
      },
      recommendations: ['Corriger la structure JSON avant de continuer'],
      canProceedToCreation: false
    };
  }
}