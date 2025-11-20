import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { aiConfig } from '../config/ai'

export interface EnrichmentResult {
  keywords: string[]
  medicalDomain: string
  difficulty: DifficultyLevel
  summary: string
  speciality?: string
  estimatedReadingTime?: number
  language: string
}

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export class AIEnrichmentService {
  private genAI: GoogleGenerativeAI
  private model: GenerativeModel

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required in environment variables')
    }

    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: aiConfig.gemini.generationModel })
  }

  /**
   * Enrichissement complet d'un contenu médical
   */
  async enrichContent(content: string, title?: string): Promise<EnrichmentResult> {
    try {
      console.log('🧠 Début enrichissement IA du contenu...')

      // Limitation de la taille du contenu pour l'API
      const contentSample = this.truncateForAnalysis(content)

      const prompt = this.buildEnrichmentPrompt(contentSample, title)

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      console.log('🤖 Réponse IA brute:', text.substring(0, 200) + '...')

      // Parser la réponse JSON de l'IA
      const enrichment = this.parseEnrichmentResponse(text)

      // Ajouter les métriques calculées
      enrichment.estimatedReadingTime = this.calculateReadingTime(content)
      enrichment.language = this.detectLanguage(contentSample)

      console.log('✅ Enrichissement terminé:', {
        keywords: enrichment.keywords.length,
        domain: enrichment.medicalDomain,
        difficulty: enrichment.difficulty,
      })

      return enrichment

    } catch (error) {
      console.error('❌ Erreur enrichissement IA:', error)

      // Fallback avec enrichissement basique
      return this.createFallbackEnrichment(content, title)
    }
  }

  /**
   * Extrait uniquement les mots-clés d'un contenu
   */
  async extractKeywords(content: string): Promise<string[]> {
    try {
      const contentSample = this.truncateForAnalysis(content)

      const prompt = `
Analyse ce contenu médical en français et extrait les 15 mots-clés médicaux les plus importants.

CONTENU À ANALYSER:
${contentSample}

INSTRUCTIONS:
- Retourne uniquement une liste de mots-clés séparés par des virgules
- Focus sur les termes médicaux, anatomiques, pathologiques
- Privilégie les termes techniques et spécialisés
- Évite les mots courants non médicaux
- Format de réponse: mot1, mot2, mot3, etc.

MOTS-CLÉS:`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Parser les mots-clés
      const keywords = text
        .split(',')
        .map((kw: string) => kw.trim())
        .filter((kw: string) => kw.length > 2 && kw.length < 50)
        .slice(0, 15)

      console.log(`🏷️ ${keywords.length} mots-clés extraits`)
      return keywords

    } catch (error) {
      console.error('❌ Erreur extraction mots-clés:', error)
      return this.extractKeywordsFallback(content)
    }
  }

  /**
   * Classifie le domaine médical d'un contenu
   */
  async classifyMedicalDomain(content: string): Promise<string> {
    try {
      const contentSample = this.truncateForAnalysis(content)

      const prompt = `
Analyse ce contenu médical et détermine le domaine médical principal.

CONTENU:
${contentSample}

DOMAINES POSSIBLES:
- anatomie
- physiologie  
- cardiologie
- neurologie
- pneumologie
- gastroenterologie
- endocrinologie
- hematologie
- immunologie
- pharmacologie
- pathologie
- radiologie
- chirurgie
- medecine_generale
- pediatrie
- gynecologie
- psychiatrie
- dermatologie
- ophtalmologie
- orl
- autre

INSTRUCTIONS:
- Réponds avec UN SEUL mot de la liste ci-dessus
- Base-toi sur le contenu médical principal
- Si plusieurs domaines sont présents, choisis le plus dominant

DOMAINE:`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const domain = response.text().trim().toLowerCase()

      // Validation du domaine
      const validDomains = [
        'anatomie', 'physiologie', 'cardiologie', 'neurologie', 'pneumologie',
        'gastroenterologie', 'endocrinologie', 'hematologie', 'immunologie',
        'pharmacologie', 'pathologie', 'radiologie', 'chirurgie', 'medecine_generale',
        'pediatrie', 'gynecologie', 'psychiatrie', 'dermatologie', 'ophtalmologie',
        'orl', 'autre'
      ]

      const classifiedDomain = validDomains.includes(domain) ? domain : 'autre'
      console.log(`🏥 Domaine classifié: ${classifiedDomain}`)

      return classifiedDomain

    } catch (error) {
      console.error('❌ Erreur classification domaine:', error)
      return 'autre'
    }
  }

  /**
   * Évalue le niveau de difficulté d'un contenu
   */
  async assessDifficulty(content: string): Promise<'beginner' | 'intermediate' | 'advanced' | 'expert'> {
    try {
      const contentSample = this.truncateForAnalysis(content)

      const prompt = `
Évalue le niveau de difficulté de ce contenu médical selon les critères des études de médecine en France.

CONTENU:
${contentSample}

NIVEAUX POSSIBLES:
- beginner: Niveau L1-L2 (bases, anatomie générale, physiologie de base)
- intermediate: Niveau L3-M1 (pathologies courantes, diagnostics, traitements standards)  
- advanced: Niveau M2-Internat (cas complexes, spécialisations, procédures avancées)
- expert: Niveau PH-Spécialiste (recherche, techniques très pointues, cas rares)

CRITÈRES D'ÉVALUATION:
- Complexité du vocabulaire médical
- Niveau de spécialisation requis
- Prérequis nécessaires
- Profondeur des concepts abordés

INSTRUCTIONS:
- Réponds avec UN SEUL mot: beginner, intermediate, advanced, ou expert
- Base-toi sur le niveau minimum requis pour comprendre le contenu

NIVEAU:`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const difficulty = response.text().trim().toLowerCase()

      // Validation du niveau
      const validLevels: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']
      const assessedLevel: DifficultyLevel = validLevels.includes(difficulty as DifficultyLevel) ? difficulty as DifficultyLevel : 'intermediate'

      console.log(`📊 Difficulté évaluée: ${assessedLevel}`)
      return assessedLevel

    } catch (error) {
      console.error('❌ Erreur évaluation difficulté:', error)
      return 'intermediate'
    }
  }

  /**
   * Génère un résumé du contenu
   */
  async generateSummary(content: string, maxLength: number = 500): Promise<string> {
    try {
      const contentSample = this.truncateForAnalysis(content)

      const prompt = `
Génère un résumé concis et précis de ce contenu médical.

CONTENU:
${contentSample}

INSTRUCTIONS:
- Maximum ${maxLength} caractères
- Focus sur les points médicaux essentiels
- Langage professionnel et précis
- Structure claire et lisible
- Préserve les termes techniques importants

RÉSUMÉ:`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      let summary = response.text().trim()

      // Limiter la longueur si nécessaire
      if (summary.length > maxLength) {
        summary = summary.substring(0, maxLength - 3) + '...'
      }

      console.log(`📝 Résumé généré: ${summary.length} caractères`)
      return summary

    } catch (error) {
      console.error('❌ Erreur génération résumé:', error)
      return this.generateFallbackSummary(content, maxLength)
    }
  }

  /**
   * Construit le prompt d'enrichissement complet
   */
  private buildEnrichmentPrompt(content: string, title?: string): string {
    return `
Tu es un expert en médecine et en analyse de contenu médical. Analyse ce contenu et fournis un enrichissement structuré.

${title ? `TITRE: ${title}\n` : ''}
CONTENU:
${content}

ANALYSE REQUISE:
Fournis ta réponse au format JSON strict avec cette structure exacte:

{
  "keywords": ["mot-clé1", "mot-clé2", ...],
  "medicalDomain": "domaine_medical",
  "difficulty": "niveau_difficulte", 
  "summary": "résumé du contenu",
  "speciality": "spécialité précise si applicable"
}

CONTRAINTES:
- keywords: 10-15 mots-clés médicaux les plus pertinents
- medicalDomain: UN des domaines suivants: anatomie, physiologie, cardiologie, neurologie, pneumologie, gastroenterologie, endocrinologie, hematologie, immunologie, pharmacologie, pathologie, radiologie, chirurgie, medecine_generale, pediatrie, gynecologie, psychiatrie, dermatologie, ophtalmologie, orl, autre
- difficulty: UN des niveaux: beginner, intermediate, advanced, expert
- summary: résumé de 200-400 caractères maximum
- speciality: spécialité médicale précise (optionnel)

IMPORTANT: Réponds UNIQUEMENT avec le JSON valide, sans texte supplémentaire.

JSON:`
  }

  /**
   * Parse la réponse JSON de l'IA
   */
  private parseEnrichmentResponse(response: string): EnrichmentResult {
    try {
      // Nettoyer la réponse
      let cleaned = response.trim()

      // Extraire le JSON si entouré de texte
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleaned = jsonMatch[0]
      }

      const parsed = JSON.parse(cleaned)

      // Validation et nettoyage des données
      return {
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 15) : [],
        medicalDomain: typeof parsed.medicalDomain === 'string' ? parsed.medicalDomain : 'autre',
        difficulty: ['beginner', 'intermediate', 'advanced', 'expert'].includes(parsed.difficulty)
          ? parsed.difficulty : 'intermediate',
        summary: typeof parsed.summary === 'string' ? parsed.summary.substring(0, 500) : '',
        speciality: typeof parsed.speciality === 'string' ? parsed.speciality : undefined,
        estimatedReadingTime: 0,
        language: 'fr',
      }
    } catch (error) {
      console.error('❌ Erreur parsing réponse IA:', error)
      throw new Error('Réponse IA invalide')
    }
  }

  /**
   * Crée un enrichissement de fallback
   */
  private createFallbackEnrichment(content: string, _title?: string): EnrichmentResult {
    console.log('🔄 Utilisation du fallback d\'enrichissement')

    return {
      keywords: this.extractKeywordsFallback(content),
      medicalDomain: 'autre',
      difficulty: 'intermediate',
      summary: this.generateFallbackSummary(content, 400),
      estimatedReadingTime: this.calculateReadingTime(content),
      language: 'fr',
    }
  }

  /**
   * Extraction de mots-clés par fallback (sans IA)
   */
  private extractKeywordsFallback(content: string): string[] {
    // Mots-clés médicaux communs en français
    const medicalTerms = [
      'anatomie', 'physiologie', 'pathologie', 'diagnostic', 'traitement', 'symptôme',
      'maladie', 'syndrome', 'thérapie', 'médecine', 'clinique', 'patient', 'organe',
      'système', 'fonction', 'cellule', 'tissu', 'infection', 'inflammation', 'douleur'
    ]

    const words = content.toLowerCase().match(/\b[a-zàáâäçéèêëïîôùúûüÿ]{4,}\b/g) || []
    const wordCount = new Map<string, number>()

    // Compter les occurrences
    words.forEach(word => {
      if (medicalTerms.some(term => word.includes(term) || term.includes(word))) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1)
      }
    })

    // Retourner les mots les plus fréquents
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }

  /**
   * Génère un résumé de fallback
   */
  private generateFallbackSummary(content: string, maxLength: number): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
    let summary = ''

    for (const sentence of sentences.slice(0, 3)) {
      if (summary.length + sentence.length < maxLength - 10) {
        summary += sentence.trim() + '. '
      } else {
        break
      }
    }

    return summary.trim() || 'Contenu médical analysé.'
  }

  /**
   * Calcule le temps de lecture estimé
   */
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200 // Lecture moyenne pour du contenu médical
    const wordCount = content.split(/\s+/).length
    return Math.ceil(wordCount / wordsPerMinute)
  }

  /**
   * Détecte la langue du contenu
   */
  private detectLanguage(content: string): string {
    const frenchIndicators = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'dans', 'sur', 'avec', 'pour']
    const englishIndicators = ['the', 'and', 'or', 'in', 'on', 'with', 'for', 'to', 'of', 'a']

    const words = content.toLowerCase().split(/\s+/).slice(0, 100)

    let frenchScore = 0
    let englishScore = 0

    words.forEach(word => {
      if (frenchIndicators.includes(word)) frenchScore++
      if (englishIndicators.includes(word)) englishScore++
    })

    return frenchScore > englishScore ? 'fr' : 'en'
  }

  /**
   * Tronque le contenu pour l'analyse IA
   */
  private truncateForAnalysis(content: string, maxChars: number = 6000): string {
    if (content.length <= maxChars) {
      return content
    }

    // Prendre le début + fin pour avoir un échantillon représentatif
    const halfMax = Math.floor(maxChars / 2)
    const beginning = content.substring(0, halfMax)
    const ending = content.substring(content.length - halfMax)

    return beginning + '\n\n[...CONTENU TRONQUÉ...]\n\n' + ending
  }
}