import type { Payload } from 'payload';
import type { 
  QuizSubmission, 
  Category, 
  Question 
} from '../payload-types';
import { cacheService } from './CacheService';

// Define interfaces locally to avoid cross-project dependencies
interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  totalQuestions: number;
  correctAnswers: number;
  successRate: number;
  lastAttemptDate: string;
  questionsAttempted: number;
  averageTimePerQuestion?: number;
}

interface PerformanceAnalytics {
  userId: string;
  overallSuccessRate: number;
  categoryPerformances: CategoryPerformance[];
  weakestCategories: CategoryPerformance[];
  strongestCategories: CategoryPerformance[];
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  analysisDate: string;
}

/**
 * Service for analyzing user performance across quiz categories
 * Provides data for adaptive quiz generation
 * Requirements: 1.1, 8.1, 8.4
 */
export class PerformanceAnalyticsService {
  constructor(private payload: Payload) {}

  /**
   * Analyzes user performance across all categories
   * Uses pre-calculated data from user-performances collection first, then cache, then calculates
   * Requirements: 1.1, 8.1, 8.4
   */
  async analyzeUserPerformance(userId: string, forceRecalculate: boolean = false): Promise<PerformanceAnalytics> {
    // If not forcing recalculation, try to get from user-performances collection first
    if (!forceRecalculate) {
      try {
        const storedPerformance = await this.payload.find({
          collection: 'user-performances',
          where: {
            user: { equals: userId }
          },
          limit: 1
        });

        if (storedPerformance.totalDocs > 0 && storedPerformance.docs[0]) {
          const doc = storedPerformance.docs[0];
          this.payload.logger.info(`Using stored performance data for user: ${userId}`);
          
          return {
            userId,
            overallSuccessRate: doc.overallSuccessRate,
            categoryPerformances: doc.categoryPerformances.map(cat => ({
              categoryId: cat.categoryId,
              categoryName: cat.categoryName,
              totalQuestions: cat.totalQuestions,
              correctAnswers: cat.correctAnswers,
              successRate: cat.successRate,
              lastAttemptDate: cat.lastAttemptDate,
              questionsAttempted: cat.questionsAttempted,
              averageTimePerQuestion: cat.averageTimePerQuestion ?? undefined
            })),
            weakestCategories: (doc.weakestCategories || []).map(cat => ({
              categoryId: cat.categoryId,
              categoryName: cat.categoryName,
              totalQuestions: 0,
              correctAnswers: 0,
              successRate: cat.successRate,
              lastAttemptDate: '',
              questionsAttempted: 0
            })),
            strongestCategories: (doc.strongestCategories || []).map(cat => ({
              categoryId: cat.categoryId,
              categoryName: cat.categoryName,
              totalQuestions: 0,
              correctAnswers: 0,
              successRate: cat.successRate,
              lastAttemptDate: '',
              questionsAttempted: 0
            })),
            totalQuizzesTaken: doc.totalQuizzesTaken,
            totalQuestionsAnswered: doc.totalQuestionsAnswered,
            analysisDate: doc.analysisDate
          };
        }
      } catch (error) {
        // Si erreur lors de la lecture de la collection, continuer avec le calcul
        this.payload.logger.warn(`Failed to read stored performance, will calculate: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Try to get cached analytics
    const cachedAnalytics = await cacheService.getCachedAnalytics(userId);
    if (cachedAnalytics && !forceRecalculate) {
      return cachedAnalytics;
    }

    // Calculate from scratch
    this.payload.logger.info(`Calculating performance from scratch for user: ${userId}`);
    
    // First, check all submissions for this user
    const allSubmissions = await this.payload.find({
      collection: 'quiz-submissions',
      where: {
        student: { equals: userId }
      },
      depth: 2,
      limit: 1000
    });

    this.payload.logger.info(`User ${userId} has ${allSubmissions.totalDocs} total quiz submissions`);

    // Filter submissions with valid finalScore (not null, not undefined, >= 0)
    const validSubmissions = allSubmissions.docs.filter((sub: any) => {
      const hasValidScore = sub.finalScore !== null && 
                           sub.finalScore !== undefined && 
                           typeof sub.finalScore === 'number' &&
                           sub.finalScore >= 0;
      
      if (!hasValidScore) {
        this.payload.logger.warn(`Submission ${sub.id} has invalid finalScore: ${sub.finalScore}`);
      }
      
      return hasValidScore;
    });

    this.payload.logger.info(`User ${userId} has ${validSubmissions.length} valid quiz submissions with finalScore`);

    if (validSubmissions.length === 0) {
      this.payload.logger.warn(`User ${userId} has no completed quiz submissions with valid finalScore`);
      throw new Error('insufficient_data');
    }
    
    this.payload.logger.info(`Analyzing performance for user ${userId} with ${validSubmissions.length} quiz submissions`);

    // Calculate category performances
    const categoryPerformances = await this.calculateCategoryPerformances(validSubmissions as QuizSubmission[]);
    
    // Identify weakest and strongest categories
    const weakestCategories = this.identifyWeakestCategories(categoryPerformances);
    const strongestCategories = this.identifyStrongestCategories(categoryPerformances);

    // Calculate overall metrics
    const overallSuccessRate = this.calculateOverallSuccessRate(validSubmissions as QuizSubmission[]);
    const totalQuestionsAnswered = this.countTotalQuestions(validSubmissions as QuizSubmission[]);

    const analytics: PerformanceAnalytics = {
      userId,
      overallSuccessRate,
      categoryPerformances,
      weakestCategories,
      strongestCategories,
      totalQuizzesTaken: validSubmissions.length,
      totalQuestionsAnswered,
      analysisDate: new Date().toISOString()
    };

    // Cache the results for future use
    await cacheService.setCachedAnalytics(userId, analytics);

    return analytics;
  }

  /**
   * Calculates performance metrics for each category
   * Requirements: 8.1, 8.4
   */
  async calculateCategoryPerformances(submissions: QuizSubmission[]): Promise<CategoryPerformance[]> {
    const categoryStats = new Map<string, {
      categoryId: string;
      categoryName: string;
      totalQuestions: number;
      correctAnswers: number;
      totalTime: number;
      lastAttemptDate: string;
    }>();

    // Process each submission
    for (const submission of submissions) {
      if (!submission.answers || submission.answers.length === 0) continue;

      for (const answer of submission.answers) {
        const question = answer.question as Question;
        if (!question || !question.category) continue;

        const category = question.category as Category;
        const categoryId = category.id.toString();
        const categoryName = category.title;

        // Initialize category stats if not exists
        if (!categoryStats.has(categoryId)) {
          categoryStats.set(categoryId, {
            categoryId,
            categoryName,
            totalQuestions: 0,
            correctAnswers: 0,
            totalTime: 0,
            lastAttemptDate: submission.submissionDate
          });
        }

        const stats = categoryStats.get(categoryId)!;
        stats.totalQuestions++;
        
        if (answer.isCorrect) {
          stats.correctAnswers++;
        }

        // Update last attempt date if this submission is more recent
        if (new Date(submission.submissionDate) > new Date(stats.lastAttemptDate)) {
          stats.lastAttemptDate = submission.submissionDate;
        }
      }
    }

    // Convert to CategoryPerformance array
    const performances: CategoryPerformance[] = [];
    
    for (const [categoryId, stats] of categoryStats) {
      if (stats.totalQuestions === 0) continue;

      performances.push({
        categoryId,
        categoryName: stats.categoryName,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        successRate: stats.correctAnswers / stats.totalQuestions,
        lastAttemptDate: stats.lastAttemptDate,
        questionsAttempted: stats.totalQuestions,
        averageTimePerQuestion: stats.totalTime > 0 ? stats.totalTime / stats.totalQuestions : undefined
      });
    }

    return performances.sort((a, b) => b.totalQuestions - a.totalQuestions);
  }

  /**
   * Identifies the 3 categories with lowest success rates
   * Requirements: 1.1, 8.1
   */
  identifyWeakestCategories(performances: CategoryPerformance[]): CategoryPerformance[] {
    return performances
      .filter(p => p.totalQuestions >= 3) // Only consider categories with sufficient data
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 3);
  }

  /**
   * Identifies the 3 categories with highest success rates
   * Requirements: 1.1, 8.1
   */
  identifyStrongestCategories(performances: CategoryPerformance[]): CategoryPerformance[] {
    return performances
      .filter(p => p.totalQuestions >= 3) // Only consider categories with sufficient data
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3);
  }

  /**
   * Checks if user has minimum data required for adaptive quiz generation
   * Requirements: 1.1, 8.1
   */
  async hasMinimumData(userId: string): Promise<boolean> {
    const allSubmissions = await this.payload.find({
      collection: 'quiz-submissions',
      where: {
        student: { equals: userId }
      },
      limit: 100
    });

    // Count submissions with valid finalScore
    const validCount = allSubmissions.docs.filter((sub: any) => {
      return sub.finalScore !== null && 
             sub.finalScore !== undefined && 
             typeof sub.finalScore === 'number' &&
             sub.finalScore >= 0;
    }).length;

    this.payload.logger.info(`User ${userId} has ${validCount} valid quiz submissions (minimum required: 3)`);

    return validCount >= 3;
  }

  /**
   * Gets performance data for a specific category
   * Requirements: 8.1, 8.4
   */
  async getCategoryPerformance(userId: string, categoryId: string): Promise<CategoryPerformance | null> {
    const submissions = await this.payload.find({
      collection: 'quiz-submissions',
      where: {
        and: [
          { student: { equals: userId } },
          { finalScore: { exists: true } }
        ]
      },
      depth: 2,
      limit: 1000
    });

    if (submissions.totalDocs === 0) {
      return null;
    }

    const categoryPerformances = await this.calculateCategoryPerformances(submissions.docs as QuizSubmission[]);
    return categoryPerformances.find(p => p.categoryId === categoryId) || null;
  }

  /**
   * Invalidates user cache after new quiz completion
   * Should be called when new quiz results are submitted
   * Requirements: 8.4
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await cacheService.invalidateUserCache(userId);
  }

  /**
   * Gets cache statistics for monitoring
   * Requirements: 8.4
   */
  getCacheStats() {
    return cacheService.getCacheStats();
  }

  /**
   * Calculates overall success rate across all submissions
   * Private helper method
   */
  private calculateOverallSuccessRate(submissions: QuizSubmission[]): number {
    if (submissions.length === 0) return 0;

    let totalQuestions = 0;
    let totalCorrect = 0;

    for (const submission of submissions) {
      if (!submission.answers) continue;

      for (const answer of submission.answers) {
        totalQuestions++;
        if (answer.isCorrect) {
          totalCorrect++;
        }
      }
    }

    return totalQuestions > 0 ? totalCorrect / totalQuestions : 0;
  }

  /**
   * Counts total questions answered across all submissions
   * Private helper method
   */
  private countTotalQuestions(submissions: QuizSubmission[]): number {
    let total = 0;
    
    for (const submission of submissions) {
      if (submission.answers) {
        total += submission.answers.length;
      }
    }

    return total;
  }
}