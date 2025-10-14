import type { Payload } from 'payload';
import type {
    User,
    Question,
    Category,
    AdaptiveQuizSession,
    AdaptiveQuizResult
} from '../payload-types';
import { PerformanceAnalyticsService } from './PerformanceAnalyticsService';
import { QuestionSelectionEngine, type QuestionSelectionCriteria } from './questionSelectionEngine';
import { AIQuizGenerationService, type QuestionGenerationRequest } from './AIQuizGenerationService';

// Define interfaces for the service
interface AdaptiveQuizGenerationResult {
    sessionId: string;
    questions: Question[];
    metadata: {
        basedOnAnalytics: {
            weakCategories: Category[];
            strongCategories: Category[];
            analysisDate: string;
            overallSuccessRate: number;
            totalQuizzesAnalyzed: number;
        };
        questionDistribution: {
            weakCategoryQuestions: number;
            strongCategoryQuestions: number;
            totalQuestions: number;
        };
        config: {
            weakQuestionsCount: number;
            strongQuestionsCount: number;
            targetSuccessRate: number;
        };
        studentLevel: 'PASS' | 'LAS';
        expiresAt: string;
    };
}

interface PrerequisiteValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

/**
 * Main service for adaptive quiz generation and management
 * Orchestrates performance analysis and question selection
 * Requirements: 1.1, 3.1, 3.2
 */
export class AdaptiveQuizService {
    private performanceAnalytics: PerformanceAnalyticsService;
    private questionSelection: QuestionSelectionEngine;

    // Default configuration
    private readonly DEFAULT_WEAK_QUESTIONS = 5;
    private readonly DEFAULT_STRONG_QUESTIONS = 2;
    private readonly DEFAULT_TARGET_SUCCESS_RATE = 0.6;
    private readonly SESSION_EXPIRY_HOURS = 24;
    private readonly DAILY_LIMIT = 10; // Augmenté pour le développement
    private readonly COOLDOWN_MINUTES = 0; // Désactivé pour le développement

    constructor(private payload: Payload) {
        this.performanceAnalytics = new PerformanceAnalyticsService(payload);
        this.questionSelection = new QuestionSelectionEngine(payload);
    }

