import type { Payload } from 'payload';
import type { Question, Category } from '../payload-types';

// Define interfaces for question selection
interface QuestionSelectionCriteria {
    weakCategories: string[];
    strongCategories: string[];
    targetWeakQuestions: number;
    targetStrongQuestions: number;
    studentLevel: 'PASS' | 'LAS';
    excludeQuestionIds?: string[];
    difficultyDistribution?: {
        easy: number;
        medium: number;
        hard: number;
    };
}

interface QuestionAvailability {
    categoryId: string;
    categoryName: string;
    availableQuestions: number;
    requestedQuestions: number;
    canFulfill: boolean;
}

interface SelectionResult {
    questions: Question[];
    actualDistribution: {
        weakQuestions: number;
        strongQuestions: number;
        totalQuestions: number;
    };
    categoryBreakdown: {
        categoryId: string;
        categoryName: string;
        questionsSelected: number;
        type: 'weak' | 'strong';
    }[];
}

/**
 * Engine for intelligent question selection in adaptive quizzes
 * Handles distribution, filtering, and availability management
 * Requirements: 2.1, 2.2
 */
export class QuestionSelectionEngine {
    // Default distribution: 70% weak categories, 30% strong categories
    private readonly DEFAULT_WEAK_PERCENTAGE = 0.7;
    private readonly DEFAULT_STRONG_PERCENTAGE = 0.3;
    private readonly DEFAULT_TOTAL_QUESTIONS = 7;

    constructor(private payload: Payload) { }

    /**
     * Selects questions for adaptive quiz based on criteria
     * Implements 70% weak / 30% strong distribution
     * Requirements: 2.1, 2.2
     */
    async selectAdaptiveQuestions(criteria: QuestionSelectionCriteria): Promise<SelectionResult> {
        // Apply 70/30 distribution if not explicitly set
        const distributedCriteria = this.applyDistributionRules(criteria);

        // Validate question availability first
        const availability = await this.validateQuestionAvailability(distributedCriteria);

        // Adjust selection if needed based on availability
        const adjustedCriteria = await this.adjustSelectionForAvailability(distributedCriteria, availability);

        // Select questions from weak categories (70%)
        const weakQuestions = await this.selectQuestionsFromCategories(
            adjustedCriteria.weakCategories,
            adjustedCriteria.targetWeakQuestions,
            adjustedCriteria.studentLevel,
            adjustedCriteria.excludeQuestionIds
        );

        // Select questions from strong categories (30%)
        const strongQuestions = await this.selectQuestionsFromCategories(
            adjustedCriteria.strongCategories,
            adjustedCriteria.targetStrongQuestions,
            adjustedCriteria.studentLevel,
            adjustedCriteria.excludeQuestionIds
        );

        // Combine and shuffle all questions
        const allQuestions = [...weakQuestions, ...strongQuestions];
        const shuffledQuestions = this.shuffleQuestions(allQuestions);

        // Balance by difficulty if criteria specified
        const balancedQuestions = adjustedCriteria.difficultyDistribution
            ? await this.balanceByDifficulty(shuffledQuestions, adjustedCriteria.difficultyDistribution)
            : shuffledQuestions;

        // Create category breakdown
        const categoryBreakdown = this.createCategoryBreakdown(
            weakQuestions,
            strongQuestions,
            adjustedCriteria.weakCategories,
            adjustedCriteria.strongCategories
        );

        return {
            questions: balancedQuestions,
            actualDistribution: {
                weakQuestions: weakQuestions.length,
                strongQuestions: strongQuestions.length,
                totalQuestions: balancedQuestions.length
            },
            categoryBreakdown
        };
    }

