/**
 * Service de validation amélioré pour les quiz générés par l'IA
 * Intègre les schémas JSON, validation par niveau, et détection de contenu inapproprié
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  AI_QUIZ_JSON_SCHEMA,
  LEVEL_SPECIFIC_VALIDATION_RULES,
  INAPPROPRIATE_CONTENT_PATTERNS,
  MEDICAL_VOCABULARY_REFERENCE,
  QUALITY_THRESHOLDS,
  type StudentLevel,
  type ValidationCategory,
  type ContentPattern
} from '../schemas/aiQuizValidationSchema';

export interface EnhancedValidationResult {
  isValid: boolean;
  score: number;
  categoryScores: Record<ValidationCategory, number>;
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  recommendations: ValidationRecommendation[];
  metadata: ValidationMetadata;
}

export interface ValidationIssue {
  type: ValidationCategory;
  severity: 'critical' | 'major' | 'minor';
  field?: string;
  message: string;
  suggestion?: string;
  pattern?: string;
}

export interface ValidationWarning {
  type: 'quality' | 'style' | 'optimization' | 'level-specific';
  message: string;
  suggestion?: string;
  field?: string;
}

export interface ValidationRecommendation {
  category: ValidationCategory;
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
}

export interface ValidationMetadata {
  validatedAt: string;
  studentLevel?: StudentLevel;
  medicalTerminologyRatio: number;
  averageQuestionLength: number;
  averageExplanationLength: number;
  difficultyDistribution: Record<string, number>;
  processingTimeMs: number;
}

export class EnhancedContentValidatorService {
  private ajv: Ajv;
  private readonly MIN_QUESTION_LENGTH = 20;
  private readonly MAX_QUESTION_LENGTH = 500;
  private readonly MIN_EXPLANATION_LENGTH = 50;
  private readonly MAX_EXPLANATION_LENGTH = 1000;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
  }

  /**
   * Validation complète d'un quiz généré par l'IA avec niveau d'études
   */
  async validateAIGeneratedQuiz(
    content: any,
    studentLevel?: StudentLevel,
    additionalRules?: any
  ): Promise<EnhancedValidationResult> {
    const startTime = Date.now();
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: ValidationRecommendation[] = [];
    
    let categoryScores: Record<ValidationCategory, number> = {
      structure: 100,
      content: 100,
      medical: 100,
      pedagogical: 100
    };

    // 1. Validation de la structure JSON
    const structureValidation = this.validateJSONStructure(content);
    issues.push(...structureValidation.issues);
    warnings.push(...structureValidation.warnings);
    categoryScores.structure = Math.max(0, categoryScores.structure - structureValidation.penalty);

    if (!structureValidation.isValid) {
      return this.buildFailedResult(issues, warnings, recommendations, categoryScores, startTime);
    }

    // 2. Validation du contenu métier
    const contentValidation = this.validateBusinessContent(content);
    issues.push(...contentValidation.issues);
    warnings.push(...contentValidation.warnings);
    categoryScores.content = Math.max(0, categoryScores.content - contentValidation.penalty);

    // 3. Validation médicale spécialisée
    const medicalValidation = this.validateMedicalContent(content, studentLevel);
    issues.push(...medicalValidation.issues);
    warnings.push(...medicalValidation.warnings);
    recommendations.push(...medicalValidation.recommendations);
    categoryScores.medical = Math.max(0, categoryScores.medical - medicalValidation.penalty);

    // 4. Validation pédagogique par niveau
    if (studentLevel) {
      const pedagogicalValidation = this.validateLevelSpecificContent(content, studentLevel);
      issues.push(...pedagogicalValidation.issues);
      warnings.push(...pedagogicalValidation.warnings);
      recommendations.push(...pedagogicalValidation.recommendations);
      categoryScores.pedagogical = Math.max(0, categoryScores.pedagogical - pedagogicalValidation.penalty);
    }

    // 5. Détection de contenu inapproprié
    const inappropriateContentValidation = this.detectInappropriateContent(content);
    issues.push(...inappropriateContentValidation.issues);
    warnings.push(...inappropriateContentValidation.warnings);
    
    // Pénalité sévère pour contenu inapproprié
    if (inappropriateContentValidation.issues.length > 0) {
      categoryScores.medical = Math.max(0, categoryScores.medical - 50);
      categoryScores.content = Math.max(0, categoryScores.content - 30);
    }

    // Calcul du score global
    const globalScore = Math.round(
      (categoryScores.structure * 0.3 + 
       categoryScores.content * 0.25 + 
       categoryScores.medical * 0.25 + 
       categoryScores.pedagogical * 0.2)
    );

    // Détermination de la validité
    const isValid = this.determineValidity(issues, categoryScores, globalScore);

    // Génération des métadonnées
    const metadata = this.generateValidationMetadata(content, studentLevel, startTime);

    return {
      isValid,
      score: globalScore,
      categoryScores,
      issues,
      warnings,
      recommendations,
      metadata
    };
  }

  /**
   * Validation de la structure JSON avec schéma
   */
  private validateJSONStructure(content: any): {
    isValid: boolean;
    issues: ValidationIssue[];
    warnings: ValidationWarning[];
    penalty: number;
  } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    let penalty = 0;

    // Validation avec AJV
    const validate = this.ajv.compile(AI_QUIZ_JSON_SCHEMA);
    const isValid = validate(content);

    if (!isValid && validate.errors) {
      validate.errors.forEach(error => {
        const severity = this.determineSeverityFromAJVError(error);
        const penaltyAmount = severity === 'critical' ? 30 : severity === 'major' ? 15 : 5;
        penalty += penaltyAmount;

        issues.push({
          type: 'structure',
          severity,
          field: error.instancePath || error.schemaPath,
          message: `Erreur de structure: ${error.message}`,
          suggestion: this.generateSuggestionFromAJVError(error)
        });
      });
    }

    // Validations supplémentaires de structure
    if (content && content.questions && Array.isArray(content.questions)) {
      content.questions.forEach((question: any, index: number) => {
        if (question.options && Array.isArray(question.options)) {
          const correctCount = question.options.filter((opt: any) => opt.isCorrect === true).length;
          
          if (correctCount !== 1) {
            issues.push({
              type: 'structure',
              severity: 'critical',
              field: `questions[${index}].options`,
              message: `Question ${index + 1}: Il doit y avoir exactement une bonne réponse (trouvé: ${correctCount})`,
              suggestion: 'Marquer exactement une option comme correcte (isCorrect: true)'
            });
            penalty += 25;
          }
        }
      });
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      warnings,
      penalty
    };
  }

  /**
   * Validation du contenu métier (logique, cohérence)
   */
  private validateBusinessContent(content: any): {
    issues: ValidationIssue[];
    warnings: ValidationWarning[];
    penalty: number;
  } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    let penalty = 0;

    if (!content.questions || !Array.isArray(content.questions)) {
      return { issues, warnings, penalty };
    }

    content.questions.forEach((question: any, index: number) => {
      // Validation de la cohérence question-explication
      if (question.questionText && question.explanation) {
        const coherenceScore = this.calculateCoherenceScore(question.questionText, question.explanation);
        if (coherenceScore < 0.3) {
          warnings.push({
            type: 'quality',
            field: `questions[${index}]`,
            message: `Question ${index + 1}: L'explication semble peu cohérente avec la question`,
            suggestion: 'Vérifier que l\'explication répond directement à la question posée'
          });
        }
      }

      // Validation de la qualité des options
      if (question.options && Array.isArray(question.options)) {
        const optionTexts = question.options.map((opt: any) => opt.text?.toLowerCase().trim()).filter(Boolean);
        const uniqueOptions = new Set(optionTexts);
        
        if (uniqueOptions.size !== optionTexts.length) {
          issues.push({
            type: 'content',
            severity: 'major',
            field: `questions[${index}].options`,
            message: `Question ${index + 1}: Options dupliquées détectées`,
            suggestion: 'Chaque option doit être unique et distincte'
          });
          penalty += 15;
        }

        // Vérification de la longueur des options
        question.options.forEach((option: any, optIndex: number) => {
          if (option.text && option.text.length > 0) {
            const length = option.text.length;
            if (length < 5) {
              warnings.push({
                type: 'quality',
                field: `questions[${index}].options[${optIndex}]`,
                message: `Option très courte dans la question ${index + 1}`,
                suggestion: 'Développer le texte de l\'option pour plus de clarté'
              });
            } else if (length > 200) {
              warnings.push({
                type: 'style',
                field: `questions[${index}].options[${optIndex}]`,
                message: `Option très longue dans la question ${index + 1}`,
                suggestion: 'Raccourcir l\'option pour améliorer la lisibilité'
              });
            }
          }
        });
      }
    });

    return { issues, warnings, penalty };
  }

  /**
   * Validation médicale spécialisée
   */
  private validateMedicalContent(content: any, studentLevel?: StudentLevel): {
    issues: ValidationIssue[];
    warnings: ValidationWarning[];
    recommendations: ValidationRecommendation[];
    penalty: number;
  } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: ValidationRecommendation[] = [];
    let penalty = 0;

    if (!content.questions || !Array.isArray(content.questions)) {
      return { issues, warnings, recommendations, penalty };
    }

    let questionsWithMedicalTerms = 0;
    const allText = content.questions.map((q: any) => 
      `${q.questionText || ''} ${q.explanation || ''} ${q.options?.map((o: any) => o.text || '').join(' ') || ''}`
    ).join(' ').toLowerCase();

    // Calcul du ratio de terminologie médicale
    const medicalTermsFound = Object.values(MEDICAL_VOCABULARY_REFERENCE)
      .flat()
      .filter(term => allText.includes(term.toLowerCase()));

    const medicalTerminologyRatio = medicalTermsFound.length / Object.values(MEDICAL_VOCABULARY_REFERENCE).flat().length;

    if (medicalTerminologyRatio < QUALITY_THRESHOLDS.minimumMedicalTerminologyRatio) {
      warnings.push({
        type: 'quality',
        message: `Faible densité de terminologie médicale (${Math.round(medicalTerminologyRatio * 100)}%)`,
        suggestion: 'Augmenter l\'utilisation de termes médicaux spécialisés appropriés au niveau d\'études'
      });

      recommendations.push({
        category: 'medical',
        priority: 'medium',
        action: 'Enrichir le vocabulaire médical',
        rationale: 'Un quiz médical doit utiliser une terminologie spécialisée appropriée'
      });
    }

    // Validation par question
    content.questions.forEach((question: any, index: number) => {
      if (!question.questionText) return;

      const questionText = question.questionText.toLowerCase();
      const explanation = (question.explanation || '').toLowerCase();
      const fullQuestionText = `${questionText} ${explanation}`;

      // Vérification de la terminologie médicale par question
      const hasRelevantMedicalTerms = Object.values(MEDICAL_VOCABULARY_REFERENCE)
        .flat()
        .some(term => fullQuestionText.includes(term.toLowerCase()));

      if (hasRelevantMedicalTerms) {
        questionsWithMedicalTerms++;
      } else {
        warnings.push({
          type: 'quality',
          field: `questions[${index}]`,
          message: `Question ${index + 1}: Manque de terminologie médicale spécifique`,
          suggestion: 'Utiliser un vocabulaire médical plus précis et spécialisé'
        });
      }

      // Validation de la précision scientifique
      if (this.containsVagueTerms(fullQuestionText)) {
        warnings.push({
          type: 'quality',
          field: `questions[${index}]`,
          message: `Question ${index + 1}: Utilisation de termes vagues ou imprécis`,
          suggestion: 'Utiliser une terminologie médicale précise et scientifique'
        });
      }
    });

    // Évaluation globale du contenu médical
    const medicalQualityRatio = questionsWithMedicalTerms / content.questions.length;
    if (medicalQualityRatio < 0.7) {
      recommendations.push({
        category: 'medical',
        priority: 'high',
        action: 'Améliorer la qualité médicale globale',
        rationale: `Seulement ${Math.round(medicalQualityRatio * 100)}% des questions utilisent une terminologie médicale appropriée`
      });
    }

    return { issues, warnings, recommendations, penalty };
  }

  /**
   * Validation spécifique par niveau d'études (PASS/LAS)
   */
  private validateLevelSpecificContent(content: any, studentLevel: StudentLevel): {
    issues: ValidationIssue[];
    warnings: ValidationWarning[];
    recommendations: ValidationRecommendation[];
    penalty: number;
  } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: ValidationRecommendation[] = [];
    let penalty = 0;

    const levelRules = LEVEL_SPECIFIC_VALIDATION_RULES[studentLevel];
    if (!levelRules || !content.questions) {
      return { issues, warnings, recommendations, penalty };
    }

    const allText = content.questions.map((q: any) => 
      `${q.questionText || ''} ${q.explanation || ''} ${q.options?.map((o: any) => o.text || '').join(' ') || ''}`
    ).join(' ').toLowerCase();

    // Vérification des termes requis
    const requiredTermsFound = levelRules.requiredTerms.filter(term => 
      allText.includes(term.toLowerCase())
    );

    if (requiredTermsFound.length < levelRules.requiredTerms.length * 0.3) {
      warnings.push({
        type: 'level-specific',
        message: `Peu de termes spécifiques au niveau ${studentLevel} détectés`,
        suggestion: `Inclure davantage de concepts fondamentaux pour le niveau ${levelRules.name}`
      });

      recommendations.push({
        category: 'pedagogical',
        priority: 'medium',
        action: `Adapter le contenu au niveau ${studentLevel}`,
        rationale: `Le contenu doit correspondre aux attentes du niveau ${levelRules.name}`
      });
    }

    // Vérification des termes interdits
    const forbiddenTermsFound = levelRules.forbiddenTerms.filter(term => 
      allText.includes(term.toLowerCase())
    );

    if (forbiddenTermsFound.length > 0) {
      forbiddenTermsFound.forEach(term => {
        issues.push({
          type: 'pedagogical',
          severity: 'major',
          message: `Contenu trop avancé pour le niveau ${studentLevel}: "${term}"`,
          suggestion: `Remplacer par des concepts plus appropriés au niveau ${levelRules.name}`
        });
        penalty += 20;
      });
    }

    // Validation de la longueur des questions selon le niveau
    content.questions.forEach((question: any, index: number) => {
      if (question.questionText) {
        const length = question.questionText.length;
        const { min, max } = levelRules.recommendedQuestionLength;
        
        if (length < min) {
          warnings.push({
            type: 'level-specific',
            field: `questions[${index}].questionText`,
            message: `Question ${index + 1}: Trop courte pour le niveau ${studentLevel}`,
            suggestion: `Développer la question (minimum ${min} caractères recommandés)`
          });
        } else if (length > max) {
          warnings.push({
            type: 'level-specific',
            field: `questions[${index}].questionText`,
            message: `Question ${index + 1}: Trop complexe pour le niveau ${studentLevel}`,
            suggestion: `Simplifier la question (maximum ${max} caractères recommandés)`
          });
        }
      }

      // Validation de la difficulté
      if (question.difficulty) {
        const maxDifficulty = levelRules.maxDifficultyLevel;
        const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
        const questionDifficultyLevel = difficultyOrder[question.difficulty as keyof typeof difficultyOrder] || 2;
        const maxDifficultyLevel = difficultyOrder[maxDifficulty as keyof typeof difficultyOrder] || 2;

        if (questionDifficultyLevel > maxDifficultyLevel) {
          issues.push({
            type: 'pedagogical',
            severity: 'minor',
            field: `questions[${index}].difficulty`,
            message: `Question ${index + 1}: Difficulté trop élevée pour le niveau ${studentLevel}`,
            suggestion: `Ajuster la difficulté (maximum "${maxDifficulty}" pour ${levelRules.name})`
          });
          penalty += 10;
        }
      }
    });

    return { issues, warnings, recommendations, penalty };
  }

  /**
   * Détection de contenu inapproprié ou dangereux
   */
  private detectInappropriateContent(content: any): {
    issues: ValidationIssue[];
    warnings: ValidationWarning[];
  } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];

    if (!content.questions || !Array.isArray(content.questions)) {
      return { issues, warnings };
    }

    content.questions.forEach((question: any, index: number) => {
      const fullText = `${question.questionText || ''} ${question.explanation || ''} ${
        question.options?.map((o: any) => o.text || '').join(' ') || ''
      }`.toLowerCase();

      // Vérification de chaque catégorie de contenu inapproprié
      Object.entries(INAPPROPRIATE_CONTENT_PATTERNS).forEach(([category, patterns]) => {
        patterns.forEach(pattern => {
          if (pattern.test(fullText)) {
            const severity = this.getSeverityForInappropriateContent(category as ContentPattern);
            
            issues.push({
              type: 'medical',
              severity,
              field: `questions[${index}]`,
              message: `Question ${index + 1}: Contenu inapproprié détecté (${category})`,
              suggestion: this.getSuggestionForInappropriateContent(category as ContentPattern),
              pattern: pattern.source
            });
          }
        });
      });
    });

    return { issues, warnings };
  }

  /**
   * Méthodes utilitaires
   */
  private determineSeverityFromAJVError(error: any): 'critical' | 'major' | 'minor' {
    if (error.keyword === 'required' || error.keyword === 'type') {
      return 'critical';
    }
    if (error.keyword === 'minLength' || error.keyword === 'maxLength' || error.keyword === 'enum') {
      return 'major';
    }
    return 'minor';
  }

  private generateSuggestionFromAJVError(error: any): string {
    switch (error.keyword) {
      case 'required':
        return `Le champ "${error.params?.missingProperty}" est requis`;
      case 'type':
        return `Le champ doit être de type "${error.schema}"`;
      case 'minLength':
        return `Minimum ${error.schema} caractères requis`;
      case 'maxLength':
        return `Maximum ${error.schema} caractères autorisés`;
      case 'enum':
        return `Valeur autorisée: ${error.schema.join(', ')}`;
      default:
        return 'Vérifier la structure et les valeurs';
    }
  }

  private calculateCoherenceScore(question: string, explanation: string): number {
    // Algorithme simple de cohérence basé sur les mots communs
    const questionWords = new Set(question.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const explanationWords = new Set(explanation.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    
    const commonWords = new Set([...questionWords].filter(w => explanationWords.has(w)));
    return commonWords.size / Math.max(questionWords.size, explanationWords.size);
  }

  private containsVagueTerms(text: string): boolean {
    const vagueTerms = [
      'quelque chose', 'certains', 'parfois', 'souvent', 'généralement',
      'probablement', 'peut-être', 'assez', 'plutôt', 'relativement'
    ];
    return vagueTerms.some(term => text.includes(term));
  }

  private getSeverityForInappropriateContent(category: ContentPattern): 'critical' | 'major' | 'minor' {
    switch (category) {
      case 'medicalAdvice':
      case 'discriminatory':
        return 'critical';
      case 'pseudoscience':
      case 'alarmist':
        return 'major';
      case 'inappropriate':
        return 'minor';
      default:
        return 'minor';
    }
  }

  private getSuggestionForInappropriateContent(category: ContentPattern): string {
    switch (category) {
      case 'medicalAdvice':
        return 'Éviter les conseils médicaux directs. Présenter les informations de manière éducative uniquement.';
      case 'discriminatory':
        return 'Supprimer tout contenu discriminatoire. Utiliser un langage inclusif et respectueux.';
      case 'pseudoscience':
        return 'S\'appuyer uniquement sur des sources scientifiques validées et des consensus médicaux.';
      case 'alarmist':
        return 'Adopter un ton informatif et équilibré. Éviter le sensationnalisme.';
      case 'inappropriate':
        return 'Adapter le contenu à un contexte éducatif professionnel.';
      default:
        return 'Réviser le contenu pour s\'assurer qu\'il est approprié et professionnel.';
    }
  }

  private determineValidity(
    issues: ValidationIssue[],
    categoryScores: Record<ValidationCategory, number>,
    globalScore: number
  ): boolean {
    const criticalErrors = issues.filter(i => i.severity === 'critical').length;
    const majorErrors = issues.filter(i => i.severity === 'major').length;

    // Conditions de validité
    return (
      criticalErrors <= QUALITY_THRESHOLDS.maxCriticalErrors &&
      majorErrors <= QUALITY_THRESHOLDS.maxMajorErrors &&
      globalScore >= QUALITY_THRESHOLDS.minimumValidationScore &&
      categoryScores.structure >= QUALITY_THRESHOLDS.categoryMinimumScores.structure &&
      categoryScores.content >= QUALITY_THRESHOLDS.categoryMinimumScores.content &&
      categoryScores.medical >= QUALITY_THRESHOLDS.categoryMinimumScores.medical &&
      categoryScores.pedagogical >= QUALITY_THRESHOLDS.categoryMinimumScores.pedagogical
    );
  }

  private generateValidationMetadata(
    content: any,
    studentLevel?: StudentLevel,
    startTime?: number
  ): ValidationMetadata {
    const questions = content.questions || [];
    const questionLengths = questions.map((q: any) => q.questionText?.length || 0);
    const explanationLengths = questions.map((q: any) => q.explanation?.length || 0);
    
    const allText = questions.map((q: any) => 
      `${q.questionText || ''} ${q.explanation || ''}`
    ).join(' ').toLowerCase();

    const medicalTermsFound = Object.values(MEDICAL_VOCABULARY_REFERENCE)
      .flat()
      .filter(term => allText.includes(term.toLowerCase()));

    const difficultyDistribution = questions.reduce((acc: Record<string, number>, q: any) => {
      const difficulty = q.difficulty || 'medium';
      acc[difficulty] = (acc[difficulty] || 0) + 1;
      return acc;
    }, {});

    return {
      validatedAt: new Date().toISOString(),
      studentLevel,
      medicalTerminologyRatio: medicalTermsFound.length / Object.values(MEDICAL_VOCABULARY_REFERENCE).flat().length,
      averageQuestionLength: questionLengths.length > 0 ? 
        Math.round(questionLengths.reduce((a: number, b: number) => a + b, 0) / questionLengths.length) : 0,
      averageExplanationLength: explanationLengths.length > 0 ? 
        Math.round(explanationLengths.reduce((a: number, b: number) => a + b, 0) / explanationLengths.length) : 0,
      difficultyDistribution,
      processingTimeMs: startTime ? Date.now() - startTime : 0
    };
  }

  private buildFailedResult(
    issues: ValidationIssue[],
    warnings: ValidationWarning[],
    recommendations: ValidationRecommendation[],
    categoryScores: Record<ValidationCategory, number>,
    startTime: number
  ): EnhancedValidationResult {
    return {
      isValid: false,
      score: 0,
      categoryScores,
      issues,
      warnings,
      recommendations,
      metadata: {
        validatedAt: new Date().toISOString(),
        medicalTerminologyRatio: 0,
        averageQuestionLength: 0,
        averageExplanationLength: 0,
        difficultyDistribution: {},
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Génère un rapport de validation détaillé
   */
  generateDetailedReport(result: EnhancedValidationResult): string {
    let report = `=== RAPPORT DE VALIDATION DÉTAILLÉ ===\n\n`;
    
    // En-tête avec scores
    report += `📊 SCORES GLOBAUX\n`;
    report += `Score global: ${result.score}/100 ${result.isValid ? '✅' : '❌'}\n`;
    report += `Structure: ${result.categoryScores.structure}/100\n`;
    report += `Contenu: ${result.categoryScores.content}/100\n`;
    report += `Médical: ${result.categoryScores.medical}/100\n`;
    report += `Pédagogique: ${result.categoryScores.pedagogical}/100\n\n`;

    // Métadonnées
    report += `📈 MÉTADONNÉES\n`;
    report += `Validé le: ${result.metadata.validatedAt}\n`;
    if (result.metadata.studentLevel) {
      report += `Niveau: ${result.metadata.studentLevel}\n`;
    }
    report += `Ratio terminologie médicale: ${Math.round(result.metadata.medicalTerminologyRatio * 100)}%\n`;
    report += `Longueur moyenne des questions: ${result.metadata.averageQuestionLength} caractères\n`;
    report += `Longueur moyenne des explications: ${result.metadata.averageExplanationLength} caractères\n`;
    report += `Temps de traitement: ${result.metadata.processingTimeMs}ms\n\n`;

    // Problèmes critiques
    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      report += `🔴 PROBLÈMES CRITIQUES (${criticalIssues.length})\n`;
      criticalIssues.forEach((issue, index) => {
        report += `${index + 1}. ${issue.message}\n`;
        if (issue.field) report += `   Champ: ${issue.field}\n`;
        if (issue.suggestion) report += `   Solution: ${issue.suggestion}\n`;
        report += '\n';
      });
    }

    // Problèmes majeurs
    const majorIssues = result.issues.filter(i => i.severity === 'major');
    if (majorIssues.length > 0) {
      report += `🟠 PROBLÈMES MAJEURS (${majorIssues.length})\n`;
      majorIssues.forEach((issue, index) => {
        report += `${index + 1}. ${issue.message}\n`;
        if (issue.field) report += `   Champ: ${issue.field}\n`;
        if (issue.suggestion) report += `   Solution: ${issue.suggestion}\n`;
        report += '\n';
      });
    }

    // Avertissements
    if (result.warnings.length > 0) {
      report += `⚠️ AVERTISSEMENTS (${result.warnings.length})\n`;
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning.message}\n`;
        if (warning.suggestion) report += `   Suggestion: ${warning.suggestion}\n`;
        report += '\n';
      });
    }

    // Recommandations
    if (result.recommendations.length > 0) {
      report += `💡 RECOMMANDATIONS (${result.recommendations.length})\n`;
      result.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '⚡' : '💭';
        report += `${index + 1}. ${priority} ${rec.action}\n`;
        report += `   Catégorie: ${rec.category}\n`;
        report += `   Justification: ${rec.rationale}\n`;
        report += '\n';
      });
    }

    if (result.isValid && result.issues.length === 0 && result.warnings.length === 0) {
      report += '🎉 EXCELLENT ! Le contenu est de très haute qualité et respecte tous les critères.\n';
    }

    return report;
  }
}