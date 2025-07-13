/**
 * Script d'importation de données pour Payload CMS via l'API REST
 * 
 * Ce script importe les données du fichier data.json dans Payload CMS en utilisant l'API REST.
 * Il gère les relations entre les entités et transforme les données au format attendu.
 * 
 * Prérequis :
 * 1. Le serveur Payload doit être en cours d'exécution
 * 2. Un utilisateur admin doit exister
 * 
 * Pour exécuter :
 * node src/scripts/import-data-rest.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import readline from 'readline';

// Configuration des variables d'environnement
dotenv.config();

// Chemin vers le fichier de données
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(__dirname, 'data.json');

// URL de base de l'API Payload
const API_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000';
const API_BASE = `${API_URL}/api`;

// Création d'une interface readline pour les interactions utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour poser une question et obtenir une réponse
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Fonction principale d'importation des données
 */
async function importData() {
  console.log('🚀 Démarrage de l\'importation des données via API REST...');
  
  try {
    // Lecture du fichier de données
    const jsonDataRaw = fs.readFileSync(dataPath, 'utf-8');
    const jsonData = JSON.parse(jsonDataRaw);
    console.log(`📝 Fichier de données lu avec succès (${Object.keys(jsonData).length} collections)`);
    
    // Authentification pour obtenir un jeton API
    console.log('\n🔐 Authentification à l\'API Payload...');
    const email = await question('Email administrateur : ');
    const password = await question('Mot de passe : ');
    
    const authResponse = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!authResponse.ok) {
      throw new Error(`Échec de l'authentification: ${authResponse.status} ${authResponse.statusText}`);
    }
    
    const authData = await authResponse.json();
    const token = authData.token;
    
    if (!token) {
      throw new Error('Jeton d\'authentification non reçu');
    }
    
    console.log('✅ Authentification réussie');
    
    // Headers pour les requêtes authentifiées
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `JWT ${token}`,
    };
    
    // 1. Import des cours
    console.log('\n📚 ÉTAPE 1: Import des cours...');
    const courseDocs = [];
    
    for (const course of jsonData.courses) {
      // Vérification si le cours existe déjà
      const searchResponse = await fetch(`${API_BASE}/courses?where[title][equals]=${encodeURIComponent(course.title)}`, {
        headers: authHeaders,
      });
      
      const searchData = await searchResponse.json();
      
      if (searchData.docs && searchData.docs.length > 0) {
        console.log(`⏩ Le cours "${course.title}" existe déjà, utilisation de l'existant.`);
        courseDocs.push(searchData.docs[0]);
        continue;
      }
      
      // Conversion du niveau en type valide
      const validLevel = validateCourseLevel(course.level);
      
      // Création du cours
      try {
        const createResponse = await fetch(`${API_BASE}/courses`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            title: course.title,
            description: course.description,
            level: validLevel,
          }),
        });
        
        if (!createResponse.ok) {
          throw new Error(`Erreur HTTP: ${createResponse.status} ${createResponse.statusText}`);
        }
        
        const newCourse = await createResponse.json();
        console.log(`✅ Cours créé: ${course.title}`);
        courseDocs.push(newCourse);
      } catch (error) {
        console.error(`❌ Erreur lors de la création du cours "${course.title}":`, error.message);
      }
    }
    
    // 2. Import des catégories
    console.log('\n🏷️ ÉTAPE 2: Import des catégories...');
    const categoryDocs = [];
    
    for (const category of jsonData.categories) {
      // Vérification si la catégorie existe déjà
      const searchResponse = await fetch(`${API_BASE}/categories?where[title][equals]=${encodeURIComponent(category.title)}`, {
        headers: authHeaders,
      });
      
      const searchData = await searchResponse.json();
      
      if (searchData.docs && searchData.docs.length > 0) {
        console.log(`⏩ La catégorie "${category.title}" existe déjà, utilisation de l'existante.`);
        categoryDocs.push(searchData.docs[0]);
        continue;
      }
      
      // Création de la catégorie
      try {
        const createResponse = await fetch(`${API_BASE}/categories`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            title: category.title,
            description: category.description || '',
          }),
        });
        
        if (!createResponse.ok) {
          throw new Error(`Erreur HTTP: ${createResponse.status} ${createResponse.statusText}`);
        }
        
        const newCategory = await createResponse.json();
        console.log(`✅ Catégorie créée: ${category.title}`);
        categoryDocs.push(newCategory);
      } catch (error) {
        console.error(`❌ Erreur lors de la création de la catégorie "${category.title}":`, error.message);
      }
    }
    
    // 3. Import des questions
    console.log('\n❓ ÉTAPE 3: Import des questions...');
    const questionDocs = [];
    
    for (const question of jsonData.questions) {
      // Recherche de la catégorie correspondante
      const categoryDoc = categoryDocs.find(cat => cat?.title === question.categoryTitle);
      
      if (!categoryDoc) {
        console.warn(`⚠️ Catégorie "${question.categoryTitle}" non trouvée pour la question "${question.questionText.substring(0, 30)}..."`);
      }
      
      // Vérification si la question existe déjà
      // Note: Cette vérification est approximative car on ne peut pas facilement chercher dans le Rich Text via l'API
      const searchResponse = await fetch(`${API_BASE}/questions?limit=100`, {
        headers: authHeaders,
      });
      
      const searchData = await searchResponse.json();
      
      // Vérification approximative par le texte de la question
      const questionExists = searchData.docs.some(q => {
        try {
          const qText = q.questionText?.root?.children[0]?.children[0]?.text || '';
          return qText.trim().toLowerCase().startsWith(question.questionText.trim().toLowerCase().substring(0, 30));
        } catch (e) {
          return false;
        }
      });
      
      if (questionExists) {
        console.log(`⏩ Question "${question.questionText.substring(0, 30)}..." existe déjà, ignorée.`);
        continue;
      }
      
      // Préparation du Rich Text pour questionText compatible avec l'éditeur Lexical
      const richTextQuestionText = {
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: question.questionText,
                  type: 'text',
                  version: 1
                }
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              type: 'paragraph',
              version: 1
            }
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'root',
          version: 1
        }
      };
      
      // Préparation des options avec le bon format
      const options = question.options.map(opt => ({
        optionText: opt.text, // Mapping de text vers optionText
        isCorrect: opt.isCorrect,
      }));
      
      // Si pas de catégorie trouvée, on utilise la première disponible ou on saute la question
      if (!categoryDoc && categoryDocs.length > 0) {
        console.warn(`⚠️ Catégorie "${question.categoryTitle}" non trouvée, utilisation de la première catégorie disponible.`);
      } else if (!categoryDoc) {
        console.error(`❌ Impossible de créer la question "${question.questionText.substring(0, 30)}..." sans catégorie.`);
        continue;
      }
      
      // Vérification que nous avons un cours disponible
      if (!courseDocs[0]?.id) {
        console.error(`❌ Impossible de créer la question "${question.questionText.substring(0, 30)}..." sans cours.`);
        continue;
      }
      
      // Création de la question
      try {
        const createResponse = await fetch(`${API_BASE}/questions`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            questionText: richTextQuestionText,
            questionType: 'multipleChoice', // Valeur fixe conforme au modèle
            options: options,
            explanation: question.explanation || 'Pas d\'explication disponible.',
            category: categoryDoc ? categoryDoc.id : categoryDocs[0].id, // Utilisation de la première catégorie si non trouvée
            course: courseDocs[0].id, // Association au premier cours par défaut
          }),
        });
        
        if (!createResponse.ok) {
          throw new Error(`Erreur HTTP: ${createResponse.status} ${createResponse.statusText}`);
        }
        
        const newQuestion = await createResponse.json();
        console.log(`✅ Question créée: "${question.questionText.substring(0, 30)}..."`);
        questionDocs.push(newQuestion);
      } catch (error) {
        console.error(`❌ Erreur lors de la création de la question "${question.questionText.substring(0, 30)}...":`, error.message);
      }
    }
    
    // 4. Import des quizzes
    console.log('\n📝 ÉTAPE 4: Import des quizzes...');
    
    for (const quiz of jsonData.quizzes) {
      // Recherche du cours correspondant
      const courseDoc = courseDocs.find(c => c?.title === quiz.courseTitle);
      
      if (!courseDoc) {
        console.warn(`⚠️ Cours "${quiz.courseTitle}" non trouvé pour le quiz "${quiz.title}"`);
        continue;
      }
      
      // Vérification si le quiz existe déjà
      const searchResponse = await fetch(`${API_BASE}/quizzes?where[title][equals]=${encodeURIComponent(quiz.title)}`, {
        headers: authHeaders,
      });
      
      const searchData = await searchResponse.json();
      
      if (searchData.docs && searchData.docs.length > 0) {
        console.log(`⏩ Le quiz "${quiz.title}" existe déjà, utilisation de l'existant.`);
        continue;
      }
      
      // Recherche des questions associées
      const quizQuestions = [];
      
      // Vérifie si nous avons des questions dans questionTexts (format correct du JSON)
      if (quiz.questionTexts && Array.isArray(quiz.questionTexts)) {
        console.log(`Début de la recherche des questions pour le quiz "${quiz.title}"...`);
        
        // Récupérer toutes les questions disponibles
        const allQuestionsResponse = await fetch(`${API_BASE}/questions?limit=100`, {
          headers: authHeaders
        });
        
        if (!allQuestionsResponse.ok) {
          console.error(`❌ Erreur lors de la récupération des questions: ${allQuestionsResponse.status}`);
          continue;
        }
        
        const allQuestionsData = await allQuestionsResponse.json();
        const allQuestions = allQuestionsData.docs || [];
        
        console.log(`Nombre total de questions disponibles: ${allQuestions.length}`);
        
        // Pour chaque texte de question dans le quiz
        for (const text of quiz.questionTexts) {
          // Normalisation du texte de recherche (suppression de la ponctuation, minuscules)
          const normalizedSearchText = text.toLowerCase().replace(/[.,?!;:]/g, '').trim();
          
          // Recherche de la question par correspondance approximative
          const question = allQuestions.find(q => {
            try {
              // Extraction du texte de la question depuis la structure Rich Text
              const richTextContent = q.questionText?.root?.children[0]?.children[0]?.text || '';
              
              // Normalisation du texte de la question (suppression de la ponctuation, minuscules)
              const normalizedQuestionText = richTextContent.toLowerCase().replace(/[.,?!;:]/g, '').trim();
              
              // Vérification si le texte normalisé de recherche est contenu dans le texte normalisé de la question
              // ou si le texte normalisé de la question est contenu dans le texte normalisé de recherche
              return normalizedQuestionText.includes(normalizedSearchText) || 
                     normalizedSearchText.includes(normalizedQuestionText);
            } catch (e) {
              return false;
            }
          });
          
          if (question) {
            console.log(`✅ Question trouvée pour "${text}"`);
            quizQuestions.push(question.id);
          } else {
            console.warn(`⚠️ Question "${text.substring(0, 30)}..." non trouvée pour le quiz "${quiz.title}"`);
          }
        }
      } else {
        console.error(`❌ Aucune question définie dans questionTexts pour le quiz "${quiz.title}"`);
      }
      
      // Vérification que nous avons au moins une question
      if (quizQuestions.length === 0) {
        console.error(`❌ Impossible de créer le quiz "${quiz.title}" car aucune question n'a été trouvée.`);
        continue;
      }
      
      // Création du quiz avec uniquement les champs acceptés par le modèle
      try {
        const createResponse = await fetch(`${API_BASE}/quizzes`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            title: quiz.title,
            course: courseDoc.id,
            questions: quizQuestions,
            published: true, // Par défaut, on publie le quiz
          }),
        });
        
        if (!createResponse.ok) {
          throw new Error(`Erreur HTTP: ${createResponse.status} ${createResponse.statusText}`);
        }
        
        const newQuiz = await createResponse.json();
        console.log(`✅ Quiz créé: ${quiz.title} avec ${quizQuestions.length} questions`);
      } catch (error) {
        console.error(`❌ Erreur lors de la création du quiz "${quiz.title}":`, error.message);
      }
    }
    
    console.log('\n✅✅✅ Importation terminée avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur fatale lors de l\'importation:', error);
  } finally {
    // Fermeture de l'interface readline
    rl.close();
  }
}

/**
 * Valide et convertit le niveau du cours en une valeur acceptable
 */
function validateCourseLevel(level) {
  level = level.toLowerCase();
  
  if (level === 'beginner' || level === 'débutant') return 'beginner';
  if (level === 'intermediate' || level === 'intermédiaire') return 'intermediate';
  if (level === 'advanced' || level === 'avancé') return 'advanced';
  
  // Valeur par défaut
  console.warn(`⚠️ Niveau de cours "${level}" non reconnu, utilisation de "beginner" par défaut.`);
  return 'beginner';
}

// Exécution du script
importData();
