/**
 * Service de validation côté serveur pour les paramètres de génération de quiz IA
 * Implémente la tâche 8: Validation côté serveur de tous les paramètres
 */

import type { Payload } from 'payload'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  sanitizedConfig?: any
}

export interface ValidationError {
  field: string
  message: string
  code: string
  severity: 'critical' | 'major' | 'minor'
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion: string
}

export interface GenerationConfig {
  subject: string
  categoryId: string
  categoryName?: string
  courseId?: string
  courseName?: string
  studentLevel: 'PASS' | 'LAS' | 'both'
  questionCount: number
  difficulty?: 'easy' | 'medium' | 'hard'
  includeExplanations: boolean
  customInstructions?: string
  medicalDomain?: string
  userId: string
  published?: boolean
}

/**
 * Service de validation robuste pour les paramètres de génération IA
 */
export class AIQuizValidationService {
  constructor(private payload: Payload) {}

  /**
   * Valide complètement une configuration de génération
   */
  async validateGenerationConfig(config: Partial<GenerationConfig>): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const sanitizedConfig = { ...config }

    // Validation des champs obligatoires
    await this.validateRequiredFields(config, errors)
    
    // Validation du sujet
    this.validateSubject(config.subject, errors, warnings)
    
    // Validation de la catégorie
    await this.validateCategory(config.categoryId, errors, warnings)
    
    // Validation du niveau étudiant
    this.validateStudentLevel(config.studentLevel, errors, warnings)
    
    // Validation du nombre de questions
    this.validateQuestionCount(config.questionCount, errors, warnings)
    
    // Validation de la difficulté
    this.validateDifficulty(config.difficulty, errors, warnings)
    
    // Validation des instructions personnalisées
    this.validateCustomInstructions(config.customInstructions, errors, warnings)
    
    // Validation du domaine médical
    this.validateMedicalDomain(config.medicalDomain, errors, warnings)
    
    // Validation de l'utilisateur
    await this.validateUser(config.userId, errors, warnings)
    
