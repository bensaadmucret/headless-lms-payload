interface ValidationError {
  type: 'validation' | 'database' | 'mapping' | 'reference' | 'system'
  severity: 'critical' | 'major' | 'minor' | 'warning'
  itemIndex?: number
  field?: string
  message: string
  suggestion?: string
}

interface ValidationWarning {
  message: string
  suggestion?: string
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  previewData?: any[]
  categoryMappings?: CategoryMapping[]
  summary?: {
    totalItems: number
    validItems: number
    invalidItems: number
    duplicates: number
    missingCategories: string[]
  }
}

interface CategoryMapping {
  originalName: string
  suggestedCategory: string
  confidence: number
  action: 'map' | 'create' | 'ignore'
}

type LearningPathStep = {
  id?: unknown
  title?: unknown
  prerequisites?: unknown
  [key: string]: unknown
}

interface LearningPathData {
  steps: LearningPathStep[]
}

export class JSONValidationService {
  async validateImportData(data: any, importType: string): Promise<ValidationResult> {
    // Convertir l'objet en JSON string puis le reparser pour uniformiser le traitement
    const jsonContent = JSON.stringify(data);
    return this.validateJSON(jsonContent, importType);
  }

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
        result.warnings.push({ message: 'Champ "version" manquant, version 1.0 assumée' })
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

