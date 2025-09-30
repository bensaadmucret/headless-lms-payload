const axios = require('axios')
const { config } = require('dotenv')

// Charger les variables d'environnement
config()

const API_BASE = 'http://localhost:3000/api'

// Fonction pour s'authentifier et obtenir un token
async function authenticate() {
  try {
    console.log('🔐 Authentification en cours...')
    
    // Utiliser le compte superadmin
    const response = await axios.post(`${API_BASE}/users/login`, {
      email: 'barjacca@gmail.com',
      password: 'root'
    })
    
    if (response.data.token) {
      console.log('✅ Authentification réussie')
      return response.data.token
    } else {
      throw new Error('Aucun token reçu')
    }
  } catch (error) {
    console.error('❌ Erreur d\'authentification:', error.response?.data || error.message)
    throw error
  }
}

// Fonction pour créer les données avec authentification
async function createWithAuth(url, data, token) {
  return axios.post(url, data, {
    headers: {
      'Authorization': `JWT ${token}`,
      'Content-Type': 'application/json'
    }
  })
}

async function seedPlacementQuizWithAuth() {
  console.log('🌱 Démarrage du seed avec authentification...\n')
  
  try {
    // 1. S'authentifier
    const token = await authenticate()
    
    // 2. Créer un cours de base
    console.log('\n📚 Création du cours de base...')
    let baseCourse
    try {
      const courseData = {
        title: 'Médecine Générale PASS',
        description: 'Cours de base pour le quiz de positionnement en médecine PASS',
        level: 'beginner',
        author: 1, // ID de l'utilisateur superadmin
        published: true
      }
      const courseResponse = await createWithAuth(`${API_BASE}/courses`, courseData, token)
      baseCourse = courseResponse.data.doc
      console.log(`✅ Cours créé: ${baseCourse.title} (ID: ${baseCourse.id})`)
    } catch (error) {
      if (error.response?.data?.message?.includes('duplicate') || error.response?.data?.message?.includes('already exists')) {
        // Récupérer le cours existant
        try {
          const existing = await axios.get(`${API_BASE}/courses?where[title][equals]=${encodeURIComponent('Médecine Générale PASS')}`, {
            headers: { 'Authorization': `JWT ${token}` }
          })
          if (existing.data.docs?.length > 0) {
            baseCourse = existing.data.docs[0]
            console.log(`ℹ️  Cours existant: ${baseCourse.title}`)
          }
        } catch (fetchError) {
          console.error('❌ Erreur récupération cours:', fetchError.message)
          throw fetchError
        }
      } else {
        console.error('❌ Erreur création cours:', error.response?.data || error.message)
        throw error
      }
    }

    // 3. Créer les catégories
    console.log('\n📁 Création des catégories...')
    const categories = [
      { title: 'Anatomie générale', description: 'Structure du corps humain' },
      { title: 'Physiologie', description: 'Fonctionnement des organes' },
      { title: 'Biochimie', description: 'Processus chimiques' }
    ]
    
    const createdCategories = []
    for (const category of categories) {
      try {
        const response = await createWithAuth(`${API_BASE}/categories`, category, token)
        createdCategories.push(response.data.doc)
        console.log(`✅ Catégorie créée: ${category.title}`)
      } catch (error) {
        if (error.response?.data?.message?.includes('duplicate') || error.response?.data?.message?.includes('already exists')) {
          // Récupérer la catégorie existante
          try {
            const existing = await axios.get(`${API_BASE}/categories?where[title][equals]=${encodeURIComponent(category.title)}`, {
              headers: { 'Authorization': `JWT ${token}` }
            })
            if (existing.data.docs?.length > 0) {
              createdCategories.push(existing.data.docs[0])
              console.log(`ℹ️  Catégorie existante: ${category.title}`)
            }
          } catch (fetchError) {
            console.error(`❌ Erreur récupération ${category.title}:`, fetchError.message)
          }
        } else {
          console.error(`❌ Erreur création ${category.title}:`, error.response?.data || error.message)
        }
      }
    }
    
    console.log(`\n📊 ${createdCategories.length} catégories disponibles`)
    
    if (!baseCourse?.id) {
      throw new Error('Cours de base manquant, impossible de créer les questions')
    }
    
    const questions = [
      {
        course: baseCourse.id,
        category: createdCategories.find(c => c.title === 'Anatomie générale')?.id,
        questionText: {
          root: {
            children: [{
              children: [{ text: "Quel os forme la partie postérieure du crâne ?", type: "text" }],
              direction: "ltr", format: "", indent: 0, type: "paragraph", version: 1
            }],
            direction: "ltr", format: "", indent: 0, type: "root", version: 1
          }
        },
        questionType: 'multipleChoice',
        options: [
          { optionText: 'Frontal', isCorrect: false },
          { optionText: 'Pariétal', isCorrect: false },
          { optionText: 'Occipital', isCorrect: true },
          { optionText: 'Temporal', isCorrect: false }
        ],
        explanation: "L'os occipital forme la partie postérieure du crâne.",
        difficultyLevel: 'pass'
      },
      {
        course: baseCourse.id,
        category: createdCategories.find(c => c.title === 'Physiologie')?.id,
        questionText: {
          root: {
            children: [{
              children: [{ text: "Quelle est la fréquence cardiaque normale au repos ?", type: "text" }],
              direction: "ltr", format: "", indent: 0, type: "paragraph", version: 1
            }],
            direction: "ltr", format: "", indent: 0, type: "root", version: 1
          }
        },
        questionType: 'multipleChoice',
        options: [
          { optionText: '40-50 bpm', isCorrect: false },
          { optionText: '60-100 bpm', isCorrect: true },
          { optionText: '120-140 bpm', isCorrect: false },
          { optionText: '150-180 bpm', isCorrect: false }
        ],
        explanation: "La fréquence cardiaque normale au repos est de 60 à 100 battements par minute.",
        difficultyLevel: 'pass'
      },
      {
        course: baseCourse.id,
        category: createdCategories.find(c => c.title === 'Biochimie')?.id,
        questionText: {
          root: {
            children: [{
              children: [{ text: "Quel est le principal glucide de réserve dans le foie ?", type: "text" }],
              direction: "ltr", format: "", indent: 0, type: "paragraph", version: 1
            }],
            direction: "ltr", format: "", indent: 0, type: "root", version: 1
          }
        },
        questionType: 'multipleChoice',
        options: [
          { optionText: 'Glucose', isCorrect: false },
          { optionText: 'Fructose', isCorrect: false },
          { optionText: 'Glycogène', isCorrect: true },
          { optionText: 'Lactose', isCorrect: false }
        ],
        explanation: "Le glycogène est la forme de stockage du glucose dans le foie et les muscles.",
        difficultyLevel: 'pass'
      }
    ]
    
    const createdQuestions = []
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      if (!question.category) {
        console.log(`⚠️  Catégorie manquante pour question ${i + 1}, skip`)
        continue
      }
      
      try {
        const response = await createWithAuth(`${API_BASE}/questions`, question, token)
        createdQuestions.push(response.data.doc)
        console.log(`✅ Question ${i + 1} créée`)
      } catch (error) {
        console.error(`❌ Erreur question ${i + 1}:`, error.response?.data || error.message)
      }
    }
    
    console.log(`\n🎯 ${createdQuestions.length} questions créées`)
    
    // 5. Créer le quiz de positionnement
    console.log('\n🧩 Création du quiz de positionnement...')
    
    if (createdQuestions.length === 0) {
      throw new Error('Aucune question créée, impossible de créer le quiz')
    }
    
    const quizData = {
      title: 'Quiz de Positionnement - Médecine PASS',
      quizType: 'placement',
      description: 'Ce quiz évalue vos connaissances de base en médecine pour personnaliser votre parcours d\'apprentissage.',
      questions: createdQuestions.map(q => q.id),
      published: true,
      duration: 15,
      passingScore: 60
    }
    
    try {
      const quizResponse = await createWithAuth(`${API_BASE}/quizzes`, quizData, token)
      const quiz = quizResponse.data.doc
      
      console.log('\n🎉 Quiz de positionnement créé avec succès !')
      console.log(`   📝 Titre: ${quiz.title}`)
      console.log(`   🆔 ID: ${quiz.id}`)
      console.log(`   ❓ Questions: ${createdQuestions.length}`)
      console.log(`   ⏱️  Durée: ${quiz.duration} minutes`)
      console.log(`   ✅ Publié: ${quiz.published}`)
      
    } catch (error) {
      console.error('❌ Erreur création quiz:', error.response?.data || error.message)
      throw error
    }
    
    console.log('\n🚀 Seed terminé avec succès !')
    console.log('\n💡 Pour tester :')
    console.log('   1. Connectez-vous avec alice.martin@etudiant.com / password123')
    console.log('   2. Vous devriez être redirigé automatiquement vers le quiz')
    
  } catch (error) {
    console.error('\n💥 Erreur fatale:', error.message)
    throw error
  }
}

// Exécuter le seed
if (require.main === module) {
  seedPlacementQuizWithAuth()
    .then(() => {
      console.log('\n✨ Seed terminé !')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Échec du seed:', error.message)
      process.exit(1)
    })
}