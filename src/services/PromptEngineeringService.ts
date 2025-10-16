/**
 * Service d'ingénierie des prompts pour la génération de quiz médicaux
 * Optimisé pour les niveaux PASS et LAS avec des prompts spécialisés
 */

import { EnhancedValidationResult } from './EnhancedContentValidatorService';

export interface GenerationConfig {
  subject: string;
  categoryId?: string;
  categoryName?: string;
  studentLevel: 'PASS' | 'LAS' | 'both';
  questionCount: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  includeExplanations: boolean;
  customInstructions?: string;
  medicalDomain?: string;
}

export interface PromptContext {
  performanceData?: {
    successRate: number;
    recentTrend?: 'improving' | 'stable' | 'declining';
    commonMistakes?: string[];
  };
  sourceContent?: string;
}

export class PromptEngineeringService {
  /**
   * Construit un prompt optimisé pour la génération de quiz médical
   */
  buildQuizGenerationPrompt(config: GenerationConfig, context?: PromptContext): string {
    const basePrompt = this.getBasePrompt();
    const levelContext = this.getLevelSpecificContext(config.studentLevel);
    const medicalContext = this.getMedicalContextPrompt(config.medicalDomain || 'médecine générale');
    const structurePrompt = this.getStructurePrompt(config.questionCount);
    const adaptivePrompt = this.getAdaptivePrompt(config, context);
    const specializedPrompt = this.getSpecializedPromptForLevel(config.studentLevel, config.difficulty);
    
    return [
      basePrompt,
      levelContext,
      medicalContext,
      specializedPrompt,
      adaptivePrompt,
      structurePrompt,
      this.getOutputFormatPrompt(),
      this.getSpecificInstructions(config)
    ].join('\n\n');
  }

  /**
   * Prompt de base pour l'expert médical
   */
  private getBasePrompt(): string {
    return `Tu es un expert en éducation médicale spécialisé dans la création de QCM pour les étudiants en médecine.
Tu maîtrises parfaitement la pédagogie médicale et connais les spécificités des différents niveaux d'études.
Ton objectif est de créer des questions de haute qualité pédagogique qui favorisent l'apprentissage.`;
  }

  /**
   * Contexte spécifique selon le niveau d'études
   */
  private getLevelSpecificContext(level: string): string {
    const contexts = {
      'PASS': `CONTEXTE PASS (1ère année médecine):
- Étudiants débutants en médecine
- Focus sur les bases fondamentales : anatomie, physiologie, biochimie
- Éviter les concepts cliniques avancés
- Privilégier la compréhension des mécanismes de base
- Vocabulaire médical accessible mais précis
- Questions progressives et formatives`,

      'LAS': `CONTEXTE LAS (Licence Accès Santé):
- Étudiants en licence avec option santé
- Niveau intermédiaire entre lycée et médecine
- Concepts médicaux accessibles et bien expliqués
- Lien avec les sciences fondamentales
- Préparation aux études de santé
- Questions de découverte et d'initiation`,

      'both': `CONTEXTE MIXTE (PASS/LAS):
- Questions adaptées aux deux niveaux
- Concepts fondamentaux communs
- Éviter les spécificités trop avancées
- Focus sur les bases essentielles
- Accessibilité maximale`
    };

    return contexts[level as keyof typeof contexts] || contexts['PASS'];
  }

  /**
   * Contexte médical spécialisé par domaine
   */
  private getMedicalContextPrompt(domain: string): string {
    const domainContexts: Record<string, string> = {
      'anatomie': `DOMAINE: Anatomie
- Structures anatomiques et leurs relations
- Localisation et orientation spatiale
- Nomenclature anatomique précise
- Corrélations structure-fonction`,

      'physiologie': `DOMAINE: Physiologie
- Mécanismes et processus biologiques
- Régulation et homéostasie
- Interactions entre systèmes
- Bases moléculaires et cellulaires`,

      'pathologie': `DOMAINE: Pathologie
- Mécanismes pathologiques
- Étiologie et physiopathologie
- Manifestations cliniques de base
- Corrélations anatomo-pathologiques`,

      'pharmacologie': `DOMAINE: Pharmacologie
- Mécanismes d'action des médicaments
- Pharmacocinétique et pharmacodynamie
- Effets thérapeutiques et indésirables
- Classifications pharmacologiques`,

      'biochimie': `DOMAINE: Biochimie
- Métabolisme et voies biochimiques
- Enzymes et régulation
- Bases moléculaires des processus
- Corrélations biochimie-physiologie`
    };

    return domainContexts[domain.toLowerCase()] || `DOMAINE: ${domain}
- Concepts fondamentaux du domaine
- Bases théoriques et pratiques
- Vocabulaire spécialisé approprié
- Applications pédagogiques`;
  }

