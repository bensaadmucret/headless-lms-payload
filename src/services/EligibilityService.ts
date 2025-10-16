import type { Payload } from 'payload';
import type { User } from '../payload-types';

interface EligibilityResult {
  canGenerate: boolean;
  reason?: string;
  requirements?: {
    minimumQuizzes: {
      required: number;
      current: number;
      satisfied: boolean;
    };
    studentLevel: {
      required: boolean;
      current: string | null;
      satisfied: boolean;
    };
    dailyLimit: {
      limit: number;
      used: number;
      remaining: number;
      satisfied: boolean;
    };
    cooldown: {
      required: boolean;
      remainingMinutes: number;
      satisfied: boolean;
    };
  };
  nextAvailableAt?: string;
  suggestions?: string[];
}

interface UserRequirements {
  minimumQuizzes: number;
  studentLevelRequired: boolean;
  dailyLimit: number;
  cooldownMinutes: number;
}

/**
 * Service for checking user eligibility for adaptive quiz generation
 * Centralizes all prerequisite validations
 * Requirements: 3.1, 3.3
 */
export class EligibilityService {
  // Configuration constants
  private readonly MINIMUM_QUIZZES = 3;
  private readonly DAILY_LIMIT = 10; // Augmenté de 5 à 10 pour permettre plus de tests
  private readonly COOLDOWN_MINUTES = 0; // Désactivé pour le développement (mettre 5-10 en production)

  constructor(private payload: Payload) {}

  /**
   * Checks complete eligibility for adaptive quiz generation
   * Returns detailed information about requirements and current status
   * Requirements: 3.1, 3.3
   */
  async checkEligibility(userId: string): Promise<EligibilityResult> {
    try {
      console.log('🔍 EligibilityService: Début checkEligibility pour userId:', userId);
      
      // Get user information
      console.log('📋 EligibilityService: Récupération utilisateur...');
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId
      }) as User;

      if (!user) {
        console.log('❌ EligibilityService: Utilisateur non trouvé');
        return {
          canGenerate: false,
          reason: 'Utilisateur non trouvé'
        };
      }
      
      console.log('✅ EligibilityService: Utilisateur trouvé:', user.email);

      // Check all requirements
      console.log('🔍 EligibilityService: Vérification des exigences...');
      
      console.log('📊 EligibilityService: Vérification quiz minimum...');
      const quizRequirement = await this.checkMinimumQuizzes(userId);
      console.log('✅ Quiz requirement:', quizRequirement);
      
      console.log('🎓 EligibilityService: Vérification niveau étudiant...');
      const levelRequirement = this.checkStudentLevel(user);
      console.log('✅ Level requirement:', levelRequirement);
      
      console.log('📅 EligibilityService: Vérification limite quotidienne...');
      const dailyLimitCheck = await this.checkDailyLimit(userId);
      console.log('✅ Daily limit check:', dailyLimitCheck);
      
      console.log('⏰ EligibilityService: Vérification cooldown...');
      const cooldownCheck = await this.checkCooldown(userId);
      console.log('✅ Cooldown check:', cooldownCheck);

      // Determine overall eligibility
      const canGenerate = quizRequirement.satisfied && 
                         levelRequirement.satisfied && 
                         dailyLimitCheck.satisfied && 
                         cooldownCheck.satisfied;
      
      console.log('🎯 EligibilityService: Résultat final canGenerate:', canGenerate, {
        quiz: quizRequirement.satisfied,
        level: levelRequirement.satisfied,
        daily: dailyLimitCheck.satisfied,
        cooldown: cooldownCheck.satisfied
      });

      // Generate suggestions for unsatisfied requirements
      const suggestions = this.generateSuggestions({
        quizRequirement,
        levelRequirement,
        dailyLimitCheck,
        cooldownCheck
      });

      // Calculate next available time if not eligible
      let nextAvailableAt: string | undefined;
      if (!canGenerate) {
        nextAvailableAt = this.calculateNextAvailableTime(cooldownCheck, dailyLimitCheck);
      }

      // Determine primary reason for ineligibility
      let reason: string | undefined;
      if (!canGenerate) {
        if (!quizRequirement.satisfied) {
          reason = `Vous devez compléter au moins ${this.MINIMUM_QUIZZES} quiz (actuellement: ${quizRequirement.current})`;
        } else if (!levelRequirement.satisfied) {
          reason = 'Votre niveau d\'études (PASS/LAS) doit être défini dans votre profil';
        } else if (!dailyLimitCheck.satisfied) {
          reason = `Limite quotidienne atteinte (${dailyLimitCheck.used}/${dailyLimitCheck.limit})`;
        } else if (!cooldownCheck.satisfied) {
          reason = `Cooldown actif, attendez ${cooldownCheck.remainingMinutes} minutes`;
        }
      }

