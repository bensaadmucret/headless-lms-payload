/**
 * Service de conversion de flashcards vers questions QCM
 * Gère la conversion automatique avec génération intelligente de distracteurs
 */

import payload from 'payload';
import {
  ImportFlashcard,
  ImportError,
  ImportResult
} from '../types/jsonImport';
import { AIDistractorGenerationService } from './AIDistractorGenerationService';

export interface ConversionOptions {
  generateDistractors: boolean;
  preserveMetadata: boolean;
  useAIDistractors: boolean;
  targetQuestionType: 'multipleChoice' | 'trueFalse' | 'fillInBlanks';
}

export interface ConversionResult {
  success: boolean;
  convertedQuestion: any;
  warnings: string[];
  distractorsGenerated: number;
}

export class FlashcardConversionService {
  private aiDistractorService: AIDistractorGenerationService;

  constructor() {
    this.aiDistractorService = new AIDistractorGenerationService();
  }

  /**
   * Convertit une flashcard en question QCM avec distracteurs intelligents
   */
  async convertToQuestion(
    card: ImportFlashcard,
    metadata: any,
    options: ConversionOptions = {
      generateDistractors: true,
      preserveMetadata: true,
      useAIDistractors: false,
      targetQuestionType: 'multipleChoice'
    }
  ): Promise<ConversionResult> {
    try {
      const warnings: string[] = [];

      // Analyser le type de flashcard pour optimiser la conversion
      const cardAnalysis = this.analyzeFlashcardType(card);
      
      // Générer la question selon le type détecté
      let convertedQuestion: any;
      
      switch (options.targetQuestionType) {
        case 'multipleChoice':
          convertedQuestion = await this.convertToMultipleChoice(card, metadata, options, cardAnalysis);
          break;
        case 'trueFalse':
          convertedQuestion = await this.convertToTrueFalse(card, metadata, options);
          break;
        case 'fillInBlanks':
          convertedQuestion = await this.convertToFillInBlanks(card, metadata, options);
          break;
        default:
          convertedQuestion = await this.convertToMultipleChoice(card, metadata, options, cardAnalysis);
      }

      // Ajouter les métadonnées de conversion
      if (options.preserveMetadata) {
        convertedQuestion.conversionMetadata = {
          originalType: 'flashcard',
          convertedAt: new Date(),
          cardAnalysis: cardAnalysis,
          conversionOptions: options
        };
      }

      return {
        success: true,
        convertedQuestion,
        warnings,
        distractorsGenerated: convertedQuestion.options?.length - 1 || 0
      };

    } catch (error) {
      return {
        success: false,
        convertedQuestion: null,
        warnings: [`Erreur lors de la conversion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`],
        distractorsGenerated: 0
      };
    }
  }

  /**
   * Analyse le type de flashcard pour optimiser la conversion
   */
  private analyzeFlashcardType(card: ImportFlashcard): {
    type: 'definition' | 'factual' | 'conceptual' | 'procedural';
    complexity: 'simple' | 'medium' | 'complex';
    hasNumericAnswer: boolean;
    hasListAnswer: boolean;
    suggestedDistractorStrategy: string;
  } {
    const front = card.front.toLowerCase();
    const back = card.back.toLowerCase();

    // Détecter le type de flashcard
    let type: 'definition' | 'factual' | 'conceptual' | 'procedural' = 'factual';
    
    if (front.includes('définition') || front.includes('qu\'est-ce que') || front.includes('define')) {
      type = 'definition';
    } else if (front.includes('comment') || front.includes('procédure') || front.includes('étapes')) {
      type = 'procedural';
    } else if (front.includes('pourquoi') || front.includes('expliquez') || front.includes('concept')) {
      type = 'conceptual';
    }

    // Évaluer la complexité
    const complexity = this.evaluateComplexity(card);

    // Détecter les réponses numériques
    const hasNumericAnswer = /\d+/.test(back);

    // Détecter les réponses en liste
    const hasListAnswer = back.includes(',') || back.includes(';') || back.includes('\n');

    // Suggérer une stratégie de distracteurs
    let suggestedDistractorStrategy = 'generic';
    if (type === 'definition') {
      suggestedDistractorStrategy = 'similar_concepts';
    } else if (hasNumericAnswer) {
      suggestedDistractorStrategy = 'numeric_variants';
    } else if (type === 'procedural') {
      suggestedDistractorStrategy = 'procedure_variants';
    }

    return {
      type,
      complexity,
      hasNumericAnswer,
      hasListAnswer,
      suggestedDistractorStrategy
    };
  }

  /**
   * Évalue la complexité d'une flashcard
   */
  private evaluateComplexity(card: ImportFlashcard): 'simple' | 'medium' | 'complex' {
    const frontWords = card.front.split(/\s+/).length;
    const backWords = card.back.split(/\s+/).length;
    const totalWords = frontWords + backWords;

    if (totalWords < 15) return 'simple';
    if (totalWords < 40) return 'medium';
    return 'complex';
  }

