/**
 * Service de workflow de validation humaine obligatoire
 * Responsable de la gestion du processus de validation manuelle avant import
 */

import payload from 'payload';
import { 
  ImportData, 
  ImportPreview, 
  ValidationResponse, 
  ImportError, 
  CategoryMapping,
  ImportType,
  ImportFormat
} from '../types/jsonImport';
import { JSONValidationService } from './JSONValidationService';
import { CSVImportService } from './CSVImportService';

export interface ValidationSession {
  id: string;
  userId: string;
  fileName: string;
  format: ImportFormat;
  importType: ImportType;
  status: 'pending_validation' | 'validated' | 'rejected' | 'expired';
  originalData: ImportData;
  correctedData?: ImportData;
  validationResults: ValidationResponse;
  categoryMappings: CategoryMapping[];
  adminComments?: string;
  validatedBy?: string;
  validatedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
  corrections: ValidationCorrection[];
}

export interface ValidationCorrection {
  itemIndex: number;
  field: string;
  originalValue: any;
  correctedValue: any;
  reason: string;
  appliedBy: string;
  appliedAt: Date;
}

export interface PreviewItem {
  index: number;
  type: 'question' | 'flashcard' | 'learning-step';
  original: any;
  preview: any;
  issues: ImportError[];
  suggestions: string[];
  requiresAttention: boolean;
}

export class HumanValidationWorkflowService {
  private validationSessions = new Map<string, ValidationSession>();
  private jsonValidationService: JSONValidationService;
  private csvImportService: CSVImportService;

  constructor() {
    this.jsonValidationService = new JSONValidationService();
    this.csvImportService = new CSVImportService();
  }