  /**
   * Prompt adaptatif basé sur les performances
   */
  private getAdaptivePrompt(config: GenerationConfig, context?: PromptContext): string {
    if (!context?.performanceData) {
      return this.getStandardDifficultyPrompt(config.difficulty || 'medium');
    }

    const { successRate, recentTrend, commonMistakes } = context.performanceData;
    let adaptiveInstructions = '';

    // Adaptation selon le taux de réussite
    if (successRate < 0.3) {
      adaptiveInstructions += `ADAPTATION PÉDAGOGIQUE (Taux de réussite faible: ${Math.round(successRate * 100)}%):
- Privilégier des questions FONDAMENTALES et PROGRESSIVES
- Utiliser des formulations CLAIRES sans ambiguïté
- Distracteurs ÉDUCATIFS (erreurs classiques à éviter)
- Ajouter des INDICES subtils dans la question
- Focus sur la COMPRÉHENSION des concepts de base
- Explications très détaillées avec rappels théoriques`;
    } else if (successRate < 0.6) {
      adaptiveInstructions += `ADAPTATION PÉDAGOGIQUE (Taux de réussite moyen: ${Math.round(successRate * 100)}%):
- Questions de CONSOLIDATION des acquis
- Introduire des cas cliniques SIMPLES mais réalistes
- Distracteurs testant la DISCRIMINATION entre concepts proches
- Encourager le raisonnement clinique de base
- Explications claires avec liens théorie-pratique`;
    } else {
      adaptiveInstructions += `ADAPTATION PÉDAGOGIQUE (Bonne maîtrise: ${Math.round(successRate * 100)}%):
- Questions de PERFECTIONNEMENT et cas COMPLEXES
- Situations cliniques ATYPIQUES ou RARES
- Distracteurs subtils nécessitant une analyse fine
- Tester la capacité à gérer EXCEPTIONS et NUANCES
- Explications approfondies avec références aux cas limites`;
    }

    // Adaptation selon la tendance
    if (recentTrend === 'declining') {
      adaptiveInstructions += `\n\n⚠️ TENDANCE NÉGATIVE DÉTECTÉE:
- Privilégier la révision des bases
- Questions formatives et encourageantes
- Réduire légèrement la difficulté
- Renforcer les explications pédagogiques`;
    } else if (recentTrend === 'improving') {
      adaptiveInstructions += `\n\n✅ PROGRESSION POSITIVE:
- Possibilité d'augmenter légèrement la difficulté
- Introduire de nouveaux concepts
- Maintenir la motivation par des défis appropriés`;
    }

    // Cibler les erreurs communes
    if (commonMistakes && commonMistakes.length > 0) {
      adaptiveInstructions += `\n\nERREURS FRÉQUENTES À CIBLER:
${commonMistakes.map(mistake => `- ${mistake}`).join('\n')}

Créer des distracteurs qui testent spécifiquement ces confusions pour aider à progresser.`;
    }

    return adaptiveInstructions;
  }

  /**
   * Prompt de difficulté standard
   */
  private getStandardDifficultyPrompt(difficulty: string): string {
    const difficultyPrompts = {
      'easy': `NIVEAU DE DIFFICULTÉ: Facile
- Questions sur les concepts de base
- Formulations directes et claires
- Distracteurs évidents pour les non-initiés
- Focus sur la mémorisation et compréhension simple`,

      'medium': `NIVEAU DE DIFFICULTÉ: Moyen
- Questions nécessitant réflexion et analyse
- Cas cliniques simples
- Distracteurs plausibles nécessitant discrimination
- Application des connaissances théoriques`,

      'hard': `NIVEAU DE DIFFICULTÉ: Difficile
- Questions complexes et cas atypiques
- Analyse critique et raisonnement avancé
- Distracteurs subtils et piégeurs
- Intégration de plusieurs concepts`
    };

    return difficultyPrompts[difficulty as keyof typeof difficultyPrompts] || difficultyPrompts['medium'];
  }

  /**
   * Instructions pour la structure du quiz
   */
  private getStructurePrompt(questionCount: number): string {
    return `STRUCTURE DU QUIZ:
- Nombre de questions: ${questionCount}
- Chaque question doit avoir exactement 4 options (A, B, C, D)
- Une seule option correcte par question
- Explications détaillées obligatoires
- Progression logique dans la difficulté si plusieurs questions`;
  }

