import type { Payload } from 'payload';
import { AIService } from './AIService';
import type { StudySession, User, Course } from '../payload-types';
import type {
  StudySessionStep,
  StudySessionOptions,
} from '../types/studySession';

export class StudySessionService {
  private payload: Payload;
  private aiService: AIService;

  constructor(payload: Payload) {
    this.payload = payload;
    this.aiService = new AIService();
  }

  async createSession(
    userId: string,
    context: {
      courseId?: string;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
    } = {}
  ): Promise<StudySession> {
    try {
      const userRaw = await this.payload.findByID({
        collection: 'users',
        id: userId,
        depth: 0,
      });
      const user = userRaw as User;
      if (!user || (typeof user.id !== 'string' && typeof user.id !== 'number')) {
        throw new Error('Utilisateur introuvable');
      }
      const userName = typeof user.email === 'string' ? user.email : 'Étudiant';

      let course: Course | null = null;
      if (context.courseId) {
        try {
          const courseRaw = await this.payload.findByID({
            collection: 'courses',
            id: context.courseId,
            depth: 0,
          });
          course = courseRaw as Course;
        } catch (error) {
          console.warn(`Course ${context.courseId} not found`, error);
        }
      }

      const title = this.generateSessionTitle({
        userName,
        courseName: course?.title,
        date: new Date(),
      });

      const steps = await this.generateSessionSteps({
        userId,
        courseId: context.courseId,
        difficulty: context.difficulty || 'beginner',
        estimatedDuration: 60,
      });

      const sessionData = {
        title,
        user: user.id,
        status: 'draft' as const,
        estimatedDuration: steps.reduce((acc, step) => acc + (step.metadata?.duration || 15), 0),
        currentStep: 0,
        steps,
        context: {
          course: course?.id,
          difficulty: context.difficulty || 'beginner',
        },
      };

      const sessionRaw = await this.payload.create({ 
        collection: 'study-sessions',
        data: sessionData,
      });

      return sessionRaw as StudySession;
    } catch (error) {
      console.error('Error creating study session:', error);
      throw new Error('Failed to create study session');
    }
  }

  async getTodaysSession(userId: string): Promise<StudySession | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { docs } = await this.payload.find({
      collection: 'study-sessions',
      where: {
        and: [
          { user: { equals: userId } },
          { createdAt: { greater_than_equal: today.toISOString() } },
        ],
      },
      limit: 1,
      sort: '-createdAt',
    });

