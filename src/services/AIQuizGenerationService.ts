import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

export interface QuestionGenerationRequest {
  categoryId?: string;
  categoryName?: string;
  courseId?: string;
  courseName?: string;
  difficultyLevel: 'pass' | 'las';
  questionCount: number;
  medicalDomain?: string;
  sourceContent?: string; // Contenu source pour générer la question
}
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

  // Limites de taux : 10 questions par minute par domaine médical
  private readonly RATE_LIMIT_REQUESTS = 10;
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures

  constructor() {
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
  }

  async generateQuestions(request: QuestionGenerationRequest): Promise<GeneratedQuestion[]> {
    try {
      console.log('🧠 Début génération de questions IA:', {
        count: request.questionCount,
        category: request.categoryName,
        level: request.difficultyLevel,
        domain: request.medicalDomain,
      });

      const questions: GeneratedQuestion[] = [];

      for (let i = 0; i < request.questionCount; i++) {
        const prompt = this.buildQuestionPrompt(request, i + 1);
        const question = await this.generateSingleQuestion(prompt, request);
        questions.push(question);
      }

      console.log(`✅ ${questions.length} questions générées avec succès`);
      return questions;

    } catch (error) {
      console.error('❌ Erreur génération questions IA:', error);
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

    let prompt = `Tu es un expert en pédagogie médicale et en création de questions d'examen. Génère une question de QCM médicale de haute qualité.

CONTEXTE:
- Niveau d'études: ${level}
- Domaine médical: ${domain}
${request.categoryName ? `- Catégorie: ${request.categoryName}` : ''}
${request.courseName ? `- Cours associé: ${request.courseName}` : ''}

`;

    if (request.sourceContent) {
      prompt += `CONTENU SOURCE À UTILISER:
${request.sourceContent.substring(0, 2000)}

`;
    }

    prompt += `
RÈGLES DE CRÉATION:
- Question claire, précise et pédagogique
- 4 options de réponse (A, B, C, D)
- 1 seule bonne réponse
- Niveau adapté à ${level}
- Vocabulaire médical approprié mais accessible
- Évite les pièges trop évidents
- Bonne répartition des distracteurs

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
- L'explication doit être pédagogique et complète
- Respecte strictement le format demandé

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

    return questions[0];
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

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, score),
    };
  }
}