  /**
   * Format de sortie JSON strict
   */
  private getOutputFormatPrompt(): string {
    return `FORMAT DE RÉPONSE (JSON strict uniquement):
{
  "quiz": {
    "title": "Titre descriptif du quiz",
    "description": "Description courte du contenu",
    "estimatedDuration": 15
  },
  "questions": [
    {
      "questionText": "Texte complet de la question médicale",
      "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
      ],
      "explanation": "Explication détaillée de la bonne réponse et pourquoi les autres sont incorrectes",
      "difficulty": "easy|medium|hard",
      "tags": ["tag1", "tag2"]
    }
  ]
}

IMPORTANT:
- Réponds UNIQUEMENT avec du JSON valide
- Aucun texte avant ou après le JSON
- Respecte strictement la structure demandée`;
  }

  /**
   * Instructions spécifiques selon la configuration
   */
  private getSpecificInstructions(config: GenerationConfig): string {
    let instructions = `INSTRUCTIONS SPÉCIFIQUES:
- Sujet principal: ${config.subject}`;

    if (config.categoryName) {
      instructions += `\n- Catégorie: ${config.categoryName}`;
    }

    if (config.customInstructions) {
      instructions += `\n- Instructions personnalisées: ${config.customInstructions}`;
    }

    instructions += `\n- Inclure des explications: ${config.includeExplanations ? 'OUI' : 'NON'}`;

    instructions += `\n\nRÈGLES DE QUALITÉ:
- Questions cliniquement pertinentes et réalistes
- Vocabulaire médical précis mais adapté au niveau
- Distracteurs plausibles et éducatifs
- Explications pédagogiques favorisant l'apprentissage
- Respect de l'éthique médicale et de la déontologie

RÈGLES CRITIQUES POUR LES OPTIONS DE RÉPONSE:
- Les 4 options doivent être CLAIREMENT DISTINCTES les unes des autres
- Éviter les options qui ne diffèrent que par 1 ou 2 mots
- Chaque distracteur doit représenter une erreur conceptuelle DIFFÉRENTE
- Ne pas créer d'options trop similaires sémantiquement
- Varier significativement la structure et le contenu de chaque option`;

    return instructions;
  }

  /**
   * Génère un prompt pour une question spécifique basée sur du contenu source
   */
  buildContentBasedPrompt(content: string, config: GenerationConfig): string {
    const basePrompt = this.buildQuizGenerationPrompt(config);
    
    return `${basePrompt}

CONTENU SOURCE À UTILISER:
${content.substring(0, 2000)}

INSTRUCTIONS SUPPLÉMENTAIRES:
- Base tes questions sur le contenu fourni ci-dessus
- Assure-toi que les questions testent la compréhension du contenu
- Les réponses doivent être trouvables dans le contenu source
- Adapte le niveau de complexité au contenu disponible`;
  }

