/**
 * Schémas de validation JSON pour le système d'import
 * Définit les schémas JSON Schema pour valider les différents types de contenu
 */

import { JSONSchema7 } from 'json-schema';

// Schéma de base pour les métadonnées
const metadataSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    source: { type: 'string' },
    created: { type: 'string', format: 'date' },
    level: { type: 'string', enum: ['PASS', 'LAS', 'both'] },
    description: { type: 'string' },
    version: { type: 'string' }
  },
  additionalProperties: false
};

// Schéma pour une option de question
const optionSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    text: { type: 'string', minLength: 1 },
    isCorrect: { type: 'boolean' }
  },
  required: ['text', 'isCorrect'],
  additionalProperties: false
};

// Schéma pour une question
const questionSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    questionText: { type: 'string', minLength: 10 },
    options: {
      type: 'array',
      items: optionSchema,
      minItems: 2,
      maxItems: 6
    },
    explanation: { type: 'string', minLength: 10 },
    category: { type: 'string', minLength: 1 },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    level: { type: 'string', enum: ['PASS', 'LAS', 'both'] },
    tags: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true
    },
    sourcePageReference: { type: 'string' }
  },
  required: ['questionText', 'options', 'explanation', 'category', 'difficulty', 'level'],
  additionalProperties: false
};

// Schéma pour l'import de questions
export const questionImportSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    version: { type: 'string', pattern: '^\\d+\\.\\d+$' },
    type: { type: 'string', const: 'questions' },
    metadata: metadataSchema,
    questions: {
      type: 'array',
      items: questionSchema,
      minItems: 1,
      maxItems: 1000
    }
  },
  required: ['version', 'type', 'metadata', 'questions'],
  additionalProperties: false
};

// Schéma pour une flashcard
const flashcardSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    front: { type: 'string', minLength: 5 },
    back: { type: 'string', minLength: 5 },
    category: { type: 'string', minLength: 1 },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    tags: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true
    },
    imageUrl: { type: 'string', format: 'uri' }
  },
  required: ['front', 'back', 'category', 'difficulty'],
  additionalProperties: false
};

// Schéma pour l'import de flashcards
export const flashcardImportSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    version: { type: 'string', pattern: '^\\d+\\.\\d+$' },
    type: { type: 'string', const: 'flashcards' },
    metadata: {
      type: 'object',
      properties: {
        ...metadataSchema.properties,
        deckName: { type: 'string', minLength: 1 },
        category: { type: 'string', minLength: 1 }
      },
      required: ['deckName', 'category'],
      additionalProperties: false
    },
    cards: {
      type: 'array',
      items: flashcardSchema,
      minItems: 1,
      maxItems: 1000
    }
  },
  required: ['version', 'type', 'metadata', 'cards'],
  additionalProperties: false
};

// Schéma pour une étape de parcours d'apprentissage
const learningStepSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: '^[a-zA-Z0-9-_]+$' },
    title: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    prerequisites: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true
    },
    estimatedTime: { type: 'number', minimum: 1 },
    questions: {
      type: 'array',
      items: questionSchema,
      minItems: 1
    }
  },
  required: ['id', 'title', 'prerequisites', 'questions'],
  additionalProperties: false
};

// Schéma pour l'import de parcours d'apprentissage
export const learningPathImportSchema: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    version: { type: 'string', pattern: '^\\d+\\.\\d+$' },
    type: { type: 'string', const: 'learning-path' },
    metadata: {
      type: 'object',
      properties: {
        ...metadataSchema.properties,
        title: { type: 'string', minLength: 1 },
        estimatedDuration: { type: 'number', minimum: 1 }
      },
      required: ['title', 'estimatedDuration'],
      additionalProperties: false
    },
    path: {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: learningStepSchema,
          minItems: 1,
          maxItems: 50
        }
      },
      required: ['steps'],
      additionalProperties: false
    }
  },
  required: ['version', 'type', 'metadata', 'path'],
  additionalProperties: false
};

// Schéma pour la structure CSV (colonnes attendues)
export const csvStructureSchema = {
  requiredColumns: [
    'questionText',
    'optionA',
    'optionB',
    'correctAnswer',
    'category'
  ],
  optionalColumns: [
    'optionC',
    'optionD',
    'optionE',
    'optionF',
    'explanation',
    'difficulty',
    'level',
    'tags',
    'sourcePageReference'
  ],
  columnMappings: {
    // Mappings alternatifs pour les noms de colonnes
    'question': 'questionText',
    'text': 'questionText',
    'énoncé': 'questionText',
    'choixA': 'optionA',
    'choixB': 'optionB',
    'choixC': 'optionC',
    'choixD': 'optionD',
    'réponse': 'correctAnswer',
    'correct': 'correctAnswer',
    'bonne_réponse': 'correctAnswer',
    'catégorie': 'category',
    'domaine': 'category',
    'difficulté': 'difficulty',
    'niveau': 'level',
    'étiquettes': 'tags',
    'mots_clés': 'tags'
  }
};

// Map des schémas par type d'import
export const importSchemas = {
  questions: questionImportSchema,
  flashcards: flashcardImportSchema,
  'learning-path': learningPathImportSchema
} as const;

// Fonction utilitaire pour obtenir le schéma approprié
export function getSchemaForImportType(importType: string): JSONSchema7 | null {
  return importSchemas[importType as keyof typeof importSchemas] || null;
}

// Validation des règles métier spécifiques
export const businessRules = {
  // Au moins une option correcte par question
  validateCorrectOptions: (options: Array<{ text: string; isCorrect: boolean }>) => {
    const correctCount = options.filter(opt => opt.isCorrect).length;
    return {
      isValid: correctCount === 1,
      error: correctCount === 0 
        ? 'Au moins une option doit être marquée comme correcte'
        : correctCount > 1 
        ? 'Une seule option peut être marquée comme correcte'
        : null
    };
  },

  // Validation des prérequis dans les parcours d'apprentissage
  validatePrerequisites: (steps: Array<{ id: string; prerequisites: string[] }>) => {
    const stepIds = new Set(steps.map(s => s.id));
    const errors: string[] = [];

    steps.forEach((step, index) => {
      step.prerequisites.forEach(prereq => {
        if (!stepIds.has(prereq)) {
          errors.push(`Étape ${index + 1} (${step.id}): prérequis "${prereq}" introuvable`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Validation des références circulaires
  validateCircularDependencies: (steps: Array<{ id: string; prerequisites: string[] }>) => {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find(s => s.id === stepId);
      if (step) {
        for (const prereq of step.prerequisites) {
          if (hasCycle(prereq)) return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (hasCycle(step.id)) {
        return {
          isValid: false,
          error: `Dépendance circulaire détectée impliquant l'étape "${step.id}"`
        };
      }
    }

    return { isValid: true, error: null };
  }
};