/**
 * Service dédié pour l'API code-supernova
 * Gère spécifiquement les interactions avec l'IA code-supernova
 */

export interface SupernovaConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SupernovaRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

export interface SupernovaResponse {
  content: string;
  tokensUsed?: number;
  finishReason?: string;
  model: string;
}

export class SupernovaService {
  private config: SupernovaConfig;

  constructor() {
    if (!process.env.SUPERNOVA_API_KEY) {
      throw new Error('SUPERNOVA_API_KEY is not defined in environment variables');
    }

    this.config = {
      apiKey: process.env.SUPERNOVA_API_KEY,
      baseUrl: process.env.SUPERNOVA_BASE_URL || 'https://api.supernova.io/v1',
      model: process.env.SUPERNOVA_MODEL || 'code-supernova-default',
      maxTokens: 2000,
      temperature: 0.7
    };

    console.log('🚀 SupernovaService initialisé avec succès');
  }

  /**
   * Génère du contenu via l'API code-supernova
   */
  async generateContent(request: SupernovaRequest): Promise<SupernovaResponse> {
    try {
      console.log('📡 Requête vers code-supernova:', {
        promptLength: request.prompt.length,
        maxTokens: request.maxTokens || this.config.maxTokens,
        model: this.config.model
      });

      const response = await fetch(`${this.config.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          prompt: request.prompt,
          max_tokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature,
          model: this.config.model,
          response_format: request.jsonMode ? { type: 'json_object' } : { type: 'text' }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur API Supernova (${response.status}): ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      // Adapter le format de réponse selon l'API Supernova
      const result: SupernovaResponse = {
        content: data.content || data.text || data.response || '',
        tokensUsed: data.tokens_used || data.usage?.total_tokens,
        finishReason: data.finish_reason || 'completed',
        model: data.model || this.config.model
      };

      console.log('✅ Réponse reçue de code-supernova:', {
        contentLength: result.content.length,
        tokensUsed: result.tokensUsed,
        finishReason: result.finishReason
      });

      return result;

    } catch (error) {
      console.error('❌ Erreur lors de l\'appel à code-supernova:', error);

      // Classification des erreurs
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          throw new Error('SUPERNOVA_AUTH_ERROR: Clé API invalide ou expirée');
        }
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new Error('SUPERNOVA_RATE_LIMIT: Limite de taux atteinte');
        }
        if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
          throw new Error('SUPERNOVA_SERVER_ERROR: Erreur serveur temporaire');
        }
      }

      throw new Error(`SUPERNOVA_API_ERROR: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Génère du contenu avec gestion d'erreurs et retry
   */
  async generateContentWithRetry(request: SupernovaRequest, maxRetries: number = 3): Promise<SupernovaResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateContent(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.warn(`⚠️ Tentative ${attempt + 1}/${maxRetries + 1} échouée:`, lastError.message);

        // Ne pas retry pour les erreurs d'authentification
        if (lastError.message.includes('SUPERNOVA_AUTH_ERROR')) {
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
   * Test de connectivité avec l'API Supernova
   */
  async testConnection(): Promise<{
    connected: boolean;
    responseTime: number;
    model?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const testRequest: SupernovaRequest = {
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
    baseUrl: string;
    maxTokens: number;
    temperature: number;
  } {
    return {
      name: this.config.model,
      baseUrl: this.config.baseUrl,
      maxTokens: this.config.maxTokens || 2000,
      temperature: this.config.temperature || 0.7
    };
  }

  /**
   * Met à jour la configuration du modèle
   */
  updateConfig(updates: Partial<SupernovaConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('🔧 Configuration Supernova mise à jour:', this.config);
  }
}
