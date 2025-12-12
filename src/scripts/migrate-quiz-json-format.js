import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUIZ_DIR = path.join(__dirname, '../../quiz-json-examples');

function mapLevel(studentLevel) {
  if (studentLevel === 'PASS' || studentLevel === 'LAS' || studentLevel === 'both') {
    return studentLevel;
  }
  return 'both';
}

function transformQuestions(data, fileName) {
  const level = mapLevel(data.studentLevel);
  const category = data.category || 'Général';

  if (!Array.isArray(data.questions)) {
    console.warn(`[SKIP] ${fileName}: pas de champ questions[]`);
    return null;
  }

  const sample = data.questions[0];
  if (sample && Array.isArray(sample.options) && sample.options.length > 0 && typeof sample.options[0] === 'object') {
    console.log(`[SKIP] ${fileName}: déjà au format options { text, isCorrect }`);
    return null;
  }

  const transformedQuestions = data.questions.map((q, idx) => {
    if (!Array.isArray(q.options)) {
      throw new Error(`Question ${idx + 1}: champ options manquant ou invalide`);
    }

    const opts = q.options.map((opt) => ({
      text: String(opt),
      isCorrect: opt === q.correctAnswer,
    }));

    if (!opts.some((o) => o.isCorrect)) {
      console.warn(`[WARN] ${fileName}: aucune option marquée correcte pour la question ${idx + 1}`);
    }

    return {
      questionText: q.questionText,
      options: opts,
      explanation: q.explanation || '',
      category,
      difficulty: q.difficulty || data.difficulty || 'medium',
      level,
      ...(q.tags ? { tags: q.tags } : {}),
    };
  });

  return { level, category, questions: transformedQuestions };
}

function transformFile(filePath) {
  const fileName = path.basename(filePath);

  const raw = fs.readFileSync(filePath, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`[ERROR] ${fileName}: JSON invalide - ${e.message}`);
    return;
  }

  const result = transformQuestions(data, fileName);
  if (!result) return;

  const { level, category, questions } = result;

  const newData = {
    version: data.version || '1.0',
    type: 'questions',
    metadata: {
      source: data.title || category || 'Import JSON',
      created: '2025-01-01',
      level,
      description: data.description || '',
    },
    title: data.title,
    description: data.description,
    category,
    studentLevel: data.studentLevel || level,
    difficulty: data.difficulty || 'medium',
    questionCount: questions.length,
    questions,
  };

  fs.writeFileSync(filePath, JSON.stringify(newData, null, 2) + '\n', 'utf-8');
  console.log(`[OK] ${fileName}: transformé au format type="questions"`);
}

function main() {
  if (!fs.existsSync(QUIZ_DIR)) {
    console.error(`Dossier introuvable: ${QUIZ_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(QUIZ_DIR)
    .filter((f) => f.startsWith('quiz-') && f.endsWith('.json'));

  if (files.length === 0) {
    console.log('Aucun fichier quiz-*.json trouvé.');
    return;
  }

  console.log(`Transformation de ${files.length} fichier(s) dans ${QUIZ_DIR}...`);

  for (const file of files) {
    const fullPath = path.join(QUIZ_DIR, file);
    try {
      transformFile(fullPath);
    } catch (e) {
      console.error(`[ERROR] ${file}: échec de la transformation - ${e.message}`);
    }
  }

  console.log('Terminé.');
}

main();
