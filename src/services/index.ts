export * from './AIService';
export * from './StudySessionService';
export * from './PerformanceAnalyticsService';
export * from './CacheService';
export * from './DatabaseOptimizationService';
export * from './questionSelectionEngine';
export * from './AdaptiveQuizService';
export * from './ErrorHandlingService';
export * from './ErrorRecoveryService';
export * from './AdaptiveQuizErrorManager';
export * from './AIQuizGenerationService';
export * from './PromptEngineeringService';
export * from './ContentValidatorService';
export * from './JSONSchemaValidatorService';
export * from './AIAPIService';

// Export spécifique pour éviter les conflits de noms
export { 
  EnhancedContentValidatorService,
  type EnhancedValidationResult,
  type ValidationRecommendation,
  type ValidationMetadata
} from './EnhancedContentValidatorService';

// Services de validation orchestrés
export * from './AIQuizValidationOrchestrator';
export * from './QuizValidationUtils';

// Point d'entrée centralisé pour la validation
export * from './validation';