  /**
   * Convertit en question à choix multiples
   */
  private async convertToMultipleChoice(
    card: ImportFlashcard,
    metadata: any,
    options: ConversionOptions,
    cardAnalysis: any
  ): Promise<any> {
    // Résoudre la catégorie
    const categoryId = await this.resolveCategoryId(card.category, metadata.level || 'both');

    // Convertir le texte en format Lexical
    const questionText = this.convertTextToLexical(card.front);

    // Générer les options avec distracteurs
    const options_array = await this.generateOptionsWithDistractors(
      card, 
      cardAnalysis, 
      options.useAIDistractors
    );

    // Mapper les tags
    const mappedTags = card.tags ? card.tags.map(tag => ({ tag })) : [];

    return {
      questionText: questionText,
      questionType: 'multipleChoice',
      options: options_array,
      explanation: this.generateExplanation(card, cardAnalysis),
      category: categoryId,
      difficulty: card.difficulty,
      studentLevel: metadata.level || 'both',
      tags: mappedTags,
      generatedByAI: options.useAIDistractors,
      validatedByExpert: false,
      validationStatus: 'needs_review',
      sourceType: 'flashcard_conversion'
    };
  }

  /**
   * Convertit en question vrai/faux
   */
  private async convertToTrueFalse(
    card: ImportFlashcard,
    metadata: any,
    options: ConversionOptions
  ): Promise<any> {
    const categoryId = await this.resolveCategoryId(card.category, metadata.level || 'both');

    // Reformuler comme affirmation
    const statement = this.convertToStatement(card.front, card.back);
    const questionText = this.convertTextToLexical(statement);

    const options_array = [
      { optionText: 'Vrai', isCorrect: true },
      { optionText: 'Faux', isCorrect: false }
    ];

    const mappedTags = card.tags ? card.tags.map(tag => ({ tag })) : [];

    return {
      questionText: questionText,
      questionType: 'trueFalse',
      options: options_array,
      explanation: `Réponse correcte: ${card.back}`,
      category: categoryId,
      difficulty: card.difficulty,
      studentLevel: metadata.level || 'both',
      tags: mappedTags,
      generatedByAI: false,
      validatedByExpert: false,
      validationStatus: 'needs_review',
      sourceType: 'flashcard_conversion'
    };
  }

  /**
   * Convertit en question à compléter
   */
  private async convertToFillInBlanks(
    card: ImportFlashcard,
    metadata: any,
    options: ConversionOptions
  ): Promise<any> {
    const categoryId = await this.resolveCategoryId(card.category, metadata.level || 'both');

    // Créer une phrase à compléter
    const fillInText = this.createFillInBlanksText(card.front, card.back);
    const questionText = this.convertTextToLexical(fillInText);

    const mappedTags = card.tags ? card.tags.map(tag => ({ tag })) : [];

    return {
      questionText: questionText,
      questionType: 'fillInBlanks',
      correctAnswer: card.back,
      explanation: `La réponse complète est: ${card.back}`,
      category: categoryId,
      difficulty: card.difficulty,
      studentLevel: metadata.level || 'both',
      tags: mappedTags,
      generatedByAI: false,
      validatedByExpert: false,
      validationStatus: 'needs_review',
      sourceType: 'flashcard_conversion'
    };
  }

  /**
   * Génère des options avec distracteurs intelligents
   */
  private async generateOptionsWithDistractors(
    card: ImportFlashcard,
    cardAnalysis: any,
    useAI: boolean
  ): Promise<Array<{ optionText: string; isCorrect: boolean }>> {
    const options = [
      {
        optionText: card.back,
        isCorrect: true
      }
    ];

    // Générer des distracteurs selon la stratégie
    let distractors: string[] = [];

    if (useAI) {
      // TODO: Intégrer avec le service IA pour générer des distracteurs contextuels
      distractors = await this.generateAIDistractors(card, cardAnalysis);
    } else {
      distractors = this.generateRuleBasedDistractors(card, cardAnalysis);
    }

    // Ajouter les distracteurs
    distractors.forEach(distractor => {
      options.push({
        optionText: distractor,
        isCorrect: false
      });
    });

    // Mélanger les options
    return this.shuffleArray(options);
  }

  /**
   * Génère des distracteurs basés sur des règles
   */
  private generateRuleBasedDistractors(
    card: ImportFlashcard,
    cardAnalysis: any
  ): string[] {
    const distractors: string[] = [];
    const correctAnswer = card.back;

    switch (cardAnalysis.suggestedDistractorStrategy) {
      case 'numeric_variants':
        distractors.push(...this.generateNumericDistractors(correctAnswer));
        break;
      
      case 'similar_concepts':
        distractors.push(...this.generateConceptualDistractors(correctAnswer, card.category));
        break;
      
      case 'procedure_variants':
        distractors.push(...this.generateProceduralDistractors(correctAnswer));
        break;
      
      default:
        distractors.push(...this.generateGenericDistractors(correctAnswer, card.category));
    }

    // S'assurer d'avoir au moins 3 distracteurs
    while (distractors.length < 3) {
      distractors.push(`Option incorrecte ${String.fromCharCode(65 + distractors.length)}`);
    }

    return distractors.slice(0, 3);
  }