    /**
     * Selects questions from specific categories with filtering
     * Requirements: 2.1, 2.2
     */
    async selectQuestionsFromCategories(
        categoryIds: string[],
        count: number,
        studentLevel: 'PASS' | 'LAS',
        excludeQuestionIds: string[] = []
    ): Promise<Question[]> {
        if (categoryIds.length === 0 || count === 0) {
            return [];
        }

        // Build query conditions
        const whereConditions: any = {
            and: [
                {
                    category: { in: categoryIds }
                },
                {
                    or: [
                        { studentLevel: { equals: studentLevel } },
                        { studentLevel: { equals: 'both' } }
                    ]
                }
            ]
        };

        // Exclude recent questions if specified
        if (excludeQuestionIds.length > 0) {
            whereConditions.and.push({
                id: { not_in: excludeQuestionIds }
            });
        }

        try {
            // Fetch available questions (get more than needed for better selection)
            const questionsResult = await this.payload.find({
                collection: 'questions',
                where: whereConditions,
                limit: Math.max(count * 3, 50), // Get 3x more for better randomization
                depth: 1
            });

            const availableQuestions = questionsResult.docs as Question[];

            if (availableQuestions.length === 0) {
                console.warn(`No questions available for categories: ${categoryIds.join(', ')}, level: ${studentLevel}`);
                return [];
            }

            // If we have fewer questions than requested, return all available
            if (availableQuestions.length <= count) {
                return this.shuffleQuestions(availableQuestions);
            }

            // Randomly select the requested number of questions
            const shuffled = this.shuffleQuestions(availableQuestions);
            return shuffled.slice(0, count);

        } catch (error) {
            console.error('Error selecting questions from categories:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to select questions from categories: ${errorMessage}`);
        }
    }

    /**
     * Shuffles questions array randomly using Fisher-Yates algorithm
     * Requirements: 2.1, 2.2
     */
    shuffleQuestions(questions: Question[]): Question[] {
        const shuffled = [...questions];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // Use array destructuring with proper type assertion
            [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
        }

        return shuffled;
    }

    /**
     * Validates if enough questions are available for the selection criteria
     * Requirements: 2.1, 2.2
     */
    async validateQuestionAvailability(criteria: QuestionSelectionCriteria): Promise<QuestionAvailability[]> {
        const availability: QuestionAvailability[] = [];

        // Check weak categories
        for (const categoryId of criteria.weakCategories) {
            const categoryAvailability = await this.checkCategoryAvailability(
                categoryId,
                criteria.targetWeakQuestions / criteria.weakCategories.length,
                criteria.studentLevel,
                criteria.excludeQuestionIds
            );
            availability.push({
                ...categoryAvailability,
                type: 'weak'
            } as any);
        }

        // Check strong categories
        for (const categoryId of criteria.strongCategories) {
            const categoryAvailability = await this.checkCategoryAvailability(
                categoryId,
                criteria.targetStrongQuestions / criteria.strongCategories.length,
                criteria.studentLevel,
                criteria.excludeQuestionIds
            );
            availability.push({
                ...categoryAvailability,
                type: 'strong'
            } as any);
        }

        return availability;
    }

    /**
     * Adjusts selection criteria based on question availability
     * Handles cases where categories don't have enough questions
     * Maintains 70/30 distribution when possible
     * Requirements: 2.1, 2.2
     */
    async adjustSelectionForAvailability(
        criteria: QuestionSelectionCriteria,
        availability: QuestionAvailability[]
    ): Promise<QuestionSelectionCriteria> {
        const adjustedCriteria = { ...criteria };

        // Calculate total available questions for weak and strong categories
        const weakAvailability = availability.filter((a: any) => a.type === 'weak');
        const strongAvailability = availability.filter((a: any) => a.type === 'strong');

        const totalWeakAvailable = weakAvailability.reduce((sum, a) => sum + a.availableQuestions, 0);
        const totalStrongAvailable = strongAvailability.reduce((sum, a) => sum + a.availableQuestions, 0);

        // Remove categories that have no available questions first
        adjustedCriteria.weakCategories = criteria.weakCategories.filter(categoryId => {
            const categoryAvailability = weakAvailability.find(a => a.categoryId === categoryId);
            return categoryAvailability && categoryAvailability.availableQuestions > 0;
        });

        adjustedCriteria.strongCategories = criteria.strongCategories.filter(categoryId => {
            const categoryAvailability = strongAvailability.find(a => a.categoryId === categoryId);
            return categoryAvailability && categoryAvailability.availableQuestions > 0;
        });

        // Adjust question counts based on availability
        let targetWeak = criteria.targetWeakQuestions;
        let targetStrong = criteria.targetStrongQuestions;

        // If not enough weak questions, redistribute to strong categories
        if (totalWeakAvailable < criteria.targetWeakQuestions) {
            console.warn(`Only ${totalWeakAvailable} weak questions available, requested ${criteria.targetWeakQuestions}`);
            targetWeak = totalWeakAvailable;

            // Try to maintain total question count by adding to strong questions
            const deficit = criteria.targetWeakQuestions - totalWeakAvailable;
            const maxAdditionalStrong = Math.min(deficit, totalStrongAvailable - criteria.targetStrongQuestions);
            if (maxAdditionalStrong > 0) {
                targetStrong += maxAdditionalStrong;
                console.info(`Redistributing ${maxAdditionalStrong} questions from weak to strong categories`);
            }
        }

        // If not enough strong questions, redistribute to weak categories
        if (totalStrongAvailable < targetStrong) {
            console.warn(`Only ${totalStrongAvailable} strong questions available, requested ${targetStrong}`);
            const originalTargetStrong = targetStrong;
            targetStrong = totalStrongAvailable;

            // Try to maintain total question count by adding to weak questions
            const deficit = originalTargetStrong - totalStrongAvailable;
            const maxAdditionalWeak = Math.min(deficit, totalWeakAvailable - targetWeak);
            if (maxAdditionalWeak > 0) {
                targetWeak += maxAdditionalWeak;
                console.info(`Redistributing ${maxAdditionalWeak} questions from strong to weak categories`);
            }
        }

        adjustedCriteria.targetWeakQuestions = targetWeak;
        adjustedCriteria.targetStrongQuestions = targetStrong;

        // Log final distribution
        const totalQuestions = targetWeak + targetStrong;
        if (totalQuestions > 0) {
            const weakPercentage = (targetWeak / totalQuestions * 100).toFixed(1);
            const strongPercentage = (targetStrong / totalQuestions * 100).toFixed(1);
            console.info(`Final distribution: ${weakPercentage}% weak (${targetWeak}), ${strongPercentage}% strong (${targetStrong})`);
        }

        return adjustedCriteria;
    }

    /**
     * Excludes recently used questions to avoid repetition
     * Requirements: 2.1, 2.2
     */
    async excludeRecentQuestions(userId: string, daysPeriod: number = 7): Promise<string[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysPeriod);

        try {
            // Find recent adaptive quiz sessions for this user
            const recentSessions = await this.payload.find({
                collection: 'adaptiveQuizSessions',
                where: {
                    and: [
                        { user: { equals: userId } },
                        { createdAt: { greater_than: cutoffDate.toISOString() } }
                    ]
                },
                depth: 1,
                limit: 50
            });

            const excludeQuestionIds: string[] = [];

            // Extract question IDs from recent sessions
            for (const session of recentSessions.docs) {
                if (session.questions && Array.isArray(session.questions)) {
                    for (const question of session.questions) {
                        const questionId = typeof question === 'string' ? question : (question as Question)?.id;
                        if (questionId && !excludeQuestionIds.includes(questionId.toString())) {
                            excludeQuestionIds.push(questionId.toString());
                        }
                    }
                }
            }

            return excludeQuestionIds;

        } catch (error) {
            console.error('Error fetching recent questions:', error);
            return []; // Return empty array on error to not block quiz generation
        }
    }