      return {
        canGenerate,
        reason,
        requirements: {
          minimumQuizzes: quizRequirement,
          studentLevel: levelRequirement,
          dailyLimit: dailyLimitCheck,
          cooldown: cooldownCheck
        },
        nextAvailableAt,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

    } catch (error) {
      console.error('❌ EligibilityService: Erreur dans checkEligibility:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        canGenerate: false,
        reason: 'Erreur technique lors de la vérification des prérequis'
      };
    }
  }

  /**
   * Gets detailed user requirements information
   * Requirements: 3.1, 3.3
   */
  getUserRequirements(): UserRequirements {
    return {
      minimumQuizzes: this.MINIMUM_QUIZZES,
      studentLevelRequired: true,
      dailyLimit: this.DAILY_LIMIT,
      cooldownMinutes: this.COOLDOWN_MINUTES
    };
  }

  /**
   * Checks if user has completed minimum number of quizzes
   * Private helper method
   */
  private async checkMinimumQuizzes(userId: string): Promise<{
    required: number;
    current: number;
    satisfied: boolean;
  }> {
    try {
      const submissions = await this.payload.find({
        collection: 'quiz-submissions',
        where: {
          and: [
            { student: { equals: userId } },
            { finalScore: { exists: true } }
          ]
        },
        limit: 1
      });

      const current = submissions.totalDocs;
      
      return {
        required: this.MINIMUM_QUIZZES,
        current,
        satisfied: current >= this.MINIMUM_QUIZZES
      };
    } catch (error) {
      console.error('Error checking minimum quizzes:', error);
      return {
        required: this.MINIMUM_QUIZZES,
        current: 0,
        satisfied: false
      };
    }
  }

  /**
   * Checks if user has student level set
   * Private helper method
   */
  private checkStudentLevel(user: User): {
    required: boolean;
    current: string | null;
    satisfied: boolean;
  } {
    const studyYear = (user as any).studyYear;
    
    return {
      required: true,
      current: studyYear || null,
      satisfied: !!(studyYear && (studyYear === 'pass' || studyYear === 'las'))
    };
  }

  /**
   * Checks daily limit for adaptive quiz generation
   * Private helper method
   */
  private async checkDailyLimit(userId: string): Promise<{
    limit: number;
    used: number;
    remaining: number;
    satisfied: boolean;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySessions = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          and: [
            { user: { equals: userId } },
            { createdAt: { greater_than: today.toISOString() } }
          ]
        },
        limit: 1
      });

      const used = todaySessions.totalDocs;
      const remaining = Math.max(0, this.DAILY_LIMIT - used);

      return {
        limit: this.DAILY_LIMIT,
        used,
        remaining,
        satisfied: used < this.DAILY_LIMIT
      };
    } catch (error) {
      console.error('Error checking daily limit:', error);
      return {
        limit: this.DAILY_LIMIT,
        used: this.DAILY_LIMIT, // Assume limit reached on error for safety
        remaining: 0,
        satisfied: false
      };
    }
  }

  /**
   * Checks cooldown period between quiz generations
   * Private helper method
   */
  private async checkCooldown(userId: string): Promise<{
    required: boolean;
    remainingMinutes: number;
    satisfied: boolean;
  }> {
    try {
      const lastSession = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: { user: { equals: userId } },
        sort: '-createdAt',
        limit: 1
      });

      if (lastSession.totalDocs === 0) {
        return {
          required: true,
          remainingMinutes: 0,
          satisfied: true
        };
      }

      const lastSessionTime = new Date(lastSession.docs[0]!.createdAt);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSessionTime.getTime()) / (1000 * 60);
      const remainingMinutes = Math.max(0, Math.ceil(this.COOLDOWN_MINUTES - diffMinutes));

      return {
        required: true,
        remainingMinutes,
        satisfied: diffMinutes >= this.COOLDOWN_MINUTES
      };
    } catch (error) {
      console.error('Error checking cooldown:', error);
      return {
        required: true,
        remainingMinutes: this.COOLDOWN_MINUTES, // Assume full cooldown on error for safety
        satisfied: false
      };
    }
  }

  /**
   * Generates helpful suggestions based on unsatisfied requirements
   * Private helper method
   */
  private generateSuggestions(requirements: {
    quizRequirement: { satisfied: boolean; current: number; required: number };
    levelRequirement: { satisfied: boolean; current: string | null };
    dailyLimitCheck: { satisfied: boolean; used: number; limit: number };
    cooldownCheck: { satisfied: boolean; remainingMinutes: number };
  }): string[] {
    const suggestions: string[] = [];

    if (!requirements.quizRequirement.satisfied) {
      const needed = requirements.quizRequirement.required - requirements.quizRequirement.current;
      suggestions.push(`Complétez ${needed} quiz supplémentaire${needed > 1 ? 's' : ''} pour débloquer les quiz adaptatifs`);
    }

    if (!requirements.levelRequirement.satisfied) {
      suggestions.push('Définissez votre niveau d\'études (PASS ou LAS) dans votre profil utilisateur');
    }

    if (!requirements.dailyLimitCheck.satisfied) {
      suggestions.push('Vous avez atteint la limite quotidienne. Revenez demain pour générer de nouveaux quiz adaptatifs');
    }

    if (!requirements.cooldownCheck.satisfied) {
      suggestions.push(`Attendez ${requirements.cooldownCheck.remainingMinutes} minutes avant de générer un nouveau quiz adaptatif`);
    }

    return suggestions;
  }

  /**
   * Calculates when the user will next be able to generate a quiz
   * Private helper method
   */
  private calculateNextAvailableTime(
    cooldownCheck: { satisfied: boolean; remainingMinutes: number },
    dailyLimitCheck: { satisfied: boolean; used: number; limit: number }
  ): string {
    const now = new Date();

    // If daily limit is reached, next available is tomorrow at midnight
    if (!dailyLimitCheck.satisfied) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    }

    // If cooldown is active, next available is after cooldown period
    if (!cooldownCheck.satisfied) {
      const nextAvailable = new Date(now.getTime() + cooldownCheck.remainingMinutes * 60 * 1000);
      return nextAvailable.toISOString();
    }

    // If other requirements are not met, available now (but will still fail other checks)
    return now.toISOString();
  }
}