  /**
   * Valide la qualité d'un prompt généré
   */
  validatePrompt(prompt: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (prompt.length < 500) {
      issues.push('Prompt trop court, manque de contexte');
    }

    if (prompt.length > 8000) {
      issues.push('Prompt trop long, risque de dépassement de tokens');
    }

    if (!prompt.includes('JSON')) {
      issues.push('Format de sortie JSON non spécifié');
    }

    if (!prompt.includes('médical') && !prompt.includes('médecine')) {
      issues.push('Contexte médical non spécifié');
    }

    if (!prompt.includes('PASS') && !prompt.includes('LAS')) {
      issues.push('Niveau d\'études non spécifié');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Génère des prompts spécialisés selon le niveau d'études
   */
  private getSpecializedPromptForLevel(level: string, difficulty?: string): string {
    const difficultyLevel = difficulty || 'medium';
    
    if (level === 'PASS') {
      return this.getPASSSpecializedPrompt(difficultyLevel);
    } else if (level === 'LAS') {
      return this.getLASSpecializedPrompt(difficultyLevel);
    } else {
      return this.getMixedLevelPrompt(difficultyLevel);
    }
  }

  /**
   * Prompt spécialisé pour le niveau PASS (1ère année médecine)
   */
  private getPASSSpecializedPrompt(difficulty: string): string {
    const basePrompt = `SPÉCIALISATION PASS (1ère année médecine):
- Focus sur les BASES FONDAMENTALES de la médecine
- Anatomie descriptive et fonctionnelle
- Physiologie des grands systèmes
- Biochimie structurale et métabolique
- Histologie et embryologie de base
- Éviter les aspects cliniques avancés
- Privilégier la compréhension des MÉCANISMES`;

    const difficultyAdjustments = {
      'easy': `
ADAPTATION DIFFICULTÉ FACILE PASS:
- Questions sur la NOMENCLATURE et LOCALISATION anatomique
- Mécanismes physiologiques SIMPLES et DIRECTS
- Définitions et classifications de base
- Une seule notion par question
- Distracteurs basés sur des confusions classiques de débutants`,

      'medium': `
ADAPTATION DIFFICULTÉ MOYENNE PASS:
- Corrélations STRUCTURE-FONCTION simples
- Mécanismes physiologiques avec 2-3 étapes
- Applications des connaissances de base
- Comparaisons entre systèmes similaires
- Distracteurs nécessitant une réflexion sur les bases`,

      'hard': `
ADAPTATION DIFFICULTÉ ÉLEVÉE PASS:
- Intégration de plusieurs systèmes anatomiques
- Mécanismes physiologiques complexes mais fondamentaux
- Cas d'application des connaissances théoriques
- Analyse de situations pathologiques simples
- Distracteurs subtils sur les exceptions aux règles de base`
    };

    return basePrompt + '\n' + (difficultyAdjustments[difficulty as keyof typeof difficultyAdjustments] || difficultyAdjustments['medium']);
  }

  /**
   * Prompt spécialisé pour le niveau LAS (Licence Accès Santé)
   */
  private getLASSpecializedPrompt(difficulty: string): string {
    const basePrompt = `SPÉCIALISATION LAS (Licence Accès Santé):
- Approche PROGRESSIVE vers les sciences médicales
- Lien avec les sciences fondamentales (biologie, chimie, physique)
- Introduction aux concepts médicaux ACCESSIBLES
- Préparation aux études de santé
- Vocabulaire médical EXPLIQUÉ et contextualisé
- Focus sur la DÉCOUVERTE et l'INITIATION`;

    const difficultyAdjustments = {
      'easy': `
ADAPTATION DIFFICULTÉ FACILE LAS:
- Concepts médicaux de BASE avec explications détaillées
- Liens avec les connaissances de lycée
- Vocabulaire médical SIMPLE et bien défini
- Questions d'introduction aux domaines médicaux
- Distracteurs basés sur les idées reçues communes`,

      'medium': `
ADAPTATION DIFFICULTÉ MOYENNE LAS:
- Applications des sciences fondamentales en médecine
- Concepts médicaux INTERMÉDIAIRES bien expliqués
- Introduction aux méthodes de raisonnement médical
- Corrélations entre différentes disciplines scientifiques
- Distracteurs testant la compréhension conceptuelle`,

      'hard': `
ADAPTATION DIFFICULTÉ ÉLEVÉE LAS:
- Cas d'application complexes mais accessibles
- Intégration de plusieurs disciplines scientifiques
- Introduction aux problématiques médicales actuelles
- Raisonnement scientifique appliqué à la santé
- Distracteurs nécessitant une analyse approfondie`
    };

    return basePrompt + '\n' + (difficultyAdjustments[difficulty as keyof typeof difficultyAdjustments] || difficultyAdjustments['medium']);
  }

  /**
   * Prompt pour niveau mixte (PASS/LAS)
   */
  private getMixedLevelPrompt(difficulty: string): string {
    return `SPÉCIALISATION MIXTE (PASS/LAS):
- Concepts FONDAMENTAUX communs aux deux niveaux
- Éviter les spécificités trop avancées ou trop spécialisées
- Focus sur les BASES ESSENTIELLES de la médecine
- Accessibilité MAXIMALE tout en restant rigoureux
- Vocabulaire médical STANDARD et bien expliqué
- Questions formatives et progressives

ADAPTATION DIFFICULTÉ ${difficulty.toUpperCase()}:
- Niveau adapté aux étudiants débutants en médecine
- Progression pédagogique respectée
- Explications détaillées pour favoriser l'apprentissage`;
  }

  /**
   * Construit un prompt dynamique basé sur les paramètres de performance
   */
  buildDynamicPrompt(config: GenerationConfig, performanceData?: {
    successRate: number;
    commonMistakes: string[];
    weakAreas: string[];
    strongAreas: string[];
  }): string {
    let dynamicInstructions = '';

    if (performanceData) {
      // Adaptation basée sur le taux de réussite
      if (performanceData.successRate < 0.4) {
        dynamicInstructions += `
ADAPTATION PERFORMANCE FAIBLE (${Math.round(performanceData.successRate * 100)}%):
- Privilégier les questions FORMATIVES et ENCOURAGEANTES
- Réduire la complexité et augmenter les indices
- Focus sur les concepts FONDAMENTAUX
- Explications très détaillées avec rappels théoriques
- Distracteurs ÉDUCATIFS plutôt que piégeurs`;
      } else if (performanceData.successRate > 0.8) {
        dynamicInstructions += `
ADAPTATION PERFORMANCE ÉLEVÉE (${Math.round(performanceData.successRate * 100)}%):
- Augmenter le niveau de DÉFI et de COMPLEXITÉ
- Introduire des cas ATYPIQUES ou AVANCÉS
- Tester les NUANCES et EXCEPTIONS
- Questions de PERFECTIONNEMENT
- Distracteurs subtils nécessitant une analyse fine`;
      }

      // Cibler les erreurs communes
      if (performanceData.commonMistakes.length > 0) {
        dynamicInstructions += `

ERREURS COMMUNES À CORRIGER:
${performanceData.commonMistakes.map(mistake => `- ${mistake}`).join('\n')}

Créer des questions qui aident à CORRIGER ces erreurs spécifiques.`;
      }

      // Éviter les domaines déjà maîtrisés
      if (performanceData.strongAreas.length > 0) {
        dynamicInstructions += `

DOMAINES DÉJÀ MAÎTRISÉS (éviter la répétition):
${performanceData.strongAreas.map(area => `- ${area}`).join('\n')}`;
      }

      // Renforcer les domaines faibles
      if (performanceData.weakAreas.length > 0) {
        dynamicInstructions += `

DOMAINES À RENFORCER (priorité):
${performanceData.weakAreas.map(area => `- ${area}`).join('\n')}

Concentrer les questions sur ces domaines pour améliorer la maîtrise.`;
      }
    }

    const basePrompt = this.buildQuizGenerationPrompt(config);
    return dynamicInstructions ? basePrompt + '\n\n' + dynamicInstructions : basePrompt;
  }

  /**
   * Génère un prompt pour la régénération après échec de validation
   */
  buildRetryPrompt(config: GenerationConfig, validationErrors: string[]): string {
    const basePrompt = this.buildQuizGenerationPrompt(config);
    
    const retryInstructions = `
CORRECTION DES ERREURS PRÉCÉDENTES:
Les erreurs suivantes ont été détectées dans la génération précédente:
${validationErrors.map(error => `- ${error}`).join('\n')}

INSTRUCTIONS CORRECTIVES:
- Corriger spécifiquement ces problèmes
- Vérifier la structure JSON avant de répondre
- S'assurer qu'il y a exactement UNE bonne réponse par question
- Respecter les longueurs minimales (question: 20 char, explication: 50 char)
- Utiliser un vocabulaire médical approprié au niveau
- Éviter les doublons dans les options de réponse

ATTENTION: Cette génération doit être PARFAITE pour éviter un nouvel échec.`;

    return basePrompt + '\n\n' + retryInstructions;
  }

  /**
   * Valide et optimise un prompt avant utilisation
   */
  optimizePrompt(prompt: string, maxTokens: number = 4000): string {
    // Estimation approximative: 1 token ≈ 4 caractères
    const estimatedTokens = prompt.length / 4;
    
    if (estimatedTokens <= maxTokens) {
      return prompt;
    }

    // Réduction intelligente du prompt
    const sections = prompt.split('\n\n');
    let optimizedPrompt = '';
    let currentTokens = 0;

    // Garder les sections essentielles en priorité
    const essentialSections = sections.filter(section => 
      section.includes('FORMAT DE RÉPONSE') ||
      section.includes('IMPORTANT:') ||
      section.includes('SPÉCIALISATION') ||
      section.includes('CONTEXTE')
    );

    for (const section of essentialSections) {
      const sectionTokens = section.length / 4;
      if (currentTokens + sectionTokens <= maxTokens) {
        optimizedPrompt += section + '\n\n';
        currentTokens += sectionTokens;
      }
    }

    // Ajouter les autres sections si possible
    const otherSections = sections.filter(section => !essentialSections.includes(section));
    for (const section of otherSections) {
      const sectionTokens = section.length / 4;
      if (currentTokens + sectionTokens <= maxTokens) {
        optimizedPrompt += section + '\n\n';
        currentTokens += sectionTokens;
      }
    }

    return optimizedPrompt.trim();
  }
}