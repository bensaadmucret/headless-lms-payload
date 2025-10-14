/**
 * Service IA pour l'enrichissement de contenu
 * Génération de quiz, extraction de concepts, évaluation de difficulté
 */

import type { ContentType, AIResult } from '../types'
import { AIQuizGenerationService } from '../../services/AIQuizGenerationService'

export class AIService {
  private quizService: AIQuizGenerationService

  constructor() {
    this.quizService = new AIQuizGenerationService()
  }

  /**
   * Enrichir un document avec l'IA
   */
  async enrichContent(
    text: string,
    contentType: ContentType,
    tasks: Array<'summary' | 'quiz-generation' | 'concept-extraction' | 'difficulty-assessment'>,
    context?: { medicalDomain?: string, targetAudience?: string }
  ): Promise<AIResult> {
    try {
      console.log(`🤖 [AI] Enriching content (${text.length} chars) with tasks: ${tasks.join(', ')}`)

      const result: AIResult = {
        success: true,
      }

      // Résumé IA avancé
      if (tasks.includes('summary')) {
        result.aiSummary = await this.generateAISummary(text, contentType, context)
      }

      // Extraction de concepts
      if (tasks.includes('concept-extraction')) {
        result.conceptsExtracted = await this.extractConcepts(text, contentType, context)
      }

      // Génération de quiz
      if (tasks.includes('quiz-generation')) {
        result.suggestedQuestions = await this.generateQuestions(text, contentType, context)
      }

      // Évaluation de difficulté
      if (tasks.includes('difficulty-assessment')) {
        result.difficultyScore = await this.assessDifficulty(text, contentType, context)
      }

      console.log(`✅ [AI] Enrichment completed - Concepts: ${result.conceptsExtracted?.length || 0}, Questions: ${result.suggestedQuestions?.length || 0}`)
      return result

    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI enrichment failed'
      console.error(`❌ [AI] Enrichment failed:`, message)

      return {
        success: false,
        error: message,
      }
    }
  }

  /**
   * Générer un résumé IA intelligent
   */
  private async generateAISummary(text: string, contentType: ContentType, context?: Record<string, unknown>): Promise<string> {
    // Utilisation simplifiée - en production utiliserait un vrai modèle IA
    // Ici on pourrait intégrer avec Gemini ou OpenAI

    const prompt = `Résume ce texte médical en français de manière pédagogique et concise (max 200 mots).
    Domaine médical: ${context?.medicalDomain || 'général'}
    Public cible: ${context?.targetAudience || 'étudiants en médecine'}

    Texte à résumer:
    ${text.slice(0, 2000)}

    Résumé:`

    try {
      // Simulation d'appel IA - remplacer par vrai appel API
      const summary = await this.simulateAIResponse(prompt)
      return summary || "Résumé non disponible - service IA temporairement indisponible"
    } catch {
      // Fallback vers résumé automatique basique
      return text.slice(0, 300) + (text.length > 300 ? '...' : '')
    }
  }

  /**
   * Extraire les concepts clés
   */
  private async extractConcepts(text: string, contentType: ContentType, context?: Record<string, unknown>): Promise<Array<{concept: string, definition: string, importance: number}>> {
    // Simulation d'extraction de concepts
    const concepts: Array<{concept: string, definition: string, importance: number}> = []

    // Concepts médicaux courants
    const medicalConcepts = [
      { concept: 'Diagnostic', definition: 'Processus d\'identification d\'une maladie basée sur les signes cliniques', importance: 0.9 },
      { concept: 'Traitement', definition: 'Méthodes thérapeutiques pour soigner ou gérer une condition médicale', importance: 0.8 },
      { concept: 'Prévention', definition: 'Mesures pour éviter l\'apparition ou la progression d\'une maladie', importance: 0.7 },
      { concept: 'Pronostic', definition: 'Prévision de l\'évolution d\'une maladie et des chances de guérison', importance: 0.6 }
    ]

    // Filtrer les concepts présents dans le texte
    const lowerText = text.toLowerCase()
    for (const concept of medicalConcepts) {
      if (lowerText.includes(concept.concept.toLowerCase())) {
        concepts.push(concept)
      }
    }

    return concepts.slice(0, 5)
  }

  /**
   * Générer des questions de quiz
   */
  private async generateQuestions(text: string, contentType: ContentType, context?: Record<string, unknown>): Promise<Array<{question: string, type: 'qcm' | 'open' | 'case_study', difficulty: 'beginner' | 'intermediate' | 'advanced', answers?: string[], correctAnswer?: string}>> {
    try {
      // Utiliser le service de génération de quiz existant
      const questions = await this.quizService.generateQuestionsFromContent(
        text.slice(0, 1000), // Limiter la taille pour éviter les timeouts
        undefined, // categoryId
        undefined, // courseId
        'pass', // niveau
        2 // nombre de questions
      )

      return questions.map(q => ({
        question: q.questionText,
        type: 'qcm' as const,
        difficulty: 'intermediate' as const,
        answers: q.options.map(opt => opt.optionText),
        correctAnswer: q.options.find(opt => opt.isCorrect)?.optionText
      }))

    } catch (error) {
      console.warn('⚠️ [AI] Quiz generation failed, using fallback')
      return [{
        question: "Quelle est la principale information contenue dans ce document ?",
        type: 'open',
        difficulty: 'beginner'
      }]
    }
  }

  /**
   * Évaluer la difficulté du contenu
   */
  private async assessDifficulty(text: string, contentType: ContentType, context?: Record<string, unknown>): Promise<number> {
    // Évaluation basée sur des heuristiques simples
    let score = 0.5 // Score de base moyen

    // Mots techniques médicaux
    const technicalTerms = ['pathologie', 'physiopathologie', 'étiologie', 'clinique', 'diagnostic', 'thérapeutique']
    const technicalCount = technicalTerms.filter(term => text.toLowerCase().includes(term)).length
    score += technicalCount * 0.05

    // Longueur du texte (textes plus longs = plus difficiles)
    if (text.length > 5000) score += 0.2
    else if (text.length > 2000) score += 0.1

    // Présence de références médicales complexes
    if (text.includes('syndrome') || text.includes('classification')) score += 0.1

    // Normaliser entre 0 et 1
    return Math.max(0, Math.min(1, score))
  }

  /**
   * Simulation d'appel IA (à remplacer par vrai appel API)
   */
  private async simulateAIResponse(prompt: string): Promise<string> {
    // Simulation - en production, remplacer par appel réel à Gemini/OpenAI
    await new Promise(resolve => setTimeout(resolve, 500)) // Simuler latence réseau

    if (prompt.includes('Résume')) {
      return "Ce document présente les principes fondamentaux du diagnostic médical, en mettant l'accent sur l'importance de l'anamnèse et de l'examen clinique systématique. Il couvre les méthodes d'investigation paracliniques et l'approche rationnelle pour établir un diagnostic différentiel."
    }

    return "Réponse IA simulée - service non configuré"
  }
}

export const aiService = new AIService()
