/**
 * Service d'import CSV pour le système d'import
 * Responsable du parsing et de la conversion des fichiers CSV vers JSON interne
 */

import { 
  ImportData, 
  QuestionImportData, 
  ImportQuestion, 
  CSVOptions, 
  ImportError, 
  ValidationResponse 
} from '../types/jsonImport';

export interface CSVParsingResult {
  success: boolean;
  data?: ImportData;
  errors: ImportError[];
  warnings: ImportError[];
  detectedFormat: {
    delimiter: string;
    encoding: string;
    hasHeader: boolean;
    columnCount: number;
    rowCount: number;
  };
}

export interface CSVColumnMapping {
  questionText: number;
  optionA: number;
  optionB: number;
  optionC: number;
  optionD: number;
  correctAnswer: number;
  explanation: number;
  category: number;
  difficulty: number;
  level: number;
  tags: number;
}

export class CSVImportService {
  private readonly SUPPORTED_ENCODINGS = ['utf-8', 'iso-8859-1', 'windows-1252'];
  private readonly SUPPORTED_DELIMITERS = [',', ';', '\t'];
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_ROWS = 1000;

  /**
   * Parse un fichier CSV et le convertit en données d'import JSON
   */
  async parseCSVFile(
    fileContent: string | Buffer, 
    options: CSVOptions = {}
  ): Promise<CSVParsingResult> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    try {
      // Validation de la taille du fichier
      const contentSize = Buffer.isBuffer(fileContent) ? fileContent.length : Buffer.byteLength(fileContent, 'utf8');
      if (contentSize > this.MAX_FILE_SIZE) {
        return {
          success: false,
          errors: [{
            type: 'validation',
            severity: 'critical',
            message: `Fichier trop volumineux (${Math.round(contentSize / 1024 / 1024)}MB). Maximum autorisé: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
            suggestion: 'Divisez le fichier en plusieurs parties plus petites'
          }],
          warnings: [],
          detectedFormat: {
            delimiter: ',',
            encoding: 'utf-8',
            hasHeader: false,
            columnCount: 0,
            rowCount: 0
          }
        };
      }

      // Conversion en string avec détection d'encodage
      const csvText = await this.convertToString(fileContent, options.encoding);
      
      // Détection automatique du format
      const detectedFormat = this.detectCSVFormat(csvText, options);
      
      // Parsing du CSV
      const rows = this.parseCSVRows(csvText, detectedFormat.delimiter);
      
      if (rows.length === 0) {
        return {
          success: false,
          errors: [{
            type: 'validation',
            severity: 'critical',
            message: 'Fichier CSV vide ou illisible',
            suggestion: 'Vérifiez que le fichier contient des données et utilise un format CSV standard'
          }],
          warnings: [],
          detectedFormat
        };
      }

      // Validation du nombre de lignes
      if (rows.length > this.MAX_ROWS) {
        errors.push({
          type: 'validation',
          severity: 'critical',
          message: `Trop de lignes dans le fichier (${rows.length}). Maximum autorisé: ${this.MAX_ROWS}`,
          suggestion: 'Divisez le fichier en plusieurs parties plus petites'
        });
        return {
          success: false,
          errors,
          warnings,
          detectedFormat: { ...detectedFormat, rowCount: rows.length }
        };
      }

      // Détection et validation des colonnes
      const columnMapping = this.detectColumnMapping(rows, detectedFormat.hasHeader);
      const mappingValidation = this.validateColumnMapping(columnMapping);
      
      if (!mappingValidation.isValid) {
        errors.push(...mappingValidation.errors);
        return {
          success: false,
          errors,
          warnings,
          detectedFormat: { ...detectedFormat, rowCount: rows.length }
        };
      }

      // Conversion des données
      const conversionResult = this.convertRowsToQuestions(rows, columnMapping, detectedFormat.hasHeader);
      errors.push(...conversionResult.errors);
      warnings.push(...conversionResult.warnings);

      if (conversionResult.questions.length === 0) {
        errors.push({
          type: 'validation',
          severity: 'critical',
          message: 'Aucune question valide trouvée dans le fichier CSV',
          suggestion: 'Vérifiez le format des données et la structure des colonnes'
        });
        return {
          success: false,
          errors,
          warnings,
          detectedFormat: { ...detectedFormat, rowCount: rows.length }
        };
      }

      // Création de la structure d'import JSON
      const importData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'CSV Import',
          created: new Date().toISOString(),
          level: 'both', // Par défaut, sera ajusté selon les données
          description: `Import CSV de ${conversionResult.questions.length} questions`
        },
        questions: conversionResult.questions
      };

      return {
        success: true,
        data: importData,
        errors,
        warnings,
        detectedFormat: { 
          ...detectedFormat, 
          rowCount: rows.length,
          columnCount: rows[0]?.length || 0
        }
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'system',
          severity: 'critical',
          message: `Erreur lors du parsing CSV: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez que le fichier est un CSV valide et réessayez'
        }],
        warnings: [],
        detectedFormat: {
          delimiter: ',',
          encoding: 'utf-8',
          hasHeader: false,
          columnCount: 0,
          rowCount: 0
        }
      };
    }
  }