    return docs[0] ? (docs[0] as unknown as StudySession) : null;
  }

  async nextStep(sessionId: string, currentStepIndex: number): Promise<StudySession> {
    const sessionRaw = await this.payload.findByID({
      collection: 'study-sessions',
      id: sessionId,
    });
    const session = sessionRaw as StudySession;
    if (!session) {
      throw new Error('Session not found');
    }
    // Correction typage strict et robustesse : chaque étape a un stepId
    const sourceSteps = session.steps ?? [];
    const updatedSteps: StudySessionStep[] = [...sourceSteps].map((step, idx) => ({
      ...step,
      description: step.description ?? undefined,
      status: step.status ?? 'pending',
      metadata:
        typeof step.metadata === 'object' && step.metadata !== null && !Array.isArray(step.metadata)
          ? (step.metadata as Record<string, any>)
          : undefined,
      startedAt: step.startedAt ?? undefined,
      completedAt: step.completedAt ?? undefined,
      stepId: typeof step.stepId === 'number' ? step.stepId : idx + 1,
    }));
    if (currentStepIndex < updatedSteps.length) {
      const completedStep = updatedSteps[currentStepIndex];
      if (completedStep) {
        updatedSteps[currentStepIndex] = {
          stepId: completedStep.stepId,
          type: completedStep.type,
          title: completedStep.title,
          description: completedStep.description ?? undefined,
          status: 'completed',
          metadata: completedStep.metadata ?? undefined,
          startedAt: completedStep.startedAt ?? undefined,
          completedAt: new Date().toISOString(),
        };
      }
    }
    if (currentStepIndex < updatedSteps.length - 1) {
      const nextStep = updatedSteps[currentStepIndex + 1];
      if (nextStep) {
        updatedSteps[currentStepIndex + 1] = {
          stepId: nextStep.stepId,
          type: nextStep.type,
          title: nextStep.title,
          description: nextStep.description ?? undefined,
          status: 'in-progress',
          metadata: nextStep.metadata ?? undefined,
          startedAt: new Date().toISOString(),
          completedAt: nextStep.completedAt ?? undefined,
        };
      }
    }
    const updatedSessionRaw = await this.payload.update({ 
      collection: 'study-sessions',
      id: sessionId,
      data: {
        steps: updatedSteps,
        currentStep: Math.min(currentStepIndex + 1, updatedSteps.length - 1),
      },
    });

    return updatedSessionRaw as StudySession;
  }

  private generateSessionTitle(options: StudySessionOptions): string {
    const date = options.date ?? new Date();
    const dateStr = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return options.courseName
      ? `${options.courseName} - Session du ${dateStr}`
      : `Session d'étude de ${options.userName} - ${dateStr}`;
  }

  private async generateSessionSteps(options: {
    userId: string;
    courseId?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number;
  }): Promise<StudySessionStep[]> {
    try {
      const prompt = this.buildAIPrompt(options);

      const aiResponse = await this.aiService.generateResponse([{ role: 'user', content: prompt }]);
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('Erreur lors de la génération des étapes avec l\'IA:', error);
      return this.getDefaultSteps(options);
    }
  }

  private buildAIPrompt(options: {
    userId: string;
    courseId?: string;
    difficulty: string;
    estimatedDuration: number;
  }): string {
    return `Génère un plan d'étude de ${options.estimatedDuration} minutes ` +
      `pour un étudiant de niveau ${options.difficulty}${options.courseId ? ` dans le cours ${options.courseId}` : ''}. ` +
      'Le plan doit inclure des activités variées comme des quiz, des révisions. ' +
      'Retourne la réponse au format JSON avec un tableau d\'étapes.';
  }

  private parseAIResponse(aiResponse: string): StudySessionStep[] {
    try {
      const parsed = JSON.parse(aiResponse);
      if (Array.isArray(parsed)) {
        return parsed.map((step, index) => ({
          stepId: index + 1,
          type: step.type || 'review',
          title: step.title || `Étape ${index + 1}`,
          description: step.description,
          status: 'pending',
          metadata: step.metadata || {},
        }));
      }
    } catch (error) {
      console.warn('Échec du parsing de la réponse IA, utilisation des étapes par défaut', error);
    }

    return this.getDefaultSteps({
      difficulty: 'beginner',
      estimatedDuration: 60,
    });
  }

  private getDefaultSteps(options: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number;
  }): StudySessionStep[] {
    const stepDurations = {
      beginner: 15,
      intermediate: 20,
      advanced: 25,
    };

    const stepDuration = stepDurations[options.difficulty] || 15;
    const stepCount = Math.max(3, Math.floor(options.estimatedDuration / stepDuration));

    const defaultSteps: StudySessionStep[] = [
      {
        stepId: 1,
        type: 'review',
        title: 'Révision des concepts clés',
        description: 'Révisez les concepts principaux du cours',
        status: 'pending',
        metadata: { duration: stepDuration },
      },
      {
        stepId: 2,
        type: 'quiz',
        title: 'Quiz de compréhension',
        description: 'Testez votre compréhension avec ce quiz',
        status: 'pending',
        metadata: { duration: stepDuration },
      },
      {
        stepId: 3,
        type: 'flashcards',
        title: 'Mémorisation avec flashcards',
        description: 'Mémorisez les termes importants',
        status: 'pending',
        metadata: { duration: stepDuration },
      },
    ];

    return defaultSteps.slice(0, stepCount);
  }
}
