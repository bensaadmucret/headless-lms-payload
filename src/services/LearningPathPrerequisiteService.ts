/**
 * Service de gestion des prérequis pour les parcours d'apprentissage
 * Responsable de la validation et de la gestion des dépendances entre étapes
 */

import { ImportLearningStep, ImportError } from '../types/jsonImport';

export interface PrerequisiteValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
  missingPrerequisites: string[];
  circularDependencies: string[];
  substitutionSuggestions: PrerequisiteSubstitution[];
}

export interface PrerequisiteSubstitution {
  originalId: string;
  suggestedId: string;
  reason: string;
  confidence: number;
}

export interface PrerequisiteGraph {
  nodes: Map<string, ImportLearningStep>;
  edges: Map<string, string[]>; // stepId -> prerequisiteIds
  reversedEdges: Map<string, string[]>; // stepId -> dependentStepIds
}

export interface LearningSequence {
  stepId: string;
  level: number;
  prerequisites: string[];
  dependents: string[];
  isEntryPoint: boolean;
  isTerminal: boolean;
}

export class LearningPathPrerequisiteService {
  
  /**
   * Valide que tous les prérequis référencés existent dans l'import ou le système
   */
  async validatePrerequisiteReferences(
    steps: ImportLearningStep[],
    existingStepIds?: Set<string>
  ): Promise<PrerequisiteValidationResult> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];
    const missingPrerequisites: string[] = [];
    const substitutionSuggestions: PrerequisiteSubstitution[] = [];

    try {
      // Construire le graphe des prérequis
      const graph = this.buildPrerequisiteGraph(steps);
      const allStepIds = new Set([...graph.nodes.keys(), ...(existingStepIds || [])]);

      // Valider chaque prérequis
      for (const [stepId, step] of graph.nodes) {
        const stepIndex = steps.findIndex(s => s.id === stepId);

        for (const prereqId of step.prerequisites) {
          if (!allStepIds.has(prereqId)) {
            missingPrerequisites.push(prereqId);
            
            // Chercher des substitutions possibles
            const substitution = this.findPrerequisiteSubstitution(prereqId, allStepIds, step);
            if (substitution) {
              substitutionSuggestions.push(substitution);
              
              warnings.push({
                type: 'reference',
                severity: 'warning',
                itemIndex: stepIndex,
                field: 'prerequisites',
                message: `Prérequis "${prereqId}" introuvable pour l'étape "${step.title}"`,
                suggestion: `Suggestion: remplacer par "${substitution.suggestedId}" (${substitution.reason})`
              });
            } else {
              errors.push({
                type: 'reference',
                severity: 'major',
                itemIndex: stepIndex,
                field: 'prerequisites',
                message: `Prérequis "${prereqId}" introuvable pour l'étape "${step.title}"`,
                suggestion: 'Vérifiez l\'ID du prérequis ou créez l\'étape manquante'
              });
            }
          }
        }
      }

      // Détecter les dépendances circulaires
      const circularDependencies = this.detectCircularDependencies(graph);
      
      circularDependencies.forEach(cycle => {
        const stepIndex = steps.findIndex(s => s.id === cycle);
        errors.push({
          type: 'validation',
          severity: 'critical',
          itemIndex: stepIndex,
          field: 'prerequisites',
          message: `Dépendance circulaire détectée impliquant l'étape "${cycle}"`,
          suggestion: 'Réorganisez les prérequis pour éliminer les références circulaires'
        });
      });

      // Valider la cohérence des séquences d'apprentissage
      const sequenceValidation = this.validateLearningSequences(graph);
      errors.push(...sequenceValidation.errors);
      warnings.push(...sequenceValidation.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        missingPrerequisites,
        circularDependencies,
        substitutionSuggestions
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'system',
          severity: 'critical',
          message: `Erreur lors de la validation des prérequis: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez la structure des données'
        }],
        warnings: [],
        missingPrerequisites: [],
        circularDependencies: [],
        substitutionSuggestions: []
      };
    }
  }

  /**
   * Crée des enregistrements de substitution pour les dépendances manquantes
   */
  async createSubstitutionRecords(
    missingPrerequisites: string[],
    substitutionSuggestions: PrerequisiteSubstitution[]
  ): Promise<Array<{ originalId: string; substitutionId: string; created: boolean }>> {
    const substitutionRecords: Array<{ originalId: string; substitutionId: string; created: boolean }> = [];

    try {
      for (const missing of missingPrerequisites) {
        const suggestion = substitutionSuggestions.find(s => s.originalId === missing);
        
        if (suggestion && suggestion.confidence > 0.7) {
          // Utiliser la suggestion avec haute confiance
          substitutionRecords.push({
            originalId: missing,
            substitutionId: suggestion.suggestedId,
            created: false // Utilise un ID existant
          });
        } else {
          // Créer un enregistrement de substitution générique
          const substitutionId = await this.createGenericSubstitutionStep(missing);
          substitutionRecords.push({
            originalId: missing,
            substitutionId,
            created: true // Nouvel enregistrement créé
          });
        }
      }

      return substitutionRecords;

    } catch (error) {
      throw new Error(`Erreur lors de la création des substitutions: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Valide la cohérence des séquences d'apprentissage
   */
  validateLearningSequences(graph: PrerequisiteGraph): { errors: ImportError[]; warnings: ImportError[] } {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    try {
      const sequences = this.buildLearningSequences(graph);
      
      // Vérifier qu'il y a au moins un point d'entrée
      const entryPoints = sequences.filter(seq => seq.isEntryPoint);
      if (entryPoints.length === 0) {
        errors.push({
          type: 'validation',
          severity: 'critical',
          message: 'Aucun point d\'entrée trouvé dans le parcours d\'apprentissage',
          suggestion: 'Au moins une étape doit être accessible sans prérequis'
        });
      }

      // Vérifier qu'il y a au moins un point terminal
      const terminalPoints = sequences.filter(seq => seq.isTerminal);
      if (terminalPoints.length === 0) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          message: 'Aucun point terminal trouvé dans le parcours',
          suggestion: 'Considérez ajouter des étapes finales qui ne sont prérequis d\'aucune autre'
        });
      }

      // Vérifier la profondeur maximale
      const maxLevel = Math.max(...sequences.map(seq => seq.level));
      if (maxLevel > 6) {
        warnings.push({
          type: 'validation',
          severity: 'minor',
          message: `Parcours très profond (${maxLevel} niveaux)`,
          suggestion: 'Considérez simplifier la structure pour améliorer l\'expérience utilisateur'
        });
      }

      // Vérifier les étapes isolées
      const isolatedSteps = sequences.filter(seq => 
        seq.prerequisites.length === 0 && seq.dependents.length === 0 && sequences.length > 1
      );

      isolatedSteps.forEach(isolated => {
        const step = graph.nodes.get(isolated.stepId);
        warnings.push({
          type: 'validation',
          severity: 'minor',
          message: `Étape "${step?.title || isolated.stepId}" semble isolée du parcours principal`,
          suggestion: 'Vérifiez si cette étape doit être connectée au parcours'
        });
      });

      return { errors, warnings };

    } catch (error) {
      return {
        errors: [{
          type: 'system',
          severity: 'major',
          message: `Erreur lors de la validation des séquences: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez la structure des prérequis'
        }],
        warnings: []
      };
    }
  }

  /**
   * Construit le graphe des prérequis
   */
  private buildPrerequisiteGraph(steps: ImportLearningStep[]): PrerequisiteGraph {
    const nodes = new Map<string, ImportLearningStep>();
    const edges = new Map<string, string[]>();
    const reversedEdges = new Map<string, string[]>();

    // Construire les nœuds
    steps.forEach(step => {
      nodes.set(step.id, step);
      edges.set(step.id, [...step.prerequisites]);
      reversedEdges.set(step.id, []);
    });

    // Construire les arêtes inversées (dépendances)
    for (const [stepId, prerequisites] of edges) {
      prerequisites.forEach(prereqId => {
        if (!reversedEdges.has(prereqId)) {
          reversedEdges.set(prereqId, []);
        }
        reversedEdges.get(prereqId)?.push(stepId);
      });
    }

    return { nodes, edges, reversedEdges };
  }

  /**
   * Détecte les dépendances circulaires dans le graphe
   */
  private detectCircularDependencies(graph: PrerequisiteGraph): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularNodes: string[] = [];

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        circularNodes.push(stepId);
        return true;
      }
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const prerequisites = graph.edges.get(stepId) || [];
      for (const prereqId of prerequisites) {
        if (hasCycle(prereqId)) return true;
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const stepId of graph.nodes.keys()) {
      if (!visited.has(stepId)) {
        hasCycle(stepId);
      }
    }

    return [...new Set(circularNodes)]; // Supprimer les doublons
  }

  /**
   * Construit les séquences d'apprentissage avec niveaux
   */
  private buildLearningSequences(graph: PrerequisiteGraph): LearningSequence[] {
    const sequences: LearningSequence[] = [];
    const levelCache = new Map<string, number>();

    const calculateLevel = (stepId: string, visited = new Set<string>()): number => {
      if (levelCache.has(stepId)) return levelCache.get(stepId)!;
      if (visited.has(stepId)) return 0; // Éviter les cycles

      const prerequisites = graph.edges.get(stepId) || [];
      if (prerequisites.length === 0) {
        levelCache.set(stepId, 0);
        return 0;
      }

      visited.add(stepId);
      const maxPrereqLevel = Math.max(
        ...prerequisites.map(prereqId => calculateLevel(prereqId, visited))
      );
      visited.delete(stepId);

      const level = maxPrereqLevel + 1;
      levelCache.set(stepId, level);
      return level;
    };

    // Calculer les niveaux et construire les séquences
    for (const stepId of graph.nodes.keys()) {
      const level = calculateLevel(stepId);
      const prerequisites = graph.edges.get(stepId) || [];
      const dependents = graph.reversedEdges.get(stepId) || [];

      sequences.push({
        stepId,
        level,
        prerequisites,
        dependents,
        isEntryPoint: prerequisites.length === 0,
        isTerminal: dependents.length === 0
      });
    }

    return sequences.sort((a, b) => a.level - b.level);
  }

  /**
   * Trouve une substitution possible pour un prérequis manquant
   */
  private findPrerequisiteSubstitution(
    missingId: string,
    availableIds: Set<string>,
    step: ImportLearningStep
  ): PrerequisiteSubstitution | null {
    try {
      // Recherche par similarité de nom
      const similarIds = Array.from(availableIds).filter(id => {
        const similarity = this.calculateStringSimilarity(missingId, id);
        return similarity > 0.6;
      });

      if (similarIds.length > 0) {
        const bestMatch = similarIds.reduce((best, current) => {
          const bestSim = this.calculateStringSimilarity(missingId, best);
          const currentSim = this.calculateStringSimilarity(missingId, current);
          return currentSim > bestSim ? current : best;
        });

        return {
          originalId: missingId,
          suggestedId: bestMatch,
          reason: 'Similarité de nom',
          confidence: this.calculateStringSimilarity(missingId, bestMatch)
        };
      }

      // Recherche par contexte (étapes du même niveau ou catégorie)
      const contextualMatch = this.findContextualMatch(missingId, availableIds, step);
      if (contextualMatch) {
        return contextualMatch;
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Calcule la similarité entre deux chaînes de caractères
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calculateLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcule la distance de Levenshtein entre deux chaînes
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array.from({ length: str2.length + 1 }, () =>
      Array.from({ length: str1.length + 1 }, () => 0)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        const currentRow = matrix[j]!;
        const previousRow = matrix[j - 1]!;

        currentRow[i] = Math.min(
          currentRow[i - 1]! + 1,      // deletion
          previousRow[i]! + 1,         // insertion
          previousRow[i - 1]! + indicator // substitution
        );
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Trouve une correspondance contextuelle pour un prérequis manquant
   */
  private findContextualMatch(
    missingId: string,
    availableIds: Set<string>,
    step: ImportLearningStep
  ): PrerequisiteSubstitution | null {
    try {
      // Recherche par mots-clés dans le titre de l'étape
      const stepKeywords = this.extractKeywords(step.title.toLowerCase());
      const missingKeywords = this.extractKeywords(missingId.toLowerCase());
      
      const contextualMatches = Array.from(availableIds).filter(id => {
        const idKeywords = this.extractKeywords(id.toLowerCase());
        const commonKeywords = stepKeywords.filter(keyword => 
          idKeywords.some(idKeyword => idKeyword.includes(keyword) || keyword.includes(idKeyword))
        );
        return commonKeywords.length > 0;
      });

      if (contextualMatches.length > 0) {
        const [suggestedId] = contextualMatches;
        if (!suggestedId) {
          return null;
        }

        // Prendre le premier match contextuel
        return {
          originalId: missingId,
          suggestedId,
          reason: 'Contexte thématique similaire',
          confidence: 0.5
        };
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Extrait les mots-clés d'un texte
   */
  private extractKeywords(text: string): string[] {
    return text
      .split(/[\s\-_]+/)
      .filter(word => word.length > 2)
      .map(word => word.toLowerCase());
  }

  /**
   * Crée un enregistrement de substitution générique
   */
  private async createGenericSubstitutionStep(missingId: string): Promise<string> {
    // Pour l'instant, retourner un ID de substitution générique
    // Dans une implémentation complète, ceci créerait un enregistrement temporaire
    return `substitution-${missingId}-${Date.now()}`;
  }
}