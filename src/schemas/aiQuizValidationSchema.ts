/**
 * Schémas de validation JSON pour les quiz générés par l'IA
 * Définit la structure attendue et les règles de validation
 */

export interface QuizValidationSchema {
  quiz: QuizMetadataSchema;
  questions: QuestionSchema[];
}

export interface QuizMetadataSchema {
  title: {
    type: 'string';
    minLength: 10;
    maxLength: 100;
    required: true;
  };
  description: {
    type: 'string';
    minLength: 20;
    maxLength: 300;
    required: true;
  };
  estimatedDuration: {
    type: 'number';
    min: 5;
    max: 60;
    required: true;
  };
}

export interface QuestionSchema {
  questionText: {
    type: 'string';
    minLength: 20;
    maxLength: 500;
    required: true;
  };
  options: {
    type: 'array';
    minItems: 4;
    maxItems: 4;
    required: true;
    items: OptionSchema;
  };
  explanation: {
    type: 'string';
    minLength: 50;
    maxLength: 1000;
    required: true;
  };
  difficulty?: {
    type: 'string';
    enum: ['easy', 'medium', 'hard'];
  };
  tags?: {
    type: 'array';
    items: {
      type: 'string';
      minLength: 2;
      maxLength: 50;
    };
  };
}

export interface OptionSchema {
  text: {
    type: 'string';
    minLength: 5;
    maxLength: 200;
    required: true;
  };
  isCorrect: {
    type: 'boolean';
    required: true;
  };
}

/**
 * Schéma de validation JSON complet pour les quiz IA
 */
export const AI_QUIZ_JSON_SCHEMA = {
  type: 'object',
  required: ['quiz', 'questions'],
  properties: {
    quiz: {
      type: 'object',
      required: ['title', 'description', 'estimatedDuration'],
      properties: {
        title: {
          type: 'string',
          minLength: 10,
          maxLength: 100
        },
        description: {
          type: 'string',
          minLength: 20,
          maxLength: 300
        },
        estimatedDuration: {
          type: 'number',
          minimum: 5,
          maximum: 60
        }
      },
      additionalProperties: false
    },
    questions: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        required: ['questionText', 'options', 'explanation'],
        properties: {
          questionText: {
            type: 'string',
            minLength: 20,
            maxLength: 500
          },
          options: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: {
              type: 'object',
              required: ['text', 'isCorrect'],
              properties: {
                text: {
                  type: 'string',
                  minLength: 5,
                  maxLength: 200
                },
                isCorrect: {
                  type: 'boolean'
                }
              },
              additionalProperties: false
            }
          },
          explanation: {
            type: 'string',
            minLength: 50,
            maxLength: 1000
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard']
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 2,
              maxLength: 50
            }
          }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
} as const;

/**
 * Règles de validation spécifiques par niveau d'études
 */
export const LEVEL_SPECIFIC_VALIDATION_RULES = {
  PASS: {
    name: 'PASS (1ère année)',
    description: 'Première année commune aux études de santé',
    vocabularyComplexity: 'basic',
    conceptDepth: 'fundamental',
    clinicalContent: false,
    requiredTerms: [
      'anatomie', 'physiologie', 'biochimie', 'cellule', 'tissu', 'organe',
      'système', 'fonction', 'mécanisme', 'processus', 'structure'
    ],
    forbiddenTerms: [
      'diagnostic clinique', 'traitement spécialisé', 'pathologie complexe',
      'thérapeutique avancée', 'chirurgie', 'prescription'
    ],
    maxDifficultyLevel: 'medium',
    recommendedQuestionLength: { min: 20, max: 300 },
    recommendedExplanationLength: { min: 50, max: 400 }
  },
  LAS: {
    name: 'LAS (Licence Accès Santé)',
    description: 'Licence avec option santé - niveau intermédiaire',
    vocabularyComplexity: 'intermediate',
    conceptDepth: 'applied',
    clinicalContent: true,
    requiredTerms: [
      'anatomie', 'physiologie', 'pathologie', 'symptôme', 'maladie',
      'syndrome', 'diagnostic', 'prévention', 'santé publique'
    ],
    forbiddenTerms: [
      'chirurgie spécialisée', 'thérapeutique expérimentale',
      'diagnostic différentiel complexe', 'prescription médicamenteuse'
    ],
    maxDifficultyLevel: 'hard',
    recommendedQuestionLength: { min: 30, max: 400 },
    recommendedExplanationLength: { min: 80, max: 600 }
  }
} as const;