  /**
   * Convertit le contenu du fichier en string avec détection d'encodage
   */
  private async convertToString(content: string | Buffer, encoding?: string): Promise<string> {
    if (typeof content === 'string') {
      return content;
    }

    // Si un encodage est spécifié, l'utiliser
    if (encoding && this.SUPPORTED_ENCODINGS.includes(encoding)) {
      return content.toString(encoding as BufferEncoding);
    }

    // Détection automatique de l'encodage
    const detectedEncoding = this.detectEncoding(content);
    return content.toString(detectedEncoding as BufferEncoding);
  }

  /**
   * Détecte l'encodage du fichier
   */
  private detectEncoding(buffer: Buffer): string {
    // Vérifier la présence de BOM UTF-8
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return 'utf-8';
    }

    // Vérifier la présence de caractères non-ASCII
    const text = buffer.toString('utf-8');
    const hasNonAscii = /[^\x00-\x7F]/.test(text);
    
    if (!hasNonAscii) {
      return 'utf-8'; // ASCII pur, UTF-8 compatible
    }

    // Tester UTF-8 en vérifiant la validité
    try {
      const utf8Text = buffer.toString('utf-8');
      // Vérifier si la conversion UTF-8 produit des caractères de remplacement
      if (!utf8Text.includes('\uFFFD')) {
        return 'utf-8';
      }
    } catch {
      // UTF-8 invalide
    }