    /**
     * Applies the 70% weak / 30% strong distribution rule
     * Requirements: 2.1, 2.2
     */
    private applyDistributionRules(criteria: QuestionSelectionCriteria): QuestionSelectionCriteria {
        const totalQuestions = criteria.targetWeakQuestions + criteria.targetStrongQuestions || this.DEFAULT_TOTAL_QUESTIONS;

        // Calculate 70/30 distribution
        const weakQuestionsCount = Math.ceil(totalQuestions * this.DEFAULT_WEAK_PERCENTAGE);
        const strongQuestionsCount = Math.floor(totalQuestions * this.DEFAULT_STRONG_PERCENTAGE);

        return {
            ...criteria,
            targetWeakQuestions: criteria.targetWeakQuestions || weakQuestionsCount,
            targetStrongQuestions: criteria.targetStrongQuestions || strongQuestionsCount
        };
    }

    /**
     * Balances questions by difficulty level
     * Requirements: 2.1, 2.2
     */
    async balanceByDifficulty(
        questions: Question[],
        difficultyDistribution: { easy: number; medium: number; hard: number }
    ): Promise<Question[]> {
        // Group questions by difficulty
        const questionsByDifficulty = {
            easy: questions.filter(q => q.difficulty === 'easy'),
            medium: questions.filter(q => q.difficulty === 'medium'),
            hard: questions.filter(q => q.difficulty === 'hard')
        };

        const balancedQuestions: Question[] = [];

        // Select questions according to distribution
        const easyCount = Math.min(difficultyDistribution.easy, questionsByDifficulty.easy.length);
        const mediumCount = Math.min(difficultyDistribution.medium, questionsByDifficulty.medium.length);
        const hardCount = Math.min(difficultyDistribution.hard, questionsByDifficulty.hard.length);

        // Add questions from each difficulty level
        balancedQuestions.push(...this.shuffleQuestions(questionsByDifficulty.easy).slice(0, easyCount));
        balancedQuestions.push(...this.shuffleQuestions(questionsByDifficulty.medium).slice(0, mediumCount));
        balancedQuestions.push(...this.shuffleQuestions(questionsByDifficulty.hard).slice(0, hardCount));

        // If we need more questions and some difficulty levels are exhausted,
        // fill from available questions
        const totalNeeded = difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard;
        if (balancedQuestions.length < totalNeeded) {
            const remainingQuestions = questions.filter(q => !balancedQuestions.includes(q));
            const needed = totalNeeded - balancedQuestions.length;
            balancedQuestions.push(...this.shuffleQuestions(remainingQuestions).slice(0, needed));
        }

        return this.shuffleQuestions(balancedQuestions);
    }