    // Sanitisation des données
    this.sanitizeConfig(sanitizedConfig, warnings)

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'major').length === 0,
      errors,
      warnings,
      sanitizedConfig
    }
  }

  /**
   * Valide les champs obligatoires
   */
  private async validateRequiredFields(
    config: Partial<GenerationConfig>,
    errors: ValidationError[]
  ): Promise<void> {
    const requiredFields: Array<{ field: keyof GenerationConfig; message: string }> = [
      { field: 'subject', message: 'Le sujet est obligatoire' },
      { field: 'categoryId', message: 'Une catégorie doit être sélectionnée' },
      { field: 'studentLevel', message: 'Le niveau étudiant est obligatoire' },
      { field: 'questionCount', message: 'Le nombre de questions est obligatoire' },
      { field: 'includeExplanations', message: 'Le paramètre d\'explications est obligatoire' },
      { field: 'userId', message: 'L\'identifiant utilisateur est obligatoire' }
    ]

    for (const { field, message } of requiredFields) {
      if (config[field] === undefined || config[field] === null || config[field] === '') {
        errors.push({
          field,
          message,
          code: 'REQUIRED_FIELD_MISSING',
          severity: 'critical'
        })
      }
    }
  }

  /**
   * Valide le sujet
   */
  private validateSubject(
    subject: string | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!subject) return

    // Longueur minimale
    if (subject.trim().length < 10) {
      errors.push({
        field: 'subject',
        message: 'Le sujet doit contenir au moins 10 caractères',
        code: 'SUBJECT_TOO_SHORT',
        severity: 'major'
      })
    }

    // Longueur maximale
    if (subject.length > 200) {
      errors.push({
        field: 'subject',
        message: 'Le sujet ne peut pas dépasser 200 caractères',
        code: 'SUBJECT_TOO_LONG',
        severity: 'major'
      })
    }

    // Contenu médical
    const medicalTerms = [
      'anatomie', 'physiologie', 'pathologie', 'médecine', 'santé',
      'maladie', 'diagnostic', 'traitement', 'symptôme', 'syndrome',
      'cardiologie', 'neurologie', 'pneumologie', 'gastroentérologie'
    ]

    const hasMedicalContent = medicalTerms.some(term => 
      subject.toLowerCase().includes(term)
    )

    if (!hasMedicalContent) {
      warnings.push({
        field: 'subject',
        message: 'Le sujet ne semble pas contenir de termes médicaux spécifiques',
        suggestion: 'Ajoutez des termes médicaux pour améliorer la pertinence des questions générées'
      })
    }

    // Caractères spéciaux dangereux
    const dangerousChars = /<script|javascript:|data:|vbscript:/i
    if (dangerousChars.test(subject)) {
      errors.push({
        field: 'subject',
        message: 'Le sujet contient des caractères potentiellement dangereux',
        code: 'SUBJECT_UNSAFE_CONTENT',
        severity: 'critical'
      })
    }

    // Contenu inapproprié
    const inappropriateTerms = [
      'violence', 'drogue', 'suicide', 'mort', 'tuer', 'blesser'
    ]

    const hasInappropriateContent = inappropriateTerms.some(term =>
      subject.toLowerCase().includes(term)
    )

    if (hasInappropriateContent) {
      warnings.push({
        field: 'subject',
        message: 'Le sujet pourrait contenir du contenu sensible',
        suggestion: 'Reformulez le sujet de manière plus neutre et pédagogique'
      })
    }
  }

  /**
   * Valide la catégorie
   */
  private async validateCategory(
    categoryId: string | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    if (!categoryId) return

    try {
      // Vérifier que la catégorie existe
      const category = await this.payload.findByID({
        collection: 'categories',
        id: categoryId
      })

      if (!category) {
        errors.push({
          field: 'categoryId',
          message: 'La catégorie sélectionnée n\'existe pas',
          code: 'CATEGORY_NOT_FOUND',
          severity: 'critical'
        })
        return
      }

      // Vérifier que la catégorie est active
      if ((category as any).status === 'inactive') {
        warnings.push({
          field: 'categoryId',
          message: 'La catégorie sélectionnée est inactive',
          suggestion: 'Choisissez une catégorie active pour une meilleure visibilité'
        })
      }

      // Vérifier s'il y a déjà des questions dans cette catégorie
      const existingQuestions = await this.payload.find({
        collection: 'questions',
        where: { category: { equals: categoryId } },
        limit: 1
      })

      if (existingQuestions.totalDocs === 0) {
        warnings.push({
          field: 'categoryId',
          message: 'Cette catégorie ne contient pas encore de questions',
          suggestion: 'Les premières questions générées aideront à établir le style de cette catégorie'
        })
      }

    } catch (error) {
      errors.push({
        field: 'categoryId',
        message: 'Erreur lors de la validation de la catégorie',
        code: 'CATEGORY_VALIDATION_ERROR',
        severity: 'major'
      })
    }
  }

  /**
   * Valide le niveau étudiant
   */
  private validateStudentLevel(
    studentLevel: string | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!studentLevel) return

    const validLevels = ['PASS', 'LAS', 'both']
    
    if (!validLevels.includes(studentLevel)) {
      errors.push({
        field: 'studentLevel',
        message: 'Le niveau étudiant doit être PASS, LAS ou both',
        code: 'INVALID_STUDENT_LEVEL',
        severity: 'critical'
      })
    }

    // Avertissement pour le niveau "both"
    if (studentLevel === 'both') {
      warnings.push({
        field: 'studentLevel',
        message: 'Le niveau "both" peut générer des questions de difficulté variable',
        suggestion: 'Spécifiez PASS ou LAS pour des questions plus ciblées'
      })
    }
  }

  /**
   * Valide le nombre de questions
   */
  private validateQuestionCount(
    questionCount: number | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (questionCount === undefined) return

    // Type et valeur numérique
    if (!Number.isInteger(questionCount) || questionCount <= 0) {
      errors.push({
        field: 'questionCount',
        message: 'Le nombre de questions doit être un entier positif',
        code: 'INVALID_QUESTION_COUNT_TYPE',
        severity: 'critical'
      })
      return
    }

    // Limites
    if (questionCount < 5) {
      errors.push({
        field: 'questionCount',
        message: 'Le nombre minimum de questions est 5',
        code: 'QUESTION_COUNT_TOO_LOW',
        severity: 'major'
      })
    }

    if (questionCount > 20) {
      errors.push({
        field: 'questionCount',
        message: 'Le nombre maximum de questions est 20',
        code: 'QUESTION_COUNT_TOO_HIGH',
        severity: 'major'
      })
    }

    // Avertissements pour l'optimisation
    if (questionCount > 15) {
      warnings.push({
        field: 'questionCount',
        message: 'Un grand nombre de questions peut augmenter le temps de génération',
        suggestion: 'Considérez diviser en plusieurs quiz plus courts pour une meilleure expérience'
      })
    }

    if (questionCount < 8) {
      warnings.push({
        field: 'questionCount',
        message: 'Un petit nombre de questions peut limiter l\'évaluation',
        suggestion: 'Augmentez à 8-12 questions pour une évaluation plus complète'
      })
    }
  }

  /**
   * Valide la difficulté
   */
  private validateDifficulty(
    difficulty: string | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!difficulty) return

    const validDifficulties = ['easy', 'medium', 'hard']
    
    if (!validDifficulties.includes(difficulty)) {
      errors.push({
        field: 'difficulty',
        message: 'La difficulté doit être easy, medium ou hard',
        code: 'INVALID_DIFFICULTY',
        severity: 'major'
      })
    }
  }

  /**
   * Valide les instructions personnalisées
   */
  private validateCustomInstructions(
    customInstructions: string | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!customInstructions) return

    // Longueur maximale
    if (customInstructions.length > 500) {
      errors.push({
        field: 'customInstructions',
        message: 'Les instructions personnalisées ne peuvent pas dépasser 500 caractères',
        code: 'CUSTOM_INSTRUCTIONS_TOO_LONG',
        severity: 'major'
      })
    }

    // Contenu dangereux
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /ignore.*previous.*instructions/i,
      /system.*prompt/i
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(customInstructions)) {
        errors.push({
          field: 'customInstructions',
          message: 'Les instructions contiennent du contenu potentiellement dangereux',
          code: 'CUSTOM_INSTRUCTIONS_UNSAFE',
          severity: 'critical'
        })
        break
      }
    }

    // Instructions contradictoires
    const contradictoryTerms = [
      'ignore', 'oublie', 'ne pas', 'contraire', 'opposé'
    ]

    const hasContradictory = contradictoryTerms.some(term =>
      customInstructions.toLowerCase().includes(term)
    )

    if (hasContradictory) {
      warnings.push({
        field: 'customInstructions',
        message: 'Les instructions semblent contenir des directives contradictoires',
        suggestion: 'Formulez des instructions positives et claires'
      })
    }
  }

  /**
   * Valide le domaine médical
   */
  private validateMedicalDomain(
    medicalDomain: string | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!medicalDomain) return

    const validDomains = [
      'anatomie', 'physiologie', 'pathologie', 'pharmacologie',
      'cardiologie', 'neurologie', 'pneumologie', 'gastroentérologie',
      'endocrinologie', 'immunologie', 'biochimie', 'histologie',
      'embryologie', 'médecine générale'
    ]

    const isValidDomain = validDomains.some(domain =>
      medicalDomain.toLowerCase().includes(domain)
    )

    if (!isValidDomain) {
      warnings.push({
        field: 'medicalDomain',
        message: 'Le domaine médical spécifié n\'est pas reconnu',
        suggestion: `Utilisez un des domaines standards: ${validDomains.slice(0, 5).join(', ')}, etc.`
      })
    }
  }

  /**
   * Valide l'utilisateur
   */
  private async validateUser(
    userId: string | undefined,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    if (!userId) return

    try {
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId
      })

      if (!user) {
        errors.push({
          field: 'userId',
          message: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND',
          severity: 'critical'
        })
        return
      }

      // Vérifier les permissions (seuls admin et superadmin peuvent générer des quiz)
      const userRole = (user as any).role
      if (!userRole || !['admin', 'superadmin'].includes(userRole)) {
        errors.push({
          field: 'userId',
          message: 'L\'utilisateur n\'a pas les permissions pour générer des quiz',
          code: 'INSUFFICIENT_PERMISSIONS',
          severity: 'critical'
        })
      }

      // Vérifier si l'utilisateur est actif
      if ((user as any).status === 'inactive') {
        errors.push({
          field: 'userId',
          message: 'Le compte utilisateur est inactif',
          code: 'USER_INACTIVE',
          severity: 'critical'
        })
      }

    } catch (error) {
      errors.push({
        field: 'userId',
        message: 'Erreur lors de la validation de l\'utilisateur',
        code: 'USER_VALIDATION_ERROR',
        severity: 'major'
      })
    }
  }

  /**
   * Sanitise la configuration
   */
  private sanitizeConfig(
    config: any,
    warnings: ValidationWarning[]
  ): void {
    // Nettoyer le sujet
    if (config.subject) {
      const originalSubject = config.subject
      config.subject = config.subject
        .trim()
        .replace(/\s+/g, ' ') // Normaliser les espaces
        .replace(/[<>]/g, '') // Supprimer les caractères dangereux
      
      if (config.subject !== originalSubject) {
        warnings.push({
          field: 'subject',
          message: 'Le sujet a été automatiquement nettoyé',
          suggestion: 'Vérifiez que le sujet nettoyé correspond à vos attentes'
        })
      }
    }

    // Nettoyer les instructions personnalisées
    if (config.customInstructions) {
      const original = config.customInstructions
      config.customInstructions = config.customInstructions
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[<>]/g, '')
      
      if (config.customInstructions !== original) {
        warnings.push({
          field: 'customInstructions',
          message: 'Les instructions ont été automatiquement nettoyées',
          suggestion: 'Vérifiez que les instructions nettoyées sont correctes'
        })
      }
    }

    // Normaliser le domaine médical
    if (config.medicalDomain) {
      config.medicalDomain = config.medicalDomain.toLowerCase().trim()
    }

    // Assurer les valeurs par défaut
    if (config.difficulty === undefined) {
      config.difficulty = 'medium'
      warnings.push({
        field: 'difficulty',
        message: 'Difficulté définie automatiquement à "medium"',
        suggestion: 'Spécifiez explicitement la difficulté souhaitée'
      })
    }

    if (config.includeExplanations === undefined) {
      config.includeExplanations = true
      warnings.push({
        field: 'includeExplanations',
        message: 'Explications activées par défaut',
        suggestion: 'Spécifiez explicitement si vous voulez des explications'
      })
    }
  }

  /**
   * Valide les paramètres de retry
   */
  validateRetryParameters(
    attempt: number,
    maxAttempts: number = 3
  ): { canRetry: boolean; reason?: string } {
    if (attempt >= maxAttempts) {
      return {
        canRetry: false,
        reason: `Nombre maximum de tentatives atteint (${maxAttempts})`
      }
    }

    if (attempt < 0) {
      return {
        canRetry: false,
        reason: 'Numéro de tentative invalide'
      }
    }

    return { canRetry: true }
  }

  /**
   * Valide la cohérence entre les paramètres
   */
  validateParameterConsistency(config: Partial<GenerationConfig>): ValidationError[] {
    const errors: ValidationError[] = []

    // Cohérence difficulté/niveau
    if (config.difficulty === 'hard' && config.studentLevel === 'PASS') {
      errors.push({
        field: 'difficulty',
        message: 'La difficulté "hard" peut être trop élevée pour le niveau PASS',
        code: 'DIFFICULTY_LEVEL_MISMATCH',
        severity: 'minor'
      })
    }

    // Cohérence nombre de questions/difficulté
    if (config.questionCount && config.questionCount > 15 && config.difficulty === 'hard') {
      errors.push({
        field: 'questionCount',
        message: 'Un grand nombre de questions difficiles peut être trop exigeant',
        code: 'QUANTITY_DIFFICULTY_MISMATCH',
        severity: 'minor'
      })
    }

    return errors
  }

  /**
   * Génère un rapport de validation détaillé
   */
  generateValidationReport(result: ValidationResult): string {
    const lines: string[] = []
    
    lines.push('=== RAPPORT DE VALIDATION ===')
    lines.push(`Statut: ${result.isValid ? '✅ VALIDE' : '❌ INVALIDE'}`)
    lines.push('')

    if (result.errors.length > 0) {
      lines.push('ERREURS:')
      result.errors.forEach(error => {
        const severity = error.severity === 'critical' ? '🔴' : 
                        error.severity === 'major' ? '🟠' : '🟡'
        lines.push(`  ${severity} ${error.field}: ${error.message} (${error.code})`)
      })
      lines.push('')
    }

    if (result.warnings.length > 0) {
      lines.push('AVERTISSEMENTS:')
      result.warnings.forEach(warning => {
        lines.push(`  ⚠️ ${warning.field}: ${warning.message}`)
        lines.push(`     💡 ${warning.suggestion}`)
      })
      lines.push('')
    }

    if (result.isValid) {
      lines.push('✅ Configuration prête pour la génération')
    } else {
      lines.push('❌ Corrigez les erreurs avant de continuer')
    }

    return lines.join('\n')
  }
}