  /**
   * Génère des distracteurs numériques
   */
  private generateNumericDistractors(correctAnswer: string): string[] {
    const numbers = correctAnswer.match(/\d+/g);
    if (!numbers) return [];

    const distractors: string[] = [];
    const baseNumber = parseInt(numbers[0]!);

    // Générer des variantes numériques
    distractors.push(correctAnswer.replace(numbers[0]!, String(baseNumber + 1)));
    distractors.push(correctAnswer.replace(numbers[0]!, String(baseNumber - 1)));
    distractors.push(correctAnswer.replace(numbers[0]!, String(baseNumber * 2)));

    return distractors;
  }

  /**
   * Génère des distracteurs conceptuels
   */
  private generateConceptualDistractors(correctAnswer: string, category: string): string[] {
    const conceptualMappings: Record<string, string[]> = {
      'Cardiologie': [
        'Ventricule droit',
        'Oreillette gauche',
        'Valve tricuspide',
        'Artère pulmonaire',
        'Veine cave'
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
      ]
    };

    return conceptualMappings[category] || this.generateGenericDistractors(correctAnswer, category);
  }

  /**
   * Génère des distracteurs procéduraux
   */
  private generateProceduralDistractors(correctAnswer: string): string[] {
    return [
      'Procédure inverse',
      'Étape précédente',
      'Méthode alternative',
      'Technique similaire'
    ];
  }

  /**
   * Génère des distracteurs génériques
   */
  private generateGenericDistractors(correctAnswer: string, category: string): string[] {
    return [
      'Option incorrecte A',
      'Option incorrecte B',
      'Option incorrecte C',
      'Aucune des réponses ci-dessus'
    ];
  }

  /**
   * Génère des distracteurs avec IA
   */
  private async generateAIDistractors(
    card: ImportFlashcard,
    cardAnalysis: any
  ): Promise<string[]> {
    try {
      const result = await this.aiDistractorService.generateDistractorsForFlashcard(card, 3);
      
      if (result.success && result.distractors.length >= 3) {
        return result.distractors;
      } else {
        // Fallback vers les distracteurs basés sur des règles
        return this.generateRuleBasedDistractors(card, cardAnalysis);
      }
    } catch (error) {
      // En cas d'erreur, utiliser les distracteurs basés sur des règles
      return this.generateRuleBasedDistractors(card, cardAnalysis);
    }
  }

  /**
   * Génère une explication enrichie
   */
  private generateExplanation(card: ImportFlashcard, cardAnalysis: any): string {
    let explanation = `Réponse: ${card.back}`;

    // Ajouter du contexte selon le type de flashcard
    switch (cardAnalysis.type) {
      case 'definition':
        explanation += '\n\nCette définition est importante pour comprendre les concepts fondamentaux.';
        break;
      case 'procedural':
        explanation += '\n\nCette procédure doit être mémorisée dans l\'ordre correct.';
        break;
      case 'conceptual':
        explanation += '\n\nCe concept est lié à d\'autres notions importantes du domaine.';
        break;
    }

    return explanation;
  }

  /**
   * Convertit une question en affirmation pour vrai/faux
   */
  private convertToStatement(front: string, back: string): string {
    // Logique simple de conversion question -> affirmation
    if (front.toLowerCase().includes('qu\'est-ce que')) {
      return `${back} est la définition de ${front.replace(/qu'est-ce que/i, '').trim()}`;
    }
    
    if (front.includes('?')) {
      return `${front.replace('?', '')} : ${back}`;
    }

    return `${front} : ${back}`;
  }

  /**
   * Crée un texte à compléter
   */
  private createFillInBlanksText(front: string, back: string): string {
    // Remplacer la réponse par des blancs dans la question
    const blanks = '_'.repeat(Math.max(back.length / 2, 5));
    return `${front.replace('?', '')} : ${blanks}`;
  }

  /**
   * Mélange un tableau
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }

  /**
   * Résout l'ID d'une catégorie
   */
  private async resolveCategoryId(categoryName: string, level: string): Promise<string> {
    try {
      const existingCategory = await payload.find({
        collection: 'categories',
        where: {
          title: { equals: categoryName }
        },
        limit: 1
      });

      if (existingCategory.docs.length > 0) {
        return String(existingCategory.docs[0]?.id);
      }

      const newCategory = await payload.create({
        collection: 'categories',
        data: {
          title: categoryName,
          level: level as 'PASS' | 'LAS' | 'both',
          adaptiveSettings: {
            isActive: true,
            minimumQuestions: 5,
            weight: 1
          }
        }
      });

      return String(newCategory.id);

    } catch (error) {
      throw new Error(`Impossible de résoudre la catégorie "${categoryName}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Convertit du texte en format Lexical
   */
  private convertTextToLexical(text: string): any {
    return {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: text,
                type: "text",
                version: 1
              }
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1
          }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1
      }
    };
  }
}