    /**
     * Generates an adaptive quiz for a user
     * Orchestrates analysis and selection process
     * Requirements: 1.1, 3.1, 3.2
     */
    async generateAdaptiveQuiz(userId: string): Promise<AdaptiveQuizGenerationResult> {
        try {
            // Step 1: Validate prerequisites
            const validation = await this.validatePrerequisites(userId);
            if (!validation.isValid) {
                throw new Error(validation.errors[0] || 'Prerequisites validation failed');
            }

            // Step 2: Get student level
            const studentLevel = await this.getStudentLevel(userId);

            // Step 3: Analyze user performance
            const analytics = await this.performanceAnalytics.analyzeUserPerformance(userId);

            // Step 4: Generate AI questions based on weak categories
            this.payload.logger.info(`Generating AI questions for weak categories`);
            this.payload.logger.info(`Analytics weakest categories:`, analytics.weakestCategories);
            
            const aiQuestions = await this.generateAIQuestionsForWeakCategories(
                analytics,
                studentLevel,
                userId
            );

            this.payload.logger.info(`AI Questions generated: ${aiQuestions.length}`);

            if (aiQuestions.length === 0) {
                this.payload.logger.error(`No AI questions generated - throwing insufficient_questions error`);
                throw new Error('insufficient_questions');
            }

            // Prepare distribution info
            const selectionResult = {
                questions: aiQuestions,
                actualDistribution: {
                    weakQuestions: aiQuestions.length,
                    strongQuestions: 0,
                    totalQuestions: aiQuestions.length
                }
            };

            // Step 6: Create adaptive quiz session
            this.payload.logger.info(`Creating adaptive quiz session with ${selectionResult.questions.length} questions`);
            const session = await this.createAdaptiveQuizSession(
                userId,
                selectionResult.questions,
                analytics,
                studentLevel,
                selectionResult.actualDistribution
            );
            this.payload.logger.info(`Session created successfully: ${session.sessionId}`);

            // Step 7: Prepare response
            return {
                sessionId: session.sessionId,
                questions: selectionResult.questions,
                metadata: {
                    basedOnAnalytics: {
                        weakCategories: analytics.weakestCategories.map(cat => ({
                            id: parseInt(cat.categoryId),
                            title: cat.categoryName,
                            level: 'both',
                            updatedAt: new Date().toISOString(),
                            createdAt: new Date().toISOString()
                        } as Category)),
                        strongCategories: analytics.strongestCategories.map(cat => ({
                            id: parseInt(cat.categoryId),
                            title: cat.categoryName,
                            level: 'both',
                            updatedAt: new Date().toISOString(),
                            createdAt: new Date().toISOString()
                        } as Category)),
                        analysisDate: analytics.analysisDate,
                        overallSuccessRate: analytics.overallSuccessRate,
                        totalQuizzesAnalyzed: analytics.totalQuizzesTaken
                    },
                    questionDistribution: {
                        weakCategoryQuestions: selectionResult.actualDistribution.weakQuestions,
                        strongCategoryQuestions: selectionResult.actualDistribution.strongQuestions,
                        totalQuestions: selectionResult.actualDistribution.totalQuestions
                    },
                    config: {
                        weakQuestionsCount: this.DEFAULT_WEAK_QUESTIONS,
                        strongQuestionsCount: this.DEFAULT_STRONG_QUESTIONS,
                        targetSuccessRate: this.DEFAULT_TARGET_SUCCESS_RATE
                    },
                    studentLevel,
                    expiresAt: new Date(Date.now() + this.SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
                }
            };

        } catch (error) {
            console.error('Error generating adaptive quiz:', error);

            // Re-throw known errors
            if (error instanceof Error) {
                const knownErrors = [
                    'insufficient_data',
                    'insufficient_questions',
                    'level_not_set',
                    'daily_limit_exceeded',
                    'cooldown_active'
                ];

                if (knownErrors.includes(error.message)) {
                    throw error;
                }
            }

            // Wrap unknown errors
            throw new Error('technical_error');
        }
    }

    /**
     * Validates all prerequisites for adaptive quiz generation
     * Requirements: 1.1, 3.1, 3.2
     */
    async validatePrerequisites(userId: string): Promise<PrerequisiteValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Check if user exists and has required data
            const user = await this.payload.findByID({
                collection: 'users',
                id: userId
            }) as User;

            if (!user) {
                errors.push('user_not_found');
                return { isValid: false, errors };
            }

            // Check if student level is set (studyYear in database)
            const studyYear = (user as any).studyYear;
            if (!studyYear || (studyYear !== 'pass' && studyYear !== 'las')) {
                errors.push('level_not_set');
            }

            // Check minimum data requirement
            const hasMinData = await this.performanceAnalytics.hasMinimumData(userId);
            if (!hasMinData) {
                errors.push('insufficient_data');
            }

            // Check rate limits
            const rateLimitCheck = await this.checkRateLimits(userId);
            if (!rateLimitCheck.isValid) {
                errors.push(...rateLimitCheck.errors);
            }

            // Add warnings if any
            if (rateLimitCheck.warnings) {
                warnings.push(...rateLimitCheck.warnings);
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error) {
            console.error('Error validating prerequisites:', error);
            errors.push('validation_error');
            return { isValid: false, errors };
        }
    }

    /**
     * Creates selection criteria based on performance analytics
     * Requirements: 1.1, 3.1, 3.2
     */
    createSelectionCriteria(
        analytics: any,
        studentLevel: 'PASS' | 'LAS'
    ): QuestionSelectionCriteria {
        // Extract category IDs from analytics
        const weakCategoryIds = analytics.weakestCategories.map((cat: any) => cat.categoryId);
        const strongCategoryIds = analytics.strongestCategories.map((cat: any) => cat.categoryId);

        // Get recently used questions to exclude
        const excludeQuestionIds: string[] = []; // Will be populated by excludeRecentQuestions

        return {
            weakCategories: weakCategoryIds,
            strongCategories: strongCategoryIds,
            targetWeakQuestions: this.DEFAULT_WEAK_QUESTIONS,
            targetStrongQuestions: this.DEFAULT_STRONG_QUESTIONS,
            studentLevel,
            excludeQuestionIds,
            difficultyDistribution: this.questionSelection.createDefaultDifficultyDistribution(
                this.DEFAULT_WEAK_QUESTIONS + this.DEFAULT_STRONG_QUESTIONS
            )
        };
    }