/**
 * Patterns de détection de contenu inapproprié ou dangereux
 */
export const INAPPROPRIATE_CONTENT_PATTERNS = {
  // Conseils médicaux dangereux
  medicalAdvice: [
    /auto.?médication/i,
    /diagnostic.?personnel/i,
    /traitement.?sans.?médecin/i,
    /remède.?miracle/i,
    /guérison.?garantie/i,
    /arrêter.?traitement/i,
    /remplacer.?médecin/i
  ],
  
  // Contenu discriminatoire
  discriminatory: [
    /race.?supérieure/i,
    /infériorité.?génétique/i,
    /stéréotype.?racial/i,
    /discrimination.?sexuelle/i
  ],
  
  // Contenu non scientifique
  pseudoscience: [
    /médecine.?alternative.?exclusive/i,
    /théorie.?complot/i,
    /anti.?vaccin/i,
    /homéopathie.?seule/i,
    /chakra.?médical/i
  ],
  
  // Contenu alarmiste
  alarmist: [
    /panique/i,
    /catastrophe.?sanitaire/i,
    /danger.?mortel.?immédiat/i,
    /urgence.?absolue/i
  ],
  
  // Contenu inapproprié pour l'éducation
  inappropriate: [
    /violence.?graphique/i,
    /contenu.?explicite/i,
    /langage.?vulgaire/i,
    /discrimination/i
  ]
} as const;

/**
 * Vocabulaire médical de référence par domaine
 */
export const MEDICAL_VOCABULARY_REFERENCE = {
  anatomy: [
    'anatomie', 'squelette', 'muscle', 'os', 'articulation', 'ligament',
    'tendon', 'cartilage', 'moelle', 'périoste', 'synovie'
  ],
  physiology: [
    'physiologie', 'fonction', 'métabolisme', 'homéostasie', 'régulation',
    'adaptation', 'équilibre', 'transport', 'échange', 'circulation'
  ],
  biochemistry: [
    'biochimie', 'enzyme', 'protéine', 'glucide', 'lipide', 'acide aminé',
    'ATP', 'métabolisme', 'catalyse', 'réaction', 'synthèse'
  ],
  pathology: [
    'pathologie', 'maladie', 'syndrome', 'symptôme', 'signe', 'lésion',
    'inflammation', 'infection', 'tumeur', 'dégénérescence', 'nécrose'
  ],
  pharmacology: [
    'pharmacologie', 'médicament', 'principe actif', 'posologie', 'effet',
    'interaction', 'métabolisme', 'élimination', 'biodisponibilité'
  ]
} as const;

/**
 * Seuils de qualité pour la validation
 */
export const QUALITY_THRESHOLDS = {
  // Score minimum pour considérer le contenu comme valide
  minimumValidationScore: 70,
  
  // Pourcentage minimum de terminologie médicale
  minimumMedicalTerminologyRatio: 0.3,
  
  // Nombre maximum d'erreurs critiques tolérées
  maxCriticalErrors: 0,
  
  // Nombre maximum d'erreurs majeures tolérées
  maxMajorErrors: 2,
  
  // Score minimum pour chaque catégorie
  categoryMinimumScores: {
    structure: 90,
    content: 80,
    medical: 75,
    pedagogical: 70
  }
} as const;

export type StudentLevel = 'PASS' | 'LAS';
export type ValidationCategory = 'structure' | 'content' | 'medical' | 'pedagogical';
export type ContentPattern = keyof typeof INAPPROPRIATE_CONTENT_PATTERNS;