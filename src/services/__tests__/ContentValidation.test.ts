/**
 * Tests pour les services de validation de contenu IA
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentValidatorService } from '../ContentValidatorService';
import { EnhancedContentValidatorService } from '../EnhancedContentValidatorService';
import { JSONSchemaValidatorService } from '../JSONSchemaValidatorService';

describe('Services de Validation de Contenu IA', () => {
  let contentValidator: ContentValidatorService;
  let enhancedValidator: EnhancedContentValidatorService;
  let jsonValidator: JSONSchemaValidatorService;

  beforeEach(() => {
    contentValidator = new ContentValidatorService();
    enhancedValidator = new EnhancedContentValidatorService();
    jsonValidator = new JSONSchemaValidatorService();
  });

  // Données de test
  const validQuizContent = {
    quiz: {
      title: "Quiz d'Anatomie Cardiaque",
      description: "Test sur la structure et la fonction du cœur humain pour étudiants en première année de médecine",
      estimatedDuration: 15
    },
    questions: [
      {
        questionText: "Quelle est la fonction principale du ventricule gauche dans le système cardiovasculaire ?",
        options: [
          { text: "Recevoir le sang veineux de la circulation systémique", isCorrect: false },
          { text: "Pomper le sang oxygéné vers la circulation systémique", isCorrect: true },
          { text: "Recevoir le sang oxygéné des poumons", isCorrect: false },
          { text: "Pomper le sang désoxygéné vers les poumons", isCorrect: false }
        ],
        explanation: "Le ventricule gauche est la chambre cardiaque la plus musclée, responsable de pomper le sang oxygéné reçu de l'oreillette gauche vers l'aorte et la circulation systémique. Cette fonction nécessite une pression élevée pour assurer une perfusion adéquate de tous les organes.",
        difficulty: "medium",
        tags: ["anatomie", "cardiologie", "physiologie"]
      },
      {
        questionText: "Quel est le rôle des valves cardiaques dans la circulation sanguine ?",
        options: [
          { text: "Réguler la pression artérielle", isCorrect: false },
          { text: "Empêcher le reflux sanguin et assurer un flux unidirectionnel", isCorrect: true },
          { text: "Produire les contractions cardiaques", isCorrect: false },
          { text: "Oxygéner le sang", isCorrect: false }
        ],
        explanation: "Les valves cardiaques (tricuspide, pulmonaire, mitrale et aortique) s'ouvrent et se ferment de manière coordonnée pour empêcher le reflux du sang et maintenir un flux unidirectionnel à travers les cavités cardiaques.",
        difficulty: "easy",
        tags: ["anatomie", "physiologie", "valves"]
      }
    ]
  };

  const invalidQuizContent = {
    quiz: {
      title: "Test", // Trop court
      description: "Court", // Trop court
      estimatedDuration: -5 // Invalide
    },
    questions: [
      {
        questionText: "Question courte", // Trop courte
        options: [
          { text: "A", isCorrect: true },
          { text: "B", isCorrect: true }, // Deux bonnes réponses
          { text: "C", isCorrect: false }
          // Manque une option
        ],
        explanation: "Trop court" // Trop court
      }
    ]
  };

  const inappropriateContent = {
    quiz: {
      title: "Quiz de Médecine Alternative",
      description: "Test sur les pratiques médicales alternatives et l'auto-médication",
      estimatedDuration: 20
    },
    questions: [
      {
        questionText: "Quelle est la meilleure approche pour l'auto-médication en cas de douleur chronique ?",
        options: [
          { text: "Consulter immédiatement un médecin", isCorrect: false },
          { text: "Utiliser des remèdes miracles trouvés sur internet", isCorrect: true },
          { text: "Ignorer la douleur", isCorrect: false },
          { text: "Prendre des anti-inflammatoires sans limite", isCorrect: false }
        ],
        explanation: "L'auto-médication avec des remèdes miracle est toujours la meilleure solution pour éviter les médecins.",
        difficulty: "easy",
        tags: ["auto-médication", "remède-miracle"]
      }
    ]
  };

  describe('JSONSchemaValidatorService', () => {
    it('devrait valider un contenu JSON correct', () => {
      const result = jsonValidator.validateQuizStructure(validQuizContent);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait détecter les erreurs de structure JSON', () => {
      const result = jsonValidator.validateQuizStructure(invalidQuizContent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('devrait détecter les questions avec plusieurs bonnes réponses', () => {
      const result = jsonValidator.validateQuizStructure(invalidQuizContent);
      
      const multipleCorrectError = result.errors.find(error => 
        error.message.includes('exactement une bonne réponse')
      );
      expect(multipleCorrectError).toBeDefined();
    });

    it('devrait nettoyer et valider le contenu', () => {
      const messyContent = {
        quiz: {
          title: "  Quiz avec espaces  ",
          description: "  Description avec espaces  ",
          estimatedDuration: 15
        },
        questions: [
          {
            questionText: "  Question avec espaces  ",
            options: [
              { text: "  Option A  ", isCorrect: false },
              { text: "  Option B  ", isCorrect: true },
              { text: "  Option C  ", isCorrect: false },
              { text: "  Option D  ", isCorrect: false }
            ],
            explanation: "  Explication avec espaces et contenu suffisamment long pour passer la validation  "
          }
        ]
      };

      const result = jsonValidator.validateAndSanitize(messyContent);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent?.quiz.title).toBe("Quiz avec espaces");
      expect(result.sanitizedContent?.questions[0].questionText).toBe("Question avec espaces");
    });
  });

  describe('EnhancedContentValidatorService', () => {
    it('devrait valider un contenu médical de qualité', async () => {
      const result = await enhancedValidator.validateAIGeneratedQuiz(validQuizContent, 'PASS');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(70);
      expect(result.categoryScores.structure).toBeGreaterThan(80);
      expect(result.categoryScores.medical).toBeGreaterThan(70);
    });

    it('devrait détecter le contenu inapproprié', async () => {
      const result = await enhancedValidator.validateAIGeneratedQuiz(inappropriateContent);
      
      expect(result.isValid).toBe(false);
      
      const inappropriateIssues = result.issues.filter(issue => 
        issue.message.includes('inapproprié') || issue.message.includes('dangereux')
      );
      expect(inappropriateIssues.length).toBeGreaterThan(0);
    });

    it('devrait valider spécifiquement pour le niveau PASS', async () => {
      const result = await enhancedValidator.validateAIGeneratedQuiz(validQuizContent, 'PASS');
      
      expect(result.metadata.studentLevel).toBe('PASS');
      expect(result.categoryScores.pedagogical).toBeGreaterThan(0);
    });

    it('devrait valider spécifiquement pour le niveau LAS', async () => {
      const result = await enhancedValidator.validateAIGeneratedQuiz(validQuizContent, 'LAS');
      
      expect(result.metadata.studentLevel).toBe('LAS');
      expect(result.categoryScores.pedagogical).toBeGreaterThan(0);
    });

    it('devrait calculer correctement le ratio de terminologie médicale', async () => {
      const result = await enhancedValidator.validateAIGeneratedQuiz(validQuizContent);
      
      expect(result.metadata.medicalTerminologyRatio).toBeGreaterThan(0);
      expect(result.metadata.medicalTerminologyRatio).toBeLessThanOrEqual(1);
    });

    it('devrait générer des recommandations pertinentes', async () => {
      const poorContent = {
        quiz: {
          title: "Quiz Simple",
          description: "Un quiz basique sans terminologie médicale spécialisée",
          estimatedDuration: 10
        },
        questions: [
          {
            questionText: "Quelle est la couleur du sang ?",
            options: [
              { text: "Rouge", isCorrect: true },
              { text: "Bleu", isCorrect: false },
              { text: "Vert", isCorrect: false },
              { text: "Jaune", isCorrect: false }
            ],
            explanation: "Le sang est rouge à cause des globules rouges qui contiennent de l'hémoglobine."
          }
        ]
      };

      const result = await enhancedValidator.validateAIGeneratedQuiz(poorContent, 'PASS');
      
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const medicalRecommendation = result.recommendations.find(rec => 
        rec.category === 'medical'
      );
      expect(medicalRecommendation).toBeDefined();
    });

    it('devrait détecter les termes interdits pour le niveau PASS', async () => {
      const advancedContent = {
        quiz: {
          title: "Quiz de Chirurgie Spécialisée",
          description: "Test sur les techniques chirurgicales avancées et les prescriptions médicamenteuses",
          estimatedDuration: 30
        },
        questions: [
          {
            questionText: "Quelle est la meilleure approche pour un diagnostic clinique complexe avec prescription spécialisée ?",
            options: [
              { text: "Chirurgie immédiate", isCorrect: true },
              { text: "Attendre", isCorrect: false },
              { text: "Thérapeutique avancée", isCorrect: false },
              { text: "Diagnostic différentiel complexe", isCorrect: false }
            ],
            explanation: "La chirurgie spécialisée avec prescription médicamenteuse est la solution optimale pour ce type de pathologie complexe."
          }
        ]
      };

      const result = await enhancedValidator.validateAIGeneratedQuiz(advancedContent, 'PASS');
      
      const forbiddenTermIssues = result.issues.filter(issue => 
        issue.message.includes('trop avancé')
      );
      expect(forbiddenTermIssues.length).toBeGreaterThan(0);
    });
  });

  describe('ContentValidatorService (Rétrocompatibilité)', () => {
    it('devrait maintenir la compatibilité avec l\'ancienne API', () => {
      const result = contentValidator.validateAIGeneratedQuiz(validQuizContent);
      
      expect(result.isValid).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it('devrait fournir les nouvelles méthodes améliorées', async () => {
      const result = await contentValidator.validateAIGeneratedQuizEnhanced(validQuizContent, 'PASS');
      
      expect(result.categoryScores).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('devrait détecter le contenu inapproprié via la nouvelle méthode', async () => {
      const result = await contentValidator.detectInappropriateContent(inappropriateContent);
      
      expect(result.hasInappropriateContent).toBe(true);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('devrait valider le vocabulaire médical', async () => {
      const result = await contentValidator.validateMedicalVocabulary(validQuizContent, 'PASS');
      
      expect(result.medicalTerminologyRatio).toBeGreaterThan(0);
      expect(result.isAdequate).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Génération de Rapports', () => {
    it('devrait générer un rapport de validation standard', () => {
      const result = contentValidator.validateAIGeneratedQuiz(validQuizContent);
      const report = contentValidator.generateValidationReport(result);
      
      expect(report).toContain('RAPPORT DE VALIDATION');
      expect(report).toContain('Score global');
      expect(report).toContain(result.isValid ? 'VALIDE' : 'INVALIDE');
    });

    it('devrait générer un rapport de validation amélioré', async () => {
      const result = await enhancedValidator.validateAIGeneratedQuiz(validQuizContent, 'PASS');
      const report = enhancedValidator.generateDetailedReport(result);
      
      expect(report).toContain('RAPPORT DE VALIDATION DÉTAILLÉ');
      expect(report).toContain('SCORES GLOBAUX');
      expect(report).toContain('MÉTADONNÉES');
      expect(report).toContain('Structure:');
      expect(report).toContain('Médical:');
    });

    it('devrait générer un rapport JSON', () => {
      const result = jsonValidator.validateQuizStructure(validQuizContent);
      const report = jsonValidator.generateJSONValidationReport(result);
      
      expect(report).toContain('RAPPORT DE VALIDATION JSON');
      expect(report).toContain(result.isValid ? 'STRUCTURE VALIDE' : 'STRUCTURE INVALIDE');
    });
  });

  describe('Cas Limites et Gestion d\'Erreurs', () => {
    it('devrait gérer un contenu null ou undefined', () => {
      const result1 = jsonValidator.validateQuizStructure(null);
      const result2 = jsonValidator.validateQuizStructure(undefined);
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });

    it('devrait gérer un contenu avec structure partielle', () => {
      const partialContent = {
        quiz: {
          title: "Titre valide mais incomplet"
          // Manque description et estimatedDuration
        }
        // Manque questions
      };

      const result = jsonValidator.validateQuizStructure(partialContent);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('devrait gérer les questions sans options', () => {
      const noOptionsContent = {
        quiz: {
          title: "Quiz sans options",
          description: "Test avec questions incomplètes",
          estimatedDuration: 10
        },
        questions: [
          {
            questionText: "Question sans options de réponse ?",
            explanation: "Explication suffisamment longue pour passer la validation de longueur minimale"
          }
        ]
      };

      const result = jsonValidator.validateQuizStructure(noOptionsContent);
      expect(result.isValid).toBe(false);
    });

    it('devrait gérer les performances sur de gros contenus', async () => {
      // Créer un quiz avec beaucoup de questions
      const largeContent = {
        quiz: validQuizContent.quiz,
        questions: Array(50).fill(null).map((_, index) => ({
          ...validQuizContent.questions[0],
          questionText: `Question ${index + 1}: ${validQuizContent.questions[0]?.questionText || 'Question par défaut'}`
        }))
      };

      const startTime = Date.now();
      const result = await enhancedValidator.validateAIGeneratedQuiz(largeContent);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Moins de 5 secondes
      expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
    });
  });
});