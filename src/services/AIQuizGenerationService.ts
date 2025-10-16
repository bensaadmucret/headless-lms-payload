import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import type { Payload } from 'payload';

// Services intégrés pour la tâche 4
import { PromptEngineeringService, GenerationConfig as PromptConfig } from './PromptEngineeringService';
import { ContentValidatorService, ValidationResult, AIGeneratedQuiz, AIGeneratedQuestion } from './ContentValidatorService';
import { AIAPIService, AIRequest, AIResponse } from './AIAPIService';
// Service de création automatique pour la tâche 5
import { QuizCreationService, QuizCreationRequest, QuizCreationResult } from './QuizCreationService';
// Service d'audit pour la tâche 6
import { AIQuizAuditService } from './AIQuizAuditService';

export interface QuestionGenerationRequest {
  categoryId?: string;
  categoryName?: string;
  courseId?: string;
  courseName?: string;
  difficultyLevel: 'pass' | 'las';
  questionCount: number;
  medicalDomain?: string;
  sourceContent?: string; // Contenu source pour générer la question
  performanceContext?: {
    successRate: number;              // 0-1
    totalAttempts: number;            // Nombre de questions tentées
    averageTimePerQuestion?: number;  // Temps moyen en secondes
    recentTrend?: 'improving' | 'stable' | 'declining';
    commonMistakes?: string[];        // Types d'erreurs fréquentes
    lastAttemptDate?: string;
  };
}

// Interfaces pour fonctionnalités avancées - à activer progressivement
// export interface QuizGenerationRequest {
//   subject: string;
//   categoryId?: string;
//   categoryName?: string;
//   studentLevel: 'PASS' | 'LAS' | 'both';
//   questionCount: number;
//   difficulty?: 'easy' | 'medium' | 'hard';
//   includeExplanations: boolean;
//   customInstructions?: string;
//   medicalDomain?: string;
//   userId: string;
// }

// export interface QuizGenerationResult {
//   success: boolean;
//   quizId?: string;
//   questionsCreated: number;
//   validationScore: number;
//   errors?: string[];
//   warnings?: string[];
//   generationTime: number;
// }
export interface GeneratedQuestion {
  questionText: string;
  options: Array<{
    optionText: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  categoryId?: string;
  courseId?: string;
  difficultyLevel: 'pass' | 'las';
  generatedByAI: true;
  aiGenerationPrompt: string;
  medicalDomain?: string;
  estimatedDifficulty?: 'easy' | 'medium' | 'hard';
  qualityScore?: number;
  validationIssues?: string[];
}

interface AIConfig {
  model: string;
  generationConfig: GenerationConfig;
}

export class AIQuizGenerationService {
  private client: GoogleGenerativeAI;
  private config: AIConfig;
  private cache: Map<string, { data: GeneratedQuestion[]; timestamp: number }>;
  private rateLimiter: Map<string, { count: number; resetTime: number }>;
  
  // Services intégrés - maintenant activés pour la tâche 4
  private promptService: PromptEngineeringService;
  private validatorService: ContentValidatorService;
  private apiService: AIAPIService;
  // Service de création automatique - tâche 5
  private quizCreationService?: QuizCreationService;
  // Service d'audit - tâche 6
  private auditService?: AIQuizAuditService;

  // Limites de taux : 10 questions par minute par domaine médical
  private readonly RATE_LIMIT_REQUESTS = 10;
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures
  private readonly MAX_GENERATION_ATTEMPTS = 3;

  constructor(private payload?: Payload) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.config = {
      model: 'gemini-2.0-flash', // Using Gemini 2.0 Flash - fast and efficient
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
      },
    };

    // Initialiser le cache et le rate limiter
    this.cache = new Map();
    this.rateLimiter = new Map();
    
