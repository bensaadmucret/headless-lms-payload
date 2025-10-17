/**
 * Service spécialisé pour l'import de flashcards
 * Gère la validation, conversion et traitement des flashcards
 */

import payload from 'payload';
import {
  FlashcardImportData,
  ImportFlashcard,
  ImportError,
  ImportResult,
  ValidationResponse
} from '../types/jsonImport';
import { JSONValidationService } from './JSONValidationService';
import { SpacedRepetitionSchedulingService } from './SpacedRepetitionSchedulingService';

export interface FlashcardProcessingResult {
  success: boolean;
  results: ImportResult[];
  errors: ImportError[];
  createdIds: string[];
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    converted: number; // Flashcards converties en questions
    spacedRepetitionScheduleId?: string; // ID du planning de répétition espacée créé
  };
}

export interface FlashcardValidationOptions {
  validateMediaReferences: boolean;
  checkDuplicates: boolean;
  validateCategories: boolean;
  requireImages: boolean;
}

export class FlashcardImportService {
  private validationService: JSONValidationService;
  private spacedRepetitionService: SpacedRepetitionSchedulingService;

  constructor() {
    this.validationService = new JSONValidationService();
    this.spacedRepetitionService = new SpacedRepetitionSchedulingService();
  }

  /**
   * Valide spécifiquement les flashcards avec options avancées
   */
  async validateFlashcards(
    data: FlashcardImportData,
    options: FlashcardValidationOptions = {
      validateMediaReferences: true,
      checkDuplicates: true,
      validateCategories: true,
      requireImages: false
    }
  ): Promise<ValidationResponse> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    try {
      // Validation de base avec le service général
      const baseValidation = await this.validationService.validateImportData(data, 'flashcards');
      errors.push(...baseValidation.errors);
      warnings.push(...baseValidation.warnings);

      // Validations spécifiques aux flashcards
      await this.validateFlashcardStructure(data, errors, warnings, options);
      await this.validateMediaReferences(data, errors, warnings, options);
      this.validateFlashcardMetadata(data, errors, warnings);

      // Détection des doublons si activée
      if (options.checkDuplicates) {
        this.detectDuplicateFlashcards(data, warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary: {
          totalItems: data.cards.length,
          validItems: data.cards.length - errors.filter(e => e.itemIndex !== undefined).length,
          invalidItems: errors.filter(e => e.itemIndex !== undefined).length,
          duplicates: warnings.filter(w => w.message.includes('dupliquée')).length,
          missingCategories: this.extractMissingCategories(data, errors, warnings)
        }
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'system',
          severity: 'critical',
          message: `Erreur lors de la validation des flashcards: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez le format du fichier et réessayez'
        }],
        warnings: [],
        summary: {
          totalItems: 0,
          validItems: 0,
          invalidItems: 0,
          duplicates: 0,
          missingCategories: []
        }
      };
    }
  }

  /**
   * Traite l'import de flashcards avec conversion optionnelle en questions
   * et création automatique de plannings de répétition espacée
   */
  async processFlashcards(
    data: FlashcardImportData,
    userId: string,
    convertToQuestions: boolean = true,
    createSpacedRepetitionSchedule: boolean = true
  ): Promise<FlashcardProcessingResult> {
    const results: ImportResult[] = [];
    const errors: ImportError[] = [];
    const createdIds: string[] = [];
    let successful = 0;
    let failed = 0;
    let converted = 0;

    for (let i = 0; i < data.cards.length; i++) {
      const card = data.cards[i];
      if (!card) continue;

      try {
        if (convertToQuestions) {
          // Convertir la flashcard en question QCM
          const convertedQuestion = await this.convertFlashcardToQuestion(card, data.metadata, userId);
          
          // Créer la question en base de données
          const createdQuestion = await payload.create({
            collection: 'questions',
            data: convertedQuestion
          });

          results.push({
            type: 'flashcard',
            sourceIndex: i,
            payloadId: String(createdQuestion.id),
            status: 'success',
            message: 'Flashcard convertie en question avec succès'
          });

          createdIds.push(String(createdQuestion.id));
          successful++;
          converted++;

        } else {
          // Créer directement la flashcard (si une collection flashcard existe)
          // Pour l'instant, on convertit toujours en question
          const convertedQuestion = await this.convertFlashcardToQuestion(card, data.metadata, userId);
          
          const createdQuestion = await payload.create({
            collection: 'questions',
            data: convertedQuestion
          });

          results.push({
            type: 'flashcard',
            sourceIndex: i,
            payloadId: String(createdQuestion.id),
            status: 'success',
            message: 'Flashcard importée avec succès'
          });

          createdIds.push(String(createdQuestion.id));
          successful++;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

        results.push({
          type: 'flashcard',
          sourceIndex: i,
          status: 'error',
          message: `Échec d'import: ${errorMessage}`
        });

        errors.push({
          type: 'database',
          severity: 'major',
          itemIndex: i,
          message: `Erreur lors de l'import de la flashcard ${i + 1}: ${errorMessage}`,
          suggestion: 'Vérifiez les données de la flashcard et les permissions'
        });

        failed++;
      }
    }

    // Créer un planning de répétition espacée si demandé et si des questions ont été créées
    let spacedRepetitionScheduleId: string | null = null;
    if (createSpacedRepetitionSchedule && createdIds.length > 0) {
      try {
        const schedule = await this.spacedRepetitionService.createScheduleForImportedFlashcards(
          userId,
          data.metadata.deckName || 'Deck importé',
          createdIds,
          {
            difficulty: this.inferDeckDifficulty(data),
            category: data.metadata.category,
            estimatedSessionDuration: Math.min(60, createdIds.length * 2) // 2 min par carte, max 60 min
          }
        );
        
        spacedRepetitionScheduleId = schedule.id;
        
        // Ajouter une information dans les résultats
        results.push({
          type: 'flashcard',
          sourceIndex: -1, // Pas lié à une carte spécifique
          payloadId: schedule.id,
          status: 'success',
          message: `Planning de répétition espacée créé avec ${createdIds.length} cartes`
        });

        console.log(`Planning de répétition espacée créé: ${schedule.id} pour ${createdIds.length} flashcards`);

      } catch (error) {
        console.error('Erreur lors de la création du planning de répétition espacée:', error);
        
        // Ajouter un avertissement mais ne pas faire échouer l'import
        errors.push({
          type: 'system',
          severity: 'warning',
          message: `Impossible de créer le planning de répétition espacée: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Les flashcards ont été importées mais sans planning automatique'
        });
      }
    }

    return {
      success: errors.filter(e => e.severity === 'critical').length === 0,
      results,
      errors,
      createdIds,
      summary: {
        totalProcessed: data.cards.length,
        successful,
        failed,
        converted,
        spacedRepetitionScheduleId
      }
    };
  }

  /**
   * Valide la structure spécifique des flashcards
   */
  private async validateFlashcardStructure(
    data: FlashcardImportData,
    errors: ImportError[],
    warnings: ImportError[],
    options: FlashcardValidationOptions
  ): Promise<void> {
    try {
      data.cards.forEach((card, index) => {
        // Validation du contenu recto/verso
        this.validateFlashcardContent(card, index, errors, warnings);
        
        // Validation des métadonnées de la flashcard
        this.validateFlashcardFields(card, index, errors, warnings, options);
        
        // Validation de la cohérence recto/verso
        this.validateFlashcardCoherence(card, index, errors, warnings);
      });

      // Validation de la cohérence du deck
      this.validateDeckCoherence(data, errors, warnings);

    } catch (error) {
      errors.push({
        type: 'system',
        severity: 'major',
        message: `Erreur lors de la validation de structure: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        suggestion: 'Vérifiez la structure des flashcards'
      });
    }
  }

  /**
   * Valide le contenu d'une flashcard (recto/verso)
   */
  private validateFlashcardContent(
    card: ImportFlashcard,
    index: number,
    errors: ImportError[],
    warnings: ImportError[]
  ): void {
    // Validation de la longueur du contenu
    if (card.front.length < 5) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        field: 'front',
        message: 'Contenu recto très court',
        suggestion: 'Assurez-vous que le contenu est suffisamment détaillé'
      });
    }

    if (card.back.length < 5) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        field: 'back',
        message: 'Contenu verso très court',
        suggestion: 'Assurez-vous que le contenu est suffisamment détaillé'
      });
    }

    // Vérifier que le recto et le verso ne sont pas identiques
    if (card.front.toLowerCase().trim() === card.back.toLowerCase().trim()) {
      errors.push({
        type: 'validation',
        severity: 'major',
        itemIndex: index,
        message: 'Le recto et le verso de la flashcard sont identiques',
        suggestion: 'Le verso doit contenir la réponse ou l\'explication du recto'
      });
    }

    // Validation de la longueur maximale
    if (card.front.length > 500) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        field: 'front',
        message: 'Contenu recto très long',
        suggestion: 'Raccourcissez le contenu pour améliorer la lisibilité'
      });
    }

    if (card.back.length > 1000) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        field: 'back',
        message: 'Contenu verso très long',
        suggestion: 'Raccourcissez le contenu pour améliorer la lisibilité'
      });
    }
  }

  /**
   * Valide les champs spécifiques des flashcards
   */
  private validateFlashcardFields(
    card: ImportFlashcard,
    index: number,
    errors: ImportError[],
    warnings: ImportError[],
    options: FlashcardValidationOptions
  ): void {
    // Validation de la catégorie
    if (!card.category || card.category.trim().length === 0) {
      errors.push({
        type: 'validation',
        severity: 'major',
        itemIndex: index,
        field: 'category',
        message: 'Catégorie manquante pour la flashcard',
        suggestion: 'Spécifiez une catégorie valide'
      });
    }

    // Validation de la difficulté
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(card.difficulty)) {
      errors.push({
        type: 'validation',
        severity: 'major',
        itemIndex: index,
        field: 'difficulty',
        message: `Niveau de difficulté invalide: "${card.difficulty}"`,
        suggestion: `Utilisez une des valeurs: ${validDifficulties.join(', ')}`
      });
    }

    // Validation des tags
    if (card.tags) {
      card.tags.forEach((tag, tagIndex) => {
        if (!tag || tag.trim().length === 0) {
          warnings.push({
            type: 'validation',
            severity: 'minor',
            itemIndex: index,
            field: `tags[${tagIndex}]`,
            message: 'Tag vide détecté',
            suggestion: 'Supprimez les tags vides'
          });
        }
      });

      // Vérifier les doublons dans les tags
      const uniqueTags = new Set(card.tags.map(tag => tag.toLowerCase().trim()));
      if (card.tags.length !== uniqueTags.size) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          itemIndex: index,
          field: 'tags',
          message: 'Tags dupliqués détectés',
          suggestion: 'Supprimez les tags en double'
        });
      }
    }

    // Validation de l'image si requise
    if (options.requireImages && !card.imageUrl) {
      warnings.push({
        type: 'validation',
        severity: 'warning',
        itemIndex: index,
        field: 'imageUrl',
        message: 'Image manquante pour cette flashcard',
        suggestion: 'Ajoutez une image pour améliorer l\'apprentissage visuel'
      });
    }
  }

  /**
   * Valide la cohérence entre recto et verso
   */
  private validateFlashcardCoherence(
    card: ImportFlashcard,
    index: number,
    errors: ImportError[],
    warnings: ImportError[]
  ): void {
    // Vérifier si le verso répond bien au recto
    const frontWords = card.front.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const backWords = card.back.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    
    const commonWords = frontWords.filter(word => backWords.includes(word));
    
    if (commonWords.length === 0 && frontWords.length > 2 && backWords.length > 2) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        message: 'Le verso semble peu lié au recto',
        suggestion: 'Vérifiez que le verso répond bien à la question du recto'
      });
    }

    // Vérifier si c'est une vraie question/réponse
    if (!card.front.includes('?') && !card.front.toLowerCase().includes('qu')) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        itemIndex: index,
        field: 'front',
        message: 'Le recto ne semble pas être une question',
        suggestion: 'Formulez le recto comme une question pour améliorer l\'apprentissage'
      });
    }
  }

  /**
   * Valide la cohérence du deck de flashcards
   */
  private validateDeckCoherence(
    data: FlashcardImportData,
    errors: ImportError[],
    warnings: ImportError[]
  ): void {
    // Vérifier la cohérence des catégories
    const categories = new Set(data.cards.map(card => card.category));
    if (categories.size > 5) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        message: `Beaucoup de catégories différentes dans le deck (${categories.size})`,
        suggestion: 'Considérez diviser le deck par catégorie pour une meilleure organisation'
      });
    }

    // Vérifier la distribution des difficultés
    const difficulties = data.cards.map(card => card.difficulty);
    const diffCounts = { easy: 0, medium: 0, hard: 0 };
    difficulties.forEach(diff => diffCounts[diff]++);

    const totalCards = data.cards.length;
    if (diffCounts.easy / totalCards > 0.8) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        message: 'Beaucoup de flashcards faciles (>80%)',
        suggestion: 'Ajoutez des flashcards de difficulté moyenne et difficile pour un apprentissage progressif'
      });
    }

    if (diffCounts.hard / totalCards > 0.5) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        message: 'Beaucoup de flashcards difficiles (>50%)',
        suggestion: 'Ajoutez des flashcards plus faciles pour faciliter l\'apprentissage initial'
      });
    }

    // Vérifier la taille du deck
    if (data.cards.length > 200) {
      warnings.push({
        type: 'validation',
        severity: 'minor',
        message: `Deck très volumineux (${data.cards.length} flashcards)`,
        suggestion: 'Considérez diviser le deck en plusieurs parties pour faciliter l\'apprentissage'
      });
    }
  }

  /**
   * Valide les références média dans les flashcards
   */
  private async validateMediaReferences(
    data: FlashcardImportData,
    errors: ImportError[],
    warnings: ImportError[],
    options: FlashcardValidationOptions
  ): Promise<void> {
    if (!options.validateMediaReferences) return;

    for (let i = 0; i < data.cards.length; i++) {
      const card = data.cards[i];
      if (!card?.imageUrl) continue;

      try {
        // Valider le format de l'URL
        new URL(card.imageUrl);

        // Vérifier l'extension du fichier
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const hasValidExtension = validExtensions.some(ext => 
          card.imageUrl!.toLowerCase().includes(ext)
        );

        if (!hasValidExtension) {
          warnings.push({
            type: 'validation',
            severity: 'warning',
            itemIndex: i,
            field: 'imageUrl',
            message: 'Format d\'image non reconnu',
            suggestion: 'Utilisez des formats d\'image standards (JPG, PNG, WebP, etc.)'
          });
        }

      } catch {
        errors.push({
          type: 'validation',
          severity: 'major',
          itemIndex: i,
          field: 'imageUrl',
          message: 'URL d\'image invalide',
          suggestion: 'Vérifiez que l\'URL de l\'image est correcte et accessible'
        });
      }
    }
  }

  /**
   * Valide les métadonnées du deck
   */
  private validateFlashcardMetadata(
    data: FlashcardImportData,
    errors: ImportError[],
    warnings: ImportError[]
  ): void {
    // Validation du nom du deck
    if (!data.metadata.deckName || data.metadata.deckName.trim().length === 0) {
      errors.push({
        type: 'validation',
        severity: 'major',
        field: 'metadata.deckName',
        message: 'Nom du deck manquant',
        suggestion: 'Spécifiez un nom pour le deck de flashcards'
      });
    }

    // Validation de la catégorie principale
    if (!data.metadata.category || data.metadata.category.trim().length === 0) {
      errors.push({
        type: 'validation',
        severity: 'major',
        field: 'metadata.category',
        message: 'Catégorie principale du deck manquante',
        suggestion: 'Spécifiez une catégorie principale pour le deck'
      });
    }

    // Vérifier la cohérence entre catégorie du deck et catégories des cartes
    if (data.metadata.category) {
      const cardCategories = new Set(data.cards.map(card => card.category));
      if (!cardCategories.has(data.metadata.category)) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          field: 'metadata.category',
          message: 'La catégorie du deck ne correspond à aucune carte',
          suggestion: 'Vérifiez la cohérence entre la catégorie du deck et celles des cartes'
        });
      }
    }
  }

  /**
   * Convertit une flashcard en question QCM
   */
  private async convertFlashcardToQuestion(
    card: ImportFlashcard,
    metadata: any,
    _userId: string
  ): Promise<any> {
    // Résoudre la catégorie
    const categoryId = await this.resolveCategoryId(card.category, metadata.level || 'both');

    // Convertir le recto en question
    const questionText = this.convertTextToLexical(card.front);

    // Créer des options avec la bonne réponse et des distracteurs
    const options = await this.generateOptionsFromFlashcard(card);

    // Mapper les tags
    const mappedTags = card.tags ? card.tags.map(tag => ({ tag })) : [];

    return {
      questionText: questionText,
      questionType: 'multipleChoice',
      options: options,
      explanation: `Réponse: ${card.back}`,
      category: categoryId,
      difficulty: card.difficulty,
      studentLevel: metadata.level || 'both',
      tags: mappedTags,
      generatedByAI: false,
      validatedByExpert: false,
      validationStatus: 'needs_review', // Les flashcards converties nécessitent une révision
      sourceType: 'flashcard_import',
      originalFlashcard: {
        front: card.front,
        back: card.back,
        imageUrl: card.imageUrl
      }
    };
  }

  /**
   * Génère des options QCM à partir d'une flashcard
   */
  private async generateOptionsFromFlashcard(card: ImportFlashcard): Promise<Array<{ optionText: string; isCorrect: boolean }>> {
    const options = [
      {
        optionText: card.back,
        isCorrect: true
      }
    ];

    // Générer des distracteurs basiques
    // TODO: Améliorer avec l'IA pour générer des distracteurs contextuels
    const distractors = this.generateBasicDistractors(card.back, card.category);
    
    distractors.forEach(distractor => {
      options.push({
        optionText: distractor,
        isCorrect: false
      });
    });

    // Mélanger les options pour que la bonne réponse ne soit pas toujours en premier
    return this.shuffleArray(options);
  }

  /**
   * Génère des distracteurs basiques pour une flashcard
   */
  private generateBasicDistractors(correctAnswer: string, category: string): string[] {
    // Distracteurs génériques basés sur la catégorie
    const categoryDistractors: Record<string, string[]> = {
      'Cardiologie': [
        'Ventricule droit',
        'Oreillette gauche',
        'Valve mitrale',
        'Artère pulmonaire'
      ],
      'Anatomie': [
        'Structure adjacente',
        'Organe voisin',
        'Tissu conjonctif',
        'Membrane séreuse'
      ],
      'Physiologie': [
        'Processus inverse',
        'Mécanisme compensatoire',
        'Régulation négative',
        'Feedback positif'
      ]
    };

    const specificDistractors = categoryDistractors[category] || [
      'Option incorrecte A',
      'Option incorrecte B',
      'Option incorrecte C'
    ];

    // Retourner 3 distracteurs
    return specificDistractors.slice(0, 3);
  }

  /**
   * Mélange un tableau (algorithme Fisher-Yates)
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
   * Résout l'ID d'une catégorie par son nom, la crée si nécessaire
   */
  private async resolveCategoryId(categoryName: string, level: string): Promise<string> {
    try {
      // Chercher la catégorie existante
      const existingCategory = await payload.find({
        collection: 'categories',
        where: {
          title: {
            equals: categoryName
          }
        },
        limit: 1
      });

      if (existingCategory.docs.length > 0) {
        return String(existingCategory.docs[0]?.id);
      }

      // Créer une nouvelle catégorie si elle n'existe pas
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
   * Convertit du texte simple en structure RichText Lexical
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

  /**
   * Détecte les flashcards dupliquées
   */
  private detectDuplicateFlashcards(data: FlashcardImportData, warnings: ImportError[]): void {
    const seen = new Map<string, number>();

    data.cards.forEach((card, index) => {
      const key = `${card.front.toLowerCase().trim()}-${card.back.toLowerCase().trim()}`;
      
      if (seen.has(key)) {
        const firstIndex = seen.get(key)!;
        warnings.push({
          type: 'validation',
          severity: 'warning',
          itemIndex: index,
          message: `Flashcard dupliquée (identique à la flashcard ${firstIndex + 1})`,
          suggestion: 'Supprimez cette flashcard ou modifiez-la pour la différencier'
        });
      } else {
        seen.set(key, index);
      }
    });
  }

  /**
   * Extrait les catégories manquantes des erreurs et avertissements
   */
  private extractMissingCategories(
    data: FlashcardImportData,
    errors: ImportError[],
    warnings: ImportError[]
  ): string[] {
    const missingCategories = new Set<string>();

    // Ajouter les catégories des avertissements de référence
    warnings.forEach(warning => {
      if (warning.type === 'reference' && warning.message.includes('n\'existe pas')) {
        const match = warning.message.match(/Catégorie "([^"]+)"/);
        if (match) {
          missingCategories.add(match[1]!);
        }
      }
    });

    // Ajouter la catégorie principale si elle génère des erreurs
    if (data.metadata.category) {
      const hasReferenceError = errors.some(error => 
        error.type === 'reference' && error.message.includes(data.metadata.category)
      );
      if (hasReferenceError) {
        missingCategories.add(data.metadata.category);
      }
    }

    return Array.from(missingCategories);
  }

  /**
   * Infère la difficulté générale d'un deck basée sur les difficultés des cartes
   */
  private inferDeckDifficulty(data: FlashcardImportData): 'easy' | 'medium' | 'hard' {
    const difficulties = data.cards.map(card => card.difficulty);
    const diffCounts = { easy: 0, medium: 0, hard: 0 };
    
    difficulties.forEach(diff => {
      if (diff in diffCounts) {
        diffCounts[diff as keyof typeof diffCounts]++;
      }
    });

    const total = difficulties.length;
    
    // Si plus de 60% des cartes sont difficiles
    if (diffCounts.hard / total > 0.6) {
      return 'hard';
    }
    
    // Si plus de 60% des cartes sont faciles
    if (diffCounts.easy / total > 0.6) {
      return 'easy';
    }
    
    // Sinon, difficulté moyenne
    return 'medium';
  }
}