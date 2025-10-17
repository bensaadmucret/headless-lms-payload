/**
 * Service de gestion intelligente des catégories
 * Responsable de la détection de similarités, suggestions de fusion et mapping intelligent
 */

import payload from 'payload';
import { 
  CategoryMapping, 
  CategorySuggestion,
  ImportData 
} from '../types/jsonImport';

export interface CategoryAnalysis {
  originalName: string;
  normalizedName: string;
  suggestedMappings: CategorySuggestion[];
  recommendedAction: 'map' | 'create' | 'merge';
  confidence: number;
  reasoning: string[];
}

export interface CategoryMappingHistory {
  id: string;
  originalName: string;
  mappedToName: string;
  mappedToId: string;
  action: 'mapped' | 'created' | 'merged';
  userId: string;
  createdAt: Date;
  importSessionId?: string;
  confidence: number;
  manualOverride: boolean;
}

export interface CategoryCluster {
  clusterId: string;
  categories: string[];
  suggestedCanonicalName: string;
  confidence: number;
  medicalDomain?: string;
}

export class IntelligentCategoryMappingService {
  private mappingHistory = new Map<string, CategoryMappingHistory>();
  private categoryCache = new Map<string, any>();
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Dictionnaire médical pour améliorer les suggestions
  private readonly medicalTerms = new Map<string, string[]>([
    ['cardiologie', ['cardio', 'coeur', 'heart', 'cardiovasculaire', 'cardiaque']],
    ['neurologie', ['neuro', 'cerveau', 'brain', 'neurologique', 'neural']],
    ['pneumologie', ['pneumo', 'poumon', 'lung', 'respiratoire', 'pulmonaire']],
    ['gastroenterologie', ['gastro', 'digestif', 'intestin', 'estomac', 'foie']],
    ['endocrinologie', ['endo', 'hormone', 'diabete', 'thyroide', 'metabolisme']],
    ['anatomie', ['anat', 'structure', 'morphologie', 'topographie']],
    ['physiologie', ['physio', 'fonction', 'fonctionnement', 'mecanisme']],
    ['pathologie', ['patho', 'maladie', 'disease', 'syndrome', 'trouble']],
    ['pharmacologie', ['pharma', 'medicament', 'drug', 'traitement', 'therapeutique']],
    ['immunologie', ['immuno', 'anticorps', 'immune', 'allergie', 'vaccination']]
  ]);