    // Services intégrés - maintenant activés pour la tâche 4
    try {
      this.promptService = new PromptEngineeringService();
      this.validatorService = new ContentValidatorService();
      this.apiService = new AIAPIService();
      // Service de création automatique - tâche 5
      if (this.payload) {
        this.quizCreationService = new QuizCreationService(this.payload);
        // Service d'audit - tâche 6
        this.auditService = new AIQuizAuditService(this.payload);
      }
      console.log('✅ Services IA avancés initialisés');
    } catch (error) {
      console.error('❌ Erreur initialisation services IA:', error);
      throw new Error('Impossible d\'initialiser les services IA requis');
    }
  }

  // NOTE: Fonctionnalités avancées (generateCompleteQuiz, createQuizInDatabase) 
  // temporairement désactivées - à réactiver progressivement après tests

  async generateQuestions(request: QuestionGenerationRequest, userId?: string | number): Promise<GeneratedQuestion[]> {
    const startTime = Date.now();
    let auditLogId: string | undefined;

    try {
      console.log('🧠 Début génération de questions IA:', {
        count: request.questionCount,
        category: request.categoryName,
        level: request.difficultyLevel,
        domain: request.medicalDomain,
      });

      // Démarrer l'audit si le service est disponible et userId fourni
      if (this.auditService && userId) {
        auditLogId = await this.auditService.startGenerationLog(
          userId,
          'ai_questions_generation',
          {
            categoryId: request.categoryId,
            categoryName: request.categoryName,
            studentLevel: request.difficultyLevel === 'pass' ? 'PASS' : 'LAS',
            questionCount: request.questionCount,
            medicalDomain: request.medicalDomain,
          },
          {
            requestId: `gen_${Date.now()}`,
            environment: process.env.NODE_ENV || 'development',
          }
        );
      }

      const questions: GeneratedQuestion[] = [];
      let totalAiResponseTime = 0;
      let totalValidationTime = 0;
      let totalRetries = 0;

      for (let i = 0; i < request.questionCount; i++) {
        const prompt = this.buildQuestionPrompt(request, i + 1);

        let attempts = 0;
        let validatedQuestion: GeneratedQuestion | null = null;

        while (attempts < this.MAX_GENERATION_ATTEMPTS && !validatedQuestion) {
          attempts++;
          totalRetries += attempts > 1 ? 1 : 0;

          const aiStartTime = Date.now();
          const question = await this.generateSingleQuestion(prompt, request);
          totalAiResponseTime += Date.now() - aiStartTime;

          const validationStartTime = Date.now();
          const validation = this.validateGeneratedQuestion(question);
          totalValidationTime += Date.now() - validationStartTime;

          // Accepter les questions avec un score minimum de 0.5 (au lieu de rejeter complètement)
          if (validation.isValid || validation.score >= 0.5) {
            if (!validation.isValid) {
              console.warn('⚠️ Question acceptée malgré des problèmes mineurs', {
                attempt: attempts,
                score: validation.score,
                issues: validation.issues
              });
            }
            
            validatedQuestion = {
              ...question,
              qualityScore: validation.score,
              validationIssues: validation.issues
            };
          } else {
            console.warn('⚠️ Question IA rejetée par la validation', {
              attempt: attempts,
              score: validation.score,
              issues: validation.issues
            });

            if (attempts >= this.MAX_GENERATION_ATTEMPTS) {
              // En dernier recours, accepter la question même avec un score faible
              console.warn('⚠️ Acceptation forcée après max tentatives', {
                score: validation.score,
                issues: validation.issues
              });
              
              validatedQuestion = {
                ...question,
                qualityScore: validation.score,
                validationIssues: validation.issues
              };
              
              // Logger l'avertissement si audit disponible
              if (this.auditService && auditLogId) {
                await this.auditService.failGenerationLog(
                  auditLogId,
                  {
                    type: 'validation_warning',
                    message: `Question acceptée avec score faible: ${validation.score}`,
                    details: { validationIssues: validation.issues, questionIndex: i + 1 }
                  },
                  {
                    duration: Date.now() - startTime,
                    aiResponseTime: totalAiResponseTime,
                    validationTime: totalValidationTime,
                    retryCount: totalRetries + 1,
                  }
                );
              }
              
              throw error;
            }
          }
        }

        if (validatedQuestion) {
          questions.push(validatedQuestion);
        }
      }

      const totalDuration = Date.now() - startTime;
      const averageValidationScore = questions.reduce((sum, q) => sum + (q.qualityScore || 0), 0) / questions.length;

      // Logger le succès si audit disponible
      if (this.auditService && auditLogId) {
        await this.auditService.completeGenerationLog(
          auditLogId,
          {
            questionsCreated: questions.length,
            validationScore: Math.round(averageValidationScore),
            aiModel: this.config.model,
          },
          {
            duration: totalDuration,
            aiResponseTime: totalAiResponseTime,
            validationTime: totalValidationTime,
            retryCount: totalRetries,
          }
        );
      }

      console.log(`✅ ${questions.length} questions générées avec succès`);
      return questions;

    } catch (error) {
      console.error('❌ Erreur génération questions IA:', error);
      
      // Logger l'échec si audit disponible et pas déjà loggé
      if (this.auditService && auditLogId && error instanceof Error) {
        await this.auditService.failGenerationLog(
          auditLogId,
          {
            type: 'ai_api_error',
            message: error.message,
            details: { originalError: error.name }
          },
          {
            duration: Date.now() - startTime,
          }
        );
      }
      
      throw new Error('Échec de la génération de questions par IA');
    }
  }

  /**
   * Génère une seule question
   */
  private async generateSingleQuestion(prompt: string, request: QuestionGenerationRequest): Promise<GeneratedQuestion> {
    const generationConfig = {
      ...this.config.generationConfig,
      responseMimeType: 'application/json',
    };

    const model = this.client.getGenerativeModel({
      model: this.config.model,
      generationConfig,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return this.parseQuestionResponse(text, prompt, request);
  }

  /**
   * Construit le prompt pour générer une question
   */
  private buildQuestionPrompt(request: QuestionGenerationRequest, questionNumber: number): string {
    const level = request.difficultyLevel === 'pass' ? 'PASS (1ère année)' : 'LAS (2ème année)';
    const domain = request.medicalDomain || 'médecine générale';

    // Déterminer la difficulté cible selon les performances
    let targetDifficulty = 'medium';
    let pedagogicalApproach = '';

    if (request.performanceContext) {
      const { successRate, recentTrend, totalAttempts } = request.performanceContext;

      if (successRate < 0.3) {
        targetDifficulty = 'easy';
        pedagogicalApproach = `
APPROCHE PÉDAGOGIQUE ADAPTÉE:
- L'étudiant a un taux de réussite faible (${(successRate * 100).toFixed(0)}% sur ${totalAttempts} questions)
- Privilégie des questions FONDAMENTALES et PROGRESSIVES
- Utilise des formulations CLAIRES sans ambiguité
- Les distracteurs doivent être ÉDUCATIFS (erreurs classiques à éviter)
- Ajoute des INDICES subtils dans la question pour guider vers la bonne réponse
- Focus sur la COMPRÉHENSION des concepts de base
- Explication très détaillée avec rappels théoriques`;
      } else if (successRate < 0.6) {
        targetDifficulty = 'medium';
        pedagogicalApproach = `
APPROCHE PÉDAGOGIQUE ADAPTÉE:
- L'étudiant a un taux de réussite moyen (${(successRate * 100).toFixed(0)}% sur ${totalAttempts} questions)
- Questions de CONSOLIDATION des acquis
- Introduis des cas cliniques SIMPLES mais réalistes
- Les distracteurs doivent tester la DISCRIMINATION entre concepts proches
- Encourage le raisonnement clinique de base
- Explication claire avec liens entre théorie et pratique`;
      } else {
        targetDifficulty = 'hard';
        pedagogicalApproach = `
APPROCHE PÉDAGOGIQUE ADAPTÉE:
- L'étudiant maîtrise bien ce domaine (${(successRate * 100).toFixed(0)}% sur ${totalAttempts} questions)
- Questions de PERFECTIONNEMENT et cas COMPLEXES
- Situations cliniques ATYPIQUES ou RARES
- Distracteurs subtils nécessitant une analyse fine
- Teste la capacité à gérer des EXCEPTIONS et NUANCES
- Explication approfondie avec références aux cas limites`;
      }

      // Adapter selon la tendance
      if (recentTrend === 'declining') {
        pedagogicalApproach += `\n- ⚠️ ATTENTION: Tendance à la baisse récente - privilégie la révision des bases et questions formatives`;
        // Réduire la difficulté si tendance négative
        if (targetDifficulty === 'hard') targetDifficulty = 'medium';
        if (targetDifficulty === 'medium') targetDifficulty = 'easy';
      } else if (recentTrend === 'improving') {
        pedagogicalApproach += `\n- ✅ Progression positive - tu peux augmenter légèrement la difficulté pour stimuler`;
      }

      // Ajouter les erreurs communes si disponibles
      if (request.performanceContext.commonMistakes && request.performanceContext.commonMistakes.length > 0) {
        pedagogicalApproach += `\n\nERREURS FRÉQUENTES À CIBLER:\nL'étudiant fait souvent ces erreurs dans ce domaine:\n${request.performanceContext.commonMistakes.map(m => `- ${m}`).join('\n')}\n\nCrée des distracteurs qui testent spécifiquement ces confusions pour l'aider à progresser.`;
      }
    }

    let prompt = `Tu es un expert en pédagogie médicale et en création de questions d'examen. Génère une question de QCM médicale de haute qualité ADAPTÉE au niveau de l'étudiant.

CONTEXTE:
- Niveau d'études: ${level}
- Domaine médical: ${domain}
${request.categoryName ? `- Catégorie: ${request.categoryName}` : ''}
${request.courseName ? `- Cours associé: ${request.courseName}` : ''}${pedagogicalApproach}

`;

    if (request.sourceContent) {
      prompt += `CONTENU SOURCE À UTILISER:
${request.sourceContent.substring(0, 2000)}

`;
    }

    prompt += `
RÈGLES DE CRÉATION:
- Difficulté cible: ${targetDifficulty}
- Question claire, précise et pédagogique
- 4 options de réponse (A, B, C, D)
- 1 seule bonne réponse
- Niveau adapté à ${level}
- Vocabulaire médical approprié mais accessible
- Distracteurs adaptés au niveau de l'étudiant
- Explication adaptée au niveau (plus détaillée si difficultés)

FORMAT DE RÉPONSE JSON:
{
  "questionText": "Texte complet de la question médicale",
  "options": [
    {"optionText": "Réponse A", "isCorrect": true},
    {"optionText": "Réponse B", "isCorrect": false},
    {"optionText": "Réponse C", "isCorrect": false},
    {"optionText": "Réponse D", "isCorrect": false}
  ],
  "explanation": "Explication détaillée de la bonne réponse et pourquoi les autres sont incorrectes",
  "estimatedDifficulty": "easy|medium|hard"
}

IMPORTANT:
- Réponds UNIQUEMENT avec du JSON valide
- La question doit être cliniquement pertinente
- L'explication doit être pédagogique et adaptée au niveau
- Respecte strictement le format demandé
- La difficulté estimée doit correspondre à ${targetDifficulty}

QUESTION ${questionNumber}:`;

    return prompt;
  }

  /**
   * Parse la réponse JSON de l'IA
   */
  private parseQuestionResponse(response: string, prompt: string, request: QuestionGenerationRequest): GeneratedQuestion {
    try {
      // Nettoyer la réponse
      let cleaned = response.trim();

      // Extraire le JSON si entouré de texte
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);

      // Validation des données
      if (!parsed.questionText || !Array.isArray(parsed.options) || parsed.options.length !== 4) {
        throw new Error('Structure de réponse invalide');
      }

      // Vérifier qu'il y a exactement une bonne réponse
      const correctCount = parsed.options.filter((opt: { isCorrect: boolean }) => opt.isCorrect).length;
      if (correctCount !== 1) {
        throw new Error('Doit avoir exactement une bonne réponse');
      }

      return {
        questionText: parsed.questionText,
        options: parsed.options,
        explanation: parsed.explanation || 'Explication non fournie par l\'IA',
        categoryId: request.categoryId,
        courseId: request.courseId,
        difficultyLevel: request.difficultyLevel,
        generatedByAI: true,
        aiGenerationPrompt: prompt,
        medicalDomain: request.medicalDomain,
        estimatedDifficulty: ['easy', 'medium', 'hard'].includes(parsed.estimatedDifficulty)
          ? parsed.estimatedDifficulty
          : 'medium',
      };

    } catch (error) {
      console.error('❌ Erreur parsing réponse question IA:', error);
      throw new Error('Réponse IA invalide pour la génération de question');
    }
  }

  /**
   * Génère des questions basées sur un contenu spécifique
   */
  async generateQuestionsFromContent(
    content: string,
    categoryId?: string,
    courseId?: string,
    difficultyLevel: 'pass' | 'las' = 'pass',
    count: number = 3
  ): Promise<GeneratedQuestion[]> {
    return this.generateQuestions({
      categoryId,
      courseId,
      difficultyLevel,
      questionCount: count,
      sourceContent: content,
    });
  }

  /**
   * Génère une question par domaine médical
   */
  async generateQuestionByDomain(
    domain: string,
    difficultyLevel: 'pass' | 'las' = 'pass'
  ): Promise<GeneratedQuestion> {
    const questions = await this.generateQuestions({
      medicalDomain: domain,
      difficultyLevel,
      questionCount: 1,
    });

    if (!questions.length) {
      throw new Error('Aucune question générée pour le domaine spécifié');
    }

    return questions[0]!;
  }

  /**
   * Génère et crée automatiquement un quiz complet en base de données
   * Tâche 5: Création automatique des quiz et questions
   */
  async generateAndCreateCompleteQuiz(config: {
    subject: string;
    categoryId: string;
    categoryName?: string;
    courseId?: string;
    courseName?: string;
    studentLevel: 'PASS' | 'LAS' | 'both';
    questionCount: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    includeExplanations: boolean;
    customInstructions?: string;
    medicalDomain?: string;
    userId: string;
    published?: boolean;
  }): Promise<QuizCreationResult> {
    const startTime = Date.now();
    console.log('🚀 Génération et création automatique de quiz complet:', {
      subject: config.subject,
      level: config.studentLevel,
      questions: config.questionCount,
      category: config.categoryName
    });

    // Démarrer le log d'audit
    let auditLogId: string | undefined;
    if (this.auditService) {
      try {
        auditLogId = await this.auditService.startGenerationLog(
          config.userId,
          'auto_quiz_creation',
          {
            subject: config.subject,
            categoryId: config.categoryId,
            categoryName: config.categoryName,
            studentLevel: config.studentLevel,
            questionCount: config.questionCount,
            difficulty: config.difficulty,
            medicalDomain: config.medicalDomain,
            includeExplanations: config.includeExplanations,
            customInstructions: config.customInstructions,
          }
        );
      } catch (auditError) {
        console.warn('⚠️ Erreur démarrage audit log:', auditError);
      }
    }

    try {
      if (!this.quizCreationService) {
        throw new Error('Service de création de quiz non initialisé');
      }

      // 1. Génération du contenu IA
      const generationResult = await this.generateCompleteQuiz(config);
      
      if (!generationResult.success || !generationResult.quiz) {
        // Log d'audit pour échec de génération
        if (this.auditService && auditLogId) {
          await this.auditService.failGenerationLog(auditLogId, {
            type: 'ai_api_error',
            message: 'Échec de la génération IA',
            details: generationResult.errors,
          }, {
            duration: Date.now() - startTime,
            retryCount: 1,
          });
        }

        return {
          success: false,
          questionIds: [],
          questionsCreated: 0,
          errors: generationResult.errors || ['Échec de la génération IA'],
          metadata: {
            createdAt: new Date().toISOString(),
            generatedByAI: true,
            totalDuration: 0,
            processingTime: Date.now() - startTime
          }
        };
      }

      // 2. Création automatique en base de données
      const creationRequest: QuizCreationRequest = {
        aiContent: generationResult.quiz,
        categoryId: config.categoryId,
        categoryName: config.categoryName,
        courseId: config.courseId,
        courseName: config.courseName,
        studentLevel: config.studentLevel,
        difficulty: config.difficulty,
        userId: config.userId,
        published: config.published || false,
        customMetadata: {
          generationTime: generationResult.generationTime,
          validationScore: generationResult.validationResult?.score,
          aiModel: this.config.model,
          promptVersion: '1.0'
        }
      };

      const creationResult = await this.quizCreationService.createQuizFromAIContent(creationRequest);

      // 3. Enrichissement du résultat avec les données de génération
      if (creationResult.success) {
        creationResult.validationScore = generationResult.validationResult?.score;
        
        // Mise à jour des métadonnées du quiz créé
        if (creationResult.quizId) {
          await this.quizCreationService.updateQuizMetadata(creationResult.quizId, {
            aiGenerationTime: generationResult.generationTime,
            validationScore: generationResult.validationResult?.score,
            sourcePrompt: config.subject,
            generatedBy: config.userId
          });
        }

        // Log d'audit pour succès
        if (this.auditService && auditLogId) {
          await this.auditService.completeGenerationLog(auditLogId, {
            quizId: creationResult.quizId,
            questionIds: creationResult.questionIds,
            questionsCreated: creationResult.questionsCreated,
            validationScore: generationResult.validationResult?.score,
            aiModel: this.config.model,
            tokensUsed: (generationResult.validationResult as any)?.tokensUsed,
          }, {
            duration: Date.now() - startTime,
            aiResponseTime: generationResult.generationTime,
            validationTime: (generationResult.validationResult as any)?.validationTime,
            retryCount: 1,
          });
        }
      } else {
        // Log d'audit pour échec de création
        if (this.auditService && auditLogId) {
          await this.auditService.failGenerationLog(auditLogId, {
            type: 'database_error',
            message: 'Échec de la création en base de données',
            details: creationResult.errors,
          }, {
            duration: Date.now() - startTime,
            aiResponseTime: generationResult.generationTime,
            retryCount: 1,
          });
        }
      }

      console.log(`${creationResult.success ? '✅' : '❌'} Création automatique terminée:`, {
        success: creationResult.success,
        quizId: creationResult.quizId,
        questionsCreated: creationResult.questionsCreated,
        totalTime: Date.now() - startTime
      });

      return creationResult;

    } catch (error: any) {
      console.error('❌ Erreur génération et création automatique:', error);
      
      // Log d'audit pour erreur générale
      if (this.auditService && auditLogId) {
        await this.auditService.failGenerationLog(auditLogId, {
          type: 'unknown_error',
          message: error.message || 'Erreur inconnue',
          details: { stack: error.stack },
          stackTrace: error.stack,
        }, {
          duration: Date.now() - startTime,
          retryCount: 1,
        });
      }

      return {
        success: false,
        questionIds: [],
        questionsCreated: 0,
        errors: [`Erreur complète: ${error.message}`],
        metadata: {
          createdAt: new Date().toISOString(),
          generatedByAI: true,
          totalDuration: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Génère un quiz complet avec le système de prompts avancé
   */
  async generateCompleteQuiz(config: {
    subject: string;
    categoryId?: string;
    categoryName?: string;
    studentLevel: 'PASS' | 'LAS' | 'both';
    questionCount: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    includeExplanations: boolean;
    customInstructions?: string;
    medicalDomain?: string;
    userId: string;
  }): Promise<{
    success: boolean;
    quiz?: AIGeneratedQuiz;
    validationResult?: ValidationResult;
    errors?: string[];
    generationTime: number;
  }> {
    const startTime = Date.now();
    console.log('🧠 Début génération quiz complet:', {
      subject: config.subject,
      level: config.studentLevel,
      questions: config.questionCount,
      domain: config.medicalDomain
    });

    // Démarrer le log d'audit pour la génération IA
    let auditLogId: string | undefined;
    if (this.auditService) {
      try {
        auditLogId = await this.auditService.startGenerationLog(
          config.userId,
          'ai_quiz_generation',
          {
            subject: config.subject,
            categoryId: config.categoryId,
            categoryName: config.categoryName,
            studentLevel: config.studentLevel,
            questionCount: config.questionCount,
            difficulty: config.difficulty,
            medicalDomain: config.medicalDomain,
            includeExplanations: config.includeExplanations,
            customInstructions: config.customInstructions,
          }
        );
      } catch (auditError) {
        console.warn('⚠️ Erreur démarrage audit log génération:', auditError);
      }
    }

    try {
      // 1. Construction du prompt optimisé
      const promptConfig: PromptConfig = {
        subject: config.subject,
        categoryId: config.categoryId,
        categoryName: config.categoryName,
        studentLevel: config.studentLevel,
        questionCount: config.questionCount,
        difficulty: config.difficulty,
        includeExplanations: config.includeExplanations,
        customInstructions: config.customInstructions,
        medicalDomain: config.medicalDomain
      };

      const prompt = this.promptService.buildQuizGenerationPrompt(promptConfig);
      const optimizedPrompt = this.promptService.optimizePrompt(prompt);

      // 2. Validation du prompt
      const promptValidation = this.promptService.validatePrompt(optimizedPrompt);
      if (!promptValidation.isValid) {
        console.warn('⚠️ Prompt invalide:', promptValidation.issues);
        return {
          success: false,
          errors: promptValidation.issues,
          generationTime: Date.now() - startTime
        };
      }

      // 3. Génération via l'API IA avec retry intelligent
      const aiRequest: AIRequest = {
        prompt: optimizedPrompt,
        maxTokens: 3000,
        temperature: 0.7,
        jsonMode: true,
        retryCount: 3
      };

      let aiResponse: AIResponse;
      try {
        aiResponse = await this.apiService.generateContentWithSmartRetry(aiRequest);
      } catch (apiError: any) {
        console.error('❌ Erreur API IA:', apiError.message);
        return {
          success: false,
          errors: [`Erreur API IA: ${apiError.message}`],
          generationTime: Date.now() - startTime
        };
      }

      // 4. Parsing et validation du contenu généré
      let parsedQuiz: AIGeneratedQuiz;
      try {
        parsedQuiz = JSON.parse(aiResponse.content);
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON:', parseError);
        
        // Tentative de régénération avec prompt corrigé
        const retryPrompt = this.promptService.buildRetryPrompt(promptConfig, ['Format JSON invalide']);
        const retryRequest: AIRequest = { ...aiRequest, prompt: retryPrompt };
        
        try {
          const retryResponse = await this.apiService.generateContent(retryRequest);
          parsedQuiz = JSON.parse(retryResponse.content);
        } catch (retryError) {
          return {
            success: false,
            errors: ['Impossible de générer un JSON valide après retry'],
            generationTime: Date.now() - startTime
          };
        }
      }

      // 5. Validation complète du contenu
      const validationResult = this.validatorService.validateAIGeneratedQuiz(parsedQuiz);
      
      if (!validationResult.isValid) {
        console.warn('⚠️ Validation échouée:', validationResult.issues);
        
        // Tentative de régénération avec les erreurs de validation
        const validationErrors = validationResult.issues
          .filter(issue => issue.severity === 'critical' || issue.severity === 'major')
          .map(issue => issue.message);
        
        if (validationErrors.length > 0) {
          try {
            const retryPrompt = this.promptService.buildRetryPrompt(promptConfig, validationErrors);
            const retryRequest: AIRequest = { ...aiRequest, prompt: retryPrompt };
            const retryResponse = await this.apiService.generateContent(retryRequest);
            const retryQuiz = JSON.parse(retryResponse.content);
            const retryValidation = this.validatorService.validateAIGeneratedQuiz(retryQuiz);
            
            if (retryValidation.isValid || retryValidation.score > validationResult.score) {
              console.log('✅ Régénération réussie avec meilleur score');
              return {
                success: true,
                quiz: retryQuiz,
                validationResult: retryValidation,
                generationTime: Date.now() - startTime
              };
            }
          } catch (retryError) {
            console.warn('⚠️ Échec de la régénération, utilisation du résultat original');
          }
        }
      }

      const success = validationResult.isValid && validationResult.score >= 70;
      console.log(`${success ? '✅' : '⚠️'} Génération terminée - Score: ${validationResult.score}/100`);

      // Log d'audit pour le résultat de génération
      if (this.auditService && auditLogId) {
        if (success) {
          await this.auditService.completeGenerationLog(auditLogId, {
            validationScore: validationResult.score,
            aiModel: this.config.model,
          }, {
            duration: Date.now() - startTime,
            aiResponseTime: Date.now() - startTime, // Approximation
            validationTime: (validationResult as any).validationTime,
            retryCount: 1,
          });
        } else {
          await this.auditService.failGenerationLog(auditLogId, {
            type: 'validation_failed',
            message: 'Score de validation insuffisant',
            details: validationResult.issues,
          }, {
            duration: Date.now() - startTime,
            aiResponseTime: Date.now() - startTime,
            validationTime: (validationResult as any).validationTime,
            retryCount: 1,
          });
        }
      }

      return {
        success,
        quiz: parsedQuiz,
        validationResult,
        errors: success ? undefined : validationResult.issues.map(i => i.message),
        generationTime: Date.now() - startTime
      };

    } catch (error: any) {
      console.error('❌ Erreur génération quiz complet:', error);
      
      // Log d'audit pour erreur de génération
      if (this.auditService && auditLogId) {
        await this.auditService.failGenerationLog(auditLogId, {
          type: 'unknown_error',
          message: error.message || 'Erreur inconnue lors de la génération',
          details: { stack: error.stack },
          stackTrace: error.stack,
        }, {
          duration: Date.now() - startTime,
          retryCount: 1,
        });
      }

      return {
        success: false,
        errors: [error.message || 'Erreur inconnue'],
        generationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Génère des questions avec adaptation dynamique selon les performances
   */
  async generateAdaptiveQuestions(request: QuestionGenerationRequest & {
    performanceData?: {
      successRate: number;
      commonMistakes: string[];
      weakAreas: string[];
      strongAreas: string[];
    };
  }): Promise<GeneratedQuestion[]> {
    console.log('🎯 Génération adaptative de questions');

    try {
      // Construction du prompt dynamique
      const promptConfig: PromptConfig = {
        subject: request.medicalDomain || 'médecine générale',
        categoryId: request.categoryId,
        categoryName: request.categoryName,
        studentLevel: request.difficultyLevel === 'pass' ? 'PASS' : 'LAS',
        questionCount: request.questionCount,
        difficulty: 'medium',
        includeExplanations: true,
        medicalDomain: request.medicalDomain
      };

      const dynamicPrompt = this.promptService.buildDynamicPrompt(promptConfig, request.performanceData);

      // Génération avec le prompt adaptatif
      const questions: GeneratedQuestion[] = [];
      
      for (let i = 0; i < request.questionCount; i++) {
        const singleQuestionPrompt = `${dynamicPrompt}

GÉNÉRATION DE LA QUESTION ${i + 1}/${request.questionCount}:
Génère UNE SEULE question selon les spécifications ci-dessus.`;

        const aiRequest: AIRequest = {
          prompt: singleQuestionPrompt,
          maxTokens: 1500,
          temperature: 0.7,
          jsonMode: true
        };

        try {
          const response = await this.apiService.generateContentWithFallback(aiRequest, {
            reduceComplexity: true,
            simplifyPrompt: true
          });

          const questionData = JSON.parse(response.content);
          
          const question: GeneratedQuestion = {
            questionText: questionData.questionText,
            options: questionData.options,
            explanation: questionData.explanation,
            categoryId: request.categoryId,
            courseId: request.courseId,
            difficultyLevel: request.difficultyLevel,
            generatedByAI: true,
            aiGenerationPrompt: singleQuestionPrompt,
            medicalDomain: request.medicalDomain,
            estimatedDifficulty: questionData.estimatedDifficulty || 'medium'
          };

          // Validation de la question
          const validation = this.validateGeneratedQuestion(question);
          if (validation.isValid) {
            questions.push({
              ...question,
              qualityScore: validation.score,
              validationIssues: validation.issues
            });
          } else {
            console.warn(`⚠️ Question ${i + 1} rejetée:`, validation.issues);
            i--; // Retry cette question
          }
        } catch (error) {
          console.error(`❌ Erreur génération question ${i + 1}:`, error);
          // Continue avec les autres questions
        }
      }

      console.log(`✅ ${questions.length} questions adaptatives générées`);
      return questions;

    } catch (error: any) {
      console.error('❌ Erreur génération adaptative:', error);
      throw new Error('Échec de la génération adaptative de questions');
    }
  }

  /**
   * Valide automatiquement une question générée
   */
  validateGeneratedQuestion(question: GeneratedQuestion): {
    isValid: boolean;
    issues: string[];
    score: number; // 0-100
  } {
    const issues: string[] = [];
    let score = 100;

    // Vérifications de base
    if (!question.questionText || question.questionText.length < 20) {
      issues.push('Question trop courte ou vide');
      score -= 30;
    }

    if (!question.explanation || question.explanation.length < 50) {
      issues.push('Explication insuffisante');
      score -= 20;
    }

    if (question.options.length !== 4) {
      issues.push('Doit avoir exactement 4 options');
      score -= 50;
    }

    const correctOptions = question.options.filter(opt => opt.isCorrect);
    if (correctOptions.length !== 1) {
      issues.push('Doit avoir exactement une bonne réponse');
      score -= 50;
    }

    // Vérifications de qualité
    const hasMedicalTerms = /\b(anatomie|physiologie|pathologie|diagnostic|traitement|symptôme|maladie|syndrome)\b/i.test(question.questionText);
    if (!hasMedicalTerms) {
      issues.push('Question ne contient pas de termes médicaux spécifiques');
      score -= 15;
    }

    // Vérifier la diversité des options
    const optionLengths = question.options.map(opt => opt.optionText.length);
    const avgLength = optionLengths.reduce((a, b) => a + b, 0) / optionLengths.length;
    if (avgLength < 10) {
      issues.push('Options de réponse trop courtes');
      score -= 10;
    }

    // Vérifications de diversité d'options
    const normalizedOptions = question.options.map(opt => ({
      original: opt.optionText,
      normalized: this.normalizeText(opt.optionText),
      isCorrect: opt.isCorrect
    }));

    const uniqueOptions = new Set(normalizedOptions.map(opt => opt.normalized));
    if (uniqueOptions.size !== normalizedOptions.length) {
      issues.push('Options dupliquées détectées');
      score -= 30;
    }

    let similarityFlagged = false;
    for (let i = 0; i < normalizedOptions.length && !similarityFlagged; i++) {
      for (let j = i + 1; j < normalizedOptions.length; j++) {
        const source = normalizedOptions[i]!;
        const target = normalizedOptions[j]!;

        const distance = this.calculateLevenshteinDistance(
          source.normalized,
          target.normalized
        );
        const maxLength = Math.max(source.normalized.length, target.normalized.length);

        if (maxLength > 0 && distance / maxLength < 0.2) {
          issues.push('Options trop similaires détectées');
          score -= 20;
          similarityFlagged = true;
          break;
        }
      }
    }

    // Vérification de doublons de sens
    const correctOption = normalizedOptions.find(opt => opt.isCorrect);
    if (correctOption) {
      const correctTokens = this.extractKeyTokens(correctOption.normalized);

      normalizedOptions
        .filter(opt => !opt.isCorrect)
        .forEach(opt => {
          const optionTokens = this.extractKeyTokens(opt.normalized);
          const overlap = this.calculateTokenOverlap(correctTokens, optionTokens);

          if (overlap >= 0.6) {
            issues.push(`Distracteur trop proche sémantiquement de la bonne réponse: "${opt.original}"`);
            score -= 20;
          }
        });
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score),
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateLevenshteinDistance(a: string, b: string): number {
    if (a === b) {
      return 0;
    }

    if (!a.length) {
      return b.length;
    }

    if (!b.length) {
      return a.length;
    }

    let previousRow: number[] = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let row = 1; row <= a.length; row++) {
      const currentRow: number[] = new Array(b.length + 1).fill(0);
      currentRow[0] = row;

      for (let col = 1; col <= b.length; col++) {
        const cost = a[row - 1] === b[col - 1] ? 0 : 1;
        const insertion = (currentRow[col - 1] ?? 0) + 1;
        const deletion = (previousRow[col] ?? 0) + 1;
        const substitution = (previousRow[col - 1] ?? 0) + cost;
        currentRow[col] = Math.min(insertion, deletion, substitution);
      }

      previousRow = currentRow;
    }

    return previousRow[b.length] ?? 0;
  }

  private extractKeyTokens(text: string): Set<string> {
    const tokens = text
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= 3);

    return new Set(tokens);
  }

  private calculateTokenOverlap(a: Set<string>, b: Set<string>): number {
    if (!a.size || !b.size) {
      return 0;
    }

    let intersection = 0;
    for (const token of a) {
      if (b.has(token)) {
        intersection++;
      }
    }

    return intersection / a.size;
  }

  /**
   * Assigne automatiquement une catégorie basée sur le contenu
   * Tâche 5: Assignation automatique des catégories
   */
  async assignCategoryAutomatically(content: string, existingCategoryId?: string): Promise<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }> {
    if (!this.payload) {
      throw new Error('Payload non initialisé pour l\'assignation de catégorie');
    }

    try {
      // Si une catégorie est déjà spécifiée, la valider
      if (existingCategoryId) {
        const category = await this.payload.findByID({
          collection: 'categories',
          id: existingCategoryId
        });
        
        if (category) {
          return {
            categoryId: existingCategoryId,
            categoryName: (category as any).name || 'Catégorie',
            confidence: 1.0
          };
        }
      }

      // Récupérer toutes les catégories disponibles
      const categories = await this.payload.find({
        collection: 'categories',
        limit: 100
      });

      if (!categories.docs || categories.docs.length === 0) {
        throw new Error('Aucune catégorie disponible');
      }

      // Analyse du contenu pour déterminer la meilleure catégorie
      const contentLower = content.toLowerCase();
      let bestMatch = categories.docs[0];
      let bestScore = 0;

      // Mots-clés par domaine médical
      const domainKeywords: Record<string, string[]> = {
        'anatomie': ['anatomie', 'structure', 'organe', 'tissu', 'os', 'muscle', 'squelette'],
        'physiologie': ['physiologie', 'fonction', 'mécanisme', 'processus', 'régulation'],
        'pathologie': ['pathologie', 'maladie', 'syndrome', 'diagnostic', 'symptôme'],
        'pharmacologie': ['médicament', 'traitement', 'thérapie', 'posologie', 'effet'],
        'cardiologie': ['cœur', 'cardiaque', 'circulation', 'artère', 'veine', 'sang'],
        'neurologie': ['cerveau', 'neurone', 'système nerveux', 'neurologique'],
        'biochimie': ['biochimie', 'métabolisme', 'enzyme', 'protéine', 'glucose']
      };

      for (const category of categories.docs) {
        const categoryName = ((category as any).name || '').toLowerCase();
        let score = 0;

        // Score basé sur le nom de la catégorie
        if (contentLower.includes(categoryName)) {
          score += 10;
        }

        // Score basé sur les mots-clés du domaine
        const keywords = domainKeywords[categoryName] || [];
        for (const keyword of keywords) {
          if (contentLower.includes(keyword)) {
            score += 2;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }

      const confidence = Math.min(bestScore / 10, 1.0);

      return {
        categoryId: bestMatch?.id?.toString() || '',
        categoryName: (bestMatch as any)?.name || 'Catégorie',
        confidence
      };

    } catch (error: any) {
      console.error('❌ Erreur assignation catégorie:', error);
      
      // Fallback: retourner la première catégorie disponible
      try {
        const fallbackCategories = await this.payload.find({
          collection: 'categories',
          limit: 1
        });
        
        if (fallbackCategories.docs && fallbackCategories.docs.length > 0) {
          const fallback = fallbackCategories.docs[0]!;
          return {
            categoryId: fallback.id?.toString() || '',
            categoryName: (fallback as any).name || 'Général',
            confidence: 0.1
          };
        }
      } catch (fallbackError) {
        console.error('❌ Erreur fallback catégorie:', fallbackError);
      }
      
      throw new Error('Impossible d\'assigner une catégorie');
    }
  }

  /**
   * Génère des métadonnées automatiques pour un quiz
   * Tâche 5: Assignation automatique des métadonnées
   */
  generateQuizMetadata(aiContent: AIGeneratedQuiz, config: {
    studentLevel: string;
    difficulty?: string;
    medicalDomain?: string;
  }): Record<string, any> {
    const metadata: Record<string, any> = {
      // Métadonnées de génération
      generatedByAI: true,
      generationDate: new Date().toISOString(),
      aiModel: this.config.model,
      
      // Métadonnées de contenu
      questionCount: aiContent.questions.length,
      estimatedDuration: aiContent.quiz.estimatedDuration,
      studentLevel: config.studentLevel,
      difficulty: config.difficulty || 'medium',
      medicalDomain: config.medicalDomain || 'général',
      
      // Métadonnées de qualité
      hasExplanations: aiContent.questions.every(q => q.explanation && q.explanation.length > 0),
      averageQuestionLength: this.calculateAverageQuestionLength(aiContent.questions),
      averageExplanationLength: this.calculateAverageExplanationLength(aiContent.questions),
      
      // Métadonnées pédagogiques
      difficultyDistribution: this.analyzeDifficultyDistribution(aiContent.questions),
      topicCoverage: this.analyzeTopicCoverage(aiContent.questions),
      
      // Métadonnées techniques
      version: '1.0',
      lastUpdated: new Date().toISOString()
    };

    return metadata;
  }

  /**
   * Calcule la longueur moyenne des questions
   */
  private calculateAverageQuestionLength(questions: AIGeneratedQuestion[]): number {
    if (questions.length === 0) return 0;
    
    const totalLength = questions.reduce((sum, q) => sum + q.questionText.length, 0);
    return Math.round(totalLength / questions.length);
  }

  /**
   * Calcule la longueur moyenne des explications
   */
  private calculateAverageExplanationLength(questions: AIGeneratedQuestion[]): number {
    if (questions.length === 0) return 0;
    
    const totalLength = questions.reduce((sum, q) => sum + (q.explanation?.length || 0), 0);
    return Math.round(totalLength / questions.length);
  }

  /**
   * Analyse la distribution des difficultés
   */
  private analyzeDifficultyDistribution(questions: AIGeneratedQuestion[]): Record<string, number> {
    const distribution: Record<string, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
      unknown: 0
    };

    questions.forEach(q => {
      const difficulty = q.difficulty || 'unknown';
      distribution[difficulty] = (distribution[difficulty] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Analyse la couverture des sujets
   */
  private analyzeTopicCoverage(questions: AIGeneratedQuestion[]): string[] {
    const topics = new Set<string>();

    questions.forEach(q => {
      if (q.tags) {
        q.tags.forEach((tag: string) => topics.add(tag));
      }
      
      // Extraction automatique de sujets du texte
      const extractedTopics = this.extractTopicsFromText(q.questionText);
      extractedTopics.forEach(topic => topics.add(topic));
    });

    return Array.from(topics).slice(0, 10); // Limiter à 10 sujets principaux
  }

  /**
   * Extrait les sujets principaux d'un texte
   */
  private extractTopicsFromText(text: string): string[] {
    const medicalTopics = [
      'anatomie', 'physiologie', 'pathologie', 'cardiologie', 'neurologie',
      'pneumologie', 'gastroentérologie', 'endocrinologie', 'immunologie',
      'pharmacologie', 'biochimie', 'histologie', 'embryologie'
    ];

    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    medicalTopics.forEach(topic => {
      if (lowerText.includes(topic)) {
        topics.push(topic);
      }
    });

    return topics;
  }

  /**
   * Crée un quiz de test pour valider le système complet
   * Tâche 5: Test de création automatique
   */
  async createTestQuizComplete(categoryId: string, userId: string): Promise<QuizCreationResult> {
    console.log('🧪 Création d\'un quiz de test complet...');

    const testConfig = {
      subject: "Test automatique - Anatomie cardiaque de base",
      categoryId,
      studentLevel: 'PASS' as const,
      questionCount: 3,
      difficulty: 'easy' as const,
      includeExplanations: true,
      medicalDomain: 'cardiologie',
      userId,
      published: false
    };

    return await this.generateAndCreateCompleteQuiz(testConfig);
  }
}
