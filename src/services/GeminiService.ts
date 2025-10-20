/**
 * Service dédié pour l'API Google Gemini
 * Gère spécifiquement les interactions avec Gemini
 */

import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  jsonMode?: boolean;
}

export interface GeminiResponse {
  content: string;
  tokensUsed?: number;
  finishReason?: string;
  model: string;
}

export class GeminiService {
  private client: GoogleGenerativeAI;
  private config: GeminiConfig;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    this.config = {
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.0-flash',
      maxTokens: 2000,
      temperature: 0.7,
      topP: 0.95,
      topK: 64
    };

    console.log('🚀 GeminiService initialisé avec succès');
  }

  /**
   * Génère du contenu via l'API Google Gemini
   */
  async generateContent(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      console.log('📡 Requête vers Gemini:', {
        promptLength: request.prompt.length,
        maxTokens: request.maxTokens || this.config.maxTokens,
        model: this.config.model
      });

      const generationConfig: GenerationConfig = {
        maxOutputTokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature || this.config.temperature,
        topP: request.topP || this.config.topP,
        topK: request.topK || this.config.topK,
      };

      if (request.jsonMode) {
        generationConfig.responseMimeType = 'application/json';
      }

      const model = this.client.getGenerativeModel({
        model: this.config.model,
        generationConfig,
      });

      const result = await model.generateContent(request.prompt);
      const response = result.response;

      if (!response) {
        throw new Error('Réponse vide de l\'API Gemini');
      }

      const content = response.text();
      if (!content) {
        throw new Error('Contenu vide dans la réponse Gemini');
      }

      // Estimation des tokens utilisés (approximation)
      const estimatedTokens = Math.ceil(content.length / 4);

      const resultResponse: GeminiResponse = {
        content,
        tokensUsed: estimatedTokens,
        finishReason: 'completed',
        model: this.config.model
      };

      console.log('✅ Réponse reçue de Gemini:', {
        contentLength: content.length,
        tokensUsed: estimatedTokens,
        finishReason: resultResponse.finishReason
      });

      return resultResponse;

    } catch (error: any) {
      console.error('❌ Erreur lors de l\'appel à Gemini:', error);

      // Classification des erreurs
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new Error('GEMINI_RATE_LIMIT: Limite de taux atteinte');
      }

      if (error.message?.includes('authentication') || error.message?.includes('API key')) {
        throw new Error('GEMINI_AUTH_ERROR: Clé API invalide ou expirée');
      }

      if (error.message?.includes('502') || error.message?.includes('503') || error.message?.includes('504')) {
        throw new Error('GEMINI_SERVER_ERROR: Service temporairement indisponible');
      }

      throw new Error(`GEMINI_API_ERROR: ${error.message || 'Erreur inconnue'}`);
    }
  }

  /**
   * Génère du contenu avec gestion d'erreurs et retry
   */
  async generateContentWithRetry(request: GeminiRequest, maxRetries: number = 3): Promise<GeminiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateContent(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.warn(`⚠️ Tentative ${attempt + 1}/${maxRetries + 1} échouée:`, lastError.message);

        // Ne pas retry pour les erreurs d'authentification
        if (lastError.message.includes('GEMINI_AUTH_ERROR')) {
          throw lastError;
        }

        // Attendre avant le retry (backoff exponentiel)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`⏳ Attente ${delay}ms avant retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Échec après ${maxRetries + 1} tentatives: ${lastError?.message}`);
  }

  /**
   * Test de connectivité avec l'API Gemini
   */
  async testConnection(): Promise<{
    connected: boolean;
    responseTime: number;
    model?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const testRequest: GeminiRequest = {
        prompt: 'Test de connectivité. Réponds simplement "OK".',
        maxTokens: 10,
        temperature: 0.1
      };

      const response = await this.generateContent(testRequest);

      return {
        connected: true,
        responseTime: Date.now() - startTime,
        model: response.model,
        error: response.content.trim() !== 'OK' ? 'Réponse inattendue' : undefined
      };

    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Obtient les informations du modèle configuré
   */
  getModelInfo(): {
    name: string;
    version: string;
    maxTokens: number;
    temperature: number;
  } {
    return {
      name: 'gemini-2.0-flash',
      version: '2.0',
      maxTokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature || 0.7
    };
  }

  /**
   * Met à jour la configuration du modèle
   */
  updateConfig(updates: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('🔧 Configuration Gemini mise à jour:', this.config);
  }
}
