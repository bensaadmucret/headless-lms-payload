const axios = require('axios')
const { config } = require('dotenv')

// Charger les variables d'environnement
config()

const API_BASE = 'http://localhost:3000/api'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// Configuration pour les catégories médicales
const MEDICAL_CATEGORIES = [
  {
    title: 'Anatomie générale',
    description: 'Structure et organisation du corps humain'
  },
  {
    title: 'Physiologie',
    description: 'Fonctionnement normal des organes et systèmes'
  },
  {
    title: 'Biochimie',
    description: 'Processus chimiques dans l\'organisme'
  },
  {
    title: 'Pharmacologie',
    description: 'Médicaments et leurs effets'
  },
  {
    title: 'Pathologie',
    description: 'Maladies et leurs mécanismes'
  },
  {
    title: 'Cardiologie',
    description: 'Système cardiovasculaire'
  },
  {
    title: 'Neurologie',
    description: 'Système nerveux'
  }
]

// Template pour générer des questions via IA
const QUESTION_PROMPT_TEMPLATE = `
Génère une question de quiz médical de niveau PASS pour la catégorie "{category}".

Critères:
- Question de type QCM avec 4 options (A, B, C, D)
- Niveau première année médecine (PASS)
- Une seule réponse correcte
- Explication claire et pédagogique
- Vocabulaire médical adapté au niveau

Format de réponse (JSON strict):
{
  "question": "Texte de la question",
  "options": [
    {"text": "Option A", "correct": false},
    {"text": "Option B", "correct": true},
    {"text": "Option C", "correct": false},
    {"text": "Option D", "correct": false}
  ],
  "explanation": "Explication détaillée de la réponse correcte"
}

Catégorie: {category}
`

// Fonction pour générer une question via IA
async function generateQuestionWithAI(category) {
  if (!GEMINI_API_KEY) {
    console.log('⚠️  Clé Gemini manquante, utilisation de questions par défaut')
    return getDefaultQuestion(category)
  }

  try {
    const prompt = QUESTION_PROMPT_TEMPLATE.replace(/{category}/g, category)
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    )

    const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!generatedText) {
      throw new Error('Réponse IA invalide')
    }

    // Extraire le JSON de la réponse
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Format JSON non trouvé dans la réponse IA')
    }

    const questionData = JSON.parse(jsonMatch[0])
    console.log(`✅ Question IA générée pour ${category}`)
    return questionData

  } catch (error) {
    console.log(`⚠️  Erreur génération IA pour ${category}:`, error.message)
    return getDefaultQuestion(category)
  }
}

// Questions par défaut en cas d'échec IA
function getDefaultQuestion(category) {
  const defaultQuestions = {
    'Anatomie générale': {
      question: "Quel os forme la partie postérieure du crâne ?",
      options: [
        {text: "Frontal", correct: false},
        {text: "Pariétal", correct: false},
        {text: "Occipital", correct: true},
        {text: "Temporal", correct: false}
      ],
      explanation: "L'os occipital forme la partie postérieure du crâne et contient le foramen magnum par lequel passe la moelle épinière."
    },
    'Physiologie': {
      question: "Quelle est la valeur normale de la pression artérielle systolique chez un adulte sain ?",
      options: [
        {text: "90-100 mmHg", correct: false},
        {text: "120-140 mmHg", correct: true},
        {text: "150-160 mmHg", correct: false},
        {text: "180-200 mmHg", correct: false}
      ],
      explanation: "La pression artérielle systolique normale se situe entre 120 et 140 mmHg chez un adulte sain au repos."
    },
    'Biochimie': {
      question: "Quel est le principal glucide de réserve dans le foie ?",
      options: [
        {text: "Glucose", correct: false},
        {text: "Fructose", correct: false},
        {text: "Glycogène", correct: true},
        {text: "Lactose", correct: false}
      ],
      explanation: "Le glycogène est la forme de stockage du glucose dans le foie et les muscles, facilement mobilisable en cas de besoin énergétique."
    }
  }
  
  return defaultQuestions[category] || defaultQuestions['Anatomie générale']
}

