/**
 * Service NLP (Natural Language Processing)
 * Analyse sémantique, extraction de mots-clés, résumé automatique
 */

import type { Language, NLPResult } from '../types'

export class NLPService {
  constructor() {
    // Initialisation si nécessaire
  }

  /**
   * Traiter un texte avec NLP
   */
  async processText(text: string, language: Language, features: Array<'keywords' | 'summary' | 'sentiment' | 'entities'>): Promise<NLPResult> {
    try {
      console.log(`🧠 [NLP] Processing text (${text.length} chars) in ${language} with features: ${features.join(', ')}`)

      const result: NLPResult = {
        success: true,
        keywords: [],
        language,
      }

      // Extraction des mots-clés
      if (features.includes('keywords')) {
        result.keywords = await this.extractKeywords(text, language)
      }

      // Génération de résumé
      if (features.includes('summary')) {
        result.summary = await this.generateSummary(text)
      }

      // Analyse de sentiment
      if (features.includes('sentiment')) {
        result.sentiment = await this.analyzeSentiment(text)
      }

      // Extraction d'entités
      if (features.includes('entities')) {
        result.entities = await this.extractEntities(text)
      }

      console.log(`✅ [NLP] Processing completed - Keywords: ${result.keywords.length}, Summary: ${result.summary?.length || 0} chars`)
      return result

    } catch (error) {
      const message = error instanceof Error ? error.message : 'NLP processing failed'
      console.error(`❌ [NLP] Processing failed:`, message)

      return {
        success: false,
        keywords: [],
        language,
        error: message,
      }
    }
  }

  /**
   * Extraire les mots-clés médicaux
   */
  private async extractKeywords(text: string, language: Language): Promise<Array<{term: string, relevance: number, category?: string}>> {
    // Pour l'instant, implémentation simplifiée
    // En production, utiliserait une vraie bibliothèque NLP comme spaCy ou Hugging Face

    const keywords: Array<{term: string, relevance: number, category?: string}> = []

    // Termes médicaux courants en français et anglais
    const medicalTerms = {
      fr: [
        'diagnostic', 'traitement', 'symptôme', 'maladie', 'pathologie',
        'anatomie', 'physiologie', 'pharmacologie', 'chirurgie', 'radiologie',
        'cardiologie', 'neurologie', 'pneumologie', 'gastro-entérologie'
      ],
      en: [
        'diagnosis', 'treatment', 'symptom', 'disease', 'pathology',
        'anatomy', 'physiology', 'pharmacology', 'surgery', 'radiology',
        'cardiology', 'neurology', 'pulmonology', 'gastroenterology'
      ]
    }

    const terms = medicalTerms[language] || medicalTerms.fr
    const lowerText = text.toLowerCase()

    for (const term of terms) {
      if (lowerText.includes(term)) {
        const count = (lowerText.match(new RegExp(term, 'g')) || []).length
        const relevance = Math.min(count * 0.1, 1.0) // Score basé sur la fréquence

        keywords.push({
          term,
          relevance,
          category: 'medical'
        })
      }
    }

    // Trier par pertinence décroissante
    return keywords.sort((a, b) => b.relevance - a.relevance).slice(0, 20)
  }

  /**
   * Générer un résumé automatique
   */
  private async generateSummary(text: string): Promise<string> {
    // Implémentation simplifiée - en production utiliserait un modèle de résumé
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)

    if (sentences.length <= 3) {
      return text.slice(0, 500) + (text.length > 500 ? '...' : '')
    }

    // Prendre les 3 premières phrases significatives
    const summary = sentences.slice(0, 3).join('. ').trim()
    return summary.length > 300 ? summary.slice(0, 300) + '...' : summary + '.'
  }

  /**
   * Analyser le sentiment du texte
   */
  private async analyzeSentiment(text: string): Promise<{score: number, label: 'positive' | 'negative' | 'neutral'}> {
    // Analyse simplifiée basée sur des mots-clés
    const positiveWords = ['efficace', 'amélioration', 'guérison', 'succès', 'effective', 'improvement', 'cure', 'success']
    const negativeWords = ['risque', 'complication', 'échec', 'danger', 'risk', 'complication', 'failure', 'danger']

    const lowerText = text.toLowerCase()
    let score = 0

    for (const word of positiveWords) {
      score += (lowerText.match(new RegExp(word, 'g')) || []).length * 0.1
    }

    for (const word of negativeWords) {
      score -= (lowerText.match(new RegExp(word, 'g')) || []).length * 0.1
    }

    // Normaliser entre -1 et 1
    score = Math.max(-1, Math.min(1, score))

    let label: 'positive' | 'negative' | 'neutral'
    if (score > 0.1) label = 'positive'
    else if (score < -0.1) label = 'negative'
    else label = 'neutral'

    return { score, label }
  }

  /**
   * Extraire les entités nommées (médicales)
   */
  private async extractEntities(text: string): Promise<Array<{text: string, type: 'medical_term' | 'anatomy' | 'disease' | 'drug' | 'person' | 'location', confidence: number}>> {
    // Implémentation simplifiée - reconnaissance basique d'entités médicales
    const entities: Array<{text: string, type: 'medical_term' | 'anatomy' | 'disease' | 'drug' | 'person' | 'location', confidence: number}> = []

    // Patterns pour différents types d'entités
    const patterns = [
      // Maladies
      { regex: /\b(cancer|diabète|hypertension|asthme|dépression|anémie|insuffisance|syndrome|maladie)/gi, type: 'disease' as const, confidence: 0.8 },
      // Organes
      { regex: /\b(cœur|cerveau|poumon|foie|rein|estomac|intestin|peau|os|muscle)/gi, type: 'anatomy' as const, confidence: 0.9 },
      // Médicaments (patterns simples)
      { regex: /\b(paracétamol|ibuprofène|aspirine|antibiotique|corticoïde|insuline|antidépresseur)/gi, type: 'drug' as const, confidence: 0.7 },
      // Spécialités médicales (mapped to medical_term)
      { regex: /\b(cardiologue|neurologue|pédiatre|chirurgien|radiologue|ophtalmologiste)/gi, type: 'medical_term' as const, confidence: 0.9 }
    ]

    for (const pattern of patterns) {
      const matches = text.match(pattern.regex)
      if (matches) {
        for (const match of matches) {
          // Éviter les doublons
          if (!entities.some(e => e.text.toLowerCase() === match.toLowerCase())) {
            entities.push({
              text: match,
              type: pattern.type,
              confidence: pattern.confidence
            })
          }
        }
      }
    }

    return entities.slice(0, 15) // Limiter à 15 entités max
  }
}

export const nlpService = new NLPService()
