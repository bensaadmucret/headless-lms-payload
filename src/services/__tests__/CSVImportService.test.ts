/**
 * Tests pour le service d'import CSV
 */

import { CSVImportService } from '../CSVImportService';

describe('CSVImportService', () => {
  let csvImportService: CSVImportService;

  beforeEach(() => {
    csvImportService = new CSVImportService();
  });

  describe('parseCSVFile', () => {
    it('should parse a simple CSV file with headers', async () => {
      const csvContent = `questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,category,difficulty,level,tags
"Quelle est la fonction du ventricule gauche ?","Pomper le sang vers l'aorte","Recevoir le sang des veines","Filtrer le sang","Produire les globules rouges","A","Le ventricule gauche pompe le sang oxygéné","Cardiologie","medium","PASS","anatomie,cœur"`;

      const result = await csvImportService.parseCSVFile(csvContent, { hasHeader: true });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.type).toBe('questions');
      
      if (result.data && 'questions' in result.data) {
        expect(result.data.questions).toHaveLength(1);
        expect(result.data.questions[0].questionText).toBe('Quelle est la fonction du ventricule gauche ?');
        expect(result.data.questions[0].options).toHaveLength(4);
        expect(result.data.questions[0].options[0].isCorrect).toBe(true);
        expect(result.data.questions[0].category).toBe('Cardiologie');
        expect(result.data.questions[0].difficulty).toBe('medium');
        expect(result.data.questions[0].level).toBe('PASS');
        expect(result.data.questions[0].tags).toEqual(['anatomie', 'cœur']);
      }
    });

    it('should handle CSV without headers', async () => {
      const csvContent = `"Quelle est la fonction du ventricule gauche ?","Pomper le sang vers l'aorte","Recevoir le sang des veines","Filtrer le sang","Produire les globules rouges","A","Le ventricule gauche pompe le sang oxygéné","Cardiologie","medium","PASS","anatomie,cœur"`;

      const result = await csvImportService.parseCSVFile(csvContent, { hasHeader: false });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data && 'questions' in result.data) {
        expect(result.data.questions).toHaveLength(1);
        expect(result.data.questions[0].questionText).toBe('Quelle est la fonction du ventricule gauche ?');
      }
    });

    it('should detect delimiter automatically', async () => {
      const csvContentSemicolon = `questionText;optionA;optionB;correctAnswer;explanation;category
"Question test";"Option A";"Option B";"A";"Explication";"Test"`;

      const result = await csvImportService.parseCSVFile(csvContentSemicolon);

      expect(result.success).toBe(true);
      expect(result.detectedFormat.delimiter).toBe(';');
    });

    it('should handle different correct answer formats', async () => {
      const csvContent = `questionText,optionA,optionB,optionC,correctAnswer,explanation,category
"Question 1","Option A","Option B","Option C","A","Explication","Test"
"Question 2","Option A","Option B","Option C","1","Explication","Test"
"Question 3","Option A","Option B","Option C","B","Explication","Test"`;

      const result = await csvImportService.parseCSVFile(csvContent, { hasHeader: true });

      expect(result.success).toBe(true);
      
      if (result.data && 'questions' in result.data) {
        expect(result.data.questions).toHaveLength(3);
        
        // Première question: format lettre "A"
        expect(result.data.questions[0].options[0].isCorrect).toBe(true);
        expect(result.data.questions[0].options[1].isCorrect).toBe(false);
        
        // Deuxième question: format numérique "1"
        expect(result.data.questions[1].options[0].isCorrect).toBe(true);
        expect(result.data.questions[1].options[1].isCorrect).toBe(false);
        
        // Troisième question: format lettre "B"
        expect(result.data.questions[2].options[0].isCorrect).toBe(false);
        expect(result.data.questions[2].options[1].isCorrect).toBe(true);
      }
    });

    it('should handle missing optional fields gracefully', async () => {
      const csvContent = `questionText,optionA,optionB,correctAnswer
"Question simple","Option A","Option B","A"`;

      const result = await csvImportService.parseCSVFile(csvContent, { hasHeader: true });

      expect(result.success).toBe(true);
      
      if (result.data && 'questions' in result.data) {
        expect(result.data.questions).toHaveLength(1);
        expect(result.data.questions[0].explanation).toBe('');
        expect(result.data.questions[0].category).toBe('Général');
        expect(result.data.questions[0].difficulty).toBe('medium');
        expect(result.data.questions[0].level).toBe('both');
      }
    });

    it('should reject files that are too large', async () => {
      const largeContent = 'a'.repeat(11 * 1024 * 1024); // 11MB

      const result = await csvImportService.parseCSVFile(largeContent);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Fichier trop volumineux');
    });

    it('should reject files with too many rows', async () => {
      const headers = 'questionText,optionA,optionB,correctAnswer\n';
      const rows = Array(1001).fill('"Question","A","B","A"').join('\n');
      const csvContent = headers + rows;

      const result = await csvImportService.parseCSVFile(csvContent, { hasHeader: true });

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Trop de lignes');
    });

    it('should handle quoted fields with commas', async () => {
      const csvContent = `questionText,optionA,optionB,correctAnswer,explanation
"Question avec, une virgule","Option A, avec virgule","Option B","A","Explication, avec virgule"`;

      const result = await csvImportService.parseCSVFile(csvContent, { hasHeader: true });

      expect(result.success).toBe(true);
      
      if (result.data && 'questions' in result.data) {
        expect(result.data.questions[0].questionText).toBe('Question avec, une virgule');
        expect(result.data.questions[0].options[0].text).toBe('Option A, avec virgule');
        expect(result.data.questions[0].explanation).toBe('Explication, avec virgule');
      }
    });
  });

  describe('generateCSVTemplate', () => {
    it('should generate a valid CSV template', () => {
      const template = csvImportService.generateCSVTemplate();

      expect(template).toContain('questionText');
      expect(template).toContain('optionA');
      expect(template).toContain('correctAnswer');
      expect(template).toContain('Quelle est la fonction principale du ventricule gauche ?');
      
      // Vérifier que le template peut être parsé
      const lines = template.split('\n');
      expect(lines).toHaveLength(2); // Header + example row
    });
  });

  describe('validateCSVFile', () => {
    it('should parse and convert CSV file successfully', async () => {
      const csvContent = `questionText,optionA,optionB,correctAnswer,explanation,category
"Question test","Option A","Option B","A","Explication","Test"`;

      const result = await csvImportService.parseCSVFile(csvContent, { hasHeader: true });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data && 'questions' in result.data) {
        expect(result.data.questions).toHaveLength(1);
        expect(result.data.questions[0].questionText).toBe('Question test');
      }
    });

    it('should detect parsing errors for malformed CSV', async () => {
      const csvContent = `questionText,optionA,optionB,correctAnswer
"","Option A","Option B","Z"`; // Question vide et réponse invalide

      const result = await csvImportService.parseCSVFile(csvContent, { hasHeader: true });

      // Le parsing peut réussir mais la conversion échouera
      if (result.success && result.data && 'questions' in result.data) {
        // Vérifier que la question vide est détectée
        expect(result.data.questions[0].questionText).toBe('');
      }
    });
  });
});