    /**
     * Creates and saves an adaptive quiz session
     * Requirements: 1.1, 3.1, 3.2
     */
    async createAdaptiveQuizSession(
        userId: string,
        questions: Question[],
        analytics: any,
        studentLevel: 'PASS' | 'LAS',
        distribution: { weakQuestions: number; strongQuestions: number; totalQuestions: number }
    ): Promise<AdaptiveQuizSession> {
        try {
            // Generate unique session ID
            const sessionId = `adaptive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Calculate expiration date
            const expiresAt = new Date(Date.now() + this.SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

            // Get category IDs from categoryId strings
            const getCategoryIds = async (categoryObjects: any[]): Promise<number[]> => {
                const ids: number[] = [];
                for (const catObj of categoryObjects) {
                    try {
                        const categories = await this.payload.find({
                            collection: 'categories',
                            where: {
                                slug: { equals: catObj.categoryId }
                            },
                            limit: 1
                        });
                        if (categories.docs.length > 0 && categories.docs[0]) {
                            ids.push(categories.docs[0].id);
                        }
                    } catch (error) {
                        console.warn(`Could not find category with slug ${catObj.categoryId}`);
                    }
                }
                return ids;
            };

            const weakCategoryIds = await getCategoryIds(analytics.weakestCategories || []);
            const strongCategoryIds = await getCategoryIds(analytics.strongestCategories || []);

            // Prepare session data
            const sessionData = {
                sessionId,
                user: parseInt(userId),
                questions: questions.map(q => q.id),
                status: 'active' as const,
                basedOnAnalytics: {
                    weakCategories: weakCategoryIds,
                    strongCategories: strongCategoryIds,
                    analysisDate: analytics.analysisDate,
                    overallSuccessRate: analytics.overallSuccessRate,
                    totalQuizzesAnalyzed: analytics.totalQuizzesTaken
                },
                questionDistribution: {
                    weakCategoryQuestions: distribution.weakQuestions,
                    strongCategoryQuestions: distribution.strongQuestions,
                    totalQuestions: distribution.totalQuestions
                },
                config: {
                    weakQuestionsCount: this.DEFAULT_WEAK_QUESTIONS,
                    strongQuestionsCount: this.DEFAULT_STRONG_QUESTIONS,
                    targetSuccessRate: this.DEFAULT_TARGET_SUCCESS_RATE
                },
                studentLevel,
                expiresAt: expiresAt.toISOString()
            };

            // Create session in database
            this.payload.logger.info(`Attempting to create session with sessionId: ${sessionData.sessionId}`);
            this.payload.logger.info(`Session data: ${JSON.stringify(sessionData, null, 2)}`);
            
            const session = await this.payload.create({
                collection: 'adaptiveQuizSessions',
                data: sessionData
            }) as AdaptiveQuizSession;

            this.payload.logger.info(`Session created in DB with id: ${session.id}`);
            return session;

        } catch (error) {
            this.payload.logger.error('Error creating adaptive quiz session:', error);
            throw new Error('session_creation_failed');
        }
    }

    /**
     * Generates AI questions for weak categories
     * Requirements: 1.1, 1.2, 3.2
     */
    async generateAIQuestionsForWeakCategories(
        analytics: any,
        studentLevel: 'PASS' | 'LAS',
        userId: string
    ): Promise<Question[]> {
        try {
            const aiService = new AIQuizGenerationService();
            const generatedQuestions: Question[] = [];

            // Get weak categories (max 3)
            const weakCategories = analytics.weakestCategories.slice(0, 3);
            
            if (weakCategories.length === 0) {
                this.payload.logger.warn(`No weak categories found for user ${userId}`);
                return [];
            }

            this.payload.logger.info(`Generating AI questions for ${weakCategories.length} weak categories`);

            // Generate 2-3 questions per weak category
            const questionsPerCategory = Math.ceil(this.DEFAULT_WEAK_QUESTIONS / weakCategories.length);

            for (const weakCat of weakCategories) {
                try {
                    // Find category in database by ID (categoryId is a number)
                    const category = await this.payload.findByID({
                        collection: 'categories',
                        id: weakCat.categoryId
                    });

                    if (!category) {
                        this.payload.logger.warn(`Category not found: ${weakCat.categoryId}`);
                        continue;
                    }

                    // Prepare AI generation request
                    const generationRequest: QuestionGenerationRequest = {
                        categoryId: String(category.id),
                        categoryName: category.title,
                        courseId: '1', // Default course ID - will be converted to number if needed
                        courseName: 'Quiz Adaptatif',
                        difficultyLevel: studentLevel.toLowerCase() as 'pass' | 'las',
                        questionCount: Math.min(questionsPerCategory, 3), // Limit to 3 questions per category max
                        medicalDomain: category.title,
                        sourceContent: `Questions ciblées pour améliorer les performances en ${category.title}. Taux de réussite actuel: ${(weakCat.successRate * 100).toFixed(1)}%`
                    };

                    this.payload.logger.info(`Generating ${questionsPerCategory} questions for ${category.title}`);

                    // Generate questions with AI
                    const aiGeneratedQuestions = await aiService.generateQuestions(generationRequest);

                    // Convert AI questions to Question format and save to database
                    for (const aiQuestion of aiGeneratedQuestions) {
                        const createdQuestion = await this.payload.create({
                            collection: 'questions',
                            data: {
                                questionText: {
                                    root: {
                                        type: 'root',
                                        children: [
                                            {
                                                type: 'paragraph',
                                                version: 1,
                                                children: [
                                                    {
                                                        type: 'text',
                                                        text: aiQuestion.questionText,
                                                        version: 1
                                                    }
                                                ]
                                            }
                                        ],
                                        direction: null,
                                        format: '',
                                        indent: 0,
                                        version: 1
                                    }
                                },
                                options: aiQuestion.options.map(opt => ({
                                    optionText: opt.optionText,
                                    isCorrect: opt.isCorrect
                                })),
                                questionType: 'multipleChoice',
                                explanation: aiQuestion.explanation || 'Pas d\'explication disponible',
                                course: 1, // Default course ID
                                category: category.id,
                                difficulty: 'medium', // Default difficulty
                                studentLevel: studentLevel as 'PASS' | 'LAS'
                            }
                        }) as Question;

                        generatedQuestions.push(createdQuestion);
                    }

                } catch (error) {
                    this.payload.logger.error(`Error generating questions for category ${weakCat.categoryId}:`, error);
                }
            }

            this.payload.logger.info(`Successfully generated ${generatedQuestions.length} AI questions`);
            return generatedQuestions;

        } catch (error) {
            this.payload.logger.error('Error in generateAIQuestionsForWeakCategories:', error);
            throw error;
        }
    }

    /**
     * Retrieves the student level for a user
     * Requirements: 1.1, 3.1, 3.2
     */
    async getStudentLevel(userId: string): Promise<'PASS' | 'LAS'> {
        try {
            const user = await this.payload.findByID({
                collection: 'users',
                id: userId
            }) as User;

            if (!(user as any).studyYear) {
                throw new Error('level_not_set');
            }

            // Convert studyYear to studentLevel format
            const studyYear = (user as any).studyYear;
            if (studyYear !== 'pass' && studyYear !== 'las') {
                throw new Error('invalid_student_level');
            }

            return studyYear.toUpperCase() as 'PASS' | 'LAS';

        } catch (error) {
            console.error('Error getting student level:', error);
            throw error;
        }
    }

    /**
     * Checks rate limits for quiz generation
     * Requirements: 5.1, 5.2, 5.3
     */
    private async checkRateLimits(userId: string): Promise<{
        isValid: boolean;
        errors: string[];
        warnings?: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check daily limit
            const todaySessions = await this.payload.find({
                collection: 'adaptiveQuizSessions',
                where: {
                    and: [
                        { user: { equals: userId } },
                        { createdAt: { greater_than: today.toISOString() } }
                    ]
                },
                sort: '-createdAt'
            });

            // Daily limit check
            if (todaySessions.totalDocs >= this.DAILY_LIMIT) {
                errors.push('daily_limit_exceeded');
                return { isValid: false, errors };
            }

            // Cooldown check - DISABLED FOR DEVELOPMENT
            // TODO: Re-enable in production
            // if (todaySessions.totalDocs > 0) {
            //     const lastSession = todaySessions.docs[0];
            //     if (lastSession) {
            //         const lastSessionTime = new Date(lastSession.createdAt);
            //         const now = new Date();
            //         const diffMinutes = (now.getTime() - lastSessionTime.getTime()) / (1000 * 60);

            //         if (diffMinutes < this.COOLDOWN_MINUTES) {
            //             const remainingMinutes = Math.ceil(this.COOLDOWN_MINUTES - diffMinutes);
            //             errors.push(`cooldown_active:${remainingMinutes}`);
            //             return { isValid: false, errors };
            //         }
            //     }
            // }

            // Add warnings for approaching limits
            if (todaySessions.totalDocs >= this.DAILY_LIMIT - 1) {
                warnings.push('approaching_daily_limit');
            }

            return {
                isValid: true,
                errors: [],
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error) {
            console.error('Error checking rate limits:', error);
            errors.push('rate_limit_check_failed');
            return { isValid: false, errors };
        }
    }

    /**
     * Saves and analyzes adaptive quiz results
     * Requirements: 4.1, 4.2, 4.3, 4.4
     */
    async saveAdaptiveQuizResults(
        sessionId: string,
        answers: Record<string, string | string[]>
    ): Promise<AdaptiveQuizResult> {
        try {
            // Step 1: Retrieve and validate session
            const session = await this.getAdaptiveQuizSession(sessionId);

            // Step 2: Enrich answers with metadata
            const enrichedAnswers = await this.enrichQuizAnswers(session, answers);

            // Step 3: Calculate category results
            const categoryResults = await this.calculateCategoryResults(session, enrichedAnswers);

            // Step 4: Generate personalized recommendations
            const recommendations = await this.generatePersonalizedRecommendations(
                String(session.user),
                categoryResults,
                session.basedOnAnalytics
            );

            // Step 5: Calculate progress comparison
            const progressComparison = await this.calculateProgressComparison(
                String(session.user),
                categoryResults
            );

            // Step 6: Create complete result object
            const resultData = await this.createAdaptiveQuizResultData(
                session,
                enrichedAnswers,
                categoryResults,
                recommendations,
                progressComparison
            );

            // Step 7: Save to database
            const result = await this.payload.create({
                collection: 'adaptiveQuizResults',
                data: resultData
            }) as AdaptiveQuizResult;

            // Step 8: Update session status
            await this.payload.update({
                collection: 'adaptiveQuizSessions',
                id: session.id,
                data: { status: 'completed' }
            });

            // Step 9: Update user performance data and invalidate cache
            await this.updateUserPerformanceData(String(session.user), enrichedAnswers);
            await this.performanceAnalytics.invalidateUserCache(String(session.user));

            return result;

        } catch (error) {
            console.error('Error saving adaptive quiz results:', error);
            throw error;
        }
    }

    /**
     * Retrieves an adaptive quiz session by ID
     * Requirements: 4.1, 4.2
     */
    private async getAdaptiveQuizSession(sessionId: string): Promise<AdaptiveQuizSession> {
        try {
            const sessions = await this.payload.find({
                collection: 'adaptiveQuizSessions',
                where: { sessionId: { equals: sessionId } },
                depth: 2,
                limit: 1
            });

            if (sessions.totalDocs === 0) {
                throw new Error('session_not_found');
            }

            const session = sessions.docs[0] as AdaptiveQuizSession;

            // Check if session is expired
            if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
                throw new Error('session_expired');
            }

            // Check if session is already completed
            if (session.status === 'completed') {
                throw new Error('session_already_completed');
            }

            return session;

        } catch (error) {
            console.error('Error retrieving adaptive quiz session:', error);
            throw error;
        }
    }

    /**
     * Enriches quiz answers with question metadata
     * Requirements: 4.1, 4.2
     */
    async enrichQuizAnswers(
        session: AdaptiveQuizSession,
        answers: Record<string, string | string[]>
    ): Promise<Array<{
        questionId: string;
        question: Question;
        userAnswer: string | string[];
        isCorrect: boolean;
        timeSpent?: number;
        category: Category;
        difficulty: string;
    }>> {
        const enrichedAnswers = [];

        try {
            // Get all questions from the session
            const questionIds = Array.isArray(session.questions)
                ? session.questions.map(q => typeof q === 'string' ? q : (q as Question).id)
                : [];

            for (const questionId of questionIds) {
                const userAnswer = answers[questionId];
                if (userAnswer === undefined) continue;

                // Fetch question with full details
                const question = await this.payload.findByID({
                    collection: 'questions',
                    id: questionId,
                    depth: 2
                }) as Question;

                if (!question) continue;

                // Determine if answer is correct
                const isCorrect = this.isAnswerCorrect(question, userAnswer);

                // Get category information
                const category = question.category as Category;

                enrichedAnswers.push({
                    questionId: String(questionId),
                    question,
                    userAnswer,
                    isCorrect,
                    category,
                    difficulty: question.difficulty || 'medium'
                });
            }

            return enrichedAnswers;

        } catch (error) {
            console.error('Error enriching quiz answers:', error);
            throw new Error('answer_enrichment_failed');
        }
    }

    /**
     * Calculates results by category
     * Requirements: 4.1, 4.2
     */
    async calculateCategoryResults(
        session: AdaptiveQuizSession,
        enrichedAnswers: Array<{
            questionId: string;
            question: Question;
            userAnswer: string | string[];
            isCorrect: boolean;
            category: Category;
            difficulty: string;
        }>
    ): Promise<Array<{
        category: string;
        questionsCount: number;
        correctAnswers: number;
        incorrectAnswers: number;
        successRate: number;
        scoreImprovement?: number;
        previousSuccessRate?: number;
        averageTimePerQuestion?: number;
    }>> {
        const categoryStats = new Map<string, {
            categoryId: string;
            questionsCount: number;
            correctAnswers: number;
            incorrectAnswers: number;
            totalTime: number;
        }>();

        // Group answers by category
        for (const answer of enrichedAnswers) {
            const categoryId = answer.category.id.toString();

            if (!categoryStats.has(categoryId)) {
                categoryStats.set(categoryId, {
                    categoryId,
                    questionsCount: 0,
                    correctAnswers: 0,
                    incorrectAnswers: 0,
                    totalTime: 0
                });
            }

            const stats = categoryStats.get(categoryId)!;
            stats.questionsCount++;

            if (answer.isCorrect) {
                stats.correctAnswers++;
            } else {
                stats.incorrectAnswers++;
            }
        }

        // Convert to result format and get previous performance
        const results = [];

        for (const [categoryId, stats] of categoryStats) {
            const successRate = stats.questionsCount > 0
                ? stats.correctAnswers / stats.questionsCount
                : 0;

            // Get previous performance for comparison
            const previousPerformance = await this.performanceAnalytics.getCategoryPerformance(
                String(session.user),
                categoryId
            );

            const previousSuccessRate = previousPerformance?.successRate;
            const scoreImprovement = previousSuccessRate !== undefined
                ? successRate - previousSuccessRate
                : undefined;

            results.push({
                category: categoryId,
                questionsCount: stats.questionsCount,
                correctAnswers: stats.correctAnswers,
                incorrectAnswers: stats.incorrectAnswers,
                successRate,
                scoreImprovement,
                previousSuccessRate,
                averageTimePerQuestion: stats.totalTime > 0
                    ? stats.totalTime / stats.questionsCount
                    : undefined
            });
        }

        return results;
    }

    /**
     * Generates personalized recommendations based on performance
     * Requirements: 4.2, 4.3, 4.4
     */
    async generatePersonalizedRecommendations(
        userId: string,
        categoryResults: Array<{
            category: string;
            questionsCount: number;
            correctAnswers: number;
            incorrectAnswers: number;
            successRate: number;
            scoreImprovement?: number;
            previousSuccessRate?: number;
        }>,
        basedOnAnalytics: any
    ): Promise<Array<{
        recommendationId: string;
        type: 'study_more' | 'practice_quiz' | 'review_material' | 'focus_category' | 'maintain_strength';
        category: string;
        message: string;
        priority: 'high' | 'medium' | 'low';
        actionUrl?: string;
        estimatedTimeMinutes?: number;
    }>> {
        const recommendations = [];

        try {
            // Analyze each category result
            for (const result of categoryResults) {
                const categoryId = result.category;

                // Get category details
                const category = await this.payload.findByID({
                    collection: 'categories',
                    id: categoryId
                }) as Category;

                if (!category) continue;

                // Generate recommendations based on performance
                if (result.successRate < 0.5) {
                    // Poor performance - high priority recommendations
                    recommendations.push({
                        recommendationId: `study_${categoryId}_${Date.now()}`,
                        type: 'study_more' as const,
                        category: categoryId,
                        message: `Votre performance en ${category.title} nécessite plus d'étude. Concentrez-vous sur les concepts de base.`,
                        priority: 'high' as const,
                        estimatedTimeMinutes: 60
                    });

