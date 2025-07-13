import { Endpoint } from 'payload/config';
import { PayloadRequest } from 'payload/types';
import { Response } from 'express';
import { Category, Question, QuizSubmission } from '../payload-types';

// Interface pour la structure des résultats de performance
interface PerformanceResult {
  category: {
    id: string;
    title: string;
  };
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

// Structure interne pour l'agrégation des statistiques par catégorie
interface CategoryStats {
  [categoryId: string]: {
    title: string;
    correct: number;
    total: number;
  };
}

export const performanceAnalysisEndpoint: Endpoint = {
  path: '/performance-analysis',
  method: 'get',
  handler: async (req: PayloadRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      const submissions = await req.payload.find({
        collection: 'quiz-submissions',
        where: {
          student: { equals: req.user.id },
        },
        depth: 2, // Populate questions and their related categories
      });

      if (!submissions.docs || submissions.docs.length === 0) {
        return res.status(200).json([]);
      }

      const categoryStats: CategoryStats = {};

      submissions.docs.forEach((submission: QuizSubmission) => {
        submission.answers?.forEach(answer => {
          const question = answer.question as Question;
          const category = question?.category as Category;

          if (category?.id && category?.title) {
            if (!categoryStats[category.id]) {
              categoryStats[category.id] = { title: category.title, correct: 0, total: 0 };
            }
            const stats = categoryStats[category.id];
            if(stats){
              stats.total++;
              if (answer.isCorrect) {
                stats.correct++;
              }
            }
          }
        });
      });

      const results: PerformanceResult[] = Object.keys(categoryStats).map(categoryId => {
        const stats = categoryStats[categoryId];
        if (!stats) return null;

        return {
          category: {
            id: categoryId,
            title: stats.title,
          },
          score: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
          correctAnswers: stats.correct,
          totalQuestions: stats.total,
        };
      }).filter((result): result is PerformanceResult => result !== null);

      return res.status(200).json(results);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      req.payload.logger.error(`Error in performance-analysis endpoint: ${errorMessage}`);
      return res.status(500).json({ error: 'An error occurred while analyzing performance.' });
    }
  },
};
