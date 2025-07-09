import { GoogleGenerativeAI, Content, Part, GenerationConfig } from '@google/generative-ai';
import { Message } from '../types/studySession';

interface AIConfig {
  model: string;
  generationConfig: GenerationConfig;
}

export class AIService {
  private client: GoogleGenerativeAI;
  private config: AIConfig;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    this.config = {
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
    };
  }

  /**
   * Génère une réponse à partir d'un message utilisateur en utilisant l'API Google Gemini
   * @param messages Historique de la conversation
   * @param context Contexte supplémentaire pour la génération
   * @returns La réponse générée par l'IA
   */
  async generateResponse(
    messages: Message[],
    context?: {
      course?: string;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
    },
    jsonMode: boolean = false,
  ): Promise<string> {
    try {
      const systemInstruction = this.generateSystemMessage(context);
      const generationConfig = { ...this.config.generationConfig };
      if (jsonMode) {
        generationConfig.responseMimeType = 'application/json';
      }

      const model = this.client.getGenerativeModel({
        model: this.config.model,
        systemInstruction,
        generationConfig,
      });

      const history = this.formatMessagesForGemini(messages);

      const result = await model.generateContent({ contents: history });
      const response = result.response;
      const text = response.text();

      return text || 'Désolé, je n\'ai pas pu générer de réponse.';
    } catch (error) {
      console.error('Erreur lors de la génération de la réponse IA avec Gemini:', error);
      throw new Error('Une erreur est survenue lors de la génération de la réponse');
    }
  }

  /**
   * Formate les messages pour l'API Gemini, en s'assurant que les rôles alternent correctement.
   * @param messages L'historique des messages.
   * @returns Un tableau de `Content` formaté pour Gemini.
   */
  private formatMessagesForGemini(messages: Message[]): Content[] {
    // Gemini requiert une alternance stricte user/model.
    // On filtre les messages système et on s'assure que le premier message est de l'utilisateur.
    const relevantMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');

    return relevantMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  /**
   * Génère un message système basé sur le contexte
   */
  private generateSystemMessage(context?: {
    course?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }): string | undefined {
    if (!context || !context.course) return undefined;

    let systemPrompt = `Tu es un tuteur expert en ${context.course}. `;
    if (context.difficulty) {
      systemPrompt += `Le niveau de l'étudiant est ${context.difficulty}. `;
    }
    systemPrompt += 'Ton objectif est de guider l\'étudiant à travers une session d\'étude interactive et engageante. Fournis des explications claires, des exemples pertinents et des questions pour tester la compréhension. Adopte un ton encourageant et patient.';

    return systemPrompt;
  }
}