    /**
     * Creates a default difficulty distribution for balanced question selection
     * Requirements: 2.1, 2.2
     */
    createDefaultDifficultyDistribution(totalQuestions: number): { easy: number; medium: number; hard: number } {
        // Default distribution: 40% medium, 30% easy, 30% hard
        const medium = Math.ceil(totalQuestions * 0.4);
        const easy = Math.ceil(totalQuestions * 0.3);
        const hard = totalQuestions - medium - easy;

        return {
            easy: Math.max(0, easy),
            medium: Math.max(0, medium),
            hard: Math.max(0, hard)
        };
    }

    /**
     * Gets comprehensive selection statistics for monitoring
     * Requirements: 2.1, 2.2
     */
    async getSelectionStatistics(criteria: QuestionSelectionCriteria): Promise<{
        totalAvailableQuestions: number;
        weakCategoriesStats: { categoryId: string; available: number; requested: number }[];
        strongCategoriesStats: { categoryId: string; available: number; requested: number }[];
        canFulfillRequest: boolean;
        recommendedAdjustments?: string[];
    }> {
        const availability = await this.validateQuestionAvailability(criteria);

        const weakStats = availability.filter((a: any) => a.type === 'weak').map(a => ({
            categoryId: a.categoryId,
            available: a.availableQuestions,
            requested: Math.ceil(criteria.targetWeakQuestions / criteria.weakCategories.length)
        }));

        const strongStats = availability.filter((a: any) => a.type === 'strong').map(a => ({
            categoryId: a.categoryId,
            available: a.availableQuestions,
            requested: Math.ceil(criteria.targetStrongQuestions / criteria.strongCategories.length)
        }));

        const totalAvailable = availability.reduce((sum, a) => sum + a.availableQuestions, 0);
        const totalRequested = criteria.targetWeakQuestions + criteria.targetStrongQuestions;
        const canFulfill = totalAvailable >= totalRequested;

        const recommendations: string[] = [];
        if (!canFulfill) {
            recommendations.push(`Insufficient questions: ${totalAvailable} available, ${totalRequested} requested`);
        }

        // Check for categories with insufficient questions
        availability.forEach(a => {
            if (!a.canFulfill) {
                recommendations.push(`Category "${a.categoryName}" has only ${a.availableQuestions} questions, needs ${a.requestedQuestions}`);
            }
        });

        return {
            totalAvailableQuestions: totalAvailable,
            weakCategoriesStats: weakStats,
            strongCategoriesStats: strongStats,
            canFulfillRequest: canFulfill,
            recommendedAdjustments: recommendations.length > 0 ? recommendations : undefined
        };
    }