  /**
   * Analyse intelligente des catégories d'un import
   */
  async analyzeImportCategories(
    importData: ImportData,
    userId: string
  ): Promise<CategoryAnalysis[]> {
    try {
      // 1. Extraire toutes les catégories référencées
      const referencedCategories = this.extractReferencedCategories(importData);
      
      if (referencedCategories.size === 0) {
        return [];
      }

      // 2. Récupérer les catégories existantes
      await this.refreshCategoryCache();
      const existingCategories = Array.from(this.categoryCache.values());

      // 3. Analyser chaque catégorie référencée
      const analyses: CategoryAnalysis[] = [];

      for (const categoryName of referencedCategories) {
        const analysis = await this.analyzeSingleCategory(
          categoryName,
          existingCategories,
          userId
        );
        analyses.push(analysis);
      }

      // 4. Détecter les clusters de catégories similaires dans l'import
      const clusters = this.detectCategoryClusters(Array.from(referencedCategories));
      
      // 5. Ajuster les analyses basées sur les clusters
      this.adjustAnalysesWithClusters(analyses, clusters);

      return analyses;

    } catch (error) {
      throw new Error(`Erreur lors de l'analyse des catégories: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Analyse une catégorie individuelle
   */
  private async analyzeSingleCategory(
    categoryName: string,
    existingCategories: any[],
    userId: string
  ): Promise<CategoryAnalysis> {
    const normalizedName = this.normalizeCategoryName(categoryName);
    const suggestedMappings: CategorySuggestion[] = [];
    const reasoning: string[] = [];

    // 1. Recherche de correspondance exacte
    const exactMatch = existingCategories.find(cat => 
      this.normalizeCategoryName(cat.title) === normalizedName
    );

    if (exactMatch) {
      suggestedMappings.push({
        existingCategory: exactMatch.title,
        similarity: 1.0,
        recommended: true
      });
      reasoning.push('Correspondance exacte trouvée');
      
      return {
        originalName: categoryName,
        normalizedName,
        suggestedMappings,
        recommendedAction: 'map',
        confidence: 1.0,
        reasoning
      };
    }

    // 2. Recherche de similarités textuelles
    const textualSimilarities = this.findTextualSimilarities(
      normalizedName,
      existingCategories
    );

    suggestedMappings.push(...textualSimilarities);

    // 3. Recherche basée sur le domaine médical
    const medicalSimilarities = this.findMedicalDomainSimilarities(
      normalizedName,
      existingCategories
    );

    suggestedMappings.push(...medicalSimilarities);

    // 4. Vérifier l'historique des mappings
    const historicalMapping = await this.findHistoricalMapping(categoryName, userId);
    
    if (historicalMapping) {
      const existingCategory = existingCategories.find(cat => cat.id === historicalMapping.mappedToId);
      if (existingCategory) {
        suggestedMappings.unshift({
          existingCategory: existingCategory.title,
          similarity: historicalMapping.confidence,
          recommended: true
        });
        reasoning.push('Mapping utilisé précédemment par cet utilisateur');
      }
    }

    // 5. Déduplication et tri des suggestions
    const uniqueMappings = this.deduplicateMappings(suggestedMappings);
    uniqueMappings.sort((a, b) => b.similarity - a.similarity);

    // 6. Déterminer l'action recommandée
    const bestMapping = uniqueMappings[0];
    let recommendedAction: 'map' | 'create' | 'merge' = 'create';
    let confidence = 0.5;

    if (bestMapping && bestMapping.similarity > 0.8) {
      recommendedAction = 'map';
      confidence = bestMapping.similarity;
      reasoning.push(`Forte similarité avec "${bestMapping.existingCategory}" (${Math.round(bestMapping.similarity * 100)}%)`);
    } else if (bestMapping && bestMapping.similarity > 0.6) {
      recommendedAction = 'map';
      confidence = bestMapping.similarity;
      reasoning.push(`Similarité modérée avec "${bestMapping.existingCategory}" - vérification recommandée`);
    } else {
      reasoning.push('Aucune catégorie similaire trouvée - création recommandée');
    }

    return {
      originalName: categoryName,
      normalizedName,
      suggestedMappings: uniqueMappings.slice(0, 5), // Limiter à 5 suggestions
      recommendedAction,
      confidence,
      reasoning
    };
  }

  /**
   * Trouve les similarités textuelles avec les catégories existantes
   */
  private findTextualSimilarities(
    normalizedName: string,
    existingCategories: any[]
  ): CategorySuggestion[] {
    const similarities: CategorySuggestion[] = [];

    for (const category of existingCategories) {
      const existingNormalized = this.normalizeCategoryName(category.title);
      
      // Similarité de Levenshtein
      const levenshteinSimilarity = this.calculateLevenshteinSimilarity(
        normalizedName,
        existingNormalized
      );

      // Similarité de Jaccard (mots en commun)
      const jaccardSimilarity = this.calculateJaccardSimilarity(
        normalizedName,
        existingNormalized
      );

      // Score combiné
      const combinedSimilarity = Math.max(levenshteinSimilarity, jaccardSimilarity);

      if (combinedSimilarity > 0.5) {
        similarities.push({
          existingCategory: category.title,
          similarity: combinedSimilarity,
          recommended: combinedSimilarity > 0.7
        });
      }
    }

    return similarities;
  }

  /**
   * Trouve les similarités basées sur le domaine médical
   */
  private findMedicalDomainSimilarities(
    normalizedName: string,
    existingCategories: any[]
  ): CategorySuggestion[] {
    const similarities: CategorySuggestion[] = [];

    // Identifier le domaine médical de la catégorie
    const medicalDomain = this.identifyMedicalDomain(normalizedName);
    
    if (!medicalDomain) {
      return similarities;
    }

    // Chercher des catégories existantes dans le même domaine
    for (const category of existingCategories) {
      const existingDomain = this.identifyMedicalDomain(
        this.normalizeCategoryName(category.title)
      );

      if (existingDomain === medicalDomain) {
        // Calculer la similarité contextuelle
        const contextualSimilarity = this.calculateContextualSimilarity(
          normalizedName,
          this.normalizeCategoryName(category.title),
          medicalDomain
        );

        if (contextualSimilarity > 0.6) {
          similarities.push({
            existingCategory: category.title,
            similarity: contextualSimilarity,
            recommended: contextualSimilarity > 0.8
          });
        }
      }
    }

    return similarities;
  }

  /**
   * Identifie le domaine médical d'une catégorie
   */
  private identifyMedicalDomain(normalizedName: string): string | null {
    for (const [domain, terms] of this.medicalTerms.entries()) {
      if (terms.some(term => normalizedName.includes(term)) || 
          normalizedName.includes(domain)) {
        return domain;
      }
    }
    return null;
  }

  /**
   * Calcule la similarité contextuelle dans un domaine médical
   */
  private calculateContextualSimilarity(
    name1: string,
    name2: string,
    domain: string
  ): number {
    const domainTerms = this.medicalTerms.get(domain) || [];
    
    // Bonus si les deux noms contiennent des termes du même domaine
    const name1Terms = domainTerms.filter(term => name1.includes(term));
    const name2Terms = domainTerms.filter(term => name2.includes(term));
    
    const commonTerms = name1Terms.filter(term => name2Terms.includes(term));
    const domainBonus = commonTerms.length > 0 ? 0.3 : 0;

    // Similarité textuelle de base
    const baseSimilarity = this.calculateLevenshteinSimilarity(name1, name2);

    return Math.min(1.0, baseSimilarity + domainBonus);
  }

  /**
   * Détecte les clusters de catégories similaires dans l'import
   */
  private detectCategoryClusters(categories: string[]): CategoryCluster[] {
    const clusters: CategoryCluster[] = [];
    const processed = new Set<string>();

    for (const category of categories) {
      if (processed.has(category)) continue;

      const cluster: string[] = [category];
      processed.add(category);

      // Chercher des catégories similaires
      for (const otherCategory of categories) {
        if (processed.has(otherCategory)) continue;

        const similarity = this.calculateLevenshteinSimilarity(
          this.normalizeCategoryName(category),
          this.normalizeCategoryName(otherCategory)
        );

        if (similarity > 0.7) {
          cluster.push(otherCategory);
          processed.add(otherCategory);
        }
      }

      // Créer un cluster si plus d'une catégorie
      if (cluster.length > 1) {
        const suggestedName = this.suggestCanonicalName(cluster);
        const medicalDomain = this.identifyMedicalDomain(
          this.normalizeCategoryName(suggestedName)
        );

        clusters.push({
          clusterId: `cluster_${clusters.length + 1}`,
          categories: cluster,
          suggestedCanonicalName: suggestedName,
          confidence: 0.8,
          medicalDomain: medicalDomain || undefined
        });
      }
    }

    return clusters;
  }

  /**
   * Suggère un nom canonique pour un cluster de catégories
   */
  private suggestCanonicalName(categories: string[]): string {
    // Prendre le nom le plus long (généralement le plus descriptif)
    const longestName = categories.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );

    // Ou le nom le plus "standard" basé sur les termes médicaux
    const medicalStandardName = categories.find(name => {
      const normalized = this.normalizeCategoryName(name);
      return Array.from(this.medicalTerms.keys()).some(domain => 
        normalized.includes(domain)
      );
    });

    return medicalStandardName || longestName;
  }

  /**
   * Ajuste les analyses basées sur les clusters détectés
   */
  private adjustAnalysesWithClusters(
    analyses: CategoryAnalysis[],
    clusters: CategoryCluster[]
  ): void {
    for (const cluster of clusters) {
      const clusterAnalyses = analyses.filter(analysis => 
        cluster.categories.includes(analysis.originalName)
      );

      if (clusterAnalyses.length > 1) {
        // Suggérer une fusion pour toutes les catégories du cluster
        clusterAnalyses.forEach(analysis => {
          analysis.recommendedAction = 'merge';
          analysis.reasoning.push(
            `Fait partie d'un cluster de catégories similaires: ${cluster.categories.join(', ')}`
          );
          analysis.reasoning.push(
            `Nom canonique suggéré: "${cluster.suggestedCanonicalName}"`
          );
        });
      }
    }
  }

  /**
   * Applique un mapping de catégorie et l'enregistre dans l'historique
   */
  async applyMapping(
    originalName: string,
    targetCategoryId: string,
    userId: string,
    importSessionId?: string,
    manualOverride: boolean = false
  ): Promise<CategoryMappingHistory> {
    try {
      // Récupérer les détails de la catégorie cible
      const targetCategory = await payload.findByID({
        collection: 'categories',
        id: targetCategoryId
      });

      if (!targetCategory) {
        throw new Error(`Catégorie cible non trouvée: ${targetCategoryId}`);
      }

      // Créer l'enregistrement d'historique
      const mappingRecord: CategoryMappingHistory = {
        id: this.generateMappingId(),
        originalName,
        mappedToName: targetCategory.title,
        mappedToId: targetCategoryId,
        action: 'mapped',
        userId,
        createdAt: new Date(),
        importSessionId,
        confidence: manualOverride ? 1.0 : 0.8,
        manualOverride
      };

      // Enregistrer dans l'historique
      this.mappingHistory.set(mappingRecord.id, mappingRecord);

      // TODO: Persister en base de données pour un stockage permanent
      
      return mappingRecord;

    } catch (error) {
      throw new Error(`Erreur lors de l'application du mapping: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Crée une nouvelle catégorie et l'enregistre dans l'historique
   */
  async createNewCategory(
    categoryName: string,
    level: 'PASS' | 'LAS' | 'both',
    userId: string,
    importSessionId?: string
  ): Promise<CategoryMappingHistory> {
    try {
      // Créer la nouvelle catégorie
      const newCategory = await payload.create({
        collection: 'categories',
        data: {
          title: categoryName,
          level,
          adaptiveSettings: {
            isActive: true,
            minimumQuestions: 5,
            weight: 1
          }
        }
      });

      // Créer l'enregistrement d'historique
      const mappingRecord: CategoryMappingHistory = {
        id: this.generateMappingId(),
        originalName: categoryName,
        mappedToName: categoryName,
        mappedToId: String(newCategory.id),
        action: 'created',
        userId,
        createdAt: new Date(),
        importSessionId,
        confidence: 1.0,
        manualOverride: false
      };

      // Enregistrer dans l'historique
      this.mappingHistory.set(mappingRecord.id, mappingRecord);

      // Invalider le cache des catégories
      this.categoryCache.clear();
      this.lastCacheUpdate = 0;

      return mappingRecord;

    } catch (error) {
      throw new Error(`Erreur lors de la création de la catégorie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Recherche dans l'historique des mappings
   */
  private async findHistoricalMapping(
    categoryName: string,
    userId: string
  ): Promise<CategoryMappingHistory | null> {
    // Chercher dans l'historique en mémoire
    for (const mapping of this.mappingHistory.values()) {
      if (mapping.originalName.toLowerCase() === categoryName.toLowerCase() &&
          mapping.userId === userId) {
        return mapping;
      }
    }

    // TODO: Chercher en base de données pour l'historique persistant
    
    return null;
  }

  /**
   * Récupère l'historique des mappings pour un utilisateur
   */
  getUserMappingHistory(userId: string): CategoryMappingHistory[] {
    return Array.from(this.mappingHistory.values())
      .filter(mapping => mapping.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Récupère les statistiques des mappings
   */
  getMappingStatistics(): {
    totalMappings: number;
    mappedCount: number;
    createdCount: number;
    mergedCount: number;
    averageConfidence: number;
    manualOverrideRate: number;
  } {
    const mappings = Array.from(this.mappingHistory.values());
    
    return {
      totalMappings: mappings.length,
      mappedCount: mappings.filter(m => m.action === 'mapped').length,
      createdCount: mappings.filter(m => m.action === 'created').length,
      mergedCount: mappings.filter(m => m.action === 'merged').length,
      averageConfidence: mappings.length > 0 ? 
        mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length : 0,
      manualOverrideRate: mappings.length > 0 ?
        mappings.filter(m => m.manualOverride).length / mappings.length : 0
    };
  }

  /**
   * Utilitaires privés
   */
  private async refreshCategoryCache(): Promise<void> {
    const now = Date.now();
    
    if (now - this.lastCacheUpdate < this.CACHE_TTL && this.categoryCache.size > 0) {
      return; // Cache encore valide
    }

    try {
      const categories = await payload.find({
        collection: 'categories',
        limit: 1000,
        select: {
          id: true,
          title: true,
          level: true
        }
      });

      this.categoryCache.clear();
      categories.docs.forEach(category => {
        this.categoryCache.set(category.id, category);
      });

      this.lastCacheUpdate = now;

    } catch (error) {
      console.error('Erreur lors du rafraîchissement du cache des catégories:', error);
    }
  }

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

  private normalizeCategoryName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  }

  private calculateJaccardSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(str2.split(' ').filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private deduplicateMappings(mappings: CategorySuggestion[]): CategorySuggestion[] {
    const seen = new Set<string>();
    return mappings.filter(mapping => {
      if (seen.has(mapping.existingCategory)) {
        return false;
      }
      seen.add(mapping.existingCategory);
      return true;
    });
  }

  private generateMappingId(): string {
    return `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}