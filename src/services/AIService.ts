import { InferenceClient } from '@huggingface/inference';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AIConfig = {
  model: string;
  provider: string;
  maxTokens?: number;
  temperature?: number;
};

export class AIService {
  private client: InferenceClient;
  private config: AIConfig;

  constructor() {
    if (!process.env.HF_TOKEN) {
      throw new Error('HF_TOKEN is not defined in environment variables');
    }

    this.client = new InferenceClient(process.env.HF_TOKEN);
    
    this.config = {
      model: 'deepseek-ai/DeepSeek-R1-0528',
      provider: 'huggingface',
      maxTokens: 1000,
      temperature: 0.7,
    };
  }

  /**
   * Génère une réponse à partir d'un message utilisateur
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
  ): Promise<string> {
    try {
      // Ajouter le contexte système si nécessaire
      const systemMessage = this.generateSystemMessage(context);
      const conversationHistory = systemMessage ? [systemMessage, ...messages] : messages;

      const response = await this.client.chatCompletion({
        provider: this.config.provider as any, // Type assertion nécessaire car le type attendu est plus restrictif
        model: this.config.model,
        messages: conversationHistory.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant', // S'assure que le rôle est valide
          content: msg.content,
        })),
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      return response.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    } catch (error) {
      console.error('Erreur lors de la génération de la réponse IA:', error);
      throw new Error('Une erreur est survenue lors de la génération de la réponse');
    }
  }

  /**
   * Génère un message système basé sur le contexte
   */
  private generateSystemMessage(context?: {
    course?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }): Message | null {
    if (!context) return null;

    let systemMessage = 'Tu es un assistant pédagogique médical expérimenté. ';
    
    if (context.course) {
      systemMessage += `Tu réponds dans le contexte du cours: ${context.course}. `;
    }
    
    if (context.difficulty) {
      const difficultyMap = {
        beginner: 'débutant',
        intermediate: 'intermédiaire',
        advanced: 'avancé'
      };
      systemMessage += `Adapte tes réponses pour un niveau ${difficultyMap[context.difficulty]}. `;
    }
    
    systemMessage += 'Sois précis, concis et basé sur des preuves médicales. ';
    systemMessage += 'Si tu ne connais pas la réponse, dis-le clairement.';

    return {
      role: 'system',
      content: systemMessage,
    };
  }

  /**
   * Met à jour la configuration de l'IA
   */
  setConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Récupère la configuration actuelle
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }
}

// Export d'une instance unique du service
export const aiService = new AIService();
