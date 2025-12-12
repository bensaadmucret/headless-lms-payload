import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUIZ_DIR = path.join(__dirname, '../../quiz-json-examples');

interface QuizFile {
  title?: string;
  questionCount?: number;
  questions?: unknown[];
  [key: string]: unknown;
}

function auditQuizFile(filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as QuizFile;

  const fileName = path.basename(filePath);
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const realCount = questions.length;
  const declaredCount = typeof data.questionCount === 'number' ? data.questionCount : undefined;

  let changed = false;

  if (declaredCount !== realCount) {
    data.questionCount = realCount;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  const missing = Math.max(0, 20 - realCount);

  return {
    fileName,
    title: data.title || fileName,
    realCount,
    missing,
    changed,
  };
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

  console.log(`Audit de ${files.length} fichier(s) dans ${QUIZ_DIR}...`);
  console.log('-----------------------------------------------');

  const summary: Array<ReturnType<typeof auditQuizFile>> = [];

  for (const file of files) {
    const fullPath = path.join(QUIZ_DIR, file);
    try {
      const result = auditQuizFile(fullPath);
      summary.push(result);

      console.log(
        `${result.fileName} | questions: ${result.realCount} | manquantes pour 20: ${result.missing}` +
          (result.changed ? ' (questionCount ajusté)' : ''),
      );
    } catch (e) {
      console.error(`[ERROR] ${file}: échec de l'audit - ${(e as Error).message}`);
    }
  }

  console.log('-----------------------------------------------');

  const needingMore = summary.filter((s) => s.missing > 0);
  if (needingMore.length === 0) {
    console.log('✅ Tous les quiz ont au moins 20 questions.');
  } else {
    console.log('📌 Quiz avec moins de 20 questions :');
    needingMore.forEach((s) => {
      console.log(`- ${s.fileName} (${s.title}) : ${s.realCount} questions, il en manque ${s.missing}`);
    });
  }
}

main();
