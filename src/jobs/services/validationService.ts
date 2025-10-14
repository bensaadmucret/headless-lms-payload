/**
 * Service de validation de qualité du contenu
 * Contrôles médicaux, qualité du contenu, conformité
 */

import type { ValidationResult, ValidationRule } from '../types'

interface ValidationIssue {
  ruleId: string
  severity: 'warning' | 'error'
  message: string
  suggestions?: string[]
}

export class ValidationService {
  constructor() {
    // Initialisation si nécessaire
  }

  /**
   * Valider un document selon des règles définies
   */
  async validateDocument(
    text: string,
    validationType: 'medical' | 'quality' | 'plagiarism',
    rules: ValidationRule[]
  ): Promise<ValidationResult> {
    try {
      console.log(`🔍 [Validation] Validating content (${text.length} chars) with ${rules.length} rules`)

      const issues: Array<{ruleId: string, severity: 'warning' | 'error', message: string, suggestions?: string[]}> = []
      let totalScore = 100

      // Appliquer chaque règle
      for (const rule of rules) {
        const result = await this.applyRule(text, rule)
        if (!result.passed) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: result.message,
            suggestions: result.suggestions
          })

          // Pénalité basée sur la sévérité
          const penalty = rule.severity === 'error' ? 20 : 10
          totalScore = Math.max(0, totalScore - penalty)
        }
      }

      // Recommandations générales
      const recommendations = this.generateRecommendations(text, issues)

      console.log(`✅ [Validation] Completed - Score: ${totalScore}/100, Issues: ${issues.length}`)

      return {
        success: true,
        score: totalScore,
        issues,
        recommendations
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed'
      console.error(`❌ [Validation] Failed:`, message)

      return {
        success: false,
        score: 0,
        issues: [{
          ruleId: 'validation_error',
          severity: 'error',
          message: message
        }],
        recommendations: ['Réessayer la validation plus tard']
      }
    }
  }

  /**
   * Appliquer une règle de validation spécifique
   */
  private async applyRule(text: string, rule: ValidationRule): Promise<{passed: boolean, message: string, suggestions?: string[]}> {
    switch (rule.id) {
      case 'medical_terms_presence':
        return this.checkMedicalTerms(text)

      case 'content_length':
        return this.checkContentLength(text)

      case 'plagiarism_check':
        return await this.checkPlagiarism(text)

      case 'medical_accuracy':
        return this.checkMedicalAccuracy(text)

      case 'structure_quality':
        return this.checkStructureQuality(text)

      case 'language_consistency':
        return this.checkLanguageConsistency(text)

      default:
        return {
          passed: true,
          message: `Règle ${rule.id} non reconnue`
        }
    }
  }

  /**
   * Vérifier la présence de termes médicaux
   */
  private checkMedicalTerms(text: string): {passed: boolean, message: string, suggestions?: string[]} {
    const medicalTerms = [
      'diagnostic', 'traitement', 'symptôme', 'maladie', 'pathologie',
      'anatomie', 'physiologie', 'clinique', 'thérapeutique'
    ]

    const foundTerms = medicalTerms.filter(term => text.toLowerCase().includes(term))

    if (foundTerms.length >= 3) {
      return {
        passed: true,
        message: `${foundTerms.length} termes médicaux trouvés`
      }
    } else {
      return {
        passed: false,
        message: `Seulement ${foundTerms.length} termes médicaux trouvés (minimum 3 requis)`,
        suggestions: [
          'Ajouter des termes médicaux spécifiques au contenu',
          'Vérifier que le contenu traite bien d\'un sujet médical'
        ]
      }
    }
  }

  /**
   * Vérifier la longueur du contenu
   */
  private checkContentLength(text: string): {passed: boolean, message: string, suggestions?: string[]} {
    const wordCount = text.split(/\s+/).length

    if (wordCount >= 100) {
      return {
        passed: true,
        message: `${wordCount} mots - longueur suffisante`
      }
    } else {
      return {
        passed: false,
        message: `Contenu trop court: ${wordCount} mots (minimum 100 requis)`,
        suggestions: [
          'Développer davantage le contenu',
          'Ajouter des explications détaillées'
        ]
      }
    }
  }

  /**
   * Vérifier le plagiat (simulation)
   */
  private async checkPlagiarism(text: string): Promise<{passed: boolean, message: string, suggestions?: string[]}> {
    // Simulation de vérification anti-plagiat
    // En production, utiliserait un service comme Turnitin ou Copyscape

    // Vérifications simples
    const suspiciousPatterns = [
      /lorem ipsum/gi,
      /texte d'exemple/gi,
      /contenu temporaire/gi
    ]

    const found = suspiciousPatterns.some(pattern => pattern.test(text))

    if (!found) {
      return {
        passed: true,
        message: 'Aucun pattern suspect de plagiat détecté'
      }
    } else {
      return {
        passed: false,
        message: 'Patterns suspects de contenu générique ou copié détectés',
        suggestions: [
          'Remplacer le contenu par du texte original',
          'Vérifier l\'authenticité des sources'
        ]
      }
    }
  }

  /**
   * Vérifier l'exactitude médicale
   */
  private checkMedicalAccuracy(text: string): {passed: boolean, message: string, suggestions?: string[]} {
    // Vérifications basiques d'exactitude médicale
    const warningPatterns = [
      /\bde façon définitive\b/gi, // Éviter les affirmations absolues
      /\btoujours\b/gi,
      /\bjamais\b/gi
    ]

    const foundWarnings = warningPatterns.filter(pattern => pattern.test(text))

    if (foundWarnings.length === 0) {
      return {
        passed: true,
        message: 'Pas d\'affirmations médicales absolues problématiques'
      }
    } else {
      return {
        passed: false,
        message: `${foundWarnings.length} affirmations absolues détectées`,
        suggestions: [
          'Nuancer les affirmations médicales',
          'Ajouter des références à des sources médicales fiables',
          'Consulter un expert médical pour validation'
        ]
      }
    }
  }

  /**
   * Vérifier la qualité de la structure
   */
  private checkStructureQuality(text: string): {passed: boolean, message: string, suggestions?: string[]} {
    // Vérifier la présence de structure logique
    const hasTitles = /#{1,6}\s+\w+|^\s*\d+\.\s+\w+/m.test(text)
    const hasParagraphs = text.split('\n\n').length >= 3
    const hasLists = /^[\s]*[-*+]\s|\d+\.\s/m.test(text)

    let structureScore = 0
    if (hasTitles) structureScore += 1
    if (hasParagraphs) structureScore += 1
    if (hasLists) structureScore += 1

    if (structureScore >= 2) {
      return {
        passed: true,
        message: `Structure de qualité (score: ${structureScore}/3)`
      }
    } else {
      return {
        passed: false,
        message: `Structure insuffisante (score: ${structureScore}/3)`,
        suggestions: [
          'Ajouter des titres pour structurer le contenu',
          'Utiliser des paragraphes pour séparer les idées',
          'Ajouter des listes pour clarifier les points importants'
        ]
      }
    }
  }

  /**
   * Vérifier la cohérence linguistique
   */
  private checkLanguageConsistency(text: string): {passed: boolean, message: string, suggestions?: string[]} {
    // Détection basique de mélange de langues
    const frenchWords = /\b(le|la|les|et|ou|mais|donc|car|pour|avec|sans)\b/gi
    const englishWords = /\b(the|and|or|but|so|because|for|with|without)\b/gi

    const frenchCount = (text.match(frenchWords) || []).length
    const englishCount = (text.match(englishWords) || []).length

    const totalWords = text.split(/\s+/).length
    const frenchRatio = frenchCount / totalWords
    const englishRatio = englishCount / totalWords

    // Si les deux langues sont présentes de façon significative
    if (frenchRatio > 0.1 && englishRatio > 0.1) {
      return {
        passed: false,
        message: 'Mélange de langues détecté (français et anglais)',
        suggestions: [
          'Choisir une langue principale',
          'Traduire complètement le contenu dans une seule langue'
        ]
      }
    } else {
      return {
        passed: true,
        message: `Langue cohérente (${frenchRatio > englishRatio ? 'français' : 'anglais'})`
      }
    }
  }

  /**
   * Générer des recommandations générales
   */
  private generateRecommendations(text: string, issues: ValidationIssue[]): string[] {
    const recommendations: string[] = []

    if (issues.length === 0) {
      recommendations.push('Contenu validé avec succès - aucune action requise')
    } else {
      const errorCount = issues.filter(i => i.severity === 'error').length
      const warningCount = issues.filter(i => i.severity === 'warning').length

      if (errorCount > 0) {
        recommendations.push(`${errorCount} erreur(s) critique(s) à corriger avant publication`)
      }

      if (warningCount > 0) {
        recommendations.push(`${warningCount} avertissement(s) à considérer pour améliorer la qualité`)
      }

      recommendations.push('Faire relire par un expert médical si possible')
      recommendations.push('Vérifier les références et sources citées')
    }

    return recommendations
  }
}

export const validationService = new ValidationService()