// Fonction principale de seed
async function seedPlacementQuiz() {
  console.log('🌱 Démarrage du seed pour le quiz de positionnement...\n')

  try {
    // 1. Créer les catégories
    console.log('📁 Création des catégories...')
    const createdCategories = []
    
    for (const category of MEDICAL_CATEGORIES) {
      try {
        const response = await axios.post(`${API_BASE}/categories`, category)
        createdCategories.push(response.data.doc)
        console.log(`✅ Catégorie créée: ${category.title}`)
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('duplicate')) {
          // Récupérer la catégorie existante
          try {
            const existing = await axios.get(`${API_BASE}/categories?where[title][equals]=${encodeURIComponent(category.title)}`)
            if (existing.data.docs && existing.data.docs.length > 0) {
              createdCategories.push(existing.data.docs[0])
              console.log(`ℹ️  Catégorie existante: ${category.title}`)
            }
          } catch (fetchError) {
            console.error(`❌ Erreur récupération ${category.title}:`, fetchError.message)
          }
        } else {
          console.error(`❌ Erreur création ${category.title}:`, error.message)
        }
      }
    }

    console.log(`\n📊 ${createdCategories.length} catégories disponibles\n`)

    // 2. Générer et créer les questions via IA
    console.log('🤖 Génération des questions via IA...')
    const createdQuestions = []
    
    // Créer 2 questions par catégorie (ou moins si peu de catégories)
    const questionsPerCategory = Math.min(2, Math.ceil(10 / createdCategories.length))
    
    for (const category of createdCategories.slice(0, 5)) { // Limiter à 5 catégories pour commencer
      for (let i = 0; i < questionsPerCategory; i++) {
        try {
          console.log(`🔄 Génération question ${i + 1} pour ${category.title}...`)
          
          // Générer la question via IA
          const questionData = await generateQuestionWithAI(category.title)
          
          // Formater pour Payload CMS
          const questionPayload = {
            category: category.id,
            questionText: {
              root: {
                children: [{
                  children: [{ text: questionData.question, type: "text" }],
                  direction: "ltr",
                  format: "",
                  indent: 0,
                  type: "paragraph",
                  version: 1
                }],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "root",
                version: 1
              }
            },
            questionType: 'multipleChoice',
            options: questionData.options.map(opt => ({
              optionText: opt.text,
              isCorrect: opt.correct
            })),
            explanation: questionData.explanation,
            difficultyLevel: 'pass'
          }

          // Créer la question dans Payload
          const response = await axios.post(`${API_BASE}/questions`, questionPayload)
          createdQuestions.push(response.data.doc)
          console.log(`✅ Question créée: ${questionData.question.substring(0, 50)}...`)
          
          // Délai pour éviter de surcharger l'API IA
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (error) {
          console.error(`❌ Erreur création question pour ${category.title}:`, error.message)
        }
      }
    }

    console.log(`\n🎯 ${createdQuestions.length} questions créées\n`)

    // 3. Créer le quiz de positionnement
    console.log('🧩 Création du quiz de positionnement...')
    
    try {
      const quizPayload = {
        title: 'Quiz de Positionnement - Médecine PASS',
        quizType: 'placement',
        description: 'Ce quiz évalue vos connaissances de base en médecine pour personnaliser votre parcours d\'apprentissage. Il couvre les domaines fondamentaux de la première année de médecine.',
        questions: createdQuestions.map(q => q.id),
        published: true,
        duration: Math.max(15, createdQuestions.length * 2), // 2 min par question, minimum 15 min
        passingScore: 60
      }

      const quizResponse = await axios.post(`${API_BASE}/quizzes`, quizPayload)
      const createdQuiz = quizResponse.data.doc

      console.log(`🎉 Quiz de positionnement créé avec succès !`)
      console.log(`   📝 Titre: ${createdQuiz.title}`)
      console.log(`   🆔 ID: ${createdQuiz.id}`)
      console.log(`   ❓ Questions: ${createdQuestions.length}`)
      console.log(`   ⏱️  Durée: ${createdQuiz.duration} minutes`)
      console.log(`   📈 Score requis: ${createdQuiz.passingScore}%`)
      console.log(`   ✅ Publié: ${createdQuiz.published}`)

    } catch (error) {
      console.error('❌ Erreur création quiz:', error.response?.data || error.message)
    }

    console.log('\n🚀 Seed terminé ! Le quiz de positionnement est prêt à être utilisé.')
    console.log('\n💡 Pour tester :')
    console.log('   1. Connectez-vous au frontend avec alice.martin@etudiant.com')
    console.log('   2. Dans Payload admin, décochez "Quiz de positionnement effectué" pour Alice')
    console.log('   3. Reconnectez-vous au frontend - vous serez redirigé vers le quiz')

  } catch (error) {
    console.error('❌ Erreur générale du seed:', error.message)
  }
}

// Exécuter le seed
if (require.main === module) {
  seedPlacementQuiz()
    .then(() => {
      console.log('\n✨ Seed terminé avec succès !')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error)
      process.exit(1)
    })
}