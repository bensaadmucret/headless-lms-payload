/**
 * Service d'interface avec les APIs IA externes
 * Gère la communication avec différents fournisseurs d'IA (Supernova, Gemini, etc.)
 * Utilise une stratégie de priorité : code-supernova → Gemini (fallback)
 */

import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

// Import des services dédiés
import { SupernovaService } from './SupernovaService';
import { GeminiService } from './GeminiService';

export interface AIProvider {
  name: string;
  model: string;
  available: boolean;
  priority: number; // Priorité pour la sélection automatique
}

export interface AIRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  retryCount?: number;
  preferredProvider?: 'supernova' | 'gemini' | 'auto';
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
  type: 'rate_limit' | 'api_error' | 'invalid_response' | 'network_error' | 'auth_error' | 'provider_unavailable';
  message: string;
  provider?: string;
  retryAfter?: number;
  details?: any;
}

export class AIAPIService {
  private supernovaService?: SupernovaService;
  private geminiService?: GeminiService;
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
   * Initialise les fournisseurs d'IA disponibles avec leurs priorités
   */
  private initializeProviders(): void {
    console.log('🔧 Initialisation des services IA...');

    // Initialisation de code-supernova (priorité haute)
    if (process.env.SUPERNOVA_API_KEY) {
      try {
        this.supernovaService = new SupernovaService();
        console.log('✅ code-supernova initialisé (priorité haute)');
      } catch (error) {
        console.error('❌ Erreur initialisation code-supernova:', error);
      }
    } else {
      console.warn('⚠️ SUPERNOVA_API_KEY non configurée');
    }

    // Initialisation de Gemini (fallback)
    if (process.env.GEMINI_API_KEY) {
      try {
        this.geminiService = new GeminiService();
        console.log('✅ Gemini initialisé (fallback)');
      } catch (error) {
        console.error('❌ Erreur initialisation Gemini:', error);
      }
    } else {
      console.warn('⚠️ GEMINI_API_KEY non configurée');
    }

    if (!this.supernovaService && !this.geminiService) {
      console.error('❌ Aucun fournisseur IA disponible');
    }
  }

