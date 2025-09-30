import type { CollectionConfig, PayloadRequest } from 'payload';
import { User } from '../payload-types';

// Définition des types pour les validateurs
type FieldValidateFunction = (
  value: unknown,
  options: {
    data: Record<string, unknown>;
    id?: string | number;
    operation?: 'create' | 'update';
    req: Request;
    siblingData: Record<string, unknown>;
    user?: {
      id: string;
      email: string;
      role: 'admin' | 'user' | 'superadmin';
    };
  }
) => Promise<string | true> | string | boolean;

// Extension de l'interface Request d'Express
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      role: 'admin' | 'user' | 'superadmin';
    };
    payload?: any;
  }
}

// Types personnalisés pour une meilleure gestion des données
type Quiz = {
  id: string;
  title: string;
  description?: string;
  questions: string[] | Question[];
  course: string | { id: string; title: string };
  published: boolean;
  duration?: number;
  passingScore?: number;
  updatedAt: string;
  createdAt: string;
};

type Question = {
  id: string;
  questionText: any; // RichText field
  questionType: 'multipleChoice' | 'trueFalse' | 'shortAnswer';
  options: {
    id: string;
    optionText: string;
    isCorrect: boolean;
  }[];
  explanation: string;
  course: string | { id: string; title: string };
  category: string | { id: string; title: string };
  updatedAt: string;
  createdAt: string;
};

// Interface pour la requête de soumission de quiz
interface QuizRequest extends PayloadRequest {
  user: User & { collection: 'users' };
  payload: any;

  params: {
    id: string;
  };
}

export const Quizzes: CollectionConfig = {
  slug: 'quizzes',
  
  // Configuration GraphQL
  graphQL: {
    pluralName: 'Quizzes',
    singularName: 'Quiz',
  },

  // Configuration de l'interface d'administration
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: ({ req }) => {
      // Les administrateurs peuvent tout voir
      if (req.user?.role === 'admin' || req.user?.role === 'superadmin') return true;
      
      // Les utilisateurs authentifiés ne peuvent voir que les quiz publiés
      if (req.user) {
        // Utilisation d'une clause OR pour une meilleure compatibilité
        return {
          or: [
            {
              published: {
                equals: true,
              },
            },
          ],
        };
      }
      
      // Les utilisateurs non authentifiés ne peuvent rien voir
      return false;
    },
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'superadmin',
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'superadmin',
    delete: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'superadmin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true, // Améliore les performances de recherche
    },
    {
      name: 'quizType',
      label: 'Type de Quiz',
      type: 'select',
      defaultValue: 'standard',
      options: [
        {
          label: 'Quiz Standard',
          value: 'standard',
        },
        {
          label: 'Quiz de Positionnement',
          value: 'placement',
        },
      ],
      admin: {
        position: 'sidebar',
        description: "Définit le rôle de ce quiz dans le parcours de l'étudiant.",
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Description détaillée du quiz',
      },
    },
    {
      name: 'questions',
      type: 'relationship',
      relationTo: 'questions',
      hasMany: true,
      required: true,
      minRows: 1,
      admin: {
        description: 'Sélectionnez les questions à inclure dans ce quiz',
      },
      // Validation personnalisée pour s'assurer que les questions sont présentes
      validate: (value: unknown, { data, req, operation, id, siblingData }) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return 'Au moins une question est requise';
        }
        return true;
      },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: false,
      hasMany: false,
      admin: {
        position: 'sidebar',
        description: 'Cours auquel ce quiz est associé (optionnel)',
      },
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Publié',
      defaultValue: false,
      admin: {
        description: 'Définir si le quiz est visible pour les utilisateurs',
      },
    },
    {
      name: 'duration',
      type: 'number',
      label: 'Durée (en minutes)',
      required: false,
      admin: {
        description: 'Durée estimée pour terminer le quiz (en minutes)',
      },
      min: 1,
    },
    {
      name: 'passingScore',
      type: 'number',
      label: 'Score de réussite (%)',
      required: false,
      defaultValue: 70,
      admin: {
        description: 'Score minimum requis pour réussir le quiz (en pourcentage)',
      },
      min: 0,
      max: 100,
    },
  ],
  // Configuration des endpoints personnalisés
  endpoints: [
    {
      path: '/:id/submit',
      method: 'post',
      handler: async (req: PayloadRequest): Promise<Response> => {
        const typedReq = req as QuizRequest;

        if (!typedReq.user) {
          return new Response(JSON.stringify({ message: 'Non autorisé' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Vérification de la méthode et de la présence de req.json
        if (req.method !== 'POST' || typeof req.json !== 'function') {
          return new Response(JSON.stringify({ error: 'Requête invalide.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        try {
          const body = await req.json();

          if (!body || !body.answers || !Array.isArray(body.answers)) {
            return new Response(JSON.stringify({ error: 'Les réponses sont manquantes ou mal formatées.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const quizId = typedReq.params.id;
          const quiz = await typedReq.payload.findByID({
            collection: 'quizzes',
            id: quizId,
            depth: 2,
          }) as Quiz;

          if (!quiz) {
            return new Response(JSON.stringify({ message: 'Quiz non trouvé' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          let score = 0;
          const totalQuestions = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
          const results: Array<{ question: string; userAnswer: string; correctAnswer?: string; isCorrect: boolean; }> = [];

          for (const userAnswer of body.answers) {
            if (!quiz.questions || !Array.isArray(quiz.questions)) continue;

            const question = quiz.questions.find(
              (q) => q && typeof q === 'object' && 'id' in q && String(q.id) === String(userAnswer.question),
            ) as Question | undefined;

            if (!question) continue;

            const correctOption = question.options?.find((opt) => opt.isCorrect);
            const isCorrect = correctOption && userAnswer.answer === String(correctOption.id);

            if (isCorrect) {
              score++;
            }

            results.push({
              question: typeof question === 'string' ? question : question.id,
              userAnswer: userAnswer.answer,
              correctAnswer: correctOption?.id,
              isCorrect: Boolean(isCorrect),
            });
          }

          const scorePercentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

          const submission = await typedReq.payload.create({
            collection: 'quiz-submissions',
            data: {
              quiz: quiz.id,
              student: typedReq.user.id,
              submissionDate: new Date().toISOString(),
              answers: results.map((r) => ({
                question: r.question,
                answer: r.userAnswer,
                isCorrect: r.isCorrect,
              })),
              finalScore: scorePercentage,
            },
          });

          return new Response(
            JSON.stringify({
              message: 'Quiz soumis avec succès',
              score,
              totalQuestions,
              scorePercentage,
              results,
              submissionId: submission.id,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        } catch (error) {
          console.error('Erreur lors de la soumission du quiz :', error);
          return new Response(
            JSON.stringify({
              message: 'Erreur lors de la soumission du quiz',
              error: error instanceof Error ? error.message : 'Erreur inconnue',
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          );
        }
      },
    },
  ],
};