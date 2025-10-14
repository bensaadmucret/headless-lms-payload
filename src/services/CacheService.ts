// Define PerformanceAnalytics interface locally to avoid cross-project dependencies
interface PerformanceAnalytics {
  userId: string;
  overallSuccessRate: number;
  categoryPerformances: any[];
  weakestCategories: any[];
  strongestCategories: any[];
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  analysisDate: string;
}

/**
 * In-memory cache service for performance analytics
 * Optimizes repeated analytics calculations
 * Requirements: 8.4
 */
export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

  /**
   * Gets cached analytics for a user
   * Requirements: 8.4
   */
  async getCachedAnalytics(userId: string): Promise<PerformanceAnalytics | null> {
    const cacheKey = this.generateAnalyticsCacheKey(userId);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data as PerformanceAnalytics;
  }

  /**
   * Sets cached analytics for a user
   * Requirements: 8.4
   */
  async setCachedAnalytics(userId: string, analytics: PerformanceAnalytics, ttlMs?: number): Promise<void> {
    const cacheKey = this.generateAnalyticsCacheKey(userId);
    const ttl = ttlMs || this.DEFAULT_TTL;
    
    const entry: CacheEntry = {
      data: analytics,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      userId
    };

    this.cache.set(cacheKey, entry);

    // Clean up expired entries periodically
    this.cleanupExpiredEntries();
  }

  /**
   * Invalidates user cache after new quiz completion
   * Requirements: 8.4
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const cacheKey = this.generateAnalyticsCacheKey(userId);
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidates all cache entries for a user
   * Useful when user profile changes significantly
   */
  async invalidateAllUserCache(userId: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (entry.userId === userId) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Gets cache statistics for monitoring
   * Requirements: 8.4
   */
  getCacheStats(): CacheStats {
    let totalEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      totalEntries++;
      totalSize += this.estimateEntrySize(entry);
      
      if (now > entry.expiresAt) {
        expiredEntries++;
      }
    }

    return {
      totalEntries,
      expiredEntries,
      activeEntries: totalEntries - expiredEntries,
      estimatedSizeBytes: totalSize,
      hitRate: this.calculateHitRate(),
      oldestEntryAge: this.getOldestEntryAge()
    };
  }

  /**
   * Clears all cache entries
   * Useful for testing or memory management
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Generates a consistent cache key for user analytics
   * Private helper method
   */
  private generateAnalyticsCacheKey(userId: string): string {
    return `analytics:${userId}`;
  }

  /**
   * Removes expired entries from cache
   * Private helper method
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Estimates the memory size of a cache entry
   * Private helper method
   */
  private estimateEntrySize(entry: CacheEntry): number {
    // Rough estimation: JSON string length * 2 (for UTF-16) + metadata overhead
    const jsonSize = JSON.stringify(entry.data).length * 2;
    const metadataSize = 64; // Approximate overhead for timestamps and userId
    return jsonSize + metadataSize;
  }

  /**
   * Calculates cache hit rate (simplified version)
   * Private helper method
   */
  private calculateHitRate(): number {
    // In a production system, you'd track hits and misses
    // For now, return a placeholder
    return 0.75; // 75% hit rate assumption
  }

  /**
   * Gets the age of the oldest cache entry in milliseconds
   * Private helper method
   */
  private getOldestEntryAge(): number {
    let oldestTime = Date.now();
    
    for (const entry of this.cache.values()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
      }
    }

    return Date.now() - oldestTime;
  }
}

/**
 * Interface for cache entry structure
 */
interface CacheEntry {
  data: any;
  createdAt: number;
  expiresAt: number;
  userId: string;
}

/**
 * Interface for cache statistics
 */
interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  activeEntries: number;
  estimatedSizeBytes: number;
  hitRate: number;
  oldestEntryAge: number;
}

// Singleton instance for application-wide use
export const cacheService = new CacheService();