interface ValidationError {
  type: 'validation' | 'database' | 'mapping' | 'reference' | 'system'
  severity: 'critical' | 'major' | 'minor' | 'warning'
  itemIndex?: number
  field?: string
  message: string
  suggestion?: string
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
  previewData?: any[]
  categoryMappings?: CategoryMapping[]
}

interface CategoryMapping {
  originalName: string
  suggestedCategory: string
  confidence: number
  action: 'map' | 'create' | 'ignore'
}

export class JSONValidationService {
  async validateJSON(content: string, importType: string, options: Record<string, unknown> = {}): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      previewData: [],
      categoryMappings: []
    }

    try {
      // 1. Validation JSON syntax
      let data
      try {
        data = JSON.parse(content)
      } catch (_e) {
        result.errors.push({
          type: 'validation',
          severity: 'critical',
          message: 'Fichier JSON malformé',
          suggestion: 'Vérifiez la syntaxe JSON avec un validateur en ligne'
        })
        result.isValid = false
        return result
      }

      // 2. Validation structure de base
      if (!data.version) {
        result.warnings.push('Champ "version" manquant, version 1.0 assumée')
      }

      if (!data.type) {
        result.errors.push({
          type: 'validation',
          severity: 'critical',
          message: 'Champ "type" requis',
          suggestion: 'Ajoutez un champ "type" avec la valeur: questions, flashcards, ou learning-paths'
        })
        result.isValid = false
      }

      // 3. Validation spécifique selon le type
      switch (importType) {
        case 'questions':
          await this.validateQuestions(data, result)
          break
        case 'flashcards':
          await this.validateFlashcards(data, result)
          break
        case 'learning-paths':
          await this.validateLearningPaths(data, result)
          break
        default:
          result.errors.push({
            type: 'validation',
            severity: 'critical',
            message: `Type d'import non supporté: ${importType}`
          })
          result.isValid = false
      }

      // 4. Détection des catégories pour mapping
      if (result.isValid) {
        result.categoryMappings = await this.detectCategoryMappings(data, importType)
      }

    } catch (error) {
      result.errors.push({
        type: 'system',
        severity: 'critical',
        message: `Erreur lors de la validation: ${error.message}`
      })
      result.isValid = false
    }

    return result
  }

  private async validateQuestions(data: Record<string, unknown>, result: ValidationResult) {
    if (!data.questions || !Array.isArray(data.questions)) {
      result.errors.push({
        type: 'validation',
        severity: 'critical',
        message: 'Champ "questions" requis et doit être un tableau'
      })
      result.isValid = false
      return
    }

    if (data.questions.length === 0) {
      result.errors.push({
        type: 'validation',
        severity: 'critical',
        message: 'Au moins une question est requise'
      })
      result.isValid = false
      return
    }

    // Validation de chaque question
    (data.questions as unknown[]).forEach((question: unknown, index: number) => {
      this.validateSingleQuestion(question as Record<string, unknown>, index, result)
    })

    // Détection des doublons
    this.detectDuplicateQuestions(data.questions, result)

    // Préparation des données de prévisualisation
    result.previewData = data.questions.map((q: any, index: number) => ({
      id: `question-${index}`,
      type: 'question',
      originalData: q,
      processedData: q,
      status: 'valid' // Sera mis à jour selon les erreurs
    }))
  }

  private validateSingleQuestion(question: Record<string, unknown>, index: number, result: ValidationResult) {
    // Texte de la question
    if (!question.questionText || typeof question.questionText !== 'string') {
      result.errors.push({
        type: 'validation',
        severity: 'critical',
        itemIndex: index,
        field: 'questionText',
        message: 'Texte de question requis',
        suggestion: 'Ajoutez un champ "questionText" avec le texte de la question'
      })
      result.isValid = false
    }

    // Options de réponse
    if (!question.options || !Array.isArray(question.options)) {
      result.errors.push({
        type: 'validation',
        severity: 'critical',
        itemIndex: index,
        field: 'options',
        message: 'Options de réponse requises',
        suggestion: 'Ajoutez un tableau "options" avec au moins 2 options'
      })
      result.isValid = false
    } else {
      if (question.options.length < 2) {
        result.errors.push({
          type: 'validation',
          severity: 'major',
          itemIndex: index,
          field: 'options',
          message: 'Au moins 2 options requises'
        })
      }

      // Vérifier qu'il y a exactement une bonne réponse
      const correctAnswers = (question.options as Array<{ isCorrect?: boolean }>).filter((opt) => opt.isCorrect === true)
      if (correctAnswers.length === 0) {
        result.errors.push({
          type: 'validation',
          severity: 'critical',
          itemIndex: index,
          field: 'options',
          message: 'Aucune bonne réponse définie',
          suggestion: 'Marquez une option avec "isCorrect": true'
        })
        result.isValid = false
      } else if (correctAnswers.length > 1) {
        result.errors.push({
          type: 'validation',
          severity: 'major',
          itemIndex: index,
          field: 'options',
          message: 'Plusieurs bonnes réponses détectées',
          suggestion: 'Une seule option doit avoir "isCorrect": true'
        })
      }
    }

    // Explication
    if (!question.explanation) {
      result.warnings.push(`Question ${index + 1}: Explication manquante (recommandée)`)
    }

    // Catégorie
    if (!question.category) {
      result.errors.push({
        type: 'validation',
        severity: 'major',
        itemIndex: index,
        field: 'category',
        message: 'Catégorie requise',
        suggestion: 'Ajoutez un champ "category" avec le nom de la catégorie'
      })
    }

    // Niveau de difficulté
    if (question.difficulty && !['easy', 'medium', 'hard'].includes(question.difficulty)) {
      result.errors.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        field: 'difficulty',
        message: 'Niveau de difficulté invalide',
        suggestion: 'Utilisez: easy, medium, ou hard'
      })
    }

    // Niveau d'études
    if (question.level && !['PASS', 'LAS', 'both'].includes(question.level)) {
      result.errors.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        field: 'level',
        message: 'Niveau d\'études invalide',
        suggestion: 'Utilisez: PASS, LAS, ou both'
      })
    }
  }

  private async validateFlashcards(data: Record<string, unknown>, result: ValidationResult) {
    if (!data.cards || !Array.isArray(data.cards)) {
      result.errors.push({
        type: 'validation',
        severity: 'critical',
        message: 'Champ "cards" requis et doit être un tableau'
      })
      result.isValid = false
      return
    }

    // Validation de chaque carte
    (data.cards as Array<Record<string, unknown>>).forEach((card, index: number) => {
      if (!card.front || typeof card.front !== 'string') {
        result.errors.push({
          type: 'validation',
          severity: 'critical',
          itemIndex: index,
          field: 'front',
          message: 'Recto de la carte requis'
        })
        result.isValid = false
      }

      if (!card.back || typeof card.back !== 'string') {
        result.errors.push({
          type: 'validation',
          severity: 'critical',
          itemIndex: index,
          field: 'back',
          message: 'Verso de la carte requis'
        })
        result.isValid = false
      }
    })

    result.previewData = data.cards.map((c: any, index: number) => ({
      id: `card-${index}`,
      type: 'flashcard',
      originalData: c,
      processedData: c,
      status: 'valid'
    }))
  }

  private async validateLearningPaths(data: Record<string, unknown>, result: ValidationResult) {
    if (!data.path || !data.path.steps || !Array.isArray(data.path.steps)) {
      result.errors.push({
        type: 'validation',
        severity: 'critical',
        message: 'Structure de parcours invalide - champ "path.steps" requis'
      })
      result.isValid = false
      return
    }

    // Validation des étapes
    data.path.steps.forEach((step: any, index: number) => {
      if (!step.id) {
        result.errors.push({
          type: 'validation',
          severity: 'critical',
          itemIndex: index,
          field: 'id',
          message: 'ID d\'étape requis'
        })
        result.isValid = false
      }

      if (!step.title) {
        result.errors.push({
          type: 'validation',
          severity: 'major',
          itemIndex: index,
          field: 'title',
          message: 'Titre d\'étape requis'
        })
      }

      // Validation des prérequis
      if (step.prerequisites && Array.isArray(step.prerequisites)) {
        step.prerequisites.forEach((prereq: string) => {
          const prereqExists = data.path.steps.some((s: any) => s.id === prereq)
          if (!prereqExists) {
            result.errors.push({
              type: 'reference',
              severity: 'major',
              itemIndex: index,
              field: 'prerequisites',
              message: `Prérequis "${prereq}" non trouvé`,
              suggestion: 'Vérifiez que l\'ID du prérequis existe dans les étapes'
            })
          }
        })
      }
    })

    result.previewData = [{
      id: 'learning-path-1',
      type: 'learning-path',
      originalData: data,
      processedData: data,
      status: 'valid'
    }]
  }

  private detectDuplicateQuestions(questions: Array<Record<string, unknown>>, result: ValidationResult) {
    const seen = new Set()
    questions.forEach((question, index) => {
      const key = question.questionText?.toLowerCase().trim()
      if (key && seen.has(key)) {
        result.warnings.push(`Question ${index + 1}: Possible doublon détecté`)
      } else if (key) {
        seen.add(key)
      }
    })
  }

  private async detectCategoryMappings(data: Record<string, unknown>, importType: string): Promise<CategoryMapping[]> {
    const mappings: CategoryMapping[] = []
    const categories = new Set<string>()

    // Extraire les catégories selon le type
    if (importType === 'questions' && data.questions) {
      (data.questions as Array<Record<string, unknown>>).forEach((q) => {
        if (q.category && typeof q.category === 'string') categories.add(q.category)
      })
    } else if (importType === 'flashcards' && data.cards) {
      (data.cards as Array<Record<string, unknown>>).forEach((c) => {
        if (c.category && typeof c.category === 'string') categories.add(c.category)
      })
    }

    // Simuler le mapping intelligent
    categories.forEach(category => {
      const mapping = this.suggestCategoryMapping(category)
      if (mapping) {
        mappings.push(mapping)
      }
    })

    return mappings
  }

  private suggestCategoryMapping(originalName: string): CategoryMapping | null {
    const mappingRules: Record<string, { suggested: string, confidence: number }> = {
      'cardio': { suggested: 'Cardiologie', confidence: 0.95 },
      'neuro': { suggested: 'Neurologie', confidence: 0.95 },
      'anatomy': { suggested: 'Anatomie', confidence: 0.90 },
      'physio': { suggested: 'Physiologie', confidence: 0.90 },
      'heart': { suggested: 'Cardiologie', confidence: 0.85 },
      'brain': { suggested: 'Neurologie', confidence: 0.85 }
    }

    const lowerName = originalName.toLowerCase()
    const rule = mappingRules[lowerName]

    if (rule) {
      return {
        originalName,
        suggestedCategory: rule.suggested,
        confidence: rule.confidence,
        action: 'map'
      }
    }

    // Si pas de mapping trouvé, suggérer la création
    return {
      originalName,
      suggestedCategory: originalName,
      confidence: 0.5,
      action: 'create'
    }
  }
}