    // Fallback vers ISO-8859-1 pour les fichiers européens
    return 'iso-8859-1';
  }

  /**
   * Détecte automatiquement le format CSV
   */
  private detectCSVFormat(csvText: string, options: CSVOptions): {
    delimiter: string;
    encoding: string;
    hasHeader: boolean;
  } {
    const lines = csvText.split('\n').slice(0, 5); // Analyser les 5 premières lignes
    
    // Détection du délimiteur
    let delimiter = options.delimiter || this.detectDelimiter(lines);
    
    // Détection de l'en-tête
    const hasHeader = options.hasHeader !== undefined ? options.hasHeader : this.detectHeader(lines, delimiter);
    
    return {
      delimiter,
      encoding: options.encoding || 'utf-8',
      hasHeader
    };
  }

  /**
   * Détecte le délimiteur CSV
   */
  private detectDelimiter(lines: string[]): string {
    const delimiters = this.SUPPORTED_DELIMITERS;
    const scores: Record<string, number> = {};

    delimiters.forEach(delimiter => {
      let score = 0;
      let columnCounts: number[] = [];

      lines.forEach(line => {
        if (line.trim()) {
          const columns = this.splitCSVLine(line, delimiter);
          columnCounts.push(columns.length);
          
          // Bonus si la ligne contient le délimiteur
          if (line.includes(delimiter)) {
            score += 1;
          }
        }
      });

      // Bonus pour la consistance du nombre de colonnes
      if (columnCounts.length > 1) {
        const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
        const consistency = columnCounts.filter(count => Math.abs(count - avgColumns) <= 1).length / columnCounts.length;
        score += consistency * 10;
      }

      scores[delimiter] = score;
    });

    // Retourner le délimiteur avec le meilleur score
    return Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
  }

  /**
   * Détecte si la première ligne est un en-tête
   */
  private detectHeader(lines: string[], delimiter: string): boolean {
    if (lines.length < 2) return false;

    const firstLine = this.splitCSVLine(lines[0], delimiter);
    const secondLine = this.splitCSVLine(lines[1], delimiter);

    // Mots-clés typiques d'en-têtes de questions
    const headerKeywords = [
      'question', 'option', 'correct', 'answer', 'explanation', 
      'category', 'difficulty', 'level', 'tags',
      'questiontext', 'optiona', 'optionb', 'optionc', 'optiond'
    ];

    // Vérifier si la première ligne contient des mots-clés d'en-tête
    const headerScore = firstLine.reduce((score, cell) => {
      const cellLower = cell.toLowerCase().replace(/[^a-z]/g, '');
      return score + (headerKeywords.some(keyword => cellLower.includes(keyword)) ? 1 : 0);
    }, 0);

    // Vérifier si la deuxième ligne contient des données typiques
    const dataScore = secondLine.reduce((score, cell) => {
      // Les données contiennent généralement plus de mots ou des valeurs spécifiques
      if (cell.length > 10 || /^(easy|medium|hard|PASS|LAS|both)$/i.test(cell.trim())) {
        return score + 1;
      }
      return score;
    }, 0);

    return headerScore >= 2 && dataScore >= 1;
  }

  /**
   * Parse les lignes CSV
   */
  private parseCSVRows(csvText: string, delimiter: string): string[][] {
    const lines = csvText.split('\n');
    const rows: string[][] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        const columns = this.splitCSVLine(trimmedLine, delimiter);
        if (columns.length > 1) { // Ignorer les lignes avec une seule colonne
          rows.push(columns);
        }
      }
    }

    return rows;
  }

  /**
   * Divise une ligne CSV en colonnes en gérant les guillemets
   */
  private splitCSVLine(line: string, delimiter: string): string[] {
    const columns: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Guillemet échappé
          current += '"';
          i += 2;
        } else {
          // Début ou fin de guillemets
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // Délimiteur trouvé hors guillemets
        columns.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Ajouter la dernière colonne
    columns.push(current.trim());

    // Nettoyer les guillemets en début/fin
    return columns.map(col => {
      if (col.startsWith('"') && col.endsWith('"')) {
        return col.slice(1, -1);
      }
      return col;
    });
  }

  /**
   * Détecte le mapping des colonnes
   */
  private detectColumnMapping(rows: string[][], hasHeader: boolean): Partial<CSVColumnMapping> {
    const mapping: Partial<CSVColumnMapping> = {};
    const headerRow = hasHeader && rows.length > 0 ? rows[0] : null;

    if (headerRow) {
      // Mapping basé sur les en-têtes
      headerRow.forEach((header, index) => {
        const headerLower = header.toLowerCase().replace(/[^a-z]/g, '');
        
        if (headerLower.includes('question') || headerLower.includes('text')) {
          mapping.questionText = index;
        } else if (headerLower.includes('optiona') || headerLower === 'a') {
          mapping.optionA = index;
        } else if (headerLower.includes('optionb') || headerLower === 'b') {
          mapping.optionB = index;
        } else if (headerLower.includes('optionc') || headerLower === 'c') {
          mapping.optionC = index;
        } else if (headerLower.includes('optiond') || headerLower === 'd') {
          mapping.optionD = index;
        } else if (headerLower.includes('correct') || headerLower.includes('answer')) {
          mapping.correctAnswer = index;
        } else if (headerLower.includes('explanation')) {
          mapping.explanation = index;
        } else if (headerLower.includes('category')) {
          mapping.category = index;
        } else if (headerLower.includes('difficulty')) {
          mapping.difficulty = index;
        } else if (headerLower.includes('level')) {
          mapping.level = index;
        } else if (headerLower.includes('tags')) {
          mapping.tags = index;
        }
      });
    } else {
      // Mapping par position (format standard attendu)
      if (rows[0] && rows[0].length >= 7) {
        mapping.questionText = 0;
        mapping.optionA = 1;
        mapping.optionB = 2;
        mapping.optionC = 3;
        mapping.optionD = 4;
        mapping.correctAnswer = 5;
        mapping.explanation = 6;
        
        if (rows[0].length >= 8) mapping.category = 7;
        if (rows[0].length >= 9) mapping.difficulty = 8;
        if (rows[0].length >= 10) mapping.level = 9;
        if (rows[0].length >= 11) mapping.tags = 10;
      }
    }

    return mapping;
  }

  /**
   * Valide le mapping des colonnes
   */
  private validateColumnMapping(mapping: Partial<CSVColumnMapping>): { isValid: boolean; errors: ImportError[] } {
    const errors: ImportError[] = [];
    const requiredFields = ['questionText', 'optionA', 'optionB', 'correctAnswer'];

    requiredFields.forEach(field => {
      if (mapping[field as keyof CSVColumnMapping] === undefined) {
        errors.push({
          type: 'validation',
          severity: 'critical',
          field,
          message: `Colonne requise manquante: ${field}`,
          suggestion: `Assurez-vous que votre CSV contient une colonne pour ${field}`
        });
      }
    });

    // Vérifier qu'il y a au moins 2 options
    const optionFields = ['optionA', 'optionB', 'optionC', 'optionD'];
    const availableOptions = optionFields.filter(field => 
      mapping[field as keyof CSVColumnMapping] !== undefined
    );

    if (availableOptions.length < 2) {
      errors.push({
        type: 'validation',
        severity: 'critical',
        message: 'Au moins 2 colonnes d\'options sont requises',
        suggestion: 'Ajoutez des colonnes optionA, optionB, etc.'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convertit les lignes CSV en questions d'import
   */
  private convertRowsToQuestions(
    rows: string[][], 
    mapping: Partial<CSVColumnMapping>, 
    hasHeader: boolean
  ): { questions: ImportQuestion[]; errors: ImportError[]; warnings: ImportError[] } {
    const questions: ImportQuestion[] = [];
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];
    
    const dataRows = hasHeader ? rows.slice(1) : rows;

    dataRows.forEach((row, index) => {
      const rowIndex = hasHeader ? index + 1 : index;
      
      try {
        const question = this.convertRowToQuestion(row, mapping, rowIndex);
        if (question) {
          questions.push(question);
        }
      } catch (error) {
        errors.push({
          type: 'mapping',
          severity: 'major',
          itemIndex: rowIndex,
          message: `Erreur lors de la conversion de la ligne ${rowIndex + 1}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          suggestion: 'Vérifiez le format des données dans cette ligne'
        });
      }
    });

    return { questions, errors, warnings };
  }

  /**
   * Convertit une ligne CSV en question d'import
   */
  private convertRowToQuestion(
    row: string[], 
    mapping: Partial<CSVColumnMapping>, 
    rowIndex: number
  ): ImportQuestion | null {
    // Extraire les données de base
    const questionText = this.getColumnValue(row, mapping.questionText);
    const optionA = this.getColumnValue(row, mapping.optionA);
    const optionB = this.getColumnValue(row, mapping.optionB);
    const optionC = this.getColumnValue(row, mapping.optionC);
    const optionD = this.getColumnValue(row, mapping.optionD);
    const correctAnswer = this.getColumnValue(row, mapping.correctAnswer);

    // Validation des champs requis
    if (!questionText || !optionA || !optionB || !correctAnswer) {
      throw new Error('Champs requis manquants (question, options A/B, réponse correcte)');
    }

    // Construire les options
    const options = [
      { text: optionA, isCorrect: false },
      { text: optionB, isCorrect: false }
    ];

    if (optionC) options.push({ text: optionC, isCorrect: false });
    if (optionD) options.push({ text: optionD, isCorrect: false });

    // Déterminer la bonne réponse
    const correctIndex = this.parseCorrectAnswer(correctAnswer, options.length);
    if (correctIndex === -1) {
      throw new Error(`Réponse correcte invalide: "${correctAnswer}"`);
    }

    options[correctIndex].isCorrect = true;

    // Extraire les métadonnées optionnelles
    const explanation = this.getColumnValue(row, mapping.explanation) || '';
    const category = this.getColumnValue(row, mapping.category) || 'Général';
    const difficulty = this.parseDifficulty(this.getColumnValue(row, mapping.difficulty));
    const level = this.parseLevel(this.getColumnValue(row, mapping.level));
    const tags = this.parseTags(this.getColumnValue(row, mapping.tags));

    return {
      questionText: questionText.trim(),
      options,
      explanation: explanation.trim(),
      category: category.trim(),
      difficulty,
      level,
      tags: tags.length > 0 ? tags : undefined
    };
  }

  /**
   * Récupère la valeur d'une colonne
   */
  private getColumnValue(row: string[], columnIndex?: number): string {
    if (columnIndex === undefined || columnIndex < 0 || columnIndex >= row.length) {
      return '';
    }
    return row[columnIndex]?.trim() || '';
  }

  /**
   * Parse la réponse correcte (A, B, C, D ou 1, 2, 3, 4)
   */
  private parseCorrectAnswer(correctAnswer: string, optionCount: number): number {
    const answer = correctAnswer.trim().toUpperCase();
    
    // Format lettre (A, B, C, D)
    if (/^[A-D]$/.test(answer)) {
      const index = answer.charCodeAt(0) - 'A'.charCodeAt(0);
      return index < optionCount ? index : -1;
    }
    
    // Format numérique (1, 2, 3, 4)
    if (/^[1-4]$/.test(answer)) {
      const index = parseInt(answer) - 1;
      return index < optionCount ? index : -1;
    }
    
    return -1;
  }

  /**
   * Parse le niveau de difficulté
   */
  private parseDifficulty(difficulty: string): 'easy' | 'medium' | 'hard' {
    const diff = difficulty.toLowerCase().trim();
    
    if (['easy', 'facile', '1'].includes(diff)) return 'easy';
    if (['hard', 'difficile', '3'].includes(diff)) return 'hard';
    
    return 'medium'; // Par défaut
  }

  /**
   * Parse le niveau étudiant
   */
  private parseLevel(level: string): 'PASS' | 'LAS' | 'both' {
    const lvl = level.toUpperCase().trim();
    
    if (lvl === 'PASS') return 'PASS';
    if (lvl === 'LAS') return 'LAS';
    
    return 'both'; // Par défaut
  }

  /**
   * Parse les tags (séparés par des virgules)
   */
  private parseTags(tags: string): string[] {
    if (!tags) return [];
    
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 10); // Limiter à 10 tags maximum
  }

  /**
   * Génère un template CSV pour l'utilisateur
   */
  generateCSVTemplate(): string {
    const headers = [
      'questionText',
      'optionA',
      'optionB', 
      'optionC',
      'optionD',
      'correctAnswer',
      'explanation',
      'category',
      'difficulty',
      'level',
      'tags'
    ];

    const exampleRow = [
      'Quelle est la fonction principale du ventricule gauche ?',
      'Pomper le sang vers l\'aorte',
      'Recevoir le sang des veines',
      'Filtrer le sang',
      'Produire les globules rouges',
      'A',
      'Le ventricule gauche pompe le sang oxygéné vers l\'aorte et la circulation systémique',
      'Cardiologie',
      'medium',
      'PASS',
      'anatomie,cœur,circulation'
    ];

    return [headers, exampleRow]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Valide un fichier CSV avant traitement complet
   */
  async validateCSVFile(fileContent: string | Buffer, options: CSVOptions = {}): Promise<ValidationResponse> {
    const parsingResult = await this.parseCSVFile(fileContent, options);
    
    if (!parsingResult.success || !parsingResult.data) {
      return {
        isValid: false,
        errors: parsingResult.errors,
        warnings: parsingResult.warnings,
        summary: {
          totalItems: 0,
          validItems: 0,
          invalidItems: parsingResult.errors.length,
          duplicates: 0,
          missingCategories: []
        }
      };
    }

    // Utiliser le service de validation JSON existant pour valider les données converties
    const { JSONValidationService } = await import('./JSONValidationService');
    const validationService = new JSONValidationService();
    
    return await validationService.validateImportData(parsingResult.data, 'questions');
  }
}