    /**
     * Checks availability of questions in a specific category
     * Private helper method
     */
    private async checkCategoryAvailability(
        categoryId: string,
        requestedCount: number,
        studentLevel: 'PASS' | 'LAS',
        excludeQuestionIds: string[] = []
    ): Promise<QuestionAvailability> {
        try {
            // Get category info
            const category = await this.payload.findByID({
                collection: 'categories',
                id: categoryId
            }) as Category;

            // Build query conditions
            const whereConditions: any = {
                and: [
                    { category: { equals: categoryId } },
                    {
                        or: [
                            { studentLevel: { equals: studentLevel } },
                            { studentLevel: { equals: 'both' } }
                        ]
                    }
                ]
            };

            if (excludeQuestionIds.length > 0) {
                whereConditions.and.push({
                    id: { not_in: excludeQuestionIds }
                });
            }

            // Count available questions
            const questionsResult = await this.payload.find({
                collection: 'questions',
                where: whereConditions,
                limit: 1 // We only need the count
            });

            const availableQuestions = questionsResult.totalDocs;

            return {
                categoryId,
                categoryName: category.title,
                availableQuestions,
                requestedQuestions: Math.ceil(requestedCount),
                canFulfill: availableQuestions >= Math.ceil(requestedCount)
            };

        } catch (error) {
            console.error(`Error checking availability for category ${categoryId}:`, error);
            return {
                categoryId,
                categoryName: 'Unknown Category',
                availableQuestions: 0,
                requestedQuestions: Math.ceil(requestedCount),
                canFulfill: false
            };
        }
    }

    /**
     * Creates breakdown of questions by category and type
     * Private helper method
     */
    private createCategoryBreakdown(
        weakQuestions: Question[],
        strongQuestions: Question[],
        weakCategoryIds: string[],
        strongCategoryIds: string[]
    ): { categoryId: string; categoryName: string; questionsSelected: number; type: 'weak' | 'strong' }[] {
        const breakdown: { categoryId: string; categoryName: string; questionsSelected: number; type: 'weak' | 'strong' }[] = [];

        // Count weak category questions
        for (const categoryId of weakCategoryIds) {
            const questionsInCategory = weakQuestions.filter(q => {
                const category = q.category as Category;
                return category && category.id?.toString() === categoryId;
            });

            if (questionsInCategory.length > 0) {
                const category = questionsInCategory[0]?.category as Category;
                if (category?.title) {
                    breakdown.push({
                        categoryId,
                        categoryName: category.title,
                        questionsSelected: questionsInCategory.length,
                        type: 'weak'
                    });
                }
            }
        }

        // Count strong category questions
        for (const categoryId of strongCategoryIds) {
            const questionsInCategory = strongQuestions.filter(q => {
                const category = q.category as Category;
                return category && category.id?.toString() === categoryId;
            });

            if (questionsInCategory.length > 0) {
                const category = questionsInCategory[0]?.category as Category;
                if (category?.title) {
                    breakdown.push({
                        categoryId,
                        categoryName: category.title,
                        questionsSelected: questionsInCategory.length,
                        type: 'strong'
                    });
                }
            }
        }

        return breakdown;
    }
}

// Export types for use in other services
export type { QuestionSelectionCriteria, QuestionAvailability, SelectionResult };