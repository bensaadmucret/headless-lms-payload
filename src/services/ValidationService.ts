import type { Payload } from 'payload'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * Service de validation pour les paramètres des quiz adaptatifs
 */
export class ValidationService {
  constructor(private payload: Payload) {}

  /**
   * Valide les paramètres de génération de quiz adaptatif
   */
  validateGenerationParams(params: any): ValidationResult {
    const errors: ValidationError[] = []

    // Validation du userId (si fourni explicitement)
    if (params.userId !== undefined) {
      if (!params.userId || typeof params.userId !== 'string') {
        errors.push({
          field: 'userId',
          message: 'L\'ID utilisateur doit être une chaîne non vide',
          code: 'INVALID_USER_ID'
        })
      }
    }

    // Validation des paramètres optionnels de configuration
    if (params.config) {
      if (params.config.weakQuestionsCount !== undefined) {
        if (!Number.isInteger(params.config.weakQuestionsCount) || params.config.weakQuestionsCount < 1 || params.config.weakQuestionsCount > 10) {
          errors.push({
            field: 'config.weakQuestionsCount',
            message: 'Le nombre de questions faibles doit être un entier entre 1 et 10',
            code: 'INVALID_WEAK_QUESTIONS_COUNT'
          })
        }
      }

      if (params.config.strongQuestionsCount !== undefined) {
        if (!Number.isInteger(params.config.strongQuestionsCount) || params.config.strongQuestionsCount < 1 || params.config.strongQuestionsCount > 5) {
          errors.push({
            field: 'config.strongQuestionsCount',
            message: 'Le nombre de questions fortes doit être un entier entre 1 et 5',
            code: 'INVALID_STRONG_QUESTIONS_COUNT'
          })
        }
      }

      if (params.config.targetSuccessRate !== undefined) {
        if (typeof params.config.targetSuccessRate !== 'number' || params.config.targetSuccessRate < 0 || params.config.targetSuccessRate > 1) {
          errors.push({
            field: 'config.targetSuccessRate',
            message: 'Le taux de réussite cible doit être un nombre entre 0 et 1',
            code: 'INVALID_TARGET_SUCCESS_RATE'
          })
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Valide les paramètres de soumission de résultats
   */
  validateSubmissionParams(params: any): ValidationResult {
    const errors: ValidationError[] = []

    // Validation du sessionId
    if (!params.sessionId || typeof params.sessionId !== 'string') {
      errors.push({
        field: 'sessionId',
        message: 'L\'ID de session est requis et doit être une chaîne',
        code: 'MISSING_SESSION_ID'
      })
    }

    // Validation des réponses
    if (!params.answers || typeof params.answers !== 'object') {
      errors.push({
        field: 'answers',
        message: 'Les réponses sont requises et doivent être un objet',
        code: 'MISSING_ANSWERS'
      })
    } else {
      // Vérifier que les réponses ne sont pas vides
      if (Object.keys(params.answers).length === 0) {
        errors.push({
          field: 'answers',
          message: 'Au moins une réponse doit être fournie',
          code: 'EMPTY_ANSWERS'
        })
      }

      // Valider chaque réponse
      for (const [questionId, answer] of Object.entries(params.answers)) {
        if (!questionId || typeof questionId !== 'string') {
          errors.push({
            field: `answers.${questionId}`,
            message: 'L\'ID de question doit être une chaîne non vide',
            code: 'INVALID_QUESTION_ID'
          })
        }

        if (answer === undefined || answer === null) {
          errors.push({
            field: `answers.${questionId}`,
            message: 'La réponse ne peut pas être vide',
            code: 'EMPTY_ANSWER'
          })
        }

        // Valider le format de la réponse (string ou array de strings)
        if (typeof answer !== 'string' && !Array.isArray(answer)) {
          errors.push({
            field: `answers.${questionId}`,
            message: 'La réponse doit être une chaîne ou un tableau de chaînes',
            code: 'INVALID_ANSWER_FORMAT'
          })
        }

        if (Array.isArray(answer)) {
          if (answer.length === 0) {
            errors.push({
              field: `answers.${questionId}`,
              message: 'Le tableau de réponses ne peut pas être vide',
              code: 'EMPTY_ANSWER_ARRAY'
            })
          }

          for (let i = 0; i < answer.length; i++) {
            if (typeof answer[i] !== 'string') {
              errors.push({
                field: `answers.${questionId}[${i}]`,
                message: 'Chaque réponse dans le tableau doit être une chaîne',
                code: 'INVALID_ANSWER_ITEM_TYPE'
              })
            }
          }
        }
      }
    }

    // Validation du temps passé (optionnel)
    if (params.timeSpent !== undefined) {
      if (!Number.isInteger(params.timeSpent) || params.timeSpent < 0) {
        errors.push({
          field: 'timeSpent',
          message: 'Le temps passé doit être un entier positif en secondes',
          code: 'INVALID_TIME_SPENT'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Valide qu'un sessionId a le bon format
   */
  validateSessionIdFormat(sessionId: string): boolean {
    // Format attendu: adaptive_timestamp_randomstring
    const sessionIdPattern = /^adaptive_\d+_[a-z0-9]+$/
    return sessionIdPattern.test(sessionId)
  }

  /**
   * Sanitise les paramètres d'entrée pour éviter les injections
   */
  sanitizeParams(params: any): any {
    if (typeof params !== 'object' || params === null) {
      return {}
    }

    const sanitized: any = {}

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Nettoyer les chaînes de caractères dangereux
        sanitized[key] = value.trim().replace(/[<>\"']/g, '')
      } else if (typeof value === 'number') {
        // Vérifier que les nombres sont valides
        sanitized[key] = isNaN(value) ? 0 : value
      } else if (typeof value === 'boolean') {
        sanitized[key] = value
      } else if (Array.isArray(value)) {
        // Sanitiser récursivement les tableaux
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? item.trim().replace(/[<>\"']/g, '') : item
        )
      } else if (typeof value === 'object' && value !== null) {
        // Sanitiser récursivement les objets
        sanitized[key] = this.sanitizeParams(value)
      }
    }

    return sanitized
  }

  /**
   * Valide les limites de taille des données
   */
  validateDataLimits(params: any): ValidationResult {
    const errors: ValidationError[] = []

    // Limite sur le nombre de réponses
    if (params.answers && typeof params.answers === 'object') {
      const answerCount = Object.keys(params.answers).length
      if (answerCount > 50) {
        errors.push({
          field: 'answers',
          message: 'Trop de réponses fournies (maximum 50)',
          code: 'TOO_MANY_ANSWERS'
        })
      }
    }

    // Limite sur la taille des chaînes de réponse
    if (params.answers) {
      for (const [questionId, answer] of Object.entries(params.answers)) {
        if (typeof answer === 'string' && answer.length > 1000) {
          errors.push({
            field: `answers.${questionId}`,
            message: 'La réponse est trop longue (maximum 1000 caractères)',
            code: 'ANSWER_TOO_LONG'
          })
        }

        if (Array.isArray(answer) && answer.length > 10) {
          errors.push({
            field: `answers.${questionId}`,
            message: 'Trop de réponses multiples (maximum 10)',
            code: 'TOO_MANY_MULTIPLE_ANSWERS'
          })
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}