  /**
   * Crée une session de validation pour un fichier uploadé
   */
  async createValidationSession(
    fileContent: string | Buffer,
    fileName: string,
    format: ImportFormat,
    userId: string
  ): Promise<{ sessionId: string; preview: ImportPreview }> {
    try {
      // 1. Parser et convertir les données selon le format
      let importData: ImportData;
      let parsingErrors: ImportError[] = [];

      if (format === 'json') {
        const content = typeof fileContent === 'string' ? fileContent : fileContent.toString('utf-8');
        importData = JSON.parse(content);
      } else if (format === 'csv') {
        const csvResult = await this.csvImportService.parseCSVFile(fileContent);
        if (!csvResult.success || !csvResult.data) {
          throw new Error(`Erreur parsing CSV: ${csvResult.errors.map(e => e.message).join(', ')}`);
        }
        importData = csvResult.data;
        parsingErrors = csvResult.errors;
      } else {
        throw new Error(`Format non supporté: ${format}`);
      }

      // 2. Validation complète des données
      const validationResults = await this.jsonValidationService.validateImportData(
        importData, 
        importData.type
      );

      // Ajouter les erreurs de parsing aux erreurs de validation
      validationResults.errors.push(...parsingErrors);

      // 3. Génération des mappings de catégories intelligents
      const categoryMappings = await this.generateCategoryMappings(importData);

      // 4. Créer la session de validation
      const sessionId = this.generateSessionId();
      const session: ValidationSession = {
        id: sessionId,
        userId,
        fileName,
        format,
        importType: importData.type,
        status: 'pending_validation',
        originalData: importData,
        validationResults,
        categoryMappings,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h d'expiration
        corrections: []
      };

      this.validationSessions.set(sessionId, session);

      // 5. Générer la prévisualisation
      const preview = await this.generateImportPreview(session);

      // 6. Logger la création de session pour audit
      await this.logValidationActivity(userId, 'session_created', {
        sessionId,
        fileName,
        format,
        importType: importData.type,
        itemCount: this.getItemCount(importData)
      });

      return { sessionId, preview };

    } catch (error) {
      throw new Error(`Erreur lors de la création de la session de validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Récupère une session de validation
   */
  getValidationSession(sessionId: string, userId: string): ValidationSession | null {
    const session = this.validationSessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Vérifier les permissions (propriétaire ou admin)
    if (session.userId !== userId) {
      // TODO: Vérifier si l'utilisateur est admin
      return null;
    }

    // Vérifier l'expiration
    if (session.expiresAt < new Date()) {
      session.status = 'expired';
    }

    return session;
  }

  /**
   * Applique des corrections à une session de validation
   */
  async applyCorrections(
    sessionId: string,
    corrections: Array<{
      itemIndex: number;
      field: string;
      newValue: any;
      reason: string;
    }>,
    userId: string
  ): Promise<{ success: boolean; updatedPreview: ImportPreview }> {
    const session = this.getValidationSession(sessionId, userId);
    
    if (!session) {
      throw new Error('Session de validation non trouvée ou expirée');
    }

    if (session.status !== 'pending_validation') {
      throw new Error('Cette session ne peut plus être modifiée');
    }

    try {
      // 1. Créer une copie des données pour les corrections
      const correctedData = JSON.parse(JSON.stringify(session.originalData));

      // 2. Appliquer chaque correction
      for (const correction of corrections) {
        const validationCorrection: ValidationCorrection = {
          itemIndex: correction.itemIndex,
          field: correction.field,
          originalValue: this.getFieldValue(correctedData, correction.itemIndex, correction.field),
          correctedValue: correction.newValue,
          reason: correction.reason,
          appliedBy: userId,
          appliedAt: new Date()
        };

        // Appliquer la correction aux données
        this.setFieldValue(correctedData, correction.itemIndex, correction.field, correction.newValue);
        
        // Enregistrer la correction
        session.corrections.push(validationCorrection);
      }

      // 3. Re-valider les données corrigées
      const updatedValidation = await this.jsonValidationService.validateImportData(
        correctedData,
        correctedData.type
      );

      // 4. Mettre à jour la session
      session.correctedData = correctedData;
      session.validationResults = updatedValidation;

      // 5. Générer la prévisualisation mise à jour
      const updatedPreview = await this.generateImportPreview(session);

      // 6. Logger l'activité
      await this.logValidationActivity(userId, 'corrections_applied', {
        sessionId,
        correctionCount: corrections.length,
        remainingErrors: updatedValidation.errors.length
      });

      return { success: true, updatedPreview };

    } catch (error) {
      throw new Error(`Erreur lors de l'application des corrections: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Valide manuellement une session (approbation admin)
   */
  async validateSession(
    sessionId: string,
    adminUserId: string,
    approved: boolean,
    comments?: string
  ): Promise<{ success: boolean; canProceedToImport: boolean }> {
    const session = this.validationSessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session de validation non trouvée');
    }

    if (session.status !== 'pending_validation') {
      throw new Error('Cette session a déjà été validée ou rejetée');
    }

    try {
      // Vérifier que l'utilisateur est admin
      const adminUser = await payload.findByID({
        collection: 'users',
        id: adminUserId
      });

      if (!adminUser || adminUser.role !== 'admin') {
        throw new Error('Permissions administrateur requises pour valider');
      }

      // Mettre à jour la session
      session.status = approved ? 'validated' : 'rejected';
      session.validatedBy = adminUserId;
      session.validatedAt = new Date();
      session.adminComments = comments;

      // Déterminer si l'import peut procéder
      const canProceedToImport = approved && 
        session.validationResults.errors.filter(e => e.severity === 'critical').length === 0;

      // Logger l'activité de validation
      await this.logValidationActivity(adminUserId, approved ? 'session_approved' : 'session_rejected', {
        sessionId,
        originalUserId: session.userId,
        comments,
        canProceedToImport,
        criticalErrors: session.validationResults.errors.filter(e => e.severity === 'critical').length
      });

      return { success: true, canProceedToImport };

    } catch (error) {
      throw new Error(`Erreur lors de la validation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Récupère les données finales pour l'import après validation
   */
  getFinalImportData(sessionId: string, userId: string): ImportData | null {
    const session = this.getValidationSession(sessionId, userId);
    
    if (!session) {
      return null;
    }

    if (session.status !== 'validated') {
      return null;
    }

    // Retourner les données corrigées ou originales
    return session.correctedData || session.originalData;
  }

  /**
   * Génère une prévisualisation détaillée de l'import
   */
  private async generateImportPreview(session: ValidationSession): Promise<ImportPreview> {
    const data = session.correctedData || session.originalData;
    const previewItems: PreviewItem[] = [];

    // Générer les items de prévisualisation selon le type
    switch (data.type) {
      case 'questions':
        const questionData = data as any;
        if (questionData.questions && Array.isArray(questionData.questions)) {
          questionData.questions.forEach((question: any, index: number) => {
            const itemErrors = session.validationResults.errors.filter(e => e.itemIndex === index);
            previewItems.push({
              index,
              type: 'question',
              original: question,
              preview: this.generateQuestionPreview(question),
              issues: itemErrors,
              suggestions: this.generateSuggestions(question, itemErrors),
              requiresAttention: itemErrors.some(e => ['critical', 'major'].includes(e.severity))
            });
          });
        }
        break;

      case 'flashcards':
        const flashcardData = data as any;
        if (flashcardData.cards && Array.isArray(flashcardData.cards)) {
          flashcardData.cards.forEach((card: any, index: number) => {
            const itemErrors = session.validationResults.errors.filter(e => e.itemIndex === index);
            previewItems.push({
              index,
              type: 'flashcard',
              original: card,
              preview: this.generateFlashcardPreview(card),
              issues: itemErrors,
              suggestions: this.generateSuggestions(card, itemErrors),
              requiresAttention: itemErrors.some(e => ['critical', 'major'].includes(e.severity))
            });
          });
        }
        break;

      case 'learning-path':
        const pathData = data as any;
        if (pathData.path?.steps && Array.isArray(pathData.path.steps)) {
          pathData.path.steps.forEach((step: any, stepIndex: number) => {
            if (step.questions && Array.isArray(step.questions)) {
              step.questions.forEach((question: any, questionIndex: number) => {
                const globalIndex = stepIndex * 1000 + questionIndex;
                const itemErrors = session.validationResults.errors.filter(e => e.itemIndex === globalIndex);
                previewItems.push({
                  index: globalIndex,
                  type: 'learning-step',
                  original: { step: step.title, question },
                  preview: this.generateLearningStepPreview(step, question),
                  issues: itemErrors,
                  suggestions: this.generateSuggestions(question, itemErrors),
                  requiresAttention: itemErrors.some(e => ['critical', 'major'].includes(e.severity))
                });
              });
            }
          });
        }
        break;
    }

    // Calculer le temps estimé d'import
    const estimatedTime = this.calculateEstimatedImportTime(this.getItemCount(data));

    return {
      validation: session.validationResults,
      categoryMappings: session.categoryMappings,
      sampleItems: previewItems.slice(0, 10), // Limiter à 10 items pour la prévisualisation
      estimatedImportTime: estimatedTime
    };
  }

  /**
   * Génère des mappings intelligents de catégories
   */
  private async generateCategoryMappings(data: ImportData): Promise<CategoryMapping[]> {
    const mappings: CategoryMapping[] = [];
    const referencedCategories = this.extractReferencedCategories(data);

    if (referencedCategories.size === 0) {
      return mappings;
    }

    try {
      // Récupérer les catégories existantes
      const existingCategories = await payload.find({
        collection: 'categories',
        limit: 1000,
        select: {
          id: true,
          title: true,
          level: true
        }
      });

      // Générer des mappings pour chaque catégorie référencée
      for (const categoryName of referencedCategories) {
        const existingCategory = existingCategories.docs.find(cat => 
          cat.title.toLowerCase() === categoryName.toLowerCase()
        );

        if (existingCategory) {
          // Catégorie existe déjà - mapping direct
          mappings.push({
            originalName: categoryName,
            suggestedName: existingCategory.title,
            confidence: 1.0,
            action: 'map'
          });
        } else {
          // Chercher des catégories similaires
          const similarCategory = this.findSimilarCategory(categoryName, existingCategories.docs);
          
          if (similarCategory && similarCategory.similarity > 0.7) {
            mappings.push({
              originalName: categoryName,
              suggestedName: similarCategory.category.title,
              confidence: similarCategory.similarity,
              action: 'map'
            });
          } else {
            // Suggérer la création d'une nouvelle catégorie
            mappings.push({
              originalName: categoryName,
              suggestedName: categoryName,
              confidence: 0.8,
              action: 'create'
            });
          }
        }
      }

    } catch (error) {
      // En cas d'erreur, créer des mappings par défaut
      for (const categoryName of referencedCategories) {
        mappings.push({
          originalName: categoryName,
          suggestedName: categoryName,
          confidence: 0.5,
          action: 'create'
        });
      }
    }

    return mappings;
  }

  /**
   * Trouve une catégorie similaire basée sur l'analyse sémantique
   */
  private findSimilarCategory(
    categoryName: string, 
    existingCategories: Array<{ title: string; level: string }>
  ): { category: { title: string; level: string }; similarity: number } | null {
    let bestMatch: { category: { title: string; level: string }; similarity: number } | null = null;

    for (const existing of existingCategories) {
      const similarity = this.calculateStringSimilarity(
        categoryName.toLowerCase(),
        existing.title.toLowerCase()
      );

      if (similarity > 0.6 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { category: existing, similarity };
      }
    }

    return bestMatch;
  }

  /**
   * Calcule la similarité entre deux chaînes (algorithme de Levenshtein normalisé)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Initialiser la matrice
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculer les distances
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // Suppression
          matrix[i][j - 1] + 1,      // Insertion
          matrix[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * Extrait les catégories référencées dans les données
   */
  private extractReferencedCategories(data: ImportData): Set<string> {
    const categories = new Set<string>();

    switch (data.type) {
      case 'questions':
        const questionData = data as any;
        if (questionData.questions && Array.isArray(questionData.questions)) {
          questionData.questions.forEach((q: any) => {
            if (q.category) categories.add(q.category);
          });
        }
        break;

      case 'flashcards':
        const flashcardData = data as any;
        if (flashcardData.cards && Array.isArray(flashcardData.cards)) {
          flashcardData.cards.forEach((c: any) => {
            if (c.category) categories.add(c.category);
          });
        }
        if (flashcardData.metadata?.category) {
          categories.add(flashcardData.metadata.category);
        }
        break;

      case 'learning-path':
        const pathData = data as any;
        if (pathData.path?.steps && Array.isArray(pathData.path.steps)) {
          pathData.path.steps.forEach((step: any) => {
            if (step.questions && Array.isArray(step.questions)) {
              step.questions.forEach((q: any) => {
                if (q.category) categories.add(q.category);
              });
            }
          });
        }
        break;
    }

    return categories;
  }

  /**
   * Génère une prévisualisation pour une question
   */
  private generateQuestionPreview(question: any): any {
    return {
      questionText: question.questionText,
      optionCount: question.options?.length || 0,
      hasCorrectAnswer: question.options?.some((opt: any) => opt.isCorrect) || false,
      hasExplanation: !!question.explanation,
      category: question.category,
      difficulty: question.difficulty,
      level: question.level,
      tagCount: question.tags?.length || 0
    };
  }

  /**
   * Génère une prévisualisation pour une flashcard
   */
  private generateFlashcardPreview(card: any): any {
    return {
      frontLength: card.front?.length || 0,
      backLength: card.back?.length || 0,
      hasImage: !!card.imageUrl,
      category: card.category,
      difficulty: card.difficulty,
      tagCount: card.tags?.length || 0
    };
  }

  /**
   * Génère une prévisualisation pour une étape de parcours
   */
  private generateLearningStepPreview(step: any, question: any): any {
    return {
      stepTitle: step.title,
      stepId: step.id,
      prerequisiteCount: step.prerequisites?.length || 0,
      question: this.generateQuestionPreview(question)
    };
  }

  /**
   * Génère des suggestions de correction
   */
  private generateSuggestions(item: any, errors: ImportError[]): string[] {
    const suggestions: string[] = [];

    errors.forEach(error => {
      if (error.suggestion) {
        suggestions.push(error.suggestion);
      }
    });

    // Suggestions génériques basées sur le contenu
    if (item.questionText && item.questionText.length < 10) {
      suggestions.push('Considérez enrichir le texte de la question pour plus de clarté');
    }

    if (item.options && item.options.length < 3) {
      suggestions.push('Ajoutez plus d\'options pour améliorer la qualité de la question');
    }

    if (!item.explanation || item.explanation.length < 20) {
      suggestions.push('Une explication détaillée améliore l\'apprentissage');
    }

    return [...new Set(suggestions)]; // Supprimer les doublons
  }

  /**
   * Utilitaires pour manipuler les champs des données
   */
  private getFieldValue(data: ImportData, itemIndex: number, field: string): any {
    const items = this.getItemsArray(data);
    if (itemIndex >= 0 && itemIndex < items.length) {
      return items[itemIndex][field];
    }
    return undefined;
  }

  private setFieldValue(data: ImportData, itemIndex: number, field: string, value: any): void {
    const items = this.getItemsArray(data);
    if (itemIndex >= 0 && itemIndex < items.length) {
      items[itemIndex][field] = value;
    }
  }

  private getItemsArray(data: ImportData): any[] {
    switch (data.type) {
      case 'questions':
        return (data as any).questions || [];
      case 'flashcards':
        return (data as any).cards || [];
      case 'learning-path':
        // Pour les parcours, on retourne toutes les questions de toutes les étapes
        const pathData = data as any;
        const allQuestions: any[] = [];
        if (pathData.path?.steps) {
          pathData.path.steps.forEach((step: any) => {
            if (step.questions) {
              allQuestions.push(...step.questions);
            }
          });
        }
        return allQuestions;
      default:
        return [];
    }
  }

  private getItemCount(data: ImportData): number {
    return this.getItemsArray(data).length;
  }

  private calculateEstimatedImportTime(itemCount: number): number {
    // Estimation: 0.5 seconde par item + temps de validation
    return Math.max(30, itemCount * 0.5 + 10); // Minimum 30 secondes
  }

  private generateSessionId(): string {
    return `validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log des activités de validation pour audit
   */
  private async logValidationActivity(
    userId: string, 
    action: string, 
    details: any
  ): Promise<void> {
    try {
      // Utiliser le service d'audit existant si disponible
      const { AuditLogService } = await import('./AuditLogService');
      const auditService = new AuditLogService();
      
      await auditService.logActivity({
        userId,
        action: `validation_workflow_${action}`,
        resourceType: 'import_validation',
        resourceId: details.sessionId || 'unknown',
        details,
        timestamp: new Date(),
        ipAddress: 'system', // TODO: Récupérer l'IP réelle
        userAgent: 'validation_service'
      });
    } catch (error) {
      console.error('Erreur lors du logging d\'audit:', error);
      // Ne pas faire échouer l'opération principale
    }
  }

  /**
   * Nettoie les sessions expirées
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.validationSessions.entries()) {
      if (session.expiresAt < now) {
        this.validationSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Récupère les statistiques des sessions de validation
   */
  getValidationStats(): {
    totalSessions: number;
    pendingSessions: number;
    validatedSessions: number;
    rejectedSessions: number;
    expiredSessions: number;
  } {
    const stats = {
      totalSessions: this.validationSessions.size,
      pendingSessions: 0,
      validatedSessions: 0,
      rejectedSessions: 0,
      expiredSessions: 0
    };

    for (const session of this.validationSessions.values()) {
      switch (session.status) {
        case 'pending_validation':
          stats.pendingSessions++;
          break;
        case 'validated':
          stats.validatedSessions++;
          break;
        case 'rejected':
          stats.rejectedSessions++;
          break;
        case 'expired':
          stats.expiredSessions++;
          break;
      }
    }

    return stats;
  }
}