      // 5. Calcul du résumé
      result.summary = this.calculateSummary(data, importType, result.errors, result.warnings)

    } catch (error) {
      result.errors.push({
        type: 'system',
        severity: 'critical',
        message: `Erreur lors de la validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
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
    // Validation du type de questionText
    if (question.questionText !== undefined && typeof question.questionText !== 'string') {
      result.errors.push({
        type: 'validation',
        severity: 'critical',
        itemIndex: index,
        field: 'questionText',
        message: `Type incorrect pour questionText: attendu string, reçu ${typeof question.questionText}`,
        suggestion: 'Le texte de la question doit être une chaîne de caractères'
      })
      result.isValid = false
    } else if (!question.questionText || (typeof question.questionText === 'string' && question.questionText.trim() === '')) {
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
        result.isValid = false
      }

      // Vérifier les options identiques
      const optionTexts = (question.options as Array<{ text: string }>).map(opt => opt.text?.toLowerCase().trim()).filter(text => text)
      const uniqueTexts = new Set(optionTexts)
      if (optionTexts.length !== uniqueTexts.size) {
        result.warnings.push({ 
          message: `Question ${index + 1}: Options similaires détectées`,
          suggestion: 'Assurez-vous que chaque option est distincte'
        })
      }
    }

    // Explication
    if (!question.explanation) {
      result.warnings.push({ message: `Question ${index + 1}: Explication manquante (recommandée)` })
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
    if (question.difficulty && typeof question.difficulty === 'string' && !['easy', 'medium', 'hard'].includes(question.difficulty)) {
      result.errors.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        field: 'difficulty',
        message: 'Niveau de difficulté invalide',
        suggestion: 'Utilisez: easy, medium, ou hard'
      })
      result.isValid = false
    }

    // Niveau d'études
    if (question.level && typeof question.level === 'string' && !['PASS', 'LAS', 'both'].includes(question.level)) {
      result.errors.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        field: 'level',
        message: 'Niveau d\'études invalide',
        suggestion: 'Utilisez: PASS, LAS, ou both'
      })
      result.isValid = false
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
          message: 'Recto de la carte requis et doit être une chaîne de caractères'
        })
        result.isValid = false
      }

      if (!card.back || typeof card.back !== 'string') {
        result.errors.push({
          type: 'validation',
          severity: 'critical',
          itemIndex: index,
          field: 'back',
          message: 'Verso de la carte requis et doit être une chaîne de caractères'
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
    if (!this.isLearningPathData(data.path)) {
      result.errors.push({
        type: 'validation',
        severity: 'critical',
        message: 'Structure de parcours invalide - champ "path.steps" requis'
      })
      result.isValid = false
      return
    }

    // Validation des étapes
    const { steps } = data.path

    steps.forEach((step, index: number) => {
      const stepId = typeof step.id === 'string' ? step.id.trim() : step.id

      if (!stepId || (typeof stepId === 'string' && stepId === '')) {
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
      if (Array.isArray(step.prerequisites)) {
        const prerequisites = step.prerequisites.filter((prereq): prereq is string => typeof prereq === 'string')

        prerequisites.forEach((prereq) => {
          const prereqExists = steps.some((s) => typeof s.id === 'string' && s.id === prereq)
          if (!prereqExists) {
            result.errors.push({
              type: 'reference',
              severity: 'major',
              itemIndex: index,
              field: 'prerequisites',
              message: `Prérequis "${prereq}" non trouvé`,
              suggestion: 'Vérifiez que l\'ID du prérequis existe dans les étapes'
            })
            result.isValid = false
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

  private isLearningPathData(value: unknown): value is LearningPathData {
    if (!value || typeof value !== 'object') {
      return false
    }

    if (!('steps' in value)) {
      return false
    }

    const steps = (value as { steps: unknown }).steps

    if (!Array.isArray(steps)) {
      return false
    }

    return steps.every((step) => step !== null && typeof step === 'object')
  }

  private detectDuplicateQuestions(questions: Array<Record<string, unknown>>, result: ValidationResult) {
    const seen = new Set<string>()
    questions.forEach((question, index) => {
      const key = question.questionText && typeof question.questionText === 'string' ? question.questionText.toLowerCase().trim() : ''
      if (key && seen.has(key)) {
        result.warnings.push({ message: `Question ${index + 1}: Possible doublon détecté` })
      } else if (key) {
        seen.add(key)
      }
    })
  }

  private async detectCategoryMappings(data: Record<string, unknown>, importType: string): Promise<CategoryMapping[]> {
    const mappings: CategoryMapping[] = []
    const categories = new Set<string>()

    // Extraire les catégories selon le type
    if (importType === 'questions' && data.questions && Array.isArray(data.questions)) {
      (data.questions as Array<Record<string, unknown>>).forEach((q) => {
        if (q.category && typeof q.category === 'string') categories.add(q.category)
      })
    } else if (importType === 'flashcards' && data.cards && Array.isArray(data.cards)) {
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

  private calculateSummary(data: Record<string, unknown>, importType: string, errors: ValidationError[], warnings: ValidationWarning[]): {
    totalItems: number
    validItems: number
    invalidItems: number
    duplicates: number
    missingCategories: string[]
  } {
    let totalItems = 0
    let invalidItems = 0
    const missingCategories = new Set<string>()
    let duplicates = 0

    // Calculer selon le type d'import
    switch (importType) {
      case 'questions':
        if (data.questions && Array.isArray(data.questions)) {
          totalItems = data.questions.length
          invalidItems = errors.filter(e => e.itemIndex !== undefined).length
        }
        break
      case 'flashcards':
        if (data.cards && Array.isArray(data.cards)) {
          totalItems = data.cards.length
          invalidItems = errors.filter(e => e.itemIndex !== undefined).length
        }
        break
      case 'learning-paths':
        if (data.path && typeof data.path === 'object' && 'steps' in data.path && Array.isArray(data.path.steps)) {
          totalItems = data.path.steps.length
          invalidItems = errors.filter(e => e.itemIndex !== undefined).length
        }
        break
    }

    // Compter les doublons
    duplicates = warnings.filter(w => w.message.includes('dupliquée') || w.message.includes('doublon')).length

    // Compter les catégories manquantes
    errors.forEach(error => {
      if (error.message.includes('n\'existe pas dans le système')) {
        const categoryMatch = error.message.match(/«([^»]+)»/)
        if (categoryMatch && categoryMatch[1]) {
          missingCategories.add(categoryMatch[1])
        }
      }
    })

    return {
      totalItems,
      validItems: totalItems - invalidItems,
      invalidItems,
      duplicates,
      missingCategories: Array.from(missingCategories)
    }
  }
}