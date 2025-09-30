import { CollectionConfig } from 'payload';

export interface Quiz {
  id: string;
  title: string;
  questions: string[] | Question[];
  course: string | Course;
  published: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface Question {
  id: string;
  questionText: any; // RichText field
  questionType: 'multipleChoice' | 'trueFalse' | 'shortAnswer';
  options: {
    optionText: string;
    isCorrect: boolean;
  }[];
  explanation: string;
  course: string | Course;
  category: string | Category;
  updatedAt: string;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  published: boolean;
}

export interface Category {
  id: string;
  title: string;
}

export interface QuizSubmission {
  id: string;
  quiz: string | Quiz;
  user: string | User;
  answers: {
    question: string | Question;
    answer: string;
    isCorrect: boolean;
  }[];
  score: number;
  completed: boolean;
  updatedAt: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'superadmin';
}
