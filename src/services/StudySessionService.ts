import { AIService } from './AIService';
import type { StudySession, User, Course } from '../payload-types';
import type {
  StudySessionStep,
  StudySessionOptions,
} from '../types/studySession';

// Interface pour le payload minimum requis par le service
interface PayloadService {
  find: (args: {
    collection: string;
    where: Record<string, unknown>;
    depth?: number;
    limit?: number;
    sort?: string;
  }) => Promise<{ docs: StudySession[] }>;

  create: (args: {
    collection: string;
    data: Record<string, unknown>;
  }) => Promise<StudySession>;

  update: (args: {
    collection: string;
    id: string | number;
    data: Record<string, unknown>;
  }) => Promise<StudySession>;

  findByID: (args: {
    collection: string;
    id: string | number;
  }) => Promise<StudySession>;
}

// Types personnalisés pour une meilleure maintenabilité
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// Interface pour les options de création de session
interface CreateSessionOptions {
  title?: string;
  courseId?: string;
  difficulty?: DifficultyLevel;
  estimatedDuration?: number;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  context?: {
    isDailySession?: boolean;
    date?: string;
    expiresAt?: string;
    [key: string]: unknown;
  };
}

// Interface pour les options d'erreur de session
export interface StudySessionErrorOptions {
  cause?: unknown;
  [key: string]: unknown;
}


// Classe d'erreur personnalisée pour les erreurs de session
export class StudySessionError extends Error {
  public override readonly name: string;
  code: string;
  details?: Record<string, any>;

  constructor(message: string, code = 'UNKNOWN_ERROR', details?: Record<string, any>) {
    super(message);
    this.name = 'StudySessionError';
    this.code = code;
    this.details = details;

    // Fix pour les erreurs TypeScript avec les classes d'erreur personnalisées
    // https://github.com/microsoft/TypeScript/issues/13965
    Object.setPrototypeOf(this, StudySessionError.prototype);
  }

  override toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

export class StudySessionService {
  private payload: PayloadService;
  private aiService: AIService;

  constructor(payload: PayloadService) {
    this.payload = payload;
    this.aiService = new AIService();
  }

  /**
   * Méthode utilitaire qui encapsule tous les appels à findByID avec une validation stricte des IDs
   * pour éviter les erreurs PostgreSQL liées aux valeurs NaN
   * 
   * @param collection Nom de la collection
   * @param id ID à rechercher (string ou number)
   * @returns L'objet trouvé ou null si l'ID est invalide ou l'objet n'existe pas
   * @private
   */
  private async safeFindByID(collection: string, id: string | number): Promise<any | null> {
    // Validation stricte de l'ID
    if (id === undefined || id === null) {
      console.warn(`[safeFindByID] ID non défini ou null pour la collection ${collection}`);
      return null;
    }

    // Vérification spécifique pour les IDs numériques
    if (typeof id === 'number' && isNaN(id)) {
      console.warn(`[safeFindByID] ID invalide (NaN) pour la collection ${collection}`);
      return null;
    }

    // Conversion sécurisée en string si nécessaire
    const safeId = typeof id === 'number' ? String(id) : id;

    try {
      console.log(`[safeFindByID] Recherche dans ${collection} avec ID=${safeId} (type original: ${typeof id})`);
      return await this.payload.findByID({
        collection,
        id: safeId
      });
    } catch (error) {
      console.error(`[safeFindByID] Erreur lors de la recherche dans ${collection} avec ID=${safeId}:`, error);
      return null;
    }
  }