                    recommendations.push({
                        recommendationId: `practice_${categoryId}_${Date.now()}`,
                        type: 'practice_quiz' as const,
                        category: categoryId,
                        message: `Pratiquez plus de quiz en ${category.title} pour améliorer vos résultats.`,
                        priority: 'high' as const,
                        estimatedTimeMinutes: 30
                    });

                } else if (result.successRate < 0.7) {
                    // Moderate performance - medium priority
                    recommendations.push({
                        recommendationId: `review_${categoryId}_${Date.now()}`,
                        type: 'review_material' as const,
                        category: categoryId,
                        message: `Révisez le matériel de cours pour ${category.title} pour consolider vos connaissances.`,
                        priority: 'medium' as const,
                        estimatedTimeMinutes: 45
                    });

                } else if (result.successRate >= 0.8) {
                    // Good performance - maintain strength
                    recommendations.push({
                        recommendationId: `maintain_${categoryId}_${Date.now()}`,
                        type: 'maintain_strength' as const,
                        category: categoryId,
                        message: `Excellente performance en ${category.title}! Continuez à maintenir ce niveau.`,
                        priority: 'low' as const,
                        estimatedTimeMinutes: 15
                    });
                }

                // Check for improvement trends
                if (result.scoreImprovement !== undefined) {
                    if (result.scoreImprovement < -0.1) {
                        // Declining performance
                        recommendations.push({
                            recommendationId: `focus_${categoryId}_${Date.now()}`,
                            type: 'focus_category' as const,
                            category: categoryId,
                            message: `Votre performance en ${category.title} a baissé. Concentrez-vous sur cette matière.`,
                            priority: 'high' as const,
                            estimatedTimeMinutes: 90
                        });
                    }
                }
            }

            // Sort by priority (high first)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

            // Limit to top 5 recommendations
            return recommendations.slice(0, 5);

        } catch (error) {
            console.error('Error generating recommendations:', error);
            return [];
        }
    }

    /**
     * Calculates progress comparison with previous performances
     * Requirements: 4.3, 4.4
     */
    async calculateProgressComparison(
        userId: string,
        categoryResults: Array<{
            category: string;
            successRate: number;
        }>
    ): Promise<{
        previousAverageScore?: number;
        currentScore: number;
        improvement?: number;
        trend: 'improving' | 'stable' | 'declining';
        streakDays?: number;
        lastQuizDate?: string;
    }> {
        try {
            // Calculate current average score
            const currentScore = categoryResults.length > 0
                ? categoryResults.reduce((sum, result) => sum + result.successRate, 0) / categoryResults.length
                : 0;

            // Get recent quiz history for comparison
            const recentResults = await this.payload.find({
                collection: 'adaptiveQuizResults',
                where: { user: { equals: userId } },
                sort: '-completedAt',
                limit: 5,
                depth: 1
            });

            let previousAverageScore: number | undefined;
            let improvement: number | undefined;
            let trend: 'improving' | 'stable' | 'declining' = 'stable';
            let lastQuizDate: string | undefined;

            if (recentResults.totalDocs > 0) {
                // Calculate previous average from recent results
                const previousScores = recentResults.docs
                    .map(result => (result as AdaptiveQuizResult).successRate)
                    .filter(score => score !== undefined);

                if (previousScores.length > 0) {
                    previousAverageScore = previousScores.reduce((sum, score) => sum + score, 0) / previousScores.length;
                    improvement = currentScore - previousAverageScore;

                    // Determine trend
                    if (improvement > 0.05) {
                        trend = 'improving';
                    } else if (improvement < -0.05) {
                        trend = 'declining';
                    } else {
                        trend = 'stable';
                    }
                }

                // Get last quiz date
                const lastResult = recentResults.docs[0] as AdaptiveQuizResult;
                lastQuizDate = lastResult.completedAt;
            }

            // Calculate streak days (simplified - consecutive days with quizzes)
            const streakDays = await this.calculateStreakDays(userId);

            return {
                previousAverageScore,
                currentScore,
                improvement,
                trend,
                streakDays,
                lastQuizDate
            };

        } catch (error) {
            console.error('Error calculating progress comparison:', error);
            return {
                currentScore: categoryResults.length > 0
                    ? categoryResults.reduce((sum, result) => sum + result.successRate, 0) / categoryResults.length
                    : 0,
                trend: 'stable'
            };
        }
    }

    /**
     * Creates the complete adaptive quiz result data object
     * Requirements: 4.1, 4.2, 4.3, 4.4
     */
    private async createAdaptiveQuizResultData(
        session: AdaptiveQuizSession,
        enrichedAnswers: any[],
        categoryResults: any[],
        recommendations: any[],
        progressComparison: any
    ): Promise<any> {
        // Calculate overall metrics
        const totalQuestions = enrichedAnswers.length;
        const correctAnswers = enrichedAnswers.filter(a => a.isCorrect).length;
        const overallScore = correctAnswers;
        const maxScore = totalQuestions;
        const successRate = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

        // Calculate total time spent (if available)
        const timeSpent = enrichedAnswers.reduce((total, answer) => {
            return total + (answer.timeSpent || 0);
        }, 0);

        // Identify improvement and strength areas
        const improvementAreas = categoryResults
            .filter(result => result.successRate < 0.6)
            .map(result => ({ categoryName: result.category }));

        const strengthAreas = categoryResults
            .filter(result => result.successRate >= 0.8)
            .map(result => ({ categoryName: result.category }));

        // Calculate next available quiz time (cooldown)
        const nextAvailableAt = new Date(Date.now() + this.COOLDOWN_MINUTES * 60 * 1000);

        return {
            session: session.id,
            user: session.user,
            overallScore,
            maxScore,
            successRate,
            timeSpent,
            completedAt: new Date().toISOString(),
            categoryResults,
            recommendations,
            progressComparison,
            nextAdaptiveQuizAvailableAt: nextAvailableAt.toISOString(),
            improvementAreas,
            strengthAreas
        };
    }

    /**
     * Updates user performance data after quiz completion
     * Requirements: 4.4
     */
    private async updateUserPerformanceData(
        userId: string,
        enrichedAnswers: any[]
    ): Promise<void> {
        try {
            // Update question usage statistics
            for (const answer of enrichedAnswers) {
                const question = answer.question;
                const currentTimesUsed = question.adaptiveMetadata?.timesUsed || 0;
                const currentSuccessRate = question.adaptiveMetadata?.successRate || 0;

                // Calculate new success rate
                const newSuccessRate = currentTimesUsed > 0
                    ? ((currentSuccessRate * currentTimesUsed) + (answer.isCorrect ? 1 : 0)) / (currentTimesUsed + 1)
                    : answer.isCorrect ? 1 : 0;

                // Update question metadata
                await this.payload.update({
                    collection: 'questions',
                    id: question.id,
                    data: {
                        adaptiveMetadata: {
                            ...question.adaptiveMetadata,
                            timesUsed: currentTimesUsed + 1,
                            successRate: newSuccessRate
                        }
                    }
                });
            }

        } catch (error) {
            console.error('Error updating user performance data:', error);
            // Don't throw error here as it's not critical for the main flow
        }
    }

    /**
     * Calculates consecutive days with quiz activity
     * Requirements: 4.3, 4.4
     */
    private async calculateStreakDays(userId: string): Promise<number> {
        try {
            const results = await this.payload.find({
                collection: 'adaptiveQuizResults',
                where: { user: { equals: userId } },
                sort: '-completedAt',
                limit: 30 // Check last 30 days
            });

            if (results.totalDocs === 0) return 0;

            let streakDays = 0;
            let currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);

            for (const result of results.docs) {
                const resultDate = new Date((result as AdaptiveQuizResult).completedAt);
                resultDate.setHours(0, 0, 0, 0);

                const daysDiff = Math.floor((currentDate.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysDiff === streakDays) {
                    streakDays++;
                    currentDate.setDate(currentDate.getDate() - 1);
                } else if (daysDiff > streakDays) {
                    break;
                }
            }

            return streakDays;

        } catch (error) {
            console.error('Error calculating streak days:', error);
            return 0;
        }
    }

    /**
     * Determines if a user's answer is correct
     * Requirements: 4.1, 4.2
     */
    private isAnswerCorrect(question: Question, userAnswer: string | string[]): boolean {
        try {
            // Handle different question types
            if ((question as any).type === 'multiple-choice') {
                // For multiple choice, compare with correct answer
                const correctAnswer = (question as any).correctAnswer;
                if (Array.isArray(userAnswer)) {
                    return Array.isArray(correctAnswer)
                        ? this.arraysEqual(userAnswer.sort(), correctAnswer.sort())
                        : userAnswer.length === 1 && userAnswer[0] === correctAnswer;
                } else {
                    return Array.isArray(correctAnswer)
                        ? correctAnswer.includes(userAnswer)
                        : userAnswer === correctAnswer;
                }
            }

            // For other question types, implement specific logic
            // This is a simplified implementation
            return String(userAnswer).toLowerCase().trim() === String((question as any).correctAnswer).toLowerCase().trim();

        } catch (error) {
            console.error('Error checking answer correctness:', error);
            return false;
        }
    }

    /**
     * Helper method to compare arrays
     */
    private arraysEqual(a: string[], b: string[]): boolean {
        return a.length === b.length && a.every((val, index) => val === b[index]);
    }
}

// Export types for use in other modules
export type { AdaptiveQuizGenerationResult, PrerequisiteValidationResult };