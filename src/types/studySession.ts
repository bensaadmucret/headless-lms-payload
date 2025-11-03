import type { StudySession as StudySessionType } from '../payload-types';

export type StudySession = StudySessionType;

export type StudySessionStatus = 'draft' | 'in-progress' | 'completed' | 'paused';

export type StudySessionStepStatus = 'pending' | 'in-progress' | 'completed' | 'skipped';

export type StudySessionStepType = 'quiz' | 'review' | 'flashcards' | 'video' | 'reading';

export interface StudySessionStep {
  stepId: number;
  type: StudySessionStepType;
  title: string;
  description?: string;
  status: StudySessionStepStatus;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
}

export interface CreateStudySessionDTO {
  title: string;
  user: string;
  status: StudySessionStatus;
  estimatedDuration: number;
  currentStep: number;
  steps: StudySessionStep[];
  context: {
    course?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface StudySessionOptions {
  userName?: string;
  courseName?: string;
  date?: Date;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
