import payload from 'payload';

// Types locaux pour le handler, basés sur les conventions du projet
type PayloadRequest = {
  payload: typeof payload;
};

type Response = {
  status: (code: number) => Response;
  json: (data: any) => void;
};

export const getPlacementQuizEndpoint = {
  path: '/placement-quiz',
  method: 'get' as const,
  handler: async (req: PayloadRequest, res: Response) => {
    try {
      const placementQuiz = await payload.find({
        collection: 'quizzes',
        where: {
          quizType: {
            equals: 'placement',
          },
        },
        limit: 1,
        depth: 2, // Pour peupler les questions et leurs options
      });

      if (!placementQuiz.docs || placementQuiz.docs.length === 0) {
        return res.status(404).json({ message: 'Aucun quiz de positionnement trouvé.' });
      }

      return res.status(200).json(placementQuiz.docs[0]);

    } catch (error: any) {
      payload.logger.error(`Error fetching placement quiz: ${error.message}`);
      return res.status(500).json({ message: 'Erreur lors de la récupération du quiz de positionnement.' });
    }
  },
};
