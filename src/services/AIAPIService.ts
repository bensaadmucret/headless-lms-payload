/**
 * Service d'interface avec les APIs IA externes
 * Gère la communication avec différents fournisseurs d'IA (OpenAI, Google Gemini, etc.)
 */

import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import { aiConfig } from '../config/ai';

export interface AIProvider {
  name: string;
  model: string;
  available: boolean;
}

export interface AIRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  retryCount?: number;
  systemInstruction?: string;
  modelOverride?: string;
  provider?: 'gemini' | 'openai' | 'anthropic';
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  finishReason?: string;
  cached?: boolean;
}

export interface AIError {
  type: 'rate_limit' | 'api_error' | 'invalid_response' | 'network_error' | 'auth_error';
  message: string;
  retryAfter?: number;
  details?: any;
}

export class AIAPIService {
  private geminiClient: GoogleGenerativeAI | null = null;
  private openAIClient: any | null = null; // TODO: Typer avec le SDK OpenAI quand installé
  private anthropicClient: any | null = null; // TODO: Typer avec le SDK Anthropic quand installé

  private cache: Map<string, { response: AIResponse; timestamp: number }> = new Map();
  private rateLimiter: Map<string, { count: number; resetTime: number }> = new Map();

  // Configuration
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures
  private readonly RATE_LIMIT_REQUESTS = 10;
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 seconde

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialise les fournisseurs d'IA disponibles
   */
  private initializeProviders(): void {
    // Initialisation de Google Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('✅ Google Gemini initialisé');
      } catch (error) {
        console.error('❌ Erreur initialisation Gemini:', error);
      }
    } else {
      console.warn('⚠️ GEMINI_API_KEY non configurée');
    }

    // Initialisation OpenAI (Placeholder)
    if (aiConfig.openai.apiKey) {
      console.log('✅ OpenAI configuré (client non instancié - SDK requis)');
      this.openAIClient = { ready: true }; // Stub
    }

    // Initialisation Anthropic (Placeholder)
    if (aiConfig.anthropic.apiKey) {
      console.log('✅ Anthropic configuré (client non instancié - SDK requis)');
      this.anthropicClient = { ready: true }; // Stub
    }
  }

  /**
   * Obtient la liste des fournisseurs disponibles
   */
  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];

    if (this.geminiClient) {
      providers.push({
        name: 'Google Gemini',
        model: aiConfig.gemini.defaultModel,
        available: true
      });
    }

    if (this.openAIClient) {
      providers.push({
        name: 'OpenAI',
        model: aiConfig.openai.defaultModel,
        available: true
      });
    }

    if (this.anthropicClient) {
      providers.push({
        name: 'Anthropic',
        model: aiConfig.anthropic.defaultModel,
        available: true
      });
    }

    return providers;
  }

  /**
   * Génère du contenu via l'API IA avec gestion des erreurs et retry
   */
  async generateContent(request: AIRequest): Promise<AIResponse> {
    const cacheKey = this.generateCacheKey(request);

    // Vérification du cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('🎯 Réponse trouvée en cache');
      return { ...cached, cached: true };
    }

    // Vérification du rate limiting
    this.checkRateLimit();

    let lastError: AIError | null = null;
    const maxRetries = request.retryCount ?? this.MAX_RETRIES;

    console.log(`🚀 Début génération IA (max ${maxRetries + 1} tentatives)`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 Tentative ${attempt + 1}/${maxRetries + 1}`);
        const response = await this.makeAPIRequest(request);

        // Validation de la réponse
        if (!this.validateResponse(response, request.jsonMode ? 'json' : 'text')) {
          throw { type: 'invalid_response', message: 'Réponse invalide de l\'API' };
        }

        // Mise en cache de la réponse
        this.setCache(cacheKey, response);

        console.log(`✅ Génération réussie (tentative ${attempt + 1})`);
        return response;
      } catch (error) {
        lastError = this.handleAPIError(error);
        console.warn(`⚠️ Tentative ${attempt + 1} échouée:`, lastError.message);

        // Ne pas retry pour certains types d'erreurs
        if (lastError.type === 'auth_error') {
          console.error('❌ Erreur d\'authentification - arrêt des tentatives');
          break;
        }

        // Attendre avant le retry
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt, lastError);
          console.log(`⏳ Attente ${Math.round(delay / 1000)}s avant nouvelle tentative`);
          await this.sleep(delay);
        }
      }
    }

    const errorMessage = `Échec de génération après ${maxRetries + 1} tentatives: ${lastError?.message}`;
    console.error('❌', errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Effectue la requête API vers le fournisseur approprié
   */
  private async makeAPIRequest(request: AIRequest): Promise<AIResponse> {
    const provider = request.provider || aiConfig.defaultProvider;

    switch (provider) {
      case 'openai':
        return this.callOpenAIAPI(request);
      case 'anthropic':
        return this.callAnthropicAPI(request);
      case 'gemini':
      default:
        if (!this.geminiClient) {
          throw new Error('Gemini non disponible et aucun autre fournisseur configuré');
        }
        return this.callGeminiAPI(request);
    }
  }

  /**
   * Appelle l'API OpenAI (Stub)
   */
  private async callOpenAIAPI(request: AIRequest): Promise<AIResponse> {
    if (!this.openAIClient) throw new Error('OpenAI non initialisé');
    // TODO: Implémenter l'appel réel avec le SDK OpenAI
    throw new Error('Implémentation OpenAI non disponible - installez le SDK');
  }

  /**
   * Appelle l'API Anthropic (Stub)
   */
  private async callAnthropicAPI(request: AIRequest): Promise<AIResponse> {
    if (!this.anthropicClient) throw new Error('Anthropic non initialisé');
    // TODO: Implémenter l'appel réel avec le SDK Anthropic
    throw new Error('Implémentation Anthropic non disponible - installez le SDK');
  }

  /**
   * Appelle l'API Google Gemini
   */
  private async callGeminiAPI(request: AIRequest): Promise<AIResponse> {
    if (!this.geminiClient) {
      throw new Error('Client Gemini non initialisé');
    }

    const generationConfig: GenerationConfig = {
      maxOutputTokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.7,
      topP: 0.95,
      topK: 64,
    };

    if (request.jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }

    const modelName = request.modelOverride || aiConfig.gemini.defaultModel;

    const model = this.geminiClient.getGenerativeModel({
      model: modelName,
      generationConfig,
      systemInstruction: request.systemInstruction,
    });

    try {
      const result = await model.generateContent(request.prompt);
      const response = result.response;

      if (!response) {
        throw new Error('Réponse vide de l\'API Gemini');
      }

      const content = response.text();
      if (!content) {
        throw new Error('Contenu vide dans la réponse Gemini');
      }

      return {
        content,
        provider: 'Google Gemini',
        model: modelName,
        finishReason: 'completed'
      };
    } catch (error: any) {
      console.error('❌ Erreur API Gemini:', error);

      // Analyse de l'erreur pour déterminer le type
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw { type: 'rate_limit', message: 'Limite de taux atteinte', details: error };
      }

      if (error.message?.includes('authentication') || error.message?.includes('API key')) {
        throw { type: 'auth_error', message: 'Erreur d\'authentification', details: error };
      }

      throw { type: 'api_error', message: error.message || 'Erreur API inconnue', details: error };
    }
  }

  /**
   * Gère les erreurs d'API et les convertit en format standardisé
   */
  private handleAPIError(error: any): AIError {
    if (error.type) {
      return error as AIError;
    }

    // Analyse de l'erreur pour déterminer le type
    const message = error.message || 'Erreur inconnue';

    if (message.includes('network') || message.includes('timeout') || message.includes('ECONNRESET')) {
      return { type: 'network_error', message: 'Erreur réseau ou timeout', retryAfter: 5 };
    }

    if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) {
      // Extraire le temps d'attente si disponible
      const retryMatch = message.match(/retry.*?(\d+)/i);
      const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 60;
      return { type: 'rate_limit', message: 'Limite de taux atteinte', retryAfter };
    }

    if (message.includes('authentication') || message.includes('unauthorized') || message.includes('401')) {
      return { type: 'auth_error', message: 'Erreur d\'authentification' };
    }

    if (message.includes('502') || message.includes('503') || message.includes('504')) {
      return { type: 'api_error', message: 'Service temporairement indisponible', retryAfter: 30 };
    }

    if (message.includes('500')) {
      return { type: 'api_error', message: 'Erreur serveur interne', retryAfter: 10 };
    }

    return { type: 'api_error', message, details: error };
  }

  /**
   * Calcule le délai de retry avec backoff exponentiel
   */
  private calculateRetryDelay(attempt: number, error: AIError): number {
    let baseDelay = this.RETRY_DELAY * Math.pow(2, attempt);

    // Délai spécial pour les erreurs de rate limit
    if (error.type === 'rate_limit' && error.retryAfter) {
      baseDelay = error.retryAfter * 1000;
    }

    // Délai spécial pour les erreurs réseau
    if (error.type === 'network_error' && error.retryAfter) {
      baseDelay = error.retryAfter * 1000;
    }

    // Limiter le délai maximum
    baseDelay = Math.min(baseDelay, 60000); // Max 1 minute

    // Ajouter un peu de jitter pour éviter les thundering herds
    const jitter = Math.random() * 0.1 * baseDelay;
    return baseDelay + jitter;
  }

  /**
   * Vérifie les limites de taux
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const key = 'global';

    let limiter = this.rateLimiter.get(key);
    if (!limiter || now > limiter.resetTime) {
      limiter = { count: 0, resetTime: now + this.RATE_LIMIT_WINDOW };
      this.rateLimiter.set(key, limiter);
    }

    if (limiter.count >= this.RATE_LIMIT_REQUESTS) {
      const waitTime = Math.ceil((limiter.resetTime - now) / 1000);
      throw {
        type: 'rate_limit',
        message: `Limite de taux atteinte. Réessayez dans ${waitTime} secondes.`,
        retryAfter: waitTime
      } as AIError;
    }

    limiter.count++;
  }

  /**
   * Génère une clé de cache pour la requête
   */
  private generateCacheKey(request: AIRequest): string {
    const key = JSON.stringify({
      prompt: request.prompt,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      jsonMode: request.jsonMode
    });

    // Hash simple pour réduire la taille de la clé
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `ai_${Math.abs(hash)}`;
  }

  /**
   * Récupère une réponse du cache
   */
  private getFromCache(key: string): AIResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Vérifier l'expiration
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  }

  /**
   * Met en cache une réponse
   */
  private setCache(key: string, response: AIResponse): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });

    // Nettoyage périodique du cache
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  /**
   * Nettoie le cache des entrées expirées
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Utilitaire pour attendre
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Valide la réponse de l'API
   */
  validateResponse(response: AIResponse, expectedFormat?: 'json' | 'text'): boolean {
    if (!response.content || response.content.trim().length === 0) {
      return false;
    }

    if (expectedFormat === 'json') {
      try {
        JSON.parse(response.content);
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Obtient les statistiques d'utilisation
   */
  getUsageStats(): {
    cacheSize: number;
    cacheHitRate: number;
    rateLimitStatus: { requests: number; resetTime: number } | null;
  } {
    const rateLimitStatus = this.rateLimiter.get('global');

    return {
      cacheSize: this.cache.size,
      cacheHitRate: 0, // TODO: Implémenter le tracking des hits/misses
      rateLimitStatus: rateLimitStatus ? {
        requests: rateLimitStatus.count,
        resetTime: rateLimitStatus.resetTime
      } : null
    };
  }

  /**
   * Génère du contenu avec stratégies de fallback avancées
   */
  async generateContentWithFallback(request: AIRequest, fallbackStrategies?: {
    reduceComplexity?: boolean;
    simplifyPrompt?: boolean;
    useAlternativeModel?: boolean;
  }): Promise<AIResponse> {
    try {
      // Tentative normale
      return await this.generateContent(request);
    } catch (error) {
      console.warn('🔄 Activation des stratégies de fallback');

      if (fallbackStrategies?.reduceComplexity) {
        try {
          console.log('📉 Tentative avec complexité réduite');
          const simplifiedRequest = {
            ...request,
            maxTokens: Math.floor((request.maxTokens || 2000) * 0.7),
            temperature: Math.max(0.3, (request.temperature || 0.7) - 0.2)
          };
          return await this.generateContent(simplifiedRequest);
        } catch (fallbackError) {
          console.warn('⚠️ Fallback complexité réduite échoué');
        }
      }

      if (fallbackStrategies?.simplifyPrompt) {
        try {
          console.log('✂️ Tentative avec prompt simplifié');
          const simplifiedPrompt = this.simplifyPrompt(request.prompt);
          const simplifiedRequest = { ...request, prompt: simplifiedPrompt };
          return await this.generateContent(simplifiedRequest);
        } catch (fallbackError) {
          console.warn('⚠️ Fallback prompt simplifié échoué');
        }
      }

      // Si tous les fallbacks échouent, relancer l'erreur originale
      throw error;
    }
  }

  /**
   * Simplifie un prompt pour les stratégies de fallback
   */
  private simplifyPrompt(prompt: string): string {
    // Garder seulement les sections essentielles
    const lines = prompt.split('\n');
    const essentialLines = lines.filter(line => {
      const lowerLine = line.toLowerCase();
      return lowerLine.includes('json') ||
        lowerLine.includes('format') ||
        lowerLine.includes('important') ||
        lowerLine.includes('question') ||
        lowerLine.includes('réponse') ||
        lowerLine.includes('médical') ||
        line.trim().length < 100; // Garder les lignes courtes
    });

    return essentialLines.join('\n');
  }

  /**
   * Génère du contenu avec retry intelligent basé sur le type d'erreur
   */
  async generateContentWithSmartRetry(request: AIRequest): Promise<AIResponse> {
    let currentRequest = { ...request };
    let attempt = 0;
    const maxAttempts = 5;

    while (attempt < maxAttempts) {
      try {
        return await this.generateContent(currentRequest);
      } catch (error: any) {
        attempt++;
        console.warn(`🔄 Retry intelligent ${attempt}/${maxAttempts}:`, error.message);

        if (attempt >= maxAttempts) {
          throw error;
        }

        // Adaptation intelligente selon le type d'erreur
        if (error.message?.includes('token') || error.message?.includes('length')) {
          // Réduire la taille du prompt
          currentRequest.maxTokens = Math.floor((currentRequest.maxTokens || 2000) * 0.8);
          currentRequest.prompt = currentRequest.prompt.substring(0, Math.floor(currentRequest.prompt.length * 0.9));
          console.log('📉 Réduction de la taille du prompt');
        } else if (error.message?.includes('rate limit')) {
          // Attendre plus longtemps
          const waitTime = Math.min(60000, 5000 * Math.pow(2, attempt));
          console.log(`⏳ Attente ${waitTime / 1000}s pour rate limit`);
          await this.sleep(waitTime);
        } else if (error.message?.includes('temperature') || error.message?.includes('parameter')) {
          // Ajuster les paramètres
          currentRequest.temperature = Math.max(0.1, (currentRequest.temperature || 0.7) - 0.1);
          console.log('🎛️ Ajustement des paramètres');
        }

        // Attente progressive entre les tentatives
        const baseDelay = 1000 * Math.pow(1.5, attempt);
        await this.sleep(baseDelay);
      }
    }

    throw new Error('Échec après tous les retries intelligents');
  }

  /**
   * Teste la disponibilité de l'API
   */
  async testAPIAvailability(): Promise<{
    available: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const testRequest: AIRequest = {
        prompt: 'Test de connectivité. Réponds simplement "OK".',
        maxTokens: 10,
        temperature: 0.1
      };

      await this.generateContent(testRequest);

      return {
        available: true,
        responseTime: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        available: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Obtient des métriques détaillées de performance
   */
  getPerformanceMetrics(): {
    cacheStats: { size: number; hitRate: number };
    rateLimitStats: { requests: number; resetTime: number } | null;
    apiHealth: 'healthy' | 'degraded' | 'unavailable';
    averageResponseTime: number;
  } {
    const rateLimitStatus = this.rateLimiter.get('global');

    return {
      cacheStats: {
        size: this.cache.size,
        hitRate: 0 // TODO: Implémenter le tracking des hits/misses
      },
      rateLimitStats: rateLimitStatus ? {
        requests: rateLimitStatus.count,
        resetTime: rateLimitStatus.resetTime
      } : null,
      apiHealth: 'healthy', // TODO: Implémenter la détection de santé
      averageResponseTime: 0 // TODO: Implémenter le tracking des temps de réponse
    };
  }

  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    this.cache.clear();
    this.rateLimiter.clear();
  }
}