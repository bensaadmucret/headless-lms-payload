/**
 * Service de génération de distracteurs avec IA
 * Utilise l'IA pour générer des distracteurs contextuels et plausibles
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ImportFlashcard } from '../types/jsonImport';
import { aiConfig } from '../config/ai';

export interface DistractorGenerationRequest {
  correctAnswer: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  medicalDomain?: string;
  context?: string;
  count?: number;
}

export interface DistractorGenerationResult {
  success: boolean;
  distractors: string[];
  confidence: number;
  strategy: string;
  warnings?: string[];
}

export interface FlashcardAnalysis {
  type: 'definition' | 'factual' | 'conceptual' | 'procedural';
  complexity: 'simple' | 'medium' | 'complex';
  hasNumericAnswer: boolean;
  hasListAnswer: boolean;
  medicalSpecialty: string;
  keyTerms: string[];
}

export class AIDistractorGenerationService {
  private client: GoogleGenerativeAI;
  private cache: Map<string, { distractors: string[]; timestamp: number }>;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 heure

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.cache = new Map();
  }

  /**
   * Génère des distracteurs avec IA pour une flashcard
   */
  async generateDistractorsForFlashcard(
    card: ImportFlashcard,
    count: number = 3
  ): Promise<DistractorGenerationResult> {
    try {
      // Analyser la flashcard
      const analysis = this.analyzeFlashcard(card);

      // Générer les distracteurs avec IA
      const request: DistractorGenerationRequest = {
        correctAnswer: card.back,
        question: card.front,
        category: card.category,
        difficulty: card.difficulty,
        medicalDomain: analysis.medicalSpecialty,
        context: this.buildContext(card, analysis),
        count
      };

      return await this.generateDistractors(request);

    } catch (error) {
      return {
        success: false,
        distractors: this.generateFallbackDistractors(card.back, card.category, count),
        confidence: 0.3,
        strategy: 'fallback',
        warnings: [`Erreur IA: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]
      };
    }
  }

  /**
   * Génère des distracteurs avec IA
   */
  async generateDistractors(request: DistractorGenerationRequest): Promise<DistractorGenerationResult> {
    try {
      // Vérifier le cache
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return {
          success: true,
          distractors: cached.distractors,
          confidence: 0.9,
          strategy: 'cached'
        };
      }

      // Construire le prompt spécialisé
      const prompt = this.buildDistractorPrompt(request);

      // Appeler l'IA
      const model = this.client.getGenerativeModel({ model: aiConfig.gemini.generationModel });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parser la réponse
      const distractors = this.parseDistractorResponse(text, request.count || 3);

      // Valider les distracteurs
      const validatedDistractors = this.validateDistractors(
        distractors,
        request.correctAnswer,
        request.category
      );

      // Mettre en cache
      this.cache.set(cacheKey, {
        distractors: validatedDistractors,
        timestamp: Date.now()
      });

      return {
        success: true,
        distractors: validatedDistractors,
        confidence: this.calculateConfidence(validatedDistractors, request),
        strategy: 'ai_generated'
      };

    } catch (error) {
      return {
        success: false,
        distractors: this.generateFallbackDistractors(
          request.correctAnswer,
          request.category,
          request.count || 3
        ),
        confidence: 0.3,
        strategy: 'fallback',
        warnings: [`Erreur génération IA: ${error instanceof Error ? error.message : 'Erreur inconnue'}`]
      };
    }
  }

  /**
   * Analyse une flashcard pour optimiser la génération
   */
  private analyzeFlashcard(card: ImportFlashcard): FlashcardAnalysis {
    const front = card.front.toLowerCase();
    const back = card.back.toLowerCase();

    // Détecter le type
    let type: 'definition' | 'factual' | 'conceptual' | 'procedural' = 'factual';

    if (front.includes('définition') || front.includes('qu\'est-ce que') || front.includes('define')) {
      type = 'definition';
    } else if (front.includes('comment') || front.includes('procédure') || front.includes('étapes')) {
      type = 'procedural';
    } else if (front.includes('pourquoi') || front.includes('expliquez') || front.includes('concept')) {
      type = 'conceptual';
    }

    // Évaluer la complexité
    const totalWords = front.split(/\s+/).length + back.split(/\s+/).length;
    const complexity = totalWords < 15 ? 'simple' : totalWords < 40 ? 'medium' : 'complex';

    // Détecter les caractéristiques
    const hasNumericAnswer = /\d+/.test(back);
    const hasListAnswer = back.includes(',') || back.includes(';') || back.includes('\n');

    // Détecter la spécialité médicale
    const medicalSpecialty = this.detectMedicalSpecialty(card.category, front + ' ' + back);

    // Extraire les termes clés
    const keyTerms = this.extractKeyTerms(front + ' ' + back);

    return {
      type,
      complexity,
      hasNumericAnswer,
      hasListAnswer,
      medicalSpecialty,
      keyTerms
    };
  }

  /**
   * Construit le contexte pour la génération
   */
  private buildContext(card: ImportFlashcard, analysis: FlashcardAnalysis): string {
    let context = `Domaine médical: ${analysis.medicalSpecialty}\n`;
    context += `Type de question: ${analysis.type}\n`;
    context += `Complexité: ${analysis.complexity}\n`;

    if (analysis.keyTerms.length > 0) {
      context += `Termes clés: ${analysis.keyTerms.join(', ')}\n`;
    }

    if (card.tags && card.tags.length > 0) {
      context += `Tags: ${card.tags.join(', ')}\n`;
    }

    return context;
  }

  /**
   * Construit le prompt pour la génération de distracteurs
   */
  private buildDistractorPrompt(request: DistractorGenerationRequest): string {
    const basePrompt = `Tu es un expert en création de questions médicales. 

CONTEXTE:
${request.context || ''}

QUESTION: ${request.question}
BONNE RÉPONSE: ${request.correctAnswer}
CATÉGORIE: ${request.category}
DIFFICULTÉ: ${request.difficulty}

TÂCHE: Génère ${request.count || 3} distracteurs (mauvaises réponses) pour cette question médicale.

CRITÈRES POUR LES DISTRACTEURS:
1. Plausibles mais incorrects
2. Même niveau de complexité que la bonne réponse
3. Relatifs au même domaine médical
4. Éviter les réponses évidemment fausses
5. Varier les types d'erreurs (conceptuelle, factuelle, procédurale)

FORMAT DE RÉPONSE:
Retourne uniquement les distracteurs, un par ligne, sans numérotation ni formatage:
[distracteur 1]
[distracteur 2]
[distracteur 3]

EXEMPLE pour "Quelle est la fonction du ventricule gauche ?" → "Pomper le sang oxygéné vers l'aorte":
Recevoir le sang veineux des poumons
Pomper le sang désoxygéné vers les poumons  
Réguler la pression artérielle systémique

Génère maintenant les distracteurs:`;

    return basePrompt;
  }

  /**
   * Parse la réponse de l'IA pour extraire les distracteurs
   */
  private parseDistractorResponse(response: string, count: number): string[] {
    const lines = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.match(/^\d+\./) && !line.includes(':'))
      .slice(0, count);

    return lines;
  }

  /**
   * Valide et filtre les distracteurs générés
   */
  private validateDistractors(
    distractors: string[],
    correctAnswer: string,
    category: string
  ): string[] {
    const validated = distractors.filter(distractor => {
      // Éviter les doublons avec la bonne réponse
      if (distractor.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
        return false;
      }

      // Éviter les distracteurs trop courts ou trop longs
      if (distractor.length < 3 || distractor.length > 200) {
        return false;
      }

      // Éviter les distracteurs génériques évidents
      const genericPatterns = [
        /^option [a-z]$/i,
        /^réponse incorrecte/i,
        /^mauvaise réponse/i,
        /^aucune des réponses/i
      ];

      if (genericPatterns.some(pattern => pattern.test(distractor))) {
        return false;
      }

      return true;
    });

    // S'assurer d'avoir au moins 3 distracteurs valides
    while (validated.length < 3) {
      validated.push(...this.generateFallbackDistractors(correctAnswer, category, 3 - validated.length));
    }

    return validated.slice(0, 3);
  }

  /**
   * Calcule la confiance dans les distracteurs générés
   */
  private calculateConfidence(distractors: string[], request: DistractorGenerationRequest): number {
    let confidence = 0.7; // Base

    // Bonus si tous les distracteurs sont uniques
    const uniqueDistractors = new Set(distractors.map(d => d.toLowerCase()));
    if (uniqueDistractors.size === distractors.length) {
      confidence += 0.1;
    }

    // Bonus si les distracteurs sont de longueur appropriée
    const avgLength = distractors.reduce((sum, d) => sum + d.length, 0) / distractors.length;
    const correctLength = request.correctAnswer.length;

    if (Math.abs(avgLength - correctLength) < correctLength * 0.5) {
      confidence += 0.1;
    }

    // Malus si des distracteurs semblent génériques
    const hasGeneric = distractors.some(d =>
      d.toLowerCase().includes('option') ||
      d.toLowerCase().includes('incorrecte')
    );

    if (hasGeneric) {
      confidence -= 0.2;
    }

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Génère des distracteurs de secours
   */
  private generateFallbackDistractors(
    correctAnswer: string,
    category: string,
    count: number
  ): string[] {
    const categoryDistractors: Record<string, string[]> = {
      'Cardiologie': [
        'Ventricule droit',
        'Oreillette gauche',
        'Valve tricuspide',
        'Artère pulmonaire',
        'Veine cave supérieure'
      ],
      'Anatomie': [
        'Structure adjacente',
        'Organe voisin',
        'Tissu conjonctif',
        'Membrane séreuse',
        'Fascia superficiel'
      ],
      'Physiologie': [
        'Processus inverse',
        'Mécanisme compensatoire',
        'Régulation négative',
        'Feedback positif',
        'Homéostasie'
      ],
      'Pharmacologie': [
        'Médicament antagoniste',
        'Effet secondaire',
        'Interaction médicamenteuse',
        'Métabolite inactif',
        'Voie d\'administration alternative'
      ]
    };

    const fallbacks = categoryDistractors[category] || [
      'Option alternative A',
      'Option alternative B',
      'Option alternative C',
      'Processus différent',
      'Mécanisme alternatif'
    ];

    return fallbacks.slice(0, count);
  }

  /**
   * Détecte la spécialité médicale
   */
  private detectMedicalSpecialty(category: string, text: string): string {
    const specialties: Record<string, string[]> = {
      'Cardiologie': ['cœur', 'cardiaque', 'ventricule', 'oreillette', 'valve', 'artère', 'veine'],
      'Neurologie': ['cerveau', 'neurone', 'synapse', 'cortex', 'système nerveux'],
      'Pneumologie': ['poumon', 'respiratoire', 'alvéole', 'bronche', 'trachée'],
      'Gastroentérologie': ['estomac', 'intestin', 'foie', 'pancréas', 'digestif'],
      'Endocrinologie': ['hormone', 'glande', 'thyroïde', 'pancréas', 'surrénale'],
      'Anatomie': ['anatomie', 'structure', 'organe', 'tissu', 'système']
    };

    const lowerText = text.toLowerCase();

    for (const [specialty, keywords] of Object.entries(specialties)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return specialty;
      }
    }

    return category || 'Médecine générale';
  }

  /**
   * Extrait les termes clés du texte
   */
  private extractKeyTerms(text: string): string[] {
    const medicalTerms = [
      'ventricule', 'oreillette', 'valve', 'artère', 'veine',
      'neurone', 'synapse', 'cortex', 'cerveau',
      'poumon', 'alvéole', 'bronche', 'trachée',
      'hormone', 'glande', 'thyroïde', 'pancréas',
      'estomac', 'intestin', 'foie', 'rein'
    ];

    const lowerText = text.toLowerCase();
    return medicalTerms.filter(term => lowerText.includes(term));
  }

  /**
   * Génère une clé de cache
   */
  private generateCacheKey(request: DistractorGenerationRequest): string {
    return `${request.question}-${request.correctAnswer}-${request.category}-${request.difficulty}`;
  }

  /**
   * Nettoie le cache expiré
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}