  /**
   * Obtient la liste des fournisseurs disponibles avec leurs priorités
   */
  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];

    if (this.supernovaService) {
      providers.push({
        name: 'code-supernova',
        model: 'default',
        available: true,
        priority: 1 // Priorité la plus haute
      });
    }

    if (this.geminiService) {
      providers.push({
        name: 'Google Gemini',
        model: 'gemini-2.0-flash',
        available: true,
        priority: 2 // Fallback
      });
    }

    return providers;
  }

  /**
   * Génère du contenu via l'API IA avec gestion des erreurs et retry
   * Stratégie : code-supernova d'abord, puis Gemini si échec
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

    // Sélection du provider selon la préférence ou automatiquement
    const provider = this.selectProvider(request.preferredProvider);

    let lastError: AIError | null = null;
    const maxRetries = request.retryCount ?? this.MAX_RETRIES;

    console.log(`🚀 Début génération IA avec ${provider} (max ${maxRetries + 1} tentatives)`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 Tentative ${attempt + 1}/${maxRetries + 1} avec ${provider}`);
        const response = await this.callProvider(provider, request);

        // Validation de la réponse
        if (!this.validateResponse(response, request.jsonMode ? 'json' : 'text')) {
          throw { type: 'invalid_response', message: 'Réponse invalide de l\'API', provider };
        }

        // Mise en cache de la réponse
        this.setCache(cacheKey, response);

        console.log(`✅ Génération réussie avec ${provider} (tentative ${attempt + 1})`);
        return response;

      } catch (error) {
        lastError = this.handleAPIError(error, provider);
        console.warn(`⚠️ Tentative ${attempt + 1} échouée avec ${provider}:`, lastError.message);

        // Si c'est le dernier provider disponible, arrêter
        if (attempt >= maxRetries) {
          break;
        }

        // Essayer le prochain provider
        const nextProvider = this.getNextProvider(provider);
        if (nextProvider) {
          console.log(`🔄 Changement de provider: ${provider} → ${nextProvider}`);
          provider = nextProvider;
        }

        // Attendre avant le retry
        const delay = this.calculateRetryDelay(attempt, lastError);
        console.log(`⏳ Attente ${Math.round(delay / 1000)}s avant nouvelle tentative`);
        await this.sleep(delay);
      }
    }

    const errorMessage = `Échec de génération après ${maxRetries + 1} tentatives avec tous les providers: ${lastError?.message}`;
    console.error('❌', errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Sélectionne le provider à utiliser selon la préférence
   */
  private selectProvider(preferredProvider?: 'supernova' | 'gemini' | 'auto'): string {
    const availableProviders = this.getAvailableProviders();

    if (preferredProvider === 'supernova' && this.supernovaService) {
      return 'supernova';
    }

    if (preferredProvider === 'gemini' && this.geminiService) {
      return 'gemini';
    }

    // Sélection automatique : provider avec la plus haute priorité disponible
    if (preferredProvider === 'auto' || !preferredProvider) {
      const sortedProviders = availableProviders.sort((a, b) => a.priority - b.priority);
      return sortedProviders.length > 0 ? sortedProviders[0].name.toLowerCase() : 'gemini';
    }

    // Provider par défaut si disponible
    return availableProviders.length > 0 ? availableProviders[0].name.toLowerCase() : 'gemini';
  }

  /**
   * Obtient le prochain provider disponible pour le fallback
   */
  private getNextProvider(currentProvider: string): string | null {
    const providers = this.getAvailableProviders();
    const currentIndex = providers.findIndex(p => p.name.toLowerCase() === currentProvider.toLowerCase());

    if (currentIndex !== -1 && currentIndex < providers.length - 1) {
      return providers[currentIndex + 1].name.toLowerCase();
    }

    return null;
  }

  /**
   * Appelle le provider approprié
   */
  private async callProvider(provider: string, request: AIRequest): Promise<AIResponse> {
    if (provider === 'supernova' && this.supernovaService) {
      const response = await this.supernovaService.generateContentWithRetry({
        prompt: request.prompt,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        jsonMode: request.jsonMode
      });

      return {
        content: response.content,
        provider: 'code-supernova',
        model: response.model,
        tokensUsed: response.tokensUsed,
        finishReason: response.finishReason
      };
    }

    if (provider === 'gemini' && this.geminiService) {
      const response = await this.geminiService.generateContentWithRetry({
        prompt: request.prompt,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        jsonMode: request.jsonMode
      });

      return {
        content: response.content,
        provider: 'Google Gemini',
        model: response.model,
        tokensUsed: response.tokensUsed,
        finishReason: response.finishReason
      };
    }

    throw new Error(`Provider ${provider} non disponible`);
  }

  /**
   * Gère les erreurs d'API et les convertit en format standardisé
   */
  private handleAPIError(error: any, provider?: string): AIError {
    if (error.type) {
      return { ...error, provider };
    }

    const message = error.message || 'Erreur inconnue';

    if (message.includes('SUPERNOVA_') || message.includes('GEMINI_')) {
      if (message.includes('_RATE_LIMIT')) {
        return { type: 'rate_limit', message: message.replace('SUPERNOVA_', '').replace('GEMINI_', ''), provider, retryAfter: 60 };
      }
      if (message.includes('_AUTH_ERROR')) {
        return { type: 'auth_error', message: message.replace('SUPERNOVA_', '').replace('GEMINI_', ''), provider };
      }
      if (message.includes('_SERVER_ERROR')) {
        return { type: 'api_error', message: message.replace('SUPERNOVA_', '').replace('GEMINI_', ''), provider, retryAfter: 30 };
      }
    }

    if (message.includes('network') || message.includes('timeout') || message.includes('ECONNRESET')) {
      return { type: 'network_error', message: 'Erreur réseau ou timeout', provider, retryAfter: 5 };
    }

    if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) {
      const retryMatch = message.match(/retry.*?(\d+)/i);
      const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 60;
      return { type: 'rate_limit', message: 'Limite de taux atteinte', provider, retryAfter };
    }

    if (message.includes('authentication') || message.includes('unauthorized') || message.includes('401')) {
      return { type: 'auth_error', message: 'Erreur d\'authentification', provider };
    }

    if (message.includes('502') || message.includes('503') || message.includes('504')) {
      return { type: 'api_error', message: 'Service temporairement indisponible', provider, retryAfter: 30 };
    }

    if (message.includes('500')) {
      return { type: 'api_error', message: 'Erreur serveur interne', provider, retryAfter: 10 };
    }

    return { type: 'api_error', message, provider, details: error };
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