  /**
   * Crée une nouvelle session d'étude
   * @param userId ID de l'utilisateur
   * @param options Options de création de la session
   * @returns La session d'étude créée
   * @throws {StudySessionError} Si la création échoue
   */
  async createSession(
    userId: string | number,
    options: CreateSessionOptions = {}
  ): Promise<StudySession> {
    if (userId === undefined || userId === null) {
      throw new StudySessionError('User ID is required', 'USER_ID_REQUIRED');
    }

    // Log détaillé pour le débogage
    console.log(`[createSession] Création d'une session pour l'utilisateur:`, {
      userId,
      type: typeof userId
    });

    // Conversion sécurisée de l'ID utilisateur en chaîne
    let userIdString: string;
    if (typeof userId === 'number') {
      if (isNaN(userId)) {
        throw new StudySessionError('Invalid user ID: NaN', 'INVALID_USER_ID');
      }
      userIdString = String(userId);
    } else {
      userIdString = userId;
    }

    try {
      // Création du contexte de la session
      const context: Record<string, unknown> = {
        difficulty: options.difficulty || 'beginner',
      };

      // Ajout du cours si spécifié
      if (options.courseId) {
        context.course = options.courseId;
      }

      // Ajout de la durée estimée
      if (options.estimatedDuration) {
        context.estimatedDuration = options.estimatedDuration;
      }

      const initialData: Partial<StudySession> = {
        user: userIdString as any, // Conversion nécessaire pour le typage de Payload
        context,
      };

      console.log('Creating new study session with data:', {
        userId: userIdString,
        originalUserId: userId,
        ...options
      });

      const populatedData = await this.populateSessionWithAI(initialData);

      const sessionRaw = await this.payload.create({
        collection: 'study-sessions',
        data: populatedData,
      });

      console.log('Study session created successfully:', sessionRaw.id);
      return sessionRaw as StudySession;

    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error occurred';

      console.error('Error creating study session:', {
        userId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      throw new StudySessionError(
        `Failed to create study session: ${errorMessage}`,
        'SESSION_CREATION_FAILED'
      );
    }
  }

  /**
   * Peuple une session avec des données générées par IA
   * @param data Données partielles de la session
   * @returns Les données complètes de la session
   * @throws {StudySessionError} Si le traitement échoue
   */

  async populateSessionWithAI(
    data: Partial<StudySession>,
  ): Promise<Omit<StudySession, 'id' | 'createdAt' | 'updatedAt'>> {
    try {
      // Vérification de l'utilisateur
      if (!data.user) {
        throw new StudySessionError('User is required', 'USER_REQUIRED');
      }

      // Récupération de l'ID de l'utilisateur
      const userId = typeof data.user === 'object' ? data.user.id : data.user;
      if (!userId) {
        throw new StudySessionError('User ID is required', 'USER_ID_REQUIRED');
      }

      // Récupération des informations de l'utilisateur
      let userName = 'Étudiant';
      try {
        // Utilisation de safeFindByID pour éviter les erreurs PostgreSQL liées à NaN
        const userRaw = await this.safeFindByID('users', userId);

        if (userRaw) {
          // Conversion explicite avec as unknown pour éviter les erreurs de typage
          const user = userRaw as unknown as User;
          userName = user.email || userName;
        } else {
          console.warn(`User ${userId} not found or invalid ID, using default name`);
        }
      } catch (error) {
        console.warn(`Error retrieving user ${userId}, using default name`, error);
      }

      // Traitement du cours
      let course: Course | null = null;
      const courseId = data.context?.course
        ? (typeof data.context.course === 'object'
          ? data.context.course.id
          : data.context.course)
        : null;

      if (courseId) {
        try {
          // Utilisation de safeFindByID pour éviter les erreurs PostgreSQL liées à NaN
          const courseRaw = await this.safeFindByID('courses', courseId);

          if (courseRaw) {
            // Conversion explicite avec as unknown pour éviter les erreurs de typage
            course = courseRaw as unknown as Course;
          } else {
            console.warn(`Course ${courseId} not found or invalid ID`);
          }
        } catch (error) {
          console.warn(`Error retrieving course ${courseId}`, error);
        }
      }

      // Génération du titre
      const title = this.generateSessionTitle({
        userName,
        courseName: course?.title,
        date: new Date(),
      });

      // Configuration de la difficulté et de la durée estimée
      const difficulty = (data.context?.difficulty as DifficultyLevel) || 'beginner';
      const estimatedDuration = data.context && 'estimatedDuration' in data.context && typeof data.context.estimatedDuration === 'number'
        ? data.context.estimatedDuration
        : 60;

      // Génération des étapes de la session
      const steps = await this.generateSessionSteps({
        userId,
        courseId: courseId,
        difficulty,
        estimatedDuration,
      });

      // Calcul de la durée totale basée sur les étapes
      const totalDuration = steps.reduce((acc, step) => acc + (step.metadata?.duration || 15), 0);

      // Construction du contexte de la session avec des types stricts
      const sessionContext: {
        course: number | null;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
      } = {
        course: null,
        difficulty: 'beginner'
      };

      // Mise à jour du contexte avec les données fournies
      if (data.context) {
        // Gestion du champ 'course'
        if ('course' in data.context && data.context.course !== undefined) {
          const courseValue = data.context.course;

          if (courseValue === null) {
            sessionContext.course = null;
          } else if (typeof courseValue === 'object' && courseValue !== null && 'id' in courseValue) {
            // Si c'est un objet avec une propriété id
            const numValue = Number((courseValue as { id: unknown }).id);
            sessionContext.course = !isNaN(numValue) ? numValue : null;
          } else if (typeof courseValue === 'string') {
            // Si c'est une chaîne, on la convertit en nombre
            const numValue = parseInt(courseValue, 10);
            sessionContext.course = !isNaN(numValue) ? numValue : null;
          } else if (typeof courseValue === 'number') {
            // Si c'est déjà un nombre, vérifier qu'il n'est pas NaN
            sessionContext.course = !isNaN(courseValue) ? courseValue : null;
          }
        }

        // Gestion du champ 'difficulty'
        if ('difficulty' in data.context && data.context.difficulty) {
          const difficultyValue = data.context.difficulty;
          if (['beginner', 'intermediate', 'advanced'].includes(difficultyValue)) {
            sessionContext.difficulty = difficultyValue as 'beginner' | 'intermediate' | 'advanced';
          }
        }
      }

      // Définition de la difficulté si elle n'a pas été définie
      if (!sessionContext.difficulty) {
        sessionContext.difficulty = difficulty;
      }

      // La durée estimée est stockée au niveau racine de la session
      // pour une meilleure accessibilité et cohérence avec le modèle de données

      // Construction du contexte final avec des types stricts
      const finalContext: {
        course: number | null;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
      } = {
        course: sessionContext.course !== undefined && sessionContext.course !== null && typeof sessionContext.course === 'number' && !isNaN(sessionContext.course)
          ? sessionContext.course
          : null,
        difficulty: sessionContext.difficulty &&
          ['beginner', 'intermediate', 'advanced'].includes(sessionContext.difficulty)
          ? sessionContext.difficulty
          : 'beginner'
      };

      // Construction du résultat final avec des types stricts
      const result: Omit<StudySession, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        title,
        status: 'draft',
        estimatedDuration: totalDuration,
        currentStep: 0,
        steps,
        context: finalContext,
        user: userId as any, // Conversion nécessaire pour le typage de Payload
      };

      return result;
    } catch (error) {
      const errorMessage = error instanceof StudySessionError
        ? error.message
        : `Failed to populate session: ${error instanceof Error ? error.message : 'Unknown error'}`;

      console.error('Error in populateSessionWithAI:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        data: JSON.stringify(data, null, 2)
      });

      throw new StudySessionError(
        errorMessage,
        error instanceof StudySessionError ? error.code : 'SESSION_POPULATION_FAILED'
      );
    }
  }
  /**
   * Récupère la session du jour si elle existe et est toujours valide
   * @param userId ID de l'utilisateur
   * @returns La session du jour ou null si aucune session valide n'existe
   * @private
   */
  private async getTodaysSession(userId: string | number): Promise<StudySession | null> {
    try {
      console.log(`[getTodaysSession] Recherche de session pour userId=${userId} (type: ${typeof userId})`);

      // Validation stricte de l'ID utilisateur
      if (userId === undefined || userId === null || (typeof userId === 'number' && isNaN(userId))) {
        console.error('[getTodaysSession] userId invalide:', userId);
        return null;
      }

      // Conversion sécurisée en string
      const userIdForQuery = typeof userId === 'number' ? String(userId) : userId;

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      const twentyFourHoursAgoISO = twentyFourHoursAgo.toISOString();

      // Vérification supplémentaire pour s'assurer que userIdForQuery est valide
      if (!userIdForQuery) {
        console.error('[getTodaysSession] userIdForQuery est vide ou invalide');
        return null;
      }

      // Recherche des sessions actives créées dans les dernières 24 heures
      const response = await this.payload.find({
        collection: 'study-sessions',
        where: {
          user: {
            equals: userIdForQuery
          },
          status: {
            equals: 'active'
          },
          createdAt: {
            greater_than_equal: twentyFourHoursAgoISO
          }
        },
        sort: '-createdAt', // Tri par date de création décroissante pour avoir la plus récente en premier
        limit: 1 // Limiter à 1 résultat
      });

      const { docs } = response;
      const session = docs[0] as StudySession | undefined;

      if (session) {
        console.log(`[getTodaysSession] Session trouvée: ${session.id}`);
        return session;
      }

      console.log('[getTodaysSession] Aucune session active trouvée dans les dernières 24 heures');
      return null;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[getTodaysSession] Erreur lors de la recherche de session:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        timestamp: new Date().toISOString()
      });

      // Ne pas propager l'erreur, retourner null pour permettre la création d'une nouvelle session
      return null;
    }
  }

  async nextStep(sessionId: string, currentStepIndex: number): Promise<StudySession> {
    const sessionRaw = await this.safeFindByID('study-sessions', sessionId);
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

  /**
   * Génère un titre pour la session d'étude
   * @param options Options pour la génération du titre
   * @returns Le titre généré
   */
  private generateSessionTitle(options: StudySessionOptions): string {
    try {
      const date = options.date ?? new Date();
      const dateStr = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      if (options.courseName) {
        return `${options.courseName} - Session du ${dateStr}`;
      }

      return `Session d'étude - ${dateStr}`;

    } catch (error) {
      console.error('Error generating session title, using fallback:', error);
      return `Session d'étude - ${new Date().toLocaleDateString('fr-FR')}`;
    }
  }

  /**
   * Récupère les quiz associés à un cours et les transforme en étapes de session
   * @param courseId ID du cours
   * @returns Les étapes de session générées à partir des quiz
   * @private
   */

  private async getCourseQuizzes(courseId: string | number): Promise<StudySessionStep[]> {
    // Initialisation des variables
    let safeCourseId: number | null = null;
    const steps: StudySessionStep[] = [];

    // Validation et conversion de l'ID du cours
    if (typeof courseId === 'string') {
      const parsedId = parseInt(courseId, 10);
      if (!isNaN(parsedId)) {
        safeCourseId = parsedId;
      }
    } else if (typeof courseId === 'number' && !isNaN(courseId)) {
      safeCourseId = courseId;
    }

    // Vérification de la validité de l'ID
    if (safeCourseId === null) {
      console.error('[getCourseQuizzes] ID de cours invalide fourni:', courseId);
      return [];
    }

    try {
      // Récupération des quiz associés au cours
      const quizResponse = await this.payload.find({
        collection: 'quizzes',
        where: { course: { equals: safeCourseId } },
        depth: 2, // Demander à Payload de peupler les questions et leurs options
      });

      console.log(`Nombre de quiz trouvés: ${quizResponse.docs.length}`);
      if (quizResponse.docs.length === 0) {
        console.log(`⚠️ ATTENTION: Aucun quiz trouvé pour le cours ID: ${safeCourseId}. Vérifiez que des quiz sont bien associés à ce cours et qu'ils sont publiés.`);
        return [];
      }

      // Log détaillé des quiz trouvés pour le débogage
      quizResponse.docs.forEach((quiz: any, index: number) => {
        console.log(`Quiz #${index + 1}: ID=${quiz.id}, Titre="${quiz.title}", Publié=${quiz.published}`);
        console.log(`  - Questions: ${quiz.questions ? Array.isArray(quiz.questions) ? quiz.questions.length : 'Non tableau' : 'Aucune'}`);

        if (quiz.questions && Array.isArray(quiz.questions)) {
          quiz.questions.forEach((q: any, qIndex: number) => {
            console.log(`    Question #${qIndex + 1}: ID=${q.id}, Type=${q.questionType || 'Non spécifié'}`);
            if (q.options) {
              console.log(`      Options: ${Array.isArray(q.options) ? q.options.length : 'Non tableau'}`);
            } else {
              console.log(`      ⚠️ Pas d'options trouvées pour cette question`);
            }
          });
        }
      });

      // Filtrer les quiz qui ont des questions de type 'multipleChoice'
      const validQuizzes = quizResponse.docs.filter((quiz: any) => {
        if (!quiz.questions || !Array.isArray(quiz.questions)) return false;

        // Vérifier que le quiz a au moins une question de type 'multipleChoice'
        return quiz.questions.some((question: any) => {
          return typeof question === 'object' &&
            question !== null &&
            'questionType' in question &&
            question.questionType === 'multipleChoice';
        });
      });

      console.log(`Nombre de quiz valides (avec questions multipleChoice): ${validQuizzes.length}`);
      if (validQuizzes.length === 0) {
        console.log(`⚠️ Aucun quiz avec des questions de type 'multipleChoice' trouvé pour le cours ID: ${safeCourseId}`);
        return [];
      }

      console.log(`Nombre de quiz valides trouvés: ${validQuizzes.length}`);

      let stepCounter = 0;

      // Traitement des questions et création des étapes
      for (const quiz of validQuizzes) {
        // Cast temporaire pour éviter les erreurs de type
        const quizWithQuestions = quiz as any;

        if (!quizWithQuestions.questions || !Array.isArray(quizWithQuestions.questions)) {
          continue;
        }

        // Traitement de chaque question du quiz
        for (const partialQuestion of quizWithQuestions.questions) {
          // Vérification de la validité de la question
          if (!partialQuestion || typeof partialQuestion !== 'object' || !partialQuestion.id) {
            continue;
          }

          // Ignorer les questions qui ne sont pas de type multipleChoice
          if (!('questionType' in partialQuestion) || partialQuestion.questionType !== 'multipleChoice') {
            continue;
          }

          try {
            // Récupérer la question complète avec ses options
            const questionRaw = await this.safeFindByID('questions', partialQuestion.id);

            if (!questionRaw) {
              console.log(`⚠️ Impossible de charger la question ID=${partialQuestion.id}`);
              continue;
            }

            // Normaliser les options si elles existent
            if (questionRaw.options && Array.isArray(questionRaw.options)) {
              const normalizedOptions = questionRaw.options.map((option: any) => ({
                id: option.id || `option-${Math.random().toString(36).substring(2, 9)}`,
                text: option.text || 'Option sans texte',
                isCorrect: Boolean(option.isCorrect),
              }));
              questionRaw.options = normalizedOptions;
            } else {
              console.log(`⚠️ ATTENTION: La question ID=${questionRaw.id} n'a pas d'options valides.`);
              continue;
            }

            // Créer un objet question avec les données nécessaires
            const question = {
              questionText: (questionRaw as any).questionText || 'Question de quiz',
              options: [] as Array<{ id: string; text: string; isCorrect: boolean }>
            };

            // Ajouter les options à la question
            if (questionRaw.options && Array.isArray(questionRaw.options)) {
              question.options = questionRaw.options.map((option: any) => ({
                id: option.id,
                text: option.text,
                isCorrect: option.isCorrect,
              }));
            }

            steps.push({
              stepId: ++stepCounter,
              type: 'quiz',
              title: typeof questionRaw.questionText === 'string' ? questionRaw.questionText : 'Question de quiz',
              description: quiz.title || 'Répondez à la question.',
              status: 'pending' as const,
              metadata: {
                question: questionRaw,
                quizId: quiz.id,
                courseId: safeCourseId,
              },
            });
            console.log(`✅ Étape de quiz créée avec succès pour la question ID=${questionRaw.id}`);
          } catch (error) {
            console.log(`⚠️ Erreur lors du traitement de la question ID=${partialQuestion.id}:`, error);
          }
        }
      }

      console.log(`Total des étapes de quiz créées: ${steps.length}`);
      return steps;

    } catch (error) {
      console.error('Erreur lors de la récupération des quiz du cours:', error);
      return [];
    }
  }

  /**
   * Génère les étapes d'une session d'étude en fonction des paramètres fournis
   * @param options Options pour la génération des étapes
   * @returns Liste des étapes générées
   * @private
   */
  private async generateSessionSteps(options: {
    userId: string | number;
    courseId?: string | number | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number;
  }): Promise<StudySessionStep[]> {
    // Vérification des types des paramètres d'entrée
    let safeCourseId = null;
    if (options.courseId) {
      if (typeof options.courseId === 'string') {
        const parsedId = parseInt(options.courseId, 10);
        // Vérifier que le résultat est un nombre valide (pas NaN)
        safeCourseId = !isNaN(parsedId) ? parsedId : null;
      } else if (typeof options.courseId === 'number' && !isNaN(options.courseId)) {
        safeCourseId = options.courseId;
      }
      // Log pour le débogage
      console.log(`[generateSessionSteps] courseId converti: ${options.courseId} (${typeof options.courseId}) -> ${safeCourseId}`);
    }
    try {
      // Si on a un courseId valide, on récupère les quiz du cours
      if (safeCourseId) {
        const courseQuizzes = await this.getCourseQuizzes(String(safeCourseId));
        if (courseQuizzes.length > 0) {
          return courseQuizzes;
        }
      }

      // Si pas de quiz trouvés, on utilise les étapes par défaut
      return this.getDefaultSteps({
        difficulty: options.difficulty,
        estimatedDuration: options.estimatedDuration
      });

    } catch (error) {
      console.error('Erreur lors de la génération des étapes de session:', error);
      return this.getDefaultSteps({
        difficulty: options.difficulty,
        estimatedDuration: options.estimatedDuration
      });
    }
  }

  /**
   * Génère des étapes par défaut pour une session d'étude
   * @param options Options pour la génération des étapes par défaut
   * @returns Liste des étapes par défaut
   * @private
   */
  private getDefaultSteps(options: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number;
  }): StudySessionStep[] {
    // Validation des paramètres d'entrée
    const safeDifficulty = ['beginner', 'intermediate', 'advanced'].includes(options.difficulty)
      ? options.difficulty
      : 'beginner';

    const safeDuration = typeof options.estimatedDuration === 'number' && options.estimatedDuration > 0
      ? options.estimatedDuration
      : 60; // Durée par défaut de 60 minutes
    const stepDurations = {
      beginner: 15,
      intermediate: 20,
      advanced: 25,
    };

    const stepDuration = stepDurations[safeDifficulty] || 15;
    const stepCount = Math.max(3, Math.floor(safeDuration / stepDuration));

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



  /**
   * Récupère ou crée une session quotidienne pour un utilisateur.
   * Vérifie d'abord si une session valide existe dans les dernières 24 heures.
   * Si aucune session valide n'est trouvée, en crée une nouvelle.
   * 
   * @param userId - ID de l'utilisateur (string ou number)
   * @param options - Options supplémentaires (date cible, etc.)
   * @returns Un objet contenant la session et un indicateur si c'est une nouvelle session
   * @throws {StudySessionError} Si la création ou la récupération de la session échoue
   * 
   * @example
   * const { session, isNew } = await studySessionService.getOrCreateDailySession('user123');
   * if (isNew) {
   *   console.log('Nouvelle session créée:', session.id);
   * } else {
   *   console.log('Session existante récupérée:', session.id);
   * }
   */
  async getOrCreateDailySession(
    userId: string | number,
    options: { targetDate?: Date } = {}
  ): Promise<{ session: StudySession; isNew: boolean }> {
    // Vérification préliminaire pour éviter les NaN
    if (userId === undefined || userId === null) {
      throw new StudySessionError(
        'ID utilisateur requis pour créer ou récupérer une session quotidienne',
        'INVALID_PARAMETER'
      );
    }

    // Si userId est un nombre, vérifier qu'il n'est pas NaN
    if (typeof userId === 'number' && isNaN(userId)) {
      throw new StudySessionError(
        'ID utilisateur invalide: NaN',
        'INVALID_USER_ID'
      );
    }

    // Conversion sécurisée de l'ID utilisateur
    let userIdSafe: string;

    if (typeof userId === 'number') {
      userIdSafe = String(userId); // Conversion en chaîne pour éviter les problèmes de type
    } else {
      userIdSafe = userId;
    }

    console.log(`[getOrCreateDailySession] Début pour l'utilisateur:`, {
      originalUserId: userId,
      originalType: typeof userId,
      userIdSafe,
      targetDate: options.targetDate ? options.targetDate.toISOString() : 'non spécifiée'
    });

    try {
      // 1. Vérifier si une session valide existe déjà pour aujourd'hui
      const existingSession = await this.getTodaysSession(userIdSafe);

      if (existingSession) {
        console.log(`[getOrCreateDailySession] Session existante trouvée: ${existingSession.id}`);
        return {
          session: existingSession,
          isNew: false
        };
      }

      // 2. Si aucune session valide n'existe, en créer une nouvelle
      console.log('[getOrCreateDailySession] Création d\'une nouvelle session...');
      const newSession = await this.createDailySession(userIdSafe, options);

      if (!newSession) {
        throw new StudySessionError('La création de la session a échoué', 'SESSION_CREATION_FAILED');
      }

      console.log(`[getOrCreateDailySession] Nouvelle session créée avec succès: ${newSession.id}`);
      return {
        session: newSession,
        isNew: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error('[getOrCreateDailySession] Erreur critique:', {
        userId,
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString()
      });

      // Relancer une erreur plus détaillée avec la cause d'origine
      throw new StudySessionError(
        `Impossible de créer ou récupérer la session quotidienne: ${errorMessage}`,
        error instanceof StudySessionError ? error.code : 'DAILY_SESSION_ERROR',
        { cause: error }
      );
    }
  }



  /**
   * Crée une nouvelle session quotidienne pour un utilisateur.
   * La session est créée avec des paramètres par défaut et un titre basé sur la date du jour.
   * 
   * @param userId - ID de l'utilisateur (string ou number)
   * @returns La nouvelle session créée
   * @throws {StudySessionError} Si la création de la session échoue
   * @private
   */
  private async createDailySession(userId: string | number, options: { targetDate?: Date } = {}): Promise<StudySession> {
    // Validation des paramètres
    if (userId === undefined || userId === null) {
      throw new StudySessionError(
        'ID utilisateur requis pour créer une session quotidienne',
        'INVALID_PARAMETER'
      );
    }

    // Vérification supplémentaire pour les IDs numériques
    if (typeof userId === 'number' && isNaN(userId)) {
      throw new StudySessionError(
        'ID utilisateur invalide: NaN',
        'INVALID_USER_ID'
      );
    }

    // Conversion sécurisée de l'ID utilisateur en chaîne
    let userIdString: string;
    if (typeof userId === 'number') {
      userIdString = String(userId);
    } else {
      userIdString = userId;
    }

    // Log détaillé pour le débogage
    console.log(`[createDailySession] Début de la création d'une session pour l'utilisateur:`, {
      userId,
      userIdString,
      type: typeof userId,
      targetDate: options.targetDate ? options.targetDate.toISOString() : 'non spécifiée'
    });

    try {
      // 1. Préparation des données de la session
      const sessionDate = options.targetDate || new Date();

      // Format de la date pour le titre
      const title = `Session du ${sessionDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`;

      console.log('[createDailySession] Création de la session avec les paramètres:', {
        title,
        date: sessionDate.toISOString(),
        userId: userIdString,
        originalUserId: userId
      });

      // 2. Création de la session avec des paramètres par défaut
      const sessionData = await this.createSession(userIdString, {
        title,
        difficulty: 'beginner',
        estimatedDuration: 60, // 60 minutes par défaut
        status: 'active',
        context: {
          isDailySession: true,
          date: sessionDate.toISOString(),
          expiresAt: new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000).toISOString() // Expire dans 24h
        }
      });

      if (!sessionData || !sessionData.id) {
        throw new StudySessionError(
          'La création de la session a échoué: pas d\'ID retourné',
          'SESSION_CREATION_FAILED'
        );
      }

      console.log(`[createDailySession] Session créée avec succès: ${sessionData.id}`);

      // 3. Vérification que la session est bien récupérable
      try {
        // Vérification préliminaire de l'ID de session
        if (!sessionData.id || typeof sessionData.id !== 'string') {
          console.warn(`[createDailySession] ID de session invalide: ${sessionData.id}, type: ${typeof sessionData.id}`);
          return sessionData; // Retourner la session non vérifiée si l'ID est invalide
        }

        // Utilisation de safeFindByID pour éviter les erreurs PostgreSQL liées à NaN
        const verifiedSession = await this.safeFindByID('study-sessions', sessionData.id) as StudySession;

        if (!verifiedSession) {
          console.warn(`[createDailySession] Session avec ID=${sessionData.id} non trouvée ou ID invalide`);
          return sessionData; // Retourner la session non vérifiée si elle n'est pas trouvée
        }

        console.log(`[createDailySession] Vérification de la session ${sessionData.id} réussie`);
        return verifiedSession;

      } catch (verifyError) {
        const errorMessage = verifyError instanceof Error ? verifyError.message : 'Erreur inconnue';
        console.error('[createDailySession] Erreur lors de la vérification de la session:', {
          error: errorMessage,
          sessionId: sessionData.id,
          timestamp: new Date().toISOString(),
          stack: verifyError instanceof Error ? verifyError.stack : undefined
        });

        // Si la vérification échoue mais que la session existe, la retourner quand même
        if (sessionData) {
          console.warn('[createDailySession] Retour de la session non vérifiée suite à une erreur de vérification');
          return sessionData;
        }

        throw new StudySessionError(
          `Échec de la vérification de la session: ${errorMessage}`,
          'SESSION_VERIFICATION_FAILED',
          { cause: verifyError }
        );
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error('[createDailySession] Échec critique de la création de session:', {
        userId: userId,
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString()
      });

      // Relancer une erreur plus détaillée
      throw new StudySessionError(
        `Échec de la création de la session quotidienne: ${errorMessage}`,
        error instanceof StudySessionError ? error.code : 'DAILY_SESSION_CREATION_FAILED'
      );
    }
  }

}
